import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { BookingStepIndicator } from "../../components/BookingStepIndicator";
import { Header } from "../../components/Header";
import { MapPlaceholder } from "../../components/MapPlaceholder";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import { Phone, MessageCircle, Star, MapPin, Navigation } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";
import { clearBookingFlowDraft, getBookingFlowDraft } from "../../services/bookingFlow";
import type { LocationSuggestion } from "../../services/api";
import { calculateFare, formatVnd } from "../../services/pricing";
import { api } from "../../services/api";

export default function RidePage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [isCompleted, setIsCompleted] = useState(false);
  const draft = getBookingFlowDraft();
  const [bookingWithRide, setBookingWithRide] = useState<any | null>(null);
  const [pickupSelection] = useState<LocationSuggestion | null>(draft.pickupSelection || null);
  const [destinationSelection] = useState<LocationSuggestion | null>(
    draft.destinationSelection || null
  );
  const pickupText = draft.pickupText || "-";
  const destinationText = draft.destinationText || "-";
  const estimatedFare =
    draft.vehicle?.code && draft.routeDistanceMeters && draft.routeDurationSeconds
      ? formatVnd(
          calculateFare(draft.vehicle.code, draft.routeDistanceMeters, draft.routeDurationSeconds)
            .totalFare
        )
      : draft.vehicle?.price || "-";

  // Simulate ride completion after some time (for demo)
  const handleCompleteRide = () => {
    setIsCompleted(true);
    // Navigate to bill page
    setTimeout(() => {
      navigate("/user/bill");
    }, 500);
  };

  const handleCancelRide = () => {
    clearBookingFlowDraft();
    navigate("/user/home");
  };

  useEffect(() => {
    const bookingId = draft.bookingId;
    if (!bookingId) return;
    api.getBookingWithRide(bookingId)
      .then((res) => {
        const data = res.data || res;
        setBookingWithRide(data);
      })
      .catch((err) => console.error("Failed to fetch booking with ride:", err));
  }, [draft.bookingId]);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header type="user" />

      <div className="flex-1 flex">
        {/* Left Panel - Driver Info */}
        <div className="w-full md:w-1/2 lg:w-2/5 p-6 overflow-auto border-r">
          <div className="max-w-lg">
            <BookingStepIndicator currentStep={6} title="乗車中" />
            {/* Trip Status */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-bold">{t("onRide")}</h2>
                <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">
                  {t("estimatedArrival")} : 12{t("minutes")}
                </span>
              </div>
              <p className="text-gray-600">{destinationText}{t("headingTo")}</p>
            </div>

            {/* Driver Information */}
            <Card className="p-6 mb-6">
              <div className="flex items-start gap-4 mb-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={bookingWithRide?.ride?.driver?.user?.avatarUrl || "https://i.pravatar.cc/150?img=12"} />
                  <AvatarFallback>{bookingWithRide?.ride?.driver?.user?.fullName?.slice(0,2) || "NT"}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-lg">{bookingWithRide?.ride?.driver?.user?.fullName || "--"}</h3>
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-semibold">{bookingWithRide?.ride?.driver?.averageRating ?? ""}</span>
                    </div>
                  </div>
                  <p className="text-gray-600 text-sm mb-2">{bookingWithRide?.ride?.driver?.vehicleModel || ""} • {bookingWithRide?.ride?.driver?.vehicleColor || ""}</p>
                  <p className="font-semibold">{bookingWithRide?.ride?.driver?.vehiclePlate || ""}</p>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => navigate("/user/message-call")}
                  className="flex-1 bg-black hover:bg-gray-800 text-white"
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  {t("message")}
                </Button>
                <Button
                  onClick={() => navigate("/user/message-call")}
                  variant="outline"
                  className="flex-1"
                >
                  <Phone className="h-4 w-4 mr-2" />
                  {t("phone")}
                </Button>
              </div>
            </Card>

            {/* Language Skills */}
            <Card className="p-6 mb-6 bg-blue-50 border-blue-200">
              <h3 className="font-semibold mb-3">{t("supportedLanguages")}</h3>
              <div className="flex flex-wrap gap-2">
                <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                  {t("japanese")}
                </span>
                <span className="bg-gray-200 text-gray-700 px-3 py-1 rounded-full text-sm">
                  {t("vietnamese")}
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
                      <p className="font-semibold">{pickupText}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">{t("destinationPoint")}</p>
                      <p className="font-semibold">{destinationText}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t flex justify-between">
                <span className="text-gray-600">{t("estimatedFare")}</span>
                <span className="font-bold text-lg">{estimatedFare}</span>
              </div>
            </Card>

            {/* Safety */}
            <Card className="p-4 mb-6 bg-gray-50">
              <p className="text-sm text-gray-700">
                <strong>安全のため：</strong>{t("safetyNote")}
              </p>
              <Button variant="link" className="h-auto p-0 text-sm mt-2">
                {t("shareTrip")}
              </Button>
            </Card>

            {/* Complete Ride Button (Demo) */}
            <Button
              onClick={handleCompleteRide}
              className="w-full h-12 bg-green-600 hover:bg-green-700 text-white mb-3"
            >
              乗車完了 (Demo)
            </Button>

            {/* Cancel Button */}
            <Button
              variant="outline"
              onClick={handleCancelRide}
              className="w-full h-12 text-red-600 border-red-600 hover:bg-red-50"
            >
              {t("cancelRide")}
            </Button>
          </div>
        </div>

        {/* Right Panel - Map */}
        <div className="hidden md:block flex-1 p-6">
          <MapPlaceholder
            showRoute
            pickup={pickupSelection}
            destination={destinationSelection}
            className="h-full"
          />

          {/* Floating Navigation Card */}
          <Card className="absolute top-24 right-10 p-4 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="bg-black text-white p-2 rounded-full">
                <Navigation className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-gray-600">到着まで</p>
                <p className="font-bold text-lg">12{t("minutes")}</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
