import { useNavigate } from "react-router";
import { Header } from "../../components/Header";
import { MapPlaceholder } from "../../components/MapPlaceholder";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import { Phone, MessageCircle, MapPin, Navigation, Star } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";

export default function DriverRideInfoPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header type="driver" />

      <div className="flex-1 flex">
        {/* Left Panel - Customer Info */}
        <div className="w-full md:w-1/2 lg:w-2/5 p-6 overflow-auto border-r">
          <div className="max-w-lg">
            {/* Trip Status */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-bold">{t("onRide")}</h2>
                <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">
                  {t("destinationPoint")}: 32{t("minutes")}
                </span>
              </div>
              <p className="text-gray-600">Noi Bai Airport{t("headingTo")}</p>
            </div>

            {/* Customer Information */}
            <Card className="p-6 mb-6">
              <div className="flex items-start gap-4 mb-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src="https://i.pravatar.cc/150?img=33" />
                  <AvatarFallback>田中</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-lg">田中 太郎</h3>
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-semibold">4.8</span>
                    </div>
                  </div>
                  <p className="text-gray-600 text-sm">47{t("rides")}</p>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => navigate("/driver/message-call")}
                  className="flex-1 bg-black hover:bg-gray-800 text-white"
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  {t("message")}
                </Button>
                <Button
                  onClick={() => navigate("/driver/message-call")}
                  variant="outline"
                  className="flex-1"
                >
                  <Phone className="h-4 w-4 mr-2" />
                  {t("phone")}
                </Button>
              </div>
            </Card>

            {/* Language Info */}
            <Card className="p-6 mb-6 bg-blue-50 border-blue-200">
              <h3 className="font-semibold mb-3">{t("requestedLanguages")}</h3>
              <div className="flex flex-wrap gap-2">
                <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                  {t("japanese")}
                </span>
              </div>
            </Card>

            {/* Trip Details */}
            <Card className="p-6 mb-6">
              <h3 className="font-semibold mb-4">{t("tripDetails")}</h3>
              
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="bg-green-500 rounded-full p-1">
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    </div>
                    <div className="w-0.5 h-8 bg-gray-300"></div>
                    <MapPin className="h-4 w-4 text-red-500 fill-red-500" />
                  </div>
                  <div className="flex-1 space-y-4">
                    <div>
                      <p className="text-sm text-gray-600">{t("pickupPoint")}</p>
                      <p className="font-semibold">123 Tran Hung Dao St, Hoan Kiem</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">{t("destinationPoint")}</p>
                      <p className="font-semibold">Noi Bai International Airport</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t flex justify-between">
                <span className="text-gray-600">{t("earnings")}</span>
                <span className="font-bold text-lg text-green-600">350,000 VND</span>
              </div>
            </Card>

            {/* Navigation Buttons */}
            <div className="space-y-3 mb-6">
              <Button className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white">
                <Navigation className="h-4 w-4 mr-2" />
                {t("navigateToDestination")}
              </Button>
            </div>

            {/* Arrival Button */}
            <Button
              onClick={() => navigate("/driver/bill")}
              className="w-full h-14 bg-green-600 hover:bg-green-700 text-white text-lg"
            >
              {t("completeRide")}
            </Button>

            {/* Cancel Button */}
            <Button
              variant="outline"
              className="w-full h-12 mt-3 text-red-600 border-red-600 hover:bg-red-50"
            >
              {t("cancelRide")}
            </Button>
          </div>
        </div>

        {/* Right Panel - Map */}
        <div className="hidden md:block flex-1 p-6">
          <MapPlaceholder showRoute className="h-full" />
          
          {/* Floating Navigation Card */}
          <Card className="absolute top-24 right-10 p-4 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 text-white p-2 rounded-full">
                <Navigation className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-gray-600">{t("destinationPoint")}</p>
                <p className="font-bold text-lg">32{t("minutes")}</p>
                <p className="text-sm text-gray-600">25 km</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}