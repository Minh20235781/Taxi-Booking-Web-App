import { useState } from "react";
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

export default function DriverHomepage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [isOnline, setIsOnline] = useState(false);

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
                  onCheckedChange={setIsOnline}
                  className="scale-150"
                />
              </div>
            </div>
          </Card>

          {/* New Ride Request */}
          {isOnline && (
            <Card className="p-6 mb-6 bg-green-50 border-green-200 animate-pulse">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-lg mb-2">
                    {t("newRideRequest")}
                  </h3>
                  <p className="text-gray-600 mb-1">
                    {t("pickup")}: Tran Hung Dao St
                  </p>
                  <p className="text-gray-600">
                    {t("destination")}: Noi Bai Airport
                  </p>
                  <p className="font-semibold mt-2">
                    {t("estimatedEarnings")}: 350,000 VND
                  </p>
                </div>
                <Button
                  onClick={() =>
                    navigate("/driver/ride-accept")
                  }
                  className="bg-green-600 hover:bg-green-700 text-white h-12 px-8"
                >
                  {t("acceptRequest")}
                </Button>
              </div>
            </Card>
          )}

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
                      850,000 VND
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
                    <p className="text-2xl font-bold">8</p>
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
                      6.5{t("hours")}
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
                    <p className="text-2xl font-bold">4.9</p>
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

          {/* Recent Ratings */}
          <Card className="p-6">
            <h3 className="font-bold text-lg mb-4">
              {t("recentRatings")}
            </h3>
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="flex items-center gap-1">
                  <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                  <span className="font-bold">5.0</span>
                </div>
                <div className="flex-1">
                  <p className="font-semibold mb-1">
                    田中 太郎
                  </p>
                  <p className="text-sm text-gray-600">
                    「とても親切で、時間通りに到着しました。ありがとうございました！」
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    2026-03-27
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex items-center gap-1">
                  <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                  <span className="font-bold">5.0</span>
                </div>
                <div className="flex-1">
                  <p className="font-semibold mb-1">
                    鈴木 花子
                  </p>
                  <p className="text-sm text-gray-600">
                    「日本語が話せて助かりました。安全運転でした。」
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    2026-03-25
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}