import React from "react";
import { Smile } from "lucide-react";

const EmojiReactions = ({ videoUrl, sendReaction }) => {
  if (!videoUrl) return null;

  return (
    <div className="flex justify-center items-center gap-4 bg-[#141414] border border-white/5 py-2.5 px-6 rounded-xl shadow-lg relative overflow-hidden group">
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <div className="flex items-center gap-2">
        <Smile size={14} className="text-white/40 group-hover:text-primary transition-colors" />
        <span className="text-[10px] font-black uppercase tracking-[0.15em] text-white/40">
          Live Reactions
        </span>
      </div>
      
      <div className="w-px h-4 bg-white/10" />
      
      <div className="flex items-center gap-3">
        {["❤️", "😂", "🎉", "😮", "😢", "👍"].map((emoji) => (
          <button
            key={emoji}
            onClick={() => sendReaction(emoji)}
            className="text-2xl hover:scale-130 active:scale-95 transition-transform duration-200 cursor-pointer p-1"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
};

export default EmojiReactions;
