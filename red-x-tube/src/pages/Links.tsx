import { Layout } from "@/components/Layout";
import { useListSocialLinks } from "@workspace/api-client-react";
import { ExternalLink } from "lucide-react";

export default function Links() {
  const { data: links = [], isLoading } = useListSocialLinks();

  return (
    <Layout>
      <div className="p-6">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-black text-white italic">CONNECT WITH US</h2>
          <p className="text-sm text-white/40 mt-2">Join our community across platforms</p>
        </div>

        {isLoading ? (
          <div className="text-center text-white/50 py-10 text-sm">Loading...</div>
        ) : links.length === 0 ? (
          <div className="text-center text-white/50 py-10 text-sm">No links yet.</div>
        ) : (
          <div className="space-y-3">
            {links.map((link) => (
              <a
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noreferrer"
                data-testid={`link-card-${link.id}`}
                className="flex items-center justify-between p-4 bg-[#1a1a24] rounded-2xl border border-white/5 hover:border-purple-500/50 hover:bg-[#242430] transition-all group"
              >
                <div className="flex items-center gap-4">
                  {/* Logo or fallback */}
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
                    {link.logoUrl ? (
                      <img
                        src={link.logoUrl}
                        alt={link.platform}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="font-black text-xl text-purple-300">
                        {link.platform?.[0]?.toUpperCase() ?? "?"}
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-white/90 group-hover:text-white transition-colors">
                      {link.displayName}
                    </h3>
                    <p className="text-xs text-white/40">{link.platform}</p>
                  </div>
                </div>
                <ExternalLink className="w-5 h-5 text-white/20 group-hover:text-pink-400 transition-colors shrink-0" />
              </a>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
