import { Outlet, useLocation, useNavigate } from "react-router";
import { useEffect } from "react";
import { LanguageProvider } from "./contexts/LanguageContext";
import { getStoredRole, isLoggedIn } from "./utils/auth";

export default function RootLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoggedIn()) return;

    const role = getStoredRole();
    const path = location.pathname;

    if (path === "/signup") {
      navigate(role === "DRIVER" ? "/driver/home" : "/user/home", { replace: true });
      return;
    }

    if (path.startsWith("/user/") && role !== "USER") {
      navigate("/driver/home", { replace: true });
      return;
    }

    if (path.startsWith("/driver/") && role !== "DRIVER") {
      navigate("/user/home", { replace: true });
      return;
    }

    if ((path === "/" || path === "/login") && role) {
      navigate(role === "USER" ? "/user/home" : "/driver/home", { replace: true });
    }
  }, [location.pathname, navigate]);

  return (
    <LanguageProvider>
      <Outlet />
    </LanguageProvider>
  );
}
