import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Plus, Search, Video, Github, Clock, Monitor } from 'lucide-react';

const LandingPage = () => {
  const [roomId, setRoomId] = useState('');
  const [myRooms, setMyRooms] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const savedRooms = JSON.parse(localStorage.getItem('myRooms') || '[]');
    setMyRooms(savedRooms);
  }, []);

  const handleCreateRoom = () => {
    const newRoomId = Math.random().toString(36).substring(2, 9);
    const newRoom = { id: newRoomId, createdAt: new Date().toISOString(), name: 'Watch Party' };
    const updatedRooms = [newRoom, ...myRooms];
    localStorage.setItem('myRooms', JSON.stringify(updatedRooms));
    navigate(`/room/${newRoomId}`);
  };

  const handleJoinRoom = (e) => {
    e.preventDefault();
    if (roomId.trim()) {
      navigate(`/room/${roomId.trim()}`);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Top Navigation */}
      <nav className="h-16 border-b border-white/5 flex items-center justify-between px-8 bg-black/50 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-lg shadow-primary/20">
            <Play className="text-black fill-current" size={16} />
          </div>
          <span className="text-xl font-black tracking-tighter italic">Wavvy</span>
        </div>
        <div className="flex items-center gap-6">
          <a href="https://github.com/Tharunkunamalla/Wavvy" target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-white transition-colors">
            <Github size={20} />
          </a>
          <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary text-xs font-bold">
            U
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-6xl w-full mx-auto p-8 md:p-12">
        {/* Welcome Header */}
        <section className="mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-2">Welcome back!</h1>
          <p className="text-white/40 text-lg">Create a room or join one to start watching together</p>
        </section>

        {/* Action Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          {/* Create Room Card */}
          <button 
            onClick={handleCreateRoom}
            className="group relative flex flex-col items-center justify-center p-12 bg-white/5 border border-white/10 rounded-3xl hover:bg-primary/5 hover:border-primary/30 transition-all duration-500 overflow-hidden"
          >
            <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 blur-3xl transition-opacity duration-500"></div>
            <div className="w-16 h-16 bg-white/10 group-hover:bg-primary group-hover:scale-110 rounded-2xl flex items-center justify-center mb-6 transition-all duration-300">
              <Plus className="text-white group-hover:text-black" size={32} />
            </div>
            <h3 className="text-2xl font-bold mb-2 z-10">Create New Room</h3>
            <p className="text-white/30 text-sm z-10">Start a private party instantly</p>
          </button>

          {/* Join Room Card */}
          <div className="flex flex-col p-10 bg-white/5 border border-white/10 rounded-3xl justify-center">
            <h3 className="text-xl font-bold mb-2">Join with Room ID</h3>
            <p className="text-white/30 text-sm mb-6">Enter a code shared by your friend</p>
            <form onSubmit={handleJoinRoom} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                <input 
                  type="text" 
                  placeholder="Enter room ID..." 
                  className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:border-primary/50 transition-all text-sm"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                />
              </div>
              <button type="submit" className="bg-white/10 hover:bg-white/20 text-white font-bold px-8 rounded-2xl transition-all border border-white/10">
                Join Room
              </button>
            </form>
          </div>
        </section>

        {/* My Rooms List */}
        <section>
          <div className="flex items-center gap-3 mb-8">
            <Monitor className="text-primary" size={24} />
            <h2 className="text-2xl font-bold">My Rooms</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {myRooms.length > 0 ? myRooms.map((room) => (
              <div 
                key={room.id}
                onClick={() => navigate(`/room/${room.id}`)}
                className="glass-card p-6 bg-white/5 border-white/10 hover:border-primary/40 cursor-pointer group transition-all"
              >
                <div className="flex justify-between items-start mb-4">
                  <h4 className="font-bold text-lg group-hover:text-primary transition-colors">{room.id}</h4>
                  <div className="px-2 py-1 bg-primary/10 text-primary rounded text-[10px] font-bold uppercase tracking-wider">
                    Active
                  </div>
                </div>
                <div className="flex items-center gap-2 text-white/30 text-sm mb-1">
                  <Clock size={14} />
                  <span>Created {new Date(room.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2 text-white/30 text-sm">
                  <Video size={14} />
                  <span>Room ID: {room.id}</span>
                </div>
              </div>
            )) : (
              <div className="col-span-full py-12 text-center bg-white/5 border border-dashed border-white/10 rounded-3xl">
                <p className="text-white/20">No recently created rooms found.</p>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Footer Decoration */}
      <footer className="p-8 text-center border-t border-white/5">
        <div className="flex justify-center gap-8 text-white/20 text-xs font-medium uppercase tracking-widest mb-4">
          <span>About Us</span>
          <span>Contact Us</span>
          <span>Terms</span>
          <span>Privacy</span>
        </div>
        <p className="text-white/10 text-[10px] transform">© {new Date().getFullYear()} WAVVY. ALL RIGHTS RESERVED.</p>
      </footer>
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
