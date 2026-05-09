import { useNavigate } from "react-router";
import { Header } from "../../components/Header";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { DollarSign, TrendingUp, Calendar, Download, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useLanguage } from "../../contexts/LanguageContext";

export default function IncomeManagementPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const weeklyData = [
    { day: "月", earnings: 420000 },
    { day: "火", earnings: 580000 },
    { day: "水", earnings: 650000 },
    { day: "木", earnings: 520000 },
    { day: "金", earnings: 720000 },
    { day: "土", earnings: 850000 },
    { day: "日", earnings: 680000 },
  ];

  const transactions = [
    {
      id: 1,
      type: "earning",
      description: t("estimatedFare"),
      amount: "280,000 VND",
      date: "2026-03-28 15:15",
      status: t("completed"),
    },
    {
      id: 2,
      type: "earning",
      description: t("estimatedFare"),
      amount: "96,000 VND",
      date: "2026-03-28 11:30",
      status: t("completed"),
    },
    {
      id: 3,
      type: "earning",
      description: t("estimatedFare"),
      amount: "144,000 VND",
      date: "2026-03-28 10:05",
      status: t("completed"),
    },
    {
      id: 4,
      type: "withdrawal",
      description: t("withdrawFunds"),
      amount: "-2,500,000 VND",
      date: "2026-03-27 09:00",
      status: t("inProgress"),
    },
    {
      id: 5,
      type: "fee",
      description: "Service Fee",
      amount: "-70,000 VND",
      date: "2026-03-27 16:30",
      status: t("completed"),
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header type="driver" />

      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold">{t("incomeManagement")}</h1>
            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              {t("downloadReceipt")}
            </Button>
          </div>

          {/* Balance Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <Card className="p-6 bg-gradient-to-br from-green-500 to-green-600 text-white">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-green-100 mb-2">{t("totalEarnings")}</p>
                  <p className="text-4xl font-bold">3,850,000 VND</p>
                </div>
                <div className="bg-white/20 p-3 rounded-full">
                  <DollarSign className="h-6 w-6" />
                </div>
              </div>
              <Button variant="secondary" className="w-full bg-white text-green-600 hover:bg-green-50">
                {t("withdrawFunds")}
              </Button>
            </Card>

            <Card className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-gray-600 mb-2">{t("thisWeekEarnings")}</p>
                  <p className="text-3xl font-bold">4,420,000 VND</p>
                </div>
                <div className="bg-blue-100 p-3 rounded-full">
                  <TrendingUp className="h-6 w-6 text-blue-600" />
                </div>
              </div>
              <div className="flex items-center gap-2 text-green-600">
                <ArrowUpRight className="h-4 w-4" />
                <span className="text-sm font-semibold">+12% from last week</span>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-gray-600 mb-2">{t("thisMonthEarnings")}</p>
                  <p className="text-3xl font-bold">18,250,000 VND</p>
                </div>
                <div className="bg-purple-100 p-3 rounded-full">
                  <Calendar className="h-6 w-6 text-purple-600" />
                </div>
              </div>
              <div className="flex items-center gap-2 text-green-600">
                <ArrowUpRight className="h-4 w-4" />
                <span className="text-sm font-semibold">+8% from last month</span>
              </div>
            </Card>
          </div>

          {/* Chart */}
          <Card className="p-6 mb-6">
            <h3 className="font-bold text-lg mb-4">{t("weeklyEarnings")}</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="earnings" fill="#000000" />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Transactions */}
          <Card className="p-6">
            <Tabs defaultValue="all" className="w-full">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-lg">{t("history")}</h3>
                <TabsList>
                  <TabsTrigger value="all">{t("allRides")}</TabsTrigger>
                  <TabsTrigger value="earnings">{t("earnings")}</TabsTrigger>
                  <TabsTrigger value="withdrawals">{t("withdraw")}</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="all" className="space-y-3 m-0">
                {transactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`p-2 rounded-full ${
                          transaction.type === "earning"
                            ? "bg-green-100"
                            : transaction.type === "withdrawal"
                            ? "bg-blue-100"
                            : "bg-red-100"
                        }`}
                      >
                        {transaction.type === "earning" ? (
                          <ArrowUpRight className="h-5 w-5 text-green-600" />
                        ) : (
                          <ArrowDownRight className="h-5 w-5 text-blue-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-semibold">{transaction.description}</p>
                        <p className="text-sm text-gray-600">{transaction.date}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p
                        className={`font-bold text-lg ${
                          transaction.type === "earning" ? "text-green-600" : "text-gray-900"
                        }`}
                      >
                        {transaction.amount}
                      </p>
                      <p
                        className={`text-xs ${
                          transaction.status === t("completed")
                            ? "text-green-600"
                            : "text-yellow-600"
                        }`}
                      >
                        {transaction.status}
                      </p>
                    </div>
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="earnings" className="space-y-3 m-0">
                {transactions
                  .filter((t) => t.type === "earning")
                  .map((transaction) => (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-2 rounded-full bg-green-100">
                          <ArrowUpRight className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <p className="font-semibold">{transaction.description}</p>
                          <p className="text-sm text-gray-600">{transaction.date}</p>
                        </div>
                      </div>
                      <p className="font-bold text-lg text-green-600">{transaction.amount}</p>
                    </div>
                  ))}
              </TabsContent>

              <TabsContent value="withdrawals" className="space-y-3 m-0">
                {transactions
                  .filter((t) => t.type === "withdrawal")
                  .map((transaction) => (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-2 rounded-full bg-blue-100">
                          <ArrowDownRight className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-semibold">{transaction.description}</p>
                          <p className="text-sm text-gray-600">{transaction.date}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">{transaction.amount}</p>
                        <p className="text-xs text-yellow-600">{transaction.status}</p>
                      </div>
                    </div>
                  ))}
              </TabsContent>
            </Tabs>
          </Card>
        </div>
      </div>
    </div>
  );
}
