import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Users, MessageSquare, Video, Github } from 'lucide-react';

const LandingPage = () => {
  const [roomId, setRoomId] = useState('');
  const navigate = useNavigate();

  const handleCreateRoom = () => {
    const newRoomId = Math.random().toString(36).substring(2, 9);
    navigate(`/room/${newRoomId}`);
  };

  const handleJoinRoom = (e) => {
    e.preventDefault();
    if (roomId.trim()) {
      navigate(`/room/${roomId.trim()}`);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-4 overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[120px] -z-10 animate-pulse-slow"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-secondary/20 rounded-full blur-[120px] -z-10 animate-pulse-slow"></div>

      {/* Header */}
      <header className="absolute top-0 w-full p-8 flex justify-between items-center max-w-7xl">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/30">
            <Play className="text-white fill-current" size={20} />
          </div>
          <span className="text-2xl font-bold tracking-tight">wavvy</span>
        </div>
        <a href="https://github.com/Tharunkunamalla/Wavvy" target="_blank" rel="noopener noreferrer" className="text-white/60 hover:text-white transition-colors">
          <Github size={24} />
        </a>
      </header>

      {/* Hero Section */}
      <main className="max-w-4xl text-center z-10">
        <h1 className="text-6xl md:text-7xl font-bold mb-6 tracking-tight leading-tight">
          Watch Videos Together <br />
          <span className="text-gradient">In Perfect Sync</span>
        </h1>
        <p className="text-xl text-white/60 mb-10 max-w-2xl mx-auto">
          Synchronize YouTube and direct video links with friends. 
          Real-time chat, video calls, and zero latency watch parties.
        </p>

        <div className="flex flex-col md:flex-row gap-4 justify-center items-stretch max-w-lg mx-auto mb-16">
          <button 
            onClick={handleCreateRoom}
            className="btn-primary flex-1 flex items-center justify-center gap-2"
          >
            <Play size={20} />
            Create Watch Room
          </button>
          
          <form onSubmit={handleJoinRoom} className="flex-1 flex gap-2">
            <input 
              type="text" 
              placeholder="Enter Room ID" 
              className="input-field flex-1"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
            />
            <button type="submit" className="btn-secondary px-4">
              Join
            </button>
          </form>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          <FeatureCard 
            icon={<Users className="text-primary" size={24} />}
            title="Room Management"
            desc="Create private rooms and invite friends with a single link."
          />
          <FeatureCard 
            icon={<MessageSquare className="text-secondary" size={24} />}
            title="Live Chat"
            desc="Chat in real-time while you enjoy your favorite content."
          />
          <FeatureCard 
            icon={<Video className="text-accent" size={24} />}
            title="Video Calls"
            desc="See each other's reactions with integrated peer video calling."
          />
        </div>
      </main>

      {/* Footer Decoration */}
      <div className="absolute bottom-10 text-white/40 text-sm">
        No downloads • No sign-up required • Purely Web-based
      </div>
    </div>
  );
};

const FeatureCard = ({ icon, title, desc }) => (
  <div className="glass-card p-6 hover:bg-white/10 transition-colors border-white/5">
    <div className="mb-4">{icon}</div>
    <h3 className="text-xl font-bold mb-2">{title}</h3>
    <p className="text-white/50 leading-relaxed text-sm">{desc}</p>
  </div>
);

export default LandingPage;
