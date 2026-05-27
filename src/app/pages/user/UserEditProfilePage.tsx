import { useState } from "react";
import { useEffect } from "react";
import { useNavigate } from "react-router";
import { Header } from "../../components/Header";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import { Camera, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "../../contexts/LanguageContext";
import { api } from "../../services/api";

export default function UserEditProfilePage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    country: "",
    avatarUrl: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    api.me()
      .then((res: any) => {
        const u = res.user || res;
        setFormData((prev) => ({
          ...prev,
          fullName: u.fullName || "",
          email: u.email || "",
          phone: u.phone || "",
          address: u.address || "",
          city: u.city || "",
          country: u.country || "",
          avatarUrl: u.avatarUrl || "",
        }));
      })
      .catch((err) => console.error("Failed to load user for edit:", err));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.id]: e.target.value,
    });
  };

  const handleSave = () => {
    api.updateUserProfile({
      fullName: formData.fullName,
      email: formData.email,
      phone: formData.phone,
      address: formData.address,
      city: formData.city,
      country: formData.country
    })
      .then(() => {
        toast.success(t("profileUpdated"));
        navigate("/user/profile");
      })
      .catch((err) => {
        console.error("Failed to update user:", err);
        toast.error(t("failedToUpdateProfile") || "Failed to update profile");
      });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header type="user" />

      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-2xl mx-auto">
          {/* Back Button */}
          <Button
            variant="ghost"
            onClick={() => navigate("/user/profile")}
            className="mb-6 gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("back")}
          </Button>

          <h1 className="text-3xl font-bold mb-6">{t("editProfile")}</h1>

          {/* Profile Photo */}
          <Card className="p-6 mb-6">
            <h3 className="font-semibold mb-4">{t("profilePhoto")}</h3>
            <div className="flex items-center gap-6">
              <div className="relative">
                <Avatar className="h-24 w-24">
                  {formData.avatarUrl ? (
                    <AvatarImage src={formData.avatarUrl} />
                  ) : null}
                  <AvatarFallback>
                    {formData.fullName
                      ? formData.fullName
                          .split(" ")
                          .filter(Boolean)
                          .slice(0, 2)
                          .map((p) => p[0])
                          .join("")
                      : "?"}
                  </AvatarFallback>
                </Avatar>
                <button className="absolute bottom-0 right-0 bg-black text-white p-2 rounded-full hover:bg-gray-800">
                  <Camera className="h-4 w-4" />
                </button>
              </div>
              <div>
                <Button variant="outline" className="mb-2">
                  {t("changePhoto")}
                </Button>
                <p className="text-sm text-gray-600">{t("imageFormatLimit")}</p>
              </div>
            </div>
          </Card>

          {/* Personal Information */}
          <Card className="p-6 mb-6">
            <h3 className="font-semibold mb-4">{t("personalInformation")}</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">{t("fullName")}</Label>
                <Input
                  id="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">{t("emailAddress")}</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">{t("phoneNumber")}</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleChange}
                />
              </div>
            </div>
          </Card>

          {/* Address Information */}
          <Card className="p-6 mb-6">
            <h3 className="font-semibold mb-4">{t("addressInformation")}</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="address">{t("address")}</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={handleChange}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">{t("city")}</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">{t("country")}</Label>
                  <Input
                    id="country"
                    value={formData.country}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Password Change */}
          <Card className="p-6 mb-6">
            <h3 className="font-semibold mb-4">{t("changePassword")}</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">{t("currentPassword")}</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={formData.currentPassword}
                  onChange={handleChange}
                  placeholder={t("enterCurrentPassword")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">{t("newPassword")}</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={formData.newPassword}
                  onChange={handleChange}
                  placeholder={t("enterNewPassword")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">{t("confirmPassword")}</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder={t("reenterPassword")}
                />
              </div>
            </div>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={handleSave}
              className="flex-1 h-12 bg-black hover:bg-gray-800 text-white"
            >
              {t("saveChanges")}
            </Button>
            <Button
              onClick={() => navigate("/user/profile")}
              variant="outline"
              className="flex-1 h-12"
            >
              {t("cancel")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}