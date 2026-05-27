import { useState } from "react";
import { useNavigate } from "react-router";
import { BookingStepIndicator } from "../../components/BookingStepIndicator";
import { Header } from "../../components/Header";
import { MapPlaceholder } from "../../components/MapPlaceholder";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { MapPin, Navigation, Search, Car, CreditCard, Languages, Clock, Calendar } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";
import { clearBookingFlowDraft, getBookingFlowDraft, buildScheduledAtFromDraft } from "../../services/bookingFlow";
import { formatScheduledLocal } from "../../services/reservation";
import { api, type LocationSuggestion } from "../../services/api";

export default function DriverRequestPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const draft = getBookingFlowDraft();
  const isReservation = draft.entryPoint === "reservation";
  const [pickup] = useState(draft.pickupText || "");
  const [destination] = useState(draft.destinationText || "");
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
  const scheduledIso = buildScheduledAtFromDraft(draft);
  const scheduleDisplay = formatScheduledLocal(scheduledIso);

  const handleConfirm = () => {
    if (!hasLockedRoute || !draft.bookingId) return;

    if (isReservation) {
      navigate(`/user/reservation-status?bookingId=${draft.bookingId}`);
      return;
    }

    navigate("/user/ride");
  };

  const handleCancelBooking = async () => {
    if (isReservation && draft.bookingId) {
      if (!window.confirm(t("cancelReservationConfirm"))) return;
      try {
        await api.cancelBooking(draft.bookingId);
      } catch {
        /* still clear local draft */
      }
    }
    clearBookingFlowDraft();
    navigate("/user/home");
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header type="user" />

      <div className="flex-1 flex">
        <div className="w-[30%] p-6 overflow-auto border-r">
          <div className="max-w-lg">
            <h1 className="text-2xl font-bold mb-6">
              {isReservation ? t("scheduleRide") : t("bookRide")}
            </h1>

            <div className="mb-4">
              <div className="flex items-center gap-3 p-4 border-2 border-gray-300 rounded-lg bg-gray-50">
                <div className="bg-green-500 rounded-full p-1">
                  <div className="w-3 h-3 bg-white rounded-full" />
                </div>
                <Input value={pickup} readOnly className="border-0 bg-transparent focus-visible:ring-0" />
                <Navigation className="h-5 w-5 text-gray-400" />
              </div>
            </div>

            <div className="mb-6">
              <div className="flex items-center gap-3 p-4 border-2 border-black rounded-lg">
                <MapPin className="h-5 w-5" />
                <Input value={destination} readOnly className="border-0 focus-visible:ring-0" />
                <Search className="h-5 w-5 text-gray-400" />
              </div>
            </div>
          </div>
        </div>

        <div className="w-[40%] p-6 overflow-auto border-r">
          <div className="max-w-lg">
            <BookingStepIndicator
              currentStep={5}
              title={isReservation ? t("confirmReservation") : t("confirmBooking")}
            />
            <h2 className="text-xl font-bold mb-2">
              {isReservation ? t("confirmReservation") : t("confirmBooking")}
            </h2>
            <p className="text-gray-600 mb-6">{t("reviewYourBooking")}</p>

            {isReservation && (
              <Card className="p-6 mb-4 bg-blue-50 border-blue-200">
                <div className="flex items-center gap-3 mb-2">
                  <Calendar className="h-5 w-5 text-blue-700" />
                  <h3 className="font-semibold text-lg">{t("scheduledPickup")}</h3>
                </div>
                <p className="ml-8 font-bold text-lg">{scheduleDisplay.datetime}</p>
                <p className="ml-8 text-sm text-blue-900 mt-2">{t("reservationWaitingNote")}</p>
              </Card>
            )}

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

            <Card className="p-6 mb-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-black text-white p-2 rounded-full">
                  <Languages className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-lg">{t("preferences")}</h3>
              </div>
              <div className="ml-11 space-y-1">
                {preferenceRows.length > 0 ? (
                  preferenceRows.map((item) => (
                    <p key={item} className="text-sm">
                      • {t(item) || item}
                    </p>
                  ))
                ) : (
                  <p className="text-sm">-</p>
                )}
                {draft.preferences?.specialRequest ? (
                  <p className="text-sm mt-2 text-gray-700">
                    {t("specialRequests")}: {draft.preferences.specialRequest}
                  </p>
                ) : null}
              </div>
            </Card>

            {!isReservation && (
              <Card className="p-6 mb-6 bg-gray-50">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-gray-600" />
                  <div>
                    <p className="text-sm text-gray-600">{t("estimatedPickup")}</p>
                    <p className="font-bold text-lg">3-5 {t("minutes")}</p>
                  </div>
                </div>
              </Card>
            )}

            <div className="space-y-3">
              <Button
                onClick={handleConfirm}
                disabled={!hasLockedRoute || !draft.bookingId}
                className="w-full h-12 bg-black hover:bg-gray-800 text-white"
              >
                {isReservation ? t("confirmReservation") : t("requestDriver")}
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
                {isReservation ? t("cancelReservation") : t("cancelRide")}
              </Button>
            </div>
          </div>
        </div>

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
