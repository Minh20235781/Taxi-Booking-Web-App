import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Header } from "../../components/Header";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Textarea } from "../../components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import { Star, ThumbsUp } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";
import { api } from "../../services/api";
import { clearActiveBookingId } from "../../services/bookingFlow";

const COMPLIMENT_KEYS = [
  { key: "friendly", labelKey: "friendlyDriver" },
  { key: "clean", labelKey: "cleanVehicle" },
  { key: "safe", labelKey: "safeDriving" },
  { key: "onTime", labelKey: "onTime" },
  { key: "conversation", labelKey: "greatConversation" },
  { key: "smooth", labelKey: "smoothDriving" },
] as const;

export default function DriverRatingPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [selectedCompliments, setSelectedCompliments] = useState<string[]>([]);
  const [selectedTip, setSelectedTip] = useState<number | null>(null);
  const [driverInfo, setDriverInfo] = useState<{
    name: string;
    avatarUrl: string;
    vehicleModel: string;
    vehiclePlate: string;
    initials: string;
  } | null>(null);

  const compliments = COMPLIMENT_KEYS.map(({ key, labelKey }) => ({
    key,
    label: t(labelKey as keyof typeof t),
  }));

  useEffect(() => {
    const bookingIdStr = sessionStorage.getItem("last_completed_booking_id") || "";
    const bookingId = Number(bookingIdStr);
    if (!bookingId) return;

    api
      .getBookingWithRide(bookingId)
      .then((res: any) => {
        const booking = res?.data || res;
        const driver = booking?.ride?.driver;
        const user = driver?.user;
        const name = user?.fullName || "—";
        setDriverInfo({
          name,
          avatarUrl: user?.avatarUrl || "",
          vehicleModel: driver?.vehicleModel || "",
          vehiclePlate: driver?.vehiclePlate || "",
          initials: name
            .split(" ")
            .filter(Boolean)
            .slice(0, 2)
            .map((p: string) => p[0])
            .join("") || "?",
        });
      })
      .catch((err) => console.error("Failed to load driver for rating:", err));
  }, []);

  const handleComplimentToggle = (key: string) => {
    setSelectedCompliments((prev) =>
      prev.includes(key) ? prev.filter((c) => c !== key) : [...prev, key]
    );
  };

  const handleSubmit = async () => {
    try {
      const bookingIdStr = sessionStorage.getItem("last_completed_booking_id") || "";
      const bookingId = Number(bookingIdStr);
      if (!bookingId) {
        navigate("/user/home");
        return;
      }

      const bookingRes: any = await api.getBookingWithRide(bookingId);
      const booking = bookingRes?.data || bookingRes;
      const rideId = booking?.ride?.id;
      if (!rideId) {
        navigate("/user/home");
        return;
      }

      await api.submitRating(rideId, {
        score: rating,
        comment,
        compliments: selectedCompliments,
        tipAmount: selectedTip || undefined,
      });

      clearActiveBookingId();
      navigate("/user/home");
    } catch (err) {
      console.error(err);
      alert("Failed to submit rating. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header type="user" />

      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">{t("rateYourRide")}</h1>
            <p className="text-gray-600">{t("rateDriver")}</p>
          </div>

          <Card className="p-6 mb-6">
            <div className="flex items-center gap-4 justify-center">
              <Avatar className="h-20 w-20">
                {driverInfo?.avatarUrl ? <AvatarImage src={driverInfo.avatarUrl} /> : null}
                <AvatarFallback>{driverInfo?.initials || "?"}</AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-bold text-xl">{driverInfo?.name || "—"}</h3>
                <p className="text-gray-600">
                  {[driverInfo?.vehicleModel, driverInfo?.vehiclePlate].filter(Boolean).join(" • ") ||
                    "—"}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-8 mb-6">
            <div className="flex justify-center gap-2 mb-6">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    className={`h-12 w-12 ${
                      star <= (hoverRating || rating)
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-gray-300"
                    }`}
                  />
                </button>
              ))}
            </div>
            <p className="text-center text-gray-600">
              {rating === 0 && t("selectRating")}
              {rating === 1 && t("veryBad")}
              {rating === 2 && t("bad")}
              {rating === 3 && t("average")}
              {rating === 4 && t("good")}
              {rating === 5 && t("excellent")}
            </p>
          </Card>

          {rating >= 4 && (
            <Card className="p-6 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <ThumbsUp className="h-5 w-5" />
                <h3 className="font-semibold">{t("selectCompliments")}</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {compliments.map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleComplimentToggle(key)}
                    className={`px-4 py-2 rounded-full border-2 transition-all ${
                      selectedCompliments.includes(key)
                        ? "bg-black text-white border-black"
                        : "bg-white text-gray-700 border-gray-300 hover:border-gray-400"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </Card>
          )}

          <Card className="p-6 mb-6">
            <h3 className="font-semibold mb-4">{t("comment")} (任意)</h3>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={t("commentPlaceholder")}
              className="min-h-32"
            />
          </Card>

          {rating >= 4 && (
            <Card className="p-6 mb-6">
              <h3 className="font-semibold mb-4">{t("addTip")}</h3>
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: "20,000", value: 20000 },
                  { label: "50,000", value: 50000 },
                  { label: "100,000", value: 100000 },
                  { label: t("other"), value: "other" },
                ].map((opt) => (
                  <Button
                    key={String(opt.value)}
                    variant={selectedTip === opt.value ? "default" : "outline"}
                    className="h-12"
                    onClick={() => {
                      if (opt.value === "other") {
                        const val = prompt(t("enterTipAmount") || "Enter tip amount (VND)");
                        if (val) {
                          const n = Number(val.replace(/[,\s]/g, ""));
                          if (!Number.isNaN(n) && n > 0) setSelectedTip(n);
                        }
                      } else {
                        setSelectedTip(opt.value as number);
                      }
                    }}
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>
            </Card>
          )}

          <div className="space-y-3">
            <Button
              onClick={handleSubmit}
              disabled={rating === 0}
              className="w-full h-12 bg-black hover:bg-gray-800 text-white"
            >
              {t("submitRating")}
            </Button>
            <Button
              onClick={() => navigate("/user/home")}
              variant="ghost"
              className="w-full h-12"
            >
              {t("skip")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
