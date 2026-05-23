import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Header } from "../../components/Header";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Switch } from "../../components/ui/switch";
import {
  DollarSign,
  TrendingUp,
  Clock,
  Star,
  Calendar,
  History,
  Wallet,
} from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";
import { api } from "../../services/api";

export default function DriverHomepage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [isOnline, setIsOnline] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [declinedRides, setDeclinedRides] = useState<number[]>([]);
  
  // State bổ sung để quản lý thông tin đánh giá sao động từ DB
  const [driverProfile, setDriverProfile] = useState<any>(null);
  const [recentRatings, setRecentRatings] = useState<{ id: number; score: number; comment: string | null; createdAt: string; riderName: string | null; riderAvatar: string | null }[]>([]);

  const loadRatings = () => {
    api.getDriverRatings(5)
      .then((res) => setRecentRatings(res.ratings || []))
      .catch((err) => console.error("Failed to fetch driver ratings:", err));
  };

  useEffect(() => {
    api.getDriverProfile()
      .then((response) => {
        const data = response.data || response;
        setDriverProfile(data?.driverProfile || data);

        // Cập nhật trạng thái online
        const onlineStatus = data?.driverProfile?.isOnline ?? data?.isOnline;
        setIsOnline(!!onlineStatus);
      })
      .catch(console.error);

    loadRatings();

    // Refresh ratings when the driver comes back to this tab (e.g. after a ride got rated).
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

  const handleToggleOnline = async (checked: boolean) => {
    setIsOnline(checked);
    if (!checked) setPendingRequests([]);
    try {
      // Chỉ gửi isOnline, không gửi toàn bộ object để tránh lỗi update
      await api.updateDriverProfile({ isOnline: checked });
      setDriverProfile((prev: any) => ({ ...prev, isOnline: checked }));
    } catch (error) {
      console.error("Toggle error:", error);
      setIsOnline(!checked);
    }
  };

  useEffect(() => {
    let interval: number;
    if (isOnline) {
      const fetchRequests = async () => {
        try {
          const data = await api.getPendingRequests();
          if (Array.isArray(data)) {
            setPendingRequests(data);
          } else if (data && Array.isArray(data.requests)) {
            setPendingRequests(data.requests);
          }
        } catch (error) {
          console.error(error);
        }
      };
      fetchRequests();
      interval = window.setInterval(fetchRequests, 5000);
    }
    return () => clearInterval(interval);
  }, [isOnline]);

  const handleAcceptRide = async (bookingId: number) => {
    try {
      await api.acceptRide(bookingId);
      navigate("/driver/ride-accept");
    } catch (error) {
      console.error(error);
      alert("Failed to accept ride. It might have been taken or canceled.");
    }
  };

  const handleDecline = (bookingId: number) => {
    // Persist decline to backend so this driver won't see the request again
    api.declineRide(bookingId).catch((err) => console.error("Decline failed:", err));
    setDeclinedRides((prev) => [...prev, bookingId]);
  };

  // Các thông số thống kê động dựa trên DB, nếu chưa nhập hoặc chưa có dữ liệu sẽ trả về trống ""
  const averageRating = driverProfile?.averageRating != null ? driverProfile.averageRating : "";
  
  // Các thông số thống kê theo ngày (hiện tại chưa có trong DB schema của bạn), đặt mặc định trống ""
  const todayEarnings = ""; 
  const todaysRides = "";
  const hoursOnline = "";

  // Hàm xử lý hiển thị thu nhập an toàn
const formatEarnings = (value: any) => {
  // Nếu dữ liệu chưa có, null, undefined hoặc chuỗi rỗng thì để trống UI
  if (value === null || value === undefined || value === "") {
    return ""; 
  }
  
  const num = Number(value);
  // Trường hợp không phải là số hợp lệ thì trả về rỗng để tránh hiển thị NaN
  if (isNaN(num)) {
    return "";
  }
  
  // Trả về chuỗi đã định dạng (Ví dụ: 850,000 VND hoặc 0 VND)
  return `${num.toLocaleString()} VND`;
};

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header type="driver" />

      <div className="flex-1 p-6 ml-6 mr-6 overflow-auto">
        <div className="max-w-7xl mx-auto">
          {/* Online Status Toggle */}
          <Card className="p-8 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold mb-2">
                  {isOnline ? t("online") : t("offline")}
                </h2>
                <p className="text-gray-600">
                  {isOnline
                    ? t("acceptingRides")
                    : t("notAcceptingRides")}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-semibold">
                  {isOnline ? "ON" : "OFF"}
                </span>
                <Switch
                  checked={isOnline}
                  onCheckedChange={handleToggleOnline}
                  className="scale-150"
                />
              </div>
            </div>
          </Card>

          {/* New Ride Requests */}
          {isOnline && pendingRequests.filter(req => !declinedRides.includes(req.id) && req.bookingType !== "SCHEDULED").map(request => (
            <Card key={request.id} className="p-6 mb-6 bg-green-50 border-green-200 animate-pulse">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-lg mb-2">
                    {t("newRideRequest")}
                  </h3>
                  <p className="inline-flex items-center rounded-full bg-white/80 px-2 py-1 text-xs font-semibold text-green-700 border border-green-200 mb-2">
                    Instant Request
                  </p>
                  <p className="text-gray-600 mb-1">
                    {t("pickup")}: {request.pickupAddress}
                  </p>
                  <p className="text-gray-600">
                    {t("destination")}: {request.destination}
                  </p>
                  <p className="font-semibold mt-2">
                    {t("estimatedEarnings")}: {request.estimatedFare?.toLocaleString() || 0} VND
                  </p>
                  {request.scheduledAt ? (
                    <p className="text-gray-600 mt-1">
                      Scheduled for: {new Date(request.scheduledAt).toLocaleString()}
                    </p>
                  ) : null}
                </div>
                <div className="flex gap-4">
                  <Button
                    onClick={() => handleDecline(request.id)}
                    variant="outline"
                    className="h-12 px-8"
                  >
                    {t("decline")}
                  </Button>
                  <Button
                    onClick={() => handleAcceptRide(request.id)}
                    className="bg-green-600 hover:bg-green-700 text-white h-12 px-8"
                  >
                    {t("acceptRequest")}
                  </Button>
                </div>
              </div>
            </Card>
          ))}

          {/* Split Layout: Left (Stats) + Right (Quick Actions) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Left: Today's Stats in 2x2 Grid */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="p-6">
                <div className="flex flex-col gap-3">
                  <div className="bg-green-100 p-3 rounded-full w-fit">
                    <DollarSign className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">
                      {t("todayEarnings")}
                    </p>
                    <p className="text-2xl font-bold">
                      {formatEarnings(todayEarnings)}
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex flex-col gap-3">
                  <div className="bg-blue-100 p-3 rounded-full w-fit">
                    <TrendingUp className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">
                      {t("todaysRides")}
                    </p>
                    <p className="text-2xl font-bold">{formatEarnings(todaysRides)}</p>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex flex-col gap-3">
                  <div className="bg-purple-100 p-3 rounded-full w-fit">
                    <Clock className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">
                      {t("hoursOnline")}
                    </p>
                    <p className="text-2xl font-bold">
                      {hoursOnline ? `${hoursOnline} ${t("hours")}` : ""}
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex flex-col gap-3">
                  <div className="bg-yellow-100 p-3 rounded-full w-fit">
                    <Star className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">
                      {t("averageRating")}
                    </p>
                    <p className="text-2xl font-bold">{averageRating}</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Right: Quick Actions Panels */}
            <div className="flex flex-col gap-4">
              {/* Reservation List Button */}
              <Card
                className="p-6 hover:shadow-lg transition-shadow cursor-pointer grid grid-cols-[3fr_7fr] items-center gap-4 bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200"
                onClick={() =>
                  navigate("/driver/reservation-accept")
                }
              >
                <div className="bg-blue-600 p-4 rounded-full w-fit">
                  <Calendar className="h-8 w-8 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-xl mb-1">
                    {t("reservations")}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {t("viewAndAcceptScheduledRides")}
                  </p>
                </div>
              </Card>

              {/* Income Management */}
              <Card
                className="p-6 hover:shadow-lg transition-shadow cursor-pointer grid grid-cols-[3fr_7fr] items-center gap-4"
                onClick={() => navigate("/driver/income")}
              >
                <div className="bg-green-100 p-4 rounded-full w-fit">
                  <Wallet className="h-8 w-8 text-green-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-xl mb-1">
                    {t("incomeManagement")}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {t("viewIncomeManagement")}
                  </p>
                </div>
              </Card>

              {/* Ride History */}
              <Card
                className="p-6 hover:shadow-lg transition-shadow cursor-pointer grid grid-cols-[3fr_7fr] items-center gap-4"
                onClick={() => navigate("/driver/history")}
              >
                <div className="bg-purple-100 p-4 rounded-full w-fit">
                  <History className="h-8 w-8 text-purple-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-xl mb-1">
                    {t("rideHistory")}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {t("viewRideHistory")}
                  </p>
                </div>
              </Card>
            </div>
          </div>

          {/* Recent Ratings - fetched from /driver/ratings */}
          <Card className="p-6">
            <h3 className="font-bold text-lg mb-4">{t("recentRatings")}</h3>
            {recentRatings.length === 0 ? (
              <p className="text-sm text-gray-500">{t("noRatingsYet")}</p>
            ) : (
              <div className="space-y-4">
                {recentRatings.map((r) => (
                  <div key={r.id} className="flex items-start gap-4 pb-4 border-b last:border-b-0 last:pb-0">
                    <div className="flex items-center gap-1 min-w-[3rem]">
                      <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                      <span className="font-bold">{r.score.toFixed(1)}</span>
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold mb-1">{r.riderName || t("anonymousRider")}</p>
                      {r.comment ? (
                        <p className="text-sm text-gray-600">「{r.comment}」</p>
                      ) : null}
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(r.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}