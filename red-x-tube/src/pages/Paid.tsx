import { Layout } from "@/components/Layout";
import { PostCard } from "@/components/PostCard";
import { PremiumPackages } from "@/components/PremiumPackages";
import { useListVideos, getListVideosQueryKey } from "@workspace/api-client-react";

export default function Paid() {
  const { data: posts = [], isLoading } = useListVideos(
    { section: "paid" },
    { query: { queryKey: getListVideosQueryKey({ section: "paid" }) } }
  );

  return (
    <Layout>
      <PremiumPackages />

      <div className="p-4 space-y-4">
        {isLoading ? (
          <div className="text-center text-white/50 py-10 text-sm">Loading...</div>
        ) : posts.length === 0 ? (
          <div className="text-center text-white/50 py-10 text-sm">No premium content yet.</div>
        ) : (
          posts.map((post) => <PostCard key={post.id} post={post} />)
        )}
      </div>
    </Layout>
  );
}
