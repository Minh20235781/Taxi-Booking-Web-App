import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Header } from "../../components/Header";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { MapPin, Calendar, Star, Search, Download } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";
import { clearBookingFlowDraft, getRecentCompletedBooking, updateBookingFlowDraft } from "../../services/bookingFlow";
import { api } from "../../services/api";

export default function UserRideHistoryPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [completedRides, setCompletedRides] = useState<any[]>([]);
  const [upcomingRides, setUpcomingRides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  const handleCancelReservation = async (ride: { id: number; canCancel?: boolean }) => {
    if (!ride.canCancel) return;
    if (!window.confirm(t("cancelReservationConfirm"))) return;
    try {
      setCancellingId(ride.id);
      await api.cancelBooking(ride.id);
      setUpcomingRides((prev) => prev.filter((r) => r.id !== ride.id));
    } catch (err) {
      alert(err instanceof Error ? err.message : t("cancelFailed"));
    } finally {
      setCancellingId(null);
    }
  };

  useEffect(() => {
    const fetchRideData = async () => {
      try {
        const [completed, upcoming] = await Promise.all([
          api.getCompletedRides().catch(() => []),
          api.getUpcomingRides().catch(() => [])
        ]);
        const completedList = Array.isArray(completed) ? completed : [];
        const recentCompletedBooking = getRecentCompletedBooking<any>();

        if (recentCompletedBooking?.status === "COMPLETED" || recentCompletedBooking?.ride?.status === "COMPLETED") {
          const when = recentCompletedBooking.scheduledAt || recentCompletedBooking.createdAt;
          const dateObj = when ? new Date(when) : new Date();
          const dateStr = dateObj.toISOString().slice(0, 10);
          const timeStr = dateObj.toTimeString().slice(0, 5);
          const fareValue = recentCompletedBooking.estimatedFare
            ? `${Math.round(Number(recentCompletedBooking.estimatedFare)).toLocaleString()} VND`
            : "-";
          const cachedRide = {
            id: recentCompletedBooking.id,
            driver: recentCompletedBooking.ride?.driver?.user?.fullName || "Driver",
            from: recentCompletedBooking.pickupAddress || "-",
            to: recentCompletedBooking.destination || "-",
            pickupLat: recentCompletedBooking.pickupLat,
            pickupLng: recentCompletedBooking.pickupLng,
            destinationLat: recentCompletedBooking.destinationLat,
            destinationLng: recentCompletedBooking.destinationLng,
            date: dateStr,
            time: timeStr,
            price: fareValue,
            rating: recentCompletedBooking.ride?.driver?.averageRating || 5,
            status: recentCompletedBooking.status || "COMPLETED"
          };

          const merged = [cachedRide, ...completedList.filter((ride: any) => ride.id !== cachedRide.id)];
          setCompletedRides(merged);
        } else {
          setCompletedRides(completedList);
        }
        setUpcomingRides(Array.isArray(upcoming) ? upcoming : []);
      } catch (error) {
        console.error("Error fetching rides:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchRideData();
  }, []);

  const handleBookAgain = (ride: any) => {
    clearBookingFlowDraft();
    updateBookingFlowDraft({
      pickupText: ride.from,
      destinationText: ride.to,
      pickupSelection: {
        placeId: "book-again-pickup",
        label: ride.from,
        lat: ride.pickupLat || parseFloat(import.meta.env.VITE_DEFAULT_LAT || "35.6812"),
        lon: ride.pickupLng || parseFloat(import.meta.env.VITE_DEFAULT_LNG || "139.7671")
      },
      destinationSelection: {
        placeId: "book-again-dest",
        label: ride.to,
        lat: ride.destinationLat || parseFloat(import.meta.env.VITE_DEFAULT_LAT || "35.6812"),
        lon: ride.destinationLng || parseFloat(import.meta.env.VITE_DEFAULT_LNG || "139.7671")
      }
    });
    navigate("/user/booking");
  };

  const isOnRideReady = (ride: any) => {
    if (!ride?.scheduledAt || ride.status === "CANCELLED" || ride.status === "COMPLETED") {
      return false;
    }
    const scheduledTime = new Date(ride.scheduledAt).getTime();
    if (Number.isNaN(scheduledTime)) {
      return false;
    }
    return scheduledTime - Date.now() <= 60 * 60 * 1000;
  };

  const handleOpenOnRide = (ride: any) => {
    updateBookingFlowDraft({
      bookingId: ride.id,
      pickupText: ride.from,
      destinationText: ride.to,
      reservationDate: ride.scheduledAt,
      reservationTime: ride.time,
      paymentMethodLabel: ride.paymentMethodLabel,
      vehicle: ride.vehicle ? { code: ride.vehicle, name: ride.vehicle, capacity: "", eta: "", price: ride.price } : undefined
    });
    navigate("/user/ride");
  };

  const handleCancelReservation = async (ride: any) => {
    try {
      await api.cancelBooking(Number(ride.id));
      setUpcomingRides((prev) => prev.filter((item) => item.id !== ride.id));
    } catch (error) {
      console.error("Failed to cancel reservation:", error);
      alert(error instanceof Error ? error.message : "Failed to cancel reservation.");
    }
  };

  // Filter rides based on search query
  const filteredCompleted = completedRides.filter(ride =>
    ride.to.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ride.date.includes(searchQuery) ||
    ride.driver.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredUpcoming = upcomingRides.filter(ride =>
    ride.to.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ride.date.includes(searchQuery)
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header type="user" />

      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">{t("rideHistory")}</h1>

          {/* Search */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("searchByDestinationOrDate")}
                className="pl-10 h-12"
              />
            </div>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="completed" className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
              <TabsTrigger value="completed">{t("completedRides")}</TabsTrigger>
              <TabsTrigger value="upcoming">{t("upcomingRides")}</TabsTrigger>
            </TabsList>

            {/* Completed Rides */}
            <TabsContent value="completed" className="space-y-4">
              {loading ? (
                <Card className="p-6 text-center text-gray-500">
                  {t("loading") || "读み込み中..."}
                </Card>
              ) : filteredCompleted.length === 0 ? (
                <Card className="p-6 text-center text-gray-500">
                  {searchQuery ? t("noResults") || "検索結果がありません" : t("noCompletedRides") || "完了した乗車がありません"}
                </Card>
              ) : (
                filteredCompleted.map((ride) => (
                  <Card key={ride.id} className="p-6 hover:shadow-lg transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-bold text-lg">{ride.driver}</h3>
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            <span className="text-sm font-semibold">{ride.rating}</span>
                          </div>
                        </div>
                        
                        <div className="space-y-2 mb-3">
                          <div className="flex items-start gap-2">
                            <div className="bg-green-500 rounded-full p-1 mt-1">
                              <div className="w-2 h-2 bg-white rounded-full"></div>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">{t("pickupPoint")}</p>
                              <p className="font-semibold">{ride.from}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-start gap-2">
                            <MapPin className="h-4 w-4 text-red-500 fill-red-500 mt-1" />
                            <div>
                              <p className="text-sm text-gray-600">{t("destinationPoint")}</p>
                              <p className="font-semibold">{ride.to}</p>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span>{ride.date}</span>
                          </div>
                          <span>{ride.time}</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="font-bold text-xl mb-2">{ride.price}</p>
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4 mr-2" />
                          {t("receipt")}
                        </Button>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-4 border-t">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => handleBookAgain(ride)}
                      >
                        {t("bookAgain")}
                      </Button>
                      <Button
                        variant="ghost"
                        className="flex-1"
                      >
                        {t("support")}
                      </Button>
                    </div>
                  </Card>
                ))
              )}
            </TabsContent>

            {/* Upcoming Rides */}
            <TabsContent value="upcoming" className="space-y-4">
              {loading ? (
                <Card className="p-6 text-center text-gray-500">
                  {t("loading") || "读み込み中..."}
                </Card>
              ) : filteredUpcoming.length === 0 ? (
                <Card className="p-6 text-center text-gray-500">
                  {searchQuery ? t("noResults") || "検索結果がありません" : t("noUpcomingRides") || "予定されている乗車がありません"}
                </Card>
              ) : (
                filteredUpcoming.map((ride) => (
                  <Card key={ride.id} className="p-6 hover:shadow-lg transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex flex-wrap gap-2 mb-3">
                          {ride.status === "CANCELLED" ? (
                            <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-semibold">
                              {t("userCancelled")}
                            </span>
                          ) : (
                            <>
                              <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold">
                                {t("scheduled")}
                              </span>
                              <span
                                className={`px-3 py-1 rounded-full text-sm font-semibold ${
                                  ride.driverAssigned
                                    ? "bg-green-100 text-green-800"
                                    : "bg-amber-100 text-amber-800"
                                }`}
                              >
                                {ride.driverAssigned ? t("driverAssigned") : t("waitingForDriver")}
                              </span>
                            </>
                          )}
                        </div>
                        {ride.driverName ? (
                          <p className="text-sm text-gray-700 mb-2">
                            {t("yourDriver")}: <strong>{ride.driverName}</strong>
                          </p>
                        ) : null}
                        
                        <div className="space-y-2 mb-3">
                          <div className="flex items-start gap-2">
                            <div className="bg-green-500 rounded-full p-1 mt-1">
                              <div className="w-2 h-2 bg-white rounded-full"></div>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">{t("pickupPoint")}</p>
                              <p className="font-semibold">{ride.from}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-start gap-2">
                            <MapPin className="h-4 w-4 text-red-500 fill-red-500 mt-1" />
                            <div>
                              <p className="text-sm text-gray-600">{t("destinationPoint")}</p>
                              <p className="font-semibold">{ride.to}</p>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span>{ride.date}</span>
                          </div>
                          <span>{ride.time}</span>
                          <span className="bg-gray-100 px-2 py-1 rounded">{t(ride.vehicle)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-4 border-t">
                      {ride.status === "CANCELLED" ? (
                        <Button variant="outline" className="flex-1" disabled>
                          {t("userCancelled")}
                        </Button>
                      ) : (
                        <>
                          <Button
                            variant="outline"
                            className="flex-1"
                            onClick={() =>
                              navigate(`/user/reservation-status?bookingId=${ride.id}`)
                            }
                          >
                            {t("viewReservationStatus")}
                          </Button>
                          {isOnRideReady(ride) && (
                            <Button
                              variant="outline"
                              className="flex-1"
                              onClick={() => handleOpenOnRide(ride)}
                            >
                              {t("onRide")}
                            </Button>
                          )}
                        </>
                      )}
                      <Button
                        variant="ghost"
                        className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                        disabled={
                          ride.status === "CANCELLED" ||
                          !ride.canCancel ||
                          cancellingId === ride.id
                        }
                        onClick={() => handleCancelReservation(ride)}
                      >
                        {cancellingId === ride.id ? t("cancelling") : t("cancel")}
                      </Button>
                    </div>
                  </Card>
                ))
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}