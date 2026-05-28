import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Header } from "../../components/Header";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff, ArrowLeft, Send, Star, Languages, Loader2 } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";
import { api } from "../../services/api";
import { translateViJa } from "../../services/translate";
import { useRideChat } from "../../hooks/useRideChat";

export default function DriverMessageCallPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useLanguage();
  const bookingIdParam = Number(searchParams.get("bookingId") || 0);
  const [bookingId, setBookingId] = useState(bookingIdParam);

  const [message, setMessage] = useState("");
  const [isCalling, setIsCalling] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isMicEnabled, setIsMicEnabled] = useState(true);
  const [showTranslation, setShowTranslation] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [currentRide, setCurrentRide] = useState<any | null>(null);

  useEffect(() => {
    if (bookingIdParam > 0) {
      setBookingId(bookingIdParam);
      return;
    }
    api
      .getDriverAcceptedRides()
      .then((rides) => {
        if (Array.isArray(rides) && rides.length > 0) {
          setBookingId(Number(rides[0].id));
        }
      })
      .catch((err) => console.error("Failed to fetch accepted rides", err));
  }, [bookingIdParam]);

  const {
    messages,
    sendMessage,
    connected,
    loading: chatLoading,
    error: chatError,
    setMessages,
    applyTranslations
  } = useRideChat(bookingId, { enabled: bookingId > 0 });

  useEffect(() => {
    if (!bookingId) return;
    api
      .getBookingWithRide(bookingId)
      .then((res) => {
        const data = (res as { data?: unknown }).data || res;
        const b = data as Record<string, unknown>;
        setCurrentRide({
          customerName: (b.user as { fullName?: string })?.fullName,
          customerAvatar: (b.user as { avatarUrl?: string })?.avatarUrl,
          customerRating: (b.user as { averageRating?: number })?.averageRating
        });
      })
      .catch(() => {
        api.getDriverAcceptedRides().then((rides) => {
          const match = rides?.find((r: { id: string }) => Number(r.id) === bookingId);
          if (match) setCurrentRide(match);
        });
      });
  }, [bookingId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const ensureTranslations = async () => {
    const pending = messages.filter((m) => !m.translated);
    if (pending.length === 0) return;
    const translatedTexts = await Promise.all(pending.map((m) => translateViJa(m.text)));
    const lookup = new Map<number, string>();
    pending.forEach((m, idx) => lookup.set(m.id, translatedTexts[idx]));
    applyTranslations(lookup);
  };

  const handleToggleTranslation = async () => {
    const next = !showTranslation;
    setShowTranslation(next);
    if (next) {
      setIsTranslating(true);
      try {
        await ensureTranslations();
      } finally {
        setIsTranslating(false);
      }
    }
  };

  const handleSendMessage = async () => {
    const body = message.trim();
    if (!body || !connected) return;
    try {
      await sendMessage(body);
      setMessage("");
      if (showTranslation) {
        setIsTranslating(true);
        try {
          const translated = await translateViJa(body);
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (!last || last.text !== body) return prev;
            return prev.map((m, i) => (i === prev.length - 1 ? { ...m, translated } : m));
          });
        } finally {
          setIsTranslating(false);
        }
      }
    } catch (err) {
      console.error("Send failed:", err);
    }
  };

  const backUrl = bookingId
    ? `/driver/ride-info?bookingId=${bookingId}`
    : "/driver/ride-info";

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header type="driver" />

      <div className="flex-1 flex flex-col">
        <div className="p-4 border-b">
          <Button variant="ghost" onClick={() => navigate(backUrl)} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            {t("backToRide")}
          </Button>
        </div>

        <div className="p-6 border-b">
          <div className="max-w-4xl mx-auto flex items-center gap-4">
            <Avatar className="h-16 w-16">
              {currentRide?.customerAvatar ? (
                <AvatarImage src={currentRide.customerAvatar} />
              ) : null}
              <AvatarFallback>
                {currentRide?.customerName ? currentRide.customerName.split(" ")[0] : "?"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-bold text-lg">{currentRide?.customerName || t("customer")}</h3>
                {currentRide?.customerRating != null && (
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-semibold">{currentRide.customerRating}</span>
                  </div>
                )}
              </div>
              <p className="text-gray-600">{t("customer")}</p>
              {connected && (
                <p className="text-xs text-green-600 mt-1">● {t("chatConnected")}</p>
              )}
            </div>
          </div>
        </div>

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

            <TabsContent value="message" className="flex-1 flex flex-col m-0">
              <div className="flex-1 overflow-auto p-6">
                <div className="max-w-4xl mx-auto">
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

                  {chatLoading && (
                    <div className="flex justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                    </div>
                  )}
                  {chatError && (
                    <p className="text-sm text-red-600 text-center mb-4">{chatError}</p>
                  )}

                  <div className="space-y-4">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.sender === "self" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-md p-4 rounded-2xl ${
                            msg.sender === "self"
                              ? "bg-black text-white"
                              : "bg-gray-100 text-gray-900"
                          }`}
                        >
                          <p>{msg.text}</p>
                          {showTranslation && (
                            <p
                              className={`text-sm mt-2 pt-2 border-t italic ${
                                msg.sender === "self" ? "border-gray-700" : "border-gray-300"
                              }`}
                            >
                              {msg.translated ?? t("translating")}
                            </p>
                          )}
                          <p
                            className={`text-xs mt-1 ${
                              msg.sender === "self" ? "text-gray-300" : "text-gray-500"
                            }`}
                          >
                            {msg.time}
                          </p>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                </div>
              </div>

              <div className="border-t p-4">
                <div className="max-w-4xl mx-auto flex gap-3">
                  <Input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                    placeholder={t("typeMessage")}
                    className="h-12"
                    disabled={!connected || chatLoading}
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!connected || chatLoading || !message.trim()}
                    className="h-12 px-6 bg-black hover:bg-gray-800 text-white"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="call" className="flex-1 flex items-center justify-center m-0">
              <div className="max-w-md w-full p-6">
                <Card className="p-8 text-center">
                  <Avatar className="h-32 w-32 mx-auto mb-6">
                    {currentRide?.customerAvatar ? (
                      <AvatarImage src={currentRide.customerAvatar} />
                    ) : null}
                    <AvatarFallback>?</AvatarFallback>
                  </Avatar>
                  <h2 className="text-2xl font-bold mb-2">
                    {currentRide?.customerName || t("customer")}
                  </h2>
                  <p className="text-gray-600 mb-8">
                    {isCalling ? t("inCall") : t("tapToStartCall")}
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
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="video" className="flex-1 flex items-center justify-center m-0 bg-gray-900">
              <div className="w-full h-full relative min-h-[400px] flex items-center justify-center">
                {!isCalling ? (
                  <Button
                    onClick={() => setIsCalling(true)}
                    className="h-16 w-16 rounded-full bg-green-500 hover:bg-green-600"
                  >
                    <Video className="h-6 w-6" />
                  </Button>
                ) : (
                  <div className="absolute bottom-8 flex gap-4">
                    <Button
                      onClick={() => setIsVideoEnabled(!isVideoEnabled)}
                      variant="outline"
                      className="h-14 w-14 rounded-full"
                    >
                      {isVideoEnabled ? <Video className="h-6 w-6" /> : <VideoOff className="h-6 w-6" />}
                    </Button>
                    <Button
                      onClick={() => setIsCalling(false)}
                      className="h-14 w-14 rounded-full bg-red-500 hover:bg-red-600"
                    >
                      <PhoneOff className="h-6 w-6" />
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
