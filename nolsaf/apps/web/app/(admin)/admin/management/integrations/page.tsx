"use client";
import { useState } from "react";
import { Link2, Cloud, Mail, MessageSquare, Save, Eye, EyeOff } from "lucide-react";

export default function IntegrationsPage(){
  const [cloudinaryConfig, setCloudinaryConfig] = useState({
    cloudName: "",
    apiKey: "",
    apiSecret: "",
    enabled: false
  });

  const [mailerConfig, setMailerConfig] = useState({
    provider: "nodemailer",
    host: "",
    port: "",
    user: "",
    password: "",
    enabled: false
  });

  const [smsConfig, setSmsConfig] = useState({
    provider: "",
    apiKey: "",
    apiSecret: "",
    enabled: false
  });

  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({
    cloudinary: false,
    mailer: false,
    sms: false
  });

  const toggleSecret = (key: string) => {
    setShowSecrets(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Validation functions
  const isCloudinaryValid = () => {
    return cloudinaryConfig.cloudName.trim() !== "" &&
           cloudinaryConfig.apiKey.trim() !== "" &&
           cloudinaryConfig.apiSecret.trim() !== "";
  };

  const isMailerValid = () => {
    return mailerConfig.provider.trim() !== "" &&
           mailerConfig.host.trim() !== "" &&
           mailerConfig.port.trim() !== "" &&
           mailerConfig.user.trim() !== "" &&
           mailerConfig.password.trim() !== "";
  };

  const isSmsValid = () => {
    return smsConfig.provider.trim() !== "" &&
           smsConfig.apiKey.trim() !== "" &&
           smsConfig.apiSecret.trim() !== "";
  };

  const handleSave = async (type: "cloudinary" | "mailer" | "sms") => {
    // TODO: Implement API call to save integration settings
    alert(`${type} configuration saved`);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <div className="flex flex-col items-center text-center">
          <Link2 className="h-8 w-8 text-gray-400 mb-3" />
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900">
            Integrations
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Configure cloudinary, mailer, and SMS provider keys here.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cloudinary Integration */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm overflow-hidden min-w-0 transition-all duration-200 hover:shadow-lg hover:border-purple-300 active:scale-[0.98]">
          <div className="flex items-center gap-2 mb-2">
            <Cloud className="h-5 w-5 text-purple-600" />
            <h3 className="text-lg font-semibold text-gray-900">Cloudinary</h3>
          </div>
          <p className="text-xs text-gray-500 mb-4">Image & media storage</p>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cloud Name</label>
              <input
                type="text"
                value={cloudinaryConfig.cloudName}
                onChange={(e) => setCloudinaryConfig({...cloudinaryConfig, cloudName: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#02665e] focus:border-[#02665e] outline-none box-border"
                placeholder="your-cloud-name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
              <input
                type="text"
                value={cloudinaryConfig.apiKey}
                onChange={(e) => setCloudinaryConfig({...cloudinaryConfig, apiKey: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#02665e] focus:border-[#02665e] outline-none box-border"
                placeholder="123456789012345"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">API Secret</label>
              <div className="relative w-full">
                <input
                  type={showSecrets.cloudinary ? "text" : "password"}
                  value={cloudinaryConfig.apiSecret}
                  onChange={(e) => setCloudinaryConfig({...cloudinaryConfig, apiSecret: e.target.value})}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#02665e] focus:border-[#02665e] outline-none box-border"
                  placeholder="••••••••••••"
                />
                <button
                  type="button"
                  onClick={() => toggleSecret("cloudinary")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showSecrets.cloudinary ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="cloudinary-enabled"
                checked={cloudinaryConfig.enabled}
                onChange={(e) => setCloudinaryConfig({...cloudinaryConfig, enabled: e.target.checked})}
                className="w-4 h-4 text-[#02665e] border-gray-300 rounded focus:ring-[#02665e]"
              />
              <label htmlFor="cloudinary-enabled" className="text-sm text-gray-700">Enable Cloudinary</label>
            </div>
            <button
              onClick={() => handleSave("cloudinary")}
              disabled={!isCloudinaryValid()}
              className="w-full px-4 py-2 bg-[#02665e] text-white rounded-lg hover:bg-[#015b54] transition-all duration-200 flex items-center justify-center gap-2 font-medium text-sm disabled:bg-gray-400 disabled:cursor-not-allowed disabled:hover:bg-gray-400"
            >
              <Save className="h-4 w-4" />
              Save Configuration
            </button>
          </div>
        </div>

        {/* Mailer Integration */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm overflow-hidden min-w-0 transition-all duration-200 hover:shadow-lg hover:border-blue-300 active:scale-[0.98]">
          <div className="flex items-center gap-2 mb-2">
            <Mail className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">Mailer</h3>
          </div>
          <p className="text-xs text-gray-500 mb-4">Email service provider</p>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Provider</label>
              <select
                value={mailerConfig.provider}
                onChange={(e) => setMailerConfig({...mailerConfig, provider: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#02665e] focus:border-[#02665e] outline-none box-border"
              >
                <option value="nodemailer">Nodemailer</option>
                <option value="ses">AWS SES</option>
                <option value="sendgrid">SendGrid</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Host</label>
              <input
                type="text"
                value={mailerConfig.host}
                onChange={(e) => setMailerConfig({...mailerConfig, host: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#02665e] focus:border-[#02665e] outline-none box-border"
                placeholder="smtp.example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Port</label>
              <input
                type="number"
                value={mailerConfig.port}
                onChange={(e) => setMailerConfig({...mailerConfig, port: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#02665e] focus:border-[#02665e] outline-none box-border"
                placeholder="587"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <input
                type="text"
                value={mailerConfig.user}
                onChange={(e) => setMailerConfig({...mailerConfig, user: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#02665e] focus:border-[#02665e] outline-none box-border"
                placeholder="your-email@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <div className="relative w-full">
                <input
                  type={showSecrets.mailer ? "text" : "password"}
                  value={mailerConfig.password}
                  onChange={(e) => setMailerConfig({...mailerConfig, password: e.target.value})}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#02665e] focus:border-[#02665e] outline-none box-border"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => toggleSecret("mailer")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showSecrets.mailer ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="mailer-enabled"
                checked={mailerConfig.enabled}
                onChange={(e) => setMailerConfig({...mailerConfig, enabled: e.target.checked})}
                className="w-4 h-4 text-[#02665e] border-gray-300 rounded focus:ring-[#02665e]"
              />
              <label htmlFor="mailer-enabled" className="text-sm text-gray-700">Enable Mailer</label>
            </div>
            <button
              onClick={() => handleSave("mailer")}
              disabled={!isMailerValid()}
              className="w-full px-4 py-2 bg-[#02665e] text-white rounded-lg hover:bg-[#015b54] transition-all duration-200 flex items-center justify-center gap-2 font-medium text-sm disabled:bg-gray-400 disabled:cursor-not-allowed disabled:hover:bg-gray-400"
            >
              <Save className="h-4 w-4" />
              Save Configuration
            </button>
          </div>
        </div>

        {/* SMS Integration */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm overflow-hidden min-w-0 transition-all duration-200 hover:shadow-lg hover:border-green-300 active:scale-[0.98]">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare className="h-5 w-5 text-green-600" />
            <h3 className="text-lg font-semibold text-gray-900">SMS Provider</h3>
          </div>
          <p className="text-xs text-gray-500 mb-4">SMS service configuration</p>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Provider</label>
              <select
                value={smsConfig.provider}
                onChange={(e) => setSmsConfig({...smsConfig, provider: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#02665e] focus:border-[#02665e] outline-none box-border"
              >
                <option value="">Select provider</option>
                <option value="twilio">Twilio</option>
                <option value="africas-talking">Africa's Talking</option>
                <option value="nexmo">Vonage (Nexmo)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
              <input
                type="text"
                value={smsConfig.apiKey}
                onChange={(e) => setSmsConfig({...smsConfig, apiKey: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#02665e] focus:border-[#02665e] outline-none box-border"
                placeholder="your-api-key"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">API Secret</label>
              <div className="relative w-full">
                <input
                  type={showSecrets.sms ? "text" : "password"}
                  value={smsConfig.apiSecret}
                  onChange={(e) => setSmsConfig({...smsConfig, apiSecret: e.target.value})}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#02665e] focus:border-[#02665e] outline-none box-border"
                  placeholder="••••••••••••"
                />
                <button
                  type="button"
                  onClick={() => toggleSecret("sms")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showSecrets.sms ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="sms-enabled"
                checked={smsConfig.enabled}
                onChange={(e) => setSmsConfig({...smsConfig, enabled: e.target.checked})}
                className="w-4 h-4 text-[#02665e] border-gray-300 rounded focus:ring-[#02665e]"
              />
              <label htmlFor="sms-enabled" className="text-sm text-gray-700">Enable SMS</label>
            </div>
            <button
              onClick={() => handleSave("sms")}
              disabled={!isSmsValid()}
              className="w-full px-4 py-2 bg-[#02665e] text-white rounded-lg hover:bg-[#015b54] transition-all duration-200 flex items-center justify-center gap-2 font-medium text-sm disabled:bg-gray-400 disabled:cursor-not-allowed disabled:hover:bg-gray-400"
            >
              <Save className="h-4 w-4" />
              Save Configuration
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
