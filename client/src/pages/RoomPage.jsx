import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import io from 'socket.io-client';
import ReactPlayer from 'react-player';
import toast, { Toaster } from 'react-hot-toast';
import { 
  Send, Users, Video, Link as LinkIcon, LogOut, Play, Plus, 
  Clock, Monitor, Crown, Shield, ShieldOff, MoreVertical, 
  XCircle, Trash2, Copy, Check, Info, ChevronRight, SkipForward,
  Settings2, MessageSquare, History, AlignLeft, Maximize2, RefreshCw, Repeat, X, AlertTriangle
} from 'lucide-react';

const SOCKET_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5001';

const PeerVideo = ({ stream, isLocal }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted={isLocal}
      className="w-full h-full object-cover rounded-lg border border-white/10 shadow-lg"
    />
  );
};

const RoomPage = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  const socketRef = useRef();
  const playerRef = useRef(null);
  const isSyncing = useRef(false);
  const scrollRef = useRef();
  
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [showInfo, setShowInfo] = useState(false);

  const [videoUrl, setVideoUrl] = useState('');
  const [inputUrl, setInputUrl] = useState('');
  const [queueInput, setQueueInput] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [members, setMembers] = useState([]);
  const [playlist, setPlaylist] = useState([]);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [cachedRoomState, setCachedRoomState] = useState({ state: 'paused', time: 0 });
  
  const user = JSON.parse(localStorage.getItem('user'));
  const [showMemberMenu, setShowMemberMenu] = useState(null);
  const [showChatSettings, setShowChatSettings] = useState(false);
  const [isQueueExpanded, setIsQueueExpanded] = useState(false);
  const [autoPlayNext, setAutoPlayNext] = useState(true);

  // WebRTC State
  const [isInCall, setIsInCall] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [peers, setPeers] = useState({});
  const peersRef = useRef({});
  const localStreamRef = useRef(null);
  const isInCallRef = useRef(false);

  useEffect(() => {
    if (!user) {
      navigate('/login', { state: { from: `/room/${roomId}` } });
      return;
    }

    // Add this room to user's personal history if it's not already there
    const historyKey = `myRooms_${user.email}`;
    const savedRooms = JSON.parse(localStorage.getItem(historyKey) || '[]');
    if (!savedRooms.find(r => r.id === roomId)) {
      const newEntry = { id: roomId, name: 'Visited Room', createdAt: new Date().toISOString() };
      localStorage.setItem(historyKey, JSON.stringify([newEntry, ...savedRooms]));
    }

    socketRef.current = io(SOCKET_URL);
    
    socketRef.current.on('connect', () => {
      socketRef.current.emit('join-room', { roomId, user });
    });

    socketRef.current.on('receive-message', (msg) => {
      setMessages(prev => [...prev, msg]);
    });

    socketRef.current.on('chat-history', (history) => {
      setMessages(history);
    });

    socketRef.current.on('update-members', (userList) => {
      setMembers(userList);
    });

    socketRef.current.on('sync-playlist', (list) => {
      setPlaylist(list || []);
    });

    socketRef.current.on('kicked', () => {
       alert("You have been removed from the room.");
       navigate('/');
    });

    socketRef.current.on('incoming-video-call', ({ callerName }) => {
       toast((t) => (
         <div className="flex flex-col gap-3 p-1 font-sans">
           <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center animate-pulse">
               <Video size={20} className="text-primary" />
             </div>
             <div>
               <p className="font-bold text-sm text-white">{callerName}</p>
               <p className="text-xs text-white/60">Inviting you to Video Call</p>
             </div>
           </div>
           <div className="flex gap-2 mt-2">
             <button
               onClick={() => {
                 toast.dismiss(t.id);
                 startVideoCall(false);
                 socketRef.current.emit('video-invite-response', { targetId: callerName, accepted: true, userName: user.name });
               }}
               className="flex-1 bg-primary text-black font-bold py-2 rounded-lg text-xs transition-colors hover:bg-primary/90"
             >
               Join Call
             </button>
             <button
               onClick={() => {
                 toast.dismiss(t.id);
                 socketRef.current.emit('video-invite-response', { targetId: callerName, accepted: false, userName: user.name });
               }}
               className="flex-1 bg-[#222] hover:bg-[#333] text-white font-bold py-2 rounded-lg text-xs transition-colors"
             >
               Decline
             </button>
           </div>
         </div>
       ), {
         duration: 30000, // 30 seconds
         position: 'top-center',
         style: {
           background: '#111',
           color: '#fff',
           border: '1px solid rgba(255,255,255,0.1)',
           borderRadius: '16px',
           padding: '16px',
         },
       });
    });

    socketRef.current.on('video-invite-response', ({ accepted, userName }) => {
      if (!accepted) {
         toast.error(`${userName} declined your video call invitation.`, {
           style: { background: '#111', color: '#fff', border: '1px solid rgba(255,0,0,0.2)' }
         });
      }
    });

    socketRef.current.on('mod-request', ({ userId, userName }) => {
       toast((t) => (
         <div className="flex flex-col gap-3 p-1 font-sans w-[250px]">
           <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-orange-500/20 rounded-full flex items-center justify-center animate-pulse shrink-0">
               <AlertTriangle size={20} className="text-orange-500" />
             </div>
             <div className="min-w-0">
               <p className="font-bold text-sm text-white truncate">{userName}</p>
               <p className="text-xs text-white/60 truncate">Wants Mod access</p>
             </div>
           </div>
           <div className="flex gap-2 mt-2">
             <button
               onClick={() => {
                 toast.dismiss(t.id);
                 socketRef.current.emit('toggle-permission', { roomId, targetId: userId, canControl: true });
                 toast.success(`${userName} is now a moderator`, {
                   style: { background: '#111', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }
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
       ), {
         duration: 15000,
         position: 'top-right',
         style: { background: '#111', color: '#fff', border: '1px solid rgba(255,165,0,0.2)', borderRadius: '16px', padding: '16px' }
       });
    });

    socketRef.current.on('sync-video-load', ({ url }) => {
      setVideoUrl(url);
    });

    socketRef.current.on('sync-auto-play', (val) => {
      setAutoPlayNext(val);
    });

    socketRef.current.on('sync-video', ({ state, time }) => {
      isSyncing.current = true;
      setCachedRoomState({ state, time });
      
      // Always sync the playback state, even if they haven't interacted yet! 
      // (Because it is muted=true, background autoplay works)
      setIsPlaying(state === 'playing');
      
      const player = playerRef.current;
      if (player && typeof player.getInternalPlayer === 'function') {
        const internalPlayer = player.getInternalPlayer();
        if (internalPlayer && typeof player.getCurrentTime === 'function') {
          const currentTime = player.getCurrentTime();
          const targetTime = time || 0;
          if (Math.abs(currentTime - targetTime) > 1.5) {
            player.seekTo(targetTime, 'seconds');
          }
        }
      }
      setTimeout(() => { isSyncing.current = false; }, 1000);
    });

    // WebRTC Signaling Listeners
    const createPeerConnection = (partnerId) => {
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => {
          pc.addTrack(track, localStreamRef.current);
        });
      }

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socketRef.current.emit('video-ice-candidate', {
            target: partnerId,
            caller: socketRef.current.id,
            candidate: event.candidate
          });
        }
      };

      pc.ontrack = (event) => {
        setPeers(prev => ({
          ...prev,
          [partnerId]: event.streams[0]
        }));
      };

      peersRef.current[partnerId] = pc;
      return pc;
    };

    socketRef.current.on('user-joined-video', async ({ userId }) => {
      if (!isInCallRef.current) return;
      const pc = createPeerConnection(userId);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socketRef.current.emit('video-offer', { target: userId, caller: socketRef.current.id, sdp: offer });
    });

    socketRef.current.on('video-offer', async ({ caller, sdp }) => {
      if (!isInCallRef.current) return;
      const pc = createPeerConnection(caller);
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socketRef.current.emit('video-answer', { target: caller, caller: socketRef.current.id, sdp: answer });
    });

    socketRef.current.on('video-answer', async ({ caller, sdp }) => {
      const pc = peersRef.current[caller];
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      }
    });

    socketRef.current.on('video-ice-candidate', async ({ caller, candidate }) => {
      const pc = peersRef.current[caller];
      if (pc) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
    });

    socketRef.current.on('user-left-video', ({ userId }) => {
      if (peersRef.current[userId]) {
        peersRef.current[userId].close();
        delete peersRef.current[userId];
      }
      setPeers(prev => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
    });

    return () => {
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
    const targetIsPlaying = cachedRoomState.state === 'playing';
    setIsPlaying(targetIsPlaying);
    
    const player = playerRef.current;
    if (player && typeof player.seekTo === 'function') {
        player.seekTo(cachedRoomState.time, 'seconds');
    }
  };

  const cleanUrl = (url) => {
    if (!url) return '';
    const trimmedUrl = url.trim();
    // Use a more robust regex to extract the ID
    const match = trimmedUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/|live\/))([\w-]{11})/);
    if (match && match[1]) {
      return `https://www.youtube.com/watch?v=${match[1]}`;
    }
    return trimmedUrl;
  };

  const getYouTubeThumbnail = (url) => {
    try {
      if (url.includes('youtube.com') || url.includes('youtu.be')) {
        const videoId = url.split('v=')[1]?.split('&')[0] || url.split('youtu.be/')[1]?.split(/[?#]/)[0];
        if (videoId) return `https://img.youtube.com/vi/${videoId}/default.jpg`;
      }
    } catch(e) {}
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
      
      socketRef.current.emit('video-load', { roomId, url: cleaned });
      setInputUrl('');
    }
  };

  const addToPlaylist = (e) => {
    if (e) e.preventDefault();
    if (queueInput.trim()) {
      const cleaned = cleanUrl(queueInput.trim());
      socketRef.current.emit('add-to-playlist', { roomId, url: cleaned });
      setQueueInput('');
    }
  };

  const skipToNext = () => {
    if (playlist.length > 0) {
      socketRef.current.emit('skip-to-next', { roomId });
    }
  };

  const sendMessage = (e) => {
    if (e) e.preventDefault();
    // Removed handleInteraction call to prevent chat from starting video automatically
    if (message.trim()) {
      socketRef.current.emit('send-message', { roomId, message: message.trim(), sender: user.name });
      setMessage('');
    }
  };

  const handleKick = (targetId) => {
    socketRef.current.emit('kick-user', { roomId, targetId });
    setShowMemberMenu(null);
  };

  const togglePermission = (targetId, canControl) => {
    socketRef.current.emit('toggle-permission', { roomId, targetId, canControl });
    setShowMemberMenu(null);
  };

  const grantAll = () => {
    members.forEach(m => {
      if (!m.isHost && !m.canControl) {
        socketRef.current.emit('toggle-permission', { roomId, targetId: m.id, canControl: true });
      }
    });
  };

  const revokeAll = () => {
    members.forEach(m => {
      if (!m.isHost && m.canControl) {
        socketRef.current.emit('toggle-permission', { roomId, targetId: m.id, canControl: false });
      }
    });
  };

  const onPlay = () => {
    if (!hasInteracted) return;
    if (!canControl) {
      if (!isSyncing.current) {
        setIsPlaying(cachedRoomState.state === 'playing');
      }
      return;
    }
    if (isSyncing.current || !playerRef.current || typeof playerRef.current.getCurrentTime !== 'function') return;
    
    const time = playerRef.current.getCurrentTime() || 0;
    socketRef.current.emit('video-state-change', { 
      roomId, 
      state: 'playing', 
      time 
    });
    setIsPlaying(true);
  };

  const onSeek = (seconds) => {
    if (!hasInteracted) return;
    if (!canControl) {
      if (!isSyncing.current && playerRef.current) {
         playerRef.current.seekTo(cachedRoomState.time || 0, 'seconds');
      }
      return;
    }
    const finalSeconds = seconds || 0;
    socketRef.current.emit('video-state-change', { 
      roomId, 
      state: isPlaying ? 'playing' : 'paused', 
      time: finalSeconds
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
        setIsPlaying(cachedRoomState.state === 'playing');
      }
      return;
    }
    if (isSyncing.current || !playerRef.current || typeof playerRef.current.getCurrentTime !== 'function') return;
    
    const time = playerRef.current.getCurrentTime() || 0;
    socketRef.current.emit('video-state-change', { 
      roomId, 
      state: 'paused', 
      time 
    });
    setIsPlaying(false);
  };

  const me = members.find(m => m.id === socketRef.current?.id) || 
             members.find(m => m.email?.toLowerCase() === user?.email?.toLowerCase());
  const isHost = me?.isHost;
  const canControl = me?.canControl;

  // Function to explicitly emit state (used by buttons)
  const emitCurrentState = (targetState = null) => {
    if (!canControl || !playerRef.current) return;
    const finalState = targetState !== null ? targetState : (isPlaying ? 'playing' : 'paused');
    const time = playerRef.current.getCurrentTime();
    console.log(`[Sync] Force Emitting: ${finalState} at ${time}`);
    socketRef.current.emit('video-state-change', { roomId, state: finalState, time });
    if (targetState === 'playing') {
      // Also re-broadcast URL just in case someone is on a blank screen
      socketRef.current.emit('video-load', { roomId, url: videoUrl });
    }
  };

  const startVideoCall = async (isInitiator = false) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setLocalStream(stream);
      localStreamRef.current = stream;
      setIsInCall(true);
      isInCallRef.current = true;
      socketRef.current.emit('join-video-call', { roomId });
      
      if (isInitiator) {
        socketRef.current.emit('start-video-call', { roomId, callerName: user.name });
      }
    } catch (err) {
      console.error("Failed to get local stream", err);
      alert("Microphone/Camera access required for video call.");
    }
  };

  const endVideoCall = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    setLocalStream(null);
    localStreamRef.current = null;
    setIsInCall(false);
    isInCallRef.current = false;
    
    Object.values(peersRef.current).forEach(pc => pc.close());
    peersRef.current = {};
    setPeers({});
    
    socketRef.current.emit('leave-video-call', { roomId });
  };

  const inviteToCall = (targetId) => {
    socketRef.current.emit('invite-to-video-call', { targetId, callerName: user.name });
    setShowMemberMenu(null);
    toast.success('Invitation sent!', {
      style: { background: '#111', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }
    });
  };

  const requestModAccess = () => {
    socketRef.current.emit('request-mod', { roomId, userName: user.name });
    toast.success('Request sent to the host!', {
      style: { background: '#111', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }
    });
  };

  return (
    <div className="flex flex-col h-screen bg-[#0a0a0a] text-white font-sans overflow-hidden">
      <Toaster />
      {/* Navbar Section */}
      <nav className="h-14 flex items-center justify-between px-6 bg-[#0a0a0a] border-b border-white/5 z-50">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
             <Play className="text-primary fill-current" size={20} />
             <span className="text-xl font-black tracking-tighter italic">Wavvy</span>
          </div>
          <div className="flex items-center gap-4 text-xs font-medium text-white/40">
             <div className="flex items-center gap-2">
                <Copy size={12} className="cursor-pointer hover:text-white transition-colors" onClick={() => { 
                   navigator.clipboard.writeText(roomId); 
                   toast.success('Room ID Copied!', {
                     style: { background: '#111', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }
                   }); 
                }} />
                <span>Room ID: {roomId}</span>
             </div>
             <button onClick={() => { 
                navigator.clipboard.writeText(window.location.href); 
                toast.success('Share Link Copied!', {
                  style: { background: '#111', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }
                }); 
             }} className="flex items-center gap-1 hover:text-white transition-colors">
                <LinkIcon size={12} /> Share link
             </button>
          </div>
        </div>
        <div className="flex items-center gap-5">
           <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-xs font-black shadow-inner">
                 {user?.name ? user.name.charAt(0).toUpperCase() : '?'}
              </div>
              <span className="text-sm font-bold text-white/90 tracking-tight">{user?.name || 'Guest'}</span>
           </div>
           <div className="w-px h-5 bg-white/10 mx-1"></div>
           <button onClick={() => navigate('/')} className="text-xs font-bold uppercase tracking-widest text-red-500/60 hover:text-red-500 transition-colors flex items-center gap-2">
              <LogOut size={14} /> Exit
           </button>
        </div>
      </nav>

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
                        playsinline: 1
                      }
                    }
                  }}
                />
                  {!hasInteracted && videoUrl && (
                    <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-20 backdrop-blur-sm">
                       <button onClick={handleInteraction} className="bg-primary text-black font-black px-10 py-5 rounded-lg flex items-center gap-3 hover:scale-110 transition-all shadow-2xl active:scale-95 ring-4 ring-primary/20">
                          <Play fill="black" size={24} />
                          <span className="text-lg uppercase tracking-widest font-black">Click to start sync</span>
                       </button>
                       <p className="text-[10px] text-white/40 mt-6 uppercase tracking-[0.3em] font-bold">Unlocks Audio & Synchronizes Video</p>
                    </div>
                  )}
                </>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center opacity-10">
                   <Video size={120} strokeWidth={1} className="mb-4" />
                   <p className="text-2xl font-black italic tracking-tighter uppercase">Wavvy Waiting Room</p>
                </div>
              )}
           </div>

           {/* Native WebRTC Video Call Grid */}
           {isInCall && (
             <div className="bg-[#141414] rounded-xl border border-white/5 p-4 shadow-lg flex gap-4 overflow-x-auto custom-scrollbar relative">
                <button 
                  onClick={endVideoCall}
                  className="absolute right-4 top-4 z-10 bg-red-500/80 hover:bg-red-500 text-white p-2 rounded-full shadow-lg transition-transform hover:scale-110"
                  title="End Call"
                >
                  <X size={16} />
                </button>
                <div className="w-48 h-32 shrink-0 relative bg-black rounded-lg overflow-hidden border border-white/10 group">
                   {localStream ? <PeerVideo stream={localStream} isLocal={true} /> : <div className="h-full flex items-center justify-center"><Video className="text-white/20 animate-pulse"/></div>}
                   <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-0.5 rounded text-[10px] font-black uppercase text-white/80 backdrop-blur-sm">You</div>
                </div>
                {Object.entries(peers).map(([peerId, stream]) => (
                  <div key={peerId} className="w-48 h-32 shrink-0 relative bg-black rounded-lg overflow-hidden border border-white/10 group">
                     <PeerVideo stream={stream} isLocal={false} />
                     <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-0.5 rounded text-[10px] font-black uppercase text-white/80 backdrop-blur-sm">Peer</div>
                  </div>
                ))}
             </div>
           )}

           {/* Section 2: Load Video Card - Based on Image 2 */}
           <div className="bg-[#141414] rounded-xl border border-white/5 p-8 shadow-lg">
              <div className="flex items-center justify-between mb-6">
                 <h2 className="text-xl font-bold">Load Video</h2>
                 <button onClick={() => setShowInfo(!showInfo)} className="focus:outline-none">
                    <Info size={18} className={`cursor-pointer transition-colors ${showInfo ? 'text-white' : 'text-white/20 hover:text-white/60'}`} />
                 </button>
              </div>
              
              {showInfo && (
                 <div className="bg-[#161d2a] border border-[#2d3748] rounded-lg p-5 mb-6 text-sm animate-in fade-in slide-in-from-top-2">
                    <p className="text-blue-400 font-bold mb-3">Supported (auto-detected):</p>
                    <ul className="space-y-2 text-white/80">
                       <li><span className="font-bold text-white">YouTube:</span> youtube.com or youtu.be links</li>
                       <li><span className="font-bold text-white">Dropbox:</span> Share links (auto-converted)</li>
                       <li><span className="font-bold text-white">Direct:</span> Any .mp4, .webm, .ogg URL</li>
                    </ul>
                    <p className="text-red-400 font-bold mt-4">Not supported: <span className="text-white/60 font-normal">Google Drive</span></p>
                 </div>
              )}

              <form onSubmit={handleLoadVideo} className="space-y-4">
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

           {/* Section 3: UP NEXT Card - Based on Image 3 */}
           <div className="bg-[#141414] rounded-xl border border-white/5 p-6 shadow-lg">
              <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <AlignLeft size={18} className="text-white/60" />
                    <h2 className="text-sm font-bold uppercase tracking-widest">UP NEXT</h2>
                    {playlist.length > 0 && <span className="bg-primary text-white px-2 py-0.5 rounded-full text-[10px] font-black">{playlist.length}</span>}
                 </div>
                   <div className="flex items-center gap-4 text-white/30">
                    {/* Force Sync Button */}
                    <button 
                       onClick={() => emitCurrentState()}
                       className={`p-1 rounded hover:bg-white/5 transition-all active:scale-90 ${canControl ? 'opacity-100' : 'opacity-20 cursor-not-allowed'}`}
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
                       onClick={() => {
                          if (!canControl) return;
                          console.log("[AutoPlay] Toggling to:", !autoPlayNext);
                          socketRef.current.emit('toggle-auto-play', { roomId, autoPlayNext: !autoPlayNext });
                       }}
                       title={autoPlayNext ? "Auto Play Next: ON" : "Auto Play Next: OFF"}
                       className={`p-1 rounded hover:bg-white/5 transition-all active:scale-90 ${canControl ? 'opacity-100' : 'opacity-20 cursor-not-allowed'}`}
                       disabled={!canControl}
                    >
                       <Repeat 
                          size={14} 
                          className={`${autoPlayNext ? 'text-primary' : 'hover:text-primary'} transition-colors`} 
                       />
                    </button>

                    {/* Clear Playlist */}
                    <button 
                       onClick={() => canControl && socketRef.current.emit('set-playlist', { roomId, playlist: [] })} 
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
                       <Maximize2 size={14} className={`${isQueueExpanded ? 'text-primary' : 'hover:text-white'} transition-colors`} />
                    </button>
                 </div>
              </div>

              {/* Now Playing indicator */}
              {/* Now Playing indicator with Brand Glow */}
              <div className="flex items-center gap-2 mb-6 bg-primary/5 border border-primary/20 p-2.5 rounded text-sm relative overflow-hidden">
                 <div className="w-2 h-2 bg-primary rounded-full animate-pulse shadow-[0_0_8px_#f97316]"></div>
                 <span className="text-[11px] font-black text-primary uppercase tracking-wider ml-1">NOW PLAYING</span>
                 <span className="text-[11px] text-white/80 truncate flex-1 ml-2 font-medium">YouTube · {videoUrl ? videoUrl.split('v=')[1]?.substring(0, 11) + '...' : 'None'}</span>
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
                       if (e.key === 'Enter') {
                          e.preventDefault();
                          addToPlaylist();
                       }
                    }}
                 />
                 <button onClick={addToPlaylist} className="p-2.5 bg-primary/10 hover:bg-primary/20 rounded-md transition-colors border border-primary/20">
                    <Plus size={14} className="text-primary font-bold" />
                 </button>
              </div>

              {/* Queue List */}
              <div className={`space-y-1 mb-6 transition-all duration-500 ${isQueueExpanded ? 'max-h-[800px]' : 'max-h-[160px]'} overflow-y-auto custom-scrollbar px-1`}>
                 {playlist.length > 0 ? (
                    playlist.map((item, i) => {
                      // Handle both old string format and new object format
                      const url = typeof item === 'string' ? item : item.url;
                      const addedBy = typeof item === 'string' ? 'host' : item.addedBy;
                      
                      const thumbnail = getYouTubeThumbnail(url);
                      return (
                        <div key={i} className="flex items-center gap-4 py-2 border-b border-white/5 last:border-0 group transition-colors hover:bg-white/[0.02] px-2 rounded">
                           <span className="text-[11px] font-medium text-white/20 w-3">{i+1}</span>
                           <div className="w-10 h-6 bg-[#141414] rounded overflow-hidden flex items-center justify-center text-white/5 relative border border-white/5 shadow-sm">
                              {thumbnail ? (
                                 <img src={thumbnail} alt="Thumbnail" className="w-full h-full object-cover" />
                              ) : (
                                 <Monitor size={10} />
                              )}
                              <div className="absolute bottom-0 right-0 bg-black/80 text-[#ff0000] text-[5px] px-[2px] rounded-sm font-black">YT</div>
                           </div>
                           <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-white/90 truncate">YouTube · {url.includes('v=') ? url.split('v=')[1]?.substring(0, 11) : 'Video'}...</p>
                              <div className="flex items-center gap-1 mt-0.5">
                                <Users size={8} className="text-white/30" />
                                <p className="text-[9px] text-white/40">added by {addedBy === user.name ? 'you' : (addedBy || 'user')}</p>
                              </div>
                           </div>
                           {canControl && (
                             <button onClick={() => socketRef.current.emit('remove-from-playlist', { roomId, index: i })} className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-white/10 rounded">
                                <Trash2 size={12} className="text-white/40 hover:text-red-500" />
                             </button>
                           )}
                        </div>
                      )
                    })
                 ) : (
                    <div className="py-8 flex flex-col items-center justify-center opacity-10">
                       <Monitor size={24} />
                       <p className="text-[9px] font-black uppercase mt-2">Queue is empty</p>
                    </div>
                 )}
              </div>

              {/* Skip to Next button */}
              <button 
                 onClick={skipToNext}
                 disabled={playlist.length === 0 || !canControl}
                 className="w-full py-4 bg-primary/10 hover:bg-primary/20 border border-primary/20 rounded-xl text-primary text-xs font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all disabled:opacity-20 active:scale-95"
              >
                 <SkipForward size={16} /> Skip to Next
              </button>
           </div>
        </main>

        {/* Sidebar: Chat & Members */}
        <aside className="w-[420px] bg-[#0f0f0f] border-l border-white/5 flex flex-col overflow-y-auto custom-scrollbar pb-4 shrink-0">
           {/* Unified Chat Card */}
           <div className="flex-1 min-h-[450px] shrink-0 flex flex-col overflow-hidden border-b border-white/5 m-4 bg-[#141414] rounded-xl border border-white/5 shadow-lg">
              <div className="h-12 flex items-center justify-between px-5 border-b border-white/5 relative">
                 <h4 className="text-sm font-bold">Chat</h4>
                 {canControl && (
                    <div className="relative">
                       <button onClick={() => setShowChatSettings(!showChatSettings)} className="focus:outline-none p-1 hover:bg-white/5 rounded transition-colors active:scale-95">
                          <Settings2 size={14} className="text-white/40 hover:text-white transition-colors" />
                       </button>
                       {showChatSettings && (
                          <div className="absolute right-0 top-8 w-32 bg-[#1e1e1e] border border-white/10 rounded-lg shadow-2xl z-[100] p-1 animate-in slide-in-from-top-2">
                             <button 
                                onClick={() => {
                                   socketRef.current.emit('clear-chat', { roomId });
                                   setShowChatSettings(false);
                                   toast.success('Chat cleared', {
                                     style: { background: '#111', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }
                                   });
                                }} 
                                className="w-full text-left px-3 py-2 rounded-md hover:bg-red-500/10 text-[9px] font-black uppercase tracking-widest flex items-center gap-2 transition-colors text-red-500/80"
                             >
                                <Trash2 size={12} /> Clear Chat
                             </button>
                          </div>
                       )}
                    </div>
                 )}
              </div>
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                 {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-10 p-8">
                       <MessageSquare size={48} strokeWidth={1} className="mb-4" />
                       <p className="text-xs font-black uppercase tracking-widest">No messages yet. Start the conversation!</p>
                    </div>
                 ) : (
                    messages.map((msg, i) => {
                      const isMe = msg.sender === user.name;
                      const timeStr = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
                      
                      return (
                        <div key={i} className={`flex flex-col mb-4 ${isMe ? 'items-end' : 'items-start'}`}>
                           <div className="flex items-center gap-2 mb-1 px-1">
                              {!isMe && <span className="text-[10px] font-black text-primary uppercase tracking-tighter">{msg.sender}</span>}
                              <span className="text-[8px] font-medium text-orange-500">{timeStr}</span>
                              {isMe && <span className="text-[10px] font-black text-white/40 uppercase tracking-tighter">You</span>}
                           </div>
                           <div className={`max-w-[90%] px-4 py-2.5 rounded-2xl text-[13px] font-medium leading-relaxed transition-all hover:shadow-lg whitespace-pre-wrap ${
                               isMe 
                               ? 'bg-zinc-800 text-white rounded-tr-none border border-white/5 shadow-md' 
                               : 'bg-white/5 text-white/90 rounded-tl-none border border-white/10'
                           }`}>
                              {msg.message}
                           </div>
                        </div>
                      )
                    })
                 )}
              </div>
              <div className="p-4 bg-black/20">
                 <form onSubmit={sendMessage} className="relative flex items-center gap-2">
                    <textarea 
                       rows={1}
                       placeholder="Type a message..." 
                       className="flex-1 bg-[#1e1e1e] border border-white/5 rounded-lg py-3 px-4 pr-12 text-sm focus:outline-none focus:border-orange-500 transition-all font-medium resize-none min-h-[46px] max-h-[120px]" 
                       value={message} 
                       onChange={(e) => setMessage(e.target.value)} 
                       onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                             e.preventDefault();
                             sendMessage(e);
                          }
                       }}
                    />
                    <button type="submit" className="absolute right-3 text-orange-500 hover:text-primary transition-colors text-orange-900">
                       <Send size={18} />
                    </button>
                 </form>
                 <p className="text-[8px] text-center text-white/10 mt-3 font-medium uppercase tracking-widest">Press Enter to send • Shift + Enter for new line</p>
              </div>
           </div>

           {/* Members Card */}
           <div className="h-[350px] shrink-0 flex flex-col m-4 mt-0 bg-[#141414] rounded-xl border border-white/5 shadow-lg overflow-hidden">
              <div className="h-12 flex items-center px-5 border-b border-white/5 gap-2">
                 <Users size={14} className="text-white/40" />
                 <h4 className="text-sm font-bold">Members</h4>
                 <span className="ml-auto bg-white/5 px-2 py-0.5 rounded-full text-[10px] font-bold text-white/40">{members.length}</span>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                 {[...members].sort((a, b) => (b.isHost ? 1 : 0) - (a.isHost ? 1 : 0) || (b.canControl ? 1 : 0) - (a.canControl ? 1 : 0) || a.name.localeCompare(b.name)).map(m => (
                    <div key={m.id} className="flex items-center gap-3 bg-[#1e1e1e]/30 p-2.5 rounded-lg border border-white/5 group relative">
                       <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-xs font-black">
                          {m.name.charAt(0).toUpperCase()}
                       </div>
                       <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                             <h5 className="text-[11px] font-black truncate text-white/80">{m.name}</h5>
                             {m.isHost && <Crown size={10} className="text-yellow-500" />}
                          </div>
                          <p className={`text-[8px] font-black uppercase tracking-widest flex items-center gap-1 ${m.canControl ? 'text-green-500' : 'text-white/20'}`}>
                             {m.canControl ? "Moderator" : "Viewer"}
                          </p>
                       </div>
                       
                       {isHost && m.id !== socketRef.current?.id && (
                          <MoreVertical size={14} className="text-white/20 cursor-pointer hover:text-white" onClick={() => setShowMemberMenu(showMemberMenu === m.id ? null : m.id)} />
                       )}

                       {showMemberMenu === m.id && (
                          <div className="absolute right-10 top-8 w-44 bg-[#1e1e1e] border border-white/10 rounded-lg shadow-2xl z-[100] p-1 animate-in slide-in-from-top-2">
                             <button onClick={() => togglePermission(m.id, !m.canControl)} className="w-full text-left px-3 py-2 rounded-md hover:bg-white/5 text-[9px] font-black uppercase tracking-widest flex items-center gap-3 transition-colors text-white/60">
                                {m.canControl ? <ShieldOff size={12} /> : <Shield size={12} />} {m.canControl ? "Revoke" : "Grant"}
                             </button>
                             <button onClick={() => inviteToCall(m.id)} className="w-full text-left px-3 py-2 rounded-md hover:bg-primary/10 text-[9px] font-black uppercase tracking-widest flex items-center gap-3 transition-colors text-primary/80">
                                <Video size={12} /> Video Call
                             </button>
                             <button onClick={() => handleKick(m.id)} className="w-full text-left px-3 py-2 rounded-md hover:bg-red-500/10 text-[9px] font-black uppercase tracking-widest flex items-center gap-3 transition-colors text-red-500/60">
                                <XCircle size={12} /> Kick
                             </button>
                          </div>
                       )}
                    </div>
                 ))}
              </div>
              {isHost && (
                 <div className="p-4 grid grid-cols-2 gap-2 border-t border-white/5 bg-black/40">
                    <button onClick={grantAll} className="py-2.5 bg-green-500/10 hover:bg-green-500/20 text-green-500 border border-green-500/20 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all">Grant All</button>
                    <button onClick={revokeAll} className="py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all">Revoke All</button>
                    {!isInCall && (
                      <button onClick={() => startVideoCall(true)} className="col-span-2 py-4 bg-primary hover:bg-primary/90 text-white rounded-xl text-[11px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all mt-2 active:scale-95 shadow-lg shadow-primary/30">
                         <Video size={18} /> Start Video Call
                      </button>
                    )}
                 </div>
              )}
              {(!isHost && !canControl) && (
                 <div className="p-4 border-t border-white/5 bg-black/40">
                    <button onClick={requestModAccess} className="w-full py-4 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/20 hover:border-orange-500/40 text-orange-500 rounded-xl text-[11px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all active:scale-95 shadow-lg">
                       <Shield size={16} /> Request Mod Access
                    </button>
                 </div>
              )}
           </div>
        </aside>
      </div>
    </div>
  );
};

export default RoomPage;
