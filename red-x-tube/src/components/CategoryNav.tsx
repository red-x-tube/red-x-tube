import { Category } from "@workspace/api-client-react";

export function CategoryNav({ 
  categories, 
  activeId, 
  onSelect 
}: { 
  categories: Category[]; 
  activeId?: number; 
  onSelect: (id?: number) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto px-4 py-4 no-scrollbar items-center">
      <button
        onClick={() => onSelect(undefined)}
        className={`shrink-0 px-5 py-2 rounded-full text-xs font-bold transition-all ${
          !activeId 
            ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)]' 
            : 'bg-[#1a1a24] text-white/60 border border-white/5 hover:bg-[#242430]'
        }`}
      >
        All
      </button>
      
      {categories.map((cat) => {
        const isActive = activeId === cat.id;
        return (
          <button
            key={cat.id}
            onClick={() => onSelect(cat.id)}
            className={`shrink-0 px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2 ${
              isActive
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)]'
                : 'bg-[#1a1a24] text-white/60 border border-white/5 hover:bg-[#242430]'
            }`}
          >
            {cat.name}
            {!isActive && cat.videoCount > 0 && (
              <span className="bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded text-[10px] leading-none">
                {cat.videoCount}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}