import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import io from 'socket.io-client';
import ReactPlayer from 'react-player';
import { Send, Users, Video, Link, LogOut, Play, Plus, Clock, Monitor, Crown, Shield, ShieldOff, MoreVertical, XCircle, Trash2, Hash, Copy } from 'lucide-react';

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
  
  const user = JSON.parse(localStorage.getItem('user'));
  const [showMemberMenu, setShowMemberMenu] = useState(null);

  useEffect(() => {
    if (!user) {
      navigate('/login', { state: { from: `/room/${roomId}` } });
      return;
    }

    socketRef.current = io(SOCKET_URL);
    
    socketRef.current.on('connect', () => {
      console.log('Connected to socket server');
      socketRef.current.emit('join-room', { roomId, user });
    });

    socketRef.current.on('receive-message', (msg) => {
      setMessages(prev => [...prev, msg]);
    });

    socketRef.current.on('update-members', (userList) => {
      console.log('Members updated:', userList);
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
      setIsPlaying(true);
    });

    socketRef.current.on('sync-video', ({ state, time }) => {
      isSyncing.current = true;
      setIsPlaying(state === 'playing');
      if (playerRef.current && Math.abs(playerRef.current.getCurrentTime() - time) > 2) {
        playerRef.current.seekTo(time, 'seconds');
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

  const handleUrlChange = (e) => {
    if (e) e.preventDefault();
    if (inputUrl.trim()) {
      socketRef.current.emit('video-load', { roomId, url: inputUrl.trim() });
      setInputUrl('');
    }
  };

  const sendMessage = (e) => {
    e.preventDefault();
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

  const addToPlaylist = () => {
    if (inputUrl.trim()) {
      socketRef.current.emit('add-to-playlist', { roomId, url: inputUrl.trim() });
      setInputUrl('');
    }
  };

  // Video control handlers
  const onPlay = () => {
    if (isSyncing.current) return;
    socketRef.current.emit('video-state-change', { roomId, state: 'playing', time: playerRef.current.getCurrentTime() });
    setIsPlaying(true);
  };

  const onPause = () => {
    if (isSyncing.current) return;
    socketRef.current.emit('video-state-change', { roomId, state: 'paused', time: playerRef.current.getCurrentTime() });
    setIsPlaying(false);
  };

  const onSeek = (time) => {
    if (isSyncing.current) return;
    socketRef.current.emit('video-state-change', { roomId, state: 'seeking', time });
  };

  const me = members.find(m => m.email === user?.email);
  const isHost = me?.isHost;
  const canControl = me?.canControl;

  return (
    <div className="flex flex-col h-screen bg-black text-white font-sans overflow-hidden">
      {/* Header - Matching Reference Style */}
      <nav className="h-14 flex items-center justify-between px-6 bg-zinc-950 border-b border-white/5">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 cursor-pointer group" onClick={() => navigate('/')}>
             <Play className="text-primary fill-current group-hover:scale-110 transition-transform" size={18} />
             <span className="text-xl font-black tracking-tighter italic">Wavvy</span>
          </div>
          <div className="flex items-center gap-2">
             <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">Room ID:</span>
             <span className="text-xs font-bold text-white/40 font-mono bg-white/5 px-2 py-1 rounded">{roomId}</span>
             <button onClick={() => { navigator.clipboard.writeText(roomId); alert('ID Copied!'); }} className="text-white/20 hover:text-white transition-colors">
                <Copy size={12} />
             </button>
          </div>
        </div>
        <div className="flex items-center gap-6">
           <button onClick={() => { navigator.clipboard.writeText(window.location.href); alert('Link Copied!'); }} className="text-xs font-bold uppercase tracking-widest text-white/40 hover:text-white transition-colors flex items-center gap-2">
             <Link size={14} /> Share link
           </button>
           <button onClick={() => navigate('/')} className="text-xs font-black uppercase tracking-widest text-red-500/60 hover:text-red-500 transition-colors flex items-center gap-2">
             <LogOut size={14} /> Exit
           </button>
        </div>
      </nav>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Area: Video & Stream Controls */}
        <div className="flex-1 flex flex-col p-6 overflow-y-auto custom-scrollbar">
           {/* Video Player */}
           <div className="w-full aspect-video bg-zinc-900 rounded-2xl overflow-hidden shadow-2xl border border-white/5 relative bg-mesh">
              {videoUrl ? (
                <ReactPlayer 
                  key={videoUrl} 
                  ref={playerRef} 
                  url={videoUrl} 
                  width="100%" 
                  height="100%" 
                  playing={isPlaying} 
                  controls={true} 
                  onPlay={onPlay} 
                  onPause={onPause} 
                  onSeek={onSeek}
                  config={{ 
                    youtube: { 
                      playerVars: { 
                        autoplay: 1, 
                        modestbranding: 1, 
                        rel: 0,
                        enablejsapi: 1,
                        origin: window.location.origin
                      } 
                    } 
                  }} 
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white/5">
                   <Video size={120} strokeWidth={1} className="mb-6 opacity-20" />
                   <p className="text-2xl font-black italic tracking-tighter opacity-20 uppercase">Wavvy Room Ready</p>
                </div>
              )}
           </div>

           {/* Controls Card - Below Video */}
           <div className="mt-8 grid grid-cols-1 md:grid-cols-12 gap-6 pb-12">
              <div className="md:col-span-8 bg-zinc-900/40 p-8 rounded-3xl border border-white/5">
                 <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 mb-6">Load Stream</h3>
                 <div className="flex gap-4">
                    <input 
                      type="text" 
                      placeholder="Paste link here..." 
                      className="flex-1 bg-black/40 border border-white/10 rounded-2xl py-4 px-6 text-sm font-bold focus:outline-none focus:border-primary/50 transition-all disabled:opacity-30" 
                      value={inputUrl} 
                      onChange={(e) => setInputUrl(e.target.value)} 
                      disabled={members.length > 0 && me && !canControl} 
                    />
                    <button 
                      onClick={handleUrlChange} 
                      disabled={(members.length > 0 && me && !canControl) || !inputUrl.trim()} 
                      className="bg-primary hover:bg-primary/80 text-black font-black px-8 rounded-xl transition-all shadow-lg uppercase text-xs tracking-widest disabled:opacity-30"
                    >
                      Play
                    </button>
                    <button onClick={addToPlaylist} disabled={!inputUrl.trim()} className="bg-zinc-800 hover:bg-zinc-700 text-white font-black px-6 rounded-xl transition-all border border-white/5">
                      <Plus size={18} />
                    </button>
                 </div>
                 {(members.length > 0 && me && !canControl) && (
                   <div className="mt-4 flex items-center gap-2 text-red-500/80">
                      <ShieldOff size={14} />
                      <span className="text-[10px] font-black uppercase tracking-widest">You don't have permission to load videos</span>
                   </div>
                 )}
                 <div className="mt-8 flex items-center gap-6 text-[10px] font-black uppercase tracking-[0.2em] text-white/20">
                    <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-primary rounded-full"></div> YouTube Safe</span>
                    <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-primary rounded-full"></div> MP4 Direct</span>
                    <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-primary rounded-full"></div> Perfectly Synced</span>
                 </div>
              </div>

              <div className="md:col-span-4 bg-zinc-900/40 p-8 rounded-3xl border border-white/5 flex flex-col">
                 <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 mb-6 flex items-center justify-between">Queue {playlist.length > 0 && <span className="text-primary">({playlist.length})</span>}</h3>
                 <div className="flex-1 space-y-3 overflow-y-auto max-h-[150px] custom-scrollbar">
                    {playlist.length > 0 ? playlist.map((url, i) => (
                      <div key={i} className="flex items-center gap-2 group cursor-pointer" onClick={() => canControl && socketRef.current.emit('video-load', { roomId, url })}>
                         <span className="text-[10px] font-black text-white/20">{i+1}</span>
                         <p className="text-[10px] font-bold truncate flex-1 text-white/60 group-hover:text-primary transition-colors">{url}</p>
                         {canControl && <Trash2 size={12} className="text-white/10 group-hover:text-red-500 transition-colors" onClick={(e) => { e.stopPropagation(); socketRef.current.emit('remove-from-playlist', { roomId, index: i }); }} />}
                      </div>
                    )) : (
                      <div className="h-full flex flex-col items-center justify-center opacity-10">
                         <Monitor size={24} className="mb-2" />
                         <span className="text-[9px] font-black uppercase">Queue is empty</span>
                      </div>
                    )}
                 </div>
              </div>
           </div>
        </div>

        {/* Sidebar: Right Col - Chat & Members Stacked */}
        <aside className="w-[400px] border-l border-white/5 bg-zinc-950 flex flex-col">
           {/* Section 1: Chat Card */}
           <div className="flex-1 flex flex-col min-h-0 border-b border-white/5">
              <div className="h-14 flex items-center px-6 border-b border-white/5 bg-zinc-900/20">
                 <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">Live chat</h4>
              </div>
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                 {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-10">
                       <Send size={32} className="mb-4" />
                       <p className="text-[10px] font-black uppercase tracking-widest">Start the conversation!</p>
                    </div>
                 ) : messages.map((msg, i) => (
                    <div key={i} className={`flex flex-col ${msg.sender === user.name ? 'items-end' : 'items-start'}`}>
                       <div className={`p-4 rounded-2xl text-sm font-medium leading-relaxed ${msg.sender === user.name ? 'bg-zinc-800 text-white rounded-br-none border border-white/5' : 'bg-primary text-black rounded-bl-none font-bold'}`}>
                          {msg.message}
                       </div>
                       <span className="text-[9px] font-black text-white/20 mt-1 uppercase tracking-widest px-1">{msg.sender === user.name ? 'You' : msg.sender}</span>
                    </div>
                 ))}
              </div>
              <div className="p-4 bg-zinc-900/20">
                <form onSubmit={sendMessage} className="relative flex items-center gap-2">
                   <input type="text" placeholder="Type a message..." className="flex-1 bg-zinc-900 border border-white/10 rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-primary/50 transition-all" value={message} onChange={(e) => setMessage(e.target.value)} />
                   <button className="w-10 h-10 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl flex items-center justify-center transition-all">
                      <Send size={16} />
                   </button>
                </form>
              </div>
           </div>

           {/* Section 2: Members Card */}
           <div className="h-80 flex flex-col bg-black">
              <div className="h-14 flex items-center px-6 border-b border-white/5 bg-zinc-900/20">
                 <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">Members ({members.length})</h4>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar">
                 {members.map(m => (
                    <div key={m.id} className="flex items-center gap-4 bg-zinc-900/30 p-3 rounded-2xl border border-white/5 group">
                       <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-xs font-black relative">
                          {m.name.charAt(0).toUpperCase()}
                          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-primary rounded-full border-2 border-black animate-pulse"></div>
                       </div>
                       <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                             <h5 className="text-sm font-black truncate">{m.name}</h5>
                             {m.isHost && <Crown size={12} className="text-yellow-500" />}
                          </div>
                          <p className={`text-[9px] font-black uppercase tracking-widest flex items-center gap-1 ${m.canControl ? 'text-primary' : 'text-white/20'}`}>
                             {m.canControl ? <Shield size={10} /> : <ShieldOff size={10} />}
                             {m.canControl ? "Can control" : "View only"}
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
                                   <button onClick={() => handleKick(m.id)} className="w-full text-left px-4 py-3 rounded-xl hover:bg-red-500/10 text-[10px] font-black uppercase tracking-widest flex items-center gap-3 transition-colors text-red-500/60 hover:text-red-500 text-red-500">
                                      <XCircle size={14} /> Kick Participant
                                   </button>
                                </div>
                             )}
                          </div>
                       )}
                    </div>
                 ))}
              </div>
              <div className="p-4 bg-zinc-900/10 border-t border-white/5">
                 <button onClick={() => { if(isHost) handleGrantAll(); }} className="w-full py-3 bg-primary/10 hover:bg-primary/20 text-primary text-[10px] font-black uppercase tracking-[0.2em] rounded-xl transition-all border border-primary/10 flex items-center justify-center gap-2">
                    <Video size={14} /> Start Video Call
                 </button>
              </div>
           </div>
        </aside>
      </div>
    </div>
  );
};

export default RoomPage;
