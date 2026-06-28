import React, { useState } from "react";
import { Info } from "lucide-react";

const LoadVideoCard = ({ handleLoadVideo, canControl, isHost }) => {
  const [showInfo, setShowInfo] = useState(false);
  const [inputUrl, setInputUrl] = useState("");

  const onSubmit = (e) => {
    e.preventDefault();
    if (inputUrl.trim()) {
      handleLoadVideo(inputUrl.trim());
      setInputUrl("");
    }
  };

  return (
    <div className="bg-[#141414] rounded-xl border border-white/5 p-8 shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">Load Video</h2>
        <button
          onClick={() => setShowInfo(!showInfo)}
          className="focus:outline-none"
          type="button"
        >
          <Info
            size={18}
            className={`cursor-pointer transition-colors ${
              showInfo ? "text-white" : "text-white/20 hover:text-white/60"
            }`}
          />
        </button>
      </div>

      {showInfo && (
        <div className="bg-[#161d2a] border border-[#2d3748] rounded-lg p-5 mb-6 text-sm animate-in fade-in slide-in-from-top-2">
          <p className="text-blue-400 font-bold mb-3">
            Supported (auto-detected):
          </p>
          <ul className="space-y-2 text-white/80">
            <li>
              <span className="font-bold text-white">YouTube:</span> youtube.com or youtu.be links
            </li>
            <li>
              <span className="font-bold text-white">Dropbox:</span> Share links (auto-converted)
            </li>
            <li>
              <span className="font-bold text-white">Direct:</span> Any .mp4, .webm, .ogg URL
            </li>
          </ul>
          <p className="text-red-400 font-bold mt-4">
            Not supported: <span className="text-white/60 font-normal">Google Drive</span>
          </p>
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-4">
        <input
          type="text"
          placeholder="Paste YouTube, Dropbox, or direct .mp4 URL..."
          className="w-full bg-[#333333]/50 border border-white/10 rounded-lg py-4 px-5 text-sm focus:outline-none focus:border-white/30 shadow-inner transition-all text-white/80 placeholder:text-white/30"
          value={inputUrl}
          onChange={(e) => setInputUrl(e.target.value)}
        />
        <button
          type="submit"
          disabled={!inputUrl.trim() || (!canControl && !isHost)}
          className="w-full py-4 bg-primary hover:bg-primary/90 text-white font-black rounded-xl transition-all text-sm tracking-[0.1em] uppercase disabled:opacity-30 disabled:hover:bg-primary shadow-lg shadow-primary/20 active:scale-[0.98]"
        >
          Load Video
        </button>
      </form>
    </div>
  );
};

export default LoadVideoCard;
