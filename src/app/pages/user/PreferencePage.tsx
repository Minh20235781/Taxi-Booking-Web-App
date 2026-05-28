import { useState } from "react";
import { useNavigate } from "react-router";
import { BookingStepIndicator } from "../../components/BookingStepIndicator";
import { Header } from "../../components/Header";
import { MapPlaceholder } from "../../components/MapPlaceholder";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Checkbox } from "../../components/ui/checkbox";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Languages, MessageSquare, Star, MapPin, Navigation, Search } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";
import { getBookingFlowDraft, updateBookingFlowDraft } from "../../services/bookingFlow";
import { api, type LocationSuggestion } from "../../services/api";

export default function PreferencePage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const draft = getBookingFlowDraft();
  const [pickup, setPickup] = useState(draft.pickupText || "");
  const [destination, setDestination] = useState(draft.destinationText || "");
  const [pickupSelection] = useState<LocationSuggestion | null>(draft.pickupSelection || null);
  const [destinationSelection] = useState<LocationSuggestion | null>(
    draft.destinationSelection || null
  );
  const hasLockedRoute = Boolean(pickupSelection && destinationSelection);
  const [languages, setLanguages] = useState({
    japanese: true,
    english: false,
    vietnamese: false,
  });
  const [preferences, setPreferences] = useState({
    quiet: false,
    music: false,
    aircon: true,
  });
  const [specialRequest, setSpecialRequest] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const handleConfirmBooking = async () => {
    if (!hasLockedRoute) {
      return;
    }
    const selectedLanguages = Object.entries(languages)
      .filter(([, checked]) => checked)
      .map(([key]) => key);
    const selectedRidePreferences = Object.entries(preferences)
      .filter(([, checked]) => checked)
      .map(([key]) => key);
    const prefs = {
      languages: selectedLanguages,
      ridePreferences: selectedRidePreferences,
      specialRequest: specialRequest.trim()
    };

    updateBookingFlowDraft({
      pickupText: pickup.trim(),
      destinationText: destination.trim(),
      preferences: prefs
    });

    if (draft.bookingId) {
      try {
        setIsSaving(true);
        setSaveError("");
        await api.updateBookingPreferences(draft.bookingId, prefs);
      } catch (err) {
        setSaveError(err instanceof Error ? err.message : "Could not save preferences.");
        setIsSaving(false);
        return;
      } finally {
        setIsSaving(false);
      }
    }

    navigate("/user/driver-request");
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

        {/* Middle Panel - Driver Preferences (40%) */}
        <div className="w-[40%] p-6 overflow-auto border-r">
          <div className="max-w-lg">
            <BookingStepIndicator currentStep={4} title="乗車設定を確認" />
            <h2 className="text-xl font-bold mb-2">{t("driverPreferences")}</h2>

            {/* Language Requirements */}
            <Card className="p-6 mb-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-black text-white p-2 rounded-full">
                  <Languages className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-lg">{t("languageRequirements")}</h3>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="japanese"
                    checked={languages.japanese}
                    onCheckedChange={(checked) =>
                      setLanguages({ ...languages, japanese: checked as boolean })
                    }
                  />
                  <Label htmlFor="japanese" className="text-base cursor-pointer">
                    {t("japanese")}{t("speaksJapanese")}
                  </Label>
                </div>

                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="english"
                    checked={languages.english}
                    onCheckedChange={(checked) =>
                      setLanguages({ ...languages, english: checked as boolean })
                    }
                  />
                  <Label htmlFor="english" className="text-base cursor-pointer">
                    {t("english")}{t("speaksEnglish")}
                  </Label>
                </div>

                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="vietnamese"
                    checked={languages.vietnamese}
                    onCheckedChange={(checked) =>
                      setLanguages({ ...languages, vietnamese: checked as boolean })
                    }
                  />
                  <Label htmlFor="vietnamese" className="text-base cursor-pointer">
                    {t("vietnamese")}{t("speaksVietnamese")}
                  </Label>
                </div>
              </div>

              {languages.japanese && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>{t("note")}：</strong>{t("japaneseDriverNote")}
                  </p>
                </div>
              )}
            </Card>

            {/* Ride Preferences */}
            <Card className="p-6 mb-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-black text-white p-2 rounded-full">
                  <Star className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-lg">{t("ridePreferences")}</h3>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="quiet"
                    checked={preferences.quiet}
                    onCheckedChange={(checked) =>
                      setPreferences({ ...preferences, quiet: checked as boolean })
                    }
                  />
                  <Label htmlFor="quiet" className="text-base cursor-pointer">
                    {t("quietRide")}
                  </Label>
                </div>

                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="music"
                    checked={preferences.music}
                    onCheckedChange={(checked) =>
                      setPreferences({ ...preferences, music: checked as boolean })
                    }
                  />
                  <Label htmlFor="music" className="text-base cursor-pointer">
                    {t("noMusic")}
                  </Label>
                </div>

                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="aircon"
                    checked={preferences.aircon}
                    onCheckedChange={(checked) =>
                      setPreferences({ ...preferences, aircon: checked as boolean })
                    }
                  />
                  <Label htmlFor="aircon" className="text-base cursor-pointer">
                    {t("airconRequired")}
                  </Label>
                </div>
              </div>
            </Card>

            {/* Special Requests */}
            <Card className="p-6 mb-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-black text-white p-2 rounded-full">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-lg">{t("specialRequests")}</h3>
              </div>

              <Textarea
                value={specialRequest}
                onChange={(e) => setSpecialRequest(e.target.value)}
                placeholder={t("specialRequestsPlaceholder")}
                className="min-h-24"
              />
            </Card>

            {/* Action Buttons */}
            {saveError ? (
              <p className="text-sm text-red-600 mb-3">{saveError}</p>
            ) : null}
            <div className="space-y-3">
              <Button
                onClick={handleConfirmBooking}
                disabled={!hasLockedRoute || isSaving}
                className="w-full h-12 bg-black hover:bg-gray-800 text-white"
              >
                {isSaving ? t("saving") : t("confirmBooking")}
              </Button>
              <Button
                onClick={() => navigate("/user/payment-method")}
                variant="outline"
                className="w-full h-12"
              >
                {t("back")}
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
