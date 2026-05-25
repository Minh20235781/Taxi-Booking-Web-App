import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Header } from "../../components/Header";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff, ArrowLeft, Send, Star, Languages } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";
import { api } from "../../services/api";
import { getBookingFlowDraft } from "../../services/bookingFlow";
import { translateViJa } from "../../services/translate";

export default function UserMessageCallPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [message, setMessage] = useState("");
  const [isCalling, setIsCalling] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isMicEnabled, setIsMicEnabled] = useState(true);
  const [showTranslation, setShowTranslation] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  type ChatMessage = { id: number; sender: "user" | "driver"; text: string; translated: string | null; time: string };
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 1, sender: "driver", text: "こんにちは、もうすぐ到着します", translated: null, time: "14:30" },
    { id: 2, sender: "user", text: "Tôi đã hiểu, cảm ơn anh", translated: null, time: "14:31" },
    { id: 3, sender: "driver", text: "建物の前に停車しています", translated: null, time: "14:35" },
  ]);

  const ensureTranslations = async (list: ChatMessage[]): Promise<ChatMessage[]> => {
    const pending = list.filter((m) => !m.translated);
    if (pending.length === 0) return list;
    const translatedTexts = await Promise.all(pending.map((m) => translateViJa(m.text)));
    const lookup = new Map<number, string>();
    pending.forEach((m, idx) => lookup.set(m.id, translatedTexts[idx]));
    return list.map((m) => (lookup.has(m.id) ? { ...m, translated: lookup.get(m.id) ?? null } : m));
  };

  const handleToggleTranslation = async () => {
    const next = !showTranslation;
    setShowTranslation(next);
    if (next) {
      setIsTranslating(true);
      try {
        const updated = await ensureTranslations(messages);
        setMessages(updated);
      } finally {
        setIsTranslating(false);
      }
    }
  };

  const handleSendMessage = async () => {
    const body = message.trim();
    if (!body) return;
    const newMsg: ChatMessage = {
      id: messages.length + 1,
      sender: "user",
      text: body,
      translated: null,
      time: new Date().toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages((prev) => [...prev, newMsg]);
    setMessage("");
    if (showTranslation) {
      setIsTranslating(true);
      try {
        const translated = await translateViJa(body);
        setMessages((prev) => prev.map((m) => (m.id === newMsg.id ? { ...m, translated } : m)));
      } finally {
        setIsTranslating(false);
      }
    }
  };

  const [bookingWithRide, setBookingWithRide] = useState<any | null>(null);
  const draft = getBookingFlowDraft();

  useEffect(() => {
    const bookingId = draft.bookingId;
    if (!bookingId) return;
    api.getBookingWithRide(bookingId)
      .then((res) => {
        const data = res.data || res;
        setBookingWithRide(data);
      })
      .catch((err) => console.error("Failed to fetch booking with ride:", err));
  }, [draft.bookingId]);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header type="user" />

      <div className="flex-1 flex flex-col">
        {/* Back Button */}
        <div className="p-4 border-b">
          <Button
            variant="ghost"
            onClick={() => navigate("/user/ride")}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("backToRide")}
          </Button>
        </div>

        {/* Driver Info */}
        <div className="p-6 border-b">
          <div className="max-w-4xl mx-auto flex items-center gap-4">
            <Avatar className="h-16 w-16">
              {bookingWithRide?.ride?.driver?.user?.avatarUrl ? (
                <AvatarImage src={bookingWithRide.ride.driver.user.avatarUrl} />
              ) : null}
              <AvatarFallback>
                {(
                  (bookingWithRide?.ride?.driver?.user?.fullName || "")
                    .split(" ")
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((p: string) => p[0])
                    .join("") || "--"
                )}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-bold text-lg">{bookingWithRide?.ride?.driver?.user?.fullName || "--"}</h3>
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-semibold">{bookingWithRide?.ride?.driver?.averageRating ?? ""}</span>
                </div>
              </div>
              <p className="text-gray-600">{(bookingWithRide?.ride?.driver?.vehicleModel || "")} • {(bookingWithRide?.ride?.driver?.vehiclePlate || "")}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex-1 flex flex-col">
          <Tabs defaultValue="message" className="flex-1 flex flex-col">
            <div className="border-b">
              <div className="max-w-4xl mx-auto px-6">
                <TabsList className="grid w-96 grid-cols-3">
                  <TabsTrigger value="message">{t("message")}</TabsTrigger>
                  <TabsTrigger value="call">{t("call")}</TabsTrigger>
                  <TabsTrigger value="video">{t("videoCall")}</TabsTrigger>
                </TabsList>
              </div>
            </div>

            {/* Message Tab */}
            <TabsContent value="message" className="flex-1 flex flex-col m-0">
              <div className="flex-1 overflow-auto p-6">
                <div className="max-w-4xl mx-auto">
                  {/* Translation Toggle */}
                  <div className="flex justify-end mb-4">
                    <Button
                      variant={showTranslation ? "default" : "outline"}
                      size="sm"
                      onClick={handleToggleTranslation}
                      disabled={isTranslating}
                      className="gap-2"
                    >
                      <Languages className="h-4 w-4" />
                      {isTranslating ? t("translating") : t("translate")}
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-md p-4 rounded-2xl ${
                            msg.sender === "user"
                              ? "bg-black text-white"
                              : "bg-gray-100 text-gray-900"
                          }`}
                        >
                          <p>{msg.text}</p>
                          {showTranslation && (
                            <p className={`text-sm mt-2 pt-2 border-t italic ${
                              msg.sender === "user" ? "border-gray-700" : "border-gray-300"
                            }`}>
                              {msg.translated ?? t("translating")}
                            </p>
                          )}
                          <p className={`text-xs mt-1 ${
                            msg.sender === "user" ? "text-gray-300" : "text-gray-500"
                          }`}>
                            {msg.time}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Message Input */}
              <div className="border-t p-4">
                <div className="max-w-4xl mx-auto flex gap-3">
                  <Input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                    placeholder={t("typeMessage")}
                    className="h-12"
                  />
                  <Button
                    onClick={handleSendMessage}
                    className="h-12 px-6 bg-black hover:bg-gray-800 text-white"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* Audio Call Tab */}
            <TabsContent value="call" className="flex-1 flex items-center justify-center m-0">
              <div className="max-w-md w-full p-6">
                <Card className="p-8 text-center">
                  <Avatar className="h-32 w-32 mx-auto mb-6">
                    {bookingWithRide?.ride?.driver?.user?.avatarUrl ? (
                      <AvatarImage src={bookingWithRide.ride.driver.user.avatarUrl} />
                    ) : null}
                    <AvatarFallback>
                      {(
                        (bookingWithRide?.ride?.driver?.user?.fullName || "")
                          .split(" ")
                          .filter(Boolean)
                          .slice(0, 2)
                          .map((p: string) => p[0])
                          .join("") || "NT"
                      )}
                    </AvatarFallback>
                  </Avatar>
                  
                  <h2 className="text-2xl font-bold mb-2">{bookingWithRide?.ride?.driver?.user?.fullName || "--"}</h2>
                  <p className="text-gray-600 mb-1">{bookingWithRide?.ride?.driver?.vehicleModel || ""} • {bookingWithRide?.ride?.driver?.vehiclePlate || ""}</p>
                  <p className="text-gray-600 mb-8">
                    {isCalling ? t("calling") || "Calling..." : t("tapToStartCall") || "Tap to start call"}
                  </p>

                  <div className="flex justify-center gap-4">
                    {!isCalling ? (
                      <Button
                        onClick={() => setIsCalling(true)}
                        className="h-16 w-16 rounded-full bg-green-500 hover:bg-green-600"
                      >
                        <Phone className="h-6 w-6" />
                      </Button>
                    ) : (
                      <>
                        <Button
                          onClick={() => setIsMicEnabled(!isMicEnabled)}
                          variant="outline"
                          className="h-16 w-16 rounded-full"
                        >
                          {isMicEnabled ? <Mic className="h-6 w-6" /> : <MicOff className="h-6 w-6" />}
                        </Button>
                        <Button
                          onClick={() => setIsCalling(false)}
                          className="h-16 w-16 rounded-full bg-red-500 hover:bg-red-600"
                        >
                          <PhoneOff className="h-6 w-6" />
                        </Button>
                      </>
                    )}
                  </div>

                  {isCalling && (
                    <div className="mt-8 p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600">通話時間: 00:45</p>
                    </div>
                  )}

                  <div className="mt-8 text-sm text-gray-500">
                    <p>{t("callMayBeRecorded") || "This call may be recorded"}</p>
                  </div>
                </Card>
              </div>
            </TabsContent>

            {/* Video Call Tab */}
            <TabsContent value="video" className="flex-1 flex items-center justify-center m-0 bg-gray-900">
              <div className="w-full h-full relative">
                {!isCalling ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <Avatar className="h-32 w-32 mx-auto mb-6">
                        {bookingWithRide?.ride?.driver?.user?.avatarUrl ? (
                          <AvatarImage src={bookingWithRide.ride.driver.user.avatarUrl} />
                        ) : null}
                        <AvatarFallback>
                          {(
                            (bookingWithRide?.ride?.driver?.user?.fullName || "")
                              .split(" ")
                              .filter(Boolean)
                              .slice(0, 2)
                              .map((p: string) => p[0])
                              .join("") || "NT"
                          )}
                        </AvatarFallback>
                      </Avatar>
                      <h2 className="text-2xl font-bold mb-2 text-white">{bookingWithRide?.ride?.driver?.user?.fullName || "--"}</h2>
                      <p className="text-gray-400 mb-1">{bookingWithRide?.ride?.driver?.vehicleModel || ""} • {bookingWithRide?.ride?.driver?.vehiclePlate || ""}</p>
                      <p className="text-gray-400 mb-8">{t("startVideoCall") || "Start Video Call"}</p>
                      <Button
                        onClick={() => setIsCalling(true)}
                        className="h-16 w-16 rounded-full bg-green-500 hover:bg-green-600"
                      >
                        <Video className="h-6 w-6" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Main Video (Driver) */}
                    <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                      <div className="text-center">
                          <Avatar className="h-48 w-48 mx-auto mb-4">
                            {bookingWithRide?.ride?.driver?.user?.avatarUrl ? (
                              <AvatarImage src={bookingWithRide.ride.driver.user.avatarUrl} />
                            ) : null}
                            <AvatarFallback>
                              {(
                                (bookingWithRide?.ride?.driver?.user?.fullName || "")
                                  .split(" ")
                                  .filter(Boolean)
                                  .slice(0, 2)
                                  .map((p: string) => p[0])
                                  .join("") || "NT"
                              )}
                            </AvatarFallback>
                          </Avatar>
                          <p className="text-white text-lg">{bookingWithRide?.ride?.driver?.user?.fullName || "--"}</p>
                      </div>
                    </div>

                    {/* Your Video (Picture-in-Picture) */}
                    <div className="absolute top-4 right-4 w-48 h-36 bg-gray-700 rounded-lg border-2 border-white flex items-center justify-center">
                      <Avatar className="h-20 w-20">
                        <AvatarFallback>You</AvatarFallback>
                      </Avatar>
                    </div>

                    {/* Call Timer */}
                    <div className="absolute top-4 left-4 bg-black/50 text-white px-4 py-2 rounded-full">
                      <p className="text-sm font-semibold">01:23</p>
                    </div>

                    {/* Call Controls */}
                    <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex gap-4">
                      <Button
                        onClick={() => setIsMicEnabled(!isMicEnabled)}
                        variant="outline"
                        className={`h-14 w-14 rounded-full ${
                          !isMicEnabled ? "bg-red-500 text-white hover:bg-red-600" : "bg-white"
                        }`}
                      >
                        {isMicEnabled ? <Mic className="h-6 w-6" /> : <MicOff className="h-6 w-6" />}
                      </Button>
                      
                      <Button
                        onClick={() => setIsVideoEnabled(!isVideoEnabled)}
                        variant="outline"
                        className={`h-14 w-14 rounded-full ${
                          !isVideoEnabled ? "bg-red-500 text-white hover:bg-red-600" : "bg-white"
                        }`}
                      >
                        {isVideoEnabled ? <Video className="h-6 w-6" /> : <VideoOff className="h-6 w-6" />}
                      </Button>

                      <Button
                        onClick={() => {
                          setIsCalling(false);
                          setIsVideoEnabled(true);
                          setIsMicEnabled(true);
                        }}
                        className="h-14 w-14 rounded-full bg-red-500 hover:bg-red-600"
                      >
                        <PhoneOff className="h-6 w-6" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}