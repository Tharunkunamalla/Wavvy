import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import io from 'socket.io-client';
import ReactPlayer from 'react-player';
import { Send, Users, Video, Link, LogOut, Play, Plus, Clock, Monitor, Crown, Shield, ShieldOff, MoreVertical } from 'lucide-react';

const SOCKET_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5001';

const RoomPage = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const roomNameFromState = location.state?.roomName;
  
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
  const [remoteStreams, setRemoteStreams] = useState({});
  const peerConnections = useRef({});
  
  const user = JSON.parse(localStorage.getItem('user'));
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' or 'members'

  useEffect(() => {
    if (!user) {
      navigate('/login', { state: { from: `/room/${roomId}` } });
      return;
    }

    socketRef.current = io(SOCKET_URL);
    
    socketRef.current.emit('join-room', { roomId, user });

    socketRef.current.on('receive-message', (msg) => {
      setMessages(prev => [...prev, msg]);
    });

    socketRef.current.on('update-members', (userList) => {
      setMembers(userList);
    });

    socketRef.current.on('sync-video', ({ state, time }) => {
      isSyncing.current = true;
      setIsPlaying(state === 'playing');
      if (playerRef.current && Math.abs(playerRef.current.getCurrentTime() - time) > 2) {
        playerRef.current.seekTo(time, 'seconds');
      }
      setTimeout(() => { isSyncing.current = false; }, 1000);
    });

    socketRef.current.on('sync-video-load', ({ url }) => {
      setVideoUrl(url);
      setIsPlaying(true);
    });

    socketRef.current.on('sync-playlist', (newPlaylist) => {
      setPlaylist(newPlaylist);
    });

    // WebRTC
    socketRef.current.on('user-started-call', async ({ sender }) => {
      if (localStreamRef.current) {
        const pc = createPeerConnection(sender);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socketRef.current.emit('video-offer', { roomId, offer });
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

  const sendMessage = (e) => {
    e.preventDefault();
    if (message.trim()) {
      socketRef.current.emit('send-message', {
        roomId,
        message: message.trim(),
        sender: user.name
      });
      setMessage('');
    }
  };

  const handleUrlChange = (e) => {
    e.preventDefault();
    if (inputUrl.trim()) {
      socketRef.current.emit('video-load', { roomId, url: inputUrl.trim() });
      setIsPlaying(true); // Auto play on load
      setInputUrl('');
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

  const startCall = async () => {
    try {
      if (localStream) {
        localStream.getTracks().forEach(t => t.stop());
        setLocalStream(null);
        localStreamRef.current = null;
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setLocalStream(stream);
      localStreamRef.current = stream;
      socketRef.current.emit('start-video-call', { roomId });
    } catch (err) {
      alert("Camera access denied");
    }
  };

  return (
    <div className="flex flex-col h-screen bg-black text-white font-sans overflow-hidden">
      {/* Header */}
      <nav className="h-16 flex items-center justify-between px-8 border-b border-white/5 bg-black/50 backdrop-blur-xl z-50">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
            <Play className="text-white fill-current" size={20} />
            <span className="text-xl font-black tracking-tighter italic">SyncWatch</span>
          </div>
          <div className="h-6 w-px bg-white/10"></div>
          <div className="flex flex-col">
            <span className="text-xs font-black text-white/20 uppercase tracking-[0.2em] leading-none mb-1">Room</span>
            <span className="text-sm font-bold text-primary leading-none">{roomNameFromState || roomId}</span>
          </div>
        </div>

        <div className="flex items-center gap-6">
           <button 
             onClick={() => { navigator.clipboard.writeText(window.location.href); alert('Link Copied!'); }}
             className="text-white/40 hover:text-white transition-colors flex items-center gap-2 text-xs font-bold uppercase tracking-widest"
           >
             <Link size={16} />
             Share Link
           </button>
           <button 
             onClick={() => navigate('/')}
             className="text-red-500/60 hover:text-red-500 transition-colors flex items-center gap-2 text-xs font-bold uppercase tracking-widest"
           >
             <LogOut size={16} />
             Exit Room
           </button>
        </div>
      </nav>

      <div className="flex-1 flex overflow-hidden">
        {/* Main Section */}
        <main className="flex-1 flex flex-col p-8 overflow-y-auto custom-scrollbar lg:pr-4">
          {/* Video Player */}
          <div className="relative aspect-video bg-zinc-900 rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/5 ring-1 ring-white/10 group">
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
               />
             ) : (
               <div className="absolute inset-0 flex flex-col items-center justify-center text-white/5">
                 <Video size={120} strokeWidth={1} className="mb-6 animate-pulse" />
                 <p className="text-2xl font-black italic tracking-tighter">No video loaded</p>
                 <p className="text-sm font-medium text-white/20 mt-2">Add a video URL below to start watching together</p>
               </div>
             )}
          </div>

          {/* Load Stream Input */}
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-4 gap-8">
             <div className="lg:col-span-3 space-y-8">
                <div className="bg-zinc-900/50 p-8 rounded-[2rem] border border-white/5">
                   <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white/40 mb-6">Load Stream</h3>
                   <form onSubmit={handleUrlChange} className="relative">
                      <input 
                        type="text" 
                        placeholder="Paste YouTube, Dropbox, or direct .mp4 URL..." 
                        className="w-full bg-black/40 border border-white/10 rounded-2xl py-5 px-8 font-bold text-white/80 focus:outline-none focus:border-primary/50 transition-all"
                        value={inputUrl}
                        onChange={(e) => setInputUrl(e.target.value)}
                      />
                      <button className="absolute right-2 top-2 bottom-2 bg-white/10 hover:bg-white/20 text-white font-black px-8 rounded-xl transition-all border border-white/10 uppercase text-xs tracking-widest">
                        Load Video
                      </button>
                   </form>
                   <div className="mt-4 flex flex-wrap gap-4 text-[10px] font-bold text-white/30 uppercase tracking-widest">
                      <span className="flex items-center gap-1"><Shield size={10} className="text-green-500" /> YouTube Safe</span>
                      <span className="flex items-center gap-1"><Shield size={10} className="text-green-500" /> MP4 Direct</span>
                      <span className="flex items-center gap-1"><Shield size={10} className="text-green-500" /> No Buffering</span>
                   </div>
                </div>

                {/* Video Streams */}
                {(localStream || Object.keys(remoteStreams).length > 0) && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                     {localStream && (
                       <div className="aspect-video bg-zinc-900 rounded-2xl overflow-hidden border border-primary/20 relative shadow-2xl">
                          <video ref={el => { if(el) el.srcObject = localStream; }} autoPlay muted className="w-full h-full object-cover mirror" />
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black to-transparent p-3 flex items-center justify-between">
                             <span className="text-[10px] font-black text-primary uppercase tracking-widest">You</span>
                             <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                          </div>
                       </div>
                     )}
                  </div>
                )}
             </div>

             <div className="space-y-6">
                <button 
                  onClick={startCall}
                  className={`w-full py-5 rounded-2xl flex items-center justify-center gap-3 font-black uppercase tracking-widest transition-all shadow-2xl ${localStream ? 'bg-red-500 text-white' : 'bg-green-500 text-black hover:scale-[1.02]'}`}
                >
                  <Video size={18} />
                  {localStream ? 'End Call' : 'Start Video Call'}
                </button>

                <div className="bg-zinc-900/50 rounded-[2rem] border border-white/5 p-6 h-fit">
                   <div className="flex items-center justify-between mb-4">
                      <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Up Next</h4>
                      <Plus className="text-white/20 cursor-pointer hover:text-white" size={16} />
                   </div>
                   <div className="space-y-3">
                      {playlist.length > 0 ? playlist.map((url, i) => (
                        <div key={i} className="bg-black/40 p-3 rounded-xl border border-white/5 flex items-center gap-3 group">
                           <span className="text-[10px] font-black text-white/20 group-hover:text-primary transition-colors">{i+1}</span>
                           <p className="text-[10px] font-bold truncate text-white/40">{url}</p>
                        </div>
                      )) : (
                        <div className="py-8 flex flex-col items-center justify-center text-center">
                           <Monitor size={24} className="text-white/5 mb-2" />
                           <p className="text-[10px] font-bold text-white/10 uppercase tracking-widest">Queue is empty</p>
                        </div>
                      )}
                   </div>
                </div>
             </div>
          </div>
        </main>

        {/* Right Sidebar */}
        <aside className="w-[400px] border-l border-white/5 bg-black flex flex-col">
           {/* Tabs */}
           <div className="flex border-b border-white/5 px-6 pt-4 gap-6">
              <button 
                onClick={() => setActiveTab('chat')}
                className={`pb-4 text-xs font-black uppercase tracking-[0.2em] transition-all relative ${activeTab === 'chat' ? 'text-primary' : 'text-white/20'}`}
              >
                Chat
                {activeTab === 'chat' && <div className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-primary"></div>}
              </button>
              <button 
                onClick={() => setActiveTab('members')}
                className={`pb-4 text-xs font-black uppercase tracking-[0.2em] transition-all relative ${activeTab === 'members' ? 'text-primary' : 'text-white/20'}`}
              >
                Members ({members.length})
                {activeTab === 'members' && <div className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-primary"></div>}
              </button>
           </div>

           {activeTab === 'chat' ? (
             <>
               <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                  {messages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-20">
                       <Send size={40} strokeWidth={1} className="mb-4" />
                       <p className="text-xs font-black uppercase tracking-widest">No messages yet</p>
                       <p className="text-[10px] font-medium mt-1">Start the conversation!</p>
                    </div>
                  )}
                  {messages.map((msg, i) => (
                    <div key={i} className={`flex flex-col ${msg.sender === user.name ? 'items-end' : 'items-start'}`}>
                       <div className={`max-w-[85%] p-4 rounded-2xl text-sm font-medium ${msg.sender === user.name ? 'bg-zinc-800 text-white rounded-tr-none border border-white/5' : 'bg-primary text-black rounded-tl-none'}`}>
                          {msg.message}
                       </div>
                       <span className="text-[10px] font-black text-white/20 mt-2 px-1 uppercase tracking-widest">
                         {msg.sender === user.name ? 'You' : msg.sender}
                       </span>
                    </div>
                  ))}
               </div>
               <form onSubmit={sendMessage} className="p-6 border-t border-white/5">
                  <div className="relative">
                     <input 
                       type="text" 
                       placeholder="Type a message..." 
                       className="w-full bg-zinc-900 border border-white/10 rounded-2xl py-4 pl-5 pr-14 text-sm font-medium focus:outline-none focus:border-primary/50 transition-all shadow-xl"
                       value={message}
                       onChange={(e) => setMessage(e.target.value)}
                     />
                     <button className="absolute right-2 top-2 bottom-2 w-10 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl flex items-center justify-center transition-all">
                       <Send size={16} />
                     </button>
                  </div>
                  <p className="text-[10px] font-bold text-white/10 mt-3 flex items-center gap-2">
                     <Clock size={10} />
                     Press Enter to send • Shift+Enter for new line
                  </p>
               </form>
             </>
           ) : (
             <div className="flex-1 flex flex-col p-6">
                <div className="bg-zinc-900 border border-white/5 rounded-3xl p-6 mb-6">
                   <div className="flex gap-2">
                      <button className="flex-1 bg-green-500/10 hover:bg-green-500/20 text-green-500 text-[10px] font-black uppercase tracking-widest py-3 rounded-xl border border-green-500/20 transition-all flex items-center justify-center gap-2">
                         <Shield size={12} /> Grant All
                      </button>
                      <button className="flex-1 bg-orange-500/10 hover:bg-orange-500/20 text-orange-500 text-[10px] font-black uppercase tracking-widest py-3 rounded-xl border border-orange-500/20 transition-all flex items-center justify-center gap-2">
                         <ShieldOff size={12} /> Revoke All
                      </button>
                   </div>
                </div>

                <div className="space-y-3 overflow-y-auto flex-1 custom-scrollbar">
                   {members.map(m => (
                     <div key={m.id} className="bg-zinc-900/50 p-4 rounded-2xl border border-white/5 flex items-center gap-4 group">
                        <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-sm font-black relative">
                           {m.name.charAt(0)}
                           <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-zinc-900"></div>
                        </div>
                        <div className="flex-1 min-w-0">
                           <div className="flex items-center gap-2">
                              <h4 className="text-sm font-black truncate">{m.name}</h4>
                              {m.id === socketRef.current?.id && <Crown size={12} className="text-yellow-500" />}
                           </div>
                           <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest flex items-center gap-1">
                              <Video size={10} /> Can control
                           </p>
                        </div>
                        <MoreVertical className="text-white/10 cursor-pointer hover:text-white" size={16} />
                     </div>
                   ))}
                </div>

                <button className="mt-8 bg-red-500/5 hover:bg-red-500/10 text-red-500 text-xs font-black uppercase tracking-widest py-4 rounded-2xl border border-red-500/10 transition-all flex items-center justify-center gap-2">
                   <LogOut size={16} /> Leave Room
                </button>
             </div>
           )}
        </aside>
      </div>
    </div>
  );
};

export default RoomPage;
