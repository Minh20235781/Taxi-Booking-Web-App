import { useNavigate } from "react-router";
import { useEffect, useState } from "react";
import { Header } from "../../components/Header";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Car, Clock, MapPin, History } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";
import { clearBookingFlowDraft, restoreBookingFlowFromId, clearActiveBookingId } from "../../services/bookingFlow";
import { api } from "../../services/api";

type ActiveBooking = {
  id: number;
  pickupAddress: string;
  destination: string;
  hasDriver: boolean;
  rideStatus: string | null;
  driverName: string | null;
  vehicleModel: string | null;
  vehiclePlate: string | null;
};

export default function UserHomepage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [recentRides, setRecentRides] = useState<any[]>([]);
  const [upcomingReservations, setUpcomingReservations] = useState<any[]>([]);
  const [activeBooking, setActiveBooking] = useState<ActiveBooking | null>(null);
  const [loading, setLoading] = useState(true);

  const loadActiveBooking = () => {
    api
      .getActiveBooking()
      .then((res) => setActiveBooking(res.booking))
      .catch(() => setActiveBooking(null));
  };

  useEffect(() => {
    const fetchRecentBookings = async () => {
      try {
        const [recent, upcoming] = await Promise.all([
          api.getRecentBookings().catch(() => []),
          api.getUpcomingRides().catch(() => [])
        ]);
        if (Array.isArray(recent)) {
          setRecentRides(recent);
        }
        if (Array.isArray(upcoming)) {
          setUpcomingReservations(upcoming.slice(0, 3));
        }
      } catch (error) {
        console.error("Failed to fetch recent bookings:", error);
        setRecentRides([]);
      } finally {
        setLoading(false);
      }
    };
    fetchRecentBookings();
    loadActiveBooking();
    const poll = window.setInterval(loadActiveBooking, 5000);
    return () => clearInterval(poll);
  }, []);

  const continueActiveRide = async () => {
    if (!activeBooking) return;
    try {
      await restoreBookingFlowFromId(activeBooking.id, api.getBookingWithRide);
      navigate(`/user/ride?bookingId=${activeBooking.id}`);
    } catch (error) {
      console.error("Failed to resume ride:", error);
    }
  };

  const cancelActiveBooking = async () => {
    if (!activeBooking || !window.confirm(t("cancelRideConfirm"))) return;
    try {
      await api.cancelBooking(activeBooking.id);
      clearActiveBookingId();
      setActiveBooking(null);
    } catch (error) {
      console.error("Failed to cancel active booking:", error);
    }
  };

  const startBookNow = () => {
    if (activeBooking) {
      if (!window.confirm(t("cancelActiveBookingPrompt"))) return;
      api.cancelBooking(activeBooking.id).finally(() => {
        clearActiveBookingId();
        clearBookingFlowDraft();
        navigate("/user/booking");
      });
      return;
    }
    clearBookingFlowDraft();
    navigate("/user/booking");
  };

  const startReservation = () => {
    clearBookingFlowDraft();
    navigate("/user/reservation");
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header type="user" />

      <div className="flex-1 p-6">
        <div className="max-w-6xl mx-auto">
          {/* Welcome Section */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">{t("whereToToday")}</h1>
            <p className="text-gray-600">{t("enterDestination")}</p>
          </div>

          {activeBooking && (
            <Card className="p-6 mb-8 border-2 border-black bg-white">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-gray-500 mb-1">
                    {activeBooking.rideStatus === "COMPLETED"
                      ? t("activeRideAwaitingPayment")
                      : activeBooking.hasDriver
                      ? t("activeRideDriverFound")
                      : t("activeRideWaiting")}
                  </p>
                  <p className="font-bold">{activeBooking.pickupAddress}</p>
                  <p className="text-gray-600 text-sm">→ {activeBooking.destination}</p>
                  {activeBooking.hasDriver && activeBooking.driverName && (
                    <p className="text-sm mt-2">
                      {t("driver")}: {activeBooking.driverName}
                      {activeBooking.vehiclePlate ? ` • ${activeBooking.vehiclePlate}` : ""}
                    </p>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button onClick={continueActiveRide} className="bg-black hover:bg-gray-800 text-white">
                    {t("continueRide")}
                  </Button>
                  {!activeBooking.hasDriver && (
                    <Button variant="outline" onClick={cancelActiveBooking} className="text-red-600 border-red-600">
                      {t("cancelRide")}
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* Main Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <Card className="p-8 hover:shadow-lg transition-shadow cursor-pointer" onClick={startBookNow}>
              <div className="flex items-center gap-4">
                <div className="bg-black text-white p-4 rounded-full">
                  <Car className="h-8 w-8" />
                </div>
                <div>
                  <h3 className="font-bold text-xl mb-1">{t("bookNow")}</h3>
                  <p className="text-gray-600">{t("quickActions")}</p>
                </div>
              </div>
            </Card>

            <Card className="p-8 hover:shadow-lg transition-shadow cursor-pointer" onClick={startReservation}>
              <div className="flex items-center gap-4">
                <div className="bg-black text-white p-4 rounded-full">
                  <Clock className="h-8 w-8" />
                </div>
                <div>
                  <h3 className="font-bold text-xl mb-1">{t("scheduleForLater")}</h3>
                  <p className="text-gray-600">{t("myReservations")}</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Saved Places */}
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4">{t("savedAddresses")}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="p-6 hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="bg-gray-100 p-3 rounded-full">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold">{t("home")}</p>
                    <p className="text-sm text-gray-600">123 Tran Hung Dao St</p>
                  </div>
                </div>
              </Card>

              <Card className="p-6 hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="bg-gray-100 p-3 rounded-full">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold">{t("work")}</p>
                    <p className="text-sm text-gray-600">45 Ba Trieu St</p>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {upcomingReservations.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">{t("upcomingReservations")}</h2>
                <Button variant="ghost" onClick={() => navigate("/user/history")}>
                  {t("viewAll")}
                </Button>
              </div>
              <div className="space-y-3">
                {upcomingReservations.map((item) => (
                  <Card
                    key={item.id}
                    className="p-5 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => navigate(`/user/reservation-status?bookingId=${item.id}`)}
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <p className="font-semibold">{item.to}</p>
                        <p className="text-sm text-gray-600">
                          {item.date} {item.time}
                        </p>
                        <p className="text-sm mt-1">
                          {item.driverAssigned ? t("driverAssigned") : t("waitingForDriver")}
                        </p>
                      </div>
                      <Clock className="h-5 w-5 text-blue-600 shrink-0" />
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Recent Rides */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">{t("recentDestinations")}</h2>
              <Button variant="ghost" onClick={() => navigate("/user/history")}>
                {t("viewAll")}
              </Button>
            </div>
            <div className="space-y-3">
              {loading ? (
                <Card className="p-6 text-center text-gray-500">
                  {t("loading") || "読み込み中..."}
                </Card>
              ) : recentRides.length === 0 ? (
                <Card className="p-6 text-center text-gray-500">
                  {t("noRecentDestinations") || "最近のご利用がありません"}
                </Card>
              ) : (
                recentRides.map((ride) => (
                  <Card key={ride.id} className="p-6 hover:shadow-md transition-shadow cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="bg-gray-100 p-3 rounded-full">
                          <History className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-semibold">{ride.destination}</p>
                          <p className="text-sm text-gray-600">{ride.date}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{ride.price}</p>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
