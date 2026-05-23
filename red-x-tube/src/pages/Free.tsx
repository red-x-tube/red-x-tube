import { Layout } from "@/components/Layout";
import { PostCard } from "@/components/PostCard";
import { CategoryNav } from "@/components/CategoryNav";
import { useListVideos, useListCategories, getListVideosQueryKey } from "@workspace/api-client-react";
import { useState } from "react";

export default function Free() {
  const [activeCategory, setActiveCategory] = useState<number>();

  const { data: categories = [] } = useListCategories();
  const { data: posts = [], isLoading } = useListVideos(
    { section: "free", categoryId: activeCategory },
    { query: { queryKey: getListVideosQueryKey({ section: "free", categoryId: activeCategory }) } }
  );

  return (
    <Layout>
      <div className="px-4 pt-6 pb-2 text-center">
        <h2 className="text-xl font-black text-white italic">
          FREE <span className="text-purple-400">ZONE</span>
        </h2>
      </div>

      <CategoryNav
        categories={categories}
        activeId={activeCategory}
        onSelect={setActiveCategory}
      />

      <div className="p-4 space-y-4">
        {isLoading ? (
          <div className="text-center text-white/50 py-10 text-sm">Loading...</div>
        ) : posts.length === 0 ? (
          <div className="text-center text-white/50 py-10 text-sm">No posts found.</div>
        ) : (
          posts.map((post) => <PostCard key={post.id} post={post} />)
        )}
      </div>
    </Layout>
  );
}
