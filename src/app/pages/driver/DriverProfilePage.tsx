import { useNavigate } from "react-router";
import { Header } from "../../components/Header";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import { 
  User, 
  Mail, 
  Phone, 
  Car,
  CreditCard, 
  Settings, 
  Bell,
  Shield,
  HelpCircle,
  ChevronRight,
  Star,
  Award
} from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";

export default function DriverProfilePage() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const menuItems = [
    {
      icon: User,
      title: t("editPersonalInfo"),
      description: t("updateNameContact"),
      action: () => navigate("/driver/edit-profile"),
    },
    {
      icon: Car,
      title: t("vehicleInformation"),
      description: t("manageVehicleDocuments"),
      action: () => {},
    },
    {
      icon: CreditCard,
      title: t("paymentSettings"),
      description: t("bankAccountPayment"),
      action: () => {},
    },
    {
      icon: Award,
      title: t("ratingsAndBadges"),
      description: t("checkCustomerRatings"),
      action: () => {},
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
      <Header type="driver" />

      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-4xl mx-auto">
          {/* Profile Header */}
          <Card className="p-8 mb-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-6">
                <Avatar className="h-24 w-24">
                  <AvatarImage src="https://i.pravatar.cc/150?img=12" />
                  <AvatarFallback>NT</AvatarFallback>
                </Avatar>
                <div>
                  <h1 className="text-2xl font-bold mb-2">Nguyen Thanh</h1>
                  <div className="space-y-1 text-gray-600">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      <span>nguyen.thanh@email.com</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      <span>+84 987 654 321</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Car className="h-4 w-4" />
                      <span>Toyota Vios • 30A-12345</span>
                    </div>
                  </div>
                </div>
              </div>
              <Button
                onClick={() => navigate("/driver/edit-profile")}
                variant="outline"
              >
                <Settings className="h-4 w-4 mr-2" />
                {t("edit")}
              </Button>
            </div>
          </Card>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="p-6 text-center">
              <div className="flex items-center justify-center gap-1 mb-2">
                <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                <p className="text-3xl font-bold">4.9</p>
              </div>
              <p className="text-gray-600">{t("averageRating")}</p>
            </Card>
            <Card className="p-6 text-center">
              <p className="text-3xl font-bold mb-1">847</p>
              <p className="text-gray-600">{t("totalRides")}</p>
            </Card>
            <Card className="p-6 text-center">
              <p className="text-3xl font-bold mb-1">98%</p>
              <p className="text-gray-600">{t("acceptanceRate")}</p>
            </Card>
            <Card className="p-6 text-center">
              <p className="text-3xl font-bold mb-1">3年</p>
              <p className="text-gray-600">{t("driverExperience")}</p>
            </Card>
          </div>

          {/* Achievements */}
          <Card className="p-6 mb-6">
            <h3 className="font-semibold text-lg mb-4">{t("earnedBadges")}</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <div className="bg-yellow-400 text-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Star className="h-6 w-6" />
                </div>
                <p className="font-semibold text-sm">{t("fiveStarDriver")}</p>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="bg-blue-400 text-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Award className="h-6 w-6" />
                </div>
                <p className="font-semibold text-sm">{t("veteran")}</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="bg-green-400 text-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Car className="h-6 w-6" />
                </div>
                <p className="font-semibold text-sm">{t("cleanCar")}</p>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="bg-purple-400 text-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Award className="h-6 w-6" />
                </div>
                <p className="font-semibold text-sm">{t("multilingualSupport")}</p>
              </div>
            </div>
          </Card>

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