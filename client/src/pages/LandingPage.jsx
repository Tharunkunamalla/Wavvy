import React, {useState, useEffect} from "react";
import {useNavigate} from "react-router-dom";
import {
  Play,
  Plus,
  Search,
  Video,
  Clock,
  Monitor,
  Users,
  CreditCardIcon,
  Trash2
} from "lucide-react";
import {Link} from "react-router-dom";

const LandingPage = () => {
  const [roomId, setRoomId] = useState("");
  const [roomName, setRoomName] = useState("");
  const [myRooms, setMyRooms] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [joinError, setJoinError] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));

  useEffect(() => {
    if (user && user.email) {
      const savedRooms = JSON.parse(
        localStorage.getItem(`myRooms_${user.email}`) || "[]",
      );
      setMyRooms(savedRooms);
    }
  }, [user?.email]);

  const handleCreateRoom = (e) => {
    e.preventDefault();
    if (!user) return navigate("/login");
    if (!roomName.trim()) return;

    const newRoomId = Math.random().toString(36).substring(2, 9);
    const newRoom = {
      id: newRoomId,
      name: roomName.trim(),
      createdAt: new Date().toISOString(),
    };
    const updatedRooms = [newRoom, ...myRooms];
    localStorage.setItem(`myRooms_${user.email}`, JSON.stringify(updatedRooms));
    navigate(`/room/${newRoomId}`, {state: {roomName: roomName.trim()}});
  };

  const handleJoinRoom = async (e) => {
    e.preventDefault();
    if (!user) return navigate("/login");
    
    const tid = roomId.trim();
    if (!tid) return;

    try {
      setJoinError("");
      setIsJoining(true);
      
      const res = await fetch(`http://localhost:5001/api/check-room?roomId=${tid}`);
      const data = await res.json();
      
      if (!data.exists) {
        setJoinError("Room not found. Please check the ID.");
        setIsJoining(false);
        return;
      }

      // Add to recent if not already there
      if (!myRooms.find((r) => r.id === tid)) {
        const newEntry = {
          id: tid,
          name: "Joined Room",
          createdAt: new Date().toISOString(),
        };
        const updated = [newEntry, ...myRooms];
        localStorage.setItem(`myRooms_${user.email}`, JSON.stringify(updated));
      }
      navigate(`/room/${tid}`);
    } catch (err) {
      console.error("Failed to check room:", err);
      setJoinError("Failed to join room. Please try again.");
      setIsJoining(false);
    }
  };

  const handleGetStarted = () => {
    if (!user) navigate("/login");
    else setShowCreateModal(true);
  };

  const handleDeleteRoom = (e, roomIdToDelete) => {
    e.stopPropagation();
    const updatedRooms = myRooms.filter(room => room.id !== roomIdToDelete);
    setMyRooms(updatedRooms);
    localStorage.setItem(`myRooms_${user.email}`, JSON.stringify(updatedRooms));
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans">
      {/* Top Navigation */}
      <nav className="h-20 flex items-center justify-between px-12 z-50">
        <div className="flex items-center gap-2 cursor-pointer group">
          <Play className="text-primary fill-current drop-shadow-[0_0_12px_rgba(249,115,22,0.8)] group-hover:scale-110 transition-transform" size={28} />
          <span className="text-3xl font-brand tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-300 drop-shadow-xl mt-1">
            Wavvy
          </span>
        </div>
        <div className="flex items-center gap-6">
          {!user ? (
            <button
              onClick={() => navigate("/login")}
              className="bg-white/5 hover:bg-white/10 text-white px-6 py-2 rounded-full text-sm font-bold border border-white/10 transition-all"
            >
              Sign In
            </button>
          ) : (
            <div className="flex items-center gap-4 bg-white/5 p-2 pr-4 rounded-full border border-white/5">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-black font-black shadow-lg shadow-primary/20">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col">
                <span className="text-white/80 text-xs font-black uppercase tracking-widest leading-none">
                  Hello,
                </span>
                <span className="text-white text-sm font-black italic">
                  {user.name}
                </span>
              </div>
              <button
                onClick={() => {
                  localStorage.removeItem("user");
                  window.location.reload();
                }}
                className="ml-4 text-[10px] font-black uppercase tracking-[0.2em] text-white/20 hover:text-red-500 transition-colors"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </nav>

      <main className={`flex-1 max-w-7xl w-full mx-auto p-8 ${!user ? "grid grid-cols-1 lg:grid-cols-2 gap-16 items-center" : "flex flex-col gap-10 mt-4"}`}>
        {!user ? (
          <>
            {/* Left: Hero Content */}
            <div className="space-y-10">
              <div className="space-y-4">
                <h1 className="text-7xl font-black leading-[1.1] tracking-tighter">
                  Watch Together, <br />
                  <span className="text-primary italic">Perfectly Synced</span>
                </h1>
                <p className="text-xl text-white/40 leading-relaxed max-w-lg font-medium">
                  Experience movies and shows with friends in perfect harmony.
                  Real-time sync, video calls, and instant chat—all in one place.
                </p>
              </div>

              <div className="flex flex-col gap-6">
                <div className="flex flex-col sm:flex-row gap-4">
                  <button
                    onClick={handleGetStarted}
                    className="bg-white text-black font-black px-10 py-5 rounded-2xl flex items-center gap-3 hover:scale-105 active:scale-95 transition-all duration-300 text-lg shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_30px_rgba(255,255,255,0.5)]"
                  >
                    <Plus fill="black" size={20} />
                    Create Room
                  </button>
                  <div className="relative flex-1 max-w-sm">
                    <div className="relative w-full">
                      <input
                        type="text"
                        placeholder="Paste Room ID to join..."
                       className={`w-full bg-zinc-900 border ${joinError ? 'border-red-500/50 focus:border-red-500' : 'border-white/5 focus:border-orange-500'} rounded-2xl py-5 pl-12 pr-4 focus:outline-none transition-all text-sm font-bold h-full`}

                        value={roomId}
                        onChange={(e) => {
                          setRoomId(e.target.value);
                          if (joinError) setJoinError("");
                        }}
                      />
                      <Search
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20"
                        size={18}
                      />
                      {roomId.trim() && (
                        <button
                          onClick={handleJoinRoom}
                          disabled={isJoining}
                          className="absolute right-2 top-2 bottom-2 bg-primary text-black font-black px-6 rounded-xl text-xs uppercase tracking-widest hover:bg-primary/80 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                          {isJoining ? (
                            <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                          ) : (
                            "Join"
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                  {joinError && (
                    <p className="text-red-500 text-xs font-bold mt-2 flex items-center gap-1">
                      {joinError}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 text-[10px] font-black text-white/20 tracking-[0.2em] uppercase">
                  <Monitor size={14} />
                  <span>Free Forever</span>
                  <span className="w-1 h-1 bg-white/20 rounded-full mx-1"></span>
                  <CreditCardIcon size={14} />
                  <span>No Credit Card</span>
                </div>
              </div>
            </div>

            {/* Right: Feature Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <FeatureCard
                icon={<Clock className="text-white" size={24} />}
                title="Perfect Sync"
                desc="Real-time synchronization keeps everyone watching at the exact same moment"
              />
              <FeatureCard
                icon={<Users className="text-white" size={24} />}
                title="Video Calls"
                desc="See your friends' reactions in real-time with built-in video chat"
              />
              <FeatureCard
                icon={<Monitor className="text-white" size={24} />}
                title="Any Platform"
                desc="YouTube, direct links, and more—watch from anywhere"
              />
              <FeatureCard
                icon={<Play className="text-white" size={24} />}
                title="Live Chat"
                desc="Share reactions and jokes with instant messaging"
              />
            </div>
          </>
        ) : (
          <div className="space-y-10">
            {/* Welcome Text */}
            <div className="space-y-2">
              <h1 className="text-5xl font-brand tracking-wide drop-shadow-lg flex items-center gap-3">
                Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-300 drop-shadow-xl">{user.name}</span>!
              </h1>
              <p className="text-white/60 font-medium tracking-wide uppercase text-sm mt-2">
                 Create a room or join one to start watching together
              </p>
            </div>

            {/* Action Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
              {/* Create Room Card */}
              <button
                onClick={handleGetStarted}
                className="bg-zinc-200 hover:bg-white text-black font-semibold min-h-[140px] rounded-[1.25rem] flex items-center justify-center gap-2 transition-colors text-lg shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_30px_rgba(255,255,255,0.5)]"
              >
                <Plus size={20} />
                Create New Room
              </button>

              {/* Join Room Card */}
              <div className="bg-[#111] border border-white/5 rounded-[1.25rem] p-6 flex flex-col justify-center gap-3 min-h-[140px]">
                <label className="text-sm font-medium text-white/70 flex justify-between">
                  <span>Join with Room ID</span>
                  {joinError && <span className="text-red-500 text-xs">{joinError}</span>}
                </label>
                <div className="flex flex-col gap-2">
                  <div className="flex gap-4">
                    <input
                      type="text"
                      placeholder="Enter room ID"
                      className={`flex-1 bg-black border ${joinError ? 'border-red-500/50 focus:border-red-500' : 'border-white/5 focus:border-orange-500'} rounded-xl py-3 px-4 focus:outline-none transition-all font-medium text-sm text-white`}
                      value={roomId}
                      onChange={(e) => {
                        setRoomId(e.target.value);
                        if (joinError) setJoinError("");
                      }}
                    />
                    <button
                      onClick={handleJoinRoom}
                      disabled={!roomId.trim() || isJoining}
                      className="bg-zinc-600 hover:bg-zinc-500 flex items-center justify-center min-w-[100px] disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium px-4 py-3 rounded-xl transition-all text-sm"
                    >
                      {isJoining ? (
                        <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      ) : (
                        "Join Room"
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Recently Created Rooms Section */}
      {user && myRooms.length > 0 && (
        <section className="max-w-7xl w-full mx-auto px-8 pb-20">
          <div className="flex items-center gap-2 mb-6">
            <Video className="text-white" size={22} fill="none" />
            <h2 className="text-xl font-bold tracking-tight">
              My Rooms
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {myRooms.map((room) => (
              <div
                key={room.id}
                onClick={() => navigate(`/room/${room.id}`)}
                className="bg-[#111] p-5 rounded-2xl border border-white/5 hover:border-orange-500 transition-all cursor-pointer flex flex-col gap-4 relative group"
              >
                <button
                  onClick={(e) => handleDeleteRoom(e, room.id)}
                  className="absolute right-4 top-4 text-white/20 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash2 size={16} />
                </button>
                <h4 className="font-bold text-lg text-white pr-6">
                  {room.name || "Untitled Room"}
                </h4>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-xs text-white/50">
                    <Clock size={14} />
                    <span>
                      Created{" "}
                      {new Date(room.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-white/50">
                    <Video size={14} />
                    <span>Video loaded</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="py-12 px-8 flex flex-col sm:flex-row items-center justify-between max-w-7xl w-full mx-auto border-t border-white/5">
        <div className="flex gap-8 text-[10px] font-black uppercase tracking-[0.2em] text-white/20">
          <span className="hover:text-white transition-colors cursor-pointer">
            <Link to="/about?" className="hover:text-white transition-colors">
              About Us
            </Link>
          </span>
          <span className="hover:text-white transition-colors cursor-pointer">
            <Link
              to="/contact?"
              className="hover:text-white hover:-translate-x-1 transition-all duration-300 cursor-pointer"
            >
              Contact Us
            </Link>
          </span>
        </div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/10 mt-6 sm:mt-0">
          © 2026 Wavvy. Watch together, wherever you are.
        </p>
      </footer>

      {/* Create Room Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[100] flex items-center justify-center p-6">
          <div className="bg-zinc-900 w-full max-w-lg rounded-[2.5rem] border border-white/10 p-12 shadow-2xl relative">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute top-8 right-8 text-white/20 hover:text-white transition-colors"
            >
              <Plus className="rotate-45" size={32} />
            </button>
            <h2 className="text-4xl font-black tracking-tight italic mb-2">
              Create New Room
            </h2>
            <p className="text-white/40 font-medium mb-10">
              Choose a name for your watch party
            </p>
            <form onSubmit={handleCreateRoom} className="space-y-6">
              <input
                autoFocus
                type="text"
                placeholder="Enter room name (e.g. Movie Night)"
                className="w-full bg-black/40 border border-white/10 rounded-2xl py-5 px-8 focus:outline-none focus:border-primary/50 transition-all text-lg font-bold"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
              />
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 bg-white/5 hover:bg-white/10 text-white font-black py-5 rounded-2xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-[2] bg-primary text-black font-black py-5 rounded-2xl transition-all shadow-xl shadow-primary/20"
                >
                  Create Room
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const FeatureCard = ({icon, title, desc}) => (
  <div className="bg-zinc-900 border border-white/5 p-10 rounded-[2.5rem] space-y-6 hover:bg-zinc-800/50 transition-all group">
    <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center group-hover:bg-primary transition-colors">
      {React.cloneElement(icon, {
        className: "text-white group-hover:text-black transition-colors",
      })}
    </div>
    <div className="space-y-2">
      <h3 className="text-xl font-bold italic tracking-tighter">{title}</h3>
      <p className="text-sm text-white/40 font-medium leading-relaxed">
        {desc}
      </p>
    </div>
  </div>
);

export default LandingPage;
