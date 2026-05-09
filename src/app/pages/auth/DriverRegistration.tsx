import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { Car, ArrowLeft, Upload, Globe } from "lucide-react";
import { Checkbox } from "../../components/ui/checkbox";
import { useLanguage } from "../../contexts/LanguageContext";

export default function DriverRegistration() {
  const navigate = useNavigate();
  const { t, language, setLanguage } = useLanguage();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    licenseNumber: "",
    vehicleModel: "",
    vehiclePlate: "",
    vehicleYear: "",
    vehicleColor: "",
    identificationNumber: "",
    bankName: "",
    accountNumber: "",
    accountHolderName: "",
  });

  const [languages, setLanguages] = useState({
    japanese: false,
    english: false,
    vietnamese: true,
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setFormData({
      ...formData,
      [e.target.id]: e.target.value,
    });
  };

  const handleSubmit = () => {
    // Mock registration
    navigate("/driver/home");
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="bg-black text-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/login")}
              className="text-white hover:bg-gray-800"
            >
              <ArrowLeft className="h-6 w-6" />
            </Button>
            <div className="flex items-center gap-2">
              <Car className="h-6 w-6" />
              <h1 className="text-2xl font-bold">Antrek</h1>
            </div>
          </div>

          {/* Language Selector */}
          <Select
            value={language}
            onValueChange={(value) =>
              setLanguage(value as "ja" | "en")
            }
          >
            <SelectTrigger className="w-32 bg-transparent border-gray-700 text-white hover:bg-gray-800">
              <Globe className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white z-50">
              <SelectItem value="ja">日本語</SelectItem>
              <SelectItem value="en">English</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-2">
              {t("driverRegistration")}
            </h2>
            <p className="text-gray-600">
              {t("registerAsDriverSubtitle")}
            </p>
          </div>

          <div className="space-y-6">
            {/* Bank Account Information (Replaces Personal Information) */}
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="font-bold text-lg mb-4">
                {t("bankAccountInformation")}
              </h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="bankName">
                    {t("bankName")}
                  </Label>
                  <Input
                    id="bankName"
                    placeholder="Vietcombank"
                    value={formData.bankName}
                    onChange={handleChange}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accountNumber">
                    {t("accountNumber")}
                  </Label>
                  <Input
                    id="accountNumber"
                    placeholder="1234567890"
                    value={formData.accountNumber}
                    onChange={handleChange}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accountHolderName">
                    {t("accountHolderName")}
                  </Label>
                  <Input
                    id="accountHolderName"
                    placeholder="NGUYEN VAN A"
                    value={formData.accountHolderName}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>

            {/* Identification Information (Replaces Insurance Information) */}
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="font-bold text-lg mb-4">
                {t("identificationInformation")}
              </h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="identificationNumber">
                    {t("identificationNumber")}
                  </Label>
                  <Input
                    id="identificationNumber"
                    placeholder="123456789012"
                    value={formData.identificationNumber}
                    onChange={handleChange}
                  />
                </div>

                {/* ID Card Front */}
                <div className="space-y-2">
                  <Label>{t("idCardFront")}</Label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 cursor-pointer">
                    <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm text-gray-600">
                      {t("clickToUpload")}
                    </p>
                  </div>
                </div>

                {/* ID Card Back */}
                <div className="space-y-2">
                  <Label>{t("idCardBack")}</Label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 cursor-pointer">
                    <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm text-gray-600">
                      {t("clickToUpload")}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Driver License */}
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="font-bold text-lg mb-4">
                {t("driversLicense")}
              </h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="licenseNumber">
                    {t("driverLicense")}
                  </Label>
                  <Input
                    id="licenseNumber"
                    placeholder="123456789"
                    value={formData.licenseNumber}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("licensePhoto")}</Label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 cursor-pointer">
                    <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm text-gray-600">
                      {t("clickToUpload")}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Vehicle Information */}
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="font-bold text-lg mb-4">
                {t("vehicleInfo")}
              </h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="vehicleModel">
                    {t("vehicleModel")}
                  </Label>
                  <Input
                    id="vehicleModel"
                    placeholder="Toyota Vios"
                    value={formData.vehicleModel}
                    onChange={handleChange}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="vehiclePlate">
                      {t("licensePlate")}
                    </Label>
                    <Input
                      id="vehiclePlate"
                      placeholder="30A-12345"
                      value={formData.vehiclePlate}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vehicleYear">
                      {t("vehicleYear")}
                    </Label>
                    <Input
                      id="vehicleYear"
                      placeholder="2022"
                      value={formData.vehicleYear}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vehicleColor">
                    {t("vehicleColor")}
                  </Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue
                        placeholder={t("selectColor")}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="white">
                        {t("white")}
                      </SelectItem>
                      <SelectItem value="black">
                        {t("black")}
                      </SelectItem>
                      <SelectItem value="silver">
                        {t("silver")}
                      </SelectItem>
                      <SelectItem value="blue">
                        {t("blue")}
                      </SelectItem>
                      <SelectItem value="red">
                        {t("red")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{t("vehiclePhoto")}</Label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 cursor-pointer">
                    <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm text-gray-600">
                      {t("clickToUpload")}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Language Skills */}
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="font-bold text-lg mb-4">
                {t("languageSkills")}
              </h3>
              <div className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="japanese"
                      checked={languages.japanese}
                      onCheckedChange={(checked) =>
                        setLanguages({
                          ...languages,
                          japanese: checked as boolean,
                        })
                      }
                    />
                    <label
                      htmlFor="japanese"
                      className="text-sm font-medium"
                    >
                      {t("japanese")}
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="english"
                      checked={languages.english}
                      onCheckedChange={(checked) =>
                        setLanguages({
                          ...languages,
                          english: checked as boolean,
                        })
                      }
                    />
                    <label
                      htmlFor="english"
                      className="text-sm font-medium"
                    >
                      {t("english")}
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="vietnamese"
                      checked={languages.vietnamese}
                      onCheckedChange={(checked) =>
                        setLanguages({
                          ...languages,
                          vietnamese: checked as boolean,
                        })
                      }
                    />
                    <label
                      htmlFor="vietnamese"
                      className="text-sm font-medium"
                    >
                      {t("vietnamese")}
                    </label>
                  </div>
                </div>

                {/* Language Certification Upload */}
                <div className="space-y-2 pt-2">
                  <Label>{t("languageCertification")}</Label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 cursor-pointer">
                    <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm text-gray-600">
                      {t("clickToUpload")}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      ({t("optional")})
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <Button
              onClick={handleSubmit}
              className="w-full h-12 bg-black hover:bg-gray-800 text-white"
            >
              {t("completeRegistration")}
            </Button>

            <div className="text-center text-sm">
              <span className="text-gray-600">
                {t("alreadyHaveAccount")}{" "}
              </span>
              <Link
                to="/login"
                className="text-black font-semibold underline"
              >
                {t("login")}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}