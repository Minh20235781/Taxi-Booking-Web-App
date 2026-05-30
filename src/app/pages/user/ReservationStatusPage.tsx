import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Header } from "../../components/Header";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import {
  Calendar,
  Clock,
  MapPin,
  Check,
  Loader2,
  Car,
  XCircle,
  Navigation
} from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";
import { api } from "../../services/api";
import { clearBookingFlowDraft, getBookingFlowDraft } from "../../services/bookingFlow";
import { getRideChatSocket } from "../../services/rideChat";
import {
  formatScheduledLocal,
  getReservationPhase,
  minutesUntilScheduled,
  type ReservationBookingView
} from "../../services/reservation";

export default function ReservationStatusPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();
  const draft = getBookingFlowDraft();
  const bookingId = Number(searchParams.get("bookingId") || draft.bookingId || 0);
  const [booking, setBooking] = useState<ReservationBookingView | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState("");
  const previousPhaseRef = useRef<string | null>(null);
  const hasShownThirtyMinNoticeRef = useRef(false);

  useEffect(() => {
    if (!bookingId) {
      return;
    }

    const socket = getRideChatSocket();
    const handleRideStatusChanged = async (data: { bookingId?: number; status?: string }) => {
      if (Number(data?.bookingId) !== bookingId || data?.status !== "ACCEPTED") {
        return;
      }

      try {
        const active = await api.getActiveBooking();
        if (Number(active.booking?.id) !== bookingId || !active.booking?.hasDriver) {
          return;
        }

        const updated = await api.getBookingWithRide(bookingId);
        setBooking(updated as ReservationBookingView);
        setError("");
      } catch (err) {
        setError(err instanceof Error ? err.message : t("loadFailed"));
      }
    };

    socket.on("ride_status_changed", handleRideStatusChanged);

    return () => {
      socket.off("ride_status_changed", handleRideStatusChanged);
    };
  }, [bookingId, t]);

  useEffect(() => {
    if (!bookingId) {
      setLoading(false);
      setError(t("reservationNotFound"));
      return;
    }

    let mounted = true;
    const load = async () => {
      try {
        const data = await api.getBookingWithRide(bookingId);
        if (!mounted) return;
        setBooking(data as ReservationBookingView);
        setError("");
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : t("loadFailed"));
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    const interval = window.setInterval(load, 3000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [bookingId, t]);

  const phase = booking ? getReservationPhase(booking) : "waiting_driver";
  const schedule = formatScheduledLocal(booking?.scheduledAt);
  const minutesLeft = minutesUntilScheduled(booking?.scheduledAt);
  const driverName = booking?.ride?.driver?.user?.fullName;
  const driverAvatar = booking?.ride?.driver?.user?.avatarUrl;

  useEffect(() => {
    if (phase === "driver_assigned" && minutesLeft !== null && minutesLeft <= 30 && minutesLeft >= 0) {
      if (!hasShownThirtyMinNoticeRef.current) {
        hasShownThirtyMinNoticeRef.current = true;
        alert(t("userPickupReminder").replace("{n}", String(minutesLeft)));
      }
    }
  }, [minutesLeft, phase, t]);

  useEffect(() => {
    const previous = previousPhaseRef.current;
    if (previous && previous !== phase && phase === "driver_en_route") {
      alert(t("driverStartedPickup"));
    }
    previousPhaseRef.current = phase;
  }, [phase, t]);

  const handleCancel = async () => {
    if (!bookingId || !window.confirm(t("cancelReservationConfirm"))) return;
    try {
      setCancelling(true);
      await api.cancelBooking(bookingId);
      clearBookingFlowDraft();
      navigate("/user/history", { replace: true });
    } catch (err) {
      alert(err instanceof Error ? err.message : t("cancelFailed"));
    } finally {
      setCancelling(false);
    }
  };

  const statusSteps = [
    { key: "waiting_driver", label: t("reservationStepWaiting") },
    { key: "driver_assigned", label: t("reservationStepAssigned") },
    { key: "driver_en_route", label: t("reservationStepEnRoute") },
    { key: "completed", label: t("reservationStepDone") }
  ];

  const stepIndex = (() => {
    if (phase === "cancelled") return -1;
    if (phase === "waiting_driver") return 0;
    if (phase === "driver_assigned") return 1;
    if (phase === "driver_en_route" || phase === "in_progress") return 2;
    if (phase === "completed") return 3;
    return 0;
  })();

  if (!bookingId) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header type="user" />
        <div className="flex-1 p-6 text-center">
          <p className="text-gray-600 mb-4">{t("reservationNotFound")}</p>
          <Button onClick={() => navigate("/user/home")}>{t("backToHome")}</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header type="user" />

      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">{t("reservationConfirmed")}</h1>
          <p className="text-gray-600 mb-6">{t("reservationStatusSubtitle")}</p>

          {loading && !booking ? (
            <Card className="p-8 flex items-center justify-center gap-2 text-gray-600">
              <Loader2 className="h-5 w-5 animate-spin" />
              {t("loading")}
            </Card>
          ) : error ? (
            <Card className="p-6 text-red-600">{error}</Card>
          ) : booking ? (
            <>
              <Card className="p-6 mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm text-gray-600">{t("scheduledPickup")}</p>
                    <p className="font-bold text-lg">{schedule.datetime}</p>
                  </div>
                </div>
                {minutesLeft !== null && minutesLeft > 0 && phase !== "cancelled" && (
                  <p className="text-sm text-blue-800 bg-blue-50 rounded-lg px-3 py-2 mb-4">
                    {t("pickupInMinutes").replace("{n}", String(minutesLeft))}
                  </p>
                )}
                {phase === "driver_assigned" &&
                  minutesLeft !== null &&
                  minutesLeft <= 30 &&
                  minutesLeft >= 0 && (
                    <p className="text-sm text-amber-800 bg-amber-50 rounded-lg px-3 py-2 mb-4 font-medium">
                      {t("userPickupReminder").replace("{n}", String(minutesLeft))}
                    </p>
                  )}
                {phase === "driver_en_route" && (
                  <p className="text-sm text-green-800 bg-green-50 rounded-lg px-3 py-2 mb-4 font-medium">
                    {t("driverStartedPickup")}
                  </p>
                )}

                <div className="space-y-2 text-sm mb-4">
                  <div className="flex gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5 shrink-0" />
                    <span>{booking.pickupAddress}</span>
                  </div>
                  <div className="flex gap-2">
                    <MapPin className="h-4 w-4 text-red-500 shrink-0" />
                    <span>{booking.destination}</span>
                  </div>
                </div>

                {phase === "cancelled" ? (
                  <div className="flex items-center gap-2 text-red-700 bg-red-50 p-3 rounded-lg">
                    <XCircle className="h-5 w-5" />
                    {t("reservationCancelled")}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {statusSteps.map((step, idx) => {
                      const done = idx < stepIndex;
                      const active = idx === stepIndex;
                      return (
                        <div key={step.key} className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                              done
                                ? "bg-green-600 text-white"
                                : active
                                  ? "bg-blue-600 text-white"
                                  : "bg-gray-200 text-gray-500"
                            }`}
                          >
                            {done ? <Check className="h-4 w-4" /> : idx + 1}
                          </div>
                          <span className={active ? "font-semibold" : "text-gray-600"}>{step.label}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>

              {(phase === "driver_assigned" ||
                phase === "driver_en_route" ||
                phase === "in_progress") &&
                driverName && (
                  <Card className="p-6 mb-6">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Car className="h-5 w-5" />
                      {t("yourDriver")}
                    </h3>
                    <div className="flex items-center gap-4">
                      <Avatar className="h-14 w-14">
                        <AvatarImage src={driverAvatar || undefined} />
                        <AvatarFallback>{driverName[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-bold text-lg">{driverName}</p>
                        <p className="text-sm text-gray-600">
                          {phase === "driver_en_route" || phase === "in_progress"
                            ? t("driverOnTheWay")
                            : t("driverWillArriveOnTime")}
                        </p>
                      </div>
                    </div>
                    {(phase === "driver_en_route" || phase === "in_progress") && (
                      <Button
                        className="w-full mt-4 bg-black hover:bg-gray-800"
                        onClick={() => navigate("/user/ride")}
                      >
                        <Navigation className="h-4 w-4 mr-2" />
                        {t("trackRide")}
                      </Button>
                    )}
                  </Card>
                )}

              <div className="flex flex-col gap-3">
                <Button variant="outline" onClick={() => navigate("/user/history")}>
                  {t("viewInHistory")}
                </Button>
                {phase !== "cancelled" && phase !== "completed" && (
                  <Button
                    variant="ghost"
                    className="text-red-600"
                    disabled={cancelling || phase === "in_progress" || phase === "driver_en_route"}
                    onClick={handleCancel}
                  >
                    {cancelling ? t("cancelling") : t("cancelReservation")}
                  </Button>
                )}
                <Button onClick={() => navigate("/user/home")}>{t("backToHome")}</Button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
