import { Outlet } from "react-router";
import { LanguageProvider } from "./contexts/LanguageContext";

// Root layout component that provides LanguageContext to all routes
export default function RootLayout() {
  return (
    <LanguageProvider>
      <Outlet />
    </LanguageProvider>
  );
}
