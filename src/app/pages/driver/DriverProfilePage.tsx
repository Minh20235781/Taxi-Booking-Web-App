import { useState, useEffect } from "react";
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
import { api } from "../../services/api";
import { logout } from "../../utils/auth";

export default function DriverProfilePage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  
  // State lưu thông tin profile từ database
  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [ratings, setRatings] = useState<
    { id: number; score: number; comment: string | null; compliments?: string[]; createdAt: string; riderName: string | null; riderAvatar: string | null }[]
  >([]);

  const complimentLabel = (key: string) => {
    const map: Record<string, string> = {
      friendly: t("friendlyDriver"),
      clean: t("cleanVehicle"),
      safe: t("safeDriving"),
      onTime: t("onTime"),
      conversation: t("greatConversation"),
      smooth: t("smoothDriving"),
    };
    return map[key] || key;
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await api.getDriverProfile();
        // Kiểm tra cấu trúc trả về (giống DriverEditProfilePage)
        const data = response.data || response;
        setProfileData(data);
      } catch (error) {
        console.error("Failed to fetch driver profile:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();

    const loadRatings = () => {
      api.getDriverRatings(10)
        .then((res) => setRatings(res.ratings || []))
        .catch((err) => console.error("Failed to fetch driver ratings:", err));
    };
    loadRatings();

    const onVisible = () => {
      if (document.visibilityState === "visible") loadRatings();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", loadRatings);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", loadRatings);
    };
  }, []);

  // Trích xuất dữ liệu an toàn bằng Optional Chaining (?.), nếu không có sẽ để chuỗi rỗng ""
  const user = profileData?.user;
  const driverProfile = profileData?.driverProfile;

  const fullName = user?.fullName || "";
  const email = user?.email || "";
  const phone = user?.phone || "";
  
  // Xử lý hiển thị thông tin xe
  const vehicleInfo = driverProfile?.vehicleModel && driverProfile?.vehiclePlate
    ? `${driverProfile.vehicleModel} • ${driverProfile.vehiclePlate}`
    : driverProfile?.vehicleModel || driverProfile?.vehiclePlate || "";

  const averageRating = driverProfile?.averageRating != null ? driverProfile.averageRating : "";
  const totalTrips = driverProfile?.totalTrips != null ? driverProfile.totalTrips : "";

  // Các trường này hiện chưa có trong file prisma schema của bạn, tạm thời để trống theo yêu cầu
  const acceptanceRate = ""; 
  const driverExperience = "";

  // Tạo chữ cái viết tắt cho AvatarFallback từ tên tài xế
  const getInitials = (name: string) => {
    if (!name) return "TX";
    const parts = name.trim().split(" ");
    return parts.length > 1 
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : parts[0][0].toUpperCase();
  };

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
    // Removed Notification / Privacy / Help quick links per product request
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <p className="text-gray-500 font-medium">Loading profile...</p>
      </div>
    );
  }

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
                  <AvatarImage src={user?.avatarUrl || "https://i.pravatar.cc/150?img=12"} />
                  <AvatarFallback>{getInitials(fullName)}</AvatarFallback>
                </Avatar>
                <div>
                  <h1 className="text-2xl font-bold mb-2">{fullName}</h1>
                  <div className="space-y-1 text-gray-600">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      <span>{email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      <span>{phone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Car className="h-4 w-4" />
                      <span>{vehicleInfo}</span>
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
                <p className="text-3xl font-bold">{averageRating}</p>
              </div>
              <p className="text-gray-600">{t("averageRating")}</p>
            </Card>
            <Card className="p-6 text-center">
              <p className="text-3xl font-bold mb-1">{totalTrips}</p>
              <p className="text-gray-600">{t("totalRides")}</p>
            </Card>
            <Card className="p-6 text-center">
              <p className="text-3xl font-bold mb-1">{acceptanceRate}</p>
              <p className="text-gray-600">{t("acceptanceRate")}</p>
            </Card>
            <Card className="p-6 text-center">
              <p className="text-3xl font-bold mb-1">{driverExperience}</p>
              <p className="text-gray-600">{t("driverExperience")}</p>
            </Card>
          </div>

          {/* Recent Ratings from riders */}
          <Card className="p-6 mb-6">
            <h3 className="font-semibold text-lg mb-4">{t("recentRatings")}</h3>
            {ratings.length === 0 ? (
              <p className="text-sm text-gray-500">{t("noRatingsYet")}</p>
            ) : (
              <div className="space-y-4">
                {ratings.map((r) => (
                  <div key={r.id} className="flex gap-3 pb-4 border-b last:border-b-0 last:pb-0">
                    <Avatar className="h-10 w-10">
                      {r.riderAvatar ? <AvatarImage src={r.riderAvatar} /> : null}
                      <AvatarFallback>
                        {(r.riderName || "?").trim().split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">{r.riderName || t("anonymousRider")}</p>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              className={`h-4 w-4 ${s <= r.score ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
                            />
                          ))}
                        </div>
                      </div>
                      {r.compliments && r.compliments.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {r.compliments.map((tag) => (
                            <span key={tag} className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">
                              {complimentLabel(tag)}
                            </span>
                          ))}
                        </div>
                      )}
                      {r.comment ? (
                        <p className="text-sm text-gray-600 mt-1">{r.comment}</p>
                      ) : null}
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(r.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

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
              onClick={() => {
                logout();
                navigate("/login");
              }}
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