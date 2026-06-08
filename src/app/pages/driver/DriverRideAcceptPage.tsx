import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Header } from "../../components/Header";
import { MapPlaceholder } from "../../components/MapPlaceholder";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import { MapPin, Navigation, Star, Clock, DollarSign } from "lucide-react";
import { Progress } from "../../components/ui/progress";
import { useLanguage } from "../../contexts/LanguageContext";
import { api } from "../../services/api";

function mapBookingToRideView(booking: any) {
  if (!booking?.id) return null;
  let langs: string[] = [];
  let prefs: string[] = [];
  let specialRequest: string | null = null;
  if (booking.preferencesJson) {
    try {
      const parsed = JSON.parse(booking.preferencesJson);
      if (Array.isArray(parsed.languages)) langs = parsed.languages;
      if (Array.isArray(parsed.ridePreferences)) prefs = parsed.ridePreferences;
      if (typeof parsed.specialRequest === "string") specialRequest = parsed.specialRequest;
    } catch {
      /* ignore */
    }
  }
  return {
    id: String(booking.id),
    customerName: booking.user?.fullName || "",
    customerAvatar: booking.user?.avatarUrl || null,
    customerRating: 0,
    pickup: booking.pickupAddress,
    destination: booking.destination,
    distance: booking.routeDistanceMeters
      ? `${Math.round(booking.routeDistanceMeters / 1000)} km`
      : "",
    duration: booking.routeDurationSeconds
      ? String(Math.round(booking.routeDurationSeconds / 60))
      : "",
    earnings: booking.estimatedFare ? String(Math.round(booking.estimatedFare)) : "",
    languages: langs,
    preferences: prefs,
    specialRequest
  };
}

export default function DriverRideAcceptPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const bookingIdParam = Number(searchParams.get("bookingId") || 0);
  const { t } = useLanguage();
  const [countdown, setCountdown] = useState(15);
  const [currentRide, setCurrentRide] = useState<any>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate("/driver/home");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        if (bookingIdParam > 0) {
          const res = await api.getBookingWithRide(bookingIdParam);
          const booking = (res as { data?: unknown }).data || res;
          const mapped = mapBookingToRideView(booking);
          if (mounted && mapped) {
            setCurrentRide(mapped);
            return;
          }
        }

        const list: any = await api.getDriverAcceptedRides();
        if (!mounted || !Array.isArray(list) || list.length === 0) return;
        const active = list.filter((r) =>
          ["ACCEPTED", "DRIVER_EN_ROUTE", "ARRIVED", "IN_PROGRESS"].includes(r.rideStatus)
        );
        const match =
          bookingIdParam > 0
            ? list.find((r) => Number(r.id) === bookingIdParam)
            : null;
        setCurrentRide(match || active[0] || list[0]);
      } catch (err) {
        console.error("Failed to load ride for accept screen:", err);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [bookingIdParam]);

  const handleAccept = () => {
    const bookingId = bookingIdParam || Number(currentRide?.id || 0);
    navigate(bookingId ? `/driver/ride-info?bookingId=${bookingId}` : "/driver/ride-info");
  };

  const handleDecline = () => {
    navigate("/driver/home");
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header type="driver" />

      <div className="flex-1 flex">
        <div className="w-full md:w-1/2 lg:w-2/5 p-6 overflow-auto border-r">
          <div className="max-w-lg">
            <Card className="p-6 mb-6 bg-yellow-50 border-yellow-200">
              <div className="text-center mb-3">
                <p className="text-sm text-gray-600 mb-2">{t("timeRemaining")}</p>
                <p className="text-5xl font-bold">
                  {countdown}
                  {t("seconds")}
                </p>
              </div>
              <Progress value={(countdown / 15) * 100} className="h-2" />
            </Card>

            <Card className="p-6 mb-6">
              <h3 className="font-semibold mb-4">{t("customerInfo")}</h3>
              <div className="flex items-center gap-4 mb-4">
                <Avatar className="h-16 w-16">
                  {currentRide?.customerAvatar ? (
                    <AvatarImage src={currentRide.customerAvatar} />
                  ) : null}
                  <AvatarFallback>{currentRide?.customerName?.slice(0, 2) || "?"}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-bold text-lg">{currentRide?.customerName || "—"}</p>
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-semibold">{currentRide?.customerRating ?? "-"}</span>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm font-semibold text-blue-800 mb-1">{t("languageRequirements")}</p>
                <div className="flex gap-2">
                  {currentRide?.languages && currentRide.languages.length > 0 ? (
                    currentRide.languages.map((lang: string) => (
                      <span
                        key={lang}
                        className="bg-blue-600 text-white px-2 py-1 rounded text-xs font-semibold"
                      >
                        {t(lang)}
                      </span>
                    ))
                  ) : (
                    <span className="bg-blue-600 text-white px-2 py-1 rounded text-xs font-semibold">
                      —
                    </span>
                  )}
                </div>
              </div>
            </Card>

            <Card className="p-6 mb-6">
              <h3 className="font-semibold mb-4">{t("tripDetails")}</h3>

              <div className="space-y-4 mb-4">
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
                      <p className="font-semibold">{currentRide?.pickup || "—"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">{t("destinationPoint")}</p>
                      <p className="font-semibold">{currentRide?.destination || "—"}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <div className="flex items-center gap-2 text-gray-600 mb-1">
                    <Navigation className="h-4 w-4" />
                    <span className="text-sm">{t("distance")}</span>
                  </div>
                  <p className="font-bold">{currentRide?.distance || "-"}</p>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-gray-600 mb-1">
                    <Clock className="h-4 w-4" />
                    <span className="text-sm">{t("estimatedTime")}</span>
                  </div>
                  <p className="font-bold">
                    {currentRide?.duration ? `${currentRide.duration}${t("minutes")}` : "-"}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6 mb-6 bg-green-50 border-green-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-green-600 text-white p-3 rounded-full">
                    <DollarSign className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">{t("estimatedEarnings")}</p>
                    <p className="text-2xl font-bold">
                      {currentRide?.earnings
                        ? `${Number(currentRide.earnings).toLocaleString()} VND`
                        : "-"}
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-4 mb-6 bg-gray-50">
              <p className="text-sm font-semibold mb-2">{t("specialRequests")}</p>
              <p className="text-sm text-gray-700">
                {currentRide?.specialRequest
                  ? currentRide.specialRequest
                  : currentRide?.preferences && currentRide.preferences.length
                    ? currentRide.preferences.join("、")
                    : `${t("airconRequired")}、${t("quietRide")}`}
              </p>
            </Card>

            <div className="space-y-3">
              <Button
                onClick={handleAccept}
                className="w-full h-14 bg-green-600 hover:bg-green-700 text-white text-lg"
              >
                {t("acceptRideRequest")}
              </Button>
              <Button
                onClick={handleDecline}
                variant="outline"
                className="w-full h-14 text-red-600 border-red-600 hover:bg-red-50"
              >
                {t("decline")}
              </Button>
            </div>
          </div>
        </div>

        <div className="hidden md:block flex-1 p-6">
          <MapPlaceholder showRoute className="h-full" />
        </div>
      </div>
    </div>
  );
}
