import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../utils/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useSocket } from '../context/SocketContext.jsx';
import toast from 'react-hot-toast';

const statusBadge = (status) => {
    if (status === 'pending') return 'bg-accentRed/20 text-accentRed';
    if (status === 'assigned') return 'bg-yellow-400/20 text-yellow-300';
    if (status === 'pending_confirmation') return 'bg-amber-400/20 text-amber-300';
    return 'bg-emerald-500/20 text-emerald-300';
};

const statusLabel = (status) => {
    if (status === 'pending_confirmation') return 'Awaiting User Confirm';
    return status;
};

const priorityFromAge = (createdAt) => {
    const ageMs = Date.now() - new Date(createdAt).getTime();
    const ageMin = ageMs / 60000;
    if (ageMin < 15) return { level: 'CRITICAL', color: 'text-accentRed', bg: 'bg-accentRed/15 border-accentRed/40' };
    if (ageMin < 60) return { level: 'HIGH', color: 'text-orange-400', bg: 'bg-orange-400/15 border-orange-400/40' };
    if (ageMin < 180) return { level: 'MEDIUM', color: 'text-yellow-400', bg: 'bg-yellow-400/15 border-yellow-400/40' };
    return { level: 'LOW', color: 'text-gray-400', bg: 'bg-gray-400/10 border-gray-400/30' };
};

const timeAgo = (date) => {
    const ms = Date.now() - new Date(date).getTime();
    const sec = Math.floor(ms / 1000);
    if (sec < 60) return `${sec}s ago`;
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h ${min % 60}m ago`;
    const days = Math.floor(hr / 24);
    return `${days}d ago`;
};

const WorkerDashboard = () => {
    const { user } = useAuth();
    const { socket } = useSocket();
    const [profile, setProfile] = useState(null);
    const [alerts, setAlerts] = useState([]);
    const [filter, setFilter] = useState('active');
    const [expandedId, setExpandedId] = useState(null);
    const [resolving, setResolving] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [profileRes, alertsRes] = await Promise.all([
                    api.get('/workers/me'),
                    api.get('/workers/me/alerts'),
                ]);
                setProfile(profileRes.data);
                setAlerts(alertsRes.data);
            } catch (err) {
                if (err.response?.status === 404) {
                    toast.error('Worker profile not found. Contact admin.');
                }
            }
        };
        fetchData();
    }, []);

    // Listen for new assignments via socket
    useEffect(() => {
        if (!socket) return undefined;
        const handleUpdate = ({ alertId, status }) => {
            setAlerts((prev) =>
                prev.map((a) => (a._id === alertId ? { ...a, status } : a))
            );
            if (status === 'assigned') {
                toast('New alert assigned to you!', { icon: '🚨', duration: 6000 });
                api.get('/workers/me/alerts').then((res) => setAlerts(res.data)).catch(() => { });
            }
        };
        socket.on('sos-updated', handleUpdate);
        return () => { socket.off('sos-updated', handleUpdate); };
    }, [socket]);

    const handleResolve = async (alertId) => {
        setResolving(alertId);
        try {
            await api.patch(`/sos/${alertId}/worker-resolve`);
            setAlerts((prev) =>
                prev.map((a) => (a._id === alertId ? { ...a, status: 'pending_confirmation' } : a))
            );
            toast.success('Resolution sent for user confirmation');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to resolve');
        } finally {
            setResolving(null);
        }
    };

    const activeAlerts = alerts.filter((a) => a.status !== 'resolved');
    const resolvedAlerts = alerts.filter((a) => a.status === 'resolved');
    const displayedAlerts = filter === 'active' ? activeAlerts : resolvedAlerts;

    return (
        <div className="pt-4 pb-10">
            <div className="max-w-5xl mx-auto px-4 space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
                    <div>
                        <p className="font-rajdhani text-xs uppercase tracking-[0.26em] text-accentBlue">
                            Field Responder Console
                        </p>
                        <h2 className="font-rajdhani text-3xl font-semibold mt-1">
                            Welcome, <span className="gradient-text">{user?.name || 'Worker'}</span>
                        </h2>
                        <p className="text-xs text-gray-400 mt-1">
                            View and manage your assigned emergency response tasks.
                        </p>
                    </div>
                    {profile && (
                        <div className="glass-card px-4 py-3 text-right hover-lift">
                            <p className="text-[10px] text-gray-400 uppercase tracking-[0.16em]">Area</p>
                            <p className="font-rajdhani text-lg font-semibold">{profile.area}</p>
                            <p className={`text-[11px] font-semibold ${profile.available ? 'text-emerald-400' : 'text-yellow-400'}`}>
                                {profile.available ? '✓ Available' : '◆ Busy'}
                            </p>
                        </div>
                    )}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3">
                    <div className="glass-card px-4 py-3 hover-lift">
                        <p className="text-[10px] text-gray-400 uppercase tracking-[0.16em]">Total Assigned</p>
                        <p className="font-rajdhani text-2xl font-bold mt-1">{alerts.length}</p>
                        <div className="mt-2 h-1 rounded-full bg-gradient-to-r from-accentBlue to-blue-700" />
                    </div>
                    <div className="glass-card px-4 py-3 hover-lift">
                        <p className="text-[10px] text-gray-400 uppercase tracking-[0.16em]">Active</p>
                        <p className="font-rajdhani text-2xl font-bold mt-1 text-accentRed">{activeAlerts.length}</p>
                        <div className="mt-2 h-1 rounded-full bg-gradient-to-r from-accentRed to-red-700" />
                    </div>
                    <div className="glass-card px-4 py-3 hover-lift">
                        <p className="text-[10px] text-gray-400 uppercase tracking-[0.16em]">Resolved</p>
                        <p className="font-rajdhani text-2xl font-bold mt-1 text-emerald-400">{resolvedAlerts.length}</p>
                        <div className="mt-2 h-1 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-700" />
                    </div>
                </div>

                {/* Filter tabs */}
                <div className="flex gap-2">
                    {[
                        { key: 'active', label: `Active Alerts (${activeAlerts.length})` },
                        { key: 'resolved', label: `Resolved (${resolvedAlerts.length})` },
                    ].map((tab) => (
                        <button
                            key={tab.key}
                            type="button"
                            onClick={() => setFilter(tab.key)}
                            className={`px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-[0.16em] transition ${filter === tab.key
                                ? 'bg-accentBlue/15 text-accentBlue border border-accentBlue/40'
                                : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Alerts list */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={filter}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-3"
                    >
                        {displayedAlerts.length === 0 ? (
                            <div className="glass-card px-4 py-8 text-center text-xs text-gray-400">
                                {filter === 'active'
                                    ? 'No active alerts assigned to you. You\'re all clear! ✅'
                                    : 'No resolved alerts yet.'}
                            </div>
                        ) : (
                            displayedAlerts.map((alert) => {
                                const priority = priorityFromAge(alert.createdAt);
                                const isExpanded = expandedId === alert._id;

                                return (
                                    <motion.div
                                        key={alert._id}
                                        layout
                                        className="glass-card overflow-hidden hover-lift transition"
                                    >
                                        {/* Compact row — always visible */}
                                        <div
                                            className="p-4 cursor-pointer"
                                            onClick={() => setExpandedId(isExpanded ? null : alert._id)}
                                        >
                                            <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        {alert.status !== 'resolved' && (
                                                            <span className="h-2 w-2 rounded-full bg-accentRed animate-pulse" />
                                                        )}
                                                        <p className="font-rajdhani font-semibold text-lg">{alert.userName}</p>
                                                        <span className={`ml-2 px-2 py-0.5 rounded-full text-[9px] uppercase tracking-[0.12em] font-bold border ${priority.bg} ${priority.color}`}>
                                                            {priority.level}
                                                        </span>
                                                    </div>
                                                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400">
                                                        <span>📞 <a href={`tel:${alert.userPhone}`} className="text-accentBlue hover:underline">{alert.userPhone}</a></span>
                                                        <span>📍 {alert.location?.address || `${alert.location?.lat?.toFixed(4)}, ${alert.location?.lng?.toFixed(4)}`}</span>
                                                        <span>🕒 {timeAgo(alert.createdAt)}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <span
                                                        className={`px-3 py-1 rounded-full text-[10px] uppercase tracking-[0.14em] font-semibold ${statusBadge(alert.status)}`}
                                                    >
                                                        {statusLabel(alert.status)}
                                                    </span>
                                                    <span className="text-gray-500 text-xs">
                                                        {isExpanded ? '▲' : '▼'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Expanded detail panel */}
                                        <AnimatePresence>
                                            {isExpanded && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    transition={{ duration: 0.2 }}
                                                    className="overflow-hidden"
                                                >
                                                    <div className="px-4 pb-4 border-t border-white/5 pt-4 space-y-4">
                                                        {/* Detail grid */}
                                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                                            <div className="bg-white/5 rounded-xl px-3 py-2">
                                                                <p className="text-[9px] text-gray-500 uppercase tracking-[0.16em]">Triggered Via</p>
                                                                <p className="text-sm font-semibold mt-0.5 capitalize">
                                                                    {alert.triggeredVia === 'voice' ? '🎙️ Voice' : '🔴 Button'}
                                                                </p>
                                                            </div>
                                                            <div className="bg-white/5 rounded-xl px-3 py-2">
                                                                <p className="text-[9px] text-gray-500 uppercase tracking-[0.16em]">Reported At</p>
                                                                <p className="text-sm font-semibold mt-0.5">
                                                                    {new Date(alert.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                                                                </p>
                                                            </div>
                                                            <div className="bg-white/5 rounded-xl px-3 py-2">
                                                                <p className="text-[9px] text-gray-500 uppercase tracking-[0.16em]">Coordinates</p>
                                                                <p className="text-sm font-mono font-semibold mt-0.5">
                                                                    {alert.location?.lat?.toFixed(5)}, {alert.location?.lng?.toFixed(5)}
                                                                </p>
                                                            </div>
                                                            <div className="bg-white/5 rounded-xl px-3 py-2">
                                                                <p className="text-[9px] text-gray-500 uppercase tracking-[0.16em]">Response Time</p>
                                                                <p className="text-sm font-semibold mt-0.5">
                                                                    {timeAgo(alert.createdAt)}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        {/* Location & address */}
                                                        {alert.location?.address && (
                                                            <div className="bg-white/5 rounded-xl px-4 py-3">
                                                                <p className="text-[9px] text-gray-500 uppercase tracking-[0.16em] mb-1">Full Address</p>
                                                                <p className="text-sm">{alert.location.address}</p>
                                                            </div>
                                                        )}

                                                        {/* Status timeline */}
                                                        <div className="bg-white/5 rounded-xl px-4 py-3">
                                                            <p className="text-[9px] text-gray-500 uppercase tracking-[0.16em] mb-2">Status Progress</p>
                                                            <div className="flex items-center gap-1">
                                                                {['pending', 'assigned', 'pending_confirmation', 'resolved'].map((s, i) => {
                                                                    const steps = ['pending', 'assigned', 'pending_confirmation', 'resolved'];
                                                                    const currentIdx = steps.indexOf(alert.status);
                                                                    const done = i <= currentIdx;
                                                                    return (
                                                                        <React.Fragment key={s}>
                                                                            <div className={`flex items-center gap-1.5 ${done ? 'text-accentBlue' : 'text-gray-600'}`}>
                                                                                <div className={`h-3 w-3 rounded-full border-2 ${done ? 'bg-accentBlue border-accentBlue' : 'border-gray-600'}`} />
                                                                                <span className="text-[9px] uppercase tracking-wider font-medium hidden sm:inline">
                                                                                    {s === 'pending_confirmation' ? 'Confirm' : s}
                                                                                </span>
                                                                            </div>
                                                                            {i < 3 && (
                                                                                <div className={`flex-1 h-0.5 rounded ${done && i < currentIdx ? 'bg-accentBlue' : 'bg-gray-700'}`} />
                                                                            )}
                                                                        </React.Fragment>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>

                                                        {/* Action buttons */}
                                                        <div className="flex flex-wrap gap-2">
                                                            <a
                                                                href={`https://www.google.com/maps/dir/?api=1&destination=${alert.location?.lat},${alert.location?.lng}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="px-4 py-2 rounded-lg bg-accentBlue/15 text-xs text-accentBlue uppercase tracking-[0.14em] font-semibold hover:bg-accentBlue/25 border border-accentBlue/30 transition"
                                                            >
                                                                📍 Navigate to Location
                                                            </a>
                                                            <a
                                                                href={`tel:${alert.userPhone}`}
                                                                className="px-4 py-2 rounded-lg bg-emerald-500/15 text-xs text-emerald-400 uppercase tracking-[0.14em] font-semibold hover:bg-emerald-500/25 border border-emerald-500/30 transition"
                                                            >
                                                                📞 Call Reporter
                                                            </a>
                                                            {alert.status === 'assigned' && (
                                                                <button
                                                                    type="button"
                                                                    disabled={resolving === alert._id}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleResolve(alert._id);
                                                                    }}
                                                                    className="px-4 py-2 rounded-lg bg-gradient-to-r from-accentRed to-accentBlue text-xs text-white uppercase tracking-[0.14em] font-semibold hover:opacity-90 transition disabled:opacity-50"
                                                                >
                                                                    {resolving === alert._id ? 'Resolving…' : '✓ Mark Resolved'}
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </motion.div>
                                );
                            })
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
};

export default WorkerDashboard;
