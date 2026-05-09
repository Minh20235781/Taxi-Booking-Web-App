import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { BookingStepIndicator } from "../../components/BookingStepIndicator";
import { Header } from "../../components/Header";
import { MapPlaceholder } from "../../components/MapPlaceholder";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Car, Users, Briefcase, Check, MapPin, Navigation, Search } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";
import { api, type LocationSuggestion } from "../../services/api";
import { getBookingFlowDraft, updateBookingFlowDraft } from "../../services/bookingFlow";
import { calculateFare, formatVnd } from "../../services/pricing";

export default function VehicleSelectionPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const draft = getBookingFlowDraft();
  const [pickup] = useState(() => getBookingFlowDraft().pickupText || "");
  const [destination] = useState(() => getBookingFlowDraft().destinationText || "");
  const [pickupSelection, setPickupSelection] = useState<LocationSuggestion | null>(
    () => getBookingFlowDraft().pickupSelection || null
  );
  const [destinationSelection, setDestinationSelection] = useState<LocationSuggestion | null>(
    () => getBookingFlowDraft().destinationSelection || null
  );
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const hasLockedRoute = Boolean(pickupSelection && destinationSelection);
  const routeDistance = draft.routeDistanceMeters || 0;
  const routeDuration = draft.routeDurationSeconds || 0;

  const vehicles = [
    {
      id: "economy",
      name: t("economy"),
      description: t("economyDesc"),
      icon: Car,
      capacity: "4人",
      price: formatVnd(calculateFare("economy", routeDistance, routeDuration).totalFare),
      eta: "3分",
    },
    {
      id: "comfort",
      name: t("comfort"),
      description: t("comfortDesc"),
      icon: Users,
      capacity: "4人",
      price: formatVnd(calculateFare("comfort", routeDistance, routeDuration).totalFare),
      eta: "5分",
    },
    {
      id: "premium",
      name: t("premium"),
      description: t("premiumDesc"),
      icon: Briefcase,
      capacity: "4人",
      price: formatVnd(calculateFare("premium", routeDistance, routeDuration).totalFare),
      eta: "7分",
    },
  ];

  useEffect(() => {
    if (!pickupSelection || !destinationSelection) {
      setErrorMessage("Thiếu tọa độ tuyến đường. Vui lòng quay lại màn trước để chọn lại điểm đón/điểm đến.");
    }
  }, [pickupSelection, destinationSelection]);

  const handleNext = async () => {
    if (!hasLockedRoute) {
      setErrorMessage("Thiếu tọa độ tuyến đường. Vui lòng quay lại màn trước để chọn lại điểm đón/điểm đến.");
      return;
    }
    if (!selectedVehicle) {
      setErrorMessage("Vui lòng chọn hạng xe.");
      return;
    }
    const authUserText = localStorage.getItem("auth_user");
    if (!authUserText) {
      navigate("/login");
      return;
    }
    try {
      const result = await api.createBookingFlow({
        pickupAddress: pickup.trim(),
        destination: destination.trim(),
        vehicleClassCode: selectedVehicle
      });
      const selected = vehicles.find((item) => item.id === selectedVehicle);
      updateBookingFlowDraft({
        pickupText: pickup.trim(),
        destinationText: destination.trim(),
        pickupSelection,
        destinationSelection,
        bookingId: result.booking?.id,
        vehicle: selected
          ? {
              code: selected.id,
              name: selected.name,
              capacity: selected.capacity,
              eta: selected.eta,
              price: selected.price
            }
          : null
      });
      navigate("/user/payment-method");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Không thể tạo booking.");
    }
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

        {/* Middle Panel - Vehicle Selection (40%) */}
        <div className="w-[40%] p-6 overflow-auto border-r">
          <div className="max-w-lg">
            <BookingStepIndicator currentStep={2} title="車両クラスを選択" />
            <h2 className="text-xl font-bold mb-2">{t("chooseVehicle")}</h2>
            <p className="text-gray-600 mb-6">
              {pickup && destination ? `${pickup} → ${destination}` : ""}
            </p>

            <div className="space-y-4">
              {vehicles.map((vehicle) => {
                const Icon = vehicle.icon;
                const isSelected = selectedVehicle === vehicle.id;

                return (
                  <Card
                    key={vehicle.id}
                    onClick={() => setSelectedVehicle(vehicle.id)}
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
                          <Icon className="h-6 w-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-lg">{vehicle.name}</h3>
                            {isSelected && <Check className="h-5 w-5" />}
                          </div>
                          <p className="text-sm text-gray-600">{vehicle.description}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {vehicle.capacity} • {vehicle.eta}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">{vehicle.price}</p>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>

            {/* Confirm Button */}
            <Button
              onClick={handleNext}
              disabled={!selectedVehicle || !hasLockedRoute}
              className="w-full h-12 bg-black hover:bg-gray-800 text-white mt-6"
            >
              {t("next")}
            </Button>
            {errorMessage && <p className="text-sm text-red-600 mt-2">{errorMessage}</p>}
            {!hasLockedRoute && (
              <p className="text-xs text-gray-500 mt-2">
                Điểm đón/điểm đến đã khóa theo bước trước. Nhấn Back để chỉnh sửa.
              </p>
            )}
            <Button
              onClick={() => navigate(draft.entryPoint === "reservation" ? "/user/reservation" : "/user/booking")}
              variant="outline"
              className="w-full h-12 mt-3"
            >
              戻る
            </Button>
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