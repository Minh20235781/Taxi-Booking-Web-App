import { useNavigate } from "react-router";
import { useEffect, useState } from "react";
import { api } from "../../services/api";
import { Header } from "../../components/Header";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  CreditCard, 
  Settings, 
  Bell,
  Shield,
  HelpCircle,
  ChevronRight
} from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";

export default function UserProfilePage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    api.me()
      .then((res: any) => setUser(res.user || res))
      .catch((err) => console.error("Failed to load user:", err));
  }, []);

  const menuItems = [
    {
      icon: User,
      title: t("editPersonalInfo"),
      description: t("updateNamePhone"),
      action: () => navigate("/user/edit-profile"),
    },
    {
      icon: MapPin,
      title: t("savedPlaces"),
      description: t("manageHomeWork"),
      action: () => {},
    },
    {
      icon: CreditCard,
      title: t("paymentMethod"),
      description: t("managePaymentMethods"),
      action: () => navigate("/user/payment"),
    },
    {
      icon: Bell,
      title: t("notificationSettings"),
      description: t("pushEmailSettings"),
      action: () => {},
    },
    {
      icon: Shield,
      title: t("privacySecurity"),
      description: t("accountSecuritySettings"),
      action: () => {},
    },
    {
      icon: HelpCircle,
      title: t("helpSupport"),
      description: t("faqContact"),
      action: () => {},
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header type="user" />

      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-4xl mx-auto">
          {/* Profile Header */}
          <Card className="p-8 mb-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-6">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={user?.avatarUrl || "https://i.pravatar.cc/150?img=33"} />
                  <AvatarFallback>{user?.fullName ? user.fullName.slice(0,2) : "顧客"}</AvatarFallback>
                </Avatar>
                <div>
                  <h1 className="text-2xl font-bold mb-2">{user?.fullName || "—"}</h1>
                  <div className="space-y-1 text-gray-600">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      <span>{user?.email || "-"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      <span>{user?.phone || "-"}</span>
                    </div>
                  </div>
                </div>
              </div>
              <Button
                onClick={() => navigate("/user/edit-profile")}
                variant="outline"
              >
                <Settings className="h-4 w-4 mr-2" />
                {t("edit")}
              </Button>
            </div>
          </Card>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="p-6 text-center">
              <p className="text-3xl font-bold mb-1">47</p>
              <p className="text-gray-600">{t("totalRides")}</p>
            </Card>
            <Card className="p-6 text-center">
              <p className="text-3xl font-bold mb-1">4.8</p>
              <p className="text-gray-600">{t("averageRating")}</p>
            </Card>
            <Card className="p-6 text-center">
              <p className="text-3xl font-bold mb-1">2年</p>
              <p className="text-gray-600">{t("membershipPeriod")}</p>
            </Card>
          </div>

          {/* Menu Items */}
          <div className="space-y-3">
            {menuItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <Card
                  key={index}
                  className="p-6 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={item.action}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="bg-gray-100 p-3 rounded-full">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold mb-1">{item.title}</h3>
                        <p className="text-sm text-gray-600">{item.description}</p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Logout */}
          <div className="mt-6">
            <Button
              onClick={() => navigate("/login")}
              variant="outline"
              className="w-full h-12 text-red-600 border-red-600 hover:bg-red-50"
            >
              {t("logout")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}