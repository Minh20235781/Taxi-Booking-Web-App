import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Car, ArrowLeft, Globe, UserCircle, Truck } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Card } from "../../components/ui/card";
import { useLanguage } from "../../contexts/LanguageContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { api, setAuthToken } from "../../services/api";

export default function SignUp() {
  const navigate = useNavigate();
  const { t, language, setLanguage } = useLanguage();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.id]: e.target.value,
    });
  };

  const handleUserSignUp = async () => {
    setErrorMessage("");
    const fullName = `${formData.firstName} ${formData.lastName}`.trim();
    const email = formData.email.trim();
    const phone = formData.phone.trim();
    const password = formData.password.trim();
    const confirmPassword = formData.confirmPassword.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!fullName || !email || !phone || !password || !confirmPassword) {
      setErrorMessage("Vui lòng nhập đầy đủ tất cả thông tin bắt buộc.");
      return;
    }
    if (!emailRegex.test(email)) {
      setErrorMessage("Định dạng email không hợp lệ.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage("Mật khẩu xác nhận không khớp.");
      return;
    }

    try {
      setIsLoading(true);
      const result = await api.signup({
        fullName,
        email,
        phone,
        password,
        role: "USER",
      });
      if (result.token) {
        setAuthToken(result.token);
      }
      localStorage.setItem("auth_user", JSON.stringify(result.user));
      navigate("/user/home");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Đăng ký thất bại.");
    } finally {
      setIsLoading(false);
    }
  };

  const goToDriverRegistration = () => {
    navigate("/driver-registration");
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="bg-black text-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/login")}
              className="text-white hover:bg-gray-800"
            >
              <ArrowLeft className="h-6 w-6" />
            </Button>
            <div className="flex items-center gap-2">
              <Car className="h-6 w-6" />
              <h1 className="text-2xl font-bold">Antrek</h1>
            </div>
          </div>

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

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-2">{t("createAccount")}</h2>
            <p className="text-gray-600">{t("createNewAccount")}</p>
          </div>

          <Tabs defaultValue="user" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="user">{t("user")}</TabsTrigger>
              <TabsTrigger value="driver">{t("driver")}</TabsTrigger>
            </TabsList>

            <TabsContent value="user">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">{t("firstName")}</Label>
                    <Input
                      id="firstName"
                      placeholder="太郎"
                      value={formData.firstName}
                      onChange={handleChange}
                      className="h-12"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">{t("lastName")}</Label>
                    <Input
                      id="lastName"
                      placeholder="山田"
                      value={formData.lastName}
                      onChange={handleChange}
                      className="h-12"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">{t("emailAddress")}</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="example@email.com"
                    value={formData.email}
                    onChange={handleChange}
                    className="h-12"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">{t("phoneNumber")}</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+84 123 456 789"
                    value={formData.phone}
                    onChange={handleChange}
                    className="h-12"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">{t("password")}</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder={t("enterPassword")}
                    value={formData.password}
                    onChange={handleChange}
                    className="h-12"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">{t("confirmPassword")}</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder={t("reEnterPassword")}
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="h-12"
                  />
                </div>

                <Button
                  onClick={handleUserSignUp}
                  disabled={isLoading}
                  className="w-full h-12 bg-black hover:bg-gray-800 text-white"
                >
                  {t("register")}
                </Button>
                {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}
              </div>
            </TabsContent>

            <TabsContent value="driver">
              <Card className="p-6 border-2 border-dashed border-gray-300">
                <div className="flex flex-col items-center text-center gap-4">
                  <div className="bg-black text-white p-4 rounded-full">
                    <Truck className="h-8 w-8" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2">{t("registerAsDriver")}</h3>
                    <p className="text-gray-600 text-sm">{t("registerAsDriverSubtitle")}</p>
                  </div>
                  <p className="text-sm text-gray-500">{t("driverSignupHint")}</p>
                  <Button
                    onClick={goToDriverRegistration}
                    className="w-full h-12 bg-black hover:bg-gray-800 text-white"
                  >
                    {t("continueDriverRegistration")}
                  </Button>
                </div>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="text-center text-sm mt-6">
            <span className="text-gray-600">{t("alreadyHaveAccount")} </span>
            <Link to="/login" className="text-black font-semibold underline">
              {t("login")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
