import { Layout } from "@/components/Layout";
import { PostCard } from "@/components/PostCard";
import { useListVideos, getListVideosQueryKey } from "@workspace/api-client-react";
import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: posts = [], isLoading } = useListVideos(
    { section: "home" },
    { query: { queryKey: getListVideosQueryKey({ section: "home" }) } }
  );

  const filtered = posts.filter((p) =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Layout>
      <div className="px-4 py-2">
        <div className="relative">
          <Input
            data-testid="input-search"
            type="search"
            placeholder="ভিডিও খুঁজুন..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-[#1a1a24] border-white/10 pl-4 pr-12 h-12 rounded-xl text-white placeholder:text-white/30 focus-visible:ring-purple-500"
          />
          <Button
            size="icon"
            className="absolute right-1.5 top-1.5 h-9 w-9 bg-purple-500 hover:bg-purple-600 rounded-lg"
          >
            <Search className="w-4 h-4 text-white" />
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {isLoading ? (
          <div className="text-center text-white/50 py-10 text-sm">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-white/50 py-10 text-sm">
            {searchQuery ? "No posts found." : "No posts yet."}
          </div>
        ) : (
          filtered.map((post) => <PostCard key={post.id} post={post} />)
        )}
      </div>
    </Layout>
  );
}
