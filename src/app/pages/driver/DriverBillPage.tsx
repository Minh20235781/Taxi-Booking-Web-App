import { useNavigate } from "react-router";
import { useEffect, useState } from "react";
import { Header } from "../../components/Header";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Separator } from "../../components/ui/separator";
import { MapPin, Calendar, DollarSign, Check, Loader2 } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "../../components/ui/avatar";
import { useLanguage } from "../../contexts/LanguageContext";
import { api } from "../../services/api";

function parseBookingResponse(res: unknown) {
  const r = res as Record<string, unknown>;
  return (r?.booking || r?.data || r) as Record<string, unknown>;
}

function parseCustomerSnapshot(booking: Record<string, unknown> | null) {
  if (!booking) return null;
  const raw = booking.customerSnapshotJson;
  if (!raw || typeof raw !== "string") {
    const user = booking.user as Record<string, unknown> | undefined;
    return user
      ? { fullName: user.fullName, avatarUrl: user.avatarUrl }
      : null;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export default function DriverBillPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [booking, setBooking] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const bid = sessionStorage.getItem("last_completed_booking_id");
    if (!bid) {
      setLoading(false);
      return;
    }

    try {
      const cached = sessionStorage.getItem("last_completed_booking");
      if (cached) {
        setBooking(JSON.parse(cached));
      }
    } catch {
      // ignore cached parse errors
    }

    (async () => {
      try {
        const res = await api.getBookingWithRide(Number(bid));
        if (!mounted) return;
        setBooking(parseBookingResponse(res));
      } catch (err) {
        console.error("Failed to load booking for driver bill page", err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const ride = booking?.ride as Record<string, unknown> | undefined;
  const vehicleClass = booking?.vehicleClass as Record<string, unknown> | undefined;
  const payment = ride?.payment as Record<string, unknown> | undefined;
  const fareAmount =
    (ride?.finalFare as number) ||
    (booking?.estimatedFare as number) ||
    (payment?.amount as number) ||
    0;
  const subtotal = fareAmount ? Math.round(fareAmount) : 0;
  const baseFare = vehicleClass?.baseFare ? Math.round(vehicleClass.baseFare as number) : null;
  const tollFee = booking?.tollFee != null ? Math.round(booking.tollFee as number) : null;
  const tip = payment?.tipAmount != null ? Math.round(payment.tipAmount as number) : null;
  const customer = parseCustomerSnapshot(booking);
  const customerName = (customer?.fullName as string) || "-";
  const customerInitial = customerName !== "-" ? customerName.slice(0, 1) : "?";

  const when = booking?.scheduledAt || booking?.createdAt;
  const dateTimeText = when
    ? new Date(when as string).toLocaleString()
    : "";

  if (loading && !booking) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header type="driver" />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header type="driver" />

      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <div className="bg-green-100 text-green-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="h-8 w-8" />
            </div>
            <h1 className="text-3xl font-bold mb-2">{t("tripCompleted")}</h1>
            <p className="text-gray-600">{t("goodWork")}</p>
          </div>

          <Card className="p-8 mb-6 bg-green-50 border-green-200">
            <div className="text-center mb-6">
              <div className="flex items-center justify-center gap-2 mb-2">
                <DollarSign className="h-8 w-8 text-green-600" />
                <h2 className="text-5xl font-bold text-green-600">
                  {subtotal ? `${subtotal.toLocaleString()} VND` : " - "}
                </h2>
              </div>
              <p className="text-gray-600">{t("thisRideEarnings")}</p>
            </div>

            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-green-200">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  {subtotal ? `${subtotal.toLocaleString()}` : "-"}
                </p>
                <p className="text-sm text-gray-600">{t("todayEarnings")}</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">-</p>
                <p className="text-sm text-gray-600">{t("todaysRides")}</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">-</p>
                <p className="text-sm text-gray-600">{t("activeHours")}</p>
              </div>
            </div>
          </Card>

          <Card className="p-8 mb-6">
            <h3 className="font-semibold text-lg mb-4">{t("tripDetails")}</h3>

            <div className="space-y-4 mb-6">
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-gray-600">{t("pickupPoint")}</p>
                  <p className="font-semibold">{(booking?.pickupAddress as string) || "-"}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-gray-600">{t("destinationPoint")}</p>
                  <p className="font-semibold">{(booking?.destination as string) || "-"}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-gray-600">{t("dateTime")}</p>
                  <p className="font-semibold">{dateTimeText || "-"}</p>
                </div>
              </div>
            </div>

            <Separator className="my-6" />

            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">{t("baseFare")}</span>
                <span className="font-semibold">{baseFare ? `${baseFare.toLocaleString()} VND` : "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">{t("tollFee")}</span>
                <span className="font-semibold">{tollFee != null ? `${tollFee.toLocaleString()} VND` : "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">{t("tip")}</span>
                <span className="font-semibold text-green-600">{tip != null ? `${tip.toLocaleString()} VND` : "-"}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-lg">
                <span className="font-bold">{t("total")}</span>
                <span className="font-bold text-green-600">
                  {subtotal ? `${subtotal.toLocaleString()} VND` : "-"}
                </span>
              </div>
            </div>
          </Card>

          <Card className="p-6 mb-6 flex items-center gap-4">
            <Avatar>
              {customer?.avatarUrl ? (
                <AvatarImage src={customer.avatarUrl as string} alt="customer avatar" />
              ) : (
                <AvatarFallback>{customerInitial}</AvatarFallback>
              )}
            </Avatar>
            <div>
              <h4 className="font-semibold mb-1">{customerName}</h4>
              <p className="text-sm text-gray-600">{t("waitingForRating")}</p>
            </div>
          </Card>

          <div className="space-y-3">
            <Button
              onClick={() => navigate("/driver/home")}
              className="w-full h-12 bg-black hover:bg-gray-800 text-white"
            >
              {t("returnHome")}
            </Button>
            <Button
              onClick={() => navigate("/driver/income")}
              variant="outline"
              className="w-full h-12"
            >
              {t("viewIncomeManagement")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
