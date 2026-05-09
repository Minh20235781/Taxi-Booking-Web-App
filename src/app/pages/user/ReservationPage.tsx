import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { BookingStepIndicator } from "../../components/BookingStepIndicator";
import { Header } from "../../components/Header";
import { MapPlaceholder } from "../../components/MapPlaceholder";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import {
  MapPin,
  Navigation,
  Search,
  Calendar as CalendarIcon,
  Clock,
} from "lucide-react";
import { Calendar } from "../../components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../components/ui/popover";
import { format } from "date-fns";
import { useLanguage } from "../../contexts/LanguageContext";
import { getBookingFlowDraft, updateBookingFlowDraft } from "../../services/bookingFlow";
import { api, type LocationSuggestion } from "../../services/api";

export default function ReservationPage() {
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
  const [routeSummary, setRouteSummary] = useState<{ distance: number; duration: number } | null>(
    null
  );
  const debounceTimer = useRef<number | null>(null);
  const requestAbort = useRef<AbortController | null>(null);
  const [date, setDate] = useState<Date>();
  const [time, setTime] = useState("10:00");
  const canChooseVehicle = useMemo(
    () =>
      Boolean(date) &&
      pickup.trim().length > 0 &&
      destination.trim().length > 0 &&
      Boolean(pickupSelection) &&
      Boolean(destinationSelection),
    [date, pickup, destination, pickupSelection, destinationSelection]
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
      try {
        const result = await api.suggestLocations(keyword, 5, {
          signal: requestAbort.current.signal
        });
        const list = (result.suggestions || []).slice(0, 5);
        if (field === "pickup") {
          setPickupSuggestions(list);
        } else {
          setDestinationSuggestions(list);
        }
      } catch {
        if (field === "pickup") {
          setPickupSuggestions([]);
        } else {
          setDestinationSuggestions([]);
        }
      }
    }, 300);
  };

  const currentSuggestions =
    activeField === "pickup" ? pickupSuggestions : destinationSuggestions;

  const handleChooseVehicle = () => {
    updateBookingFlowDraft({
      entryPoint: "reservation",
      pickupText: pickup.trim(),
      destinationText: destination.trim(),
      pickupSelection,
      destinationSelection,
      reservationDate: date ? date.toISOString() : undefined,
      reservationTime: time,
      routeDistanceMeters: routeSummary?.distance,
      routeDurationSeconds: routeSummary?.duration
    });
    navigate("/user/vehicle-selection");
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header type="user" />

      <div className="flex-1 flex">
        {/* Left Panel - Reservation Form */}
        <div className="w-[30%] p-6 overflow-auto border-r">
          <div className="max-w-lg">
            <BookingStepIndicator currentStep={1} title="予約の乗車地点・行き先を選択" />
            <h1 className="text-2xl font-bold mb-6">
              {t("scheduleRide")}
            </h1>

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
            <div className="mb-4">
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
            <div className="mb-4 space-y-2">
              {currentSuggestions.map((place, index) => (
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

            {/* Date Selection */}
            <div className="mb-4">
              <label className="block text-sm font-semibold mb-2">
                {t("date")}
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full h-12 justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-5 w-5" />
                    {date
                      ? format(date, "yyyy年MM月dd日")
                      : t("selectDate")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-auto p-0"
                  align="start"
                >
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Time Selection */}
            <div className="mb-6">
              <label className="block text-sm font-semibold mb-2">
                {t("time")}
              </label>
              <div className="flex items-center gap-3 p-4 border-2 border-gray-300 rounded-lg">
                <Clock className="h-5 w-5 text-gray-400" />
                <Input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="border-0 focus-visible:ring-0"
                />
              </div>
            </div>

            {/* Scheduled Rides Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-800">
                <strong>{t("important")}</strong>{" "}
                {t("reservationNote")}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button
                onClick={handleChooseVehicle}
                disabled={!canChooseVehicle}
                className="w-full h-12 bg-black hover:bg-gray-800 text-white"
              >
                {t("chooseVehicle")}
              </Button>
              <Button
                onClick={() => navigate("/user/booking")}
                variant="outline"
                className="w-full h-12"
              >
                {t("backToBookNow")}
              </Button>
            </div>
          </div>
        </div>

        {/* Right Panel - Map */}
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