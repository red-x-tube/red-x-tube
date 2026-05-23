import { useState, useEffect, useRef } from "react";
import { Layout } from "@/components/Layout";
import {
  Phone, Clock, X, Crown, PhoneOff,
  Mic, MicOff, Volume2, VolumeX, Video, VideoOff,
} from "lucide-react";
import { useLocation } from "wouter";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

interface Girl {
  id: number;
  name: string;
  imageUrl: string | null;
  age: number;
  serviceTime: string;
  isOnline: boolean;
}

type Phase = "idle" | "ringing" | "diamond";

interface BusyState {
  [id: number]: number; // seconds remaining
}

function pickBusyGirls(girls: Girl[]): BusyState {
  const count = Math.floor(Math.random() * 2) + 2; // 2 or 3
  const shuffled = [...girls].sort(() => Math.random() - 0.5).slice(0, count);
  const state: BusyState = {};
  for (const g of shuffled) {
    state[g.id] = (Math.floor(Math.random() * 15) + 1) * 60; // 1-15 min in seconds
  }
  return state;
}

export default function VideoCall() {
  const [girls, setGirls] = useState<Girl[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [phase, setPhase] = useState<Phase>("idle");
  const [callingGirl, setCallingGirl] = useState<Girl | null>(null);
  const [busyState, setBusyState] = useState<BusyState>({});
  const [, setLocation] = useLocation();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch(`${BASE}/api/video-call-girls`)
      .then((r) => r.json())
      .then((data: Girl[]) => {
        const list = Array.isArray(data) ? data : [];
        setGirls(list);
        if (list.length > 0) setBusyState(pickBusyGirls(list));
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, []);

  // Countdown busy timers
  useEffect(() => {
    const iv = setInterval(() => {
      setBusyState((prev) => {
        const next: BusyState = {};
        for (const [id, secs] of Object.entries(prev)) {
          if (secs > 1) next[Number(id)] = secs - 1;
          // drop when hits 0 (girl becomes free)
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  function handleCall(girl: Girl) {
    setCallingGirl(girl);
    setPhase("ringing");
    timerRef.current = setTimeout(() => setPhase("diamond"), 3500);
  }

  function handleEndCall() {
    if (timerRef.current) clearTimeout(timerRef.current);
    setPhase("idle");
    setCallingGirl(null);
  }

  function handleBuy() {
    handleEndCall();
    setLocation("/paid");
  }

  return (
    <Layout>
      <div className="p-4">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-black text-white italic tracking-tight">🎥 VIDEO CALL</h2>
          <p className="text-xs text-white/40 mt-1.5">
            {isLoading ? "Loading..." : `আমাদের বর্তমান কল সার্ভিস গার্লস: ${girls.length} জন`}
          </p>
        </div>

        {isLoading ? (
          <div className="text-center text-white/50 py-16 text-sm">Loading...</div>
        ) : girls.length === 0 ? (
          <div className="text-center text-white/50 py-16 text-sm">No profiles available yet.</div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {girls.map((girl) => (
              <GirlCard
                key={girl.id}
                girl={girl}
                busySecs={busyState[girl.id] ?? null}
                onCall={handleCall}
              />
            ))}
          </div>
        )}
      </div>

      {phase === "ringing" && callingGirl && (
        <RingingScreen girl={callingGirl} onEnd={handleEndCall} />
      )}

      {phase === "diamond" && callingGirl && (
        <DiamondPopup name={callingGirl.name} onClose={handleEndCall} onBuy={handleBuy} />
      )}
    </Layout>
  );
}

function fmtTime(secs: number) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

function GirlCard({
  girl,
  busySecs,
  onCall,
}: {
  girl: Girl;
  busySecs: number | null;
  onCall: (g: Girl) => void;
}) {
  const isBusy = busySecs !== null;

  return (
    <div className="bg-[#1a1a24] rounded-2xl border border-white/5 overflow-hidden flex flex-col">
      <div className="relative">
        <div className="w-full aspect-[3/4] bg-gradient-to-br from-purple-900/40 to-pink-900/40 flex items-center justify-center overflow-hidden">
          {girl.imageUrl ? (
            <img src={girl.imageUrl} alt={girl.name} className={`w-full h-full object-cover ${isBusy ? "grayscale opacity-60" : ""}`} />
          ) : (
            <span className="text-5xl font-black text-white/20">{girl.name[0]?.toUpperCase()}</span>
          )}
        </div>

        <div className="absolute top-2 right-2">
          {isBusy ? (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-500/90 text-white">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              Busy
            </span>
          ) : (
            <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${girl.isOnline ? "bg-green-500/90 text-white" : "bg-white/10 text-white/50"}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${girl.isOnline ? "bg-white animate-pulse" : "bg-white/40"}`} />
              {girl.isOnline ? "Online" : "Offline"}
            </span>
          )}
        </div>

        {isBusy && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-black/70 rounded-xl px-3 py-2 text-center">
              <p className="text-[10px] text-orange-300 font-bold">অন্যের সাথে কলে</p>
              <p className="text-white font-black text-xs mt-0.5">{fmtTime(busySecs!)}</p>
              <p className="text-white/40 text-[9px]">পরে কল করুন</p>
            </div>
          </div>
        )}
      </div>

      <div className="p-3 flex flex-col gap-2 flex-1">
        <div>
          <h3 className="font-bold text-white text-sm leading-tight">{girl.name}</h3>
          <p className="text-xs text-white/40">Age: {girl.age}</p>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-white/40">
          <Clock className="w-3 h-3 shrink-0" />
          <span className="truncate">{girl.serviceTime}</span>
        </div>

        {isBusy ? (
          <div className="mt-auto w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400/70 text-xs font-bold cursor-not-allowed select-none">
            <Phone className="w-3.5 h-3.5" />
            {fmtTime(busySecs!)} পরে
          </div>
        ) : (
          <button
            onClick={() => onCall(girl)}
            className="mt-auto w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 active:scale-95 transition-all text-white text-xs font-bold"
          >
            <Phone className="w-3.5 h-3.5" /> Call
          </button>
        )}
      </div>
    </div>
  );
}

function RingingScreen({ girl, onEnd }: { girl: Girl; onEnd: () => void }) {
  const [dots, setDots] = useState(".");
  const [muted, setMuted] = useState(false);
  const [speaker, setSpeaker] = useState(true);
  const [camOn, setCamOn] = useState(true);

  useEffect(() => {
    const iv = setInterval(() => setDots((d) => (d.length >= 3 ? "." : d + ".")), 500);
    return () => clearInterval(iv);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-[#0a0a12]/97 backdrop-blur-xl pb-14 pt-16">
      {girl.imageUrl && (
        <img src={girl.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-10 blur-2xl scale-110" />
      )}

      {/* Top — name & status */}
      <div className="relative z-10 text-center space-y-1">
        <h2 className="text-2xl font-black text-white">{girl.name}</h2>
        <p className="text-green-400 text-sm font-semibold tracking-widest">
          Calling{dots}
        </p>
      </div>

      {/* Middle — avatar with rings */}
      <div className="relative z-10 flex items-center justify-center">
        <span className="absolute w-52 h-52 rounded-full bg-green-500/8 animate-ping" style={{ animationDuration: "1.4s" }} />
        <span className="absolute w-40 h-40 rounded-full bg-green-500/12 animate-ping" style={{ animationDuration: "1.4s", animationDelay: "0.35s" }} />
        <span className="absolute w-28 h-28 rounded-full bg-green-500/18 animate-ping" style={{ animationDuration: "1.4s", animationDelay: "0.7s" }} />

        <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-green-400/60 shadow-2xl shadow-green-500/30 bg-gradient-to-br from-purple-900 to-pink-900 flex items-center justify-center relative z-10">
          {girl.imageUrl ? (
            <img src={girl.imageUrl} alt={girl.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-5xl font-black text-white/40">{girl.name[0]?.toUpperCase()}</span>
          )}
        </div>
      </div>

      {/* Bottom controls */}
      <div className="relative z-10 w-full px-10 space-y-6">
        {/* Top row controls */}
        <div className="flex items-center justify-around">
          <ControlButton
            icon={muted ? MicOff : Mic}
            label={muted ? "Unmute" : "Mute"}
            active={muted}
            onClick={() => setMuted((v) => !v)}
          />
          <ControlButton
            icon={speaker ? Volume2 : VolumeX}
            label="Speaker"
            active={!speaker}
            onClick={() => setSpeaker((v) => !v)}
          />
          <ControlButton
            icon={camOn ? Video : VideoOff}
            label="Camera"
            active={!camOn}
            onClick={() => setCamOn((v) => !v)}
          />
        </div>

        {/* End call button */}
        <div className="flex flex-col items-center gap-1.5">
          <button
            onClick={onEnd}
            className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-500 active:scale-90 transition-all flex items-center justify-center shadow-2xl shadow-red-500/40"
          >
            <PhoneOff className="w-7 h-7 text-white" />
          </button>
          <p className="text-white/30 text-xs">End Call</p>
        </div>
      </div>
    </div>
  );
}

function ControlButton({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1.5 group">
      <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-90 ${active ? "bg-white/20 text-white" : "bg-white/10 text-white/70 group-hover:bg-white/15"}`}>
        <Icon className="w-6 h-6" />
      </div>
      <span className="text-[10px] text-white/40 font-medium">{label}</span>
    </button>
  );
}

function DiamondPopup({ name, onClose, onBuy }: { name: string; onClose: () => void; onBuy: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="w-full max-w-[430px] bg-[#1a1a24] rounded-3xl border border-purple-500/30 p-6 space-y-5 shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-yellow-500/20 to-amber-500/20 border border-yellow-500/30">
              <Crown className="w-6 h-6 text-yellow-400" />
            </div>
            <div>
              <h3 className="font-black text-white text-lg leading-tight">Diamond Required</h3>
              <p className="text-xs text-white/40 mt-0.5">{name}-কে call করতে</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full text-white/40 hover:text-white hover:bg-white/10 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-[#0d0d14] rounded-2xl p-4 border border-white/5 text-center space-y-2">
          <p className="text-2xl">💎</p>
          <p className="text-white font-bold text-sm">
            আপনাকে <span className="text-yellow-400">Diamond Package</span> কিনতে হবে
          </p>
          <p className="text-white/50 text-xs leading-relaxed">
            Diamond Package কিনলে আপনি সব মেয়েদের সাথে unlimited video call করতে পারবেন।
          </p>
        </div>

        <div className="space-y-2">
          <button
            onClick={onBuy}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 active:scale-95 transition-all text-black font-black text-sm flex items-center justify-center gap-2"
          >
            <Crown className="w-4 h-4" /> Diamond Package কিনুন
          </button>
          <button
            onClick={onClose}
            className="w-full py-3 rounded-2xl bg-white/5 hover:bg-white/10 active:scale-95 transition-all text-white/60 font-bold text-sm"
          >
            পরে করবো
          </button>
        </div>
      </div>
    </div>
  );
}
