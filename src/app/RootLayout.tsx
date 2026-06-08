import { Outlet, useLocation, useNavigate } from "react-router";
import { useEffect } from "react";
import { LanguageProvider } from "./contexts/LanguageContext";
import {
  getAuthRole,
  isLoggedIn,
  isPathAllowedForRole,
  roleHomePath
} from "./services/authSession";

export default function RootLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const path = location.pathname;
    const role = getAuthRole();

    if (!isLoggedIn()) {
      const isProtected =
        path.startsWith("/user/") || path.startsWith("/driver/");
      if (isProtected) {
        navigate("/login", { replace: true });
      }
      return;
    }

    if (!role) {
      navigate("/login", { replace: true });
      return;
    }

    if (path === "/signup") {
      navigate(roleHomePath(role), { replace: true });
      return;
    }

    if (!isPathAllowedForRole(path, role)) {
      navigate(roleHomePath(role), { replace: true });
      return;
    }

    if ((path === "/" || path === "/login") && role) {
      navigate(roleHomePath(role), { replace: true });
    }
  }, [location.pathname, navigate]);

  useEffect(() => {
    const onFocus = () => {
      const role = getAuthRole();
      if (!role || !isLoggedIn()) return;
      if (!isPathAllowedForRole(location.pathname, role)) {
        navigate(roleHomePath(role), { replace: true });
      }
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [location.pathname, navigate]);

  return (
    <LanguageProvider>
      <Outlet />
    </LanguageProvider>
  );
}
