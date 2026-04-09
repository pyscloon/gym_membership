type MockAuthUser = {
  id: string;
  email: string;
  password: string;
  role: "admin" | "member";
  user_metadata: Record<string, unknown>;
};

type MockSessionUser = {
  id: string;
  email: string;
  user_metadata: Record<string, unknown>;
};

type MockSession = {
  user: MockSessionUser;
};

type MockProfileRow = {
  id: string;
  full_name: string;
  email: string;
  role: "admin" | "member";
  created_at: string;
};

type MockMembershipRow = {
  id: string;
  user_id: string;
  status: "active" | "pending" | "canceled" | "expired";
  tier: "monthly" | "semi-yearly" | "yearly" | "walk-in";
  start_date: string;
  renewal_date: string;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
};

type MockTransactionRow = {
  id: string;
  user_id: string;
  user_type: "monthly" | "semi-yearly" | "yearly" | "walk-in";
  amount: number;
  currency: string;
  method: "cash" | "card" | "online";
  status: "idle" | "processing" | "awaiting-confirmation" | "awaiting-verification" | "paid" | "failed";
  payment_proof_status: "pending" | "verified" | "rejected" | null;
  proof_of_payment_url: string | null;
  rejection_reason: string | null;
  failure_reason: string | null;
  confirmed_at: string | null;
  created_at: string;
  updated_at: string;
};

type MockWalkInRow = {
  id: string;
  user_id: string | null;
  membership_id: string | null;
  validated_by: string | null;
  walk_in_type: string;
  walk_in_time: string;
  qr_data?: Record<string, unknown>;
  status: string;
  notes?: string;
  created_at: string;
  updated_at: string;
};

type MockStorageEntry = {
  path: string;
  value: unknown;
};

type MockTableMap = {
  profiles: MockProfileRow[];
  memberships: MockMembershipRow[];
  transactions: MockTransactionRow[];
  walk_ins: MockWalkInRow[];
};

type MockDatabaseState = {
  users: MockAuthUser[];
  session: MockSession | null;
  tables: MockTableMap;
  storage: Record<string, MockStorageEntry[]>;
  listeners: Set<(event: string, session: MockSession | null) => void>;
};

type MockPersistedState = Omit<MockDatabaseState, "listeners" | "session">;

type MockFilter =
  | { type: "eq"; column: string; value: unknown }
  | { type: "in"; column: string; value: unknown[] }
  | { type: "gte"; column: string; value: unknown }
  | { type: "lte"; column: string; value: unknown }
  | { type: "lt"; column: string; value: unknown };

type QueryResult<T> = {
  data: T | null;
  error: { message: string; code?: string } | null;
  count?: number | null;
};

type MockOperation = "select" | "insert" | "update" | "upsert";
const MOCK_STORAGE_KEY = "__playwright_mock_supabase_state__";
const MOCK_SESSION_KEY = "__playwright_mock_supabase_session__";

function createNow(): string {
  return new Date().toISOString();
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function createId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

function createDefaultState(): MockDatabaseState {
  const now = createNow();
  const users: MockAuthUser[] = [
    {
      id: "member-user-1",
      email: "member@example.com",
      password: "memberpass123",
      role: "member",
      user_metadata: {
        first_name: "Manny",
        last_name: "Member",
        full_name: "Manny Member",
      },
    },
    {
      id: "admin-user-1",
      email: "admin@gmail.com",
      password: "adminpass123",
      role: "admin",
      user_metadata: {
        first_name: "Ada",
        last_name: "Admin",
        full_name: "Ada Admin",
      },
    },
  ];

  return {
    users,
    session: null,
    tables: {
      profiles: users.map((user) => ({
        id: user.id,
        full_name: String(user.user_metadata.full_name ?? user.email),
        email: user.email,
        role: user.role,
        created_at: now,
      })),
      memberships: [],
      transactions: [],
      walk_ins: [],
    },
    storage: {},
    listeners: new Set(),
  };
}

function hasLocalStorage() {
  return typeof localStorage !== "undefined";
}

function persistState(state: MockDatabaseState) {
  if (!hasLocalStorage()) {
    return;
  }

  const persistedState: MockPersistedState = {
    users: state.users,
    tables: state.tables,
    storage: state.storage,
  };

  localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(persistedState));
}

function hydrateSession(): MockSession | null {
  if (typeof sessionStorage === "undefined") {
    return null;
  }

  const rawSession = sessionStorage.getItem(MOCK_SESSION_KEY);
  if (!rawSession) {
    return null;
  }

  try {
    return JSON.parse(rawSession) as MockSession;
  } catch {
    sessionStorage.removeItem(MOCK_SESSION_KEY);
    return null;
  }
}

function persistSession(state: MockDatabaseState) {
  if (typeof sessionStorage === "undefined") {
    return;
  }

  if (!state.session) {
    sessionStorage.removeItem(MOCK_SESSION_KEY);
    return;
  }

  sessionStorage.setItem(MOCK_SESSION_KEY, JSON.stringify(state.session));
}

function hydrateState(): MockDatabaseState {
  if (!hasLocalStorage()) {
    return createDefaultState();
  }

  const rawState = localStorage.getItem(MOCK_STORAGE_KEY);
  if (!rawState) {
    const freshState = createDefaultState();
    persistState(freshState);
    return freshState;
  }

  try {
    const parsed = JSON.parse(rawState) as MockPersistedState;
    return {
      ...parsed,
      session: hydrateSession(),
      listeners: new Set(),
    };
  } catch {
    const freshState = createDefaultState();
    persistState(freshState);
    return freshState;
  }
}

function getTableNamePrefix(tableName: keyof MockTableMap): string {
  switch (tableName) {
    case "memberships":
      return "membership";
    case "transactions":
      return "txn";
    case "walk_ins":
      return "check";
    default:
      return tableName.slice(0, -1);
  }
}

function applyFilters<T extends Record<string, unknown>>(rows: T[], filters: MockFilter[]): T[] {
  return rows.filter((row) =>
    filters.every((filter) => {
      const value = row[filter.column];
      switch (filter.type) {
        case "eq":
          return value === filter.value;
        case "in":
          return filter.value.includes(value);
        case "gte":
          return String(value) >= String(filter.value);
        case "lte":
          return String(value) <= String(filter.value);
        case "lt":
          return String(value) < String(filter.value);
        default:
          return true;
      }
    })
  );
}

class MockQueryBuilder<T extends keyof MockTableMap> implements PromiseLike<QueryResult<unknown>> {
  private readonly filters: MockFilter[] = [];
  private operation: MockOperation = "select";
  private payload: Record<string, unknown> | Record<string, unknown>[] | null = null;
  private orderConfig: { column: string; ascending: boolean } | null = null;
  private limitValue: number | null = null;
  private expectSingle = false;
  private countExact = false;
  private headOnly = false;
  private upsertConflict = "id";
  private readonly state: MockDatabaseState;
  private readonly tableName: T;

  constructor(state: MockDatabaseState, tableName: T) {
    this.state = state;
    this.tableName = tableName;
  }

  select(_columns = "*", options?: { count?: "exact"; head?: boolean }) {
    this.countExact = options?.count === "exact";
    this.headOnly = Boolean(options?.head);
    return this;
  }

  insert(payload: Record<string, unknown> | Record<string, unknown>[]) {
    this.operation = "insert";
    this.payload = payload;
    return this;
  }

  update(payload: Record<string, unknown>) {
    this.operation = "update";
    this.payload = payload;
    return this;
  }

  upsert(payload: Record<string, unknown> | Record<string, unknown>[], options?: { onConflict?: string }) {
    this.operation = "upsert";
    this.payload = payload;
    this.upsertConflict = options?.onConflict ?? "id";
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.push({ type: "eq", column, value });
    return this;
  }

  in(column: string, value: unknown[]) {
    this.filters.push({ type: "in", column, value });
    return this;
  }

  gte(column: string, value: unknown) {
    this.filters.push({ type: "gte", column, value });
    return this;
  }

  lte(column: string, value: unknown) {
    this.filters.push({ type: "lte", column, value });
    return this;
  }

  lt(column: string, value: unknown) {
    this.filters.push({ type: "lt", column, value });
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.orderConfig = {
      column,
      ascending: options?.ascending ?? true,
    };
    return this;
  }

  limit(value: number) {
    this.limitValue = value;
    return this;
  }

  single() {
    this.expectSingle = true;
    return this.execute();
  }

  then<TResult1 = QueryResult<unknown>, TResult2 = never>(
    onfulfilled?: ((value: QueryResult<unknown>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }

  private getRows() {
    return this.state.tables[this.tableName] as Record<string, unknown>[];
  }

  private setRows(rows: Record<string, unknown>[]) {
    (this.state.tables[this.tableName] as Record<string, unknown>[]) = rows;
  }

  private sortRows(rows: Record<string, unknown>[]) {
    if (!this.orderConfig) {
      return rows;
    }

    const direction = this.orderConfig.ascending ? 1 : -1;
    return [...rows].sort((left, right) => {
      const leftValue = String(left[this.orderConfig!.column] ?? "");
      const rightValue = String(right[this.orderConfig!.column] ?? "");
      if (leftValue === rightValue) {
        return 0;
      }
      return leftValue > rightValue ? direction : -direction;
    });
  }

  private normalizeRow(row: Record<string, unknown>) {
    const now = createNow();
    if (this.tableName === "memberships") {
      return {
        created_at: now,
        updated_at: now,
        id: createId(getTableNamePrefix(this.tableName)),
        cancel_at_period_end: false,
        ...row,
      };
    }

    if (this.tableName === "transactions") {
      return {
        created_at: now,
        updated_at: now,
        id: createId(getTableNamePrefix(this.tableName)),
        currency: "PHP",
        payment_proof_status: null,
        proof_of_payment_url: null,
        rejection_reason: null,
        failure_reason: null,
        confirmed_at: null,
        ...row,
      };
    }

    if (this.tableName === "walk_ins") {
      return {
        created_at: now,
        updated_at: now,
        id: createId(getTableNamePrefix(this.tableName)),
        membership_id: null,
        validated_by: null,
        ...row,
      };
    }

    if (this.tableName === "profiles") {
      return {
        created_at: now,
        role: "member",
        ...row,
      };
    }

    return row;
  }

  private executeSelect(): QueryResult<unknown> {
    let rows = applyFilters(this.getRows(), this.filters);
    rows = this.sortRows(rows);

    if (this.limitValue !== null) {
      rows = rows.slice(0, this.limitValue);
    }

    if (this.countExact && this.headOnly) {
      return { data: null, error: null, count: rows.length };
    }

    if (this.expectSingle) {
      if (rows.length === 0) {
        return {
          data: null,
          error: { message: "No rows found", code: "PGRST116" },
          count: this.countExact ? rows.length : null,
        };
      }

      return {
        data: clone(rows[0]),
        error: null,
        count: this.countExact ? rows.length : null,
      };
    }

    return {
      data: clone(rows),
      error: null,
      count: this.countExact ? rows.length : null,
    };
  }

  private executeInsert(): QueryResult<unknown> {
    const payloadRows = Array.isArray(this.payload) ? this.payload : [this.payload ?? {}];
    const nextRows = [...this.getRows()];
    const insertedRows = payloadRows.map((row) => {
      const normalized = this.normalizeRow(row);
      nextRows.push(normalized);
      return normalized;
    });
    this.setRows(nextRows);
    persistState(this.state);

    if (this.expectSingle) {
      return { data: clone(insertedRows[0]), error: null };
    }

    return { data: clone(insertedRows), error: null };
  }

  private executeUpdate(): QueryResult<unknown> {
    const updates = this.payload ?? {};
    const rows = this.getRows();
    const filteredRows = applyFilters(rows, this.filters);
    const updateIds = new Set(filteredRows.map((row) => String(row.id)));
    const updatedRows: Record<string, unknown>[] = [];
    const nextRows = rows.map((row) => {
      if (!updateIds.has(String(row.id))) {
        return row;
      }

      const nextRow = {
        ...row,
        ...updates,
      };
      updatedRows.push(nextRow);
      return nextRow;
    });

    this.setRows(nextRows);
    persistState(this.state);

    if (this.expectSingle) {
      if (updatedRows.length === 0) {
        return { data: null, error: { message: "No rows found", code: "PGRST116" } };
      }

      return { data: clone(updatedRows[0]), error: null };
    }

    return { data: clone(updatedRows), error: null };
  }

  private executeUpsert(): QueryResult<unknown> {
    const rows = this.getRows();
    const payloadRows = Array.isArray(this.payload) ? this.payload : [this.payload ?? {}];
    const resultRows: Record<string, unknown>[] = [];
    const nextRows = [...rows];

    for (const payloadRow of payloadRows) {
      const matchIndex = nextRows.findIndex(
        (row) => row[this.upsertConflict] === payloadRow[this.upsertConflict]
      );

      if (matchIndex >= 0) {
        nextRows[matchIndex] = {
          ...nextRows[matchIndex],
          ...payloadRow,
        };
        resultRows.push(nextRows[matchIndex]);
        continue;
      }

      const normalized = this.normalizeRow(payloadRow);
      nextRows.push(normalized);
      resultRows.push(normalized);
    }

    this.setRows(nextRows);
    persistState(this.state);

    if (this.expectSingle) {
      return {
        data: clone(resultRows[0] ?? null),
        error: resultRows[0] ? null : { message: "No rows found", code: "PGRST116" },
      };
    }

    return { data: clone(resultRows), error: null };
  }

  private async execute(): Promise<QueryResult<unknown>> {
    switch (this.operation) {
      case "insert":
        return this.executeInsert();
      case "update":
        return this.executeUpdate();
      case "upsert":
        return this.executeUpsert();
      default:
        return this.executeSelect();
    }
  }
}

class MockStorageBucket {
  private readonly state: MockDatabaseState;
  private readonly bucketName: string;

  constructor(state: MockDatabaseState, bucketName: string) {
    this.state = state;
    this.bucketName = bucketName;
  }

  async upload(path: string, value: unknown) {
    const entries = this.state.storage[this.bucketName] ?? [];
    entries.push({ path, value });
    this.state.storage[this.bucketName] = entries;
    persistState(this.state);
    return {
      data: { path },
      error: null,
    };
  }

  getPublicUrl(path: string) {
    return {
      data: {
        publicUrl: `https://mock-storage.local/${this.bucketName}/${path}`,
      },
    };
  }
}

class MockAuthApi {
  private readonly state: MockDatabaseState;

  constructor(state: MockDatabaseState) {
    this.state = state;
  }

  private emit(event: string) {
    for (const listener of this.state.listeners) {
      listener(event, this.state.session);
    }
  }

  async signInWithPassword(params: { email: string; password: string }) {
    const user = this.state.users.find(
      (entry) =>
        entry.email.toLowerCase() === params.email.toLowerCase() &&
        entry.password === params.password
    );

    if (!user) {
      return {
        data: { user: null, session: null },
        error: { message: "Invalid login credentials" },
      };
    }

    this.state.session = {
      user: {
        id: user.id,
        email: user.email,
        user_metadata: clone(user.user_metadata),
      },
    };
    persistState(this.state);
    persistSession(this.state);

    this.emit("SIGNED_IN");

    return {
      data: {
        user: clone(this.state.session.user),
        session: clone(this.state.session),
      },
      error: null,
    };
  }

  async signUp(params: { email: string; password: string; options?: { data?: Record<string, unknown> } }) {
    const existing = this.state.users.find(
      (entry) => entry.email.toLowerCase() === params.email.toLowerCase()
    );

    if (existing) {
      return {
        data: { user: null, session: null },
        error: { message: "User already registered" },
      };
    }

    const fullName = String(params.options?.data?.full_name ?? params.email);
    const firstName = fullName.split(" ").filter(Boolean)[0] ?? "";
    const lastName = fullName.split(" ").filter(Boolean).slice(1).join(" ");
    const user: MockAuthUser = {
      id: createId("member"),
      email: params.email,
      password: params.password,
      role: "member",
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        full_name: fullName,
      },
    };

    this.state.users.push(user);
    this.state.tables.profiles.push({
      id: user.id,
      full_name: fullName,
      email: user.email,
      role: "member",
      created_at: createNow(),
    });

    this.state.session = {
      user: {
        id: user.id,
        email: user.email,
        user_metadata: clone(user.user_metadata),
      },
    };
    persistState(this.state);
    persistSession(this.state);

    this.emit("SIGNED_IN");

    return {
      data: {
        user: clone(this.state.session.user),
        session: clone(this.state.session),
      },
      error: null,
    };
  }

  async signOut() {
    this.state.session = null;
    persistState(this.state);
    persistSession(this.state);
    this.emit("SIGNED_OUT");
    return { error: null };
  }

  async getSession() {
    return {
      data: {
        session: clone(this.state.session),
      },
      error: null,
    };
  }

  async getUser() {
    return {
      data: {
        user: clone(this.state.session?.user ?? null),
      },
      error: null,
    };
  }

  onAuthStateChange(callback: (event: string, session: MockSession | null) => void) {
    this.state.listeners.add(callback);
    return {
      data: {
        subscription: {
          unsubscribe: () => {
            this.state.listeners.delete(callback);
          },
        },
      },
    };
  }
}

export type MockSupabaseClient = {
  auth: MockAuthApi;
  from: <T extends keyof MockTableMap>(tableName: T) => MockQueryBuilder<T>;
  rpc: (name: string) => Promise<{ data: Record<string, number>; error: null } | { data: null; error: { message: string } }>;
  storage: {
    from: (bucketName: string) => MockStorageBucket;
  };
};

export function createMockSupabaseClient(): MockSupabaseClient {
  const testGlobal = globalThis as typeof globalThis & {
    __PLAYWRIGHT_MOCK_SUPABASE_STATE__?: MockDatabaseState;
  };

  if (!testGlobal.__PLAYWRIGHT_MOCK_SUPABASE_STATE__) {
    testGlobal.__PLAYWRIGHT_MOCK_SUPABASE_STATE__ = hydrateState();
  }

  const state = testGlobal.__PLAYWRIGHT_MOCK_SUPABASE_STATE__;

  return {
    auth: new MockAuthApi(state),
    from: <T extends keyof MockTableMap>(tableName: T) => new MockQueryBuilder(state, tableName),
    rpc: async (name: string) => {
      if (name !== "get_membership_stats") {
        return {
          data: null,
          error: { message: `Unsupported rpc call: ${name}` },
        };
      }

      const activeMemberships = state.tables.memberships.filter((membership) => membership.status === "active");
      const now = new Date();
      const inSevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const expiringSoon = activeMemberships.filter((membership) => {
        const renewal = new Date(membership.renewal_date);
        return renewal >= now && renewal <= inSevenDays;
      }).length;

      return {
        data: {
          total_active: activeMemberships.length,
          expiring_soon: expiringSoon,
        },
        error: null,
      };
    },
    storage: {
      from: (bucketName: string) => new MockStorageBucket(state, bucketName),
    },
  };
}
