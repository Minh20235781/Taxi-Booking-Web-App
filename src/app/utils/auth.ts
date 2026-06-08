import { clearAuthSession, getAuthRole, getAuthToken, isLoggedIn } from "../services/authSession";
import { clearActiveBookingId, clearBookingFlowDraft } from "../services/bookingFlow";

export type AuthRole = "USER" | "DRIVER";

export {
  getAuthRole,
  getAuthToken,
  getAuthUserId,
  getStoredUser,
  isLoggedIn,
  isPathAllowedForRole,
  roleHomePath,
  setAuthSession,
  updateStoredUser
} from "../services/authSession";

/** @deprecated use getAuthRole — kept for existing imports */
export function getStoredRole(): AuthRole | null {
  return getAuthRole();
}

export function logout() {
  clearAuthSession();
  clearActiveBookingId();
  clearBookingFlowDraft();
}
