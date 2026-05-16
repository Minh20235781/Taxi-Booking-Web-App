import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { io } from "socket.io-client";
import { ArrowLeft, Languages, Mic, MicOff, Phone, PhoneOff, Send, Star, Video, VideoOff } from "lucide-react";
import { Header } from "../../components/Header";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { useLanguage } from "../../contexts/LanguageContext";
import { api, API_BASE_URL } from "../../services/api";
import type { RideMessage } from "../../services/api";

function getAuthUserId() {
  try {
    const authUser = JSON.parse(localStorage.getItem("auth_user") || "{}");
    return Number(authUser.id) || null;
  } catch {
    return null;
  }
}

function getActiveRideId() {
  return 1;
}

function formatMessageTime(createdAt: string) {
  return new Date(createdAt).toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

export default function DriverMessageCallPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [message, setMessage] = useState("");
  const [isCalling, setIsCalling] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isMicEnabled, setIsMicEnabled] = useState(true);
  const [showTranslation, setShowTranslation] = useState(false);
  const [messages, setMessages] = useState<RideMessage[]>([]);
  const socketRef = useRef<ReturnType<typeof io> | null>(null);
  const rideId = useMemo(() => getActiveRideId(), []);
  const userId = useMemo(() => getAuthUserId(), []);

  useEffect(() => {
    if (!rideId || !userId) {
      navigate("/driver/ride-info", { replace: true });
      return;
    }

    let isMounted = true;
    const socket = io(API_BASE_URL, {
      transports: ["websocket", "polling"]
    });
    socketRef.current = socket;

    api
      .getRideMessages(rideId)
      .then(({ messages }) => {
        if (isMounted) {
          setMessages(messages);
        }
      })
      .catch(() => {
        if (isMounted) {
          navigate("/driver/ride-info", { replace: true });
        }
      });

    socket.emit("join_ride", { rideId });
    socket.on("new_message", (newMessage: RideMessage) => {
      if (newMessage.rideId !== rideId) {
        return;
      }
      setMessages((current) =>
        current.some((item) => item.id === newMessage.id) ? current : [...current, newMessage]
      );
    });

    return () => {
      isMounted = false;
      socket.disconnect();
      socketRef.current = null;
    };
  }, [navigate, rideId, userId]);

  const handleSendMessage = () => {
    const body = message.trim();
    if (!body || !rideId || !userId) {
      return;
    }
    socketRef.current?.emit("send_message", {
      rideId,
      senderUserId: userId,
      senderRole: "DRIVER",
      body
    });
    setMessage("");
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header type="driver" />

      <div className="flex-1 flex flex-col">
        <div className="p-4 border-b">
          <Button variant="ghost" onClick={() => navigate("/driver/ride-info")} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to ride
          </Button>
        </div>

        <div className="p-6 border-b">
          <div className="max-w-4xl mx-auto flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src="https://i.pravatar.cc/150?img=33" />
              <AvatarFallback>CU</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-bold text-lg">Customer</h3>
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-semibold">4.8</span>
                </div>
              </div>
              <p className="text-gray-600">Passenger</p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="message" className="flex-1 flex flex-col">
          <div className="border-b">
            <div className="max-w-4xl mx-auto px-6">
              <TabsList className="grid w-96 grid-cols-3">
                <TabsTrigger value="message">{t("message")}</TabsTrigger>
                <TabsTrigger value="call">Call</TabsTrigger>
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
                    onClick={() => setShowTranslation(!showTranslation)}
                    className="gap-2"
                  >
                    <Languages className="h-4 w-4" />
                    {t("translate")}
                  </Button>
                </div>

                <div className="space-y-4">
                  {messages.map((msg) => {
                    const isOwnMessage = msg.senderRole === "DRIVER";
                    return (
                      <div key={msg.id} className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-md p-4 rounded-2xl ${
                            isOwnMessage ? "bg-black text-white" : "bg-gray-100 text-gray-900"
                          }`}
                        >
                          <p>{msg.body}</p>
                          {showTranslation && (
                            <p className={`text-sm mt-2 pt-2 border-t ${isOwnMessage ? "border-gray-700" : "border-gray-300"}`}>
                              {msg.translatedBody || "Translation unavailable"}
                            </p>
                          )}
                          <p className={`text-xs mt-1 ${isOwnMessage ? "text-gray-300" : "text-gray-500"}`}>
                            {formatMessageTime(msg.createdAt)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="border-t p-4">
              <div className="max-w-4xl mx-auto flex gap-3">
                <Input
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  onKeyDown={(event) => event.key === "Enter" && handleSendMessage()}
                  placeholder="Type a message..."
                  className="h-12"
                />
                <Button onClick={handleSendMessage} className="h-12 px-6 bg-black hover:bg-gray-800 text-white">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="call" className="flex-1 flex items-center justify-center m-0">
            <div className="max-w-md w-full p-6">
              <Card className="p-8 text-center">
                <Avatar className="h-32 w-32 mx-auto mb-6">
                  <AvatarImage src="https://i.pravatar.cc/150?img=33" />
                  <AvatarFallback>CU</AvatarFallback>
                </Avatar>
                <h2 className="text-2xl font-bold mb-2">Customer</h2>
                <p className="text-gray-600 mb-8">{isCalling ? "Calling..." : "Tap to start call"}</p>
                <div className="flex justify-center gap-4">
                  {!isCalling ? (
                    <Button onClick={() => setIsCalling(true)} className="h-16 w-16 rounded-full bg-green-500 hover:bg-green-600">
                      <Phone className="h-6 w-6" />
                    </Button>
                  ) : (
                    <>
                      <Button onClick={() => setIsMicEnabled(!isMicEnabled)} variant="outline" className="h-16 w-16 rounded-full">
                        {isMicEnabled ? <Mic className="h-6 w-6" /> : <MicOff className="h-6 w-6" />}
                      </Button>
                      <Button onClick={() => setIsCalling(false)} className="h-16 w-16 rounded-full bg-red-500 hover:bg-red-600">
                        <PhoneOff className="h-6 w-6" />
                      </Button>
                    </>
                  )}
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="video" className="flex-1 flex items-center justify-center m-0 bg-gray-900">
            <div className="text-center">
              <Avatar className="h-32 w-32 mx-auto mb-6">
                <AvatarImage src="https://i.pravatar.cc/150?img=33" />
                <AvatarFallback>CU</AvatarFallback>
              </Avatar>
              <h2 className="text-2xl font-bold mb-2 text-white">Customer</h2>
              <p className="text-gray-400 mb-8">{isCalling ? "Video call in progress" : "Start video call"}</p>
              <div className="flex justify-center gap-4">
                <Button onClick={() => setIsMicEnabled(!isMicEnabled)} variant="outline" className="h-14 w-14 rounded-full bg-white">
                  {isMicEnabled ? <Mic className="h-6 w-6" /> : <MicOff className="h-6 w-6" />}
                </Button>
                <Button onClick={() => setIsVideoEnabled(!isVideoEnabled)} variant="outline" className="h-14 w-14 rounded-full bg-white">
                  {isVideoEnabled ? <Video className="h-6 w-6" /> : <VideoOff className="h-6 w-6" />}
                </Button>
                <Button onClick={() => setIsCalling(!isCalling)} className={`h-14 w-14 rounded-full ${isCalling ? "bg-red-500 hover:bg-red-600" : "bg-green-500 hover:bg-green-600"}`}>
                  {isCalling ? <PhoneOff className="h-6 w-6" /> : <Video className="h-6 w-6" />}
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
