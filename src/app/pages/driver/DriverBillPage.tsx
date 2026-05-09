import { useNavigate } from "react-router";
import { Header } from "../../components/Header";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Separator } from "../../components/ui/separator";
import { MapPin, Calendar, DollarSign, Check } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";

export default function DriverBillPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header type="driver" />

      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="bg-green-100 text-green-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="h-8 w-8" />
            </div>
            <h1 className="text-3xl font-bold mb-2">{t("tripCompleted")}</h1>
            <p className="text-gray-600">{t("goodWork")}</p>
          </div>

          {/* Earnings Card */}
          <Card className="p-8 mb-6 bg-green-50 border-green-200">
            <div className="text-center mb-6">
              <div className="flex items-center justify-center gap-2 mb-2">
                <DollarSign className="h-8 w-8 text-green-600" />
                <h2 className="text-5xl font-bold text-green-600">350,000 VND</h2>
              </div>
              <p className="text-gray-600">{t("thisRideEarnings")}</p>
            </div>

            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-green-200">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">850,000</p>
                <p className="text-sm text-gray-600">{t("todayEarnings")}</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">9</p>
                <p className="text-sm text-gray-600">{t("todaysRides")}</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">7.5</p>
                <p className="text-sm text-gray-600">{t("activeHours")}</p>
              </div>
            </div>
          </Card>

          {/* Trip Details */}
          <Card className="p-8 mb-6">
            <h3 className="font-semibold text-lg mb-4">{t("tripDetails")}</h3>

            <div className="space-y-4 mb-6">
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-gray-600">{t("pickupPoint")}</p>
                  <p className="font-semibold">123 Tran Hung Dao St, Hoan Kiem</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-gray-600">{t("destinationPoint")}</p>
                  <p className="font-semibold">Noi Bai International Airport</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-gray-600">{t("dateTime")}</p>
                  <p className="font-semibold">2026年3月28日 14:30 - 15:15</p>
                </div>
              </div>
            </div>

            <Separator className="my-6" />

            {/* Earnings Breakdown */}
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">{t("baseFare")}</span>
                <span className="font-semibold">300,000 VND</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">{t("tollFee")}</span>
                <span className="font-semibold">20,000 VND</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">{t("tip")}</span>
                <span className="font-semibold text-green-600">30,000 VND</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-gray-600">{t("subtotal")}</span>
                <span className="font-semibold">350,000 VND</span>
              </div>
              <div className="flex justify-between text-red-600">
                <span>{t("commission")} (20%)</span>
                <span className="font-semibold">-70,000 VND</span>
              </div>
              <Separator />
              <div className="flex justify-between text-lg">
                <span className="font-bold">{t("yourEarnings")}</span>
                <span className="font-bold text-green-600">280,000 VND</span>
              </div>
            </div>
          </Card>

          {/* Customer Info */}
          <Card className="p-6 mb-6">
            <h3 className="font-semibold mb-3">{t("customer")}</h3>
            <p className="font-semibold">田中 太郎</p>
            <p className="text-sm text-gray-600">{t("waitingForRating")}</p>
          </Card>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button
              onClick={() => navigate("/driver/home")}
              className="w-full h-12 bg-black hover:bg-gray-800 text-white"
            >
              {t("returnHome")}
            </Button>
            <Button
              onClick={() => navigate("/driver/income")}
              variant="outline"
              className="w-full h-12"
            >
              {t("viewIncomeManagement")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}