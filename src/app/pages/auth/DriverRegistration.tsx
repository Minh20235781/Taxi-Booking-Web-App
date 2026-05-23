import React, { useState, useRef, useEffect } from "react";
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
import { Car, ArrowLeft, Upload, Globe, X } from "lucide-react";
import { Checkbox } from "../../components/ui/checkbox";
import { useLanguage } from "../../contexts/LanguageContext";
import { api, setAuthToken } from "../../services/api";

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

  // State cho các ảnh upload
  const [uploadedFiles, setUploadedFiles] = useState({
    vehiclePhoto: null as File | null,
    idCardFront: null as File | null,
    idCardBack: null as File | null,
    licensePhoto: null as File | null,
    languageCertification: null as File | null,
  });

  // State cho preview ảnh
  const [imagePreviews, setImagePreviews] = useState({
    vehiclePhoto: "",
    idCardFront: "",
    idCardBack: "",
    licensePhoto: "",
    languageCertification: "",
  });

  // Refs cho file inputs
  const fileInputRefs = useRef({
    vehiclePhoto: React.createRef<HTMLInputElement>(),
    idCardFront: React.createRef<HTMLInputElement>(),
    idCardBack: React.createRef<HTMLInputElement>(),
    licensePhoto: React.createRef<HTMLInputElement>(),
    languageCertification: React.createRef<HTMLInputElement>(),
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

  // Xử lý file upload
  const handleFileUpload = (fieldName: keyof typeof uploadedFiles, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFiles(prev => ({ ...prev, [fieldName]: file }));
      
      // Tạo preview
      const reader = new FileReader();
      reader.onload = (event) => {
        setImagePreviews(prev => ({
          ...prev,
          [fieldName]: event.target?.result as string
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Mở file input khi click vào upload area
  const triggerFileInput = (fieldName: keyof typeof uploadedFiles) => {
    fileInputRefs.current[fieldName]?.current?.click();
  };

  // Xóa ảnh đã upload
  const removeUploadedFile = (fieldName: keyof typeof uploadedFiles) => {
    setUploadedFiles(prev => ({ ...prev, [fieldName]: null }));
    setImagePreviews(prev => ({ ...prev, [fieldName]: "" }));
  };

  const handleSubmit = async () => {
    try {
      // Basic client-side validation
      const missing: string[] = [];
      const authToken = localStorage.getItem("auth_token");
      if (!formData.email) missing.push("email");
      // Only require password when user is not already authenticated (token absent)
      if (!authToken && !formData.password) missing.push("password");
      if (!formData.phone) missing.push("phone");
      if (missing.length) {
        return alert(`Vui lòng nhập: ${missing.join(", ")}`);
      }

      const langs: string[] = [];
      if (languages.japanese) langs.push("japanese");
      if (languages.english) langs.push("english");
      if (languages.vietnamese) langs.push("vietnamese");

      const fullName = `${formData.firstName} ${formData.lastName}`.trim();

      // If user not authenticated yet, create account for driver
      let token: string | undefined;
      try {
        const signupRes: any = await api.signup({
          fullName,
          email: formData.email,
          phone: formData.phone,
          password: formData.password,
          role: "DRIVER"
        });
        token = signupRes?.token || signupRes?.data?.token || signupRes?.token;
      } catch (e: any) {
        // If signup fails because user exists, try login (only if password provided)
        if (e && e.message && e.message.includes("Email already exists")) {
          try {
            const loginRes: any = await api.login({ email: formData.email, password: formData.password, role: "DRIVER" });
            token = loginRes?.token || loginRes?.data?.token;
          } catch (err: any) {
            // Surface clearer message
            throw new Error(err?.message || "Đăng nhập thất bại. Vui lòng kiểm tra email/mật khẩu.");
          }
        } else {
          throw new Error(e?.message || "Đăng ký thất bại");
        }
      }

      if (token) {
        setAuthToken(token);
      }

      // Tạo FormData để gửi ảnh
      const formDataToSend = new FormData();
      formDataToSend.append('user', JSON.stringify({
        fullName,
        email: formData.email,
        phone: formData.phone
      }));
      formDataToSend.append('licenseNumber', formData.licenseNumber);
      formDataToSend.append('vehicleModel', formData.vehicleModel);
      formDataToSend.append('vehiclePlate', formData.vehiclePlate);
      formDataToSend.append('vehicleYear', formData.vehicleYear);
      formDataToSend.append('vehicleColor', formData.vehicleColor);
      formDataToSend.append('identificationNumber', formData.identificationNumber);
      formDataToSend.append('bankName', formData.bankName);
      formDataToSend.append('accountNumber', formData.accountNumber);
      formDataToSend.append('accountHolderName', formData.accountHolderName);
      formDataToSend.append('languages', JSON.stringify(langs));

      // Thêm các ảnh vào FormData
      if (uploadedFiles.vehiclePhoto) {
        formDataToSend.append('vehiclePhoto', uploadedFiles.vehiclePhoto);
      }
      if (uploadedFiles.idCardFront) {
        formDataToSend.append('idCardFront', uploadedFiles.idCardFront);
      }
      if (uploadedFiles.idCardBack) {
        formDataToSend.append('idCardBack', uploadedFiles.idCardBack);
      }
      if (uploadedFiles.licensePhoto) {
        formDataToSend.append('licensePhoto', uploadedFiles.licensePhoto);
      }
      if (uploadedFiles.languageCertification) {
        formDataToSend.append('languageCertification', uploadedFiles.languageCertification);
      }

      // Gửi FormData qua fetch để hỗ trợ file upload
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";
      const response = await fetch(`${API_BASE_URL}/driver/profile`, {
        method: "PUT",
        headers: {
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
        },
        body: formDataToSend
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Registration failed");
      }

      const me = await api.me();
      localStorage.setItem("user", JSON.stringify(me));
      navigate("/driver/home");
    } catch (error) {
      console.error(error);
      alert(`Registration failed. ${error instanceof Error ? error.message : "Please try again."}`);
    }
  };

  // Prefill email/phone if we have an authenticated user from previous step
  useEffect(() => {
    const stored = localStorage.getItem("auth_user") || localStorage.getItem("user");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setFormData((prev) => ({
          ...prev,
          email: parsed.email || prev.email,
          phone: parsed.phone || prev.phone,
          firstName: parsed.fullName ? String(parsed.fullName).split(" ").slice(0, -1).join(" ") : prev.firstName,
          lastName: parsed.fullName ? String(parsed.fullName).split(" ").slice(-1).join(" ") : prev.lastName,
        }));
      } catch {
        // ignore parse errors
      }
    }
  }, []);

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
              <SelectItem value="ja">???</SelectItem>
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

          <div className="space-y-8">
            {/* Bank Account Information */}
            <div>
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
                    className="bg-gray-100 border-none h-12"
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
                    className="bg-gray-100 border-none h-12"
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
                    className="bg-gray-100 border-none h-12"
                    value={formData.accountHolderName}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>

            {/* Identification Information */}
            <div>
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
                    className="bg-gray-100 border-none h-12"
                    value={formData.identificationNumber}
                    onChange={handleChange}
                  />
                </div>

                {/* ID Card Front */}
                <div className="space-y-2">
                  <Label>{t("idCardFront")}</Label>
                  <input
                    ref={fileInputRefs.current.idCardFront}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload('idCardFront', e)}
                    className="hidden"
                  />
                  {imagePreviews.idCardFront ? (
                    <div className="relative group">
                      <img 
                        src={imagePreviews.idCardFront} 
                        alt="ID Card Front Preview" 
                        className="w-full h-48 object-cover rounded-lg border border-gray-300"
                      />
                      <button
                        onClick={() => removeUploadedFile('idCardFront')}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div 
                      onClick={() => triggerFileInput('idCardFront')}
                      className="border border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 cursor-pointer bg-gray-50 hover:bg-gray-100 transition"
                    >
                      <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                      <p className="text-sm text-gray-600">
                        {t("clickToUpload")}
                      </p>
                    </div>
                  )}
                </div>

                {/* ID Card Back */}
                <div className="space-y-2">
                  <Label>{t("idCardBack")}</Label>
                  <input
                    ref={fileInputRefs.current.idCardBack}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload('idCardBack', e)}
                    className="hidden"
                  />
                  {imagePreviews.idCardBack ? (
                    <div className="relative group">
                      <img 
                        src={imagePreviews.idCardBack} 
                        alt="ID Card Back Preview" 
                        className="w-full h-48 object-cover rounded-lg border border-gray-300"
                      />
                      <button
                        onClick={() => removeUploadedFile('idCardBack')}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div 
                      onClick={() => triggerFileInput('idCardBack')}
                      className="border border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 cursor-pointer bg-gray-50 hover:bg-gray-100 transition"
                    >
                      <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                      <p className="text-sm text-gray-600">
                        {t("clickToUpload")}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Driver License */}
            <div>
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
                    className="bg-gray-100 border-none h-12"
                    value={formData.licenseNumber}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("licensePhoto")}</Label>
                  <input
                    ref={fileInputRefs.current.licensePhoto}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload('licensePhoto', e)}
                    className="hidden"
                  />
                  {imagePreviews.licensePhoto ? (
                    <div className="relative group">
                      <img 
                        src={imagePreviews.licensePhoto} 
                        alt="License Photo Preview" 
                        className="w-full h-48 object-cover rounded-lg border border-gray-300"
                      />
                      <button
                        onClick={() => removeUploadedFile('licensePhoto')}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div 
                      onClick={() => triggerFileInput('licensePhoto')}
                      className="border border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 cursor-pointer bg-gray-50 hover:bg-gray-100 transition"
                    >
                      <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                      <p className="text-sm text-gray-600">
                        {t("clickToUpload")}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Vehicle Information */}
            <div>
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
                    className="bg-gray-100 border-none h-12"
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
                      className="bg-gray-100 border-none h-12"
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
                      className="bg-gray-100 border-none h-12"
                      value={formData.vehicleYear}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vehicleColor">
                    {t("vehicleColor")}
                  </Label>
                  <Select
                    value={formData.vehicleColor}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, vehicleColor: value }))
                    }
                  >
                    <SelectTrigger className="bg-gray-100 border-none h-12">
                      <SelectValue placeholder={t("selectColor")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="white">{t("white")}</SelectItem>
                      <SelectItem value="black">{t("black")}</SelectItem>
                      <SelectItem value="silver">{t("silver")}</SelectItem>
                      <SelectItem value="blue">{t("blue")}</SelectItem>
                      <SelectItem value="red">{t("red")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{t("vehiclePhoto")}</Label>
                  <input
                    ref={fileInputRefs.current.vehiclePhoto}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload('vehiclePhoto', e)}
                    className="hidden"
                  />
                  {imagePreviews.vehiclePhoto ? (
                    <div className="relative group">
                      <img 
                        src={imagePreviews.vehiclePhoto} 
                        alt="Vehicle Photo Preview" 
                        className="w-full h-48 object-cover rounded-lg border border-gray-300"
                      />
                      <button
                        onClick={() => removeUploadedFile('vehiclePhoto')}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div 
                      onClick={() => triggerFileInput('vehiclePhoto')}
                      className="border border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 cursor-pointer bg-gray-50 hover:bg-gray-100 transition"
                    >
                      <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                      <p className="text-sm text-gray-600">
                        {t("clickToUpload")}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Language Skills */}
            <div>
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
                  <input
                    ref={fileInputRefs.current.languageCertification}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload('languageCertification', e)}
                    className="hidden"
                  />
                  {imagePreviews.languageCertification ? (
                    <div className="relative group">
                      <img 
                        src={imagePreviews.languageCertification} 
                        alt="Language Certification Preview" 
                        className="w-full h-48 object-cover rounded-lg border border-gray-300"
                      />
                      <button
                        onClick={() => removeUploadedFile('languageCertification')}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div 
                      onClick={() => triggerFileInput('languageCertification')}
                      className="border border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 cursor-pointer bg-gray-50 hover:bg-gray-100 transition"
                    >
                      <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                      <p className="text-sm text-gray-600">
                        {t("clickToUpload")}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        ({t("optional")})
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <Button
              onClick={handleSubmit}
              className="w-full h-12 bg-black hover:bg-gray-800 text-white mt-4"
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
