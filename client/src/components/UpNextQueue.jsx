import React, { useState } from "react";
import {
  AlignLeft,
  RefreshCw,
  Repeat,
  Trash2,
  Maximize2,
  Plus,
  Monitor,
  Users,
  SkipForward
} from "lucide-react";

const getYouTubeThumbnail = (url) => {
  try {
    if (url.includes("youtube.com") || url.includes("youtu.be")) {
      const videoId =
        url.split("v=")[1]?.split("&")[0] ||
        url.split("youtu.be/")[1]?.split(/[?#]/)[0];
      if (videoId) return `https://img.youtube.com/vi/${videoId}/default.jpg`;
    }
  } catch (e) {}
  return null;
};

const UpNextQueue = ({
  playlist,
  videoUrl,
  canControl,
  autoPlayNext,
  emitCurrentState,
  onToggleAutoPlay,
  onClearQueue,
  onRemoveFromPlaylist,
  onAddToPlaylist,
  onSkipToNext,
  currentUser
}) => {
  const [isQueueExpanded, setIsQueueExpanded] = useState(false);
  const [queueInput, setQueueInput] = useState("");

  const handleAdd = (e) => {
    if (e) e.preventDefault();
    if (queueInput.trim()) {
      onAddToPlaylist(queueInput.trim());
      setQueueInput("");
    }
  };

  return (
    <div className="bg-[#141414] rounded-xl border border-white/5 p-6 shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <AlignLeft size={18} className="text-white/60" />
          <h2 className="text-sm font-bold uppercase tracking-widest">
            UP NEXT
          </h2>
          {playlist.length > 0 && (
            <span className="bg-primary text-white px-2 py-0.5 rounded-full text-[10px] font-black">
              {playlist.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4 text-white/30">
          {/* Force Sync Button */}
          <button
            onClick={() => emitCurrentState()}
            className={`p-1 rounded hover:bg-white/5 transition-all active:scale-90 ${
              canControl ? "opacity-100" : "opacity-20 cursor-not-allowed"
            }`}
            title="Force Sync For All"
            disabled={!canControl}
          >
            <RefreshCw
              size={14}
              className="hover:text-primary transition-all active:rotate-180 duration-500"
            />
          </button>

          {/* Auto Play Next Toggle */}
          <button
            onClick={onToggleAutoPlay}
            title={autoPlayNext ? "Auto Play Next: ON" : "Auto Play Next: OFF"}
            className={`p-1 rounded hover:bg-white/5 transition-all active:scale-90 ${
              canControl ? "opacity-100" : "opacity-20 cursor-not-allowed"
            }`}
            disabled={!canControl}
          >
            <Repeat
              size={14}
              className={`${autoPlayNext ? "text-primary" : "hover:text-primary"} transition-colors`}
            />
          </button>

          {/* Clear Playlist */}
          <button
            onClick={onClearQueue}
            disabled={!canControl || playlist.length === 0}
            className="p-1 rounded hover:bg-white/5 transition-all active:scale-90 disabled:opacity-20"
            title="Clear Queue"
          >
            <Trash2 size={14} className="hover:text-red-500 transition-colors" />
          </button>

          {/* Expand/Collapse */}
          <button
            className="p-1 rounded hover:bg-white/5 transition-all active:scale-90"
            onClick={() => setIsQueueExpanded(!isQueueExpanded)}
            title="Toggle Expand Queue"
          >
            <Maximize2
              size={14}
              className={`${isQueueExpanded ? "text-primary" : "hover:text-white"} transition-colors`}
            />
          </button>
        </div>
      </div>

      {/* Now Playing indicator */}
      <div className="flex items-center gap-2 mb-6 bg-primary/5 border border-primary/20 p-2.5 rounded text-sm relative overflow-hidden">
        <div className="w-2 h-2 bg-primary rounded-full animate-pulse shadow-[0_0_8px_#f97316]"></div>
        <span className="text-[11px] font-black text-primary uppercase tracking-wider ml-1">
          NOW PLAYING
        </span>
        <span className="text-[11px] text-white/80 truncate flex-1 ml-2 font-medium">
          {videoUrl ? (
            <>
              YouTube · <span className="text-white">{videoUrl.includes('v=') ? videoUrl.split('v=')[1]?.substring(0, 11) : 'Link'}...</span>
            </>
          ) : (
            "Waiting for video..."
          )}
        </span>
      </div>

      {/* Add to Queue input */}
      <div className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg py-1 px-1 pl-4 flex items-center mb-6">
        <input
          type="text"
          placeholder="YouTube or direct video URL..."
          className="flex-1 bg-transparent text-sm focus:outline-none text-white/60 placeholder:text-white/30"
          value={queueInput}
          onChange={(e) => setQueueInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAdd();
            }
          }}
        />
        <button
          onClick={handleAdd}
          className="p-2.5 bg-primary/10 hover:bg-primary/20 rounded-md transition-colors border border-primary/20"
        >
          <Plus size={14} className="text-primary font-bold" />
        </button>
      </div>

      {/* Queue List */}
      <div
        className={`space-y-1 mb-6 transition-all duration-500 ${
          isQueueExpanded ? "max-h-[800px]" : "max-h-[160px]"
        } overflow-y-auto custom-scrollbar px-1`}
      >
        {playlist.length > 0 ? (
          playlist.map((item, i) => {
            const url = typeof item === "string" ? item : item.url;
            const addedBy = typeof item === "string" ? "host" : item.addedBy;
            const thumbnail = getYouTubeThumbnail(url);
            
            return (
              <div
                key={i}
                className="flex items-center gap-4 py-2 border-b border-white/5 last:border-0 group transition-colors hover:bg-white/[0.02] px-2 rounded"
              >
                <span className="text-[11px] font-medium text-white/20 w-3">
                  {i + 1}
                </span>
                <div className="w-10 h-6 bg-[#141414] rounded overflow-hidden flex items-center justify-center text-white/5 relative border border-white/5 shadow-sm">
                  {thumbnail ? (
                    <img
                      src={thumbnail}
                      alt="Thumbnail"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Monitor size={10} />
                  )}
                  <div className="absolute bottom-0 right-0 bg-black/80 text-[#ff0000] text-[5px] px-[2px] rounded-sm font-black">
                    YT
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-white/90 truncate">
                    YouTube ·{" "}
                    {url.includes("v=")
                      ? url.split("v=")[1]?.substring(0, 11)
                      : "Video"}
                    ...
                  </p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Users size={8} className="text-white/30" />
                    <p className="text-[9px] text-white/40">
                      added by{" "}
                      {addedBy === currentUser?.name ? "you" : addedBy || "user"}
                    </p>
                  </div>
                </div>
                {canControl && (
                  <button
                    onClick={() => onRemoveFromPlaylist(i)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-white/10 rounded"
                  >
                    <Trash2
                      size={12}
                      className="text-white/40 hover:text-red-500"
                    />
                  </button>
                )}
              </div>
            );
          })
        ) : (
          <div className="py-8 flex flex-col items-center justify-center opacity-10">
            <Monitor size={24} />
            <p className="text-[9px] font-black uppercase mt-2">
              Queue is empty
            </p>
          </div>
        )}
      </div>

      {/* Skip to Next button */}
      <button
        onClick={onSkipToNext}
        disabled={playlist.length === 0 || !canControl}
        className="w-full py-4 bg-primary/10 hover:bg-primary/20 border border-primary/20 rounded-xl text-primary text-xs font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all disabled:opacity-20 active:scale-95"
      >
        <SkipForward size={16} /> Skip to Next
      </button>
    </div>
  );
};

export default UpNextQueue;
