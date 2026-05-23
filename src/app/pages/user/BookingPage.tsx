import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { BookingStepIndicator } from "../../components/BookingStepIndicator";
import { Header } from "../../components/Header";
import { MapPlaceholder } from "../../components/MapPlaceholder";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { MapPin, Navigation, Search } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";
import { api, type LocationSuggestion } from "../../services/api";
import { getBookingFlowDraft, updateBookingFlowDraft } from "../../services/bookingFlow";
import { calculateFare, formatVnd } from "../../services/pricing";

export default function BookingPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [pickup, setPickup] = useState(() => getBookingFlowDraft().pickupText || "");
  const [destination, setDestination] = useState(() => getBookingFlowDraft().destinationText || "");
  const [pickupSelection, setPickupSelection] = useState<LocationSuggestion | null>(
    () => getBookingFlowDraft().pickupSelection || null
  );
  const [destinationSelection, setDestinationSelection] = useState<LocationSuggestion | null>(
    () => getBookingFlowDraft().destinationSelection || null
  );
  const [pickupSuggestions, setPickupSuggestions] = useState<LocationSuggestion[]>([]);
  const [destinationSuggestions, setDestinationSuggestions] = useState<LocationSuggestion[]>([]);
  const [activeField, setActiveField] = useState<"pickup" | "destination">("destination");
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [routeSummary, setRouteSummary] = useState<{ distance: number; duration: number } | null>(
    () => {
      const draft = getBookingFlowDraft();
      if (draft.routeDistanceMeters && draft.routeDurationSeconds) {
        return {
          distance: draft.routeDistanceMeters,
          duration: draft.routeDurationSeconds
        };
      }
      return null;
    }
  );
  const debounceTimer = useRef<number | null>(null);
  const requestSeq = useRef(0);
  const requestAbort = useRef<AbortController | null>(null);
  const canChooseVehicle = useMemo(
    () =>
      pickup.trim().length > 0 &&
      destination.trim().length > 0 &&
      Boolean(pickupSelection) &&
      Boolean(destinationSelection),
    [pickup, destination, pickupSelection, destinationSelection]
  );

  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        window.clearTimeout(debounceTimer.current);
      }
      requestAbort.current?.abort();
    };
  }, []);

  const fetchSuggestions = (field: "pickup" | "destination", value: string) => {
    const keyword = value.trim();
    if (debounceTimer.current) {
      window.clearTimeout(debounceTimer.current);
    }
    if (!keyword) {
      if (field === "pickup") {
        setPickupSuggestions([]);
      } else {
        setDestinationSuggestions([]);
      }
      return;
    }
    debounceTimer.current = window.setTimeout(async () => {
      requestAbort.current?.abort();
      requestAbort.current = new AbortController();
      requestSeq.current += 1;
      const seq = requestSeq.current;
      try {
        setIsLoadingSuggestions(true);
        const result = await api.suggestLocations(keyword, 5, {
          signal: requestAbort.current.signal
        });
        if (seq !== requestSeq.current) {
          return;
        }
        const next = (result.suggestions || []).slice(0, 5);
        if (field === "pickup") {
          setPickupSuggestions(next);
        } else {
          setDestinationSuggestions(next);
        }
      } catch {
        if (seq !== requestSeq.current) {
          return;
        }
        if (field === "pickup") {
          setPickupSuggestions([]);
        } else {
          setDestinationSuggestions([]);
        }
      } finally {
        if (seq === requestSeq.current) {
          setIsLoadingSuggestions(false);
        }
      }
    }, 320);
  };

  const currentSuggestions =
    activeField === "pickup" ? pickupSuggestions : destinationSuggestions;

  // Fallback suggestions to show when user hasn't typed yet or API returns none
  const FALLBACK_SUGGESTIONS: LocationSuggestion[] = [
    { placeId: "fallback:home", label: "Home", lat: 0, lon: 0 },
    { placeId: "fallback:work", label: "Work", lat: 0, lon: 0 },
    { placeId: "fallback:airport", label: "Airport", lat: 0, lon: 0 },
    { placeId: "fallback:station", label: "Train Station", lat: 0, lon: 0 }
  ];

  const handleGoNext = () => {
    if (!canChooseVehicle) {
      setErrorMessage("Vui lòng chọn điểm đón và điểm đến từ danh sách gợi ý.");
      return;
    }
    setErrorMessage("");
    updateBookingFlowDraft({
      entryPoint: "booking",
      pickupText: pickup.trim(),
      destinationText: destination.trim(),
      pickupSelection,
      destinationSelection,
      routeDistanceMeters: routeSummary?.distance,
      routeDurationSeconds: routeSummary?.duration
    });
    navigate("/user/vehicle-selection");
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header type="user" />

      <div className="flex-1 flex">
        {/* Left Panel - Destination Input (30%) */}
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
                  onChange={(e) => {
                    setPickup(e.target.value);
                    setPickupSelection(null);
                    setRouteSummary(null);
                    setActiveField("pickup");
                    fetchSuggestions("pickup", e.target.value);
                  }}
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
                  onChange={(e) => {
                    setDestination(e.target.value);
                    setDestinationSelection(null);
                    setRouteSummary(null);
                    setActiveField("destination");
                    fetchSuggestions("destination", e.target.value);
                  }}
                  placeholder={t("destination")}
                  className="border-0 focus-visible:ring-0"
                />
                <Search className="h-5 w-5 text-gray-400" />
              </div>
            </div>

            {/* Suggestions */}
            <div className="mb-6">
              <BookingStepIndicator currentStep={1} title="乗車地点・行き先を選択" />
              <h3 className="font-semibold mb-3">{t("suggestedDestinations")}</h3>
              <div className="space-y-2">
                {(currentSuggestions && currentSuggestions.length > 0
                  ? currentSuggestions.slice(0, 5)
                  : (destination.trim() === "" && activeField === "destination") || (pickup.trim() === "" && activeField === "pickup")
                  ? FALLBACK_SUGGESTIONS
                  : []).map((place, index) => (
                  <div
                    key={place.placeId || index}
                    onClick={() => {
                      if (activeField === "pickup") {
                        setPickup(place.label);
                        setPickupSelection(place);
                        setPickupSuggestions([]);
                      } else {
                        setDestination(place.label);
                        setDestinationSelection(place);
                        setDestinationSuggestions([]);
                      }
                    }}
                    className="flex items-center gap-3 p-3 hover:bg-gray-100 rounded-lg cursor-pointer"
                  >
                    <MapPin className="h-5 w-5 text-gray-400" />
                    <span>{place.label}</span>
                  </div>
                ))}
              </div>
              {isLoadingSuggestions && (
                <p className="text-xs text-gray-500">{t("loading")}</p>
              )}
            </div>
            {routeSummary && (
              <div className="mb-4 p-3 rounded-lg bg-gray-50 border text-sm">
                <p>{`Distance: ${(routeSummary.distance / 1000).toFixed(1)} km`}</p>
                <p>{`Duration: ${Math.round(routeSummary.duration / 60)} min`}</p>
                <p className="font-semibold mt-1">
                  {`Estimated fare from ${formatVnd(
                    calculateFare("economy", routeSummary.distance, routeSummary.duration).totalFare
                  )}`}
                </p>
              </div>
            )}

            {/* Action Button */}
            <Button
              onClick={handleGoNext}
              disabled={!canChooseVehicle}
              className="w-full h-12 bg-black hover:bg-gray-800 text-white"
            >
              {t("chooseVehicle")}
            </Button>
            {errorMessage && <p className="text-sm text-red-600 mt-2">{errorMessage}</p>}
          </div>
        </div>

        {/* Right Panel - Map (70%) */}
        <div className="w-[70%] p-6">
          <MapPlaceholder
            showRoute={!!destination}
            pickup={pickupSelection}
            destination={destinationSelection}
            onRouteResolved={setRouteSummary}
            className="h-full"
          />
        </div>
      </div>
    </div>
  );
}