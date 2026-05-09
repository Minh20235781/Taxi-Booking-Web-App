import { useState } from "react";
import { useNavigate } from "react-router";
import { Header } from "../../components/Header";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { MapPin, Calendar, Star, Search, DollarSign } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { useLanguage } from "../../contexts/LanguageContext";

export default function DriverRideHistoryPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPeriod, setFilterPeriod] = useState("all");

  const rides = [
    {
      id: 1,
      customer: "田中 太郎",
      from: "Tran Hung Dao St",
      to: "Noi Bai Airport",
      date: "2026-03-28",
      time: "14:30",
      earnings: "280,000 VND",
      rating: 5,
      tip: "30,000 VND",
    },
    {
      id: 2,
      customer: "鈴木 花子",
      from: "Ba Trieu St",
      to: "Old Quarter",
      date: "2026-03-28",
      time: "11:15",
      earnings: "96,000 VND",
      rating: 5,
      tip: "0 VND",
    },
    {
      id: 3,
      customer: "佐藤 健",
      from: "West Lake",
      to: "Hanoi Station",
      date: "2026-03-28",
      time: "09:45",
      earnings: "144,000 VND",
      rating: 4,
      tip: "0 VND",
    },
    {
      id: 4,
      customer: "高橋 美咲",
      from: "Hoan Kiem Lake",
      to: "Vincom Center",
      date: "2026-03-27",
      time: "16:20",
      earnings: "76,000 VND",
      rating: 5,
      tip: "20,000 VND",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header type="driver" />

      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">{t("rideHistory")}</h1>

          {/* Filters */}
          <div className="flex gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("searchByCustomerOrLocation")}
                className="pl-10 h-12"
              />
            </div>
            <Select value={filterPeriod} onValueChange={setFilterPeriod}>
              <SelectTrigger className="w-48 h-12">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("allRides")}</SelectItem>
                <SelectItem value="today">{t("today")}</SelectItem>
                <SelectItem value="week">{t("thisWeek")}</SelectItem>
                <SelectItem value="month">{t("thisMonth")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="p-6">
              <div className="flex items-center gap-3">
                <div className="bg-green-100 p-3 rounded-full">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">{t("totalEarnings")}</p>
                  <p className="text-2xl font-bold">596,000 VND</p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 p-3 rounded-full">
                  <Calendar className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">{t("totalRides")}</p>
                  <p className="text-2xl font-bold">4</p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-3">
                <div className="bg-yellow-100 p-3 rounded-full">
                  <Star className="h-6 w-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">{t("averageRating")}</p>
                  <p className="text-2xl font-bold">4.75</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Rides List */}
          <div className="space-y-4">
            {rides.map((ride) => (
              <Card key={ride.id} className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-bold text-lg">{ride.customer}</h3>
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm font-semibold">{ride.rating}</span>
                      </div>
                      {ride.tip !== "0 VND" && (
                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-semibold">
                          {t("tip")} {ride.tip}
                        </span>
                      )}
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
                    <p className="text-sm text-gray-600 mb-1">{t("earnings")}</p>
                    <p className="font-bold text-2xl text-green-600">{ride.earnings}</p>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <Button variant="outline" size="sm">
                    {t("viewDetails")}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}