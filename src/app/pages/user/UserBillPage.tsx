import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Header } from "../../components/Header";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Separator } from "../../components/ui/separator";
import { MapPin, Calendar, CreditCard, Download, Mail, Check } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";
import { clearBookingFlowDraft, getBookingFlowDraft } from "../../services/bookingFlow";
import { calculateFare, formatVnd } from "../../services/pricing";
import { api } from "../../services/api";

export default function UserBillPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [email, setEmail] = useState("tanaka@email.com");
  const [emailSent, setEmailSent] = useState(false);
  const draft = getBookingFlowDraft();
  const [booking, setBooking] = useState<any | null>(null);
  const pickupText = booking?.pickupAddress || draft.pickupText || "-";
  const destinationText = booking?.destination || draft.destinationText || "-";
  const fare = booking?.vehicleClass
    ? null
    : draft.vehicle?.code
    ? calculateFare(
        draft.vehicle.code,
        draft.routeDistanceMeters || 0,
        draft.routeDurationSeconds || 0
      )
    : null;
  const totalAmount = booking?.estimatedFare ? formatVnd(booking.estimatedFare) : fare ? formatVnd(fare.totalFare) : draft.vehicle?.price || "-";
  const paymentLabel = booking?.paymentMethodLabel || draft.paymentMethodLabel || "-";
  const dateTimeText = booking?.scheduledAt
    ? `${new Date(booking.scheduledAt).toLocaleDateString()} ${new Date(booking.scheduledAt).toLocaleTimeString().slice(0,5)}`
    : draft.reservationDate
    ? `${new Date(draft.reservationDate).toLocaleDateString()} ${draft.reservationTime || ""}`
    : draft.reservationTime || "-";

  const handleBackHome = () => {
    clearBookingFlowDraft();
    navigate("/user/home");
  };
  const handleDownloadReceipt = () => {
    window.print();
  };

  const handleSendEmail = () => {
    setEmailSent(true);
    setTimeout(() => setEmailSent(false), 3000);
  };

  useEffect(() => {
    let mounted = true;
    const bid = draft.bookingId || sessionStorage.getItem('last_completed_booking_id');
    if (!bid) return;
    (async () => {
      try {
        const res: any = await api.getBookingWithRide(Number(bid));
        if (!mounted) return;
        setBooking(res.booking || res);
      } catch (err) {
        console.error("Failed to load booking for bill page", err);
      }
    })();
    return () => { mounted = false; };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header type="user" />

      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="bg-green-100 text-green-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="h-8 w-8" />
            </div>
            <h1 className="text-3xl font-bold mb-2">{t("rideCompleted")}</h1>
            <p className="text-gray-600">{t("thankYouForRiding")}</p>
          </div>

          {/* Bill Card */}
          <Card className="p-8 mb-6">
            <div className="text-center mb-6">
              <h2 className="text-4xl font-bold mb-2">{totalAmount}</h2>
              <p className="text-gray-600">{t("totalAmount")}</p>
            </div>

            <Separator className="my-6" />

            {/* Trip Details */}
            <div className="space-y-4 mb-6">
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-gray-600">{t("pickupLocation")}</p>
                  <p className="font-semibold">{pickupText}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-gray-600">{t("destination")}</p>
                  <p className="font-semibold">{destinationText}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-gray-600">{t("dateTime")}</p>
                  <p className="font-semibold">{dateTimeText}</p>
                </div>
              </div>
            </div>

            <Separator className="my-6" />

            {/* Price Breakdown */}
            <div className="space-y-3 mb-6">
              <div className="flex justify-between">
                <span className="text-gray-600">{t("baseFare")}</span>
                <span className="font-semibold">{fare ? formatVnd(fare.baseFare) : totalAmount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">{t("serviceFee")}</span>
                <span className="font-semibold">{fare ? formatVnd(fare.distanceFare) : "0 VND"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">{t("tollFee")}</span>
                <span className="font-semibold">{fare ? formatVnd(fare.durationFare) : "0 VND"}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-lg">
                <span className="font-bold">{t("total")}</span>
                <span className="font-bold">{totalAmount}</span>
              </div>
            </div>

            <Separator className="my-6" />

            {/* Payment Method */}
            <div className="flex items-center gap-3">
              <CreditCard className="h-5 w-5 text-gray-400" />
              <div className="flex-1">
                <p className="text-sm text-gray-600">{t("paymentMethod")}</p>
                <p className="font-semibold">{paymentLabel}</p>
              </div>
            </div>
          </Card>

          {/* Email Section */}
          <Card className="p-6 mb-6">
            <h3 className="font-semibold mb-4">{t("sendReceiptByEmail")}</h3>
            <div className="flex gap-3">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("emailAddress")}
                className="flex-1"
              />
              <Button
                onClick={handleSendEmail}
                className="bg-black hover:bg-gray-800 text-white"
              >
                {emailSent ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    {t("sent")}
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4 mr-2" />
                    {t("send")}
                  </>
                )}
              </Button>
            </div>
          </Card>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button
              onClick={() => navigate("/user/rating")}
              className="w-full h-12 bg-black hover:bg-gray-800 text-white"
            >
              {t("rateDriver")}
            </Button>
            <Button
              variant="outline"
              onClick={handleDownloadReceipt}
              className="w-full h-12"
            >
              <Download className="h-4 w-4 mr-2" />
              {t("downloadPDF")}
            </Button>
            <Button
              onClick={handleBackHome}
              variant="ghost"
              className="w-full h-12"
            >
              {t("backToHome")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}