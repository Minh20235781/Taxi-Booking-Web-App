import { useState } from "react";
import { useNavigate } from "react-router";
import { BookingStepIndicator } from "../../components/BookingStepIndicator";
import { Header } from "../../components/Header";
import { MapPlaceholder } from "../../components/MapPlaceholder";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { MapPin, Navigation, Search, CreditCard, Smartphone, Wallet, Plus, Check } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";
import { clearBookingFlowDraft, getBookingFlowDraft, updateBookingFlowDraft } from "../../services/bookingFlow";
import type { LocationSuggestion } from "../../services/api";

export default function PaymentMethodPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const draft = getBookingFlowDraft();
  const [pickup, setPickup] = useState(draft.pickupText || "");
  const [destination, setDestination] = useState(draft.destinationText || "");
  const [pickupSelection] = useState<LocationSuggestion | null>(draft.pickupSelection || null);
  const [destinationSelection] = useState<LocationSuggestion | null>(
    draft.destinationSelection || null
  );
  const [selectedMethod, setSelectedMethod] = useState(draft.paymentMethodId || "card1");
  const [showAddCard, setShowAddCard] = useState(false);
  const [newCardNumber, setNewCardNumber] = useState("");
  const [newCardExpiry, setNewCardExpiry] = useState("");
  const [newCardCvv, setNewCardCvv] = useState("");
  const [newCardName, setNewCardName] = useState("");
  const hasLockedRoute = Boolean(pickupSelection && destinationSelection);

  const paymentMethods = [
    {
      id: "card1",
      type: "card",
      name: "Visa",
      last4: "4242",
      icon: CreditCard,
    },
    {
      id: "card2",
      type: "card",
      name: "Mastercard",
      last4: "8888",
      icon: CreditCard,
    },
    {
      id: "momo",
      type: "mobile",
      name: "MoMo",
      detail: "+84 123 456 789",
      icon: Smartphone,
    },
    {
      id: "cash",
      type: "cash",
      name: t("cash"),
      detail: t("payDriverDirectly"),
      icon: Wallet,
    },
  ];

  const handleNext = () => {
    if (!hasLockedRoute) {
      return;
    }
    const selected = paymentMethods.find((method) => method.id === selectedMethod);
    updateBookingFlowDraft({
      pickupText: pickup.trim(),
      destinationText: destination.trim(),
      paymentMethodId: selectedMethod,
      paymentMethodLabel: selected
        ? selected.type === "card"
          ? `${selected.name} •••• ${selected.last4}`
          : `${selected.name}${selected.detail ? ` • ${selected.detail}` : ""}`
        : undefined
    });
    navigate("/user/preference");
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
        {/* Left Panel - Destination (30%) */}
        <div className="w-[30%] p-6 overflow-auto border-r">
          <div className="max-w-lg">
            <h1 className="text-2xl font-bold mb-6">{t("bookRide")}</h1>

            {/* Pickup Location */}
            <div className="mb-4">
              <div className="flex items-center gap-3 p-4 border-2 border-gray-300 rounded-lg bg-gray-50">
                <div className="bg-green-500 rounded-full p-1">
                  <div className="w-3 h-3 bg-white rounded-full"></div>
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

            {/* Destination */}
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

        {/* Middle Panel - Payment Method (40%) */}
        <div className="w-[40%] p-6 overflow-auto border-r">
          <div className="max-w-lg">
            <BookingStepIndicator currentStep={3} title="支払い方法を選択" />
            <h2 className="text-xl font-bold mb-2">{t("paymentMethod")}</h2>
            <p className="text-gray-600 mb-6">{t("selectPayment")}</p>

            {/* Payment Methods List */}
            <div className="space-y-3 mb-6">
              {paymentMethods.map((method) => {
                const Icon = method.icon;
                const isSelected = selectedMethod === method.id;

                return (
                  <Card
                    key={method.id}
                    onClick={() => setSelectedMethod(method.id)}
                    className={`p-5 cursor-pointer transition-all ${
                      isSelected
                        ? "border-2 border-black bg-gray-50"
                        : "border hover:border-gray-400"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-full ${
                          isSelected ? "bg-black text-white" : "bg-gray-100"
                        }`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{method.name}</h3>
                          <p className="text-sm text-gray-600">
                            {method.type === "card" ? `•••• ${method.last4}` : method.detail}
                          </p>
                        </div>
                      </div>
                      {isSelected && <Check className="h-5 w-5" />}
                    </div>
                  </Card>
                );
              })}

              {/* Add New Card Button */}
              <Card
                onClick={() => setShowAddCard(!showAddCard)}
                className="p-5 cursor-pointer border-2 border-dashed hover:border-gray-400"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-gray-100">
                    <Plus className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{t("addNewCard")}</h3>
                  </div>
                </div>
              </Card>
            </div>

            {/* Add Card Form */}
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
                      onChange={(e) => setNewCardNumber(e.target.value)}
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
                        onChange={(e) => setNewCardExpiry(e.target.value)}
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
                        onChange={(e) => setNewCardCvv(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cardName">{t("cardName")}</Label>
                    <Input
                      id="cardName"
                      placeholder="TANAKA TARO"
                      value={newCardName}
                      onChange={(e) => setNewCardName(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-3">
                    <Button
                      onClick={handleSaveCard}
                      className="flex-1 bg-black hover:bg-gray-800 text-white"
                    >
                      {t("save")}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowAddCard(false)}
                    >
                      {t("cancel")}
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button
                onClick={handleNext}
                disabled={!hasLockedRoute}
                className="w-full h-12 bg-black hover:bg-gray-800 text-white"
              >
                {t("next")}
              </Button>
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
                乗車をキャンセル
              </Button>
            </div>
          </div>
        </div>

        {/* Right Panel - Map (30%) */}
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
