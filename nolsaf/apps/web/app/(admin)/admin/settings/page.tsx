"use client";
import { CheckCircle, X, Settings as SettingsIcon } from "lucide-react";
import { useEffect, useState } from "react";
import axios from "axios";

// Use same-origin relative paths so Next.js rewrites proxy to the API in dev
const api = axios.create({ baseURL: "", withCredentials: true });

export default function AdminSettings() {
  const [s,setS]=useState<any>(null);
  const [tab,setTab]=useState<"financial"|"numbering"|"branding"|"notifications">("financial");
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  useEffect(()=>{ 
    api.get("/admin/settings").then(r=>setS(r.data)).catch(err => {
      console.error('Failed to load settings:', err);
      setSaveMessage({type: 'error', text: 'Failed to load settings'});
    });
  },[]);
  
  const save = async () => { 
    setSaving(true);
    setSaveMessage(null);
    try {
      await api.put("/admin/settings", s);
      setSaveMessage({type: 'success', text: 'Settings saved successfully!'});
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (err: any) {
      console.error('Failed to save settings:', err);
      setSaveMessage({type: 'error', text: err?.response?.data?.error || 'Failed to save settings'});
    } finally {
      setSaving(false);
    }
  };

  if (!s) return (
    <div className="flex items-center justify-center py-12">
      <div className="text-center">
        <div className="dot-spinner dot-md mx-auto" aria-hidden>
          <span className="dot dot-blue" />
          <span className="dot dot-black" />
          <span className="dot dot-yellow" />
          <span className="dot dot-green" />
        </div>
        <p className="text-sm text-slate-500 mt-4">Loading settings…</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex flex-col items-center justify-center gap-3">
          <div className="h-16 w-16 rounded-full bg-gradient-to-br from-[#02665e]/10 to-[#014d47]/10 flex items-center justify-center">
            <SettingsIcon className="h-8 w-8 text-[#02665e]" />
          </div>
          <h1 className="text-2xl font-semibold text-center">System Settings</h1>
        </div>

        <div className="flex flex-wrap gap-2">
          {[
            {id: "financial", label: "Financial"},
            {id: "numbering", label: "Numbering"},
            {id: "branding", label: "Branding"},
            {id: "notifications", label: "Notifications"}
          ].map(t=>(
            <button 
              key={t.id} 
              className={`px-4 py-2 rounded-xl border transition-all duration-200 ${
                tab===t.id
                  ?"bg-[#02665e] text-white border-[#02665e] shadow-md"
                  :"bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400"
              }`} 
              onClick={()=>setTab(t.id as any)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {saveMessage && (
          <div className={`rounded-lg border-2 p-4 ${
            saveMessage.type === 'success' 
              ? 'bg-green-50 border-green-200 text-green-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            <div className="flex items-center gap-2">
              {saveMessage.type === 'success' ? (
                <CheckCircle className="h-5 w-5" />
              ) : (
                <X className="h-5 w-5" />
              )}
              <span className="font-medium">{saveMessage.text}</span>
            </div>
          </div>
        )}

        {tab==="financial" && <Financial s={s} setS={setS} />}
        {tab==="numbering"  && <Numbering  s={s} setS={setS} />}
        {tab==="branding"   && <Branding   s={s} setS={setS} />}
        {tab==="notifications" && <Notifications s={s} setS={setS} />}

        <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
          <button 
            className={`px-6 py-2.5 rounded-xl font-semibold transition-all duration-200 ${
              saving
                ? 'bg-gray-400 text-white cursor-not-allowed'
                : 'bg-[#02665e] text-white hover:bg-[#014d47] hover:shadow-md active:scale-95'
            }`} 
            onClick={save}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
          {saving && (
            <span className="text-sm text-gray-500">Please wait while settings are being saved...</span>
          )}
        </div>
      </div>
    </div>
  );
}

function Financial({s,setS}:{s:any;setS:any}){
  return <div className="bg-white border rounded-2xl p-3 grid md:grid-cols-3 gap-3">
    <Num label="Commission %" value={s.commissionPercent} onChange={v=>setS({...s, commissionPercent:v})}/>
    <Num label="Tax %" value={s.taxPercent} onChange={v=>setS({...s, taxPercent:v})}/>
    <Input label="Currency" value={s.currency} onChange={v=>setS({...s, currency:v})}/>
  </div>;
}
function Numbering({s,setS}:{s:any;setS:any}){
  return <div className="bg-white border rounded-2xl p-3 grid md:grid-cols-2 gap-3">
    <Input label="Invoice prefix" value={s.invoicePrefix} onChange={v=>setS({...s, invoicePrefix:v})}/>
    <Num label="Invoice next seq" value={s.invoiceSeq} onChange={v=>setS({...s, invoiceSeq:v})}/>
    <Input label="Receipt prefix" value={s.receiptPrefix} onChange={v=>setS({...s, receiptPrefix:v})}/>
    <Num label="Receipt next seq" value={s.receiptSeq} onChange={v=>setS({...s, receiptSeq:v})}/>
  </div>;
}
function Branding({s,setS}:{s:any;setS:any}){
  return <div className="bg-white border rounded-2xl p-3 grid md:grid-cols-2 gap-3">
    <ColorInput label="Brand color primary" value={s.brandColorPrimary||"#02665e"} onChange={v=>setS({...s, brandColorPrimary:v})}/>
    <ColorInput label="Brand color secondary" value={s.brandColorSecondary||"#014d47"} onChange={v=>setS({...s, brandColorSecondary:v})}/>
    <Input label="Logo URL" value={s.brandLogoUrl||""} onChange={v=>setS({...s, brandLogoUrl:v})}/>
    <Input label="Logo (dark) URL" value={s.brandLogoDarkUrl||""} onChange={v=>setS({...s, brandLogoDarkUrl:v})}/>
  </div>;
}
function Notifications({s,setS}:{s:any;setS:any}){
  return <div className="bg-white border rounded-2xl p-3 grid md:grid-cols-2 gap-3">
    <Toggle label="Email enabled" value={s.emailEnabled} onChange={v=>setS({...s, emailEnabled:v})}/>
    <Toggle label="SMS enabled" value={s.smsEnabled} onChange={v=>setS({...s, smsEnabled:v})}/>
  </div>;
}
function Input({label,value,onChange,description}:{label:string;value:string;onChange:(v:string)=>void;description?:string}){
  return (
    <label className="text-sm grid gap-2">
      <span className="font-medium text-gray-700">{label}</span>
      <input 
        className="border-2 border-gray-300 rounded-xl px-4 py-2.5 focus:border-[#02665e] focus:ring-2 focus:ring-[#02665e]/20 outline-none transition-all duration-200" 
        value={value} 
        onChange={e=>onChange(e.target.value)} 
      />
      {description && <span className="text-xs text-gray-500">{description}</span>}
    </label>
  );
}

function Num({label,value,onChange,description,min,max}:{label:string;value:number;onChange:(v:number)=>void;description?:string;min?:number;max?:number}){
  return (
    <label className="text-sm grid gap-2">
      <span className="font-medium text-gray-700">{label}</span>
      <input 
        type="number" 
        className="border-2 border-gray-300 rounded-xl px-4 py-2.5 focus:border-[#02665e] focus:ring-2 focus:ring-[#02665e]/20 outline-none transition-all duration-200" 
        value={value || 0} 
        onChange={e=>onChange(Number(e.target.value))}
        min={min}
        max={max}
      />
      {description && <span className="text-xs text-gray-500">{description}</span>}
    </label>
  );
}

function ColorInput({label,value,onChange,description}:{label:string;value:string;onChange:(v:string)=>void;description?:string}){
  return (
    <label className="text-sm grid gap-2">
      <span className="font-medium text-gray-700">{label}</span>
      <div className="flex items-center gap-3">
        <input 
          type="color" 
          className="h-12 w-20 border-2 border-gray-300 rounded-lg cursor-pointer focus:border-[#02665e] focus:ring-2 focus:ring-[#02665e]/20 outline-none transition-all duration-200" 
          value={value || "#02665e"} 
          onChange={e=>onChange(e.target.value)}
        />
        <input 
          type="text" 
          className="flex-1 border-2 border-gray-300 rounded-xl px-4 py-2.5 focus:border-[#02665e] focus:ring-2 focus:ring-[#02665e]/20 outline-none transition-all duration-200 font-mono text-sm" 
          value={value || ""} 
          onChange={e=>onChange(e.target.value)}
          placeholder="#000000"
        />
      </div>
      {description && <span className="text-xs text-gray-500">{description}</span>}
    </label>
  );
}

function Toggle({label,value,onChange,description}:{label:string;value:boolean;onChange:(v:boolean)=>void;description?:string}){
  return (
    <label className="text-sm grid gap-2">
      <div className="flex items-center justify-between">
        <span className="font-medium text-gray-700">{label}</span>
        <div className="relative inline-flex items-center cursor-pointer">
          <input 
            type="checkbox" 
            checked={value || false} 
            onChange={e=>onChange(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#02665e]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#02665e]"></div>
        </div>
      </div>
      {description && <span className="text-xs text-gray-500">{description}</span>}
    </label>
  );
}
