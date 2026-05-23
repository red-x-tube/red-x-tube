import { Video } from "@workspace/api-client-react";
import { Eye, Play } from "lucide-react";
import { Button } from "@/components/ui/button";

export function VideoCard({ video, onUnlock }: { video: Video; onUnlock?: () => void }) {
  return (
    <div className="group relative bg-[#1a1a24] rounded-2xl overflow-hidden border border-white/5 hover:border-purple-500/30 transition-all duration-300">
      <div className="aspect-video bg-[#0a0a0f] relative flex items-center justify-center">
        {video.thumbnailUrl ? (
          <img src={video.thumbnailUrl} alt={video.title} className="block w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity" />
        ) : (
          <Play className="w-12 h-12 text-white/10" />
        )}
        
        {video.unlockRequired && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-[2px]">
            <Play className="w-16 h-16 text-white/20" />
          </div>
        )}

        <div className="absolute bottom-2 right-2 bg-black/80 backdrop-blur-md px-2 py-1 rounded-lg flex items-center gap-1.5 border border-white/10">
          <Eye className="w-3.5 h-3.5 text-purple-400" />
          <span className="text-xs font-bold text-white/90">{video.viewCount}</span>
        </div>
        
        {video.categoryName && (
          <div className="absolute top-2 left-2 bg-pink-500/90 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-lg uppercase tracking-wider">
            {video.categoryName}
          </div>
        )}
      </div>

      <div className="p-4">
        <h3 className="text-sm font-bold text-white/90 line-clamp-2 leading-snug group-hover:text-purple-300 transition-colors">
          {video.title}
        </h3>
        
        {video.unlockRequired && (
          <Button 
            className="w-full mt-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold border-none shadow-[0_0_15px_rgba(168,85,247,0.4)]"
            onClick={onUnlock}
          >
            <Play className="w-4 h-4 mr-2 fill-current" />
            UNLOCK (0/3)
          </Button>
        )}
      </div>
    </div>
  );
}