import React from "react";
import { Headphones, Mic, MicOff } from "lucide-react";

const VoiceChannel = ({
  isInVoice,
  voiceMembers,
  isMuted,
  toggleMuteVoice,
  endVoiceChat,
  startVoiceChat
}) => {
  return (
    <div className={`shrink-0 flex flex-col m-4 mb-2 bg-[#141414] rounded-xl border transition-all duration-500 shadow-lg overflow-hidden ${
      voiceMembers.length > 0 
        ? "border-primary/30 shadow-[0_0_15px_rgba(249,115,22,0.15)]" 
        : "border-white/5"
    }`}>
      <div className="h-12 flex items-center px-5 border-b border-white/5 gap-3">
        <Headphones size={16} className="text-primary" />
        <h4 className="text-sm font-bold uppercase tracking-wider">Voice Channel</h4>
        {(isInVoice || voiceMembers.length > 0) && (
          <div className="flex items-center gap-1.5 bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-full text-[9px] font-black text-primary shadow-[0_0_10px_rgba(249,115,22,0.1)] animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping"></span>
            <span className="tracking-widest uppercase">ACTIVE</span>
          </div>
        )}
      </div>
      
      <div className="p-4 flex flex-col gap-3">
        {isInVoice ? (
          <div className="flex items-center justify-between bg-black/40 p-3 rounded-lg border border-white/5">
            <div className="flex items-center gap-2">
              <button
                onClick={toggleMuteVoice}
                className={`p-2.5 rounded-lg border transition-all active:scale-95 flex items-center justify-center cursor-pointer ${
                  isMuted 
                    ? "bg-red-500/10 border-red-500/20 text-red-500 hover:bg-red-500/20" 
                    : "bg-green-500/10 border-green-500/20 text-green-500 hover:bg-green-500/20"
                }`}
                title={isMuted ? "Unmute Mic" : "Mute Mic"}
              >
                {isMuted ? <MicOff size={16} /> : <Mic size={16} />}
              </button>
              <span className="text-xs font-black uppercase tracking-wider text-white/60">
                {isMuted ? "Muted" : "Unmuted"}
              </span>
            </div>
            
            <button
              onClick={endVoiceChat}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-xs font-black uppercase tracking-wider rounded-lg transition-colors flex items-center gap-2 cursor-pointer shadow-md shadow-red-500/20"
            >
              Disconnect
            </button>
          </div>
        ) : (
          <button
            onClick={startVoiceChat}
            className={`w-full py-3.5 text-white font-black rounded-lg text-xs tracking-widest uppercase flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer ${
              voiceMembers.length > 0
                ? "bg-gradient-to-r from-primary to-orange-500 hover:from-primary/95 hover:to-orange-500/95 shadow-md shadow-primary/30 animate-pulse"
                : "bg-primary hover:bg-primary/90 shadow-md shadow-primary/20"
            }`}
          >
            <Mic size={16} /> 
            {voiceMembers.length > 0 ? "Join Active Voice Channel" : "Join Voice Channel"}
          </button>
        )}
        
        {/* Voice Members List */}
        {voiceMembers.length > 0 && (
          <div className="mt-2 space-y-2">
            <p className="text-[9px] font-black text-white/30 uppercase tracking-widest">
              Connected ({voiceMembers.length})
            </p>
            <div className="grid grid-cols-2 gap-2 max-h-[120px] overflow-y-auto custom-scrollbar pr-1">
              {voiceMembers.map((vm) => (
                <div
                  key={vm.userId}
                  className="flex items-center justify-between bg-white/[0.02] border border-white/5 px-2.5 py-1.5 rounded-lg"
                >
                  <span className="text-[11px] font-bold text-white/80 truncate max-w-[100px]">
                    {vm.userName}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {vm.muted ? (
                      <MicOff size={10} className="text-red-500" />
                    ) : (
                      <div className="voice-wave">
                        <div className="voice-wave-bar" />
                        <div className="voice-wave-bar" />
                        <div className="voice-wave-bar" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VoiceChannel;
