/** Per-tab auth session (sessionStorage) — avoids cross-tab token overwrite in localStorage. */

export type AuthRole = "USER" | "DRIVER";

export interface AuthUser {
  id: number;
  fullName?: string;
  email?: string;
  phone?: string;
  role?: AuthRole;
  avatarUrl?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  createdAt?: string;
}

const TOKEN_KEY = "auth_token";
const USER_KEY = "auth_user";

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const json = atob(part.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** One-time move from legacy localStorage (shared across tabs) into this tab's session. */
function migrateLegacyAuthOnce() {
  if (!sessionStorage.getItem(TOKEN_KEY)) {
    const legacyToken = localStorage.getItem(TOKEN_KEY);
    if (legacyToken) {
      sessionStorage.setItem(TOKEN_KEY, legacyToken);
    }
  }
  if (!sessionStorage.getItem(USER_KEY)) {
    const legacyUser = localStorage.getItem(USER_KEY);
    if (legacyUser) {
      sessionStorage.setItem(USER_KEY, legacyUser);
    }
  }
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getAuthToken(): string | null {
  migrateLegacyAuthOnce();
  return sessionStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): AuthUser | null {
  migrateLegacyAuthOnce();
  const raw = sessionStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

/** JWT is the source of truth for role and user id. */
export function getAuthUserId(): number | null {
  const token = getAuthToken();
  if (!token) return null;
  const payload = decodeJwtPayload(token);
  const id = Number(payload?.sub);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export function getAuthRole(): AuthRole | null {
  const token = getAuthToken();
  if (!token) return null;
  const payload = decodeJwtPayload(token);
  const role = String(payload?.role || "").toUpperCase();
  if (role === "USER" || role === "DRIVER") return role as AuthRole;
  return null;
}

export function setAuthSession(token: string, user: AuthUser) {
  sessionStorage.setItem(TOKEN_KEY, token);
  sessionStorage.setItem(USER_KEY, JSON.stringify(user));
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function updateStoredUser(user: AuthUser) {
  sessionStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuthSession() {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem("user");
}

export function isLoggedIn(): boolean {
  return Boolean(getAuthToken() && getAuthRole());
}

export function roleHomePath(role: AuthRole): string {
  return role === "DRIVER" ? "/driver/home" : "/user/home";
}

export function isPathAllowedForRole(path: string, role: AuthRole): boolean {
  if (path.startsWith("/user/")) return role === "USER";
  if (path.startsWith("/driver/")) return role === "DRIVER";
  return true;
}

export function setAuthToken(token: string) {
  sessionStorage.setItem(TOKEN_KEY, token);
  localStorage.removeItem(TOKEN_KEY);
}

export function clearAuthToken() {
  sessionStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(TOKEN_KEY);
}
