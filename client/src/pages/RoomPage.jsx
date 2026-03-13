import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import io from 'socket.io-client';
import ReactPlayer from 'react-player';
import { 
  Send, Users, Video, Link as LinkIcon, LogOut, Play, Plus, 
  Clock, Monitor, Crown, Shield, ShieldOff, MoreVertical, 
  XCircle, Trash2, Copy, Check, Info, ChevronRight, SkipForward,
  Settings2, MessageSquare, History
} from 'lucide-react';

const SOCKET_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5001';

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
  const [videoUrl, setVideoUrl] = useState('');
  const [inputUrl, setInputUrl] = useState('');
  const [queueInput, setQueueInput] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [members, setMembers] = useState([]);
  const [playlist, setPlaylist] = useState([]);
  const [hasInteracted, setHasInteracted] = useState(false);
  
  const user = JSON.parse(localStorage.getItem('user'));
  const [showMemberMenu, setShowMemberMenu] = useState(null);

  useEffect(() => {
    if (!user) {
      navigate('/login', { state: { from: `/room/${roomId}` } });
      return;
    }

    socketRef.current = io(SOCKET_URL);
    
    socketRef.current.on('connect', () => {
      socketRef.current.emit('join-room', { roomId, user });
    });

    socketRef.current.on('receive-message', (msg) => {
      setMessages(prev => [...prev, msg]);
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

    socketRef.current.on('sync-video-load', ({ url }) => {
      setVideoUrl(url);
    });

    socketRef.current.on('sync-video', ({ state, time }) => {
      isSyncing.current = true;
      if (hasInteracted) setIsPlaying(state === 'playing');
      
      const player = playerRef.current;
      if (player && typeof player.getInternalPlayer === 'function') {
        const internalPlayer = player.getInternalPlayer();
        if (internalPlayer && typeof player.getCurrentTime === 'function') {
          const currentTime = player.getCurrentTime();
          if (Math.abs(currentTime - (time || 0)) > 1.5) {
            player.seekTo(time, 'seconds');
          }
        }
      }
      setTimeout(() => { isSyncing.current = false; }, 1000);
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, [roomId]); 

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleInteraction = () => {
    setHasInteracted(true);
    if (videoUrl) {
      setIsPlaying(true);
      // Brief timeout to ensure the player is ready after state change
      setTimeout(() => {
        setIsPlaying(true);
      }, 500);
    }
  };

  const cleanUrl = (url) => {
    if (!url) return '';
    const trimmedUrl = url.trim();

    // youtube.com links (including watch, embed, shorts)
    if (trimmedUrl.includes('youtube.com') || trimmedUrl.includes('youtu.be')) {
      let videoId = '';
      
      if (trimmedUrl.includes('youtu.be/')) {
        const parts = trimmedUrl.split('youtu.be/');
        if (parts[1]) videoId = parts[1].split(/[?#]/)[0];
      } else if (trimmedUrl.includes('v=')) {
        videoId = trimmedUrl.split('v=')[1].split('&')[0];
      } else if (trimmedUrl.includes('embed/')) {
        videoId = trimmedUrl.split('embed/')[1].split(/[?#]/)[0];
      } else if (trimmedUrl.includes('/shorts/')) {
        videoId = trimmedUrl.split('/shorts/')[1].split(/[?#]/)[0];
      }

      if (videoId) {
        return `https://www.youtube.com/watch?v=${videoId}`;
      }
    }

    return trimmedUrl;
  };

  const handleLoadVideo = (e) => {
    if (e) e.preventDefault();
    if (!hasInteracted) handleInteraction();
    
    if (inputUrl.trim()) {
      const cleaned = cleanUrl(inputUrl.trim());
      socketRef.current.emit('video-load', { roomId, url: cleaned });
      setInputUrl('');
      // Optimistically allow playing
      setIsPlaying(true);
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
    e.preventDefault();
    handleInteraction();
    if (message.trim()) {
      socketRef.current.emit('send-message', { roomId, message: message.trim(), sender: user.name });
      setMessage('');
    }
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
    if (isSyncing.current || !playerRef.current || typeof playerRef.current.getCurrentTime !== 'function') return;
    socketRef.current.emit('video-state-change', { 
      roomId, 
      state: 'playing', 
      time: playerRef.current.getCurrentTime() 
    });
    setIsPlaying(true);
  };

  const onPause = () => {
    if (isSyncing.current || !playerRef.current || typeof playerRef.current.getCurrentTime !== 'function') return;
    socketRef.current.emit('video-state-change', { 
      roomId, 
      state: 'paused', 
      time: playerRef.current.getCurrentTime() 
    });
    setIsPlaying(false);
  };

  const me = members.find(m => m.email?.toLowerCase() === user?.email?.toLowerCase());
  const isHost = me?.isHost;
  const canControl = me?.canControl;

  return (
    <div className="flex flex-col h-screen bg-[#0a0a0a] text-white font-sans overflow-hidden">
      {/* Navbar Section */}
      <nav className="h-14 flex items-center justify-between px-6 bg-[#0a0a0a] border-b border-white/5 z-50">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
             <Play className="text-primary fill-current" size={20} />
             <span className="text-xl font-black tracking-tighter italic">Wavvy</span>
          </div>
          <div className="flex items-center gap-4 text-xs font-medium text-white/40">
             <div className="flex items-center gap-2">
                <Copy size={12} className="cursor-pointer hover:text-white" onClick={() => { navigator.clipboard.writeText(roomId); alert('ID Copied!'); }} />
                <span>Room ID: {roomId}</span>
             </div>
             <button onClick={() => { navigator.clipboard.writeText(window.location.href); alert('Link Copied!'); }} className="flex items-center gap-1 hover:text-white transition-colors">
                <LinkIcon size={12} /> Share link
             </button>
          </div>
        </div>
        <button onClick={() => navigate('/')} className="text-xs font-bold uppercase tracking-widest text-red-500/60 hover:text-red-500 transition-colors flex items-center gap-2">
           <LogOut size={14} /> Exit
        </button>
      </nav>

      <div className="flex-1 flex overflow-hidden">
        {/* Main Content: Video and Video Tools */}
        <main className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6 bg-black">
           {/* Section 1: Video Player Area */}
           <div className="w-full aspect-video bg-zinc-900 rounded-lg overflow-hidden relative shadow-2xl border border-white/5">
              {videoUrl ? (
                <>
                <ReactPlayer
                  ref={playerRef}
                  url={videoUrl}
                  width="100%"
                  height="100%"
                  playing={isPlaying}
                  controls
                  onPlay={onPlay}
                  onPause={onPause}
                  onError={(e) => console.error("ReactPlayer Error:", e)}
                  config={{
                    youtube: {
                      playerVars: { 
                        showinfo: 0, 
                        rel: 0,
                        autoplay: 1,
                        modestbranding: 1
                      }
                    }
                  }}
                />
                  {!hasInteracted && videoUrl && (
                    <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center z-20">
                       <button onClick={handleInteraction} className="bg-primary text-black font-black px-10 py-5 rounded-lg flex items-center gap-3 hover:scale-105 transition-all shadow-xl active:scale-95">
                          <Play fill="black" size={24} />
                          <span className="text-lg uppercase tracking-widest">Click to start sync</span>
                       </button>
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

           {/* Section 2: Load Video Card - Based on Image 2 */}
           <div className="bg-[#141414] rounded-xl border border-white/5 p-8 shadow-lg">
              <div className="flex items-center justify-between mb-6">
                 <h2 className="text-xl font-bold">Load Video</h2>
                 <Info size={18} className="text-white/20" />
              </div>
              <div className="space-y-4">
                 <input 
                    type="text" 
                    placeholder="Paste YouTube, Dropbox, or direct .mp4 URL..." 
                    className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg py-4 px-6 text-sm font-medium focus:outline-none focus:border-white/20 transition-all text-white/80"
                    value={inputUrl}
                    onChange={(e) => setInputUrl(e.target.value)}
                 />
                 <button 
                    onClick={handleLoadVideo}
                    disabled={!inputUrl.trim() || (!canControl && !isHost)}
                    className="w-full py-4 bg-[#2a2a2a] hover:bg-[#333333] text-white/80 font-bold rounded-lg transition-all text-sm tracking-wide disabled:opacity-30"
                 >
                    Load Video
                 </button>
              </div>
              <div className="mt-6 space-y-2">
                 <p className="text-[10px] text-white/30 flex items-center gap-2"><Check size={12} className="text-green-500/50" /> https://youtube.com/watch?v=... or youtu.be/...</p>
                 <p className="text-[10px] text-white/30 flex items-center gap-2"><Check size={12} className="text-green-500/50" /> https://www.dropbox.com/s/.../video.mp4</p>
                 <p className="text-[10px] text-white/30 flex items-center gap-2"><Check size={12} className="text-green-500/50" /> https://example.com/video.mp4</p>
              </div>
           </div>

           {/* Section 3: UP NEXT Card - Based on Image 3 */}
           <div className="bg-[#141414] rounded-xl border border-white/5 p-8 shadow-lg">
              <div className="flex items-center justify-between mb-6">
                 <div className="flex items-center gap-3">
                    <History size={18} className="text-white/40" />
                    <h2 className="text-xl font-bold uppercase tracking-widest text-sm">UP NEXT</h2>
                    {playlist.length > 0 && <span className="bg-white/10 px-2 py-0.5 rounded-full text-[10px] font-bold">{playlist.length}</span>}
                 </div>
                 <div className="flex items-center gap-3 text-white/20">
                    <Monitor size={14} />
                    <Clock size={14} />
                    <History size={14} />
                    <Trash2 size={14} className="hover:text-red-500 cursor-pointer" onClick={() => canControl && socketRef.current.emit('set-playlist', { roomId, playlist: [] })} />
                    <ChevronRight size={14} />
                 </div>
              </div>

              {/* Now Playing indicator */}
              <div className="flex items-center gap-3 mb-6 bg-green-500/5 border border-green-500/10 p-3 rounded-lg">
                 <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                 <span className="text-[10px] font-black text-green-500 uppercase tracking-widest">NOW PLAYING</span>
                 <span className="text-[10px] text-white/40 truncate">{videoUrl || 'None'}</span>
              </div>

              {/* Add to Queue input */}
              <div className="relative mb-6">
                 <input 
                    type="text" 
                    placeholder="YouTube or direct video URL..." 
                    className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg py-3 px-5 pr-12 text-sm focus:outline-none focus:border-white/20 transition-all text-white/60"
                    value={queueInput}
                    onChange={(e) => setQueueInput(e.target.value)}
                 />
                 <button onClick={addToPlaylist} className="absolute right-2 top-1.5 w-8 h-8 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-md transition-all">
                    <Plus size={16} />
                 </button>
              </div>

              {/* Queue List */}
              <div className="space-y-3 mb-6">
                 {playlist.length > 0 ? (
                    playlist.map((url, i) => (
                      <div key={i} className="flex items-center gap-4 bg-[#1e1e1e]/50 p-3 rounded-lg border border-white/5 group">
                         <span className="text-[10px] font-black text-white/10 w-4">#{i+1}</span>
                         <div className="w-16 h-10 bg-[#2a2a2a] rounded flex items-center justify-center text-white/5 relative overflow-hidden">
                            <Monitor size={14} />
                            {/* In a real app, thumbnail would go here */}
                         </div>
                         <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-white/60 truncate">{url}</p>
                            <p className="text-[9px] font-medium text-white/20 uppercase tracking-widest">YouTube • Added by host</p>
                         </div>
                         {canControl && (
                           <button onClick={() => socketRef.current.emit('remove-from-playlist', { roomId, index: i })} className="opacity-0 group-hover:opacity-100 transition-opacity">
                              <Trash2 size={14} className="text-white/20 hover:text-red-500" />
                           </button>
                         )}
                      </div>
                    ))
                 ) : (
                    <div className="py-12 flex flex-col items-center justify-center opacity-10">
                       <Monitor size={32} />
                       <p className="text-[10px] font-black uppercase mt-3">Queue is empty</p>
                    </div>
                 )}
              </div>

              {/* Skip to Next button */}
              <button 
                 onClick={skipToNext}
                 disabled={playlist.length === 0 || !canControl}
                 className="w-full py-4 bg-[#1e1e1e] hover:bg-[#252525] border border-white/5 rounded-lg text-white/60 text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-3 transition-all disabled:opacity-20"
              >
                 <SkipForward size={14} /> Skip to Next
              </button>
           </div>
        </main>

        {/* Sidebar: Chat & Members */}
        <aside className="w-[420px] bg-[#0f0f0f] border-l border-white/5 flex flex-col">
           {/* Unified Chat Card */}
           <div className="flex-1 flex flex-col overflow-hidden border-b border-white/5 m-4 bg-[#141414] rounded-xl border border-white/5 shadow-lg">
              <div className="h-12 flex items-center justify-between px-5 border-b border-white/5">
                 <h4 className="text-sm font-bold">Chat</h4>
                 <Settings2 size={14} className="text-white/20" />
              </div>
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                 {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-10 p-8">
                       <MessageSquare size={48} strokeWidth={1} className="mb-4" />
                       <p className="text-xs font-black uppercase tracking-widest">No messages yet. Start the conversation!</p>
                    </div>
                 ) : (
                    messages.map((msg, i) => (
                       <div key={i} className={`flex flex-col ${msg.sender === user.name ? 'items-end' : 'items-start'}`}>
                          <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm font-medium leading-relaxed ${msg.sender === user.name ? 'bg-zinc-800 text-white rounded-tr-none border border-white/5 shadow-md' : 'bg-primary text-black rounded-tl-none font-bold shadow-md'}`}>
                             {msg.message}
                          </div>
                          <span className="text-[9px] font-black text-white/20 mt-1 uppercase tracking-widest">{msg.sender === user.name ? 'You' : msg.sender}</span>
                       </div>
                    ))
                 )}
              </div>
              <div className="p-4 bg-black/20">
                 <form onSubmit={sendMessage} className="relative flex items-center gap-2">
                    <input 
                       type="text" 
                       placeholder="Type a message..." 
                       className="flex-1 bg-[#1e1e1e] border border-white/5 rounded-lg py-3 px-4 pr-12 text-sm focus:outline-none focus:border-white/10 transition-all font-medium" 
                       value={message} 
                       onChange={(e) => setMessage(e.target.value)} 
                    />
                    <button className="absolute right-2 text-white/20 hover:text-primary transition-colors">
                       <Send size={18} />
                    </button>
                 </form>
                 <p className="text-[8px] text-center text-white/10 mt-3 font-medium uppercase tracking-widest">Press Enter to send • Shift + Enter for new line</p>
              </div>
           </div>

           {/* Members Card */}
           <div className="h-[300px] flex flex-col m-4 mt-0 bg-[#141414] rounded-xl border border-white/5 shadow-lg overflow-hidden shrink-0">
              <div className="h-12 flex items-center px-5 border-b border-white/5 gap-2">
                 <Users size={14} className="text-white/40" />
                 <h4 className="text-sm font-bold">Members</h4>
                 <span className="ml-auto bg-white/5 px-2 py-0.5 rounded-full text-[10px] font-bold text-white/40">{members.length}</span>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                 {members.map(m => (
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
                          <div className="absolute right-10 bottom-0 w-44 bg-[#1e1e1e] border border-white/10 rounded-lg shadow-2xl z-[100] p-1 animate-in slide-in-from-right-2">
                             <button onClick={() => togglePermission(m.id, !m.canControl)} className="w-full text-left px-3 py-2 rounded-md hover:bg-white/5 text-[9px] font-black uppercase tracking-widest flex items-center gap-3 transition-colors text-white/60">
                                {m.canControl ? <ShieldOff size={12} /> : <Shield size={12} />} {m.canControl ? "Revoke" : "Grant"}
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
                 <div className="p-4 grid grid-cols-2 gap-2 border-t border-white/5 bg-black/20">
                    <button onClick={grantAll} className="py-2.5 bg-green-500/10 hover:bg-green-500/20 text-green-500 border border-green-500/20 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all">Grant All</button>
                    <button onClick={revokeAll} className="py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all">Revoke All</button>
                    <button className="col-span-2 py-3 bg-[#00e676] hover:bg-[#00c853] text-black rounded-lg text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-all mt-2 active:scale-95 shadow-lg shadow-green-500/10">
                       <Video size={14} /> Start Video Call
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
