import { useNavigate } from "react-router";
import { useEffect, useState } from "react";
import { Header } from "../../components/Header";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Separator } from "../../components/ui/separator";
import { MapPin, Calendar, DollarSign, Check, Star } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "../../components/ui/avatar";
import { useLanguage } from "../../contexts/LanguageContext";
import { api } from "../../services/api";

export default function DriverBillPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [booking, setBooking] = useState<any | null>(null);

  useEffect(() => {
    let mounted = true;
    let timer: number;
    const bid = sessionStorage.getItem('last_completed_booking_id');
    if (!bid) return;
    
    const fetchBooking = async () => {
      try {
        const res: any = await api.getBookingWithRide(Number(bid));
        if (!mounted) return;
        setBooking(res.booking || res);
        
        // Poll for rating if not present yet
        const rb = res.booking || res;
        if (!rb?.ride?.rating) {
          timer = window.setTimeout(fetchBooking, 3000);
        }
      } catch (err) {
        console.error('Failed to load booking for driver bill page', err);
      }
    };
    
    fetchBooking();
    return () => { 
      mounted = false; 
      clearTimeout(timer);
    };
  }, []);

  const subtotal = booking?.estimatedFare ? Math.round(booking.estimatedFare) : 0;
  
  // Calculate tip: if ride matches and finalFare > estimatedFare
  const ride = booking?.ride;
  const tip = ride?.finalFare && booking?.estimatedFare && ride.finalFare > booking.estimatedFare 
    ? Math.round(ride.finalFare - booking.estimatedFare) 
    : ride?.payment?.method === 'TIP' ? Math.round(ride.payment.amount) : 0;

  const totalWithTip = subtotal + tip;
  const commission = Math.round(totalWithTip * 0.2);
  const yourEarnings = totalWithTip - commission;
  const baseFare = booking?.vehicleClass?.baseFare ? Math.round(booking.vehicleClass.baseFare) : null;
  const tollFee = booking?.tollFee ?? 0;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header type="driver" />

      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="bg-green-100 text-green-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="h-8 w-8" />
            </div>
            <h1 className="text-3xl font-bold mb-2">{t("tripCompleted")}</h1>
            <p className="text-gray-600">{t("goodWork")}</p>
          </div>

          {/* Earnings Card */}
          <Card className="p-8 mb-6 bg-green-50 border-green-200">
          <div className="text-center mb-6">
              <div className="flex items-center justify-center gap-2 mb-2">
                <DollarSign className="h-8 w-8 text-green-600" />
                <h2 className="text-5xl font-bold text-green-600">{yourEarnings ? `${yourEarnings.toLocaleString()} VND` : ' - '}</h2>
              </div>
              <p className="text-gray-600">{t("thisRideEarnings")}</p>
            </div>

            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-green-200">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{yourEarnings ? `${yourEarnings.toLocaleString()}` : '-'}</p>
                <p className="text-sm text-gray-600">{t("todayEarnings")}</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">-</p>
                <p className="text-sm text-gray-600">{t("todaysRides")}</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">-</p>
                <p className="text-sm text-gray-600">{t("activeHours")}</p>
              </div>
            </div>
          </Card>

          {/* Trip Details */}
          <Card className="p-8 mb-6">
            <h3 className="font-semibold text-lg mb-4">{t("tripDetails")}</h3>

            <div className="space-y-4 mb-6">
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-gray-600">{t("pickupPoint")}</p>
                  <p className="font-semibold">{booking?.pickupAddress || ''}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-gray-600">{t("destinationPoint")}</p>
                  <p className="font-semibold">{booking?.destination || ''}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-gray-600">{t("dateTime")}</p>
                  <p className="font-semibold">{booking?.scheduledAt ? `${new Date(booking.scheduledAt).toLocaleDateString()} ${new Date(booking.scheduledAt).toLocaleTimeString().slice(0,5)}` : booking?.createdAt ? new Date(booking.createdAt).toLocaleString() : ''}</p>
                </div>
              </div>
            </div>

            <Separator className="my-6" />

            {/* Earnings Breakdown */}
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">{t("baseFare")}</span>
                <span className="font-semibold">{baseFare ? `${baseFare.toLocaleString()} VND` : '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">{t("tollFee")}</span>
                <span className="font-semibold">{tollFee ? `${tollFee.toLocaleString()} VND` : '0 VND'}</span>
              </div>
              <div className="flex justify-between bg-green-50 px-2 py-1 rounded">
                <span className="text-gray-600 font-semibold">{t("tip")}</span>
                <span className="font-bold text-green-600">{tip ? `+${tip.toLocaleString()} VND` : '0 VND'}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-gray-600">{t("subtotal")}</span>
                <span className="font-semibold">{totalWithTip ? `${totalWithTip.toLocaleString()} VND` : '-'}</span>
              </div>
              <div className="flex justify-between text-red-600">
                <span>{t("commission")} (20%)</span>
                <span className="font-semibold">-{commission ? `${commission.toLocaleString()} VND` : '-'}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-lg">
                <span className="font-bold">{t("yourEarnings")}</span>
                <span className="font-bold text-green-600">{yourEarnings ? `${yourEarnings.toLocaleString()} VND` : '-'}</span>
              </div>
            </div>
          </Card>

          {/* Customer Info */}
          <Card className="p-6 mb-6">
            <div className="flex items-center gap-4 mb-4">
              <Avatar>
                {(() => {
                  try {
                    const avatarUrl = booking?.customerSnapshotJson ? JSON.parse(booking.customerSnapshotJson).avatarUrl : booking?.user?.avatarUrl;
                    return avatarUrl ? <AvatarImage src={avatarUrl} alt="customer avatar" /> : <AvatarFallback>{(booking?.user?.fullName || "?").slice(0,1)}</AvatarFallback>;
                  } catch (e) {
                    return <AvatarFallback>{(booking?.user?.fullName || "?").slice(0,1)}</AvatarFallback>;
                  }
                })()}
              </Avatar>
              <div>
                <h4 className="font-semibold mb-1">{booking?.customerSnapshotJson ? JSON.parse(booking.customerSnapshotJson).fullName : booking?.user?.fullName || '-'}</h4>
                {booking?.ride?.rating ? (
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-gray-800">{booking.ride.rating.score}</span>
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  </div>
                ) : (
                  <p className="text-sm text-gray-600">{t("waitingForRating")}</p>
                )}
              </div>
            </div>
            
            {booking?.ride?.rating && (
              <div className="bg-gray-50 p-4 rounded-lg">
                {booking.ride.rating.comment && (
                  <p className="text-gray-700 italic mb-2">"{booking.ride.rating.comment}"</p>
                )}
                {booking.ride.rating.compliments && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {(() => {
                      try {
                        const comps = JSON.parse(booking.ride.rating.compliments);
                        if (Array.isArray(comps)) {
                          return comps.map((c: string) => (
                            <span key={c} className="text-xs bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-semibold">
                              {c}
                            </span>
                          ));
                        }
                      } catch (e) {}
                      return null;
                    })()}
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button
              onClick={() => navigate("/driver/home")}
              className="w-full h-12 bg-black hover:bg-gray-800 text-white"
            >
              {t("returnHome")}
            </Button>
            <Button
              onClick={() => navigate("/driver/income")}
              variant="outline"
              className="w-full h-12"
            >
              {t("viewIncomeManagement")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}