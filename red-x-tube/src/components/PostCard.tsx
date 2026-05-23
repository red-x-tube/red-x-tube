import { useState, useRef, useEffect } from "react";
import {
  Play, Image, FileText, Lock, ChevronDown, ChevronUp, CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIncrementVideoView, getListVideosQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

type ContentBlock = {
  type: "text" | "image" | "video";
  content?: string | null;
  url?: string | null;
};

type Post = {
  id: number;
  slug: string;
  title: string;
  sections?: string[] | null;
  mediaType: string;
  categoryId?: number | null;
  categoryName?: string | null;
  videoUrl?: string | null;
  imageUrl?: string | null;
  textContent?: string | null;
  thumbnailUrl?: string | null;
  description?: string | null;
  viewCount: number;
  unlockRequired: boolean;
  adsUnlockEnabled: boolean;
  monetagAdsLink?: string | null;
  monetagLinks?: string[] | null;
  adsRequired?: number | null;
  monetagZoneId?: string | null;
  adTimerDuration?: number | null;
  blocks?: ContentBlock[] | null;
};

export function PostCard({ post, defaultExpanded }: { post: Post; defaultExpanded?: boolean }) {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(defaultExpanded ?? false);
  const [unlocked, setUnlocked] = useState(false);
  const [playingBlockIdx, setPlayingBlockIdx] = useState<number | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const viewMutation = useIncrementVideoView();

  const adLinks = (post.monetagLinks?.filter((l) => l?.trim()) ?? []).length > 0
    ? post.monetagLinks!.filter((l) => l?.trim())
    : post.monetagAdsLink ? [post.monetagAdsLink] : [];

  const totalAdsRequired = post.adsRequired ?? (adLinks.length || 3);
  const hasMonetag = !!post.monetagZoneId?.trim();
  const isLocked = post.adsUnlockEnabled && !unlocked && (adLinks.length > 0 || hasMonetag);
  const hasBlocks = Array.isArray(post.blocks) && post.blocks.length > 0;

  const incrementView = () => {
    viewMutation.mutate(
      { id: post.id },
      { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListVideosQueryKey() }) },
    );
  };

  // Called by LockedGate once ALL required ads are fully completed
  const handleAllAdsComplete = () => {
    setUnlocked(true);
    incrementView();
  };

  return (
    <div
      data-testid={`post-card-${post.id}`}
      className="touch-card bg-[#1a1a24] rounded-2xl overflow-hidden border border-white/5 transition-all duration-300 hover:border-purple-500/25 active:scale-[0.985]"
    >
      {!expanded ? (
        <CollapsedCard
          post={post}
          isLocked={isLocked}
          totalAdsRequired={totalAdsRequired}
          hasBlocks={hasBlocks}
          onExpand={() => setExpanded(true)}
        />
      ) : (
        <ExpandedCard
          post={post}
          isLocked={isLocked}
          hasBlocks={hasBlocks}
          totalAdsRequired={totalAdsRequired}
          playingBlockIdx={playingBlockIdx}
          setPlayingBlockIdx={setPlayingBlockIdx}
          videoRef={videoRef}
          onCollapse={() => setExpanded(false)}
          onAllAdsComplete={handleAllAdsComplete}
          onFirstPlay={incrementView}
        />
      )}
    </div>
  );
}

/* ── Collapsed card ──────────────────────────────────────── */
function CollapsedCard({
  post, isLocked, totalAdsRequired, hasBlocks, onExpand,
}: {
  post: Post;
  isLocked: boolean;
  totalAdsRequired: number;
  hasBlocks: boolean;
  onExpand: () => void;
}) {
  const firstImageUrl = hasBlocks
    ? (post.blocks!.find((b) => b.type === "image")?.url ?? null)
    : post.imageUrl;
  const thumbSrc = post.thumbnailUrl ?? firstImageUrl;

  const firstText = hasBlocks
    ? (post.blocks!.find((b) => b.type === "text")?.content ?? null)
    : post.textContent;

  const TypeIcon =
    post.mediaType === "video" ? Play
    : post.mediaType === "image" ? Image
    : FileText;

  return (
    <button
      data-testid={`btn-expand-${post.id}`}
      onClick={onExpand}
      className="block w-full text-left select-none p-0 m-0 appearance-none"
    >
      {/* ── Banner — title lives here ── */}
      <div className="relative h-52 bg-[#0a0a12] overflow-hidden">

        {/* Background content */}
        {thumbSrc ? (
          <img
            src={thumbSrc}
            alt=""
            className="absolute inset-0 block w-full h-full object-cover opacity-100 transition-opacity duration-500"
          />
        ) : post.mediaType === "text" && firstText ? (
          <div className="absolute inset-0 flex items-start p-5 pt-8">
            <p className="text-sm text-white/25 leading-relaxed line-clamp-5 font-medium">
              {firstText}
            </p>
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <TypeIcon className="w-16 h-16 text-white/5" />
          </div>
        )}

        {/* Gradient — stronger at bottom so title is readable */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/10" />

        {/* Play button (centered) — always shown so content looks immediately playable */}
        {post.mediaType === "video" && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-14 h-14 rounded-full bg-purple-600/80 backdrop-blur-sm flex items-center justify-center shadow-[0_0_30px_rgba(168,85,247,0.5)] transition-transform hover:scale-110 active:scale-95">
              <Play className="w-6 h-6 text-white fill-current ml-0.5" />
            </div>
          </div>
        )}

        {/* Category badge — top left */}
        {post.categoryName && (
          <div className="absolute top-3 left-3">
            <span className="bg-pink-500/90 backdrop-blur-sm text-white text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-lg">
              {post.categoryName}
            </span>
          </div>
        )}

        {/* Expand chevron — top right */}
        <div className="absolute top-3 right-3">
          <div className="bg-black/50 backdrop-blur-md rounded-full p-1 border border-white/10">
            <ChevronDown className="w-3.5 h-3.5 text-white/60" />
          </div>
        </div>

        {/* Title — overlaid at bottom of banner */}
        <div className="absolute bottom-0 left-0 right-0 px-3 pb-3 pt-8">
          <h3 className="text-[15px] font-bold text-white line-clamp-2 leading-snug drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]">
            {post.title}
          </h3>
        </div>
      </div>
    </button>
  );
}

/* ── Expanded card ─────────────────────────────────────────── */
function ExpandedCard({
  post, isLocked, hasBlocks, totalAdsRequired,
  playingBlockIdx, setPlayingBlockIdx, videoRef,
  onCollapse, onAllAdsComplete, onFirstPlay,
}: {
  post: Post;
  isLocked: boolean;
  hasBlocks: boolean;
  totalAdsRequired: number;
  playingBlockIdx: number | null;
  setPlayingBlockIdx: (i: number | null) => void;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onCollapse: () => void;
  onAllAdsComplete: () => void;
  onFirstPlay: () => void;
}) {
  return (
    <div>
      {/* Title + collapse */}
      <button
        onClick={onCollapse}
        className="w-full flex items-center justify-between gap-3 px-4 py-3.5 border-b border-white/5 text-left bg-[#1a1a24]"
      >
        <div className="min-w-0 flex-1">
          <h3 className="text-[15px] font-bold text-white/90 line-clamp-2 leading-snug">
            {post.title}
          </h3>
          {post.categoryName && (
            <span className="inline-block mt-1 text-[10px] bg-pink-500/20 text-pink-400 px-1.5 py-0.5 rounded-full uppercase font-bold">
              {post.categoryName}
            </span>
          )}
        </div>
        <ChevronUp className="w-4 h-4 text-white/30 shrink-0" />
      </button>

      {/* Content */}
      {isLocked ? (
        <LockedGate
          post={post}
          totalAdsRequired={totalAdsRequired}
          onAllAdsComplete={onAllAdsComplete}
        />
      ) : hasBlocks ? (
        <BlocksRenderer
          blocks={post.blocks!}
          playingBlockIdx={playingBlockIdx}
          setPlayingBlockIdx={setPlayingBlockIdx}
          videoRef={videoRef}
          onFirstPlay={onFirstPlay}
        />
      ) : (
        <LegacyContent post={post} videoRef={videoRef} onDirectPlay={onFirstPlay} />
      )}

      {!isLocked && post.description && (
        <p className="text-xs text-white/45 leading-relaxed px-4 pt-1 pb-4">{post.description}</p>
      )}
    </div>
  );
}

/* ── Blocks renderer ───────────────────────────────────────── */
function BlocksRenderer({
  blocks, playingBlockIdx, setPlayingBlockIdx, videoRef, onFirstPlay,
}: {
  blocks: ContentBlock[];
  playingBlockIdx: number | null;
  setPlayingBlockIdx: (i: number | null) => void;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onFirstPlay: () => void;
}) {
  return (
    <div className="divide-y divide-white/[0.04]">
      {blocks.map((block, i) => {
        if (block.type === "text" && block.content) {
          return (
            <div key={i} className="px-4 py-4">
              <p className="text-[14px] text-white/80 leading-relaxed whitespace-pre-wrap">{block.content}</p>
            </div>
          );
        }
        if (block.type === "image" && block.url) {
          return (
            <div key={i} className="w-full">
              <img
                src={block.url}
                alt={`Image ${i + 1}`}
                className="block w-full object-contain max-h-[80vh]"
              />
            </div>
          );
        }
        if (block.type === "video" && block.url) {
          return (
            <div key={i} className="aspect-video bg-black">
              {playingBlockIdx === i ? (
                <video
                  ref={videoRef}
                  src={block.url}
                  controls
                  autoPlay
                  playsInline
                  className="w-full h-full object-contain"
                />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center cursor-pointer"
                  onClick={() => {
                    setPlayingBlockIdx(i);
                    if (playingBlockIdx === null) onFirstPlay();
                  }}
                >
                  <div className="w-16 h-16 rounded-full bg-purple-600/80 flex items-center justify-center shadow-[0_0_24px_rgba(168,85,247,0.5)] hover:scale-110 active:scale-95 transition-transform">
                    <Play className="w-7 h-7 text-white fill-current ml-1" />
                  </div>
                </div>
              )}
            </div>
          );
        }
        return null;
      })}
    </div>
  );
}

/* ── Legacy single-media ───────────────────────────────────── */
function LegacyContent({
  post, videoRef, onDirectPlay,
}: {
  post: Post;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onDirectPlay: () => void;
}) {
  const [playing, setPlaying] = useState(false);

  if (post.mediaType === "video") {
    if (playing && post.videoUrl) {
      return (
        <div className="aspect-video bg-black">
          <video ref={videoRef} src={post.videoUrl} controls autoPlay playsInline className="w-full h-full object-contain" />
        </div>
      );
    }
    return (
      <div
        className="aspect-video bg-[#0a0a0f] relative flex items-center justify-center cursor-pointer"
        onClick={() => { setPlaying(true); onDirectPlay(); }}
      >
        {post.thumbnailUrl && (
          <img src={post.thumbnailUrl} alt={post.title} className="absolute inset-0 block w-full h-full object-cover opacity-60" />
        )}
        <div className="relative w-16 h-16 rounded-full bg-purple-600/80 flex items-center justify-center shadow-[0_0_24px_rgba(168,85,247,0.5)] hover:scale-110 active:scale-95 transition-transform z-10">
          <Play className="w-7 h-7 text-white fill-current ml-1" />
        </div>
      </div>
    );
  }
  if (post.mediaType === "image" && post.imageUrl) {
    return <img src={post.imageUrl} alt={post.title} className="block w-full object-contain max-h-[80vh]" />;
  }
  if (post.mediaType === "text" && post.textContent) {
    return (
      <div className="px-4 py-4 bg-[#0d0d14]">
        <FileText className="w-4 h-4 text-purple-400/50 mb-3" />
        <p className="text-[14px] text-white/80 leading-relaxed whitespace-pre-wrap">{post.textContent}</p>
      </div>
    );
  }
  return null;
}

/* ── Locked gate — sequential multi-ad loop ───────────────── */
// phase machine: idle → counting → nextReady (repeat) → allDone
type GatePhase = "idle" | "counting" | "nextReady" | "allDone";

function fireMonetagSdk(zoneId: string) {
  try {
    const fn = (window as unknown as Record<string, unknown>)[`show_${zoneId}`];
    if (typeof fn === "function") (fn as () => void)();
  } catch { /* SDK not ready */ }
}

function LockedGate({
  post, totalAdsRequired, onAllAdsComplete,
}: {
  post: Post;
  totalAdsRequired: number;
  onAllAdsComplete: () => void;
}) {
  const [phase, setPhase] = useState<GatePhase>("idle");
  const [countdown, setCountdown] = useState(0);
  const [sessionDone, setSessionDone] = useState(0); // ads completed this session

  const timerDuration = post.adTimerDuration ?? 15;
  const zoneId = post.monetagZoneId?.trim() ?? "";
  const currentAd = sessionDone + 1; // 1-indexed ad being (or about to be) watched
  const pct = Math.round((sessionDone / totalAdsRequired) * 100);

  // Tick down every second while counting
  useEffect(() => {
    if (phase !== "counting") return;
    if (countdown <= 0) {
      const done = sessionDone + 1;
      setSessionDone(done);
      setPhase(done >= totalAdsRequired ? "allDone" : "nextReady");
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, countdown, sessionDone, totalAdsRequired]);

  // Fire SDK + start timer (shared by first ad and subsequent ads)
  const startAd = () => {
    if (zoneId) fireMonetagSdk(zoneId);
    setCountdown(timerDuration);
    setPhase("counting");
  };

  return (
    <div className="p-5 space-y-5">
      {/* Blurred lock preview with progress */}
      <div className="relative rounded-2xl overflow-hidden bg-[#0d0d14] border border-purple-500/10 flex flex-col items-center justify-center py-10 gap-4">
        {post.thumbnailUrl && (
          <img src={post.thumbnailUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-10 blur-lg" />
        )}
        <div className="relative z-10 w-20 h-20 rounded-full bg-purple-950/60 border-2 border-purple-500/30 flex items-center justify-center shadow-[0_0_30px_rgba(168,85,247,0.25)]">
          <Lock className="w-10 h-10 text-purple-400/80" />
        </div>
        <div className="relative z-10 text-center px-6">
          <p className="text-base font-bold text-white/80">Content Locked</p>
          <p className="text-sm text-white/40 mt-1">
            Watch {totalAdsRequired} ad{totalAdsRequired !== 1 ? "s" : ""} to unlock
          </p>
        </div>
        {/* Progress bar — fills as each ad is completed */}
        <div className="relative z-10 w-full max-w-[200px] h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="relative z-10 text-xs text-white/30 font-mono">{sessionDone}/{totalAdsRequired}</p>
      </div>

      {/* Countdown ring — shown while timer is running */}
      {phase === "counting" && (
        <div className="flex flex-col items-center gap-2 py-2">
          <div className="relative w-20 h-20">
            <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(168,85,247,0.15)" strokeWidth="5" />
              <circle
                cx="40" cy="40" r="34" fill="none"
                stroke="url(#ring-grad)" strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 34}`}
                strokeDashoffset={`${2 * Math.PI * 34 * (countdown / timerDuration)}`}
                className="transition-all duration-1000"
              />
              <defs>
                <linearGradient id="ring-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#a855f7" />
                  <stop offset="100%" stopColor="#ec4899" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-black text-white tabular-nums">{countdown}</span>
            </div>
          </div>
          <p className="text-xs text-white/40">Ad is playing — please wait…</p>
        </div>
      )}

      {/* ── BUTTON STATE MACHINE ── */}

      {/* idle: first ad not yet started */}
      {phase === "idle" && (
        <Button
          data-testid={`btn-unlock-${post.id}`}
          className="w-full h-14 text-base bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 active:scale-95 text-white font-black border-none shadow-[0_0_20px_rgba(168,85,247,0.45)] transition-all"
          onClick={startAd}
        >
          <Play className="w-5 h-5 mr-2 fill-current" />
          Unlock — Watch Ad {currentAd}/{totalAdsRequired}
        </Button>
      )}

      {/* counting: timer running, button disabled with live progress label */}
      {phase === "counting" && (
        <Button
          disabled
          className="w-full h-14 text-sm bg-white/5 border border-white/10 text-white/40 font-black cursor-not-allowed"
        >
          Watch Ad {currentAd}/{totalAdsRequired} (Wait {countdown}s...)
        </Button>
      )}

      {/* nextReady: ad done, more still needed — show next-ad prompt */}
      {phase === "nextReady" && (
        <Button
          data-testid={`btn-next-ad-${post.id}`}
          className="w-full h-14 text-base bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 active:scale-95 text-white font-black border-none shadow-[0_0_20px_rgba(168,85,247,0.45)] transition-all"
          onClick={startAd}
        >
          <Play className="w-5 h-5 mr-2 fill-current" />
          Watch Next Ad ({currentAd}/{totalAdsRequired})
        </Button>
      )}

      {/* allDone: all ads completed — glowing green unlock button */}
      {phase === "allDone" && (
        <Button
          data-testid={`btn-continue-${post.id}`}
          className="w-full h-14 text-base bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 active:scale-95 text-white font-black border-none shadow-[0_0_25px_rgba(16,185,129,0.55)] transition-all animate-pulse"
          onClick={onAllAdsComplete}
        >
          <CheckCircle className="w-5 h-5 mr-2" />
          Continue to Content
        </Button>
      )}
    </div>
  );
}
