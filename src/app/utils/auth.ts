import { clearAuthToken, getAuthToken } from "../services/api";

export type AuthRole = "USER" | "DRIVER";

export function getStoredUser(): { role?: AuthRole; email?: string; fullName?: string } | null {
  const raw = localStorage.getItem("auth_user");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function getStoredRole(): AuthRole | null {
  const role = getStoredUser()?.role;
  return role === "USER" || role === "DRIVER" ? role : null;
}

export function isLoggedIn(): boolean {
  return Boolean(getAuthToken() && getStoredRole());
}

export function logout() {
  clearAuthToken();
  localStorage.removeItem("auth_user");
  localStorage.removeItem("user");
}
