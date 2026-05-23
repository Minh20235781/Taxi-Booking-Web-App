import { useState } from "react";
import { useNavigate } from "react-router";
import { Header } from "../../components/Header";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Textarea } from "../../components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import { Star, ThumbsUp } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";
import { api } from "../../services/api";

export default function DriverRatingPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [selectedCompliments, setSelectedCompliments] = useState<string[]>([]);
  const [selectedTip, setSelectedTip] = useState<number | null>(null);

  const compliments = [
    t("friendlyDriver"),
    t("cleanVehicle"),
    t("safeDriving"),
    t("onTime"),
    t("greatConversation"),
    t("smoothDriving"),
  ];

  const handleComplimentToggle = (compliment: string) => {
    setSelectedCompliments((prev) =>
      prev.includes(compliment)
        ? prev.filter((c) => c !== compliment)
        : [...prev, compliment]
    );
  };

  const handleSubmit = async () => {
    try {
      const bookingIdStr = sessionStorage.getItem("last_completed_booking_id") || "";
      const bookingId = Number(bookingIdStr);
      if (!bookingId) {
        // fallback: navigate to bill
        navigate("/user/bill");
        return;
      }

      // fetch booking to get ride id
      const booking = await api.getBookingWithRide(bookingId);
      const rideId = booking?.ride?.id;
      if (!rideId) {
        // nothing to rate
        navigate("/user/bill");
        return;
      }

      await api.submitRating(rideId, {
        score: rating,
        comment,
        compliments: selectedCompliments,
        tipAmount: selectedTip || undefined
      });

      navigate("/user/bill");
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

          {/* Driver Info */}
          <Card className="p-6 mb-6">
            <div className="flex items-center gap-4 justify-center">
              <Avatar className="h-20 w-20">
                <AvatarImage src="https://i.pravatar.cc/150?img=12" />
                <AvatarFallback>NT</AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-bold text-xl">Nguyen Thanh</h3>
                <p className="text-gray-600">Toyota Vios • 30A-12345</p>
              </div>
            </div>
          </Card>

          {/* Star Rating */}
          <Card className="p-8 mb-6">
            <div className="flex justify-center gap-2 mb-6">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
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

          {/* Compliments */}
          {rating >= 4 && (
            <Card className="p-6 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <ThumbsUp className="h-5 w-5" />
                <h3 className="font-semibold">{t("selectCompliments")}</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {compliments.map((compliment) => (
                  <button
                    key={compliment}
                    onClick={() => handleComplimentToggle(compliment)}
                    className={`px-4 py-2 rounded-full border-2 transition-all ${
                      selectedCompliments.includes(compliment)
                        ? "bg-black text-white border-black"
                        : "bg-white text-gray-700 border-gray-300 hover:border-gray-400"
                    }`}
                  >
                    {compliment}
                  </button>
                ))}
              </div>
            </Card>
          )}

          {/* Comment */}
          <Card className="p-6 mb-6">
            <h3 className="font-semibold mb-4">{t("comment")} (任意)</h3>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={t("commentPlaceholder")}
              className="min-h-32"
            />
          </Card>

          {/* Tips Section */}
          {rating >= 4 && (
            <Card className="p-6 mb-6">
              <h3 className="font-semibold mb-4">{t("addTip")}</h3>
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: "20,000", value: 20000 },
                  { label: "50,000", value: 50000 },
                  { label: "100,000", value: 100000 },
                  { label: t("other"), value: "other" }
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

          {/* Submit Button */}
          <div className="space-y-3">
            <Button
              onClick={handleSubmit}
              disabled={rating === 0}
              className="w-full h-12 bg-black hover:bg-gray-800 text-white"
            >
              {t("submitRating")}
            </Button>
            <Button
              onClick={() => navigate("/user/bill")}
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