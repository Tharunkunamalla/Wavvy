import React from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import ReactPlayer from "react-player";
import toast from "react-hot-toast";
import {
  Video,
  VideoOff,
  Link as LinkIcon,
  LogOut,
  Play,
  Copy,
  Info,
  X,
  AlertTriangle,
  Zap,
  Activity,
  Mic,
  MicOff,
} from "lucide-react";

import PeerVideo from "../components/PeerVideo";
import VoiceAudio from "../components/VoiceAudio";
import EmojiReactions from "../components/EmojiReactions";
import LoadVideoCard from "../components/LoadVideoCard";
import UpNextQueue from "../components/UpNextQueue";
import VoiceChannel from "../components/VoiceChannel";
import ChatCard from "../components/ChatCard";
import MembersList from "../components/MembersList";

// Custom Room Session hook
import { useRoom } from "../hooks/useRoom";

const RoomPage = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem("user"));

  const {
    socketRef,
    playerRef,
    isConnected,
    isWakingUp,
    roomName,
    isPublic,
    messages,
    videoUrl,
    inputUrl,
    setInputUrl,
    queueInput,
    setQueueInput,
    isPlaying,
    members,
    playlist,
    hasInteracted,
    reactions,
    setReactions,
    autoPlayNext,
    isHost,
    canControl,

    // Actions
    handleInteraction,
    handleLoadVideo,
    addToPlaylist,
    skipToNext,
    sendReaction,
    handleKick,
    togglePermission,
    grantAll,
    revokeAll,
    onPlay,
    onSeek,
    onEnded,
    onPause,
    emitCurrentState,
    requestModAccess,

    // WebRTC Call
    isInCall,
    localStream,
    peers,
    isAudioMuted,
    isVideoMuted,
    isPrivateCall,
    currentVideoRoomId,
    startVideoCall,
    endVideoCall,
    inviteToCall,
    toggleVideoCallAudio,
    toggleVideoCallVideo,

    // WebRTC Voice
    isInVoice,
    isMuted,
    voiceMembers,
    voicePeers,
    startVoiceChat,
    endVoiceChat,
    toggleMuteVoice,
  } = useRoom(roomId, user, navigate, location);

  return (
    <div className="flex flex-col h-screen bg-[#0a0a0a] text-white font-sans overflow-hidden">
      {/* Navbar Section */}
      <nav className="h-14 flex items-center justify-between px-6 bg-[#0a0a0a] border-b border-white/5 z-50">
        <div className="flex items-center gap-6">
          <div
            className="flex items-center gap-2 cursor-pointer group"
            onClick={() => navigate("/")}
          >
            <Play
              className="text-primary fill-current drop-shadow-[0_0_10px_rgba(249,115,22,0.5)] group-hover:scale-110 transition-transform"
              size={22}
            />
            <span className="text-2xl font-brand tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-300 drop-shadow-lg">
              Wavvy
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs font-medium text-white/40">
            {roomName && (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-white/80 font-bold">
                {isPublic ? "🌐" : "🔒"} {roomName}
              </div>
            )}
            <div className="flex items-center gap-2">
              <Copy
                size={12}
                className="cursor-pointer hover:text-white transition-colors"
                onClick={() => {
                  navigator.clipboard.writeText(roomId);
                  toast.success("Room ID Copied!", {
                    style: {
                      background: "#111",
                      color: "#fff",
                      border: "1px solid rgba(255,255,255,0.1)",
                    },
                  });
                }}
              />
              <span>Room ID: {roomId}</span>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                toast.success("Share Link Copied!", {
                  style: {
                    background: "#111",
                    color: "#fff",
                    border: "1px solid rgba(255,255,255,0.1)",
                  },
                });
              }}
              className="flex items-center gap-1 hover:text-white transition-colors"
            >
              <LinkIcon size={12} /> Share link
            </button>
          </div>
        </div>
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-xs font-black shadow-inner">
              {user?.name ? user.name.charAt(0).toUpperCase() : "?"}
            </div>
            <span className="text-sm font-bold text-white/90 tracking-tight">
              {user?.name || "Guest"}
            </span>
          </div>
          <div className="w-px h-5 bg-white/10 mx-1"></div>
          
          {/* Server Status Pill */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${isConnected ? 'bg-green-500/5 border-green-500/20' : 'bg-yellow-500/5 border-yellow-500/20'} transition-colors`}>
            <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-yellow-500 animate-pulse'}`}></div>
            <span className={`text-[10px] font-black uppercase tracking-widest ${isConnected ? 'text-green-500/80' : 'text-yellow-500/80'}`}>
              {isConnected ? 'Online' : 'Reconnecting'}
            </span>
          </div>

          <div className="w-px h-5 bg-white/10 mx-1"></div>
          
          <button
            onClick={() => navigate("/")}
            className="text-xs font-bold uppercase tracking-widest text-red-500/60 hover:text-red-500 transition-colors flex items-center gap-2"
          >
            <LogOut size={14} /> Exit
          </button>
        </div>
      </nav>

      {/* Server Waking Up Overlay */}
      {isWakingUp && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
          <div className="relative">
            <div className="w-24 h-24 rounded-full border-4 border-primary/20 border-t-primary animate-spin mb-8"></div>
            <Zap className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary animate-pulse" size={32} />
          </div>
          
          <h2 className="text-4xl font-black italic tracking-tighter mb-4 text-white">
            Waking up <span className="text-primary">Wavvy</span>
          </h2>
          
          <div className="max-w-md space-y-4">
            <p className="text-white/60 font-medium leading-relaxed">
              Our servers take a few seconds to warm up after a period of inactivity. 
              We'll have your room ready in just a moment!
            </p>
            
            <div className="flex items-center justify-center gap-3 py-4">
              <div className="flex gap-1">
                {[1, 2, 3].map((i) => (
                  <div 
                    key={i} 
                    className="w-2 h-2 bg-primary rounded-full animate-bounce" 
                    style={{ animationDelay: `${i * 0.2}s` }}
                  />
                ))}
              </div>
              <span className="text-xs font-black uppercase tracking-[0.2em] text-primary/60">
                Establishing Connection...
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-4 text-left">
              <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center shrink-0">
                <Info className="text-orange-500" size={20} />
              </div>
              <div>
                <p className="text-xs font-bold text-white/90 mb-1">Did you know?</p>
                <p className="text-[10px] text-white/40 leading-relaxed font-medium">
                  We use eco-friendly hosting that "sleeps" when not in use to save energy. 
                  Thanks for your patience!
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {!isConnected && !isWakingUp && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[90] animate-in fade-in slide-in-from-bottom-4 duration-500">
           <div className="bg-[#111] border border-white/10 rounded-full px-6 py-3 flex items-center gap-3 shadow-2xl backdrop-blur-xl">
             <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(234,179,8,0.5)]"></div>
             <span className="text-xs font-black uppercase tracking-widest text-white/80">Connecting to server...</span>
             <Activity className="text-white/20 animate-pulse" size={14} />
           </div>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        {/* Main Content: Video and Video Tools */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6 bg-black custom-scrollbar">
          {/* Section 1: Video Player Area */}
          <div className="w-full aspect-video bg-zinc-900 rounded-lg overflow-hidden relative shadow-2xl border border-white/5">
            {videoUrl ? (
              <>
                <ReactPlayer
                  key={videoUrl}
                  ref={playerRef}
                  url={videoUrl}
                  width="100%"
                  height="100%"
                  playing={isPlaying}
                  controls={true}
                  muted={!hasInteracted}
                  onPlay={onPlay}
                  onPause={onPause}
                  onSeek={onSeek}
                  onEnded={onEnded}
                  onReady={() => console.log("ReactPlayer: Ready")}
                  onError={(e) => console.error("ReactPlayer Error:", e)}
                  config={{
                    youtube: {
                      playerVars: {
                        autoplay: 0,
                        modestbranding: 1,
                        rel: 0,
                        playsinline: 1,
                      },
                    },
                  }}
                />

                {/* Floating Emojis Overlay */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden z-30">
                  {reactions.map((r) => (
                    <div
                      key={r.id}
                      className="reaction-bubble"
                      style={{left: `${r.left}%`}}
                      onAnimationEnd={() => {
                        setReactions((prev) => prev.filter((item) => item.id !== r.id));
                      }}
                    >
                      {r.emoji}
                    </div>
                  ))}
                </div>

                {!hasInteracted && videoUrl && (
                  <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-20 backdrop-blur-sm">
                    <button
                      onClick={handleInteraction}
                      className="bg-primary text-black font-black px-10 py-5 rounded-lg flex items-center gap-3 hover:scale-110 transition-all shadow-2xl active:scale-95 ring-4 ring-primary/20"
                    >
                      <Play fill="black" size={24} />
                      <span className="text-lg uppercase tracking-widest font-black">
                        Click to start sync
                      </span>
                    </button>
                    <p className="text-[10px] text-white/40 mt-6 uppercase tracking-[0.3em] font-bold">
                      Unlocks Audio & Synchronizes Video
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center opacity-10">
                <Video size={120} strokeWidth={1} className="mb-4" />
                <p className="text-2xl font-black italic tracking-tighter uppercase">
                  Wavvy Waiting Room
                </p>
              </div>
            )}
          </div>

          {/* Sleek Emoji Reactions Bar */}
          <EmojiReactions videoUrl={videoUrl} sendReaction={sendReaction} />

          {/* Native WebRTC Video Call Grid */}
          {isInCall && (
            <div className="bg-[#141414] rounded-xl border border-white/5 p-4 shadow-lg flex gap-4 overflow-x-auto custom-scrollbar relative min-h-[160px] items-center">
              <div className="absolute right-4 top-4 z-10 flex gap-2">
                {isPrivateCall && !isHost && (
                  <>
                    <button
                      onClick={toggleVideoCallAudio}
                      className={`p-2 rounded-full cursor-pointer transition-transform hover:scale-110 ${
                        isAudioMuted ? "bg-red-500 text-white" : "bg-zinc-800/80 hover:bg-zinc-800 text-white"
                      }`}
                      title={isAudioMuted ? "Unmute Mic" : "Mute Mic"}
                    >
                      {isAudioMuted ? <MicOff size={14} /> : <Mic size={14} />}
                    </button>
                    <button
                      onClick={toggleVideoCallVideo}
                      className={`p-2 rounded-full cursor-pointer transition-transform hover:scale-110 ${
                        isVideoMuted ? "bg-red-500 text-white" : "bg-zinc-800/80 hover:bg-zinc-800 text-white"
                      }`}
                      title={isVideoMuted ? "Turn Camera On" : "Turn Camera Off"}
                    >
                      {isVideoMuted ? <VideoOff size={14} /> : <Video size={14} />}
                    </button>
                  </>
                )}
                <button
                  onClick={endVideoCall}
                  className="bg-red-500/80 hover:bg-red-500 text-white p-2 rounded-full shadow-lg transition-transform hover:scale-110 cursor-pointer"
                  title="End Call"
                >
                  <X size={16} />
                </button>
              </div>

              {isPrivateCall && Object.keys(peers).length === 0 && (
                <div className="flex-1 flex flex-col items-center justify-center text-white/40 text-xs font-semibold py-8 animate-pulse">
                  <Video size={20} className="mb-2 text-primary animate-bounce" />
                  Waiting for partner to join...
                </div>
              )}

              {localStream && (
                <div className="w-48 h-32 shrink-0 relative bg-black rounded-lg overflow-hidden border border-white/10 group">
                  <PeerVideo stream={localStream} isLocal={true} />
                  <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-0.5 rounded text-[10px] font-black uppercase text-white/80 backdrop-blur-sm z-10">
                    You
                  </div>
                  
                  {/* Local controls overlay visible on hover */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-3 transition-opacity duration-300 z-20">
                    <button
                      onClick={toggleVideoCallAudio}
                      className={`p-2 rounded-full cursor-pointer transition-all hover:scale-110 ${
                        isAudioMuted ? "bg-red-500 text-white" : "bg-black/60 hover:bg-black/80 text-white"
                      }`}
                      title={isAudioMuted ? "Unmute Mic" : "Mute Mic"}
                    >
                      {isAudioMuted ? <MicOff size={14} /> : <Mic size={14} />}
                    </button>
                    <button
                      onClick={toggleVideoCallVideo}
                      className={`p-2 rounded-full cursor-pointer transition-all hover:scale-110 ${
                        isVideoMuted ? "bg-red-500 text-white" : "bg-black/60 hover:bg-black/80 text-white"
                      }`}
                      title={isVideoMuted ? "Turn Camera On" : "Turn Camera Off"}
                    >
                      {isVideoMuted ? <VideoOff size={14} /> : <Video size={14} />}
                    </button>
                  </div>
                </div>
              )}
              {Object.entries(peers).map(([peerId, stream]) => {
                const peerName = members.find((m) => m.id === peerId)?.name || "Peer";
                
                // Determine label dynamically for private 1-on-1 calls vs group calls
                const isPrivate = currentVideoRoomId.current && currentVideoRoomId.current.includes("private-");
                let displayName = peerName;
                if (isPrivate) {
                  displayName = isHost ? peerName : "You";
                }

                return (
                  <div
                    key={peerId}
                    className="w-48 h-32 shrink-0 relative bg-black rounded-lg overflow-hidden border border-white/10 group"
                  >
                    <PeerVideo stream={stream} isLocal={false} />
                    <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-0.5 rounded text-[10px] font-black uppercase text-white/80 backdrop-blur-sm">
                      {displayName}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Section 2: Load Video Card */}
          <LoadVideoCard
            handleLoadVideo={handleLoadVideo}
            canControl={canControl}
            isHost={isHost}
          />

          {/* Section 3: UP NEXT Card */}
          <UpNextQueue
            playlist={playlist}
            videoUrl={videoUrl}
            canControl={canControl}
            autoPlayNext={autoPlayNext}
            emitCurrentState={emitCurrentState}
            onToggleAutoPlay={() => {
              socketRef.current.emit("toggle-auto-play", {
                roomId,
                autoPlayNext: !autoPlayNext,
              });
            }}
            onClearQueue={() => {
              socketRef.current.emit("set-playlist", {
                roomId,
                playlist: [],
              });
            }}
            onRemoveFromPlaylist={(index) => {
              socketRef.current.emit("remove-from-playlist", {
                roomId,
                index,
              });
            }}
            onAddToPlaylist={(url) => {
              const cleaned = cleanUrl(url);
              socketRef.current.emit("add-to-playlist", { roomId, url: cleaned });
            }}
            onSkipToNext={skipToNext}
            currentUser={user}
          />
        </main>

        {/* Sidebar: Chat & Members */}
        <aside className="w-[420px] bg-[#0f0f0f] border-l border-white/5 flex flex-col overflow-y-auto custom-scrollbar pb-4 shrink-0">
          {/* Hidden Voice Chat Audio streams */}
          {isInVoice && Object.entries(voicePeers).map(([peerId, stream]) => (
            <VoiceAudio key={peerId} stream={stream} />
          ))}

          {/* Voice Chat Card */}
          <VoiceChannel
            isInVoice={isInVoice}
            voiceMembers={voiceMembers}
            isMuted={isMuted}
            toggleMuteVoice={toggleMuteVoice}
            endVoiceChat={endVoiceChat}
            startVoiceChat={startVoiceChat}
          />

          {/* Unified Chat Card */}
          <ChatCard
            messages={messages}
            currentUser={user}
            canControl={canControl}
            onClearChat={() => socketRef.current.emit("clear-chat", { roomId })}
            onSendMessage={(msgText) => {
              socketRef.current.emit("send-message", {
                roomId,
                message: msgText,
                sender: user.name,
              });
            }}
          />

          {/* Members Card */}
          <MembersList
            members={members}
            isHost={isHost}
            currentUser={user}
            canControl={canControl}
            isInCall={isInCall}
            socketId={socketRef.current?.id}
            onTogglePermission={togglePermission}
            onInviteToCall={inviteToCall}
            onKickUser={handleKick}
            onGrantAll={grantAll}
            onRevokeAll={revokeAll}
            onStartVideoCall={startVideoCall}
            onRequestModAccess={requestModAccess}
          />
        </aside>
      </div>
    </div>
  );
};

export default RoomPage;
