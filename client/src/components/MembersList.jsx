import React, { useState } from "react";
import {
  Users,
  Crown,
  MoreVertical,
  ShieldOff,
  Shield,
  Video,
  XCircle
} from "lucide-react";

const MembersList = ({
  members,
  isHost,
  currentUser,
  canControl,
  isInCall,
  socketId,
  onTogglePermission,
  onInviteToCall,
  onKickUser,
  onGrantAll,
  onRevokeAll,
  onStartVideoCall,
  onRequestModAccess
}) => {
  const [showMemberMenu, setShowMemberMenu] = useState(null);

  const toggleMenu = (id) => {
    setShowMemberMenu(showMemberMenu === id ? null : id);
  };

  const handleAction = (action, id, param) => {
    setShowMemberMenu(null);
    if (action === "permission") {
      onTogglePermission(id, param);
    } else if (action === "invite") {
      onInviteToCall(id);
    } else if (action === "kick") {
      onKickUser(id);
    }
  };

  return (
    <div className="h-[350px] shrink-0 flex flex-col m-4 mt-0 bg-[#141414] rounded-xl border border-white/5 shadow-lg overflow-hidden">
      <div className="h-12 flex items-center px-5 border-b border-white/5 gap-2">
        <Users size={14} className="text-white/40" />
        <h4 className="text-sm font-bold">Members</h4>
        <span className="ml-auto bg-white/5 px-2 py-0.5 rounded-full text-[10px] font-bold text-white/40">
          {members.length}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
        {[...members]
          .sort(
            (a, b) =>
              (b.isHost ? 1 : 0) - (a.isHost ? 1 : 0) ||
              (b.canControl ? 1 : 0) - (a.canControl ? 1 : 0) ||
              a.name.localeCompare(b.name)
          )
          .map((m) => (
            <div
              key={m.id}
              className="flex items-center gap-3 bg-[#1e1e1e]/30 p-2.5 rounded-lg border border-white/5 group relative"
            >
              <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-xs font-black">
                {m.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h5 className="text-[11px] font-black truncate text-white/80">
                    {m.name}
                  </h5>
                  {m.isHost && <Crown size={10} className="text-yellow-500" />}
                </div>
                <p
                  className={`text-[8px] font-black uppercase tracking-widest flex items-center gap-1 ${
                    m.canControl ? "text-green-500" : "text-white/20"
                  }`}
                >
                  {m.canControl ? "Moderator" : "Viewer"}
                </p>
              </div>

              {isHost && m.id !== socketId && (
                <MoreVertical
                  size={14}
                  className="text-white/20 cursor-pointer hover:text-white"
                  onClick={() => toggleMenu(m.id)}
                />
              )}

              {showMemberMenu === m.id && (
                <div className="absolute right-10 top-8 w-44 bg-[#1e1e1e] border border-white/10 rounded-lg shadow-2xl z-[100] p-1 animate-in slide-in-from-top-2">
                  <button
                    onClick={() => handleAction("permission", m.id, !m.canControl)}
                    className="w-full text-left px-3 py-2 rounded-md hover:bg-white/5 text-[9px] font-black uppercase tracking-widest flex items-center gap-3 transition-colors text-white/60"
                    type="button"
                  >
                    {m.canControl ? <ShieldOff size={12} /> : <Shield size={12} />}
                    {m.canControl ? "Revoke" : "Grant"}
                  </button>
                  <button
                    onClick={() => handleAction("invite", m.id)}
                    className="w-full text-left px-3 py-2 rounded-md hover:bg-primary/10 text-[9px] font-black uppercase tracking-widest flex items-center gap-3 transition-colors text-primary/80"
                    type="button"
                  >
                    <Video size={12} /> Video Call
                  </button>
                  <button
                    onClick={() => handleAction("kick", m.id)}
                    className="w-full text-left px-3 py-2 rounded-md hover:bg-red-500/10 text-[9px] font-black uppercase tracking-widest flex items-center gap-3 transition-colors text-red-500/60"
                    type="button"
                  >
                    <XCircle size={12} /> Kick
                  </button>
                </div>
              )}
            </div>
          ))}
      </div>
      {isHost && (
        <div className="p-4 grid grid-cols-2 gap-2 border-t border-white/5 bg-black/40">
          <button
            onClick={onGrantAll}
            className="py-2.5 bg-green-500/10 hover:bg-green-500/20 text-green-500 border border-green-500/20 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
            type="button"
          >
            Grant All
          </button>
          <button
            onClick={onRevokeAll}
            className="py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
            type="button"
          >
            Revoke All
          </button>
          {!isInCall && (
            <button
              onClick={() => onStartVideoCall(true)}
              className="col-span-2 py-4 bg-primary hover:bg-primary/90 text-white rounded-xl text-[11px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all mt-2 active:scale-95 shadow-lg shadow-primary/30"
              type="button"
            >
              <Video size={18} /> Start Video Call
            </button>
          )}
        </div>
      )}
      {!isHost && !canControl && (
        <div className="p-4 border-t border-white/5 bg-black/40">
          <button
            onClick={onRequestModAccess}
            className="w-full py-4 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/20 hover:border-orange-500/40 text-orange-500 rounded-xl text-[11px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all active:scale-95 shadow-lg"
            type="button"
          >
            <Shield size={16} /> Request Mod Access
          </button>
        </div>
      )}
    </div>
  );
};

export default MembersList;
