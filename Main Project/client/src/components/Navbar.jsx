import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext.jsx';

const navLinkClass = ({ isActive }) =>
  `px-3 py-1.5 rounded-full text-sm font-medium transition ${isActive
    ? 'bg-accentRed/20 text-accentRed shadow-glow-red'
    : 'text-gray-300 hover:text-white hover:bg-white/5'
  }`;

const roleHome = {
  admin: '/admin',
  worker: '/worker',
  user: '/dashboard',
};

const roleBadge = {
  admin: 'ADMIN',
  worker: 'WORKER',
  user: 'CITIZEN',
};

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const home = roleHome[user?.role] || '/dashboard';

  return (
    <header className="sticky top-0 z-30 bg-background/85 backdrop-blur-xl border-b border-white/5">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link to={home} className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-accentRed to-accentBlue flex items-center justify-center shadow-glow">
            <span className="font-rajdhani font-bold text-lg">SOS</span>
          </div>
          <div className="leading-tight">
            <p className="font-rajdhani font-semibold tracking-[0.18em] text-xs text-gray-300 uppercase">
              Command Center
            </p>
            <p className="font-rajdhani font-semibold text-sm text-white">
              Accident Response
            </p>
          </div>
        </Link>

        <button
          type="button"
          className="md:hidden p-2 rounded-lg bg-white/5 hover:bg-white/10"
          onClick={() => setOpen((v) => !v)}
        >
          <span className="sr-only">Toggle Navigation</span>
          <div className="space-y-1">
            <span className="block h-0.5 w-5 bg-white" />
            <span className="block h-0.5 w-5 bg-white" />
          </div>
        </button>

        <nav className="hidden md:flex items-center gap-6">
          <NavLink to={home} className={navLinkClass}>
            Dashboard
          </NavLink>
          {user?.role === 'user' && (
            <>
              <NavLink to="/nearby" className={navLinkClass}>
                Nearby Help
              </NavLink>
              <NavLink to="/risk-prediction" className={navLinkClass}>
                AI Risk Radar
              </NavLink>
            </>
          )}
          {user?.role === 'admin' && (
            <>
              <NavLink to="/admin/sos" className={navLinkClass}>
                SOS Management
              </NavLink>
              <NavLink to="/admin/workers" className={navLinkClass}>
                Workers
              </NavLink>
            </>
          )}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          {user && (
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-accentRed/60 to-accentBlue/80 flex items-center justify-center text-xs font-semibold uppercase">
                {user?.name?.[0]}
              </div>
              <div className="leading-tight">
                <p className="text-xs text-gray-300">{user.name}</p>
                <p className="text-[10px] uppercase tracking-[0.18em] text-accentBlue">
                  {roleBadge[user.role] || user.role}
                </p>
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={handleLogout}
            className="px-3 py-1.5 rounded-full bg-white/5 hover:bg-accentRed/20 border border-white/10 text-xs font-medium tracking-wide"
          >
            Logout
          </button>
        </div>
      </div>

      {open && (
        <motion.nav
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          className="md:hidden border-t border-white/10 bg-background/95 backdrop-blur-xl"
        >
          <div className="px-4 py-3 space-y-2">
            <NavLink
              to={home}
              className={navLinkClass}
              onClick={() => setOpen(false)}
            >
              Dashboard
            </NavLink>
            {user?.role === 'user' && (
              <>
                <NavLink
                  to="/nearby"
                  className={navLinkClass}
                  onClick={() => setOpen(false)}
                >
                  Nearby Help
                </NavLink>
                <NavLink
                  to="/risk-prediction"
                  className={navLinkClass}
                  onClick={() => setOpen(false)}
                >
                  AI Risk Radar
                </NavLink>
              </>
            )}
            {user?.role === 'admin' && (
              <>
                <NavLink
                  to="/admin/sos"
                  className={navLinkClass}
                  onClick={() => setOpen(false)}
                >
                  SOS Management
                </NavLink>
                <NavLink
                  to="/admin/workers"
                  className={navLinkClass}
                  onClick={() => setOpen(false)}
                >
                  Workers
                </NavLink>
              </>
            )}
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                handleLogout();
              }}
              className="w-full mt-2 px-3 py-1.5 rounded-full bg-white/5 hover:bg-accentRed/25 border border-accentRed/60 text-xs font-medium tracking-wide"
            >
              Logout
            </button>
          </div>
        </motion.nav>
      )}
    </header>
  );
};

export default Navbar;
