import { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";

export const useWebRTCCall = (socketRef, roomId, user, members) => {
  const [isInCall, setIsInCall] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [peers, setPeers] = useState({});
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [isPrivateCall, setIsPrivateCall] = useState(false);

  const peersRef = useRef({});
  const localStreamRef = useRef(null);
  const isInCallRef = useRef(false);
  const candidateQueue = useRef({});
  const currentVideoRoomId = useRef(null);

  const startVideoCall = async (isInitiator = false, customVideoRoomId = null) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      setLocalStream(stream);
      localStreamRef.current = stream;
      setIsInCall(true);
      isInCallRef.current = true;
      setIsAudioMuted(false);
      setIsVideoMuted(false);
      
      const vRoomId = customVideoRoomId || `${roomId}-video`;
      currentVideoRoomId.current = vRoomId;
      setIsPrivateCall(vRoomId.includes("private-"));
      socketRef.current?.emit("join-video-call", { roomId: vRoomId });

      if (isInitiator) {
        socketRef.current?.emit("start-video-call", {
          roomId,
          callerName: user?.name || "User",
        });
      }
    } catch (err) {
      console.error("Failed to get local stream", err);
      alert("Microphone/Camera access required for video call.");
    }
  };

  const endVideoCall = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    setLocalStream(null);
    localStreamRef.current = null;
    setIsInCall(false);
    isInCallRef.current = false;
    setIsAudioMuted(false);
    setIsVideoMuted(false);
    setIsPrivateCall(false);

    Object.values(peersRef.current).forEach((pc) => pc.close());
    peersRef.current = {};
    setPeers({});
    candidateQueue.current = {};

    if (socketRef.current) {
      socketRef.current.emit("leave-video-call", {
        roomId: currentVideoRoomId.current || `${roomId}-video`,
      });
    }
    currentVideoRoomId.current = null;
  };

  const inviteToCall = async (targetId) => {
    const myId = socketRef.current?.id;
    if (!myId) return;
    const privateRoomId = `private-${[myId, targetId].sort().join("-")}-video`;
    
    if (!isInCallRef.current) {
      await startVideoCall(false, privateRoomId);
    }
    
    socketRef.current?.emit("invite-to-video-call", {
      targetId,
      callerName: user?.name || "User",
      privateRoomId,
    });
    toast.success("Invitation sent!", {
      style: {
        background: "#111",
        color: "#fff",
        border: "1px solid rgba(255,255,255,0.1)",
      },
    });
  };

  const toggleVideoCallAudio = () => {
    if (localStreamRef.current) {
      const nextMute = !isAudioMuted;
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !nextMute;
      });
      setIsAudioMuted(nextMute);
    }
  };

  const toggleVideoCallVideo = () => {
    if (localStreamRef.current) {
      const nextMute = !isVideoMuted;
      localStreamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = !nextMute;
      });
      setIsVideoMuted(nextMute);
    }
  };

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    const createPeerConnection = (partnerId) => {
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, localStreamRef.current);
        });
      }

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("video-ice-candidate", {
            target: partnerId,
            caller: socket.id,
            candidate: event.candidate,
          });
        }
      };

      pc.ontrack = (event) => {
        setPeers((prev) => ({
          ...prev,
          [partnerId]: event.streams[0],
        }));
      };

      peersRef.current[partnerId] = pc;
      return pc;
    };

    const handleUserJoinedVideo = async ({ userId }) => {
      if (!isInCallRef.current) return;
      const pc = createPeerConnection(userId);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit("video-offer", {
        target: userId,
        caller: socket.id,
        sdp: offer,
      });
    };

    const handleVideoOffer = async ({ caller, sdp }) => {
      if (!isInCallRef.current) return;
      const pc = createPeerConnection(caller);
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("video-answer", {
        target: caller,
        caller: socket.id,
        sdp: answer,
      });

      const queue = candidateQueue.current[caller] || [];
      for (const candidate of queue) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.error("Error adding queued video ice candidate:", e);
        }
      }
      candidateQueue.current[caller] = [];
    };

    const handleVideoAnswer = async ({ caller, sdp }) => {
      const pc = peersRef.current[caller];
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));

        const queue = candidateQueue.current[caller] || [];
        for (const candidate of queue) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (e) {
            console.error("Error adding queued video ice candidate:", e);
          }
        }
        candidateQueue.current[caller] = [];
      }
    };

    const handleVideoIceCandidate = async ({ caller, candidate }) => {
      const pc = peersRef.current[caller];
      if (pc && pc.remoteDescription) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.error("Error adding video ice candidate:", e);
        }
      } else {
        if (!candidateQueue.current[caller]) {
          candidateQueue.current[caller] = [];
        }
        candidateQueue.current[caller].push(candidate);
      }
    };

    const handleUserLeftVideo = ({ userId }) => {
      if (peersRef.current[userId]) {
        peersRef.current[userId].close();
        delete peersRef.current[userId];
      }
      setPeers((prev) => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
    };

    socket.on("user-joined-video", handleUserJoinedVideo);
    socket.on("video-offer", handleVideoOffer);
    socket.on("video-answer", handleVideoAnswer);
    socket.on("video-ice-candidate", handleVideoIceCandidate);
    socket.on("user-left-video", handleUserLeftVideo);

    return () => {
      socket.off("user-joined-video", handleUserJoinedVideo);
      socket.off("video-offer", handleVideoOffer);
      socket.off("video-answer", handleVideoAnswer);
      socket.off("video-ice-candidate", handleVideoIceCandidate);
      socket.off("user-left-video", handleUserLeftVideo);
    };
  }, [socketRef.current]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      Object.values(peersRef.current).forEach((pc) => pc.close());
    };
  }, []);

  return {
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
  };
};
