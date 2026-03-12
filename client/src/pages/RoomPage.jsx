import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import ReactPlayer from 'react-player';
import { Send, Users, Video, Link, LogOut, Play, Pause } from 'lucide-react';

const SOCKET_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

const RoomPage = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const socketRef = useRef();
  const playerRef = useRef(null);
  const isSyncing = useRef(false);
  
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [inputUrl, setInputUrl] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [members, setMembers] = useState([]);
  const [playlist, setPlaylist] = useState([]);
  const [localStream, setLocalStream] = useState(null);
  const localStreamRef = useRef(null);
  const [remoteStreams, setRemoteStreams] = useState({}); // { socketId: stream }
  const peerConnections = useRef({}); // { socketId: pc }
  const [userId, setUserId] = useState(() => 'User_' + Math.random().toString(36).substring(2, 6));

  useEffect(() => {
    socketRef.current = io(SOCKET_URL);
    
    socketRef.current.emit('join-room', roomId);

    socketRef.current.on('receive-message', (msg) => {
      setMessages(prev => [...prev, msg]);
    });

    socketRef.current.on('sync-video', ({ state, time }) => {
      isSyncing.current = true;
      setIsPlaying(state === 'playing');
      if (playerRef.current && Math.abs(playerRef.current.getCurrentTime() - time) > 1) {
        playerRef.current.seekTo(time, 'seconds');
      }
      setTimeout(() => { isSyncing.current = false; }, 500);
    });

    socketRef.current.on('sync-video-load', ({ url }) => {
      setVideoUrl(url);
    });

    socketRef.current.on('sync-playlist', (newPlaylist) => {
      setPlaylist(newPlaylist);
    });

    socketRef.current.on('user-joined', ({ userId: joinedId }) => {
      setMembers(prev => [...new Set([...prev, joinedId])]);
    });

    // WebRTC Signaling Handlers
    socketRef.current.on('user-started-call', async ({ sender }) => {
      if (localStreamRef.current) {
        const pc = createPeerConnection(sender);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socketRef.current.emit('video-offer', { roomId, offer });
      }
    });

    socketRef.current.on('video-offer', async ({ offer, sender }) => {
      const pc = createPeerConnection(sender);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socketRef.current.emit('video-answer', { roomId, answer, target: sender });
    });

    socketRef.current.on('video-answer', async ({ answer, sender }) => {
      const pc = peerConnections.current[sender];
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      }
    });

    socketRef.current.on('new-ice-candidate', async ({ candidate, sender }) => {
      const pc = peerConnections.current[sender];
      if (pc) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
    });

    return () => {
      socketRef.current.disconnect();
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [roomId]);

  const createPeerConnection = (targetId) => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current.emit('new-ice-candidate', { roomId, candidate: event.candidate, target: targetId });
      }
    };

    pc.ontrack = (event) => {
      setRemoteStreams(prev => ({ ...prev, [targetId]: event.streams[0] }));
    };

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => pc.addTrack(track, localStreamRef.current));
    }

    peerConnections.current[targetId] = pc;
    return pc;
  };

  const startCall = async () => {
    try {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        setLocalStream(null);
        localStreamRef.current = null;
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setLocalStream(stream);
      localStreamRef.current = stream;
      socketRef.current.emit('start-video-call', { roomId });
    } catch (err) {
      console.error("Error accessing media devices:", err);
      alert("Could not access camera/microphone.");
    }
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (message.trim()) {
      socketRef.current.emit('send-message', {
        roomId,
        message: message.trim(),
        sender: userId
      });
      setMessage('');
    }
  };

  const handleUrlChange = (e) => {
    e.preventDefault();
    if (inputUrl.trim()) {
      if (!videoUrl) {
        socketRef.current.emit('video-load', { roomId, url: inputUrl });
      } else {
        const newPlaylist = [...playlist, inputUrl];
        socketRef.current.emit('update-playlist', { roomId, playlist: newPlaylist });
      }
      setInputUrl('');
    }
  };

  const handleVideoEnd = () => {
    if (playlist.length > 0) {
      const nextUrl = playlist[0];
      const newPlaylist = playlist.slice(1);
      socketRef.current.emit('video-load', { roomId, url: nextUrl });
      socketRef.current.emit('update-playlist', { roomId, playlist: newPlaylist });
    }
  };

  const handlePlay = () => {
    if (isSyncing.current) return;
    socketRef.current.emit('video-state-change', {
      roomId,
      state: 'playing',
      time: playerRef.current.getCurrentTime()
    });
    setIsPlaying(true);
  };

  const handlePause = () => {
    if (isSyncing.current) return;
    socketRef.current.emit('video-state-change', {
      roomId,
      state: 'paused',
      time: playerRef.current.getCurrentTime()
    });
    setIsPlaying(false);
  };

  const handleSeek = (time) => {
    if (isSyncing.current) return;
    socketRef.current.emit('video-state-change', {
      roomId,
      state: 'seeking',
      time
    });
  };

  return (
    <div className="flex flex-col h-screen bg-black overflow-hidden font-sans">
      {/* Navbar */}
      <nav className="h-16 border-b border-white/5 flex items-center justify-between px-8 bg-black">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
            <Play className="text-primary fill-current" size={20} />
            <span className="text-xl font-black tracking-tighter italic">Wavvy</span>
          </div>
          <div className="h-6 w-px bg-white/10"></div>
          <div className="flex items-center gap-2">
            <span className="text-white/40 text-sm font-medium uppercase tracking-widest">Room</span>
            <span className="bg-white/10 px-3 py-1 rounded-full text-xs font-bold text-primary">{roomId}</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              alert("Invitation link copied!");
            }}
            className="p-2 hover:bg-white/5 rounded-full transition-colors text-white/60 hover:text-white"
          >
            <Link size={20} />
          </button>
          <button 
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-white/40 hover:text-red-500 transition-colors text-sm font-bold"
          >
            <LogOut size={18} />
            EXIT
          </button>
        </div>
      </nav>

      {/* Main Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Playback Area */}
        <div className="flex-1 flex flex-col p-6 overflow-y-auto">
          {/* Video Container */}
          <div className="relative aspect-video bg-zinc-900 rounded-3xl overflow-hidden shadow-2xl ring-1 ring-white/5 group">
            {videoUrl ? (
              <ReactPlayer
                ref={playerRef}
                url={videoUrl}
                width="100%"
                height="100%"
                playing={isPlaying}
                controls={true}
                onPlay={handlePlay}
                onPause={handlePause}
                onSeek={handleSeek}
                onEnded={handleVideoEnd}
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white/5">
                <Video size={100} strokeWidth={1} className="mb-6 animate-pulse" />
                <p className="text-xl font-medium tracking-tight">Ready for synchronized playback</p>
              </div>
            )}
          </div>

          {/* Controls & Input */}
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <form onSubmit={handleUrlChange} className="relative group">
                <input 
                  type="text" 
                  placeholder="Paste video link (YouTube, MP4)..." 
                  className="w-full bg-zinc-900/50 border border-white/5 rounded-2xl py-5 pl-6 pr-32 focus:outline-none focus:border-primary/50 transition-all font-medium text-lg"
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                />
                <button className="absolute right-2 top-2 bottom-2 bg-primary text-black font-black px-6 rounded-xl hover:scale-105 active:scale-95 transition-all text-sm uppercase tracking-tighter">
                  Load Stream
                </button>
              </form>

              {/* Streams Grid */}
              {(localStream || Object.keys(remoteStreams).length > 0) && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {localStream && (
                    <div className="aspect-video bg-zinc-900 rounded-2xl overflow-hidden border border-primary/20 relative">
                      <video ref={(el) => { if (el) el.srcObject = localStream; }} autoPlay muted className="w-full h-full object-cover mirror" />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                        <span className="text-[10px] font-black uppercase tracking-widest text-primary">Me</span>
                      </div>
                    </div>
                  )}
                  {Object.entries(remoteStreams).map(([socketId, stream]) => (
                    <div key={socketId} className="aspect-video bg-zinc-900 rounded-2xl overflow-hidden border border-white/5 relative">
                      <video ref={(el) => { if (el) el.srcObject = stream; }} autoPlay className="w-full h-full object-cover" />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                        <span className="text-[10px] font-black uppercase tracking-widest text-white/40">User_{socketId.substring(0, 4)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-6">
              <button 
                onClick={startCall}
                className={`w-full py-5 rounded-2xl flex items-center justify-center gap-3 font-black uppercase tracking-tighter transition-all shadow-xl ${localStream ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-white/5 text-white hover:bg-white/10 border border-white/5'}`}
              >
                <Video size={20} />
                {localStream ? 'End Camera' : 'Video Call'}
              </button>

              <div className="bg-zinc-900/40 border border-white/5 rounded-3xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-xs font-black uppercase tracking-widest text-white/40">Playlist</h4>
                  <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded font-bold">{playlist.length}</span>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                  {playlist.length > 0 ? playlist.map((url, idx) => (
                    <div key={idx} className="p-3 bg-black/40 border border-white/5 rounded-xl flex items-center gap-3 group">
                      <span className="text-[10px] font-black text-white/20 group-hover:text-primary transition-colors">{idx + 1}</span>
                      <p className="text-xs truncate text-white/50 flex-1">{url}</p>
                    </div>
                  )) : (
                    <p className="text-center py-4 text-white/10 text-xs italic">No videos queued</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Chat Drawer */}
        <aside className="w-80 border-l border-white/5 bg-black flex flex-col hidden xl:flex">
          <div className="p-6 border-b border-white/5">
            <h3 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
              <Users size={14} />
              Lobby ({members.length + 1})
            </h3>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex flex-col ${msg.sender === userId ? 'items-end' : 'items-start'}`}>
                <div className={`max-w-[100%] p-4 rounded-2xl text-sm font-medium ${msg.sender === userId ? 'bg-primary text-black rounded-tr-none' : 'bg-zinc-900 text-white rounded-tl-none border border-white/5'}`}>
                  {msg.message}
                </div>
                <span className="text-[10px] font-medium text-white/20 mt-2 px-1">
                  {msg.sender === userId ? 'ME' : msg.sender}
                </span>
              </div>
            ))}
          </div>

          <form onSubmit={sendMessage} className="p-6 bg-black border-t border-white/5">
            <div className="relative">
              <input 
                type="text" 
                placeholder="Say something..." 
                className="w-full bg-zinc-900 border border-white/5 rounded-2xl py-4 pl-5 pr-12 focus:outline-none focus:border-primary/50 transition-all text-sm"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
              <button className="absolute right-2 top-2 bottom-2 px-3 text-primary hover:scale-110 transition-transform">
                <Send size={18} />
              </button>
            </div>
          </form>
        </aside>
      </div>
    </div>
  );
};

export default RoomPage;
