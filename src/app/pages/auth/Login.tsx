import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Car, Globe } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { api, setAuthToken } from "../../services/api";

export default function Login() {
  const navigate = useNavigate();
  const { t, language, setLanguage } = useLanguage();
  const [activeRole, setActiveRole] = useState<"user" | "driver">("user");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (type: "user" | "driver") => {
    setErrorMessage("");
    if (!email.trim() || !password.trim()) {
      setErrorMessage("Vui lòng nhập đầy đủ email và mật khẩu.");
      return;
    }

    try {
      setIsLoading(true);
      const result = await api.login({
        email: email.trim(),
        password: password.trim(),
        role: type === "user" ? "USER" : "DRIVER"
      });
      if (result.token) {
        setAuthToken(result.token);
      }
      localStorage.setItem("auth_user", JSON.stringify(result.user));
      navigate(`/${type}/home`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Đăng nhập thất bại.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="bg-black text-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Car className="h-6 w-6" />
            <h1 className="text-2xl font-bold">Antrek</h1>
          </div>
          
          {/* Language Selector */}
          <Select value={language} onValueChange={(value) => setLanguage(value as "ja" | "en")}>
            <SelectTrigger className="w-32 bg-transparent border-gray-700 text-white hover:bg-gray-800">
              <Globe className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white z-50">
              <SelectItem value="ja">日本語</SelectItem>
              <SelectItem value="en">English</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-2">{t("login")}</h2>
            <p className="text-gray-600">{t("loginToAccount")}</p>
          </div>

          <Tabs value={activeRole} onValueChange={(value) => setActiveRole(value as "user" | "driver")} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="user">{t("user")}</TabsTrigger>
              <TabsTrigger value="driver">{t("driver")}</TabsTrigger>
            </TabsList>

            <TabsContent value="user">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="user-email">{t("emailAddress")}</Label>
                  <Input
                    id="user-email"
                    type="email"
                    placeholder="example@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="user-password">{t("password")}</Label>
                  <Input
                    id="user-password"
                    type="password"
                    placeholder={t("enterPassword")}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12"
                  />
                </div>
                <Button
                  onClick={() => handleLogin("user")}
                  disabled={isLoading}
                  className="w-full h-12 bg-black hover:bg-gray-800 text-white"
                >
                  {t("login")}
                </Button>
                <div className="text-center text-sm">
                  <span className="text-gray-600">{t("dontHaveAccount")} </span>
                  <Link to="/signup" className="text-black font-semibold underline">
                    {t("signUp")}
                  </Link>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="driver">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="driver-email">{t("emailAddress")}</Label>
                  <Input
                    id="driver-email"
                    type="email"
                    placeholder="example@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="driver-password">{t("password")}</Label>
                  <Input
                    id="driver-password"
                    type="password"
                    placeholder={t("enterPassword")}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12"
                  />
                </div>
                <Button
                  onClick={() => handleLogin("driver")}
                  disabled={isLoading}
                  className="w-full h-12 bg-black hover:bg-gray-800 text-white"
                >
                  {t("login")}
                </Button>
                <div className="text-center text-sm">
                  <span className="text-gray-600">{t("dontHaveAccount")} </span>
                  <Link to="/driver-registration" className="text-black font-semibold underline">
                    {t("registerAsDriver")}
                  </Link>
                </div>
              </div>
            </TabsContent>
          </Tabs>
          {errorMessage && (
            <p className="text-sm text-red-600 mt-4 text-center">{errorMessage}</p>
          )}
        </div>
      </div>
    </div>
  );
}