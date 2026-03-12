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

    socketRef.current.on('user-joined', ({ userId }) => {
      setMembers(prev => [...new Set([...prev, userId])]);
    });

    return () => {
      socketRef.current.disconnect();
    };
  }, [roomId]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (message.trim()) {
      socketRef.current.emit('send-message', {
        roomId,
        message: message.trim(),
        sender: 'You'
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
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Navbar */}
      <nav className="h-16 border-b border-white/10 flex items-center justify-between px-6 bg-surface/50 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Play className="text-white fill-current" size={16} />
          </div>
          <h1 className="text-xl font-bold">Room: <span className="text-primary">{roomId}</span></h1>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              alert("Link copied to clipboard!");
            }}
            className="flex items-center gap-2 text-white/60 hover:text-white transition-colors text-sm"
          >
            <Link size={18} />
            Copy Link
          </button>
          <button 
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-red-400 hover:text-red-300 transition-colors text-sm"
          >
            <LogOut size={18} />
            Leave
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Side: Video Player & Controls */}
        <div className="flex-1 flex flex-col p-6 overflow-y-auto">
          <div className="relative aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl glass-card border-white/5">
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
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white/20">
                <Video size={64} className="mb-4" />
                <p className="text-lg">Paste a video link to start watching together</p>
              </div>
            )}
          </div>

          <div className="mt-6 flex gap-4">
            <form onSubmit={handleUrlChange} className="flex-1 flex gap-2">
              <input 
                type="text" 
                placeholder="Paste YouTube or MP4 link here..." 
                className="input-field flex-1"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
              />
              <button className="btn-primary py-2 px-8">Queue Video</button>
            </form>
          </div>

          {/* Playlist Section */}
          <div className="mt-8">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Play size={20} className="text-primary" />
              Up Next ({playlist.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {playlist.length > 0 ? playlist.map((url, idx) => (
                <div key={idx} className="glass-card p-4 flex items-center gap-4 bg-white/5 border-white/5 group">
                  <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center text-white/40 font-bold group-hover:bg-primary/20 group-hover:text-primary transition-colors">
                    {idx + 1}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="text-sm truncate text-white/70">{url}</p>
                  </div>
                </div>
              )) : (
                <p className="text-white/30 text-sm">No videos in queue.</p>
              )}
            </div>
          </div>

          {/* Members & Controls Bar */}
          <div className="mt-8 flex items-center justify-between p-4 glass-card">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-white/60">
                <Users size={20} />
                <span>{members.length + 1} वाचिंग</span>
              </div>
            </div>
            <button className="btn-secondary py-2 flex items-center gap-2">
              <Video size={18} />
              Start Video Call
            </button>
          </div>
        </div>

        {/* Right Side: Chat Panel */}
        <aside className="w-96 border-l border-white/10 bg-surface/30 backdrop-blur-sm flex flex-col">
          <div className="p-4 border-b border-white/10 italic text-white/40 text-sm">
            Chat with friends in real-time
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex flex-col ${msg.sender === 'You' ? 'items-end' : 'items-start'}`}>
                <span className="text-xs text-white/30 mb-1">{msg.sender}</span>
                <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${msg.sender === 'You' ? 'bg-primary text-white rounded-tr-none' : 'bg-white/10 text-white rounded-tl-none'}`}>
                  {msg.message}
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={sendMessage} className="p-4 bg-surface/50 border-t border-white/10 flex gap-2">
            <input 
              type="text" 
              placeholder="Type a message..." 
              className="input-field flex-1 py-2 text-sm"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <button className="bg-primary p-2 rounded-xl hover:bg-primary/80 transition-all">
              <Send size={18} />
            </button>
          </form>
        </aside>
      </div>
    </div>
  );
};

export default RoomPage;
