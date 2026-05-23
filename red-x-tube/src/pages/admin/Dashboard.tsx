import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import {
  useAdminVerify, useGetAdminStats, useAdminLogout,
  useListCategories, useCreateCategory, useDeleteCategory,
  useListSocialLinks, useCreateSocialLink, useDeleteSocialLink,
  useListVideos, useCreateVideo, useDeleteVideo,
  getListCategoriesQueryKey, getListVideosQueryKey, getListSocialLinksQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FileUploadInput } from "@/components/FileUploadInput";
import {
  LogOut, LayoutDashboard, FileText, Folder, Link as LinkIcon,
  Trash2, Plus, Eye, Video, Image, AlignLeft, ArrowUp, ArrowDown,
  GripVertical, ChevronDown, Package, Settings, CreditCard, Pencil, X, PhoneCall,
  Clock, Wifi, WifiOff, Send, CheckCircle2, Upload, Radio,
} from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

type TabKey = "posts" | "categories" | "links" | "packages" | "payments" | "settings" | "videocall" | "channel";
type Section = "home" | "free" | "paid";
type BlockType = "text" | "image" | "video";
type EditorBlock = { id: string; type: BlockType; content: string; url: string };

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

async function adminFetch(path: string, opts?: RequestInit) {
  const r = await fetch(`${BASE}/api${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(opts?.headers ?? {}) },
    ...opts,
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const { isError, isLoading: isVerifying } = useAdminVerify();
  const { data: stats } = useGetAdminStats();
  const logout = useAdminLogout({ mutation: { onSuccess: () => setLocation("/admin") } });
  const [activeTab, setActiveTab] = useState<TabKey>("posts");

  useEffect(() => { if (isError) setLocation("/admin"); }, [isError, setLocation]);

  if (isVerifying || isError) {
    return <div className="min-h-screen bg-[#0d0d14] flex items-center justify-center text-white">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-[#0d0d14] text-white">
      <header className="border-b border-white/5 bg-[#1a1a24] px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-500/20 rounded-lg"><LayoutDashboard className="w-5 h-5 text-purple-400" /></div>
          <div>
            <h1 className="font-bold text-lg tracking-tight leading-none">Admin Console</h1>
            <p className="text-xs text-white/40 mt-0.5">Red-X Tube</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={() => logout.mutate()} className="text-white/60 hover:text-white">
          <LogOut className="w-4 h-4 mr-2" /> Logout
        </Button>
      </header>

      <main className="max-w-5xl mx-auto p-6 space-y-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="Total Posts" value={stats?.totalVideos ?? 0} icon={FileText} color="text-purple-400" bg="bg-purple-500/10" border="border-purple-500/20" />
          <StatCard title="Total Views" value={stats?.totalViews ?? 0} icon={Eye} color="text-pink-400" bg="bg-pink-500/10" border="border-pink-500/20" />
          <StatCard title="Categories" value={stats?.categoryCount ?? 0} icon={Folder} color="text-blue-400" bg="bg-blue-500/10" border="border-blue-500/20" />
          <StatCard title="Social Links" value={stats?.socialLinkCount ?? 0} icon={LinkIcon} color="text-emerald-400" bg="bg-emerald-500/10" border="border-emerald-500/20" />
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[["Home Posts", stats?.homeCount ?? 0, "text-white"], ["Free Posts", stats?.freeCount ?? 0, "text-purple-400"], ["Paid Posts", stats?.paidCount ?? 0, "text-pink-400"]].map(([label, val, cls]) => (
            <div key={label as string} className="bg-[#1a1a24] rounded-xl border border-white/5 p-4 text-center">
              <div className={`text-2xl font-black ${cls}`}>{val}</div>
              <div className="text-xs text-white/40 mt-1">{label}</div>
            </div>
          ))}
        </div>

        <div className="flex gap-2 border-b border-white/10 pb-4 flex-wrap">
          <TabButton active={activeTab === "posts"} onClick={() => setActiveTab("posts")} icon={FileText}>Posts</TabButton>
          <TabButton active={activeTab === "categories"} onClick={() => setActiveTab("categories")} icon={Folder}>Categories</TabButton>
          <TabButton active={activeTab === "links"} onClick={() => setActiveTab("links")} icon={LinkIcon}>Links</TabButton>
          <TabButton active={activeTab === "packages"} onClick={() => setActiveTab("packages")} icon={Package}>Packages</TabButton>
          <TabButton active={activeTab === "payments"} onClick={() => setActiveTab("payments")} icon={CreditCard}>Payments</TabButton>
          <TabButton active={activeTab === "settings"} onClick={() => setActiveTab("settings")} icon={Settings}>Settings</TabButton>
          <TabButton active={activeTab === "videocall"} onClick={() => setActiveTab("videocall")} icon={PhoneCall}>Video Call</TabButton>
          <TabButton active={activeTab === "channel"} onClick={() => setActiveTab("channel")} icon={Radio}>Channel</TabButton>
        </div>

        {activeTab === "posts" && <PostManager />}
        {activeTab === "categories" && <CategoryManager />}
        {activeTab === "links" && <LinkManager />}
        {activeTab === "packages" && <PackageManager />}
        {activeTab === "payments" && <PaymentMethodManager />}
        {activeTab === "settings" && <SiteSettingsManager />}
        {activeTab === "videocall" && <VideoCallGirlsManager />}
        {activeTab === "channel" && <ChannelPostManager />}
      </main>
    </div>
  );
}

/* ── shared ─────────────────────────────────────────────────── */

function TabButton({ active, onClick, icon: Icon, children }: { active: boolean; onClick: () => void; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-colors ${active ? "bg-purple-500/20 text-purple-400" : "text-white/50 hover:text-white/80 hover:bg-white/5"}`}>
      <Icon className="w-4 h-4" />{children}
    </button>
  );
}

function StatCard({ title, value, icon: Icon, color, bg, border }: { title: string; value: number; icon: React.ComponentType<{ className?: string }>; color: string; bg: string; border: string }) {
  return (
    <div className="p-6 rounded-2xl bg-[#1a1a24] border border-white/5 flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${bg} ${border} border`}><Icon className={`w-5 h-5 ${color}`} /></div>
        <span className="text-sm font-medium text-white/60">{title}</span>
      </div>
      <div className="text-3xl font-black tracking-tight">{value}</div>
    </div>
  );
}

/* ── Section checkboxes ─────────────────────────────────────── */
const ALL_SECTIONS: Section[] = ["home", "free", "paid"];
const SECTION_LABELS: Record<Section, string> = { home: "Home", free: "Free", paid: "Paid" };
const SECTION_ACTIVE: Record<Section, string> = {
  home: "bg-white/10 border-white/50 text-white",
  free: "bg-purple-500/20 border-purple-500/70 text-purple-300",
  paid: "bg-pink-500/20 border-pink-500/70 text-pink-300",
};
const SECTION_INACTIVE: Record<Section, string> = {
  home: "border-white/20 text-white/40",
  free: "border-purple-500/30 text-purple-400/50",
  paid: "border-pink-500/30 text-pink-400/50",
};

function SectionCheckboxes({ selected, onToggle }: { selected: Section[]; onToggle: (s: Section) => void }) {
  return (
    <div>
      <Label className="text-white/70 text-xs uppercase tracking-wider">Sections (select one or more)</Label>
      <div className="flex gap-3 mt-2">
        {ALL_SECTIONS.map((s) => {
          const active = selected.includes(s);
          return (
            <button key={s} type="button" data-testid={`section-checkbox-${s}`} onClick={() => onToggle(s)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-bold transition-all ${active ? SECTION_ACTIVE[s] : `bg-[#0d0d14] ${SECTION_INACTIVE[s]} hover:opacity-80`}`}>
              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${active ? "border-current bg-current" : "border-current"}`}>
                {active && <div className="w-2 h-2 rounded-sm bg-[#0d0d14]" />}
              </div>
              {SECTION_LABELS[s]}
            </button>
          );
        })}
      </div>
      {selected.length > 1 && <p className="text-[11px] text-purple-400/70 mt-1.5">Post appears in: {selected.map(s => SECTION_LABELS[s]).join(", ")}</p>}
    </div>
  );
}

/* ── Block editor ───────────────────────────────────────────── */
const BLOCK_CONFIG: Record<BlockType, { label: string; icon: React.ComponentType<{ className?: string }>; color: string; bg: string }> = {
  text:  { label: "Text Block", icon: AlignLeft, color: "text-blue-400",    bg: "bg-blue-500/10 border-blue-500/20"    },
  image: { label: "Image",      icon: Image,     color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
  video: { label: "Video",      icon: Video,     color: "text-purple-400",  bg: "bg-purple-500/10 border-purple-500/20" },
};

function BlockEditor({ blocks, onChange }: { blocks: EditorBlock[]; onChange: (b: EditorBlock[]) => void }) {
  const [addMenuOpen, setAddMenuOpen] = useState(false);

  const addBlock  = (type: BlockType) => { onChange([...blocks, { id: crypto.randomUUID(), type, content: "", url: "" }]); setAddMenuOpen(false); };
  const removeBlock = (id: string) => onChange(blocks.filter(b => b.id !== id));
  const updateBlock = (id: string, patch: Partial<EditorBlock>) => onChange(blocks.map(b => b.id === id ? { ...b, ...patch } : b));
  const moveBlock = (id: string, dir: -1 | 1) => {
    const idx = blocks.findIndex(b => b.id === id);
    if (idx < 0) return;
    const next = [...blocks];
    const swap = idx + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[idx], next[swap]] = [next[swap], next[idx]];
    onChange(next);
  };

  return (
    <div className="space-y-3">
      <Label className="text-white/70 text-xs uppercase tracking-wider">Post Content (Sequential Blocks)</Label>
      {blocks.length === 0 && (
        <div className="border-2 border-dashed border-white/10 rounded-xl p-8 flex flex-col items-center gap-3 text-center">
          <GripVertical className="w-8 h-8 text-white/15" />
          <p className="text-sm text-white/35">No content blocks yet.</p>
          <p className="text-xs text-white/25">Click "Add Block" below to start building your post.</p>
        </div>
      )}

      <div className="space-y-2">
        {blocks.map((block, i) => {
          const cfg = BLOCK_CONFIG[block.type];
          const Icon = cfg.icon;
          return (
            <div key={block.id} className="rounded-xl border border-white/10 bg-[#0d0d14] overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-2 border-b border-white/5">
                <div className={`flex items-center gap-2 px-2 py-1 rounded-lg border text-xs font-bold ${cfg.bg} ${cfg.color}`}>
                  <Icon className="w-3.5 h-3.5" />{cfg.label}
                </div>
                <div className="ml-auto flex items-center gap-1">
                  <button type="button" onClick={() => moveBlock(block.id, -1)} disabled={i === 0}
                    className="p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/5 disabled:opacity-20 disabled:cursor-not-allowed transition-colors">
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button type="button" onClick={() => moveBlock(block.id, 1)} disabled={i === blocks.length - 1}
                    className="p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/5 disabled:opacity-20 disabled:cursor-not-allowed transition-colors">
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button type="button" onClick={() => removeBlock(block.id)}
                    className="p-1.5 rounded-lg text-red-400/50 hover:text-red-400 hover:bg-red-400/10 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="p-3">
                {block.type === "text" && (
                  <Textarea value={block.content} onChange={e => updateBlock(block.id, { content: e.target.value })}
                    placeholder="Write your text here..." rows={4}
                    className="bg-[#1a1a24] border-white/10 resize-none w-full text-sm text-white/80 leading-relaxed" />
                )}
                {block.type === "image" && (
                  <div className="space-y-2">
                    <FileUploadInput label="" value={block.url} onChange={url => updateBlock(block.id, { url })} accept="image/*" placeholder="Paste image URL or upload from device..." />
                    {block.url && <img src={block.url} alt="" className="w-full max-h-48 object-contain rounded-lg border border-white/10 bg-black/20" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />}
                  </div>
                )}
                {block.type === "video" && (
                  <FileUploadInput label="" value={block.url} onChange={url => updateBlock(block.id, { url })} accept="video/*" placeholder="Paste video URL or upload from device..." />
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="relative">
        <Button type="button" variant="outline" onClick={() => setAddMenuOpen(v => !v)}
          className="w-full border-dashed border-purple-500/30 text-purple-400 hover:bg-purple-500/10 hover:border-purple-500/50 bg-transparent gap-2">
          <Plus className="w-4 h-4" /> Add Block
          <ChevronDown className={`w-4 h-4 ml-auto transition-transform ${addMenuOpen ? "rotate-180" : ""}`} />
        </Button>
        {addMenuOpen && (
          <div className="absolute left-0 right-0 top-full mt-1 bg-[#1a1a24] border border-white/10 rounded-xl overflow-hidden shadow-xl z-20">
            {(["text", "image", "video"] as BlockType[]).map(type => {
              const cfg = BLOCK_CONFIG[type];
              const Icon = cfg.icon;
              return (
                <button key={type} type="button" data-testid={`add-block-${type}`} onClick={() => addBlock(type)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left">
                  <div className={`p-2 rounded-lg border ${cfg.bg}`}><Icon className={`w-4 h-4 ${cfg.color}`} /></div>
                  <div>
                    <div className="text-sm font-bold">{cfg.label}</div>
                    <div className="text-xs text-white/35">
                      {type === "text" && "Paragraph, caption, or written content"}
                      {type === "image" && "Upload or link a photo"}
                      {type === "video" && "Upload or link a video"}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Post Manager ───────────────────────────────────────────── */
function PostManager() {
  const { data: posts = [] } = useListVideos();
  const { data: categories = [] } = useListCategories();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [editPost, setEditPost] = useState<any | null>(null);

  const [blocks, setBlocks] = useState<EditorBlock[]>([]);
  const [selectedSections, setSelectedSections] = useState<Section[]>(["home"]);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [adsUnlockEnabled, setAdsUnlockEnabled] = useState(false);
  const [adsRequired, setAdsRequired] = useState(3);
  const [monetagZoneId, setMonetagZoneId] = useState("");
  const [adsgramBlockId, setAdsgramBlockId] = useState("");
  const [adTimerDuration, setAdTimerDuration] = useState(15);
  const [isPinned, setIsPinned] = useState(false);
  const [displayOrder, setDisplayOrder] = useState(0);

  const toggleSection = (s: Section) =>
    setSelectedSections(prev => prev.includes(s) ? (prev.length > 1 ? prev.filter(x => x !== s) : prev) : [...prev, s]);

  const reset = () => {
    setBlocks([]); setTitle(""); setSlug(""); setDescription(""); setThumbnailUrl("");
    setCategoryId(""); setAdsUnlockEnabled(false); setAdsRequired(3);
    setMonetagZoneId(""); setAdsgramBlockId(""); setAdTimerDuration(15);
    setIsPinned(false); setDisplayOrder(0);
    setSelectedSections(["home"]);
  };

  const createMutation = useCreateVideo({
    mutation: { onSuccess: () => { reset(); queryClient.invalidateQueries({ queryKey: getListVideosQueryKey() }); toast({ title: "Post created!" }); } },
  });

  const deleteMutation = useDeleteVideo({
    mutation: { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListVideosQueryKey() }); toast({ title: "Post deleted" }); } },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { toast({ title: "Title is required", variant: "destructive" }); return; }
    if (blocks.length === 0) { toast({ title: "Add at least one content block", variant: "destructive" }); return; }
    if (adsUnlockEnabled && !monetagZoneId.trim() && !adsgramBlockId.trim()) {
      toast({ title: "Monetag Zone ID or Adsgram Block ID required for Ads Unlock", variant: "destructive" }); return;
    }

    const apiBlocks = blocks
      .filter(b => (b.type === "text" && b.content.trim()) || ((b.type === "image" || b.type === "video") && b.url.trim()))
      .map(({ id: _id, content, url, type }) => ({ type, content: type === "text" ? content : null, url: (type === "image" || type === "video") ? url : null }));

    if (apiBlocks.length === 0) { toast({ title: "Fill in at least one block with content", variant: "destructive" }); return; }

    const hasVideo = apiBlocks.some(b => b.type === "video");
    const hasImage = apiBlocks.some(b => b.type === "image");
    const mediaType = hasVideo ? "video" : hasImage ? "image" : "text";

    // Strip any "show_" prefix — store only the numeric zone ID
    const normalizedZoneId = monetagZoneId.trim().replace(/^show_/i, "");

    createMutation.mutate({
      data: {
        slug: slug.trim() || null,
        title: title.trim(),
        sections: selectedSections,
        mediaType,
        blocks: apiBlocks,
        thumbnailUrl: thumbnailUrl.trim() || null,
        description: description.trim() || null,
        categoryId: categoryId && categoryId !== "0" ? Number(categoryId) : null,
        adsUnlockEnabled,
        unlockRequired: adsUnlockEnabled,
        monetagLinks: null,
        adsRequired: adsUnlockEnabled ? Math.max(1, adsRequired) : null,
        monetagAdsLink: null,
        monetagZoneId: adsUnlockEnabled && normalizedZoneId ? normalizedZoneId : null,
        adTimerDuration: adsUnlockEnabled ? adTimerDuration : null,
        adsgramBlockId: adsUnlockEnabled && adsgramBlockId.trim() ? adsgramBlockId.trim() : null,
        isPinned,
        displayOrder,
      } as any,
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#1a1a24] rounded-xl border border-white/5 p-6">
        <div className="flex items-center gap-2 mb-5">
          <Plus className="w-5 h-5 text-purple-400" />
          <h3 className="font-bold text-lg">Create Post</h3>
        </div>

        <form onSubmit={handleCreate} className="space-y-5">
          <div>
            <Label className="text-white/70 text-xs uppercase tracking-wider">Title</Label>
            <Input data-testid="input-post-title" value={title} onChange={e => setTitle(e.target.value)} placeholder="Post title..." className="bg-[#0d0d14] border-white/10 mt-1.5" required />
          </div>

          <div>
            <Label className="text-white/70 text-xs uppercase tracking-wider">Custom Short Link / Slug</Label>
            <div className="relative mt-1.5">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-sm font-mono select-none">rxt/</span>
              <Input
                value={slug}
                onChange={e => setSlug(e.target.value.replace(/\s+/g, "-").toLowerCase())}
                placeholder="rxt1"
                className="bg-[#0d0d14] border-purple-500/20 font-mono text-sm pl-10"
              />
            </div>
            <p className="text-[11px] text-white/30 mt-1">
              Leave blank to auto-generate a random slug. Must be unique.
            </p>
          </div>

          <SectionCheckboxes selected={selectedSections} onToggle={toggleSection} />
          <BlockEditor blocks={blocks} onChange={setBlocks} />

          <FileUploadInput label="Thumbnail (optional — shown in card preview)" value={thumbnailUrl} onChange={setThumbnailUrl} accept="image/*" placeholder="Paste URL or upload image..." />

          <div>
            <Label className="text-white/70 text-xs uppercase tracking-wider">Description (optional)</Label>
            <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Short description..." className="bg-[#0d0d14] border-white/10 mt-1.5" />
          </div>

          {selectedSections.includes("free") && (
            <div>
              <Label className="text-white/70 text-xs uppercase tracking-wider">Category (for Free section)</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger className="bg-[#0d0d14] border-white/10 mt-1.5">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">None</SelectItem>
                  {categories.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="bg-[#0d0d14] rounded-xl border border-white/10 p-4 space-y-4">
            <Label className="text-white/70 text-xs uppercase tracking-wider block">Access Type</Label>
            <div className="flex gap-3">
              <button type="button" data-testid="btn-access-direct" onClick={() => setAdsUnlockEnabled(false)}
                className={`flex-1 py-3 rounded-lg text-sm font-bold border transition-all ${!adsUnlockEnabled ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400" : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10"}`}>
                Direct Access
              </button>
              <button type="button" data-testid="btn-access-ads" onClick={() => setAdsUnlockEnabled(true)}
                className={`flex-1 py-3 rounded-lg text-sm font-bold border transition-all ${adsUnlockEnabled ? "bg-gradient-to-r from-purple-600/30 to-pink-600/30 border-purple-500/50 text-purple-300" : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10"}`}>
                Ads Unlock
              </button>
            </div>
            {!adsUnlockEnabled && <p className="text-xs text-white/30">Content shows immediately — no unlock required.</p>}
            {adsUnlockEnabled && (
              <div className="space-y-4">
                {/* Zone ID + Timer row */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-white/70 text-xs uppercase tracking-wider block mb-1.5">
                      Monetag Zone ID
                    </Label>
                    <Input
                      value={monetagZoneId}
                      onChange={e => setMonetagZoneId(e.target.value)}
                      placeholder="e.g. 11007567"
                      className="bg-[#0d0d14] border-purple-500/20 font-mono text-sm"
                    />
                    <p className="text-[10px] text-white/30 mt-1">Calls <code className="text-purple-400">show_&#123;zoneId&#125;()</code> on click</p>
                  </div>
                  <div>
                    <Label className="text-white/70 text-xs uppercase tracking-wider block mb-1.5">
                      Ad Timer (Seconds)
                    </Label>
                    <Input
                      type="number"
                      min={5}
                      max={60}
                      value={adTimerDuration}
                      onChange={e => setAdTimerDuration(Math.max(5, Number(e.target.value)))}
                      className="bg-[#0d0d14] border-purple-500/20 text-center font-mono text-sm"
                    />
                    <p className="text-[10px] text-white/30 mt-1">Button locked during countdown</p>
                  </div>
                </div>

                <div>
                  <Label className="text-white/70 text-xs uppercase tracking-wider block mb-1.5">
                    Adsgram Block ID <span className="text-white/30 normal-case">(optional)</span>
                  </Label>
                  <Input
                    value={adsgramBlockId}
                    onChange={e => setAdsgramBlockId(e.target.value)}
                    placeholder="e.g. 12345"
                    className="bg-[#0d0d14] border-cyan-500/20 font-mono text-sm"
                  />
                  <p className="text-[10px] text-white/30 mt-1">Alternates with Monetag: Monetag → Adsgram → Monetag…</p>
                </div>

                <div className="bg-[#0d0d14] rounded-xl border border-purple-500/20 p-4 space-y-2">
                  <Label className="text-white/70 text-xs uppercase tracking-wider block">Ads Required to Unlock</Label>
                  <div className="flex items-center gap-3">
                    <Input
                      type="number"
                      min={1}
                      max={20}
                      value={adsRequired}
                      onChange={e => setAdsRequired(Math.max(1, Number(e.target.value)))}
                      className="bg-[#1a1a24] border-purple-500/20 w-24 text-center font-mono"
                    />
                    <p className="text-xs text-white/35">
                      ad{adsRequired !== 1 ? "s" : ""} the user must watch before unlocking content
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Pin + Display Order */}
          <div className="bg-[#0d0d14] rounded-xl border border-white/10 p-4 space-y-3">
            <Label className="text-white/70 text-xs uppercase tracking-wider block">Post Order &amp; Pin</Label>
            <div className="flex items-center gap-4">
              <button type="button" onClick={() => setIsPinned(v => !v)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold border transition-all ${isPinned ? "bg-yellow-500/20 border-yellow-500/50 text-yellow-300" : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10"}`}>
                📌 {isPinned ? "Pinned" : "Pin Post"}
              </button>
              <div className="flex-1">
                <Label className="text-white/50 text-[10px] uppercase tracking-wider block mb-1">Display Order (lower = first)</Label>
                <Input type="number" value={displayOrder} onChange={e => setDisplayOrder(Number(e.target.value))}
                  placeholder="0" className="bg-[#1a1a24] border-white/10 font-mono text-sm" />
              </div>
            </div>
          </div>

          <Button type="submit" data-testid="btn-create-post" disabled={createMutation.isPending}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold shadow-[0_0_15px_rgba(168,85,247,0.3)]">
            <Plus className="w-4 h-4 mr-2" />
            {createMutation.isPending ? "Creating..." : "Publish Post"}
          </Button>
        </form>
      </div>

      {editPost && (
        <EditPostModal
          post={editPost}
          categories={categories}
          onClose={() => setEditPost(null)}
          onSaved={() => { setEditPost(null); queryClient.invalidateQueries({ queryKey: getListVideosQueryKey() }); toast({ title: "Post updated!" }); }}
        />
      )}

      <div className="bg-[#1a1a24] rounded-xl border border-white/5 p-6">
        <h3 className="font-bold mb-4">All Posts ({posts.length})</h3>
        {posts.length === 0 ? <p className="text-sm text-white/30 text-center py-6">No posts yet.</p> : (
          <div className="space-y-2">
            {posts.map(p => {
              const pAny = p as any;
              const postBlocks = pAny.blocks as { type: string }[] | null;
              const postSections = pAny.sections as string[];
              const TypeIcon = p.mediaType === "video" ? Video : p.mediaType === "image" ? Image : AlignLeft;
              return (
                <div key={p.id} data-testid={`post-row-${p.id}`} className="flex items-center justify-between p-3 bg-[#0d0d14] rounded-lg border border-white/5">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-1.5 bg-purple-500/10 rounded-lg shrink-0"><TypeIcon className="w-3.5 h-3.5 text-purple-400" /></div>
                    <div className="min-w-0">
                      <div className="font-bold text-sm line-clamp-1 flex items-center gap-1">
                        {(pAny as any).isPinned && <span title="Pinned">📌</span>}
                        {p.title}
                      </div>
                      <div className="flex gap-1.5 mt-1 flex-wrap">
                        {postSections?.map(s => <span key={s} className="text-[10px] bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded uppercase">{s}</span>)}
                        {(pAny as any).displayOrder !== undefined && (pAny as any).displayOrder !== 0 && <span className="text-[10px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded">#{(pAny as any).displayOrder}</span>}
                        {postBlocks && postBlocks.length > 0 && <span className="text-[10px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded">{postBlocks.length}blk</span>}
                        {p.adsUnlockEnabled && <span className="text-[10px] bg-pink-500/20 text-pink-400 px-1.5 py-0.5 rounded">Ads</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <div className="flex items-center gap-1 text-xs text-white/40"><Eye className="w-3 h-3" />{p.viewCount}</div>
                    <button title={(pAny as any).isPinned ? "Unpin" : "Pin"} onClick={async () => {
                      await fetch(`${BASE}/api/videos/${p.id}`, { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isPinned: !(pAny as any).isPinned }) });
                      queryClient.invalidateQueries({ queryKey: getListVideosQueryKey() });
                    }} className={`text-xs px-2 py-1 rounded font-bold border transition-all ${(pAny as any).isPinned ? "bg-yellow-500/20 border-yellow-500/40 text-yellow-400" : "bg-white/5 border-white/10 text-white/30 hover:text-yellow-400"}`}>
                      📌
                    </button>
                    <Button size="icon" variant="ghost" onClick={() => setEditPost(p)} className="text-purple-400 hover:text-purple-300 hover:bg-purple-400/10 h-8 w-8">
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate({ id: p.id })} className="text-red-400 hover:text-red-300 hover:bg-red-400/10 h-8 w-8">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Edit Post Modal ────────────────────────────────────────── */
function EditPostModal({ post, categories, onClose, onSaved }: {
  post: any;
  categories: any[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const pAny = post as any;

  const [title, setTitle] = useState<string>(post.title ?? "");
  const [slug, setSlug] = useState<string>(pAny.slug ?? "");
  const [description, setDescription] = useState<string>(post.description ?? "");
  const [thumbnailUrl, setThumbnailUrl] = useState<string>(post.thumbnailUrl ?? "");
  const [categoryId, setCategoryId] = useState<string>(post.categoryId ? String(post.categoryId) : "0");
  const [adsUnlockEnabled, setAdsUnlockEnabled] = useState<boolean>(post.adsUnlockEnabled ?? false);
  const [adsRequired, setAdsRequired] = useState<number>(post.adsRequired ?? 3);
  const [monetagZoneId, setMonetagZoneId] = useState<string>(post.monetagZoneId ?? "");
  const [adsgramBlockId, setAdsgramBlockId] = useState<string>(post.adsgramBlockId ?? "");
  const [adTimerDuration, setAdTimerDuration] = useState<number>(post.adTimerDuration ?? 15);
  const [isPinned, setIsPinned] = useState<boolean>(post.isPinned ?? false);
  const [displayOrder, setDisplayOrder] = useState<number>(post.displayOrder ?? 0);
  const [saving, setSaving] = useState(false);

  const rawSections: string[] = pAny.sections ?? (pAny.section ? [pAny.section] : ["home"]);
  const [selectedSections, setSelectedSections] = useState<Section[]>(rawSections as Section[]);

  const rawBlocks: { type: string; content?: string | null; url?: string | null }[] = pAny.blocks ?? [];
  const [blocks, setBlocks] = useState<EditorBlock[]>(
    rawBlocks.map(b => ({ id: crypto.randomUUID(), type: b.type as BlockType, content: b.content ?? "", url: b.url ?? "" }))
  );

  const toggleSection = (s: Section) =>
    setSelectedSections(prev => prev.includes(s) ? (prev.length > 1 ? prev.filter(x => x !== s) : prev) : [...prev, s]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { toast({ title: "Title is required", variant: "destructive" }); return; }
    if (adsUnlockEnabled && !monetagZoneId.trim() && !adsgramBlockId.trim()) {
      toast({ title: "Monetag Zone ID or Adsgram Block ID required for Ads Unlock", variant: "destructive" }); return;
    }

    const apiBlocks = blocks
      .filter(b => (b.type === "text" && b.content.trim()) || ((b.type === "image" || b.type === "video") && b.url.trim()))
      .map(({ content, url, type }) => ({ type, content: type === "text" ? content : null, url: (type === "image" || type === "video") ? url : null }));

    const normalizedZoneId = monetagZoneId.trim().replace(/^show_/i, "");
    const hasVideo = apiBlocks.some(b => b.type === "video");
    const hasImage = apiBlocks.some(b => b.type === "image");
    const mediaType = hasVideo ? "video" : hasImage ? "image" : "text";

    setSaving(true);
    try {
      const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
      const r = await fetch(`${BASE}/api/videos/${post.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          slug: slug.trim().replace(/\s+/g, "-").toLowerCase() || undefined,
          description: description.trim() || null,
          thumbnailUrl: thumbnailUrl.trim() || null,
          sections: selectedSections,
          blocks: apiBlocks.length > 0 ? apiBlocks : undefined,
          mediaType,
          categoryId: categoryId && categoryId !== "0" ? Number(categoryId) : null,
          adsUnlockEnabled,
          unlockRequired: adsUnlockEnabled,
          adsRequired: adsUnlockEnabled ? Math.max(1, adsRequired) : null,
          monetagZoneId: adsUnlockEnabled && normalizedZoneId ? normalizedZoneId : null,
          adTimerDuration: adsUnlockEnabled ? adTimerDuration : null,
          adsgramBlockId: adsUnlockEnabled && adsgramBlockId.trim() ? adsgramBlockId.trim() : null,
          isPinned,
          displayOrder,
          monetagLinks: null,
          monetagAdsLink: null,
        }),
      });
      if (!r.ok) {
        const err = await r.text();
        toast({ title: "Update failed", description: err, variant: "destructive" });
        return;
      }
      onSaved();
    } catch (err: any) {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/80 backdrop-blur-sm overflow-y-auto p-4">
      <div className="w-full max-w-2xl bg-[#1a1a24] rounded-2xl border border-white/10 shadow-2xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 rounded-lg"><Pencil className="w-4 h-4 text-purple-400" /></div>
            <div>
              <h2 className="font-bold text-base leading-none">Edit Post</h2>
              <p className="text-xs text-white/40 mt-0.5 truncate max-w-[280px]">{post.title}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="p-6 space-y-5">
          <div>
            <Label className="text-white/70 text-xs uppercase tracking-wider">Title</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Post title..." className="bg-[#0d0d14] border-white/10 mt-1.5" required />
          </div>

          <div>
            <Label className="text-white/70 text-xs uppercase tracking-wider">Slug / Short Link</Label>
            <div className="relative mt-1.5">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-sm font-mono select-none">rxt/</span>
              <Input
                value={slug}
                onChange={e => setSlug(e.target.value.replace(/\s+/g, "-").toLowerCase())}
                placeholder="rxt1"
                className="bg-[#0d0d14] border-purple-500/20 font-mono text-sm pl-10"
              />
            </div>
          </div>

          <SectionCheckboxes selected={selectedSections} onToggle={toggleSection} />
          <BlockEditor blocks={blocks} onChange={setBlocks} />

          <FileUploadInput label="Thumbnail (optional)" value={thumbnailUrl} onChange={setThumbnailUrl} accept="image/*" placeholder="Paste URL or upload image..." />

          <div>
            <Label className="text-white/70 text-xs uppercase tracking-wider">Description (optional)</Label>
            <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Short description..." className="bg-[#0d0d14] border-white/10 mt-1.5" />
          </div>

          {selectedSections.includes("free") && (
            <div>
              <Label className="text-white/70 text-xs uppercase tracking-wider">Category (for Free section)</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger className="bg-[#0d0d14] border-white/10 mt-1.5">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">None</SelectItem>
                  {categories.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Access Type */}
          <div className="bg-[#0d0d14] rounded-xl border border-white/10 p-4 space-y-4">
            <Label className="text-white/70 text-xs uppercase tracking-wider block">Access Type</Label>
            <div className="flex gap-3">
              <button type="button" onClick={() => setAdsUnlockEnabled(false)}
                className={`flex-1 py-3 rounded-lg text-sm font-bold border transition-all ${!adsUnlockEnabled ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400" : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10"}`}>
                Direct Access
              </button>
              <button type="button" onClick={() => setAdsUnlockEnabled(true)}
                className={`flex-1 py-3 rounded-lg text-sm font-bold border transition-all ${adsUnlockEnabled ? "bg-gradient-to-r from-purple-600/30 to-pink-600/30 border-purple-500/50 text-purple-300" : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10"}`}>
                Ads Unlock
              </button>
            </div>
            {!adsUnlockEnabled && <p className="text-xs text-white/30">Content shows immediately — no unlock required.</p>}
            {adsUnlockEnabled && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-white/70 text-xs uppercase tracking-wider block mb-1.5">Monetag Zone ID</Label>
                    <Input value={monetagZoneId} onChange={e => setMonetagZoneId(e.target.value)} placeholder="e.g. 11007567" className="bg-[#1a1a24] border-purple-500/20 font-mono text-sm" />
                    <p className="text-[10px] text-white/30 mt-1">Calls <code className="text-purple-400">show_{"{zoneId}"}()</code> on click</p>
                  </div>
                  <div>
                    <Label className="text-white/70 text-xs uppercase tracking-wider block mb-1.5">Ad Timer (Seconds)</Label>
                    <Input type="number" min={5} max={60} value={adTimerDuration} onChange={e => setAdTimerDuration(Math.max(5, Number(e.target.value)))} className="bg-[#1a1a24] border-purple-500/20 text-center font-mono text-sm" />
                    <p className="text-[10px] text-white/30 mt-1">Button locked during countdown</p>
                  </div>
                </div>
                <div className="bg-[#0d0d14] rounded-xl border border-purple-500/20 p-4 space-y-2">
                  <Label className="text-white/70 text-xs uppercase tracking-wider block">Ads Required to Unlock</Label>
                  <div className="flex items-center gap-3">
                    <Input type="number" min={1} max={20} value={adsRequired} onChange={e => setAdsRequired(Math.max(1, Number(e.target.value)))} className="bg-[#1a1a24] border-purple-500/20 w-24 text-center font-mono" />
                    <p className="text-xs text-white/35">ad{adsRequired !== 1 ? "s" : ""} the user must watch before unlocking</p>
                  </div>
                </div>

                <div>
                  <Label className="text-white/70 text-xs uppercase tracking-wider block mb-1.5">Adsgram Block ID <span className="text-white/30 normal-case">(optional)</span></Label>
                  <Input value={adsgramBlockId} onChange={e => setAdsgramBlockId(e.target.value)} placeholder="e.g. 12345" className="bg-[#1a1a24] border-cyan-500/20 font-mono text-sm" />
                  <p className="text-[10px] text-white/30 mt-1">Alternates with Monetag: Monetag → Adsgram → Monetag…</p>
                </div>
              </div>
            )}
          </div>

          {/* Pin + Display Order */}
          <div className="bg-[#0d0d14] rounded-xl border border-white/10 p-4 space-y-3">
            <Label className="text-white/70 text-xs uppercase tracking-wider block">Post Order &amp; Pin</Label>
            <div className="flex items-center gap-4">
              <button type="button" onClick={() => setIsPinned(v => !v)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold border transition-all ${isPinned ? "bg-yellow-500/20 border-yellow-500/50 text-yellow-300" : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10"}`}>
                📌 {isPinned ? "Pinned" : "Pin Post"}
              </button>
              <div className="flex-1">
                <Label className="text-white/50 text-[10px] uppercase tracking-wider block mb-1">Display Order (lower = first)</Label>
                <Input type="number" value={displayOrder} onChange={e => setDisplayOrder(Number(e.target.value))} placeholder="0" className="bg-[#1a1a24] border-white/10 font-mono text-sm" />
              </div>
            </div>
          </div>

          {/* Footer buttons */}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1 border-white/10 text-white/60 hover:text-white bg-transparent">
              Cancel
            </Button>
            <Button type="submit" disabled={saving}
              className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold shadow-[0_0_15px_rgba(168,85,247,0.3)]">
              {saving ? "Saving…" : "Save Changes"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Category Manager ───────────────────────────────────────── */
function CategoryManager() {
  const { data: categories = [] } = useListCategories();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const createMutation = useCreateCategory({ mutation: { onSuccess: () => { setName(""); queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() }); toast({ title: "Category created" }); } } });
  const deleteMutation = useDeleteCategory({ mutation: { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() }); toast({ title: "Category deleted" }); } } });
  return (
    <div className="space-y-6">
      <div className="bg-[#1a1a24] rounded-xl border border-white/5 p-6">
        <h3 className="font-bold mb-1">Add Category</h3>
        <p className="text-xs text-white/40 mb-4">Categories appear in the Free section.</p>
        <form onSubmit={e => { e.preventDefault(); if (!name.trim()) return; createMutation.mutate({ data: { name: name.trim() } }); }} className="flex gap-4">
          <Input data-testid="input-category-name" value={name} onChange={e => setName(e.target.value)} placeholder="Category name..." className="bg-[#0d0d14] border-white/10" />
          <Button type="submit" disabled={createMutation.isPending} className="bg-purple-600 hover:bg-purple-500 shrink-0"><Plus className="w-4 h-4 mr-2" />Add</Button>
        </form>
      </div>
      <div className="bg-[#1a1a24] rounded-xl border border-white/5 p-6">
        <h3 className="font-bold mb-4">Categories ({categories.length})</h3>
        {categories.length === 0 ? <p className="text-sm text-white/30 text-center py-6">No categories yet.</p> : (
          <div className="space-y-2">
            {categories.map(c => (
              <div key={c.id} className="flex items-center justify-between p-3 bg-[#0d0d14] rounded-lg border border-white/5">
                <div><span className="font-bold text-sm">{c.name}</span><span className="text-xs text-white/30 ml-2">{c.videoCount} posts</span></div>
                <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate({ id: c.id })} className="text-red-400 hover:text-red-300 hover:bg-red-400/10 h-8 w-8"><Trash2 className="w-3.5 h-3.5" /></Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Link Manager ───────────────────────────────────────────── */
function LinkManager() {
  const { data: links = [] } = useListSocialLinks();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [platform, setPlatform] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [url, setUrl] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const createMutation = useCreateSocialLink({ mutation: { onSuccess: () => { setPlatform(""); setDisplayName(""); setUrl(""); setLogoUrl(""); queryClient.invalidateQueries({ queryKey: getListSocialLinksQueryKey() }); toast({ title: "Link created" }); } } });
  const deleteMutation = useDeleteSocialLink({ mutation: { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListSocialLinksQueryKey() }); toast({ title: "Link deleted" }); } } });
  return (
    <div className="space-y-6">
      <div className="bg-[#1a1a24] rounded-xl border border-white/5 p-6">
        <h3 className="font-bold mb-4">Add Social Link</h3>
        <form onSubmit={e => { e.preventDefault(); if (!platform || !url || !displayName) return; createMutation.mutate({ data: { platform: platform.trim(), url: url.trim(), displayName: displayName.trim(), iconName: platform.trim(), logoUrl: logoUrl.trim() || null } }); }} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><Label className="text-white/70 text-xs uppercase tracking-wider">Platform</Label><Input value={platform} onChange={e => setPlatform(e.target.value)} placeholder="Telegram, YouTube..." className="bg-[#0d0d14] border-white/10 mt-1.5" /></div>
            <div><Label className="text-white/70 text-xs uppercase tracking-wider">Display Name</Label><Input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Red-X Tube Telegram" className="bg-[#0d0d14] border-white/10 mt-1.5" /></div>
          </div>
          <div><Label className="text-white/70 text-xs uppercase tracking-wider">URL</Label><Input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." className="bg-[#0d0d14] border-white/10 mt-1.5" /></div>
          <FileUploadInput label="Logo / Icon (optional)" value={logoUrl} onChange={setLogoUrl} accept="image/*" placeholder="Upload logo or paste image URL..." />
          {logoUrl && <div className="flex items-center gap-3 p-3 bg-[#0d0d14] rounded-lg border border-white/5"><img src={logoUrl} alt="" className="w-10 h-10 rounded-lg object-cover" /><span className="text-xs text-white/40">Logo preview</span></div>}
          <Button type="submit" disabled={createMutation.isPending} className="bg-purple-600 hover:bg-purple-500 w-full"><Plus className="w-4 h-4 mr-2" />Add Link</Button>
        </form>
      </div>
      <div className="bg-[#1a1a24] rounded-xl border border-white/5 p-6">
        <h3 className="font-bold mb-4">Social Links ({links.length})</h3>
        {links.length === 0 ? <p className="text-sm text-white/30 text-center py-6">No links yet.</p> : (
          <div className="space-y-2">
            {links.map(l => (
              <div key={l.id} className="flex items-center justify-between p-3 bg-[#0d0d14] rounded-lg border border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-purple-500/10 flex items-center justify-center overflow-hidden shrink-0">
                    {l.logoUrl ? <img src={l.logoUrl} alt={l.platform} className="w-full h-full object-cover" /> : <span className="font-black text-purple-300 text-sm">{l.platform?.[0]?.toUpperCase()}</span>}
                  </div>
                  <div><div className="font-bold text-sm">{l.displayName}</div><div className="text-xs text-white/30 truncate max-w-xs">{l.url}</div></div>
                </div>
                <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate({ id: l.id })} className="text-red-400 hover:text-red-300 hover:bg-red-400/10 h-8 w-8"><Trash2 className="w-3.5 h-3.5" /></Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Package Manager ────────────────────────────────────────── */
function PackageManager() {
  const { toast } = useToast();
  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("⭐");
  const [priceBdt, setPriceBdt] = useState("");
  const [priceGbp, setPriceGbp] = useState("");
  const [durationValue, setDurationValue] = useState("1");
  const [durationUnit, setDurationUnit] = useState("month");
  const [featuresText, setFeaturesText] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    adminFetch("/admin/packages").then(setPackages).catch(() => setPackages([])).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast({ title: "Name required", variant: "destructive" }); return; }
    setSaving(true);
    try {
      await adminFetch("/admin/packages", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(), emoji, priceBdt: Number(priceBdt), priceGbp,
          durationValue: Number(durationValue) || 1, durationUnit,
          features: featuresText.split("\n").map(f => f.trim()).filter(Boolean),
          sortOrder: Number(sortOrder),
        }),
      });
      setName(""); setEmoji("⭐"); setPriceBdt(""); setPriceGbp(""); setDurationValue("1"); setDurationUnit("month"); setFeaturesText(""); setSortOrder("0");
      toast({ title: "Package created" });
      load();
    } catch { toast({ title: "Failed", variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    await adminFetch(`/admin/packages/${id}`, { method: "DELETE" });
    toast({ title: "Deleted" });
    load();
  };

  const toggleActive = async (pkg: any) => {
    await adminFetch(`/admin/packages/${pkg.id}`, { method: "PUT", body: JSON.stringify({ isActive: !pkg.isActive }) });
    load();
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#1a1a24] rounded-xl border border-white/5 p-6">
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Package className="w-5 h-5 text-purple-400" /> Add Package</h3>
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-white/70 text-xs uppercase tracking-wider">Emoji / Logo</Label>
              <Input value={emoji} onChange={e => setEmoji(e.target.value)} placeholder="⭐" className="bg-[#0d0d14] border-white/10 mt-1.5 text-2xl" maxLength={4} />
            </div>
            <div>
              <Label className="text-white/70 text-xs uppercase tracking-wider">Package Name</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Gold, Diamond..." className="bg-[#0d0d14] border-white/10 mt-1.5" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-white/70 text-xs uppercase tracking-wider">Price (৳ BDT)</Label>
              <Input type="number" value={priceBdt} onChange={e => setPriceBdt(e.target.value)} placeholder="499" className="bg-[#0d0d14] border-white/10 mt-1.5" />
            </div>
            <div>
              <Label className="text-white/70 text-xs uppercase tracking-wider">Price ($ USD)</Label>
              <Input value={priceGbp} onChange={e => setPriceGbp(e.target.value)} placeholder="4.99" className="bg-[#0d0d14] border-white/10 mt-1.5" />
            </div>
          </div>
          <div>
            <Label className="text-white/70 text-xs uppercase tracking-wider">মেয়াদ (Duration)</Label>
            <div className="flex gap-2 mt-1.5">
              <Input
                type="number" min={1} value={durationValue}
                onChange={e => setDurationValue(e.target.value)}
                placeholder="1" className="bg-[#0d0d14] border-white/10 w-24 shrink-0"
              />
              <div className="flex gap-1 flex-1">
                {[{ value: "day", label: "দিন" }, { value: "month", label: "মাস" }, { value: "year", label: "বছর" }].map(opt => (
                  <button key={opt.value} type="button"
                    onClick={() => setDurationUnit(opt.value)}
                    className={`flex-1 py-2 rounded-lg border text-sm font-bold transition-all ${durationUnit === opt.value ? "bg-purple-500/20 border-purple-500/60 text-purple-300" : "bg-[#0d0d14] border-white/10 text-white/40 hover:text-white/70"}`}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div>
            <Label className="text-white/70 text-xs uppercase tracking-wider">Sort Order</Label>
            <Input type="number" value={sortOrder} onChange={e => setSortOrder(e.target.value)} placeholder="0" className="bg-[#0d0d14] border-white/10 mt-1.5" />
          </div>
          <div>
            <Label className="text-white/70 text-xs uppercase tracking-wider">Features (one per line)</Label>
            <Textarea value={featuresText} onChange={e => setFeaturesText(e.target.value)}
              placeholder={"সকল ফ্রি কন্টেন্ট\nGold এক্সক্লুসিভ ভিডিও\nঅ্যাড ছাড়া দেখুন"}
              rows={4} className="bg-[#0d0d14] border-white/10 mt-1.5 resize-none text-sm" />
          </div>
          <Button type="submit" disabled={saving} className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold">
            <Plus className="w-4 h-4 mr-2" />{saving ? "Saving..." : "Add Package"}
          </Button>
        </form>
      </div>

      <div className="bg-[#1a1a24] rounded-xl border border-white/5 p-6">
        <h3 className="font-bold mb-4">Packages ({packages.length})</h3>
        {loading ? <p className="text-sm text-white/30 text-center py-6">Loading...</p> :
         packages.length === 0 ? <p className="text-sm text-white/30 text-center py-6">No packages yet.</p> : (
          <div className="space-y-2">
            {packages.map((pkg: any) => (
              <div key={pkg.id} className="flex items-center justify-between p-3 bg-[#0d0d14] rounded-lg border border-white/5">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{pkg.emoji}</span>
                  <div>
                    <div className="font-bold text-sm">{pkg.name}</div>
                    <div className="text-xs text-white/40">
                      ৳{pkg.priceBdt} / ${pkg.priceGbp} ·{" "}
                      {pkg.durationValue ?? 1} {pkg.durationUnit === "day" ? "দিন" : pkg.durationUnit === "year" ? "বছর" : "মাস"} ·{" "}
                      {pkg.features?.length ?? 0} features
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => toggleActive(pkg)}
                    className={`text-xs px-2 py-1 rounded font-bold border transition-all ${pkg.isActive ? "bg-green-500/20 border-green-500/40 text-green-400" : "bg-white/5 border-white/10 text-white/30"}`}>
                    {pkg.isActive ? "Active" : "Hidden"}
                  </button>
                  <Button size="icon" variant="ghost" onClick={() => handleDelete(pkg.id)} className="text-red-400 hover:text-red-300 hover:bg-red-400/10 h-8 w-8">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Payment Method Manager ─────────────────────────────────── */
function PaymentMethodManager() {
  const { toast } = useToast();
  const [methods, setMethods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [type, setType] = useState<"local" | "global" | "card">("local");
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("💳");
  const [logoUrl, setLogoUrl] = useState("");
  const [numberOrAddress, setNumberOrAddress] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    adminFetch("/admin/payment-methods").then(setMethods).catch(() => setMethods([])).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !numberOrAddress.trim()) { toast({ title: "Name and number required", variant: "destructive" }); return; }
    setSaving(true);
    try {
      await adminFetch("/admin/payment-methods", {
        method: "POST",
        body: JSON.stringify({ type, name: name.trim(), emoji, logoUrl: logoUrl.trim() || null, numberOrAddress: numberOrAddress.trim(), sortOrder: Number(sortOrder) }),
      });
      setName(""); setEmoji("💳"); setLogoUrl(""); setNumberOrAddress(""); setSortOrder("0");
      toast({ title: "Payment method added" });
      load();
    } catch { toast({ title: "Failed", variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    await adminFetch(`/admin/payment-methods/${id}`, { method: "DELETE" });
    toast({ title: "Deleted" });
    load();
  };

  const toggleActive = async (m: any) => {
    await adminFetch(`/admin/payment-methods/${m.id}`, { method: "PUT", body: JSON.stringify({ isActive: !m.isActive }) });
    load();
  };

  const localMethods = methods.filter(m => m.type === "local");
  const globalMethods = methods.filter(m => m.type === "global");
  const cardMethods = methods.filter(m => m.type === "card");

  return (
    <div className="space-y-6">
      <div className="bg-[#1a1a24] rounded-xl border border-white/5 p-6">
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><CreditCard className="w-5 h-5 text-purple-400" /> Add Payment Method</h3>
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <Label className="text-white/70 text-xs uppercase tracking-wider">Type</Label>
            <div className="flex gap-3 mt-2">
              <button type="button" onClick={() => setType("local")}
                className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-all ${type === "local" ? "bg-purple-500/20 border-purple-500/50 text-purple-300" : "bg-white/5 border-white/10 text-white/40"}`}>
                Local (bKash, Nagad…)
              </button>
              <button type="button" onClick={() => setType("global")}
                className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-all ${type === "global" ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-300" : "bg-white/5 border-white/10 text-white/40"}`}>
                Global (TapTap…)
              </button>
              <button type="button" onClick={() => setType("card")}
                className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-all ${type === "card" ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300" : "bg-white/5 border-white/10 text-white/40"}`}>
                💳 Card
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-white/70 text-xs uppercase tracking-wider">Emoji / Icon</Label>
              <Input value={emoji} onChange={e => setEmoji(e.target.value)} placeholder="💳" className="bg-[#0d0d14] border-white/10 mt-1.5 text-2xl" maxLength={4} />
            </div>
            <div>
              <Label className="text-white/70 text-xs uppercase tracking-wider">Name</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="bKash, Nagad, Binance..." className="bg-[#0d0d14] border-white/10 mt-1.5" />
            </div>
          </div>
          <div>
            <Label className="text-white/70 text-xs uppercase tracking-wider">Logo URL <span className="text-white/30 normal-case">(optional)</span></Label>
            <Input value={logoUrl} onChange={e => setLogoUrl(e.target.value)} placeholder="https://example.com/logo.png" className="bg-[#0d0d14] border-white/10 mt-1.5 font-mono text-sm" />
            {logoUrl && <div className="mt-2 flex items-center gap-2"><img src={logoUrl} alt="" className="w-8 h-8 rounded object-contain bg-white/5 p-1" /><span className="text-xs text-white/40">Logo preview</span></div>}
          </div>
          <div>
            <Label className="text-white/70 text-xs uppercase tracking-wider">
              {type === "local" ? "Phone Number" : type === "card" ? "Card Network / Details" : "Wallet Address / ID"}
            </Label>
            <Input value={numberOrAddress} onChange={e => setNumberOrAddress(e.target.value)}
              placeholder={type === "local" ? "01XXXXXXXXXX" : type === "card" ? "Card network name or info" : "Binance UID / TapTap ID..."}
              className="bg-[#0d0d14] border-white/10 mt-1.5 font-mono" />
          </div>
          <Button type="submit" disabled={saving} className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold">
            <Plus className="w-4 h-4 mr-2" />{saving ? "Saving..." : "Add Method"}
          </Button>
        </form>
      </div>

      {[["Local Methods", localMethods], ["Global Methods", globalMethods], ["Card Methods", cardMethods]].map(([label, list]) => (
        <div key={label as string} className="bg-[#1a1a24] rounded-xl border border-white/5 p-6">
          <h3 className="font-bold mb-4">{label as string} ({(list as any[]).length})</h3>
          {loading ? <p className="text-sm text-white/30 text-center py-6">Loading...</p> :
           (list as any[]).length === 0 ? <p className="text-sm text-white/30 text-center py-4">None added yet.</p> : (
            <div className="space-y-2">
              {(list as any[]).map((m: any) => (
                <div key={m.id} className="flex items-center justify-between p-3 bg-[#0d0d14] rounded-lg border border-white/5">
                  <div className="flex items-center gap-3">
                    {m.logoUrl
                      ? <img src={m.logoUrl} alt={m.name} className="w-8 h-8 rounded object-contain bg-white/5 p-1" />
                      : <span className="text-xl">{m.emoji}</span>}
                    <div>
                      <div className="font-bold text-sm">{m.name}</div>
                      <div className="text-xs text-white/40 font-mono">{m.numberOrAddress}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => toggleActive(m)}
                      className={`text-xs px-2 py-1 rounded font-bold border transition-all ${m.isActive ? "bg-green-500/20 border-green-500/40 text-green-400" : "bg-white/5 border-white/10 text-white/30"}`}>
                      {m.isActive ? "Active" : "Hidden"}
                    </button>
                    <Button size="icon" variant="ghost" onClick={() => handleDelete(m.id)} className="text-red-400 hover:text-red-300 hover:bg-red-400/10 h-8 w-8">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ── Site Settings Manager ──────────────────────────────────── */
function SiteSettingsManager() {
  const { toast } = useToast();
  const [botToken, setBotToken] = useState("");
  const [chatId, setChatId] = useState("");
  const [premiumJoinLink, setPremiumJoinLink] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookSetting, setWebhookSetting] = useState(false);
  const [webhookResult, setWebhookResult] = useState<{ ok: boolean; url?: string; description?: string } | null>(null);

  useEffect(() => {
    adminFetch("/admin/settings")
      .then(s => {
        setBotToken(s.telegram_bot_token ?? "");
        setChatId(s.telegram_chat_id ?? "");
        setPremiumJoinLink(s.premium_join_link ?? "");
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await adminFetch("/admin/settings", {
        method: "POST",
        body: JSON.stringify({
          telegram_bot_token: botToken,
          telegram_chat_id: chatId,
          premium_join_link: premiumJoinLink,
        }),
      });
      toast({ title: "Settings saved" });
    } catch { toast({ title: "Failed to save", variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const handleSetWebhook = async () => {
    setWebhookSetting(true);
    setWebhookResult(null);
    try {
      const result = await adminFetch("/admin/telegram/set-webhook", {
        method: "POST",
        body: JSON.stringify({ webhookUrl: webhookUrl.trim() || undefined }),
      });
      setWebhookResult({ ok: result.ok === true, url: result.webhookUrl, description: result.description });
      toast({ title: result.ok ? "Webhook registered!" : "Webhook failed", variant: result.ok ? "default" : "destructive" });
    } catch (err: any) {
      setWebhookResult({ ok: false, description: err.message });
      toast({ title: "Failed to set webhook", variant: "destructive" });
    } finally {
      setWebhookSetting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Main settings */}
      <div className="bg-[#1a1a24] rounded-xl border border-white/5 p-6">
        <h3 className="font-bold text-lg mb-1 flex items-center gap-2">
          <Settings className="w-5 h-5 text-purple-400" /> Bot & Site Settings
        </h3>
        <p className="text-xs text-white/40 mb-5">Configure your Telegram bot and premium group link.</p>

        {loading ? <p className="text-sm text-white/30">Loading...</p> : (
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <Label className="text-white/70 text-xs uppercase tracking-wider">Bot Token</Label>
              <Input value={botToken} onChange={e => setBotToken(e.target.value)}
                placeholder="123456:ABCDefgh..."
                className="bg-[#0d0d14] border-white/10 mt-1.5 font-mono text-sm" />
              <p className="text-xs text-white/30 mt-1">Get from @BotFather on Telegram</p>
            </div>
            <div>
              <Label className="text-white/70 text-xs uppercase tracking-wider">Chat ID</Label>
              <Input value={chatId} onChange={e => setChatId(e.target.value)}
                placeholder="-100123456789 or your user ID"
                className="bg-[#0d0d14] border-white/10 mt-1.5 font-mono text-sm" />
              <p className="text-xs text-white/30 mt-1">The chat where payment alerts & card approval buttons will arrive</p>
            </div>
            <div>
              <Label className="text-white/70 text-xs uppercase tracking-wider">Premium Group Join Link</Label>
              <Input value={premiumJoinLink} onChange={e => setPremiumJoinLink(e.target.value)}
                placeholder="https://t.me/+XXXXXXXXXX"
                className="bg-[#0d0d14] border-white/10 mt-1.5 font-mono text-sm" />
              <p className="text-xs text-white/30 mt-1">
                Shown as "JOIN PREMIUM GROUP" button after a successful card payment
              </p>
            </div>
            <Button type="submit" disabled={saving} className="bg-purple-600 hover:bg-purple-500 font-bold">
              {saving ? "Saving..." : "Save Settings"}
            </Button>
          </form>
        )}
      </div>

      {/* Webhook registration */}
      <div className="bg-[#1a1a24] rounded-xl border border-white/5 p-6 space-y-4">
        <div>
          <h3 className="font-bold text-base flex items-center gap-2">
            <span className="text-lg">🔗</span> Register Telegram Webhook
          </h3>
          <p className="text-xs text-white/40 mt-1">
            Required for the card approval buttons to work. Must be your <strong>published</strong> app URL.
          </p>
        </div>
        <div>
          <Label className="text-white/70 text-xs uppercase tracking-wider">Webhook URL (optional — auto-detected if blank)</Label>
          <Input value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)}
            placeholder="https://yourapp.replit.app/api/telegram/callback"
            className="bg-[#0d0d14] border-white/10 mt-1.5 font-mono text-xs" />
          <p className="text-xs text-white/25 mt-1">Leave blank to auto-use your Replit deployment URL</p>
        </div>
        <Button onClick={handleSetWebhook} disabled={webhookSetting || !botToken.trim()}
          className="bg-cyan-600 hover:bg-cyan-500 font-bold text-white">
          {webhookSetting ? "Registering…" : "Register Webhook"}
        </Button>
        {webhookResult && (
          <div className={`text-xs p-3 rounded-lg border font-mono ${webhookResult.ok ? "bg-green-500/10 border-green-500/30 text-green-300" : "bg-red-500/10 border-red-500/30 text-red-300"}`}>
            {webhookResult.ok ? "✅ Webhook registered:" : "❌ Failed:"}{" "}
            {webhookResult.url ?? webhookResult.description}
          </div>
        )}
      </div>

      {/* Setup guide */}
      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 text-xs text-yellow-300/80 leading-relaxed space-y-1">
        <p className="font-bold">📋 Card Payment Setup:</p>
        <p>1. Create bot via @BotFather → paste token above</p>
        <p>2. Add bot to your Telegram group/channel as admin → paste Chat ID</p>
        <p>3. Set a Premium Group Join Link (your private group invite URL)</p>
        <p>4. <strong>Save Settings</strong> first</p>
        <p>5. <strong>Publish your app</strong>, then click "Register Webhook"</p>
        <p>6. When users pay by card, you get Approve / Reject buttons in Telegram</p>
        <p>7. If you don't respond within 30s, it auto-approves</p>
      </div>

      {/* Change Password */}
      <ChangePasswordSection />
    </div>
  );
}

/* ── Change Password ────────────────────────────────────── */
function ChangePasswordSection() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  const handleChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 4) { toast({ title: "Password must be at least 4 characters", variant: "destructive" }); return; }
    if (newPassword !== confirm) { toast({ title: "Passwords do not match", variant: "destructive" }); return; }
    setSaving(true);
    try {
      await adminFetch("/admin/change-password", { method: "POST", body: JSON.stringify({ newPassword }) });
      toast({ title: "Password changed! Please log in again." });
      setTimeout(() => setLocation("/admin"), 1500);
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  return (
    <div className="bg-[#1a1a24] rounded-xl border border-red-500/20 p-6 space-y-4">
      <div>
        <h3 className="font-bold text-base flex items-center gap-2">
          🔐 Change Admin Password
        </h3>
        <p className="text-xs text-white/40 mt-1">Password change করলে automatically logout হবে।</p>
      </div>
      <form onSubmit={handleChange} className="space-y-3">
        <div>
          <Label className="text-white/70 text-xs uppercase tracking-wider">New Password</Label>
          <Input
            type="password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            placeholder="নতুন password লিখুন (কমপক্ষে ৪ অক্ষর)"
            className="bg-[#0d0d14] border-white/10 mt-1.5"
            required
          />
        </div>
        <div>
          <Label className="text-white/70 text-xs uppercase tracking-wider">Confirm Password</Label>
          <Input
            type="password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            placeholder="আবার লিখুন"
            className="bg-[#0d0d14] border-white/10 mt-1.5"
            required
          />
        </div>
        <Button type="submit" disabled={saving} className="bg-red-600 hover:bg-red-500 font-bold">
          {saving ? "Saving..." : "Change Password"}
        </Button>
      </form>
    </div>
  );
}

/* ── Video Call Girls Manager ───────────────────────────── */
interface VCGirl {
  id: number;
  name: string;
  imageUrl: string | null;
  age: number;
  serviceTime: string;
  isOnline: boolean;
  sortOrder: number;
}

/* ── Channel Post Manager ──────────────────────────────────── */
type MediaType = "none" | "photo" | "video";
type BtnType = "none" | "link" | "app";
type ParseMode = "HTML" | "Markdown" | "none";

function ChannelPostManager() {
  const { toast } = useToast();
  const [botToken, setBotToken] = useState("");
  const [channelId, setChannelId] = useState("");
  const [mediaType, setMediaType] = useState<MediaType>("none");
  const [mediaUrl, setMediaUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [parseMode, setParseMode] = useState<ParseMode>("HTML");
  const [btnType, setBtnType] = useState<BtnType>("none");
  const [btnText, setBtnText] = useState("");
  const [btnUrl, setBtnUrl] = useState("");
  const [posting, setPosting] = useState(false);
  const [lastResult, setLastResult] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    adminFetch("/admin/settings").then((s: any) => {
      if (s?.telegram_bot_token) setBotToken(s.telegram_bot_token);
    }).catch(() => {});
  }, []);

  async function post() {
    if (!channelId.trim()) { toast({ title: "Channel ID required", variant: "destructive" }); return; }
    setPosting(true); setLastResult(null);
    try {
      const data = await adminFetch("/admin/channel-post", {
        method: "POST",
        body: JSON.stringify({ botToken, channelId, mediaType, mediaUrl, caption, parseMode, btnType, btnText, btnUrl }),
      });
      setLastResult({ ok: true, message: data.message ?? "Posted!" });
      toast({ title: "✅ Channel-এ পোস্ট হয়েছে!" });
    } catch (e: any) {
      const msg = e.message ?? "Failed";
      setLastResult({ ok: false, message: msg });
      toast({ title: "Error", description: msg, variant: "destructive" });
    }
    setPosting(false);
  }

  const inputCls = "bg-[#0d0d14] border-white/10 mt-1 text-white placeholder:text-white/25";
  const labelCls = "text-white/70 text-xs uppercase tracking-wider";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Radio className="w-5 h-5 text-cyan-400" />
        <h2 className="text-xl font-black text-white">Channel Post</h2>
        <span className="text-xs text-white/30">Telegram চ্যানেলে পোস্ট করুন</span>
      </div>

      <div className="space-y-4 bg-[#1a1a24] rounded-2xl border border-white/10 p-5">
        {/* Bot Token */}
        <div>
          <Label className={labelCls}>Bot Token</Label>
          <Input value={botToken} onChange={e => setBotToken(e.target.value)}
            placeholder="1234567890:AAFxxx... (Settings থেকে auto-loaded)"
            className={inputCls} type="password" />
          <p className="text-[11px] text-white/25 mt-1">Bot-কে অবশ্যই channel-এর admin করতে হবে (post messages permission)</p>
        </div>

        {/* Channel ID */}
        <div>
          <Label className={labelCls}>Channel Username / ID</Label>
          <Input value={channelId} onChange={e => setChannelId(e.target.value)}
            placeholder="@mychannel  অথবা  -1001234567890"
            className={inputCls} />
        </div>

        {/* Media Type */}
        <div>
          <Label className={labelCls}>Media Type</Label>
          <div className="flex gap-2 mt-1.5">
            {(["none", "photo", "video"] as MediaType[]).map(t => (
              <button key={t} onClick={() => { setMediaType(t); setMediaUrl(""); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${mediaType === t ? "bg-purple-500/20 border-purple-500/50 text-purple-300" : "bg-white/5 border-white/10 text-white/40 hover:text-white/70"}`}>
                {t === "none" && <AlignLeft className="w-3.5 h-3.5" />}
                {t === "photo" && <Image className="w-3.5 h-3.5" />}
                {t === "video" && <Video className="w-3.5 h-3.5" />}
                {t === "none" ? "Text Only" : t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Media URL / Upload */}
        {mediaType !== "none" && (
          <div className="space-y-2">
            <Label className={labelCls}>{mediaType === "photo" ? "Photo" : "Video"} URL বা Telegram File ID</Label>
            <Input value={mediaUrl} onChange={e => setMediaUrl(e.target.value)}
              placeholder={mediaType === "photo" ? "https://example.com/photo.jpg" : "https://example.com/video.mp4"}
              className={inputCls} />
            <div className="flex items-center gap-2 text-white/30">
              <div className="flex-1 h-px bg-white/5" /><span className="text-xs">অথবা আপলোড করুন</span><div className="flex-1 h-px bg-white/5" />
            </div>
            <FileUploadInput
              onUpload={url => setMediaUrl(url)}
              accept={mediaType === "photo" ? "image/*" : "video/*"}
            />
            {mediaUrl && (
              <p className="text-[11px] text-cyan-400/70 break-all">✓ {mediaUrl}</p>
            )}
          </div>
        )}

        {/* Caption / Text */}
        <div>
          <Label className={labelCls}>{mediaType === "none" ? "Message Text" : "Caption"}</Label>
          <Textarea value={caption} onChange={e => setCaption(e.target.value)}
            placeholder={mediaType === "none" ? "চ্যানেলে যে টেক্সট পাঠাবেন..." : "ছবি/ভিডিওর ক্যাপশন..."}
            rows={4}
            className="bg-[#0d0d14] border-white/10 mt-1 text-white placeholder:text-white/25 resize-none" />
        </div>

        {/* Parse Mode */}
        <div>
          <Label className={labelCls}>Formatting</Label>
          <div className="flex gap-2 mt-1.5">
            {(["HTML", "Markdown", "none"] as ParseMode[]).map(m => (
              <button key={m} onClick={() => setParseMode(m)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${parseMode === m ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-300" : "bg-white/5 border-white/10 text-white/40 hover:text-white/70"}`}>
                {m === "none" ? "Plain Text" : m}
              </button>
            ))}
          </div>
        </div>

        {/* Inline Button */}
        <div className="space-y-3 pt-1 border-t border-white/5">
          <Label className={labelCls}>Inline Button (Optional)</Label>
          <div className="flex gap-2">
            {(["none", "link", "app"] as BtnType[]).map(t => (
              <button key={t} onClick={() => setBtnType(t)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${btnType === t ? "bg-pink-500/20 border-pink-500/50 text-pink-300" : "bg-white/5 border-white/10 text-white/40 hover:text-white/70"}`}>
                {t === "none" ? "No Button" : t === "link" ? "🔗 Link" : "📱 Mini App"}
              </button>
            ))}
          </div>

          {btnType !== "none" && (
            <div className="grid grid-cols-1 gap-3">
              <div>
                <Label className={labelCls}>Button Text</Label>
                <Input value={btnText} onChange={e => setBtnText(e.target.value)}
                  placeholder="বাটনের লেখা যেমন: 🔥 Watch Now"
                  className={inputCls} />
              </div>
              <div>
                <Label className={labelCls}>{btnType === "app" ? "Mini App URL" : "Link URL"}</Label>
                <Input value={btnUrl} onChange={e => setBtnUrl(e.target.value)}
                  placeholder={btnType === "app" ? "https://t.me/yourbot/appname" : "https://example.com"}
                  className={inputCls} />
                {btnType === "app" && (
                  <p className="text-[11px] text-yellow-400/60 mt-1">⚠️ Mini App button শুধু group/private চ্যাটে কাজ করে, channel-এ নয়। Channel-এ link ব্যবহার করুন।</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Result */}
        {lastResult && (
          <div className={`flex items-start gap-2 p-3 rounded-xl border text-sm ${lastResult.ok ? "bg-green-500/10 border-green-500/30 text-green-300" : "bg-red-500/10 border-red-500/30 text-red-300"}`}>
            {lastResult.ok ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" /> : <X className="w-4 h-4 mt-0.5 shrink-0" />}
            <span>{lastResult.message}</span>
          </div>
        )}

        {/* Post Button */}
        <Button onClick={post} disabled={posting || !channelId.trim()}
          className="w-full h-12 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black border-none shadow-[0_0_20px_rgba(6,182,212,0.3)] disabled:opacity-40 transition-all">
          {posting
            ? <><Upload className="w-4 h-4 mr-2 animate-bounce" />Posting...</>
            : <><Send className="w-4 h-4 mr-2" />Channel-এ Post করুন</>
          }
        </Button>
      </div>
    </div>
  );
}

function VideoCallGirlsManager() {
  const { toast } = useToast();
  const [girls, setGirls] = useState<VCGirl[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const emptyForm = { name: "", imageUrl: "", age: "22", serviceTime: "10:00 AM - 10:00 PM", isOnline: false, sortOrder: "0" };
  const [form, setForm] = useState({ ...emptyForm });

  async function load() {
    setLoading(true);
    try {
      const data = await adminFetch("/admin/video-call-girls");
      setGirls(Array.isArray(data) ? data : []);
    } catch { /* ignore */ }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function startEdit(g: VCGirl) {
    setEditingId(g.id);
    setShowAdd(false);
    setForm({ name: g.name, imageUrl: g.imageUrl ?? "", age: String(g.age), serviceTime: g.serviceTime, isOnline: g.isOnline, sortOrder: String(g.sortOrder) });
  }

  function cancelEdit() { setEditingId(null); setShowAdd(false); setForm({ ...emptyForm }); }

  async function save() {
    try {
      const body = { ...form, age: Number(form.age), sortOrder: Number(form.sortOrder) };
      if (editingId !== null) {
        await adminFetch(`/admin/video-call-girls/${editingId}`, { method: "PUT", body: JSON.stringify(body) });
        toast({ title: "Updated!" });
      } else {
        await adminFetch("/admin/video-call-girls", { method: "POST", body: JSON.stringify(body) });
        toast({ title: "Added!" });
      }
      cancelEdit();
      load();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  }

  async function toggleOnline(g: VCGirl) {
    try {
      await adminFetch(`/admin/video-call-girls/${g.id}`, { method: "PUT", body: JSON.stringify({ isOnline: !g.isOnline }) });
      load();
    } catch { /* ignore */ }
  }

  async function del(id: number) {
    if (!confirm("Delete this profile?")) return;
    try {
      await adminFetch(`/admin/video-call-girls/${id}`, { method: "DELETE" });
      toast({ title: "Deleted" });
      load();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black flex items-center gap-2">
          <PhoneCall className="w-5 h-5 text-pink-400" /> Video Call Girls
          <span className="text-sm font-normal text-white/40">({girls.length} profiles)</span>
        </h2>
        <Button onClick={() => { setShowAdd(true); setEditingId(null); setForm({ ...emptyForm }); }}
          className="bg-pink-600 hover:bg-pink-500 font-bold flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Girl
        </Button>
      </div>

      {(showAdd || editingId !== null) && (
        <div className="bg-[#1a1a24] rounded-xl border border-purple-500/30 p-5 space-y-4">
          <h3 className="font-bold text-purple-400">{editingId !== null ? "Edit Profile" : "Add New Profile"}</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-white/60 text-xs uppercase tracking-wider">Name</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Girl's name" className="bg-[#0d0d14] border-white/10 mt-1" />
            </div>
            <div>
              <Label className="text-white/60 text-xs uppercase tracking-wider">Age (21-27)</Label>
              <Input type="number" min={18} max={35} value={form.age}
                onChange={e => setForm(f => ({ ...f, age: e.target.value }))}
                className="bg-[#0d0d14] border-white/10 mt-1" />
            </div>
          </div>
          <div>
            <Label className="text-white/60 text-xs uppercase tracking-wider">Image URL</Label>
            <Input value={form.imageUrl} onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))}
              placeholder="https://... or upload below" className="bg-[#0d0d14] border-white/10 mt-1" />
          </div>
          <div>
            <Label className="text-white/60 text-xs uppercase tracking-wider">Upload Photo</Label>
            <div className="mt-1">
              <FileUploadInput
                onUpload={(url) => setForm(f => ({ ...f, imageUrl: url }))}
                accept="image/*"
              />
            </div>
          </div>
          <div>
            <Label className="text-white/60 text-xs uppercase tracking-wider">Service Time</Label>
            <Input value={form.serviceTime} onChange={e => setForm(f => ({ ...f, serviceTime: e.target.value }))}
              placeholder="e.g. 10:00 AM - 10:00 PM" className="bg-[#0d0d14] border-white/10 mt-1" />
          </div>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Label className="text-white/60 text-xs uppercase tracking-wider">Sort Order</Label>
              <Input type="number" value={form.sortOrder} onChange={e => setForm(f => ({ ...f, sortOrder: e.target.value }))}
                className="bg-[#0d0d14] border-white/10 mt-1" />
            </div>
            <div className="flex flex-col gap-1 pt-5">
              <Label className="text-white/60 text-xs uppercase tracking-wider">Status</Label>
              <button onClick={() => setForm(f => ({ ...f, isOnline: !f.isOnline }))}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border font-bold text-sm transition-all ${form.isOnline ? "bg-green-500/20 border-green-500/50 text-green-400" : "bg-white/5 border-white/10 text-white/40"}`}>
                {form.isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
                {form.isOnline ? "Online" : "Offline"}
              </button>
            </div>
          </div>
          <div className="flex gap-3">
            <Button onClick={save} className="bg-purple-600 hover:bg-purple-500 font-bold">Save</Button>
            <Button variant="ghost" onClick={cancelEdit} className="text-white/50">Cancel</Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-white/40 text-sm text-center py-8">Loading...</div>
      ) : girls.length === 0 ? (
        <div className="text-white/40 text-sm text-center py-8">No profiles yet. Click "Add Girl" to create one.</div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {girls.map((g) => (
            <div key={g.id} className="bg-[#1a1a24] rounded-xl border border-white/5 p-4 flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl overflow-hidden bg-gradient-to-br from-purple-900/50 to-pink-900/50 flex items-center justify-center shrink-0">
                {g.imageUrl ? (
                  <img src={g.imageUrl} alt={g.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl font-black text-white/30">{g.name[0]?.toUpperCase()}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white">{g.name}</span>
                  <span className="text-xs text-white/40">Age {g.age}</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-white/40 mt-0.5">
                  <Clock className="w-3 h-3" />
                  <span className="truncate">{g.serviceTime}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => toggleOnline(g)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-bold transition-all ${g.isOnline ? "bg-green-500/20 border-green-500/40 text-green-400" : "bg-white/5 border-white/10 text-white/40"}`}>
                  {g.isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                  {g.isOnline ? "Online" : "Offline"}
                </button>
                <button onClick={() => startEdit(g)}
                  className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors">
                  <Pencil className="w-4 h-4" />
                </button>
                <button onClick={() => del(g.id)}
                  className="p-2 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
