import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../utils/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import Particles from '../components/Particles.jsx';

const roleLabels = {
  user: 'Citizen',
  admin: 'Administrator',
  worker: 'Field Worker',
};

const Login = () => {
  const [role, setRole] = useState('user');
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/auth/login', form);
      if (res.data.user.role !== role) {
        toast.error(`Role mismatch. You are a ${roleLabels[res.data.user.role]}, not a ${roleLabels[role]}.`);
      } else {
        login(res.data);
        toast.success('Secure login successful');
        if (res.data.user.role === 'admin') navigate('/admin');
        else if (res.data.user.role === 'worker') navigate('/worker');
        else navigate('/dashboard');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center px-4 overflow-hidden">
      {/* Particles background */}
      <div className="absolute inset-0 z-0">
        <Particles
          particleCount={510}
          particleSpread={15}
          speed={0.1}
          particleColors={['#ffffff', '#ffffff', '#ffffff']}
          moveParticlesOnHover={false}
          particleHoverFactor={3}
          alphaParticles={false}
          particleBaseSize={100}
          sizeRandomness={1}
          cameraDistance={20}
          disableRotation={false}
        />
      </div>

      {/* Gradient overlay for readability */}
      <div className="absolute inset-0 z-[1] bg-gradient-to-t from-[#0A0A0F]/90 via-[#0A0A0F]/40 to-transparent pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card max-w-md w-full p-8 relative z-10 overflow-hidden"
      >
        <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-accentRed/30 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-48 w-48 rounded-full bg-accentBlue/40 blur-3xl" />

        <div className="relative">
          <div className="flex flex-col items-center mb-6">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-accentRed to-accentBlue flex items-center justify-center shadow-glow">
              <span className="font-rajdhani text-xl font-bold">SOS</span>
            </div>
            <h1 className="mt-4 font-rajdhani text-2xl font-semibold tracking-[0.18em] uppercase text-center">
              Emergency Command Access
            </h1>
            <p className="mt-1 text-xs text-gray-400 text-center">
              Secure authentication for citizens, workers and administrators
            </p>
          </div>

          {/* 3-Tab Role Selector */}
          <div className="flex mb-6 p-1 rounded-full bg-white/5 border border-white/10">
            {['user', 'worker', 'admin'].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={`flex-1 py-1.5 text-[11px] rounded-full font-medium uppercase tracking-[0.16em] transition ${role === r
                  ? 'bg-accentRed text-white shadow-glow-red'
                  : 'text-gray-300 hover:text-white'
                  }`}
              >
                {roleLabels[r]}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs text-gray-300 mb-1.5">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 focus:border-accentBlue outline-none text-sm"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-xs text-gray-300 mb-1.5">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 focus:border-accentBlue outline-none text-sm"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2 rounded-lg bg-gradient-to-r from-accentRed to-accentBlue text-sm font-semibold tracking-[0.2em] uppercase shadow-glow-red disabled:opacity-60"
            >
              {loading ? 'Authorising…' : 'Enter Command Center'}
            </button>
          </form>

          <p className="mt-4 text-[11px] text-gray-400 text-center">
            New here?
            {' '}
            <Link to="/register" className="text-accentBlue hover:underline ml-1">
              Create an account
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
