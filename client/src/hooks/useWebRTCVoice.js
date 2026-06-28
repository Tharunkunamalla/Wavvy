import { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";

export const useWebRTCVoice = (socketRef, roomId, user, members) => {
  const [isInVoice, setIsInVoice] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [voiceMembers, setVoiceMembers] = useState([]);
  const [voicePeers, setVoicePeers] = useState({});

  const voicePeersRef = useRef({});
  const localVoiceStreamRef = useRef(null);
  const [localVoiceStream, setLocalVoiceStream] = useState(null);
  const isInVoiceRef = useRef(false);
  const voiceCandidateQueue = useRef({});

  const startVoiceChat = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });
      setLocalVoiceStream(stream);
      localVoiceStreamRef.current = stream;
      setIsInVoice(true);
      isInVoiceRef.current = true;
      setIsMuted(false);

      socketRef.current?.emit("join-voice-chat", { roomId });

      setVoiceMembers((prev) => {
        const myId = socketRef.current?.id;
        if (!myId || prev.find((v) => v.userId === myId)) return prev;
        return [
          ...prev,
          {
            userId: myId,
            userName: user?.name || "User",
            muted: false,
          },
        ];
      });
      toast.success("Joined voice chat!", {
        style: {
          background: "#111",
          color: "#fff",
          border: "1px solid rgba(249,115,22,0.2)",
        },
      });
    } catch (err) {
      console.error("Failed to get local voice stream", err);
      toast.error("Microphone access is required for voice chat.", {
        style: {
          background: "#111",
          color: "#fff",
          border: "1px solid rgba(255, 0, 0, 0.2)",
        },
      });
    }
  };

  const endVoiceChat = () => {
    if (localVoiceStreamRef.current) {
      localVoiceStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    setLocalVoiceStream(null);
    localVoiceStreamRef.current = null;
    setIsInVoice(false);
    isInVoiceRef.current = false;
    setIsMuted(false);

    Object.values(voicePeersRef.current).forEach((pc) => pc.close());
    voicePeersRef.current = {};
    setVoicePeers({});
    setVoiceMembers([]);
    voiceCandidateQueue.current = {};

    socketRef.current?.emit("leave-voice-chat", { roomId });
    toast.success("Disconnected from voice chat.", {
      style: {
        background: "#111",
        color: "#fff",
        border: "1px solid rgba(255, 255, 255, 0.1)",
      },
    });
  };

  const toggleMuteVoice = () => {
    if (localVoiceStreamRef.current) {
      const nextMute = !isMuted;
      localVoiceStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !nextMute;
      });
      setIsMuted(nextMute);
      socketRef.current?.emit("voice-mute-toggle", { roomId, muted: nextMute });

      const myId = socketRef.current?.id;
      if (myId) {
        setVoiceMembers((prev) =>
          prev.map((v) => (v.userId === myId ? { ...v, muted: nextMute } : v))
        );
      }
    }
  };

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    const createVoicePeerConnection = (partnerId, partnerName) => {
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });

      if (localVoiceStreamRef.current) {
        localVoiceStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, localVoiceStreamRef.current);
        });
      }

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("voice-ice-candidate", {
            target: partnerId,
            caller: socket.id,
            candidate: event.candidate,
          });
        }
      };

      pc.ontrack = (event) => {
        console.log(`[Voice] Received track from ${partnerName}`);
        setVoicePeers((prev) => ({
          ...prev,
          [partnerId]: event.streams[0],
        }));
      };

      voicePeersRef.current[partnerId] = pc;
      return pc;
    };

    const handleUserJoinedVoice = async ({ userId, userName, muted }) => {
      if (userId === socket.id) return;

      if (!isInVoiceRef.current) {
        setVoiceMembers((prev) => {
          if (prev.find((v) => v.userId === userId)) return prev;
          return [...prev, { userId, userName, muted: muted || false }];
        });
        return;
      }
      
      console.log(`[Voice] User joined voice: ${userName} (${userId})`);
      
      const pc = createVoicePeerConnection(userId, userName);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      socket.emit("voice-offer", {
        target: userId,
        caller: socket.id,
        sdp: offer,
      });

      setVoiceMembers((prev) => {
        if (prev.find((v) => v.userId === userId)) return prev;
        return [...prev, { userId, userName, muted: muted || false }];
      });
    };

    const handleVoiceOffer = async ({ caller, sdp }) => {
      if (!isInVoiceRef.current) return;
      console.log(`[Voice] Received voice offer from ${caller}`);
      const partnerName = members.find((m) => m.id === caller)?.name || "Guest";
      
      const pc = createVoicePeerConnection(caller, partnerName);
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      socket.emit("voice-answer", {
        target: caller,
        caller: socket.id,
        sdp: answer,
      });

      const queue = voiceCandidateQueue.current[caller] || [];
      for (const candidate of queue) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.error("Error adding queued voice ice candidate:", e);
        }
      }
      voiceCandidateQueue.current[caller] = [];
    };

    const handleVoiceAnswer = async ({ caller, sdp }) => {
      console.log(`[Voice] Received voice answer from ${caller}`);
      const pc = voicePeersRef.current[caller];
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));

        const queue = voiceCandidateQueue.current[caller] || [];
        for (const candidate of queue) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (e) {
            console.error("Error adding queued voice ice candidate:", e);
          }
        }
        voiceCandidateQueue.current[caller] = [];
      }
    };

    const handleVoiceIceCandidate = async ({ caller, candidate }) => {
      const pc = voicePeersRef.current[caller];
      if (pc && pc.remoteDescription) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.error("Error adding voice ice candidate:", e);
        }
      } else {
        if (!voiceCandidateQueue.current[caller]) {
          voiceCandidateQueue.current[caller] = [];
        }
        voiceCandidateQueue.current[caller].push(candidate);
      }
    };

    const handleUserLeftVoice = ({ userId }) => {
      console.log(`[Voice] User left voice: ${userId}`);
      if (voicePeersRef.current[userId]) {
        voicePeersRef.current[userId].close();
        delete voicePeersRef.current[userId];
      }
      setVoicePeers((prev) => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
      setVoiceMembers((prev) => prev.filter((v) => v.userId !== userId));
    };

    const handleUserVoiceMuteUpdated = ({ userId, muted }) => {
      setVoiceMembers((prev) =>
        prev.map((v) => (v.userId === userId ? { ...v, muted } : v))
      );
    };

    socket.on("user-joined-voice", handleUserJoinedVoice);
    socket.on("voice-offer", handleVoiceOffer);
    socket.on("voice-answer", handleVoiceAnswer);
    socket.on("voice-ice-candidate", handleVoiceIceCandidate);
    socket.on("user-left-voice", handleUserLeftVoice);
    socket.on("user-voice-mute-updated", handleUserVoiceMuteUpdated);

    return () => {
      socket.off("user-joined-voice", handleUserJoinedVoice);
      socket.off("voice-offer", handleVoiceOffer);
      socket.off("voice-answer", handleVoiceAnswer);
      socket.off("voice-ice-candidate", handleVoiceIceCandidate);
      socket.off("user-left-voice", handleUserLeftVoice);
      socket.off("user-voice-mute-updated", handleUserVoiceMuteUpdated);
    };
  }, [socketRef.current, members]);

  // Clean up refs on unmount
  useEffect(() => {
    return () => {
      if (localVoiceStreamRef.current) {
        localVoiceStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      Object.values(voicePeersRef.current).forEach((pc) => pc.close());
    };
  }, []);

  return {
    isInVoice,
    isMuted,
    voiceMembers,
    voicePeers,
    startVoiceChat,
    endVoiceChat,
    toggleMuteVoice,
  };
};
