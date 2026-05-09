import { useState } from "react";
import { useNavigate } from "react-router";
import { Header } from "../../components/Header";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { MapPin, Calendar, Star, Search, Download } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";
import { clearBookingFlowDraft } from "../../services/bookingFlow";

export default function UserRideHistoryPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");

  const handleBookAgain = () => {
    clearBookingFlowDraft();
    navigate("/user/booking");
  };

  const completedRides = [
    {
      id: 1,
      driver: "Nguyen Thanh",
      from: "Tran Hung Dao St",
      to: "Noi Bai Airport",
      date: "2026-03-27",
      time: "14:30",
      price: "350,000 VND",
      rating: 5,
    },
    {
      id: 2,
      driver: "Le Van Minh",
      from: "Ba Trieu St",
      to: "Old Quarter",
      date: "2026-03-25",
      time: "09:15",
      price: "120,000 VND",
      rating: 4,
    },
    {
      id: 3,
      driver: "Tran Duc Anh",
      from: "Hoan Kiem Lake",
      to: "Hanoi Station",
      date: "2026-03-20",
      time: "16:45",
      price: "180,000 VND",
      rating: 5,
    },
    {
      id: 4,
      driver: "Pham Hoang Long",
      from: "West Lake",
      to: "Vincom Center",
      date: "2026-03-18",
      time: "11:20",
      price: "95,000 VND",
      rating: 4,
    },
  ];

  const upcomingRides = [
    {
      id: 1,
      from: "Tran Hung Dao St",
      to: "Noi Bai Airport",
      date: "2026-03-30",
      time: "08:00",
      vehicle: "premium",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header type="user" />

      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">{t("rideHistory")}</h1>

          {/* Search */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("searchByDestinationOrDate")}
                className="pl-10 h-12"
              />
            </div>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="completed" className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
              <TabsTrigger value="completed">{t("completedRides")}</TabsTrigger>
              <TabsTrigger value="upcoming">{t("upcomingRides")}</TabsTrigger>
            </TabsList>

            {/* Completed Rides */}
            <TabsContent value="completed" className="space-y-4">
              {completedRides.map((ride) => (
                <Card key={ride.id} className="p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-bold text-lg">{ride.driver}</h3>
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm font-semibold">{ride.rating}</span>
                        </div>
                      </div>
                      
                      <div className="space-y-2 mb-3">
                        <div className="flex items-start gap-2">
                          <div className="bg-green-500 rounded-full p-1 mt-1">
                            <div className="w-2 h-2 bg-white rounded-full"></div>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">{t("pickupPoint")}</p>
                            <p className="font-semibold">{ride.from}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 text-red-500 fill-red-500 mt-1" />
                          <div>
                            <p className="text-sm text-gray-600">{t("destinationPoint")}</p>
                            <p className="font-semibold">{ride.to}</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>{ride.date}</span>
                        </div>
                        <span>{ride.time}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="font-bold text-xl mb-2">{ride.price}</p>
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        {t("receipt")}
                      </Button>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4 border-t">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={handleBookAgain}
                    >
                      {t("bookAgain")}
                    </Button>
                    <Button
                      variant="ghost"
                      className="flex-1"
                    >
                      {t("support")}
                    </Button>
                  </div>
                </Card>
              ))}
            </TabsContent>

            {/* Upcoming Rides */}
            <TabsContent value="upcoming" className="space-y-4">
              {upcomingRides.map((ride) => (
                <Card key={ride.id} className="p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold inline-block mb-3">
                        {t("scheduled")}
                      </div>
                      
                      <div className="space-y-2 mb-3">
                        <div className="flex items-start gap-2">
                          <div className="bg-green-500 rounded-full p-1 mt-1">
                            <div className="w-2 h-2 bg-white rounded-full"></div>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">{t("pickupPoint")}</p>
                            <p className="font-semibold">{ride.from}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 text-red-500 fill-red-500 mt-1" />
                          <div>
                            <p className="text-sm text-gray-600">{t("destinationPoint")}</p>
                            <p className="font-semibold">{ride.to}</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>{ride.date}</span>
                        </div>
                        <span>{ride.time}</span>
                        <span className="bg-gray-100 px-2 py-1 rounded">{t(ride.vehicle)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4 border-t">
                    <Button
                      variant="outline"
                      className="flex-1"
                    >
                      {t("modifyReservation")}
                    </Button>
                    <Button
                      variant="ghost"
                      className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      {t("cancel")}
                    </Button>
                  </div>
                </Card>
              ))}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}