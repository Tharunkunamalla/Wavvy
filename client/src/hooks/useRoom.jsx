import React, { useState, useEffect, useRef } from "react";
import io from "socket.io-client";
import toast from "react-hot-toast";
import { Video, AlertTriangle } from "lucide-react";
import { BACKEND_URL } from "../lib/env";
import { useWebRTCCall } from "./useWebRTCCall";
import { useWebRTCVoice } from "./useWebRTCVoice";

const SOCKET_URL = BACKEND_URL;

export const useRoom = (roomId, user, navigate, location) => {
  const socketRef = useRef();
  const playerRef = useRef(null);
  const isSyncing = useRef(false);

  const [roomName, setRoomName] = useState(location.state?.roomName || "");
  const [isPublic, setIsPublic] = useState(location.state?.isPublic || false);
  const [messages, setMessages] = useState([]);
  
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
      navigate("/login", { state: { from: `/room/${roomId}` } });
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
        JSON.stringify([newEntry, ...savedRooms])
      );
    }

    // Socket initialization
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
        icon: "⚡",
        duration: 3000,
        style: {
          background: "#111",
          color: "#f97316",
          border: "1px solid rgba(249,115,22,0.2)",
        },
      });
      socketRef.current.emit("join-room", {
        roomId,
        user,
        roomName: location.state?.roomName || "",
        isPublic: location.state?.isPublic || false,
      });
    });

    socketRef.current.on("disconnect", () => {
      setIsConnected(false);
      wakingTimeoutRef.current = setTimeout(() => {
        setIsWakingUp(true);
      }, 3000);
    });

    socketRef.current.on("connect_error", (err) => {
      console.error("❌ Socket Connection Error:", err.message);
      setIsConnected(false);

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

    socketRef.current.on("sync-playlist", (list) => {
      setPlaylist(list || []);
    });

    socketRef.current.on("room-metadata", ({ roomName, isPublic }) => {
      setRoomName(roomName);
      setIsPublic(isPublic);
    });

    socketRef.current.on("kicked", (reason) => {
      alert(reason || "You have been removed from the room.");
      navigate("/");
    });

    socketRef.current.on(
      "incoming-video-call",
      ({ callerName, callerId, privateRoomId }) => {
        toast(
          (t) => (
            <div className="flex flex-col gap-3 p-1 font-sans">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center animate-pulse shrink-0">
                  <Video size={20} className="text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-sm text-white truncate">
                    {callerName}
                  </p>
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
            duration: 30000,
            position: "top-center",
            style: {
              background: "#111",
              color: "#fff",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "16px",
              padding: "16px",
            },
          }
        );
      }
    );

    socketRef.current.on("video-invite-response", ({ accepted, userName }) => {
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

    socketRef.current.on("mod-request", ({ userId, userName }) => {
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
        }
      );
    });

    socketRef.current.on("sync-video-load", ({ url }) => {
      setVideoUrl(url);
    });

    socketRef.current.on("sync-auto-play", (val) => {
      setAutoPlayNext(val);
    });

    socketRef.current.on("sync-video", ({ state, time }) => {
      isSyncing.current = true;
      setCachedRoomState({ state, time });

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

    socketRef.current.on("receive-reaction", ({ emoji, sender, id }) => {
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

  const handleInteraction = () => {
    console.log("Interaction Overlay Clicked - Restoring sync");
    setHasInteracted(true);

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
    const match = trimmedUrl.match(
      /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/|live\/))([\w-]{11})/
    );
    if (match && match[1]) {
      return `https://www.youtube.com/watch?v=${match[1]}`;
    }
    return trimmedUrl;
  };

  const handleLoadVideo = (e) => {
    if (e) e.preventDefault();
    if (inputUrl.trim()) {
      const cleaned = cleanUrl(inputUrl.trim());
      console.log("Emitting video-load:", cleaned);

      setVideoUrl(cleaned);
      setIsPlaying(true);
      setHasInteracted(true);

      socketRef.current.emit("video-load", { roomId, url: cleaned });
      setInputUrl("");
    }
  };

  const addToPlaylist = (e) => {
    if (e) e.preventDefault();
    if (queueInput.trim()) {
      const cleaned = cleanUrl(queueInput.trim());
      socketRef.current.emit("add-to-playlist", { roomId, url: cleaned });
      setQueueInput("");
    }
  };

  const skipToNext = () => {
    if (playlist.length > 0) {
      socketRef.current.emit("skip-to-next", { roomId });
    }
  };

  const sendReaction = (emoji) => {
    if (!socketRef.current) return;
    socketRef.current.emit("send-reaction", { roomId, emoji, sender: user.name });
  };

  const handleKick = (targetId) => {
    socketRef.current.emit("kick-user", { roomId, targetId });
  };

  const togglePermission = (targetId, canControl) => {
    socketRef.current.emit("toggle-permission", { roomId, targetId, canControl });
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
      socketRef.current.emit("video-load", { roomId, url: videoUrl });
    }
  };

  const requestModAccess = () => {
    socketRef.current.emit("request-mod", { roomId, userName: user.name });
    toast.success("Request sent to the host!", {
      style: {
        background: "#111",
        color: "#fff",
        border: "1px solid rgba(255,255,255,0.1)",
      },
    });
  };

  return {
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
    me,
    isHost,
    canControl,
    cleanUrl,

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
  };
};
