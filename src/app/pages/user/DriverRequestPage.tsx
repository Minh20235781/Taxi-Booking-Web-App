import { useState } from "react";
import { useNavigate } from "react-router";
import { BookingStepIndicator } from "../../components/BookingStepIndicator";
import { Header } from "../../components/Header";
import { MapPlaceholder } from "../../components/MapPlaceholder";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { MapPin, Navigation, Search, Car, CreditCard, Languages, Clock } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";
import { clearBookingFlowDraft, getBookingFlowDraft } from "../../services/bookingFlow";
import type { LocationSuggestion } from "../../services/api";

export default function DriverRequestPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const draft = getBookingFlowDraft();
  const [pickup, setPickup] = useState(draft.pickupText || "");
  const [destination, setDestination] = useState(draft.destinationText || "");
  const [pickupSelection] = useState<LocationSuggestion | null>(draft.pickupSelection || null);
  const [destinationSelection] = useState<LocationSuggestion | null>(
    draft.destinationSelection || null
  );
  const vehicle = draft.vehicle;
  const paymentLabel = draft.paymentMethodLabel || t("paymentMethod");
  const preferenceRows = [
    ...(draft.preferences?.languages || []),
    ...(draft.preferences?.ridePreferences || [])
  ];
  const hasLockedRoute = Boolean(pickupSelection && destinationSelection);
  const handleCancelBooking = () => {
    clearBookingFlowDraft();
    navigate("/user/home");
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header type="user" />

      <div className="flex-1 flex">
        {/* Left Panel - Destination (30%) */}
        <div className="w-[30%] p-6 overflow-auto border-r">
          <div className="max-w-lg">
            <h1 className="text-2xl font-bold mb-6">{t("bookRide")}</h1>

            {/* Pickup Location */}
            <div className="mb-4">
              <div className="flex items-center gap-3 p-4 border-2 border-gray-300 rounded-lg bg-gray-50">
                <div className="bg-green-500 rounded-full p-1">
                  <div className="w-3 h-3 bg-white rounded-full"></div>
                </div>
                <Input
                  value={pickup}
                  readOnly
                  placeholder={t("pickupLocation")}
                  className="border-0 bg-transparent focus-visible:ring-0"
                />
                <Navigation className="h-5 w-5 text-gray-400" />
              </div>
            </div>

            {/* Destination */}
            <div className="mb-6">
              <div className="flex items-center gap-3 p-4 border-2 border-black rounded-lg">
                <MapPin className="h-5 w-5" />
                <Input
                  value={destination}
                  readOnly
                  placeholder={t("destination")}
                  className="border-0 focus-visible:ring-0"
                />
                <Search className="h-5 w-5 text-gray-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Middle Panel - Booking Confirmation (40%) */}
        <div className="w-[40%] p-6 overflow-auto border-r">
          <div className="max-w-lg">
            <BookingStepIndicator currentStep={5} title="予約内容の最終確認" />
            <h2 className="text-xl font-bold mb-2">{t("confirmBooking")}</h2>
            <p className="text-gray-600 mb-6">{t("reviewYourBooking")}</p>

            {/* Vehicle Summary */}
            <Card className="p-6 mb-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-black text-white p-2 rounded-full">
                  <Car className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-lg">{t("selectedVehicle")}</h3>
              </div>
              <div className="ml-11">
                <p className="font-bold">{vehicle?.name || "-"}</p>
                <p className="text-sm text-gray-600">
                  {vehicle ? `${vehicle.capacity} • ${vehicle.eta}` : "-"}
                </p>
                <p className="font-bold mt-2">{vehicle?.price || "-"}</p>
              </div>
            </Card>

            {/* Payment Summary */}
            <Card className="p-6 mb-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-black text-white p-2 rounded-full">
                  <CreditCard className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-lg">{t("paymentMethod")}</h3>
              </div>
              <div className="ml-11">
                <p className="font-semibold">{paymentLabel}</p>
              </div>
            </Card>

            {/* Preferences Summary */}
            <Card className="p-6 mb-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-black text-white p-2 rounded-full">
                  <Languages className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-lg">{t("preferences")}</h3>
              </div>
              <div className="ml-11 space-y-1">
                {preferenceRows.length > 0 ? (
                  preferenceRows.map((item) => (
                    <p key={item} className="text-sm">• {item}</p>
                  ))
                ) : (
                  <p className="text-sm">-</p>
                )}
              </div>
            </Card>

            {/* Estimated Time */}
            <Card className="p-6 mb-6 bg-gray-50">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-gray-600" />
                <div>
                  <p className="text-sm text-gray-600">{t("estimatedPickup")}</p>
                  <p className="font-bold text-lg">3-5 {t("minutes")}</p>
                </div>
              </div>
            </Card>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button
                onClick={() => {
                  const entryPoint = draft.entryPoint;
                  if (entryPoint === "reservation") {
                    clearBookingFlowDraft();
                    navigate("/user/home");
                  } else {
                    // Do NOT clear draft here for instant bookings, so RidePage/UserBillPage can use it
                    navigate("/user/ride");
                  }
                }}
                disabled={!hasLockedRoute}
                className="w-full h-12 bg-black hover:bg-gray-800 text-white"
              >
                {t("requestDriver")}
              </Button>
              <Button
                onClick={() => navigate("/user/preference")}
                variant="outline"
                className="w-full h-12"
              >
                {t("back")}
              </Button>
              <Button
                onClick={handleCancelBooking}
                variant="ghost"
                className="w-full h-12 text-red-600"
              >
                乗車をキャンセル
              </Button>
            </div>
          </div>
        </div>

        {/* Right Panel - Map (30%) */}
        <div className="w-[30%] p-6">
          <MapPlaceholder
            showRoute
            pickup={pickupSelection}
            destination={destinationSelection}
            className="h-full"
          />
        </div>
      </div>
    </div>
  );
}