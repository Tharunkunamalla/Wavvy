import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Play, Mail, User, ArrowRight } from 'lucide-react';

const LoginPage = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || '/';

  const handleLogin = (e) => {
    e.preventDefault();
    if (name.trim() && email.trim()) {
      localStorage.setItem('user', JSON.stringify({ name, email }));
      navigate(from);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 bg-mesh">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl shadow-2xl shadow-primary/20 mb-4">
            <Play className="text-black fill-current" size={32} />
          </div>
          <h2 className="text-4xl font-black tracking-tight italic">Wavvy</h2>
          <p className="text-white/40 font-medium">Join the ultimate watch party experience</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-4 bg-zinc-900/50 p-8 rounded-3xl border border-white/5 shadow-2xl">
            <div className="relative group">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-primary transition-colors" size={20} />
              <input 
                type="text" 
                placeholder="Your Full Name" 
                className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:border-primary/50 transition-all text-sm font-medium"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-primary transition-colors" size={20} />
              <input 
                type="email" 
                placeholder="Email Address" 
                className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:border-primary/50 transition-all text-sm font-medium"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <button 
              type="submit" 
              className="w-full bg-primary hover:bg-primary/90 text-black font-black py-4 rounded-2xl transition-all shadow-xl flex items-center justify-center gap-2 group"
            >
              Get Started
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </form>

        <p className="text-center text-white/20 text-xs uppercase tracking-widest font-bold">
          No credit card required • Free forever
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
