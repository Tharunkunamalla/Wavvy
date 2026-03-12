import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import io from 'socket.io-client';
import ReactPlayer from 'react-player';
import { Send, Users, Video, Link, LogOut, Play, Plus, Clock, Monitor, Crown, Shield, ShieldOff, MoreVertical, XCircle, Mic, MicOff } from 'lucide-react';

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
  const [remoteStreams, setRemoteStreams] = useState({}); // { sid: { stream, name } }
  const peerConnections = useRef({});
  
  const user = JSON.parse(localStorage.getItem('user'));
  const [activeTab, setActiveTab] = useState('chat');
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
      // Cleanup remote streams for users who left
      setRemoteStreams(prev => {
        const next = { ...prev };
        const memberIds = userList.map(m => m.id);
        Object.keys(next).forEach(sid => {
          if (!memberIds.includes(sid)) delete next[sid];
        });
        return next;
      });
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

    socketRef.current.on('user-started-call', async ({ sender, name }) => {
      if (localStreamRef.current) {
        const pc = createPeerConnection(sender, name);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socketRef.current.emit('video-offer', { roomId, offer });
      }
    });

    socketRef.current.on('video-offer', async ({ offer, sender, name }) => {
      const pc = createPeerConnection(sender, name);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socketRef.current.emit('video-answer', { roomId, answer, target: sender });
    });

    socketRef.current.on('video-answer', async ({ answer, sender }) => {
      const pc = peerConnections.current[sender];
      if (pc) await pc.setRemoteDescription(new RTCSessionDescription(answer));
    });

    socketRef.current.on('new-ice-candidate', async ({ candidate, sender }) => {
      const pc = peerConnections.current[sender];
      if (pc) await pc.addIceCandidate(new RTCIceCandidate(candidate));
    });

    return () => {
      socketRef.current.disconnect();
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [roomId]);

  const createPeerConnection = (targetId, name) => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current.emit('new-ice-candidate', { roomId, candidate: event.candidate, target: targetId });
      }
    };

    pc.ontrack = (event) => {
      setRemoteStreams(prev => ({ 
        ...prev, 
        [targetId]: { stream: event.streams[0], name } 
      }));
    };

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => pc.addTrack(track, localStreamRef.current));
    }

    peerConnections.current[targetId] = pc;
    return pc;
  };

  const handleKick = (targetId) => {
    socketRef.current.emit('kick-user', { roomId, targetId });
    setShowMemberMenu(null);
  };

  const togglePermission = (targetId, canControl) => {
    socketRef.current.emit('toggle-permission', { roomId, targetId, canControl });
    setShowMemberMenu(null);
  };

  const handleGrantAll = () => {
    members.forEach(m => {
       if(!m.isHost) togglePermission(m.id, true);
    });
  };

  const handleRevokeAll = () => {
    members.forEach(m => {
       if(!m.isHost) togglePermission(m.id, false);
    });
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
      setIsPlaying(true);
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
        setRemoteStreams({});
        peerConnections.current = {};
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

  const isHost = members.find(m => m.id === socketRef.current?.id)?.isHost;
  const canControl = members.find(m => m.id === socketRef.current?.id)?.canControl;

  return (
    <div className="flex flex-col h-screen bg-black text-white font-sans overflow-hidden">
      <nav className="h-16 flex items-center justify-between px-8 border-b border-white/5 bg-black/50 backdrop-blur-xl z-50">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
            <Play className="text-white fill-current" size={20} />
            <span className="text-xl font-black tracking-tighter italic">Wavvy</span>
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
        <main className="flex-1 flex flex-col p-8 overflow-y-auto custom-scrollbar lg:pr-4">
          <div className="relative aspect-video bg-zinc-900 rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/5 ring-1 ring-white/10 group">
             {videoUrl ? (
               <ReactPlayer
                 key={videoUrl}
                 ref={playerRef}
                 url={videoUrl}
                 width="100%"
                 height="100%"
                 playing={isPlaying}
                 controls={true}
                 playsinline={true}
                 onPlay={handlePlay}
                 onPause={handlePause}
                 onSeek={handleSeek}
                 config={{
                   youtube: {
                     playerVars: { autoplay: 1, modestbranding: 1, rel: 0, origin: window.location.origin }
                   }
                 }}
               />
             ) : (
               <div className="absolute inset-0 flex flex-col items-center justify-center text-white/5">
                 <Video size={120} strokeWidth={1} className="mb-6 animate-pulse" />
                 <p className="text-2xl font-black italic tracking-tighter">No video loaded</p>
                 <p className="text-sm font-medium text-white/20 mt-2">Add a video URL below to start watching together</p>
               </div>
             )}
          </div>

          <div className="mt-8 grid grid-cols-1 lg:grid-cols-4 gap-8">
             <div className="lg:col-span-3 space-y-8">
                <div className="bg-zinc-900/50 p-8 rounded-[2rem] border border-white/5">
                   <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white/40 mb-6">Load Stream</h3>
                   <form onSubmit={handleUrlChange} className="relative">
                      <input 
                        type="text" 
                        placeholder="Paste YouTube, Dropbox, or direct .mp4 URL..." 
                        className="w-full bg-black/40 border border-white/10 rounded-2xl py-5 px-8 font-bold text-white/80 focus:outline-none focus:border-primary/50 transition-all disabled:opacity-50"
                        value={inputUrl}
                        onChange={(e) => setInputUrl(e.target.value)}
                        disabled={!canControl}
                      />
                      <button 
                        disabled={!canControl}
                        className="absolute right-2 top-2 bottom-2 bg-primary hover:bg-primary/80 text-black font-black px-8 rounded-xl transition-all shadow-lg uppercase text-xs tracking-widest disabled:opacity-50"
                      >
                        Load Video
                      </button>
                   </form>
                   {!canControl && <p className="mt-2 text-[10px] text-red-500 font-bold uppercase">You don't have permission to load videos</p>}
                   <div className="mt-4 flex flex-wrap gap-4 text-[10px] font-bold text-white/30 uppercase tracking-widest">
                      <span className="flex items-center gap-1 text-primary"><Shield size={10} /> YouTube Safe</span>
                      <span className="flex items-center gap-1 text-primary"><Shield size={10} /> MP4 Direct</span>
                      <span className="flex items-center gap-1 text-primary"><Shield size={10} /> No Buffering</span>
                   </div>
                </div>

                {(localStream || Object.keys(remoteStreams).length > 0) && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                     {localStream && (
                       <div className="aspect-video bg-zinc-900 rounded-2xl overflow-hidden border border-primary/20 relative shadow-2xl">
                          <video ref={el => { if(el) el.srcObject = localStream; }} autoPlay muted className="w-full h-full object-cover mirror" />
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black to-transparent p-3 flex items-center justify-between">
                             <span className="text-[10px] font-black text-primary uppercase tracking-widest truncate">{user.name} (You)</span>
                             <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse"></div>
                          </div>
                       </div>
                     )}
                     {Object.entries(remoteStreams).map(([sid, data]) => (
                        <div key={sid} className="aspect-video bg-zinc-900 rounded-2xl overflow-hidden border border-white/5 relative shadow-2xl">
                           <video ref={el => { if(el) el.srcObject = data.stream; }} autoPlay className="w-full h-full object-cover" />
                           <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black to-transparent p-3 flex items-center justify-between">
                              <span className="text-[10px] font-black text-white/40 uppercase tracking-widest truncate">{data.name}</span>
                           </div>
                        </div>
                     ))}
                  </div>
                )}
             </div>

             <div className="space-y-6">
                <button 
                  onClick={startCall}
                  className={`w-full py-5 rounded-2xl flex items-center justify-center gap-3 font-black uppercase tracking-widest transition-all shadow-2xl ${localStream ? 'bg-red-500 text-white' : 'bg-primary text-black hover:scale-[1.02]'}`}
                >
                  <Video size={18} />
                  {localStream ? 'End Camera' : 'Start Video Call'}
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

        <aside className="w-[400px] border-l border-white/5 bg-black flex flex-col relative">
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
               </form>
             </>
           ) : (
             <div className="flex-1 flex flex-col p-6">
                {isHost && (
                  <div className="bg-zinc-900 border border-white/5 rounded-3xl p-6 mb-6">
                    <div className="flex gap-2">
                        <button onClick={handleGrantAll} className="flex-1 bg-primary/10 hover:bg-primary/20 text-primary text-[10px] font-black uppercase tracking-widest py-3 rounded-xl border border-primary/20 transition-all flex items-center justify-center gap-2">
                            <Shield size={12} /> Grant All
                        </button>
                        <button onClick={handleRevokeAll} className="flex-1 bg-white/5 hover:bg-white/10 text-white/40 text-[10px] font-black uppercase tracking-widest py-3 rounded-xl border border-white/5 transition-all flex items-center justify-center gap-2">
                            <ShieldOff size={12} /> Revoke All
                        </button>
                    </div>
                  </div>
                )}

                <div className="space-y-3 overflow-y-auto flex-1 custom-scrollbar">
                   {members.map(m => (
                     <div key={m.id} className="bg-zinc-900/50 p-4 rounded-2xl border border-white/5 flex items-center gap-4 group">
                        <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-sm font-black relative">
                           {m.name.charAt(0)}
                           <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-primary rounded-full border-2 border-zinc-900"></div>
                        </div>
                        <div className="flex-1 min-w-0">
                           <div className="flex items-center gap-2">
                              <h4 className="text-sm font-black truncate">{m.name}</h4>
                              {m.isHost && <Crown size={12} className="text-yellow-500" />}
                           </div>
                           <p className={`text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 ${m.canControl ? 'text-primary' : 'text-white/20'}`}>
                              {m.canControl ? <Shield size={10} /> : <ShieldOff size={10} />}
                              {m.canControl ? "Can control" : "View only"}
                           </p>
                        </div>
                        {isHost && m.id !== socketRef.current?.id && (
                          <div className="relative">
                            <MoreVertical 
                              className="text-white/10 cursor-pointer hover:text-white" 
                              size={16} 
                              onClick={() => setShowMemberMenu(showMemberMenu === m.id ? null : m.id)}
                            />
                            {showMemberMenu === m.id && (
                              <div className="absolute right-0 top-6 w-48 bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl z-[100] p-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                 <button 
                                  onClick={() => togglePermission(m.id, !m.canControl)}
                                  className="w-full text-left px-4 py-3 rounded-xl hover:bg-white/5 text-[10px] font-black uppercase tracking-widest flex items-center gap-3 transition-colors text-white/60 hover:text-primary"
                                 >
                                    {m.canControl ? <ShieldOff size={14} /> : <Shield size={14} />}
                                    {m.canControl ? "Revoke Control" : "Grant Control"}
                                 </button>
                                 <button 
                                  onClick={() => handleKick(m.id)}
                                  className="w-full text-left px-4 py-3 rounded-xl hover:bg-red-500/10 text-[10px] font-black uppercase tracking-widest flex items-center gap-3 transition-colors text-red-500/60 hover:text-red-500"
                                 >
                                    <XCircle size={14} />
                                    Kick Participant
                                 </button>
                              </div>
                            )}
                          </div>
                        )}
                     </div>
                   ))}
                </div>

                <button 
                  onClick={() => navigate('/')}
                  className="mt-8 bg-red-500/5 hover:bg-red-500/10 text-red-500 text-xs font-black uppercase tracking-widest py-4 rounded-2xl border border-red-500/10 transition-all flex items-center justify-center gap-2"
                >
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
