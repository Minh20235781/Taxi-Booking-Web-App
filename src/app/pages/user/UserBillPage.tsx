import { useEffect, useRef, useState } from "react";
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
import type { PaymentMethodCode } from "../../services/api";

function toPaymentMethodCode(methodId?: string): PaymentMethodCode {
  if (methodId === "momo") {
    return "MOMO";
  }
  if (methodId === "cash") {
    return "CASH";
  }
  return "CARD";
}

export default function UserBillPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [email, setEmail] = useState("tanaka@email.com");
  const [emailSent, setEmailSent] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<"idle" | "paid" | "error">("idle");
  const [paymentError, setPaymentError] = useState("");
  const hasConfirmedPayment = useRef(false);
  const draft = getBookingFlowDraft();
  const pickupText = draft.pickupText || "-";
  const destinationText = draft.destinationText || "-";
  const fare = draft.vehicle?.code
    ? calculateFare(
        draft.vehicle.code,
        draft.routeDistanceMeters || 0,
        draft.routeDurationSeconds || 0
      )
    : null;
  const totalAmount = fare ? formatVnd(fare.totalFare) : draft.vehicle?.price || "-";
  const paymentLabel = draft.paymentMethodLabel || "-";
  const dateTimeText = draft.reservationDate
    ? `${new Date(draft.reservationDate).toLocaleDateString()} ${draft.reservationTime || ""}`
    : draft.reservationTime || "-";

  useEffect(() => {
    if (!draft.bookingId || hasConfirmedPayment.current) {
      return;
    }
    hasConfirmedPayment.current = true;
    api
      .confirmBookingPayment(draft.bookingId, {
        method: toPaymentMethodCode(draft.paymentMethodId),
        label: draft.paymentMethodLabel,
        amount: fare?.totalFare
      })
      .then(() => {
        setPaymentStatus("paid");
        setPaymentError("");
      })
      .catch((error) => {
        setPaymentStatus("error");
        setPaymentError(error instanceof Error ? error.message : "Could not confirm payment.");
      });
  }, [draft.bookingId, draft.paymentMethodId, draft.paymentMethodLabel, fare?.totalFare]);

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
                <p className={`text-sm mt-1 ${paymentStatus === "error" ? "text-red-600" : "text-green-700"}`}>
                  {paymentStatus === "paid"
                    ? "Payment saved as PAID"
                    : paymentStatus === "error"
                      ? paymentError
                      : "Confirming payment..."}
                </p>
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
