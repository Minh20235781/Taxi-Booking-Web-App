import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Header } from "../../components/Header";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "../../components/ui/avatar";
import { Badge } from "../../components/ui/badge";
import { Separator } from "../../components/ui/separator";
import {
  MapPin,
  Clock,
  Calendar,
  User,
  Phone,
  MessageCircle,
  Languages,
  Star,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Check,
} from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";
import { api } from "../../services/api";

interface Reservation {
  id: string;
  date: string;
  time: string;
  customerName: string;
  customerAvatar: string;
  customerRating: number;
  pickup: string;
  destination: string;
  distance: string;
  duration: string;
  earnings: string;
  languages: string[];
  preferences: string[];
  specialRequest?: string;
}

export default function DriverReservationAcceptPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const getLocalTodayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  const todayStr = getLocalTodayStr();
  
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [availableReservations, setAvailableReservations] = useState<Reservation[]>([]);
  const [selectedReservation, setSelectedReservation] =
    useState<Reservation | null>(null);
  const [acceptedReservations, setAcceptedReservations] = useState<Reservation[]>([]);
  const [declinedReservations, setDeclinedReservations] = useState<string[]>([]);

  useEffect(() => {
    let interval: number;

    const fetchData = () => {
      // Fetch pending requests (available reservations)
      api.getPendingRequests()
        .then((res) => {
          const bookings = (res || []).filter((b: any) => b.bookingType === "SCHEDULED");
          const mapped = bookings.map((b: any) => {
            const when = b.scheduledAt || b.createdAt;
            let dateStr = "";
            let timeStr = "";
            if (when) {
              const d = new Date(when);
              dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
              timeStr = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
            }
            let prefs = [];
            let langs = [];
            if (b.preferencesJson) {
              try {
                const parsed = JSON.parse(b.preferencesJson);
                if (Array.isArray(parsed.languages)) langs = parsed.languages;
                if (Array.isArray(parsed.ridePreferences)) prefs = parsed.ridePreferences;
              } catch {}
            }
            return {
              id: String(b.id),
              date: dateStr,
              time: timeStr,
              customerName: b.user?.fullName || "",
              customerAvatar: b.user?.avatarUrl || null,
              customerRating: b.user?.averageRating || 0,
              pickup: b.pickupAddress,
              destination: b.destination,
              distance: b.routeDistanceMeters ? `${Math.round(b.routeDistanceMeters / 1000)} km` : "",
              duration: b.routeDurationSeconds ? String(Math.round(b.routeDurationSeconds / 60)) : "",
              earnings: b.estimatedFare ? String(Math.round(b.estimatedFare)) : "",
              languages: langs,
              preferences: prefs,
              specialRequest: null
            };
          });
          setAvailableReservations(mapped);
        })
        .catch((err) => console.error("Failed to fetch pending requests:", err));

      // Fetch accepted rides for the driver
      api.getDriverAcceptedRides()
        .then((res) => {
          const list = res || [];
          setAcceptedReservations(list);
        })
        .catch((err) => console.error("Failed to fetch accepted rides:", err));
    };

    fetchData();
    interval = window.setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek, year, month };
  };

  const { daysInMonth, startingDayOfWeek, year, month } =
    getDaysInMonth(currentDate);

  // filter out reservations already accepted or declined by this driver
  const availableReservationsFiltered = availableReservations.filter(
    (res) => 
      !acceptedReservations.find((acc: any) => String(acc.id) === res.id) &&
      !declinedReservations.includes(res.id)
  );

  const reservationsForSelectedDate = availableReservationsFiltered.filter(
    (res) => res.date === selectedDate
  );

  const getReservationCountForDate = (dateStr: string) => {
    return availableReservationsFiltered.filter((res) => res.date === dateStr).length;
  };

  const handlePrevMonth = () => {
    setCurrentDate(
      new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() - 1,
        1,
      ),
    );
  };

  const handleNextMonth = () => {
    setCurrentDate(
      new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() + 1,
        1,
      ),
    );
  };

  const handleDateClick = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    setSelectedDate(dateStr);
    setSelectedReservation(null);
  };

  const handleAccept = async (reservation: Reservation) => {
    try {
      await api.acceptRide(Number(reservation.id));
      setAcceptedReservations([
        ...acceptedReservations,
        reservation,
      ]);
      // remove from available immediately
      setAvailableReservations((prev) => prev.filter((r) => r.id !== reservation.id));
      setSelectedReservation(null);
      navigate("/driver/ride-accept");
    } catch (error) {
      console.error(error);
      const message = error?.message || (error && String(error)) || "Failed to accept reservation.";
      alert(message.includes("Booking is no longer available") ? "Failed to accept reservation. It might have been taken or canceled." : message);
    }
  };

  const handleDecline = async (reservationId: string) => {
    try {
      await api.declineRide(Number(reservationId));
      setSelectedReservation(null);
      setDeclinedReservations([...declinedReservations, reservationId]);
    } catch (error) {
      console.error("Decline failed:", error);
    }
  };

  const handleCancelAcceptance = async (reservationId: string) => {
    try {
      await api.cancelAcceptance(Number(reservationId));
      setAcceptedReservations(
        acceptedReservations.filter((res) => res.id !== reservationId),
      );
      // refresh available list by removing local accepted reservation so it may reappear via fetch
      setAvailableReservations((prev) => prev.filter((r) => r.id !== reservationId));
    } catch (err) {
      console.error('Failed to cancel acceptance:', err);
      alert(t('failedToCancelAcceptance') || 'Failed to cancel acceptance');
    }
  };

  const monthNames = [
    "1月",
    "2月",
    "3月",
    "4月",
    "5月",
    "6月",
    "7月",
    "8月",
    "9月",
    "10月",
    "11月",
    "12月",
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header type="driver" />

      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-[1800px] mx-auto">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2">
              {t("reservations")}
            </h1>
            <p className="text-gray-600">
              {t("viewAndAcceptScheduledRides")}
            </p>
          </div>

          {/* 3:4:3 Layout */}
          <div className="grid grid-cols-10 gap-6">
            {/* Left: Calendar (3/10) */}
            <div className="col-span-3">
              <Card className="p-6 sticky top-6">
                {/* Calendar Header */}
                <div className="flex items-center justify-between mb-6">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handlePrevMonth}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <h2 className="text-xl font-bold">
                    {year}年 {monthNames[month]}
                  </h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleNextMonth}
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-2">
                  {/* Day Headers */}
                  {[
                    "日",
                    "月",
                    "火",
                    "水",
                    "木",
                    "金",
                    "土",
                  ].map((day) => (
                    <div
                      key={day}
                      className="text-center text-sm font-semibold text-gray-600 py-2"
                    >
                      {day}
                    </div>
                  ))}

                  {/* Empty cells for days before month starts */}
                  {Array.from({
                    length: startingDayOfWeek,
                  }).map((_, index) => (
                    <div
                      key={`empty-${index}`}
                      className="aspect-square"
                    />
                  ))}

                  {/* Calendar Days */}
                  {Array.from({ length: daysInMonth }).map(
                    (_, index) => {
                      const day = index + 1;
                      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                      const reservationCount =
                        getReservationCountForDate(dateStr);
                      const isSelected =
                        dateStr === selectedDate;
                      const isToday = dateStr === todayStr;

                      return (
                        <button
                          key={day}
                          onClick={() => handleDateClick(day)}
                          className={`aspect-square rounded-lg border-2 flex flex-col items-center justify-center transition-all hover:border-blue-500 ${
                            isSelected
                              ? "bg-blue-600 text-white border-blue-600"
                              : isToday
                                ? "border-blue-600 text-blue-600"
                                : reservationCount > 0
                                  ? "border-green-300 bg-green-50"
                                  : "border-gray-200 hover:bg-gray-50"
                          }`}
                        >
                          <span className="text-lg font-semibold">
                            {day}
                          </span>
                          {reservationCount > 0 && (
                            <span
                              className={`text-xs mt-1 ${
                                isSelected
                                  ? "text-white"
                                  : "text-green-600"
                              }`}
                            >
                              {reservationCount}件
                            </span>
                          )}
                        </button>
                      );
                    },
                  )}
                </div>

                {/* Legend */}
                <div className="mt-6 flex flex-col gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded border-2 border-blue-600"></div>
                    <span>{t("today")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded border-2 border-green-300 bg-green-50"></div>
                    <span>{t("hasReservations")}</span>
                  </div>
                </div>
              </Card>
            </div>

            {/* Middle: Available Rides List (4/10) */}
            <div className="col-span-4">
              <Card className="p-6">
                <h2 className="text-xl font-bold mb-4">
                  {t("availableRides")} - {selectedDate} (
                  {reservationsForSelectedDate.length}件)
                </h2>

                {reservationsForSelectedDate.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                    <p>{t("noReservationsThisDay")}</p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[700px] overflow-y-auto">
                    {reservationsForSelectedDate.map(
                      (reservation) => (
                        <Card
                          key={reservation.id}
                          className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                            selectedReservation?.id ===
                            reservation.id
                              ? "border-2 border-blue-600"
                              : "border"
                          }`}
                          onClick={() =>
                            setSelectedReservation(reservation)
                          }
                        >
                          {/* Time and Earnings */}
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Clock className="h-5 w-5 text-blue-600" />
                              <span className="text-lg font-bold">
                                {reservation.time}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 bg-green-100 text-green-800 px-3 py-1 rounded-full">
                              <DollarSign className="h-4 w-4" />
                              <span className="font-bold">
                                {reservation.earnings} VND
                              </span>
                            </div>
                          </div>

                          {/* Customer */}
                          <div className="flex items-center gap-3 mb-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage
                                src={reservation.customerAvatar}
                              />
                              <AvatarFallback>
                                {reservation.customerName[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <p className="font-semibold">
                                {reservation.customerName}
                              </p>
                              <div className="flex items-center gap-1">
                                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                <span className="text-sm text-gray-600">
                                  {reservation.customerRating}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Route */}
                          <div className="space-y-2 text-sm mb-3">
                            <div className="flex items-start gap-2">
                              <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5"></div>
                              <span className="text-gray-600">
                                {reservation.pickup}
                              </span>
                            </div>
                            <div className="flex items-start gap-2">
                              <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5"></div>
                              <span className="text-gray-600">
                                {reservation.destination}
                              </span>
                            </div>
                          </div>

                          {/* Info */}
                          <div className="flex items-center gap-3 text-sm text-gray-600 mb-3">
                            <span>{reservation.distance}</span>
                            <span>•</span>
                            <span>
                              {reservation.duration}{" "}
                              {t("minutes")}
                            </span>
                          </div>

                          {/* Expanded Details */}
                          {selectedReservation?.id ===
                            reservation.id && (
                            <>
                              <Separator className="my-4" />

                              {/* Languages */}
                              <div className="mb-3">
                                <p className="text-sm text-gray-600 mb-2">
                                  {t("requestedLanguages")}
                                </p>
                                <div className="flex gap-2">
                                  {reservation.languages.map(
                                    (lang) => (
                                      <Badge
                                        key={lang}
                                        className="bg-blue-100 text-blue-800 hover:bg-blue-200"
                                      >
                                        {t(lang)}
                                      </Badge>
                                    ),
                                  )}
                                </div>
                              </div>

                              {/* Preferences */}
                              {reservation.preferences.length >
                                0 && (
                                <div className="mb-3">
                                  <p className="text-sm text-gray-600 mb-2">
                                    {t("preferences")}
                                  </p>
                                  <div className="flex flex-wrap gap-2">
                                    {reservation.preferences.map(
                                      (pref) => (
                                        <Badge
                                          key={pref}
                                          variant="outline"
                                        >
                                          {t(pref)}
                                        </Badge>
                                      ),
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Special Request */}
                              {reservation.specialRequest && (
                                <div className="mb-4">
                                  <p className="text-sm text-gray-600 mb-2">
                                    {t("specialRequests")}
                                  </p>
                                  <p className="text-sm bg-gray-50 p-3 rounded-md">
                                    {reservation.specialRequest}
                                  </p>
                                </div>
                              )}

                              {/* Contact Buttons */}
                            <div className="flex gap-2 mb-4">
                              <Button variant="outline" size="sm" className="flex-1 gap-2">
                                <Phone className="h-4 w-4" />
                                {t("call")}
                              </Button>
                              <Button variant="outline" size="sm" className="flex-1 gap-2">
                                <MessageCircle className="h-4 w-4" />
                                {t("message")}
                              </Button>
                            </div>

                            {/* Action Buttons */}
                              <div className="grid grid-cols-2 gap-3">
                                <Button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDecline(
                                      reservation.id,
                                    );
                                  }}
                                  variant="outline"
                                  className="h-10"
                                >
                                  {t("decline")}
                                </Button>
                                <Button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAccept(reservation);
                                  }}
                                  className="h-10 bg-green-600 hover:bg-green-700 text-white"
                                >
                                  {t("accept")}
                                </Button>
                              </div>
                            </>
                          )}
                        </Card>
                      ),
                    )}
                  </div>
                )}
              </Card>
            </div>

            {/* Right: Accepted Rides (3/10) */}
            <div className="col-span-3">
              <Card className="p-6 sticky top-6">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Check className="h-5 w-5 text-green-600" />
                  {t("acceptedRides")} (
                  {acceptedReservations.length})
                </h2>

                {acceptedReservations.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                    <p className="text-sm">
                      {t("noAcceptedRides")}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[700px] overflow-y-auto">
                    {acceptedReservations.map((reservation) => (
                      <Card
                        key={reservation.id}
                        className="p-4 border-2 border-green-200 bg-green-50"
                      >
                        {/* Date and Time */}
                        <div className="flex items-center gap-2 mb-2">
                          <Calendar className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-semibold">
                            {reservation.date}
                          </span>
                          <Clock className="h-4 w-4 text-green-600 ml-2" />
                          <span className="text-sm font-semibold">
                            {reservation.time}
                          </span>
                        </div>

                        {/* Customer */}
                        <div className="flex items-center gap-2 mb-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage
                              src={reservation.customerAvatar}
                            />
                            <AvatarFallback>
                              {reservation.customerName[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="font-semibold text-sm">
                              {reservation.customerName}
                            </p>
                          </div>
                        </div>

                        {/* Route */}
                        <div className="space-y-1 text-xs mb-2">
                          <div className="flex items-start gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1"></div>
                            <span className="text-gray-600 line-clamp-1">
                              {reservation.pickup}
                            </span>
                          </div>
                          <div className="flex items-start gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1"></div>
                            <span className="text-gray-600 line-clamp-1">
                              {reservation.destination}
                            </span>
                          </div>
                        </div>

                        {/* Earnings */}
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm text-gray-600">
                            {reservation.distance} •{" "}
                            {reservation.duration}
                            {t("minutes")}
                          </span>
                          <span className="font-bold text-green-600">
                            {reservation.earnings} VND
                          </span>
                        </div>

                        {/* Cancel Button */}
                        <Button
                          onClick={() =>
                            handleCancelAcceptance(
                              reservation.id,
                            )
                          }
                          variant="outline"
                          size="sm"
                          className="w-full text-xs h-8"
                        >
                          {t("cancelAcceptance")}
                        </Button>
                      </Card>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}