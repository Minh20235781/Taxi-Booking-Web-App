import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { Header } from "../../components/Header";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import { Checkbox } from "../../components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Camera, ArrowLeft, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../services/api";
import { useLanguage } from "../../contexts/LanguageContext";

export default function DriverEditProfilePage() {
  const navigate = useNavigate();
  const { t } = useLanguage(); // Sử dụng hook chuyển ngữ để hỗ trợ đa ngôn ngữ (EN / JA / VI)
  const [loading, setLoading] = useState(true);
  
  // Ref điều khiển thẻ input file ẩn
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const vehiclePhotoInputRef = useRef<HTMLInputElement>(null);

  // Khởi tạo trạng thái dữ liệu trống ban đầu
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    country: "",
    vehicleModel: "",
    vehiclePlate: "",
    vehicleYear: "",
    vehicleColor: "white",
    avatarUrl: "",
  });

  // Quản lý ảnh xe cục bộ (vì chưa có trường cụ thể trong Prisma nhưng cần nâng cấp UI/UX xem trước)
  const [vehiclePhotoUrl, setVehiclePhotoUrl] = useState<string>("");

  const [languages, setLanguages] = useState({
    japanese: false,
    english: false,
    vietnamese: false,
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await api.getDriverProfile();
        const data = response.data || response;
        if (data) {
          const user = data.user || {};
          const driverProfile = data.driverProfile || {};

          // Phân tách fullName thành firstName & lastName an toàn để điền vào các trường Input
          const names = user.fullName ? user.fullName.trim().split(" ") : ["", ""];
          let fName = "";
          let lName = "";
          if (names.length > 1) {
            fName = names[0];
            lName = names.slice(1).join(" ");
          } else {
            fName = names[0] || "";
          }

          setFormData({
            firstName: fName,
            lastName: lName,
            email: user.email || "",
            phone: user.phone || "",
            address: user.address || "",
            city: user.city || "",
            country: user.country || "",
            vehicleModel: driverProfile.vehicleModel || "",
            vehiclePlate: driverProfile.vehiclePlate || "",
            vehicleYear: driverProfile.vehicleYear || "",
            vehicleColor: driverProfile.vehicleColor || "white",
            avatarUrl: user.avatarUrl || "",
          });

          // Giải mã chuỗi ngôn ngữ từ DB (Ví dụ: "japanese,english") thành các trạng thái checkbox Boolean
          const langString = driverProfile.languages || "";
          setLanguages({
            japanese: langString.toLowerCase().includes("japanese"),
            english: langString.toLowerCase().includes("english"),
            vietnamese: langString.toLowerCase().includes("vietnamese"),
          });
        }
      } catch (error) {
        console.error("Failed to fetch driver profile:", error);
        toast.error(t("errorFetchProfile") || "プロフィールの取得に失敗しました");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [t]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.id]: e.target.value,
    });
  };

  // Hàm xử lý kiểm tra file và tạo link blob URL để xem trước ảnh (Avatar)
  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Kiểm tra định dạng hợp lệ (JPG, PNG)
    if (!["image/jpeg", "image/png"].includes(file.type)) {
      toast.error(t("invalidImageType") || "JPGまたはPNG形式 của ảnh không hợp lệ");
      return;
    }

    // Kiểm tra dung lượng tối đa 5MB (5 * 1024 * 1024 bytes)
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t("fileTooLarge") || "ファイルサイズは tối đa 5MB までです");
      return;
    }

    const localPreviewUrl = URL.createObjectURL(file);
    setFormData((prev) => ({ ...prev, avatarUrl: localPreviewUrl }));
    toast.success(t("avatarSelected") || "アバターが選択されました");
  };

  // Hàm xử lý kiểm tra file và tạo link blob URL để xem trước ảnh (Ảnh xe)
  const handleVehicleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/png"].includes(file.type)) {
      toast.error(t("invalidImageType") || "JPGまたはPNG形式 của ảnh không hợp lệ");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error(t("fileTooLarge") || "ファイルサイズは tối đa 5MB までです");
      return;
    }

    const localPreviewUrl = URL.createObjectURL(file);
    setVehiclePhotoUrl(localPreviewUrl);
    toast.success(t("vehiclePhotoSelected") || "車両写真が選択されました");
  };

  const handleSave = async () => {
    try {
      // Gộp các Checkbox ngôn ngữ được tích chọn thành chuỗi phân tách bởi dấu phẩy để lưu vào cột String DB
      const selectedLanguages = Object.keys(languages)
        .filter((key) => languages[key as keyof typeof languages])
        .join(",");

      const payload = {
        ...formData,
        languages: selectedLanguages,
        user: {
          fullName: `${formData.firstName} ${formData.lastName}`.trim(),
          phone: formData.phone,
          email: formData.email,
          address: formData.address,
          city: formData.city,
          country: formData.country,
          avatarUrl: formData.avatarUrl,
        },
        driverProfile: {
          vehicleModel: formData.vehicleModel,
          vehiclePlate: formData.vehiclePlate,
          vehicleYear: formData.vehicleYear,
          vehicleColor: formData.vehicleColor,
          languages: selectedLanguages,
        },
      };

      await api.updateDriverProfile(payload);
      toast.success(t("profileUpdatedSuccess") || "プロフィールが更新されました");
      navigate("/driver/profile");
    } catch (error) {
      toast.error(t("profileUpdatedFailed") || "プロフィールの更新に失敗しました");
      console.error(error);
    }
  };

  const getInitials = (first: string, last: string) => {
    const f = first ? first[0] : "";
    const l = last ? last[0] : "";
    return (f + l).toUpperCase() || "TX";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <p className="text-gray-500 font-medium">Loading profile data...</p>
      </div>
    );
  }

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
            {t("back") || "戻る"}
          </Button>

          <h1 className="text-3xl font-bold mb-6">{t("editProfile") || "プロフィール編集"}</h1>

          {/* Profile Photo Upload */}
          <Card className="p-6 mb-6">
            <h3 className="font-semibold mb-4">{t("profilePhoto") || "プロフィール写真"}</h3>
            <div className="flex items-center gap-6">
              <div className="relative">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={formData.avatarUrl || "https://i.pravatar.cc/150?img=12"} />
                  <AvatarFallback>{getInitials(formData.firstName, formData.lastName)}</AvatarFallback>
                </Avatar>
                <button 
                  onClick={() => avatarInputRef.current?.click()}
                  className="absolute bottom-0 right-0 bg-black text-white p-2 rounded-full hover:bg-gray-800"
                >
                  <Camera className="h-4 w-4" />
                </button>
              </div>
              <div>
                {/* Input File ẩn dành cho Avatar */}
                <input 
                  type="file" 
                  ref={avatarInputRef}
                  className="hidden" 
                  accept="image/jpeg,image/png"
                  onChange={handleAvatarFileChange}
                />
                <Button variant="outline" className="mb-2 gap-2" onClick={() => avatarInputRef.current?.click()}>
                  <Upload className="h-4 w-4" />
                  {t("Upload Image") || "写真をアップロード"}
                </Button>
                <p className="text-sm text-gray-600">{t("JPG, PNG, maximum 5MB") || "JPG、PNG、最大5MB"}</p>
              </div>
            </div>
          </Card>

          {/* Personal Information */}
          <Card className="p-6 mb-6">
            <h3 className="font-semibold mb-4">{t("personalInfo") || "個人情報"}</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">{t("firstName") || "名"}</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">{t("lastName") || "姓"}</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">{t("email") || "メールアドレス"}</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">{t("phone") || "電話番号"}</Label>
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
            <h3 className="font-semibold mb-4">{t("addressInfo") || "住所情報"}</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="address">{t("address") || "住所"}</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={handleChange}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">{t("city") || "市"}</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">{t("country") || "国"}</Label>
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
            <h3 className="font-semibold mb-4">{t("vehicleInformation") || "車両情報"}</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="vehicleModel">{t("vehicleModel") || "車種"}</Label>
                <Input
                  id="vehicleModel"
                  value={formData.vehicleModel}
                  onChange={handleChange}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="vehiclePlate">{t("vehiclePlate") || "ナンバープレート"}</Label>
                  <Input
                    id="vehiclePlate"
                    value={formData.vehiclePlate}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vehicleYear">{t("vehicleYear") || "年式"}</Label>
                  <Input
                    id="vehicleYear"
                    value={formData.vehicleYear}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="vehicleColor">{t("vehicleColor") || "車の色"}</Label>
                <Select 
                  value={formData.vehicleColor}
                  onValueChange={(value) => setFormData({ ...formData, vehicleColor: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="white">{t("colorWhite") || "白"}</SelectItem>
                    <SelectItem value="black">{t("colorBlack") || "黒"}</SelectItem>
                    <SelectItem value="silver">{t("colorSilver") || "シルバー"}</SelectItem>
                    <SelectItem value="blue">{t("colorBlue") || "青"}</SelectItem>
                    <SelectItem value="red">{t("colorRed") || "赤"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Nâng cấp khu vực Upload ảnh xe có tính năng xem trước hình ảnh */}
              <div className="space-y-2">
                <Label>{t("vehiclePhoto") || "車両写真"}</Label>
                <input 
                  type="file" 
                  ref={vehiclePhotoInputRef}
                  className="hidden" 
                  accept="image/jpeg,image/png"
                  onChange={handleVehicleFileChange}
                />
                
                {vehiclePhotoUrl ? (
                  <div className="relative border rounded-lg overflow-hidden max-w-md mx-auto aspect-video bg-gray-100 flex items-center justify-center group">
                    <img src={vehiclePhotoUrl} alt="Vehicle Preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                      <Button size="sm" variant="secondary" onClick={() => vehiclePhotoInputRef.current?.click()}>
                        {t("change") || "変更"}
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => setVehiclePhotoUrl("")}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div 
                    onClick={() => vehiclePhotoInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 cursor-pointer transition-colors"
                  >
                    <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm font-medium text-gray-700">{t("clickToUpload") || "クリックしてアップロード"}</p>
                    <p className="text-xs text-gray-500 mt-1">{t("uploadRequirements") || "JPG、PNG、最大5MB"}</p>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Language Skills */}
          <Card className="p-6 mb-6">
            <h3 className="font-semibold mb-4">{t("languages") || "言語能力"}</h3>
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
                  {t("langJapanese") || "日本語"}
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
                  {t("langEnglish") || "英語"}
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
                  {t("langVietnamese") || "ベトナム語"}
                </label>
              </div>
            </div>
          </Card>

          {/* Password Change */}
          <Card className="p-6 mb-6">
            <h3 className="font-semibold mb-4">{t("changePassword") || "パスワード変更"}</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">{t("currentPassword") || "現在のパスワード"}</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  placeholder={t("placeholderCurrentPassword") || "現在のパスワードを入力"}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">{t("newPassword") || "新しいパスワード"}</Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder={t("placeholderNewPassword") || "新しいパスワードを入力"}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">{t("confirmPassword") || "パスワード確認"}</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder={t("placeholderConfirmPassword") || "パスワードを再入力"}
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
              {t("saveChanges") || "変更を保存"}
            </Button>
            <Button
              onClick={() => navigate("/driver/profile")}
              variant="outline"
              className="flex-1 h-12"
            >
              {t("cancel") || "キャンセル"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}