const LOCAL_AUTH_KEY = "flex_local_auth";

type LocalAuthState = {
  isAuthenticated: boolean;
};

function getStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
}

export function setLocalAuthenticated(isAuthenticated: boolean) {
  const storage = getStorage();

  if (!storage) {
    return;
  }

  const value: LocalAuthState = { isAuthenticated };
  storage.setItem(LOCAL_AUTH_KEY, JSON.stringify(value));
}

export function isLocalAuthenticated() {
  const storage = getStorage();

  if (!storage) {
    return false;
  }

  const rawValue = storage.getItem(LOCAL_AUTH_KEY);

  if (!rawValue) {
    return false;
  }

  try {
    const parsed = JSON.parse(rawValue) as LocalAuthState;
    return parsed.isAuthenticated === true;
  } catch {
    return false;
  }
}

export function clearLocalAuthenticated() {
  const storage = getStorage();

  if (!storage) {
    return;
  }

  storage.removeItem(LOCAL_AUTH_KEY);
}
