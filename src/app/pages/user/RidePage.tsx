import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { BookingStepIndicator } from "../../components/BookingStepIndicator";
import { Header } from "../../components/Header";
import { MapPlaceholder } from "../../components/MapPlaceholder";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import { Phone, MessageCircle, Star, MapPin, Loader2 } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";
import { clearBookingFlowDraft, clearActiveBookingId, getActiveBookingId, getBookingFlowDraft, setActiveBookingId, updateBookingFlowDraft } from "../../services/bookingFlow";
import type { LocationSuggestion, PaymentMethodCode } from "../../services/api";
import { calculateFare, formatVnd } from "../../services/pricing";
import { api } from "../../services/api";

const LANGUAGE_LABELS: Record<string, string> = {
  japanese: "Japanese",
  english: "English",
  vietnamese: "Vietnamese",
};

function toPaymentMethodCode(methodId?: string): PaymentMethodCode {
  if (methodId === "momo") return "MOMO";
  if (methodId === "cash") return "CASH";
  return "CARD";
}

function parseLanguageList(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((v) => String(v).trim().toLowerCase()).filter(Boolean);
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map((v) => String(v).trim().toLowerCase()).filter(Boolean);
    } catch {}
    return value.split(",").map((v) => v.trim().toLowerCase()).filter(Boolean);
  }
  return [];
}

export default function RidePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useLanguage();
  const draft = getBookingFlowDraft();
  const [bookingWithRide, setBookingWithRide] = useState<any | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [driverEndedTrip, setDriverEndedTrip] = useState(false);
  const [isPolling, setIsPolling] = useState(true);
  const [driverJustAssigned, setDriverJustAssigned] = useState(false);
  const [pickupSelection] = useState<LocationSuggestion | null>(draft.pickupSelection || null);
  const [destinationSelection] = useState<LocationSuggestion | null>(
    draft.destinationSelection || null
  );
  const pollingRef = useRef<number | null>(null);
  const hadDriverRef = useRef(false);

  const bookingId =
    Number(searchParams.get("bookingId")) ||
    draft.bookingId ||
    getActiveBookingId() ||
    0;

  const pickupText = bookingWithRide?.pickupAddress || draft.pickupText || "-";
  const destinationText = bookingWithRide?.destination || draft.destinationText || "-";
  const estimatedFare =
    draft.vehicle?.code && draft.routeDistanceMeters && draft.routeDurationSeconds
      ? formatVnd(
          calculateFare(draft.vehicle.code, draft.routeDistanceMeters, draft.routeDurationSeconds)
            .totalFare
        )
      : draft.vehicle?.price || "-";

  // Poll booking status so page updates when a driver accepts
  useEffect(() => {
    if (bookingId && bookingId !== draft.bookingId) {
      updateBookingFlowDraft({ bookingId });
    }
    if (bookingId) {
      setActiveBookingId(bookingId);
    }
  }, [bookingId, draft.bookingId]);

  useEffect(() => {
    if (!bookingId) {
      setIsPolling(false);
      return;
    }

    let mounted = true;
    const fetchOnce = async () => {
      try {
        const res = await api.getBookingWithRide(bookingId);
        const data = (res as any).data || res;
        if (!mounted) return;

        if (data?.status === "CANCELLED") {
          clearActiveBookingId();
          setIsPolling(false);
          return;
        }

        if (data?.status === "COMPLETED") {
          clearActiveBookingId();
          setIsPolling(false);
          try {
            sessionStorage.setItem("last_completed_booking_id", String(bookingId));
          } catch {}
          navigate("/user/bill");
          return;
        }

        setBookingWithRide(data);

        if (data?.ride?.status === "COMPLETED") {
          setDriverEndedTrip(true);
        }

        if (data?.ride) {
          if (!hadDriverRef.current) {
            setDriverJustAssigned(true);
          }
          hadDriverRef.current = true;
        }
      } catch (err) {
        console.error("Failed to fetch booking with ride:", err);
      }
    };

    fetchOnce();
    pollingRef.current = window.setInterval(fetchOnce, 5000);
    return () => {
      mounted = false;
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [bookingId]);

  const handleCompleteRide = async () => {
    if (bookingId) {
      try {
        await api.confirmBookingPayment(bookingId, {
          method: toPaymentMethodCode(draft.paymentMethodId),
          label: draft.paymentMethodLabel,
        });
        sessionStorage.setItem("last_completed_booking_id", String(bookingId));
        clearActiveBookingId();
      } catch (error) {
        console.error("Failed to confirm payment on server", error);
      }
    }
    setIsCompleted(true);
    setTimeout(() => navigate("/user/bill"), 500);
  };

  const handleCancelRide = async () => {
    if (bookingId) {
      try {
        await api.cancelBooking(bookingId);
      } catch (error) {
        console.error("Failed to cancel booking:", error);
      }
    }
    clearActiveBookingId();
    clearBookingFlowDraft();
    navigate("/user/home");
  };

  const hasDriver = Boolean(bookingWithRide?.ride);
  const driverUser = bookingWithRide?.ride?.driver?.user;
  const driverProfile = bookingWithRide?.ride?.driver;
  const driverName = driverUser?.fullName || null;
  const driverAvatarUrl = driverUser?.avatarUrl || null;
  const driverInitials = driverName
    ? driverName.split(" ").filter(Boolean).slice(0, 2).map((p: string) => p[0]).join("")
    : "?";

  const driverLanguages = parseLanguageList(driverProfile?.languages);
  const customerLanguages = parseLanguageList(bookingWithRide?.preferencesJson).length
    ? parseLanguageList(bookingWithRide?.preferencesJson)
    : parseLanguageList(draft.preferences?.languages);
  const matchedLanguages = driverLanguages.filter((lang) => customerLanguages.includes(lang));
  const languagesToShow = matchedLanguages.length > 0 ? matchedLanguages : driverLanguages;

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header type="user" />

      <div className="flex-1 flex">
        {/* Left Panel */}
        <div className="w-full md:w-1/2 lg:w-2/5 p-6 overflow-auto border-r">
          <div className="max-w-lg">
            <BookingStepIndicator currentStep={6} title="乗車中" />

            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-bold">
                  {hasDriver ? t("onRide") : t("waitingForDriver")}
                </h2>
                {hasDriver && (
                  <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">
                    {t("driverOnTheWay")}
                  </span>
                )}
              </div>
              <p className="text-gray-600">
                {destinationText} {t("headingTo")}
              </p>
            </div>

            {/* Waiting state — no driver yet */}
            {!hasDriver && (
              <Card className="p-8 mb-6 flex flex-col items-center text-center gap-4">
                {isPolling ? (
                  <>
                    <Loader2 className="h-12 w-12 text-black animate-spin" />
                    <div>
                      <p className="font-semibold text-lg mb-1">{t("lookingForDriver")}</p>
                      <p className="text-sm text-gray-600">{t("lookingForDriverSub")}</p>
                      <p className="text-xs text-gray-500 mt-2">{t("canLeaveAndReturn")}</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="h-12 w-12 bg-gray-200 rounded-full flex items-center justify-center">
                      <MapPin className="h-6 w-6 text-gray-500" />
                    </div>
                    <p className="text-gray-600">{t("noDriverYet")}</p>
                  </>
                )}
                <Button
                  variant="outline"
                  onClick={handleCancelRide}
                  className="text-red-600 border-red-600 hover:bg-red-50"
                >
                  {t("cancelRide")}
                </Button>
              </Card>
            )}

            {/* Driver Info — only when driver is assigned */}
            {hasDriver && (
              <>
                {driverJustAssigned && (
                  <Card className="p-4 mb-4 bg-green-50 border-green-200">
                    <p className="text-sm font-semibold text-green-800">{t("driverAssignedNotice")}</p>
                  </Card>
                )}
                <Card className="p-6 mb-6">
                  <div className="flex items-start gap-4 mb-4">
                    <Avatar className="h-16 w-16">
                      {driverAvatarUrl && <AvatarImage src={driverAvatarUrl} />}
                      <AvatarFallback>{driverInitials}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-lg">{driverName || "—"}</h3>
                        {driverProfile?.averageRating != null && (
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            <span className="font-semibold">{driverProfile.averageRating}</span>
                          </div>
                        )}
                      </div>
                      {(driverProfile?.vehicleModel || driverProfile?.vehicleColor) && (
                        <p className="text-gray-600 text-sm mb-1">
                          {[driverProfile.vehicleModel, driverProfile.vehicleColor]
                            .filter(Boolean)
                            .join(" • ")}
                        </p>
                      )}
                      {driverProfile?.vehiclePlate && (
                        <p className="font-semibold">{driverProfile.vehiclePlate}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      onClick={() => {
                        if (bookingWithRide?.id) {
                          updateBookingFlowDraft({ bookingId: bookingWithRide.id });
                        }
                        navigate(`/user/message-call?bookingId=${bookingWithRide?.id || ""}`);
                      }}
                      className="flex-1 bg-black hover:bg-gray-800 text-white"
                    >
                      <MessageCircle className="h-4 w-4 mr-2" />
                      {t("message")}
                    </Button>
                    <Button
                      onClick={() =>
                        navigate(`/user/message-call?bookingId=${bookingWithRide?.id || ""}`)
                      }
                      variant="outline"
                      className="flex-1"
                    >
                      <Phone className="h-4 w-4 mr-2" />
                      {t("phone")}
                    </Button>
                  </div>
                </Card>

                {languagesToShow.length > 0 && (
                  <Card className="p-6 mb-6 bg-blue-50 border-blue-200">
                    <h3 className="font-semibold mb-3">{t("supportedLanguages")}</h3>
                    <div className="flex flex-wrap gap-2">
                      {languagesToShow.map((lang) => (
                        <span
                          key={lang}
                          className={`px-3 py-1 rounded-full text-sm font-semibold ${
                            matchedLanguages.includes(lang)
                              ? "bg-blue-600 text-white"
                              : "bg-gray-200 text-gray-700"
                          }`}
                        >
                          {LANGUAGE_LABELS[lang] || lang}
                        </span>
                      ))}
                    </div>
                  </Card>
                )}

                <Card className="p-6 mb-6">
                  <h3 className="font-semibold mb-4">{t("tripDetails")}</h3>
                  <div className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="bg-green-500 rounded-full p-1">
                        <div className="w-2 h-2 bg-white rounded-full" />
                      </div>
                      <div className="w-0.5 h-8 bg-gray-300" />
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
                  <div className="mt-4 pt-4 border-t flex justify-between">
                    <span className="text-gray-600">{t("estimatedFare")}</span>
                    <span className="font-bold text-lg">{estimatedFare}</span>
                  </div>
                </Card>

                <Card className="p-4 mb-6 bg-gray-50">
                  <p className="text-sm text-gray-700">
                    <strong>安全のため：</strong>
                    {t("safetyNote")}
                  </p>
                </Card>

                {driverEndedTrip && (
                  <Card className="p-4 mb-4 bg-amber-50 border-amber-200">
                    <p className="text-sm font-semibold text-amber-800">{t("driverEndedTrip")}</p>
                  </Card>
                )}

                <Button
                  onClick={handleCompleteRide}
                  disabled={isCompleted}
                  className="w-full h-12 bg-green-600 hover:bg-green-700 text-white mb-3"
                >
                  {driverEndedTrip ? t("confirmPayment") : t("completeRide")}
                </Button>
                {!driverEndedTrip && (
                  <Button
                    variant="outline"
                    onClick={handleCancelRide}
                    className="w-full h-12 text-red-600 border-red-600 hover:bg-red-50"
                  >
                    {t("cancelRide")}
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Right Panel — Map */}
        <div className="hidden md:block flex-1 p-6">
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
