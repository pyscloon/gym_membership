const fs = require('fs');
const path = 'c:/Users/Acer/Documents/Final_Project_Gym_Membership/gym-membership-system/src/lib/mockSupabaseClient.ts';
let content = fs.readFileSync(path, 'utf8');

// 1. Add 'delete' to MockOperation
content = content.replace(
  'type MockOperation = "select" | "insert" | "update" | "upsert";',
  'type MockOperation = "select" | "insert" | "update" | "upsert" | "delete";'
);

// 2. Add 'neq' to MockFilter
content = content.replace(
  '| { type: "eq"; column: string; value: unknown }',
  '| { type: "eq"; column: string; value: unknown }\n  | { type: "neq"; column: string; value: unknown }'
);

// 3. Add 'neq' logic to applyFilters switch statement
if (content.includes('case "neq":') === false) {
  content = content.replace(
    'case "eq":\n          return value === filter.value;',
    'case "eq":\n          return value === filter.value;\n        case "neq":\n          return value !== filter.value;'
  );
}

// 4. Add neq() and delete() to MockQueryBuilder
if (content.includes('delete() {') === false) {
  content = content.replace(
    /eq\(column: string, value: unknown\) \{\s*this\.filters\.push\(\{ type: "eq", column, value \}\);\s*return this;\s*\}/,
    `eq(column: string, value: unknown) {\n    this.filters.push({ type: "eq", column, value });\n    return this;\n  }\n\n  neq(column: string, value: unknown) {\n    this.filters.push({ type: "neq", column, value });\n    return this;\n  }\n\n  delete() {\n    this.operation = "delete";\n    return this;\n  }`
  );
}

// 5. Add executeDelete method and update execute()
if (content.includes('executeDelete()') === false) {
  const executeDeleteStr = `
  private executeDelete(): QueryResult<unknown> {
    const rows = this.getRows();
    const filteredRows = applyFilters(rows, this.filters);
    const deleteIds = new Set(filteredRows.map((row) => String(row.id)));
    const deletedRows: Record<string, unknown>[] = [];
    
    const nextRows = rows.filter((row) => {
      if (deleteIds.has(String(row.id))) {
        deletedRows.push(row);
        return false;
      }
      return true;
    });

    this.setRows(nextRows);
    persistState(this.state);

    if (this.expectSingle) {
      if (deletedRows.length === 0) {
        return { data: null, error: { message: "No rows found", code: "PGRST116" } };
      }
      return { data: clone(deletedRows[0]), error: null };
    }
    
    return { data: clone(deletedRows), error: null };
  }

  private async execute(): Promise<QueryResult<unknown>> {`;

  content = content.replace(
    'private async execute(): Promise<QueryResult<unknown>> {',
    executeDeleteStr
  );
}

// 6. Hook executeDelete into switch statement inside execute()
if (content.includes('case "delete":') === false) {
  content = content.replace(
    /case "upsert":\s*return this\.executeUpsert\(\);\s*default:/,
    'case "upsert":\n        return this.executeUpsert();\n      case "delete":\n        return this.executeDelete();\n      default:'
  );
}

fs.writeFileSync(path, content);
console.log('Successfully patched mockSupabaseClient.ts');
