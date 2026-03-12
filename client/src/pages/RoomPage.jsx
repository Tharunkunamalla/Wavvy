import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import io from 'socket.io-client';
import ReactPlayer from 'react-player';
import { Send, Users, Video, Link, LogOut, Play, Plus, Clock, Monitor, Crown, Shield, ShieldOff, MoreVertical, XCircle, Trash2, Copy } from 'lucide-react';

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
      if (hasInteracted) setIsPlaying(true);
    });

    socketRef.current.on('sync-video', ({ state, time }) => {
      isSyncing.current = true;
      if (hasInteracted) setIsPlaying(state === 'playing');
      
      const player = playerRef.current;
      if (player && typeof player.getInternalPlayer === 'function') {
        const internalPlayer = player.getInternalPlayer();
        if (internalPlayer && typeof player.getCurrentTime === 'function') {
          const currentTime = player.getCurrentTime();
          if (Math.abs(currentTime - (time || 0)) > 2) {
            player.seekTo(time, 'seconds');
          }
        }
      }
      setTimeout(() => { isSyncing.current = false; }, 1000);
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, [roomId, hasInteracted]);

  const handleInteraction = () => {
    setHasInteracted(true);
    if (videoUrl) setIsPlaying(true);
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleUrlChange = (e) => {
    if (e) e.preventDefault();
    handleInteraction(); // Record interaction
    if (inputUrl.trim()) {
      socketRef.current.emit('video-load', { roomId, url: inputUrl.trim() });
      setInputUrl('');
    }
  };

  const sendMessage = (e) => {
    e.preventDefault();
    handleInteraction(); // Record interaction
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
    <div className="flex flex-col h-screen bg-black text-white font-sans overflow-hidden">
      <nav className="h-14 flex items-center justify-between px-6 bg-zinc-950 border-b border-white/5">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
             <Play className="text-primary fill-current" size={18} />
             <span className="text-xl font-black tracking-tighter italic">Wavvy</span>
          </div>
          <div className="flex items-center gap-2">
             <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">Room ID:</span>
             <span className="text-xs font-bold text-white/40 font-mono bg-white/5 px-2 py-1 rounded">{roomId}</span>
          </div>
        </div>
        <div className="flex items-center gap-6">
           <button onClick={() => { navigator.clipboard.writeText(window.location.href); alert('Link Copied!'); }} className="text-xs font-bold uppercase tracking-widest text-white/40 hover:text-white transition-colors flex items-center gap-2">
             <Link size={14} /> Share link
           </button>
           <button onClick={() => navigate('/')} className="text-xs font-black uppercase tracking-widest text-red-500/60 hover:text-red-500 transition-colors flex items-center gap-2 text-xs">
             <LogOut size={14} /> Exit
           </button>
        </div>
      </nav>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col p-6 overflow-y-auto custom-scrollbar">
           <div className="w-full aspect-video bg-zinc-900 rounded-2xl overflow-hidden shadow-2xl border border-white/5 relative">
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
                    onPlay={onPlay} 
                    onPause={onPause}
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
                  {!hasInteracted && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center z-20 animate-in fade-in duration-500">
                       <button 
                        onClick={handleInteraction}
                        className="bg-primary text-black font-black px-10 py-5 rounded-2xl flex items-center gap-4 hover:scale-105 transition-all shadow-2xl shadow-primary/20 group"
                       >
                          <Play fill="black" size={24} className="group-hover:translate-x-1 transition-transform" />
                          <span className="text-lg uppercase tracking-widest">Click to Join Party</span>
                       </button>
                       <p className="mt-6 text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Browser requires interaction to start audio</p>
                    </div>
                  )}
                </>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white/5">
                   <Video size={100} strokeWidth={1} className="mb-6 opacity-20" />
                   <p className="text-xl font-black italic tracking-tighter opacity-20 uppercase">Wavvy Waiting Room</p>
                </div>
              )}
           </div>

           <div className="mt-8 grid grid-cols-1 md:grid-cols-12 gap-6 pb-12">
              <div className="md:col-span-8 bg-zinc-900/40 p-8 rounded-3xl border border-white/5">
                 <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 mb-6">Load Stream</h3>
                 <div className="flex gap-4">
                    <input 
                      type="text" 
                      placeholder="Paste YouTube link here..." 
                      className="flex-1 bg-black/40 border border-white/10 rounded-2xl py-4 px-6 text-sm font-bold focus:outline-none focus:border-primary/50 transition-all disabled:opacity-30" 
                      value={inputUrl} 
                      onChange={(e) => setInputUrl(e.target.value)} 
                    />
                    <button 
                      onClick={handleUrlChange} 
                      disabled={!inputUrl.trim()} 
                      className="bg-primary hover:bg-primary/80 text-black font-black px-8 rounded-xl transition-all shadow-lg uppercase text-xs tracking-widest"
                    >
                      Play
                    </button>
                 </div>
                 {(!canControl && members.length > 0) && (
                   <p className="mt-4 text-[10px] text-red-500/80 font-black uppercase tracking-widest flex items-center gap-2">
                     <ShieldOff size={14} /> Restricted: Room owner controls playback
                   </p>
                 )}
              </div>

              <div className="md:col-span-4 bg-zinc-900/40 p-8 rounded-3xl border border-white/5 flex flex-col">
                 <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 mb-6 flex items-center justify-between">Queue</h3>
                 <div className="flex-1 space-y-3 overflow-y-auto max-h-[150px] custom-scrollbar">
                    {playlist.length > 0 ? playlist.map((url, i) => (
                      <div key={i} className="flex items-center gap-2 group cursor-pointer" onClick={() => canControl && socketRef.current.emit('video-load', { roomId, url })}>
                         <span className="text-[10px] font-black text-white/20">{i+1}</span>
                         <p className="text-[10px] font-bold truncate flex-1 text-white/60 group-hover:text-primary transition-colors">{url}</p>
                         {canControl && <Trash2 size={12} className="text-white/10 group-hover:text-red-500" onClick={(e) => { e.stopPropagation(); socketRef.current.emit('remove-from-playlist', { roomId, index: i }); }} />}
                      </div>
                    )) : (
                      <div className="h-full flex flex-col items-center justify-center opacity-10">
                         <span className="text-[9px] font-black uppercase">Queue is empty</span>
                      </div>
                    )}
                 </div>
              </div>
           </div>
        </div>

        <aside className="w-[400px] border-l border-white/5 bg-zinc-950 flex flex-col">
           <div className="flex-1 flex flex-col min-h-0 border-b border-white/5">
              <div className="h-14 flex items-center px-6 border-b border-white/5 bg-zinc-900/20">
                 <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">Live chat</h4>
              </div>
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                 {messages.map((msg, i) => (
                    <div key={i} className={`flex flex-col ${msg.sender === user.name ? 'items-end' : 'items-start'}`}>
                       <div className={`p-4 rounded-2xl text-sm font-medium leading-relaxed ${msg.sender === user.name ? 'bg-zinc-800 text-white rounded-tr-none border border-white/5' : 'bg-primary text-black rounded-tl-none font-bold'}`}>
                          {msg.message}
                       </div>
                       <span className="text-[9px] font-black text-white/20 mt-1 uppercase tracking-widest px-1">{msg.sender === user.name ? 'You' : msg.sender}</span>
                    </div>
                 ))}
              </div>
              <div className="p-4 bg-zinc-900/20">
                <form onSubmit={sendMessage} className="relative flex items-center gap-2">
                   <input type="text" placeholder="Type a message..." className="flex-1 bg-zinc-900 border border-white/10 rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-primary/50 transition-all" value={message} onChange={(e) => setMessage(e.target.value)} />
                   <button className="w-10 h-10 bg-primary text-black rounded-xl flex items-center justify-center transition-all">
                      <Send size={16} />
                   </button>
                </form>
              </div>
           </div>

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
                 <button className="w-full py-3 bg-primary/10 hover:bg-primary/20 text-primary text-[10px] font-black uppercase tracking-[0.2em] rounded-xl transition-all border border-primary/10 flex items-center justify-center gap-2">
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
