import { useNavigate } from "react-router";
import { Header } from "../../components/Header";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Car, Clock, MapPin, History } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";
import { clearBookingFlowDraft } from "../../services/bookingFlow";

export default function UserHomepage() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const startBookNow = () => {
    clearBookingFlowDraft();
    navigate("/user/booking");
  };

  const startReservation = () => {
    clearBookingFlowDraft();
    navigate("/user/reservation");
  };

  const recentRides = [
    { id: 1, destination: "Noi Bai Airport", date: "2026-03-27", price: "350,000 VND" },
    { id: 2, destination: "Old Quarter", date: "2026-03-25", price: "120,000 VND" },
    { id: 3, destination: "Hanoi Station", date: "2026-03-20", price: "180,000 VND" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header type="user" />

      <div className="flex-1 p-6">
        <div className="max-w-6xl mx-auto">
          {/* Welcome Section */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">{t("whereToToday")}</h1>
            <p className="text-gray-600">{t("enterDestination")}</p>
          </div>

          {/* Main Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <Card className="p-8 hover:shadow-lg transition-shadow cursor-pointer" onClick={startBookNow}>
              <div className="flex items-center gap-4">
                <div className="bg-black text-white p-4 rounded-full">
                  <Car className="h-8 w-8" />
                </div>
                <div>
                  <h3 className="font-bold text-xl mb-1">{t("bookNow")}</h3>
                  <p className="text-gray-600">{t("quickActions")}</p>
                </div>
              </div>
            </Card>

            <Card className="p-8 hover:shadow-lg transition-shadow cursor-pointer" onClick={startReservation}>
              <div className="flex items-center gap-4">
                <div className="bg-black text-white p-4 rounded-full">
                  <Clock className="h-8 w-8" />
                </div>
                <div>
                  <h3 className="font-bold text-xl mb-1">{t("scheduleForLater")}</h3>
                  <p className="text-gray-600">{t("myReservations")}</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Saved Places */}
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4">{t("savedAddresses")}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="p-6 hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="bg-gray-100 p-3 rounded-full">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold">{t("home")}</p>
                    <p className="text-sm text-gray-600">123 Tran Hung Dao St</p>
                  </div>
                </div>
              </Card>

              <Card className="p-6 hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="bg-gray-100 p-3 rounded-full">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold">{t("work")}</p>
                    <p className="text-sm text-gray-600">45 Ba Trieu St</p>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* Recent Rides */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">{t("recentDestinations")}</h2>
              <Button variant="ghost" onClick={() => navigate("/user/history")}>
                {t("viewAll")}
              </Button>
            </div>
            <div className="space-y-3">
              {recentRides.map((ride) => (
                <Card key={ride.id} className="p-6 hover:shadow-md transition-shadow cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="bg-gray-100 p-3 rounded-full">
                        <History className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-semibold">{ride.destination}</p>
                        <p className="text-sm text-gray-600">{ride.date}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{ride.price}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
