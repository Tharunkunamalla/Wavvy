import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import io from 'socket.io-client';
import ReactPlayer from 'react-player';
import { Send, Users, Video, Link, LogOut, Play, Plus, Clock, Monitor, Crown, Shield, ShieldOff, MoreVertical, XCircle, Trash2, Hash } from 'lucide-react';

const SOCKET_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5001';

const RoomPage = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const roomNameFromState = location.state?.roomName;
  
  const socketRef = useRef();
  const playerRef = useRef(null);
  const isSyncing = useRef(false);
  const scrollRef = useRef();
  
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [inputUrl, setInputUrl] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [members, setMembers] = useState([]);
  const [playlist, setPlaylist] = useState([]);
  const [localStream, setLocalStream] = useState(null);
  
  const user = JSON.parse(localStorage.getItem('user'));
  const [showMemberMenu, setShowMemberMenu] = useState(null);

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

    socketRef.current.on('sync-playlist', (list) => {
      setPlaylist(list);
    });

    socketRef.current.on('kicked', () => {
       alert("You have been removed from the room by the host.");
       navigate('/');
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

    return () => {
      socketRef.current?.disconnect();
    };
  }, [roomId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleKick = (targetId) => {
    socketRef.current.emit('kick-user', { roomId, targetId });
    setShowMemberMenu(null);
  };

  const togglePermission = (targetId, canControl) => {
    socketRef.current.emit('toggle-permission', { roomId, targetId, canControl });
    setShowMemberMenu(null);
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (message.trim()) {
      socketRef.current.emit('send-message', { roomId, message: message.trim(), sender: user.name });
      setMessage('');
    }
  };

  const handleUrlChange = (e) => {
    e.preventDefault();
    if (inputUrl.trim()) {
      socketRef.current.emit('video-load', { roomId, url: inputUrl.trim() });
      setInputUrl('');
    }
  };

  const addToPlaylist = () => {
    if (inputUrl.trim()) {
      socketRef.current.emit('add-to-playlist', { roomId, url: inputUrl.trim() });
      setInputUrl('');
    }
  };

  const playFromPlaylist = (url) => {
    if (canControl) socketRef.current.emit('video-load', { roomId, url });
  };

  const removeFromPlaylist = (index) => {
    if (canControl) socketRef.current.emit('remove-from-playlist', { roomId, index });
  };

  const handlePlay = () => {
    if (isSyncing.current) return;
    socketRef.current.emit('video-state-change', { roomId, state: 'playing', time: playerRef.current.getCurrentTime() });
    setIsPlaying(true);
  };

  const handlePause = () => {
    if (isSyncing.current) return;
    socketRef.current.emit('video-state-change', { roomId, state: 'paused', time: playerRef.current.getCurrentTime() });
    setIsPlaying(false);
  };

  const handleSeek = (time) => {
    if (isSyncing.current) return;
    socketRef.current.emit('video-state-change', { roomId, state: 'seeking', time });
  };

  const me = members.find(m => m.name === user.name) || members.find(m => m.id === socketRef.current?.id);
  const isHost = me?.isHost;
  const canControl = me?.canControl;

  return (
    <div className="flex flex-col h-screen bg-black text-white font-sans overflow-hidden">
      {/* Dynamic Header based on Reference */}
      <nav className="h-16 flex items-center justify-between px-6 border-b border-white/5 bg-black z-50">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
             <Play className="text-white fill-current" size={20} />
             <span className="text-xl font-black tracking-tighter italic">Wavvy</span>
          </div>
          <div className="flex items-center gap-3">
             <div className="flex flex-col">
                <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] leading-none mb-1">Room ID</span>
                <span className="text-sm font-bold text-primary flex items-center gap-1">
                   {roomId}
                   <button onClick={() => { navigator.clipboard.writeText(roomId); alert('ID Copied!'); }} className="text-white/20 hover:text-white transition-colors ml-1"><Hash size={12} /></button>
                </span>
             </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
           <button onClick={() => { navigator.clipboard.writeText(window.location.href); alert('Link Copied!'); }} className="text-white/40 hover:text-white transition-colors flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
             <Link size={16} /> Share Link
           </button>
           <button onClick={() => navigate('/')} className="text-red-500/60 hover:text-red-500 transition-colors flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
             <LogOut size={16} /> Exit Room
           </button>
        </div>
      </nav>

      <div className="flex-1 flex overflow-hidden">
        {/* Main Content Area: Video & Controls */}
        <main className="flex-1 flex flex-col p-6 overflow-y-auto custom-scrollbar">
           {/* Primary Video Player */}
           <div className="relative w-full aspect-video bg-zinc-900 rounded-[2rem] overflow-hidden shadow-2xl border border-white/5">
              {videoUrl ? (
                <ReactPlayer key={videoUrl} ref={playerRef} url={videoUrl} width="100%" height="100%" playing={isPlaying} controls={true} playsinline={true} onPlay={handlePlay} onPause={handlePause} onSeek={handleSeek} config={{ youtube: { playerVars: { autoplay: 1, modestbranding: 1, rel: 0, origin: window.location.origin } } }} />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white/5">
                   <Video size={120} strokeWidth={1} className="mb-6 animate-pulse" />
                   <p className="text-2xl font-black italic tracking-tighter">Ready for connection</p>
                </div>
              )}
           </div>

           {/* Input Section - Under Video */}
           <div className="mt-6 flex flex-col lg:flex-row gap-6">
              <div className="flex-1 bg-zinc-900/50 p-6 rounded-3xl border border-white/5">
                 <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 mb-4">Stream URL</h3>
                 <div className="flex gap-4">
                    <input type="text" placeholder="Paste YouTube link here..." className="flex-1 bg-black/40 border border-white/10 rounded-2xl py-4 px-6 text-sm font-bold focus:outline-none focus:border-primary/50 transition-all disabled:opacity-30" value={inputUrl} onChange={(e) => setInputUrl(e.target.value)} disabled={!canControl && members.length > 0} />
                    <button onClick={handleUrlChange} disabled={(!canControl && members.length > 0) || !inputUrl.trim()} className="bg-primary hover:bg-primary/80 text-black font-black px-8 rounded-xl transition-all shadow-lg uppercase text-xs tracking-widest disabled:opacity-30">Play Now</button>
                    <button onClick={addToPlaylist} disabled={!inputUrl.trim()} className="bg-zinc-800 hover:bg-zinc-700 text-white font-black px-6 rounded-xl transition-all border border-white/5"><Plus size={18} /></button>
                 </div>
                 {(!canControl && members.length > 0) && <p className="mt-3 text-[10px] text-red-500 font-bold uppercase tracking-widest flex items-center gap-2"><ShieldOff size={12} /> You don't have permission to change video</p>}
              </div>

              <div className="w-full lg:w-72 space-y-4">
                 <button className="w-full py-5 bg-primary text-black font-black flex items-center justify-center gap-3 rounded-2xl uppercase text-xs tracking-widest hover:scale-[1.02] transition-all shadow-xl shadow-primary/10">
                   <Video size={18} /> Start Video Call
                 </button>
                 <div className="bg-zinc-900/50 p-6 rounded-3xl border border-white/5 h-48 overflow-y-auto custom-scrollbar">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 mb-4 flex items-center justify-between">Queue {playlist.length > 0 && <span>({playlist.length})</span>}</h4>
                    {playlist.length > 0 ? playlist.map((url, i) => (
                      <div key={i} className="flex items-center gap-2 mb-2 group">
                         <span className="text-[10px] font-black text-white/20">{i+1}</span>
                         <p onClick={() => playFromPlaylist(url)} className="text-[10px] font-bold truncate flex-1 cursor-pointer hover:text-primary transition-colors text-white/60">{url}</p>
                         {canControl && <button onClick={() => removeFromPlaylist(i)} className="opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={12} className="text-red-500/50 hover:text-red-500" /></button>}
                      </div>
                    )) : (
                      <div className="h-full flex flex-col items-center justify-center text-center opacity-10 py-4"><Monitor size={20} /><p className="text-[9px] font-black uppercase mt-2">Queue is empty</p></div>
                    )}
                 </div>
              </div>
           </div>
        </main>

        {/* Sidebar: Unified Chat & Members list on the right */}
        <aside className="w-[380px] border-l border-white/5 bg-black flex flex-col">
           {/* Section 1: Chat (Top) */}
           <div className="flex-1 flex flex-col border-b border-white/5 overflow-hidden">
              <div className="h-14 flex items-center px-6 border-b border-white/5 bg-zinc-900/20">
                 <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 flex items-center gap-2"><Send size={12} className="text-primary" /> Live Chat</h4>
              </div>
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                 {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-10">
                       <Send size={40} strokeWidth={1} className="mb-4" />
                       <p className="text-xs font-black uppercase tracking-widest">No messages yet</p>
                    </div>
                 ) : messages.map((msg, i) => (
                    <div key={i} className={`flex flex-col ${msg.sender === user.name ? 'items-end' : 'items-start'}`}>
                       <div className={`max-w-[90%] p-4 rounded-2xl text-sm font-medium ${msg.sender === user.name ? 'bg-zinc-800 text-white rounded-tr-none border border-white/5 shadow-lg' : 'bg-primary text-black rounded-tl-none font-bold'}`}>
                          {msg.message}
                       </div>
                       <span className="text-[9px] font-black text-white/20 mt-1 uppercase tracking-widest">{msg.sender === user.name ? 'You' : msg.sender}</span>
                    </div>
                 ))}
              </div>
              <form onSubmit={sendMessage} className="p-4 bg-zinc-900/20">
                 <div className="relative flex items-center gap-2">
                    <input type="text" placeholder="Send a message..." className="flex-1 bg-zinc-900 border border-white/10 rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-primary/50 transition-all font-medium" value={message} onChange={(e) => setMessage(e.target.value)} />
                    <button className="w-10 h-10 bg-primary text-black rounded-xl flex items-center justify-center hover:scale-105 transition-all shadow-lg"><Send size={16} /></button>
                 </div>
              </form>
           </div>

           {/* Section 2: Members (Bottom) */}
           <div className="h-[350px] flex flex-col overflow-hidden">
              <div className="h-14 flex items-center px-6 border-b border-white/5 bg-zinc-900/20">
                 <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 flex items-center gap-2"><Users size={12} className="text-primary" /> Members ({members.length})</h4>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar">
                 {members.map(m => (
                    <div key={m.id} className="flex items-center gap-4 bg-zinc-900/30 p-3 rounded-2xl border border-white/5 group relative">
                       <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-xs font-black relative">
                          {m.name.charAt(0).toUpperCase()}
                          <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-primary rounded-full border-2 border-black animate-pulse"></div>
                       </div>
                       <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                             <h5 className="text-sm font-black truncate text-white/80">{m.name}</h5>
                             {m.isHost && <Crown size={12} className="text-yellow-500" />}
                          </div>
                          <p className={`text-[9px] font-black uppercase tracking-widest flex items-center gap-1 ${m.canControl ? 'text-primary' : 'text-white/20'}`}>
                             {m.canControl ? <Shield size={10} /> : <ShieldOff size={10} />}
                             {m.canControl ? "Moderator" : "Viewer"}
                          </p>
                       </div>
                       
                       {isHost && m.id !== socketRef.current?.id && (
                          <div className="relative">
                             <MoreVertical className="text-white/10 cursor-pointer hover:text-white" size={16} onClick={() => setShowMemberMenu(showMemberMenu === m.id ? null : m.id)} />
                             {showMemberMenu === m.id && (
                                <div className="absolute right-0 bottom-full mb-2 w-48 bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl z-[100] p-2">
                                   <button onClick={() => togglePermission(m.id, !m.canControl)} className="w-full text-left px-4 py-3 rounded-xl hover:bg-white/5 text-[10px] font-black uppercase tracking-widest flex items-center gap-3 transition-colors text-white/60 hover:text-primary">
                                      {m.canControl ? <ShieldOff size={14} /> : <Shield size={14} />} {m.canControl ? "Revoke Control" : "Grant Control"}
                                   </button>
                                   <button onClick={() => handleKick(m.id)} className="w-full text-left px-4 py-3 rounded-xl hover:bg-red-500/10 text-[10px] font-black uppercase tracking-widest flex items-center gap-3 transition-colors text-red-500/60 hover:text-red-500">
                                      <XCircle size={14} /> Kick Participant
                                   </button>
                                </div>
                             )}
                          </div>
                       )}
                    </div>
                 ))}
              </div>
           </div>
        </aside>
      </div>
    </div>
  );
};

export default RoomPage;
