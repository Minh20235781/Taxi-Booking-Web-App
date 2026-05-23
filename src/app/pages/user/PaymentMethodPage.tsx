import { useState } from "react";
import { useNavigate } from "react-router";
import { Check, CreditCard, MapPin, Navigation, Plus, Search, Smartphone, Wallet } from "lucide-react";
import { BookingStepIndicator } from "../../components/BookingStepIndicator";
import { Header } from "../../components/Header";
import { MapPlaceholder } from "../../components/MapPlaceholder";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { useLanguage } from "../../contexts/LanguageContext";
import { clearBookingFlowDraft, getBookingFlowDraft, updateBookingFlowDraft } from "../../services/bookingFlow";
import { api } from "../../services/api";
import type { LocationSuggestion, PaymentMethodCode } from "../../services/api";

function toPaymentMethodCode(methodId: string): PaymentMethodCode {
  if (methodId === "momo") {
    return "MOMO";
  }
  if (methodId === "cash") {
    return "CASH";
  }
  return "CARD";
}

export default function PaymentMethodPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const draft = getBookingFlowDraft();
  const [pickup] = useState(draft.pickupText || "");
  const [destination] = useState(draft.destinationText || "");
  const [pickupSelection] = useState<LocationSuggestion | null>(draft.pickupSelection || null);
  const [destinationSelection] = useState<LocationSuggestion | null>(
    draft.destinationSelection || null
  );
  const [selectedMethod, setSelectedMethod] = useState(draft.paymentMethodId || "momo");
  const [showAddCard, setShowAddCard] = useState(false);
  const [newCardNumber, setNewCardNumber] = useState("");
  const [newCardExpiry, setNewCardExpiry] = useState("");
  const [newCardCvv, setNewCardCvv] = useState("");
  const [newCardName, setNewCardName] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const hasLockedRoute = Boolean(pickupSelection && destinationSelection);

  const paymentMethods = [
    {
      id: "momo",
      type: "mobile",
      name: "MoMo",
      detail: "+84 123 456 789",
      icon: Smartphone
    },
    {
      id: "cash",
      type: "cash",
      name: t("cash"),
      detail: t("payDriverDirectly"),
      icon: Wallet
    },
    {
      id: "card1",
      type: "card",
      name: "Visa",
      last4: "4242",
      icon: CreditCard
    },
    {
      id: "card2",
      type: "card",
      name: "Mastercard",
      last4: "8888",
      icon: CreditCard
    }
  ];

  const selected = paymentMethods.find((method) => method.id === selectedMethod);
  const paymentMethodLabel = selected
    ? selected.type === "card"
      ? `${selected.name} **** ${selected.last4}`
      : `${selected.name}${selected.detail ? ` - ${selected.detail}` : ""}`
    : undefined;

  const handleNext = async () => {
    if (!hasLockedRoute) {
      return;
    }
    if (!draft.bookingId) {
      setErrorMessage("Booking has not been created yet. Please choose a vehicle again.");
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage("");
      await api.updateBookingPaymentMethod(draft.bookingId, {
        method: toPaymentMethodCode(selectedMethod),
        label: paymentMethodLabel
      });
      updateBookingFlowDraft({
        pickupText: pickup.trim(),
        destinationText: destination.trim(),
        paymentMethodId: selectedMethod,
        paymentMethodLabel
      });
      navigate("/user/preference");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not save payment method.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelBooking = () => {
    clearBookingFlowDraft();
    navigate("/user/home");
  };

  const handleSaveCard = () => {
    if (!newCardNumber || !newCardExpiry || !newCardCvv || !newCardName) {
      return;
    }
    setSelectedMethod("card1");
    setShowAddCard(false);
    setNewCardNumber("");
    setNewCardExpiry("");
    setNewCardCvv("");
    setNewCardName("");
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header type="user" />

      <div className="flex-1 flex">
        <div className="w-[30%] p-6 overflow-auto border-r">
          <div className="max-w-lg">
            <h1 className="text-2xl font-bold mb-6">{t("bookRide")}</h1>

            <div className="mb-4">
              <div className="flex items-center gap-3 p-4 border-2 border-gray-300 rounded-lg bg-gray-50">
                <div className="bg-green-500 rounded-full p-1">
                  <div className="w-3 h-3 bg-white rounded-full" />
                </div>
                <Input
                  value={pickup}
                  readOnly
                  placeholder={t("pickupLocation")}
                  className="border-0 bg-transparent focus-visible:ring-0"
                />
                <Navigation className="h-5 w-5 text-gray-400" />
              </div>
            </div>

            <div className="mb-6">
              <div className="flex items-center gap-3 p-4 border-2 border-black rounded-lg">
                <MapPin className="h-5 w-5" />
                <Input
                  value={destination}
                  readOnly
                  placeholder={t("destination")}
                  className="border-0 focus-visible:ring-0"
                />
                <Search className="h-5 w-5 text-gray-400" />
              </div>
            </div>
          </div>
        </div>

        <div className="w-[40%] p-6 overflow-auto border-r">
          <div className="max-w-lg">
            <BookingStepIndicator currentStep={3} title="Select payment method" />
            <h2 className="text-xl font-bold mb-2">{t("paymentMethod")}</h2>
            <p className="text-gray-600 mb-6">{t("selectPayment")}</p>

            <div className="space-y-3 mb-6">
              {paymentMethods.map((method) => {
                const Icon = method.icon;
                const isSelected = selectedMethod === method.id;

                return (
                  <Card
                    key={method.id}
                    onClick={() => setSelectedMethod(method.id)}
                    className={`p-5 cursor-pointer transition-all ${
                      isSelected ? "border-2 border-black bg-gray-50" : "border hover:border-gray-400"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-full ${isSelected ? "bg-black text-white" : "bg-gray-100"}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{method.name}</h3>
                          <p className="text-sm text-gray-600">
                            {method.type === "card" ? `**** ${method.last4}` : method.detail}
                          </p>
                        </div>
                      </div>
                      {isSelected && <Check className="h-5 w-5" />}
                    </div>
                  </Card>
                );
              })}

              <Card
                onClick={() => setShowAddCard(!showAddCard)}
                className="p-5 cursor-pointer border-2 border-dashed hover:border-gray-400"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-gray-100">
                    <Plus className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold">{t("addNewCard")}</h3>
                </div>
              </Card>
            </div>

            {showAddCard && (
              <Card className="p-6 mb-6 bg-gray-50">
                <h3 className="font-semibold mb-4">{t("cardInfo")}</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="cardNumber">{t("cardNumber")}</Label>
                    <Input
                      id="cardNumber"
                      placeholder="1234 5678 9012 3456"
                      maxLength={19}
                      value={newCardNumber}
                      onChange={(event) => setNewCardNumber(event.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="expiry">{t("expiry")}</Label>
                      <Input
                        id="expiry"
                        placeholder="MM/YY"
                        maxLength={5}
                        value={newCardExpiry}
                        onChange={(event) => setNewCardExpiry(event.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cvv">CVV</Label>
                      <Input
                        id="cvv"
                        placeholder="123"
                        maxLength={3}
                        type="password"
                        value={newCardCvv}
                        onChange={(event) => setNewCardCvv(event.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cardName">{t("cardName")}</Label>
                    <Input
                      id="cardName"
                      placeholder="TANAKA TARO"
                      value={newCardName}
                      onChange={(event) => setNewCardName(event.target.value)}
                    />
                  </div>
                  <div className="flex gap-3">
                    <Button onClick={handleSaveCard} className="flex-1 bg-black hover:bg-gray-800 text-white">
                      {t("save")}
                    </Button>
                    <Button variant="outline" onClick={() => setShowAddCard(false)}>
                      {t("cancel")}
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            <div className="space-y-3">
              <Button
                onClick={handleNext}
                disabled={!hasLockedRoute || isSaving}
                className="w-full h-12 bg-black hover:bg-gray-800 text-white"
              >
                {isSaving ? "Saving..." : t("next")}
              </Button>
              {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}
              <Button
                onClick={() => navigate("/user/vehicle-selection")}
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
                Cancel ride
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
