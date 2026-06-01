import { Link, useNavigate } from "react-router";
import { Menu, User, History, Clock, CreditCard, Globe, LogOut } from "lucide-react";
import { Button } from "./ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./ui/popover";
import { useLanguage } from "../contexts/LanguageContext";
import { logout } from "../utils/auth";

interface HeaderProps {
  type?: "user" | "driver";
}

export function Header({ type = "user" }: HeaderProps) {
  const navigate = useNavigate();
  const { language, setLanguage, t } = useLanguage();

  return (
    <header className="bg-black text-white px-6 py-4 flex items-center justify-between">
      <Link to={type === "user" ? "/user/home" : "/driver/home"} className="text-2xl font-bold">
        Antrek
      </Link>
      
      <div className="flex items-center gap-4">
        {/* Language Selector */}
        <Select value={language} onValueChange={(value) => setLanguage(value as "ja" | "en")}>
          <SelectTrigger className="w-32 bg-transparent border-gray-700 text-white hover:bg-gray-800">
            <Globe className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-white z-[9999]">
            <SelectItem value="ja">日本語</SelectItem>
            <SelectItem value="en">English</SelectItem>
          </SelectContent>
        </Select>

        {/* Menu Popover */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="text-white hover:bg-gray-800">
              <Menu className="h-6 w-6" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-56 bg-white p-2 z-[9999] border border-gray-200">
            <div className="flex flex-col gap-1">
              <Button
                variant="ghost"
                className="w-full justify-start hover:bg-gray-100"
                onClick={() => navigate(`/${type}/profile`)}
              >
                <User className="mr-2 h-4 w-4" />
                {t("profile")}
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start hover:bg-gray-100"
                onClick={() => navigate(`/${type}/history`)}
              >
                <History className="mr-2 h-4 w-4" />
                {t("rideHistory")}
              </Button>
              {type === "driver" && (
                <Button
                  variant="ghost"
                  className="w-full justify-start hover:bg-gray-100"
                  onClick={() => navigate("/driver/income")}
                >
                  <CreditCard className="mr-2 h-4 w-4" />
                  {t("incomeManagement")}
                </Button>
              )}
              {type === "user" && (
                <Button
                  variant="ghost"
                  className="w-full justify-start hover:bg-gray-100"
                  onClick={() => navigate("/user/reservation")}
                >
                  <Clock className="mr-2 h-4 w-4" />
                  {t("reservation")}
                </Button>
              )}
              <div className="h-px bg-gray-200 my-1" />
              <Button
                variant="ghost"
                className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={() => {
                  logout();
                  navigate("/login");
                }}
              >
                <LogOut className="mr-2 h-4 w-4" />
                {t("logout")}
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </header>
  );
}
