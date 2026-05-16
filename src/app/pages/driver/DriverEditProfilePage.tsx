import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Header } from "../../components/Header";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import { Checkbox } from "../../components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Camera, ArrowLeft, Upload } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../services/api";

export default function DriverEditProfilePage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    firstName: "Thanh",
    lastName: "Nguyen",
    email: "nguyen.thanh@email.com",
    phone: "+84 987 654 321",
    address: "456 Le Loi St, Hanoi",
    city: "Hanoi",
    country: "Vietnam",
    vehicleModel: "Toyota Vios",
    vehiclePlate: "30A-12345",
    vehicleYear: "2022",
    vehicleColor: "white",
  });

  const [languages, setLanguages] = useState({
    japanese: true,
    english: false,
    vietnamese: true,
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await api.getDriverProfile();
        const data = response.data;
        if (data) {
          const names = data.user?.fullName?.split(" ") || ["", ""];
          setFormData({
            ...formData,
            firstName: names[0] || "",
            lastName: names.slice(1).join(" ") || "",
            email: data.user?.email || formData.email,
            phone: data.user?.phone || formData.phone,
            vehicleModel: data.driverProfile?.vehicleModel || formData.vehicleModel,
            vehiclePlate: data.driverProfile?.vehiclePlate || formData.vehiclePlate,
            vehicleColor: data.driverProfile?.vehicleColor || formData.vehicleColor,
          });
        }
      } catch (error) {
        console.error("Failed to fetch driver profile:", error);
      }
    };
    fetchProfile();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.id]: e.target.value,
    });
  };

  const handleSave = async () => {
    try {
      await api.updateDriverProfile({
        ...formData,
        user: {
          fullName: `${formData.firstName} ${formData.lastName}`.trim(),
          phone: formData.phone,
        }
      });
      toast.success("プロフィールが更新されました");
      navigate("/driver/profile");
    } catch (error) {
      toast.error("プロフィールの更新に失敗しました");
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header type="driver" />

      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-2xl mx-auto">
          {/* Back Button */}
          <Button
            variant="ghost"
            onClick={() => navigate("/driver/profile")}
            className="mb-6 gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            戻る
          </Button>

          <h1 className="text-3xl font-bold mb-6">プロフィール編集</h1>

          {/* Profile Photo */}
          <Card className="p-6 mb-6">
            <h3 className="font-semibold mb-4">プロフィール写真</h3>
            <div className="flex items-center gap-6">
              <div className="relative">
                <Avatar className="h-24 w-24">
                  <AvatarImage src="https://i.pravatar.cc/150?img=12" />
                  <AvatarFallback>NT</AvatarFallback>
                </Avatar>
                <button className="absolute bottom-0 right-0 bg-black text-white p-2 rounded-full hover:bg-gray-800">
                  <Camera className="h-4 w-4" />
                </button>
              </div>
              <div>
                <Button variant="outline" className="mb-2">
                  写真を変更
                </Button>
                <p className="text-sm text-gray-600">JPG、PNG、最大5MB</p>
              </div>
            </div>
          </Card>

          {/* Personal Information */}
          <Card className="p-6 mb-6">
            <h3 className="font-semibold mb-4">個人情報</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">名</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">姓</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">メールアドレス</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">電話番号</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleChange}
                />
              </div>
            </div>
          </Card>

          {/* Address Information */}
          <Card className="p-6 mb-6">
            <h3 className="font-semibold mb-4">住所情報</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="address">住所</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={handleChange}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">市</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">国</Label>
                  <Input
                    id="country"
                    value={formData.country}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Vehicle Information */}
          <Card className="p-6 mb-6">
            <h3 className="font-semibold mb-4">車両情報</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="vehicleModel">車種</Label>
                <Input
                  id="vehicleModel"
                  value={formData.vehicleModel}
                  onChange={handleChange}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="vehiclePlate">ナンバープレート</Label>
                  <Input
                    id="vehiclePlate"
                    value={formData.vehiclePlate}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vehicleYear">年式</Label>
                  <Input
                    id="vehicleYear"
                    value={formData.vehicleYear}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="vehicleColor">車の色</Label>
                <Select value={formData.vehicleColor}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="white">白</SelectItem>
                    <SelectItem value="black">黒</SelectItem>
                    <SelectItem value="silver">シルバー</SelectItem>
                    <SelectItem value="blue">青</SelectItem>
                    <SelectItem value="red">赤</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>車両写真</Label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 cursor-pointer">
                  <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm text-gray-600">クリックしてアップロード</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Language Skills */}
          <Card className="p-6 mb-6">
            <h3 className="font-semibold mb-4">言語能力</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="japanese"
                  checked={languages.japanese}
                  onCheckedChange={(checked) =>
                    setLanguages({ ...languages, japanese: checked as boolean })
                  }
                />
                <label htmlFor="japanese" className="text-sm font-medium cursor-pointer">
                  日本語
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="english"
                  checked={languages.english}
                  onCheckedChange={(checked) =>
                    setLanguages({ ...languages, english: checked as boolean })
                  }
                />
                <label htmlFor="english" className="text-sm font-medium cursor-pointer">
                  英語
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="vietnamese"
                  checked={languages.vietnamese}
                  onCheckedChange={(checked) =>
                    setLanguages({ ...languages, vietnamese: checked as boolean })
                  }
                />
                <label htmlFor="vietnamese" className="text-sm font-medium cursor-pointer">
                  ベトナム語
                </label>
              </div>
            </div>
          </Card>

          {/* Password Change */}
          <Card className="p-6 mb-6">
            <h3 className="font-semibold mb-4">パスワード変更</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">現在のパスワード</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  placeholder="現在のパスワードを入力"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">新しいパスワード</Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="新しいパスワードを入力"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">パスワード確認</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="パスワードを再入力"
                />
              </div>
            </div>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={handleSave}
              className="flex-1 h-12 bg-black hover:bg-gray-800 text-white"
            >
              変更を保存
            </Button>
            <Button
              onClick={() => navigate("/driver/profile")}
              variant="outline"
              className="flex-1 h-12"
            >
              キャンセル
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
