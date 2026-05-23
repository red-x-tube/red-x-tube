import { useParams, useLocation } from "wouter";
import { useGetVideoBySlug, useIncrementVideoView, getListVideosQueryKey } from "@workspace/api-client-react";
import { PostCard } from "@/components/PostCard";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, AlertCircle } from "lucide-react";

export default function PostBySlug() {
  const { slug } = useParams<{ slug: string }>();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: post, isLoading, isError } = useGetVideoBySlug(slug ?? "");

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0d0d14] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 text-purple-400 animate-spin" />
        <p className="text-white/40 text-sm">Loading post…</p>
      </div>
    );
  }

  if (isError || !post) {
    return (
      <div className="min-h-screen bg-[#0d0d14] flex flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-red-400" />
        </div>
        <h2 className="text-xl font-bold text-white">Post Not Found</h2>
        <p className="text-white/40 text-sm max-w-xs">
          The link <span className="font-mono text-purple-400">/{slug}</span> doesn't match any post.
        </p>
        <button
          onClick={() => setLocation("/")}
          className="mt-2 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600/20 border border-purple-500/30 text-purple-300 text-sm font-bold hover:bg-purple-600/30 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Go Home
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d0d14]">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#0d0d14]/90 backdrop-blur-md border-b border-white/5 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => setLocation("/")}
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-white/60" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-white/30 font-mono truncate">/{slug}</p>
          <h1 className="text-sm font-bold text-white/80 truncate leading-snug">{post.title}</h1>
        </div>
      </div>

      {/* Post content */}
      <div className="p-4">
        <PostCard
          post={post}
          defaultExpanded
        />
      </div>
    </div>
  );
}
