"use client";
import { useState, useEffect } from "react";
import { Link2, Cloud, Mail, MessageSquare, CheckCircle2, XCircle, ExternalLink, FileText, Settings, Copy, RefreshCw } from "lucide-react";

type IntegrationStatus = {
  configured: boolean;
  provider?: string;
  details?: string;
};

export default function IntegrationsPage(){
  const [emailStatus, setEmailStatus] = useState<IntegrationStatus>({ configured: false });
  const [smsStatus, setSmsStatus] = useState<IntegrationStatus>({ configured: false });
  const [cloudinaryStatus, setCloudinaryStatus] = useState<IntegrationStatus>({ configured: false });
  const [loading, setLoading] = useState(true);
  const [openModal, setOpenModal] = useState<'email' | 'sms' | 'cloudinary' | null>(null);
  const [testing, setTesting] = useState(false);

  const checkStatus = async () => {
    try {
      const res = await fetch('/api/admin/integrations/status', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setEmailStatus(data.email || { configured: false });
        setSmsStatus(data.sms || { configured: false });
        setCloudinaryStatus(data.cloudinary || { configured: false });
      }
    } catch (err) {
      console.error('Failed to fetch integration status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  const handleTestConnection = async () => {
    setTesting(true);
    await checkStatus();
    setTimeout(() => setTesting(false), 500);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl border border-gray-200/60 p-8 shadow-lg shadow-gray-200/50 transition-all duration-300 hover:shadow-xl hover:shadow-gray-200/60">
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="p-3 bg-gradient-to-br from-[#02665e]/10 to-[#02665e]/5 rounded-2xl transition-transform duration-300 hover:scale-110">
            <Link2 className="h-10 w-10 text-[#02665e] transition-colors duration-300" />
          </div>
          <p className="text-sm text-gray-600 max-w-2xl leading-relaxed">
            View integration status and configure providers via environment variables in your <code className="px-2 py-1 bg-gray-100 rounded text-[#02665e] font-mono text-xs">apps/api/.env</code> file.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Email Integration Status */}
        <div className="group bg-white rounded-2xl border border-gray-200/60 p-6 shadow-md shadow-gray-200/30 transition-all duration-300 hover:shadow-xl hover:shadow-blue-200/40 hover:-translate-y-1 hover:border-blue-300/40">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl group-hover:scale-110 transition-transform duration-300">
              <Mail className="h-5 w-5 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Email Provider</h3>
          </div>
          
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-3 border-gray-200 border-t-[#02665e]"></div>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                {emailStatus.configured ? (
                  <div className="flex items-center gap-2.5 px-3 py-1.5 bg-green-50 rounded-lg border border-green-200 animate-in fade-in slide-in-from-left-4 duration-500">
                    <CheckCircle2 className="h-5 w-5 text-green-600 animate-in zoom-in duration-300" />
                    <span className="text-sm font-semibold text-green-700">Configured</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2.5 px-3 py-1.5 bg-red-50 rounded-lg border border-red-200 animate-in fade-in slide-in-from-left-4 duration-500">
                    <XCircle className="h-5 w-5 text-red-600 animate-in zoom-in duration-300" />
                    <span className="text-sm font-semibold text-red-700">Not Configured</span>
                  </div>
                )}
              </div>
              
              {emailStatus.provider && (
                <div className="text-sm text-gray-700 bg-blue-50/50 px-3 py-2 rounded-lg border border-blue-100">
                  <span className="font-semibold text-gray-900">Provider:</span> <span className="text-blue-700">{emailStatus.provider}</span>
                </div>
              )}
              
              {emailStatus.details && (
                <div className="text-xs text-gray-600 bg-gradient-to-r from-gray-50 to-gray-100/50 px-3 py-2.5 rounded-lg border border-gray-200/60">
                  {emailStatus.details}
                </div>
              )}

              <div className="pt-5 border-t border-gray-200/60">
                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
                  Configuration
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
                </h4>
                <div className="space-y-2 text-xs text-gray-600">
                  <div>
                    <span className="font-medium">Resend (Recommended):</span>
                    <ul className="list-disc list-inside ml-2 mt-1 space-y-1">
                      <li><code>RESEND_API_KEY</code></li>
                      <li><code>RESEND_FROM_DOMAIN</code> (optional)</li>
                    </ul>
                  </div>
                  <div>
                    <span className="font-medium">SMTP (Fallback):</span>
                    <ul className="list-disc list-inside ml-2 mt-1 space-y-1">
                      <li><code>SMTP_HOST</code></li>
                      <li><code>SMTP_PORT</code></li>
                      <li><code>SMTP_USER</code></li>
                      <li><code>SMTP_PASS</code></li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <a
                  href="https://resend.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-[#02665e] hover:text-[#014e47] font-medium transition-colors duration-200 hover:underline"
                >
                  Get Resend API Key <ExternalLink className="w-3 h-3 transition-transform duration-200 group-hover:translate-x-0.5" />
                </a>
                <button
                  onClick={() => setOpenModal('email')}
                  className="ml-auto inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-[#02665e] to-[#014e47] rounded-lg hover:from-[#014e47] hover:to-[#02665e] transition-all duration-300 hover:scale-105 hover:shadow-lg shadow-[#02665e]/20"
                >
                  <Settings className="w-3.5 h-3.5" /> Configure
                </button>
              </div>
            </div>
          )}
        </div>

        {/* SMS Integration Status */}
        <div className="group bg-white rounded-2xl border border-gray-200/60 p-6 shadow-md shadow-gray-200/30 transition-all duration-300 hover:shadow-xl hover:shadow-green-200/40 hover:-translate-y-1 hover:border-green-300/40">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-gradient-to-br from-green-50 to-green-100 rounded-xl group-hover:scale-110 transition-transform duration-300">
              <MessageSquare className="h-5 w-5 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">SMS Provider</h3>
          </div>
          
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-3 border-gray-200 border-t-[#02665e]"></div>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                {smsStatus.configured ? (
                  <div className="flex items-center gap-2.5 px-3 py-1.5 bg-green-50 rounded-lg border border-green-200 animate-in fade-in slide-in-from-left-4 duration-500">
                    <CheckCircle2 className="h-5 w-5 text-green-600 animate-in zoom-in duration-300" />
                    <span className="text-sm font-semibold text-green-700">Configured</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2.5 px-3 py-1.5 bg-red-50 rounded-lg border border-red-200 animate-in fade-in slide-in-from-left-4 duration-500">
                    <XCircle className="h-5 w-5 text-red-600 animate-in zoom-in duration-300" />
                    <span className="text-sm font-semibold text-red-700">Not Configured</span>
                  </div>
                )}
              </div>
              
              {smsStatus.provider && (
                <div className="text-sm text-gray-700 bg-green-50/50 px-3 py-2 rounded-lg border border-green-100">
                  <span className="font-semibold text-gray-900">Provider:</span> <span className="text-green-700">{smsStatus.provider}</span>
                </div>
              )}
              
              {smsStatus.details && (
                <div className="text-xs text-gray-600 bg-gradient-to-r from-gray-50 to-gray-100/50 px-3 py-2.5 rounded-lg border border-gray-200/60">
                  {smsStatus.details}
                </div>
              )}

              <div className="pt-5 border-t border-gray-200/60">
                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
                  Configuration
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
                </h4>
                <div className="space-y-2 text-xs text-gray-600">
                  <div>
                    <span className="font-medium">Africa&apos;s Talking (Recommended):</span>
                    <ul className="list-disc list-inside ml-2 mt-1 space-y-1">
                      <li><code>SMS_PROVIDER=africastalking</code></li>
                      <li><code>AFRICASTALKING_USERNAME</code></li>
                      <li><code>AFRICASTALKING_API_KEY</code></li>
                      <li><code>AFRICASTALKING_SENDER_ID</code> (optional)</li>
                    </ul>
                  </div>
                  <div>
                    <span className="font-medium">Twilio (Alternative):</span>
                    <ul className="list-disc list-inside ml-2 mt-1 space-y-1">
                      <li><code>SMS_PROVIDER=twilio</code></li>
                      <li><code>TWILIO_ACCOUNT_SID</code></li>
                      <li><code>TWILIO_AUTH_TOKEN</code></li>
                      <li><code>TWILIO_PHONE_NUMBER</code></li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <a
                  href="https://africastalking.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-[#02665e] hover:text-[#014e47] font-medium transition-colors duration-200 hover:underline"
                >
                  Get Africa&apos;s Talking Credentials <ExternalLink className="w-3 h-3 transition-transform duration-200 group-hover:translate-x-0.5" />
                </a>
                <button
                  onClick={() => setOpenModal('sms')}
                  className="ml-auto inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-[#02665e] to-[#014e47] rounded-lg hover:from-[#014e47] hover:to-[#02665e] transition-all duration-300 hover:scale-105 hover:shadow-lg shadow-[#02665e]/20"
                >
                  <Settings className="w-3.5 h-3.5" /> Configure
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Cloudinary Integration Status */}
        <div className="group bg-white rounded-2xl border border-gray-200/60 p-6 shadow-md shadow-gray-200/30 transition-all duration-300 hover:shadow-xl hover:shadow-purple-200/40 hover:-translate-y-1 hover:border-purple-300/40">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl group-hover:scale-110 transition-transform duration-300">
              <Cloud className="h-5 w-5 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Cloudinary</h3>
          </div>
          
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-3 border-gray-200 border-t-[#02665e]"></div>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                {cloudinaryStatus.configured ? (
                  <div className="flex items-center gap-2.5 px-3 py-1.5 bg-green-50 rounded-lg border border-green-200 animate-in fade-in slide-in-from-left-4 duration-500">
                    <CheckCircle2 className="h-5 w-5 text-green-600 animate-in zoom-in duration-300" />
                    <span className="text-sm font-semibold text-green-700">Configured</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2.5 px-3 py-1.5 bg-red-50 rounded-lg border border-red-200 animate-in fade-in slide-in-from-left-4 duration-500">
                    <XCircle className="h-5 w-5 text-red-600 animate-in zoom-in duration-300" />
                    <span className="text-sm font-semibold text-red-700">Not Configured</span>
                  </div>
                )}
              </div>
              
              {cloudinaryStatus.details && (
                <div className="text-xs text-gray-600 bg-gradient-to-r from-gray-50 to-gray-100/50 px-3 py-2.5 rounded-lg border border-gray-200/60">
                  {cloudinaryStatus.details}
                </div>
              )}

              <div className="pt-5 border-t border-gray-200/60">
                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
                  Configuration
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
                </h4>
                <div className="text-xs text-gray-600">
                  <ul className="list-disc list-inside space-y-1">
                    <li><code>CLOUDINARY_CLOUD_NAME</code></li>
                    <li><code>CLOUDINARY_API_KEY</code></li>
                    <li><code>CLOUDINARY_API_SECRET</code></li>
                  </ul>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <a
                  href="https://cloudinary.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-[#02665e] hover:text-[#014e47] font-medium transition-colors duration-200 hover:underline"
                >
                  Get Cloudinary Credentials <ExternalLink className="w-3 h-3 transition-transform duration-200 group-hover:translate-x-0.5" />
                </a>
                <button
                  onClick={() => setOpenModal('cloudinary')}
                  className="ml-auto inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-[#02665e] to-[#014e47] rounded-lg hover:from-[#014e47] hover:to-[#02665e] transition-all duration-300 hover:scale-105 hover:shadow-lg shadow-[#02665e]/20"
                >
                  <Settings className="w-3.5 h-3.5" /> Configure
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Documentation Card */}
      <div className="bg-gradient-to-br from-white to-gray-50/50 rounded-2xl border border-gray-200/60 p-6 shadow-lg shadow-gray-200/30 transition-all duration-300 hover:shadow-xl hover:shadow-gray-200/50">
        <div className="flex items-start gap-4">
          <div className="p-2.5 bg-gradient-to-br from-[#02665e]/10 to-[#02665e]/5 rounded-xl">
            <FileText className="h-5 w-5 text-[#02665e]" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold text-gray-900 mb-3">Setup Instructions</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
              <li>Copy <code className="bg-gray-100 px-1.5 py-0.5 rounded">apps/api/.env.example</code> to <code className="bg-gray-100 px-1.5 py-0.5 rounded">apps/api/.env</code></li>
              <li>Fill in your actual API keys and secrets in the <code className="bg-gray-100 px-1.5 py-0.5 rounded">apps/api/.env</code> file</li>
              <li>Restart your API server for changes to take effect</li>
              <li>Never commit <code className="bg-gray-100 px-1.5 py-0.5 rounded">apps/api/.env</code> to git (it&apos;s in .gitignore)</li>
            </ol>
            <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/60 rounded-xl shadow-sm">
              <p className="text-sm text-blue-900 leading-relaxed">
                <strong className="font-semibold">Why environment variables?</strong> Storing secrets in the database is a security risk. 
                Environment variables keep credentials out of your codebase and version control.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Configuration Modals */}
      {openModal === 'email' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200/60">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <Mail className="h-5 w-5 text-blue-600" />
                  </div>
                  Configure Email Provider
                </h2>
                <button
                  onClick={() => setOpenModal(null)}
                  className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg p-1.5 transition-all duration-200"
                  aria-label="Close email configuration modal"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/60 rounded-xl p-4 text-sm text-amber-800 shadow-sm mb-6">
                  Add these environment variables to your <code className="bg-amber-100/80 px-2 py-1 rounded-md font-mono text-xs">apps/api/.env</code> file and restart your API server.
                </div>

                <div className="space-y-6">
                  <div>
                    <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-md text-xs font-semibold">Option 1</span>
                      Resend (Recommended)
                    </h3>
                    <div className="space-y-2">
                      {['RESEND_API_KEY', 'RESEND_FROM_DOMAIN'].map((varName) => (
                        <div key={varName} className="flex items-center gap-2 bg-gradient-to-r from-gray-50 to-gray-100/50 p-3 rounded-lg border border-gray-200/60 hover:border-blue-300 transition-all duration-200 group/item">
                          <code className="flex-1 text-sm font-mono text-gray-800">{varName}{varName === 'RESEND_FROM_DOMAIN' && ' (optional)'}</code>
                          <button
                            onClick={() => copyToClipboard(varName)}
                            className="text-gray-500 hover:text-blue-600 p-1.5 rounded-md hover:bg-blue-50 transition-all duration-200 group-hover/item:scale-110"
                            title="Copy to clipboard"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-md text-xs font-semibold">Option 2</span>
                      SMTP (Fallback)
                    </h3>
                    <div className="space-y-2">
                      {['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS'].map((varName) => (
                        <div key={varName} className="flex items-center gap-2 bg-gradient-to-r from-gray-50 to-gray-100/50 p-3 rounded-lg border border-gray-200/60 hover:border-gray-300 transition-all duration-200 group/item">
                          <code className="flex-1 text-sm font-mono text-gray-800">{varName}</code>
                          <button
                            onClick={() => copyToClipboard(varName)}
                            className="text-gray-500 hover:text-gray-700 p-1.5 rounded-md hover:bg-gray-100 transition-all duration-200 group-hover/item:scale-110"
                            title="Copy to clipboard"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-6 mt-6 border-t border-gray-200/60">
                  <button
                    onClick={handleTestConnection}
                    disabled={testing}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#02665e] to-[#014e47] text-white rounded-lg hover:from-[#014e47] hover:to-[#02665e] disabled:opacity-50 transition-all duration-300 hover:scale-105 hover:shadow-lg shadow-[#02665e]/30 font-semibold text-sm"
                  >
                    <RefreshCw className={`h-4 w-4 ${testing ? 'animate-spin' : ''}`} />
                    Test Connection
                  </button>
                  <a
                    href="https://resend.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 border-2 border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 font-semibold text-sm"
                  >
                    Get Resend API Key <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {openModal === 'sms' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200/60">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                  <div className="p-2 bg-green-50 rounded-lg">
                    <MessageSquare className="h-5 w-5 text-green-600" />
                  </div>
                  Configure SMS Provider
                </h2>
                <button
                  onClick={() => setOpenModal(null)}
                  className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg p-1.5 transition-all duration-200"
                  aria-label="Close SMS configuration modal"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>
              
              <div className="space-y-6">
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/60 rounded-xl p-4 text-sm text-amber-800 shadow-sm mb-6">
                  Add these environment variables to your <code className="bg-amber-100/80 px-2 py-1 rounded-md font-mono text-xs">apps/api/.env</code> file and restart your API server.
                </div>

                <div>
                  <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-md text-xs font-semibold">Option 1</span>
                    Africa&apos;s Talking (Recommended)
                  </h3>
                  <div className="space-y-2">
                    {['SMS_PROVIDER=africastalking', 'AFRICASTALKING_USERNAME', 'AFRICASTALKING_API_KEY', 'AFRICASTALKING_SENDER_ID'].map((varName) => (
                      <div key={varName} className="flex items-center gap-2 bg-gradient-to-r from-gray-50 to-gray-100/50 p-3 rounded-lg border border-gray-200/60 hover:border-green-300 transition-all duration-200 group/item">
                        <code className="flex-1 text-sm font-mono text-gray-800">{varName}{varName === 'AFRICASTALKING_SENDER_ID' && ' (optional)'}</code>
                        <button
                          onClick={() => copyToClipboard(varName.includes('=') ? varName : varName)}
                          className="text-gray-500 hover:text-green-600 p-1.5 rounded-md hover:bg-green-50 transition-all duration-200 group-hover/item:scale-110"
                          title="Copy to clipboard"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-md text-xs font-semibold">Option 2</span>
                    Twilio (Alternative)
                  </h3>
                  <div className="space-y-2">
                    {['SMS_PROVIDER=twilio', 'TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_PHONE_NUMBER'].map((varName) => (
                      <div key={varName} className="flex items-center gap-2 bg-gradient-to-r from-gray-50 to-gray-100/50 p-3 rounded-lg border border-gray-200/60 hover:border-gray-300 transition-all duration-200 group/item">
                        <code className="flex-1 text-sm font-mono text-gray-800">{varName}</code>
                        <button
                          onClick={() => copyToClipboard(varName)}
                          className="text-gray-500 hover:text-gray-700 p-1.5 rounded-md hover:bg-gray-100 transition-all duration-200 group-hover/item:scale-110"
                          title="Copy to clipboard"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-6 mt-6 border-t border-gray-200/60">
                  <button
                    onClick={handleTestConnection}
                    disabled={testing}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#02665e] to-[#014e47] text-white rounded-lg hover:from-[#014e47] hover:to-[#02665e] disabled:opacity-50 transition-all duration-300 hover:scale-105 hover:shadow-lg shadow-[#02665e]/30 font-semibold text-sm"
                  >
                    <RefreshCw className={`h-4 w-4 ${testing ? 'animate-spin' : ''}`} />
                    Test Connection
                  </button>
                  <a
                    href="https://africastalking.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 border-2 border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 font-semibold text-sm"
                  >
                    Get Africa&apos;s Talking Credentials <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {openModal === 'cloudinary' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200/60">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                  <div className="p-2 bg-purple-50 rounded-lg">
                    <Cloud className="h-5 w-5 text-purple-600" />
                  </div>
                  Configure Cloudinary
                </h2>
                <button
                  onClick={() => setOpenModal(null)}
                  className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg p-1.5 transition-all duration-200"
                  aria-label="Close Cloudinary configuration modal"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>
              
              <div className="space-y-6">
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/60 rounded-xl p-4 text-sm text-amber-800 shadow-sm mb-6">
                  Add these environment variables to your <code className="bg-amber-100/80 px-2 py-1 rounded-md font-mono text-xs">apps/api/.env</code> file and restart your API server.
                </div>

                <div>
                  <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-md text-xs font-semibold">Required</span>
                    Environment Variables
                  </h3>
                  <div className="space-y-2">
                    {['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'].map((varName) => (
                      <div key={varName} className="flex items-center gap-2 bg-gradient-to-r from-gray-50 to-gray-100/50 p-3 rounded-lg border border-gray-200/60 hover:border-purple-300 transition-all duration-200 group/item">
                        <code className="flex-1 text-sm font-mono text-gray-800">{varName}</code>
                        <button
                          onClick={() => copyToClipboard(varName)}
                          className="text-gray-500 hover:text-purple-600 p-1.5 rounded-md hover:bg-purple-50 transition-all duration-200 group-hover/item:scale-110"
                          title="Copy to clipboard"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-6 mt-6 border-t border-gray-200/60">
                  <button
                    onClick={handleTestConnection}
                    disabled={testing}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#02665e] to-[#014e47] text-white rounded-lg hover:from-[#014e47] hover:to-[#02665e] disabled:opacity-50 transition-all duration-300 hover:scale-105 hover:shadow-lg shadow-[#02665e]/30 font-semibold text-sm"
                  >
                    <RefreshCw className={`h-4 w-4 ${testing ? 'animate-spin' : ''}`} />
                    Test Connection
                  </button>
                  <a
                    href="https://cloudinary.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 border-2 border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 font-semibold text-sm"
                  >
                    Get Cloudinary Credentials <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
