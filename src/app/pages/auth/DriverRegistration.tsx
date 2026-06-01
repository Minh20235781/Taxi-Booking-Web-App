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
import { api, setAuthToken, getAuthToken } from "../../services/api";

function ImageUploadField({
  label,
  preview,
  optional,
  aspectClass = "aspect-[4/3]",
  onPick,
  onRemove,
  inputRef,
  onChange,
}: {
  label: string;
  preview: string;
  optional?: boolean;
  aspectClass?: string;
  onPick: () => void;
  onRemove: () => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  const { t } = useLanguage();

  return (
    <div className="space-y-2">
      <Label>
        {label}
        {optional ? ` (${t("optional")})` : ""}
      </Label>
      <input ref={inputRef} type="file" accept="image/*" onChange={onChange} className="hidden" />
      {preview ? (
        <div className={`relative group w-full ${aspectClass} bg-gray-100 rounded-lg border border-gray-300 overflow-hidden`}>
          <img src={preview} alt={label} className="absolute inset-0 w-full h-full object-contain p-1" />
          <button
            type="button"
            onClick={onRemove}
            className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 shadow-md hover:bg-red-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={onPick}
          className={`w-full ${aspectClass} border border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center gap-2 hover:border-gray-400 cursor-pointer bg-gray-50 hover:bg-gray-100 transition px-4`}
        >
          <Upload className="h-8 w-8 text-gray-400 shrink-0" />
          <p className="text-sm text-gray-600 text-center">{t("clickToUpload")}</p>
        </button>
      )}
    </div>
  );
}

export default function DriverRegistration() {
  const navigate = useNavigate();
  const { t, language, setLanguage } = useLanguage();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
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
      const missing: string[] = [];
      if (!formData.email) missing.push("email");
      if (!formData.phone) missing.push("phone");
      if (!formData.firstName && !formData.lastName) missing.push("name");

      if (!isAuthenticated) {
        if (!formData.password) missing.push("password");
        if (!formData.confirmPassword) missing.push("confirm password");
        if (formData.password !== formData.confirmPassword) {
          return alert("Mật khẩu xác nhận không khớp.");
        }
      }

      if (missing.length) {
        return alert(`Vui lòng nhập: ${missing.join(", ")}`);
      }

      const langs: string[] = [];
      if (languages.japanese) langs.push("japanese");
      if (languages.english) langs.push("english");
      if (languages.vietnamese) langs.push("vietnamese");

      const fullName = `${formData.firstName} ${formData.lastName}`.trim();

      let token = getAuthToken() || undefined;

      if (!token) {
        try {
          const signupRes: any = await api.signup({
            fullName,
            email: formData.email,
            phone: formData.phone,
            password: formData.password,
            role: "DRIVER",
          });
          token = signupRes?.token;
          if (token) setAuthToken(token);
          if (signupRes?.user) {
            localStorage.setItem("auth_user", JSON.stringify(signupRes.user));
          }
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : "";
          if (msg.includes("Email already exists")) {
            const loginRes: any = await api.login({
              email: formData.email,
              password: formData.password,
              role: "DRIVER",
            });
            token = loginRes?.token;
            if (token) setAuthToken(token);
            if (loginRes?.user) {
              localStorage.setItem("auth_user", JSON.stringify(loginRes.user));
            }
          } else {
            throw e;
          }
        }
      }

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
      const authHeader = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/driver/profile`, {
        method: "PUT",
        headers: {
          ...(authHeader ? { Authorization: `Bearer ${authHeader}` } : {}),
        },
        body: formDataToSend,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Registration failed");
      }

      const result = await response.json();
      if (result.token) {
        setAuthToken(result.token);
      }
      if (result.user) {
        localStorage.setItem("auth_user", JSON.stringify(result.user));
      }

      const me = await api.me();
      localStorage.setItem("auth_user", JSON.stringify(me.user || me));
      navigate("/driver/home");
    } catch (error) {
      console.error(error);
      alert(`Registration failed. ${error instanceof Error ? error.message : "Please try again."}`);
    }
  };

  // Prefill from authenticated user; detect login state
  useEffect(() => {
    const token = getAuthToken();
    setIsAuthenticated(Boolean(token));

    const stored = localStorage.getItem("auth_user") || localStorage.getItem("user");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const nameParts = parsed.fullName ? String(parsed.fullName).trim().split(/\s+/) : [];
        setFormData((prev) => ({
          ...prev,
          email: parsed.email || prev.email,
          phone: parsed.phone || prev.phone,
          firstName: nameParts.length > 1 ? nameParts.slice(0, -1).join(" ") : nameParts[0] || prev.firstName,
          lastName: nameParts.length > 1 ? nameParts[nameParts.length - 1] : prev.lastName,
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

          <div className="space-y-8">
            {/* Account — step 1 for new drivers */}
            <div>
              <h3 className="font-bold text-lg mb-1">{t("accountInformation")}</h3>
              <p className="text-sm text-gray-600 mb-4">
                {isAuthenticated ? t("driverAccountLoggedInNote") : t("driverAccountSectionNote")}
              </p>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">{t("firstName")}</Label>
                    <Input
                      id="firstName"
                      placeholder="太郎"
                      className="bg-gray-100 border-none h-12"
                      value={formData.firstName}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">{t("lastName")}</Label>
                    <Input
                      id="lastName"
                      placeholder="山田"
                      className="bg-gray-100 border-none h-12"
                      value={formData.lastName}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">{t("emailAddress")}</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="example@email.com"
                    className="bg-gray-100 border-none h-12"
                    value={formData.email}
                    onChange={handleChange}
                    readOnly={isAuthenticated}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">{t("phoneNumber")}</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+84 123 456 789"
                    className="bg-gray-100 border-none h-12"
                    value={formData.phone}
                    onChange={handleChange}
                  />
                </div>

                {!isAuthenticated && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="password">{t("password")}</Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder={t("enterPassword")}
                        className="bg-gray-100 border-none h-12"
                        value={formData.password}
                        onChange={handleChange}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">{t("confirmPassword")}</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        placeholder={t("reEnterPassword")}
                        className="bg-gray-100 border-none h-12"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

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
                    placeholder={t("enterBankName")}
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
                    placeholder={t("enterAccountNumber")}
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

                <ImageUploadField
                  label={t("idCardFront")}
                  preview={imagePreviews.idCardFront}
                  aspectClass="aspect-[3/2]"
                  inputRef={fileInputRefs.current.idCardFront}
                  onChange={(e) => handleFileUpload("idCardFront", e)}
                  onPick={() => triggerFileInput("idCardFront")}
                  onRemove={() => removeUploadedFile("idCardFront")}
                />

                <ImageUploadField
                  label={t("idCardBack")}
                  preview={imagePreviews.idCardBack}
                  aspectClass="aspect-[3/2]"
                  inputRef={fileInputRefs.current.idCardBack}
                  onChange={(e) => handleFileUpload("idCardBack", e)}
                  onPick={() => triggerFileInput("idCardBack")}
                  onRemove={() => removeUploadedFile("idCardBack")}
                />
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
                <ImageUploadField
                  label={t("licensePhoto")}
                  preview={imagePreviews.licensePhoto}
                  aspectClass="aspect-[3/2]"
                  inputRef={fileInputRefs.current.licensePhoto}
                  onChange={(e) => handleFileUpload("licensePhoto", e)}
                  onPick={() => triggerFileInput("licensePhoto")}
                  onRemove={() => removeUploadedFile("licensePhoto")}
                />
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

                <ImageUploadField
                  label={t("vehiclePhoto")}
                  preview={imagePreviews.vehiclePhoto}
                  aspectClass="aspect-video"
                  inputRef={fileInputRefs.current.vehiclePhoto}
                  onChange={(e) => handleFileUpload("vehiclePhoto", e)}
                  onPick={() => triggerFileInput("vehiclePhoto")}
                  onRemove={() => removeUploadedFile("vehiclePhoto")}
                />
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

                <ImageUploadField
                  label={t("languageCertification")}
                  preview={imagePreviews.languageCertification}
                  aspectClass="aspect-[3/2]"
                  optional
                  inputRef={fileInputRefs.current.languageCertification}
                  onChange={(e) => handleFileUpload("languageCertification", e)}
                  onPick={() => triggerFileInput("languageCertification")}
                  onRemove={() => removeUploadedFile("languageCertification")}
                />
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
