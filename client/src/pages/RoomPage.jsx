import React, {useState, useEffect, useRef} from "react";
import {useParams, useNavigate, useLocation} from "react-router-dom";
import io from "socket.io-client";
import ReactPlayer from "react-player";
import toast from "react-hot-toast";
import {BACKEND_URL} from "../lib/env";
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

// Custom WebRTC hooks
import { useWebRTCCall } from "../hooks/useWebRTCCall";
import { useWebRTCVoice } from "../hooks/useWebRTCVoice";

const SOCKET_URL = BACKEND_URL;

const RoomPage = () => {
  const {roomId} = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const socketRef = useRef();
  const playerRef = useRef(null);
  const isSyncing = useRef(false);
  const scrollRef = useRef();

  const [roomName, setRoomName] = useState(location.state?.roomName || "");
  const [isPublic, setIsPublic] = useState(location.state?.isPublic || false);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [showInfo, setShowInfo] = useState(false);

  const [videoUrl, setVideoUrl] = useState("");
  const [inputUrl, setInputUrl] = useState("");
  const [queueInput, setQueueInput] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [members, setMembers] = useState([]);
  const [playlist, setPlaylist] = useState([]);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [cachedRoomState, setCachedRoomState] = useState({
    state: "paused",
    time: 0,
  });

  const user = JSON.parse(localStorage.getItem("user"));
  const [showMemberMenu, setShowMemberMenu] = useState(null);
  const [showChatSettings, setShowChatSettings] = useState(false);
  const [isQueueExpanded, setIsQueueExpanded] = useState(false);
  const [autoPlayNext, setAutoPlayNext] = useState(true);

  // Connection State
  const [isConnected, setIsConnected] = useState(false);
  const [isWakingUp, setIsWakingUp] = useState(false);
  const wakingTimeoutRef = useRef(null);

  // WebRTC hooks for video call and voice chat
  const {
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
  } = useWebRTCCall(socketRef, roomId, user, members);

  const {
    isInVoice,
    isMuted,
    voiceMembers,
    voicePeers,
    startVoiceChat,
    endVoiceChat,
    toggleMuteVoice,
  } = useWebRTCVoice(socketRef, roomId, user, members);

  // Live reactions state
  const [reactions, setReactions] = useState([]);



  useEffect(() => {
    if (!user) {
      navigate("/login", {state: {from: `/room/${roomId}`}});
      return;
    }

    // Add this room to user's personal history if it's not already there
    const historyKey = `myRooms_${user.email}`;
    const savedRooms = JSON.parse(localStorage.getItem(historyKey) || "[]");
    if (!savedRooms.find((r) => r.id === roomId)) {
      const newEntry = {
        id: roomId,
        name: "Visited Room",
        createdAt: new Date().toISOString(),
      };
      localStorage.setItem(
        historyKey,
        JSON.stringify([newEntry, ...savedRooms]),
      );
    }

    // More aggressive socket initialization for production
    socketRef.current = io(SOCKET_URL, {
      transports: ["websocket"],
      upgrade: false,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      timeout: 20000,
    });

    socketRef.current.on("connect", () => {
      console.log("🚀 Socket connected successfully:", socketRef.current.id);
      setIsConnected(true);
      setIsWakingUp(false);
      if (wakingTimeoutRef.current) clearTimeout(wakingTimeoutRef.current);
      
      toast.success("Connected to server!", { 
        id: "socket-status",
        icon: '⚡',
        duration: 3000,
        style: {
          background: "#111",
          color: "#f97316",
          border: "1px solid rgba(249,115,22,0.2)",
        }
      });
      socketRef.current.emit("join-room", {
        roomId,
        user,
        roomName: location.state?.roomName || "",
        isPublic: location.state?.isPublic || false
      });
    });

    socketRef.current.on("disconnect", () => {
      setIsConnected(false);
      // Start a timeout to show waking up if it stays disconnected
      wakingTimeoutRef.current = setTimeout(() => {
        setIsWakingUp(true);
      }, 3000);
    });

    socketRef.current.on("connect_error", (err) => {
      console.error("❌ Socket Connection Error:", err.message);
      setIsConnected(false);
      
      // If we haven't connected yet, or it's been a while, show the waking up UI
      if (!isWakingUp && !wakingTimeoutRef.current) {
        wakingTimeoutRef.current = setTimeout(() => {
          setIsWakingUp(true);
        }, 2000);
      }
    });

    socketRef.current.on("receive-message", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    socketRef.current.on("chat-history", (history) => {
      setMessages(history);
    });

    socketRef.current.on("update-members", (userList) => {
      setMembers(userList);
    });

    socketRef.current.on("sync-voice-members", (list) => {
      setVoiceMembers(list || []);
    });

    socketRef.current.on("sync-playlist", (list) => {
      setPlaylist(list || []);
    });

    socketRef.current.on("room-metadata", ({roomName, isPublic}) => {
      setRoomName(roomName);
      setIsPublic(isPublic);
    });

    socketRef.current.on("kicked", (reason) => {
      alert(reason || "You have been removed from the room.");
      navigate("/");
    });

    socketRef.current.on("incoming-video-call", ({callerName, callerId, privateRoomId}) => {
      toast(
        (t) => (
          <div className="flex flex-col gap-3 p-1 font-sans">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center animate-pulse shrink-0">
                <Video size={20} className="text-primary" />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-sm text-white truncate">{callerName}</p>
                <p className="text-xs text-white/60 truncate">
                  Inviting you to Video Call
                </p>
              </div>
            </div>
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => {
                  toast.dismiss(t.id);
                  startVideoCall(false, privateRoomId);
                  socketRef.current.emit("video-invite-response", {
                    targetId: callerId,
                    accepted: true,
                    userName: user.name,
                  });
                }}
                className="flex-1 bg-primary text-black font-bold py-2 rounded-lg text-xs transition-colors hover:bg-primary/90"
              >
                Join Call
              </button>
              <button
                onClick={() => {
                  toast.dismiss(t.id);
                  socketRef.current.emit("video-invite-response", {
                    targetId: callerId,
                    accepted: false,
                    userName: user.name,
                  });
                }}
                className="flex-1 bg-[#222] hover:bg-[#333] text-white font-bold py-2 rounded-lg text-xs transition-colors"
              >
                Decline
              </button>
            </div>
          </div>
        ),
        {
          duration: 30000, // 30 seconds
          position: "top-center",
          style: {
            background: "#111",
            color: "#fff",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "16px",
            padding: "16px",
          },
        },
      );
    });

    socketRef.current.on("video-invite-response", ({accepted, userName}) => {
      if (!accepted) {
        toast.error(`${userName} declined your video call invitation.`, {
          style: {
            background: "#111",
            color: "#fff",
            border: "1px solid rgba(255,0,0,0.2)",
          },
        });
      }
    });

    socketRef.current.on("mod-request", ({userId, userName}) => {
      toast(
        (t) => (
          <div className="flex flex-col gap-3 p-1 font-sans w-[250px]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-500/20 rounded-full flex items-center justify-center animate-pulse shrink-0">
                <AlertTriangle size={20} className="text-orange-500" />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-sm text-white truncate">
                  {userName}
                </p>
                <p className="text-xs text-white/60 truncate">
                  Wants Mod access
                </p>
              </div>
            </div>
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => {
                  toast.dismiss(t.id);
                  socketRef.current.emit("toggle-permission", {
                    roomId,
                    targetId: userId,
                    canControl: true,
                  });
                  toast.success(`${userName} is now a moderator`, {
                    style: {
                      background: "#111",
                      color: "#fff",
                      border: "1px solid rgba(255,255,255,0.1)",
                    },
                  });
                }}
                className="flex-1 bg-green-500/20 text-green-500 hover:bg-green-500/30 font-bold py-2 rounded-lg text-xs transition-colors border border-green-500/20"
              >
                Grant
              </button>
              <button
                onClick={() => toast.dismiss(t.id)}
                className="flex-1 bg-[#222] hover:bg-[#333] text-white font-bold py-2 rounded-lg text-xs transition-colors"
              >
                Ignore
              </button>
            </div>
          </div>
        ),
        {
          duration: 15000,
          position: "top-right",
          style: {
            background: "#111",
            color: "#fff",
            border: "1px solid rgba(255,165,0,0.2)",
            borderRadius: "16px",
            padding: "16px",
          },
        },
      );
    });

    socketRef.current.on("sync-video-load", ({url}) => {
      setVideoUrl(url);
    });

    socketRef.current.on("sync-auto-play", (val) => {
      setAutoPlayNext(val);
    });

    socketRef.current.on("sync-video", ({state, time}) => {
      isSyncing.current = true;
      setCachedRoomState({state, time});

      // Always sync the playback state, even if they haven't interacted yet!
      // (Because it is muted=true, background autoplay works)
      setIsPlaying(state === "playing");

      const player = playerRef.current;
      if (player && typeof player.getInternalPlayer === "function") {
        const internalPlayer = player.getInternalPlayer();
        if (internalPlayer && typeof player.getCurrentTime === "function") {
          const currentTime = player.getCurrentTime();
          const targetTime = time || 0;
          if (Math.abs(currentTime - targetTime) > 1.5) {
            player.seekTo(targetTime, "seconds");
          }
        }
      }
      setTimeout(() => {
        isSyncing.current = false;
      }, 1000);
    });

    socketRef.current.on("receive-reaction", ({emoji, sender, id}) => {
      setReactions((prev) => [
        ...prev,
        {
          id,
          emoji,
          sender,
          left: Math.random() * 80 + 10,
        },
      ]);
    });

    return () => {
      if (wakingTimeoutRef.current) clearTimeout(wakingTimeoutRef.current);
      socketRef.current?.disconnect();
    };
  }, [roomId]);

  // Messages scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleInteraction = () => {
    console.log("Interaction Overlay Clicked - Restoring sync");
    setHasInteracted(true);

    // Resume with whatever the current room state is
    const targetIsPlaying = cachedRoomState.state === "playing";
    setIsPlaying(targetIsPlaying);

    const player = playerRef.current;
    if (player && typeof player.seekTo === "function") {
      player.seekTo(cachedRoomState.time, "seconds");
    }
  };

  const cleanUrl = (url) => {
    if (!url) return "";
    const trimmedUrl = url.trim();
    // Use a more robust regex to extract the ID
    const match = trimmedUrl.match(
      /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/|live\/))([\w-]{11})/,
    );
    if (match && match[1]) {
      return `https://www.youtube.com/watch?v=${match[1]}`;
    }
    return trimmedUrl;
  };

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

  const handleLoadVideo = (e) => {
    if (e) e.preventDefault();
    if (inputUrl.trim()) {
      const cleaned = cleanUrl(inputUrl.trim());
      console.log("Emitting video-load:", cleaned);

      // Optimistic update for the person loading
      setVideoUrl(cleaned);
      setIsPlaying(true);
      setHasInteracted(true);

      socketRef.current.emit("video-load", {roomId, url: cleaned});
      setInputUrl("");
    }
  };

  const addToPlaylist = (e) => {
    if (e) e.preventDefault();
    if (queueInput.trim()) {
      const cleaned = cleanUrl(queueInput.trim());
      socketRef.current.emit("add-to-playlist", {roomId, url: cleaned});
      setQueueInput("");
    }
  };

  const skipToNext = () => {
    if (playlist.length > 0) {
      socketRef.current.emit("skip-to-next", {roomId});
    }
  };

  const sendMessage = (e) => {
    if (e) e.preventDefault();
    // Removed handleInteraction call to prevent chat from starting video automatically
    if (message.trim()) {
      socketRef.current.emit("send-message", {
        roomId,
        message: message.trim(),
        sender: user.name,
      });
      setMessage("");
    }
  };

  // --- Live Reaction ---
  const sendReaction = (emoji) => {
    if (!socketRef.current) return;
    socketRef.current.emit("send-reaction", {roomId, emoji, sender: user.name});
  };



  const handleKick = (targetId) => {
    socketRef.current.emit("kick-user", {roomId, targetId});
    setShowMemberMenu(null);
  };

  const togglePermission = (targetId, canControl) => {
    socketRef.current.emit("toggle-permission", {roomId, targetId, canControl});
    setShowMemberMenu(null);
  };

  const grantAll = () => {
    members.forEach((m) => {
      if (!m.isHost && !m.canControl) {
        socketRef.current.emit("toggle-permission", {
          roomId,
          targetId: m.id,
          canControl: true,
        });
      }
    });
  };

  const revokeAll = () => {
    members.forEach((m) => {
      if (!m.isHost && m.canControl) {
        socketRef.current.emit("toggle-permission", {
          roomId,
          targetId: m.id,
          canControl: false,
        });
      }
    });
  };

  const onPlay = () => {
    if (!hasInteracted) return;
    if (!canControl) {
      if (!isSyncing.current) {
        setIsPlaying(cachedRoomState.state === "playing");
      }
      return;
    }
    if (
      isSyncing.current ||
      !playerRef.current ||
      typeof playerRef.current.getCurrentTime !== "function"
    )
      return;

    const time = playerRef.current.getCurrentTime() || 0;
    socketRef.current.emit("video-state-change", {
      roomId,
      state: "playing",
      time,
    });
    setIsPlaying(true);
  };

  const onSeek = (seconds) => {
    if (!hasInteracted) return;
    if (!canControl) {
      if (!isSyncing.current && playerRef.current) {
        playerRef.current.seekTo(cachedRoomState.time || 0, "seconds");
      }
      return;
    }
    const finalSeconds = seconds || 0;
    socketRef.current.emit("video-state-change", {
      roomId,
      state: isPlaying ? "playing" : "paused",
      time: finalSeconds,
    });
  };

  const onEnded = () => {
    if (autoPlayNext && canControl && playlist.length > 0) {
      skipToNext();
    }
  };

  const onPause = () => {
    if (!hasInteracted) return;
    if (!canControl) {
      if (!isSyncing.current) {
        setIsPlaying(cachedRoomState.state === "playing");
      }
      return;
    }
    if (
      isSyncing.current ||
      !playerRef.current ||
      typeof playerRef.current.getCurrentTime !== "function"
    )
      return;

    const time = playerRef.current.getCurrentTime() || 0;
    socketRef.current.emit("video-state-change", {
      roomId,
      state: "paused",
      time,
    });
    setIsPlaying(false);
  };

  const me =
    members.find((m) => m.id === socketRef.current?.id) ||
    members.find((m) => m.email?.toLowerCase() === user?.email?.toLowerCase());
  const isHost = me?.isHost;
  const canControl = me?.canControl;

  // Function to explicitly emit state (used by buttons)
  const emitCurrentState = (targetState = null) => {
    if (!canControl || !playerRef.current) return;
    const finalState =
      targetState !== null ? targetState : isPlaying ? "playing" : "paused";
    const time = playerRef.current.getCurrentTime();
    console.log(`[Sync] Force Emitting: ${finalState} at ${time}`);
    socketRef.current.emit("video-state-change", {
      roomId,
      state: finalState,
      time,
    });
    if (targetState === "playing") {
      // Also re-broadcast URL just in case someone is on a blank screen
      socketRef.current.emit("video-load", {roomId, url: videoUrl});
    }
  };





  const requestModAccess = () => {
    socketRef.current.emit("request-mod", {roomId, userName: user.name});
    toast.success("Request sent to the host!", {
      style: {
        background: "#111",
        color: "#fff",
        border: "1px solid rgba(255,255,255,0.1)",
      },
    });
  };

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

              {!isPrivateCall && (
                <div className="w-48 h-32 shrink-0 relative bg-black rounded-lg overflow-hidden border border-white/10 group">
                  {localStream ? (
                    <PeerVideo stream={localStream} isLocal={true} />
                  ) : (
                    <div className="h-full flex items-center justify-center">
                      <Video className="text-white/20 animate-pulse" />
                    </div>
                  )}
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
