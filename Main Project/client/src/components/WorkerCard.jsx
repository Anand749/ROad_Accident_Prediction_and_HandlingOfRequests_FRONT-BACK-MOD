import React from 'react';

const WorkerCard = ({ worker, onToggle }) => (
  <div className="glass-card p-4 flex flex-col gap-2 hover-lift transition">
    <div className="flex items-center justify-between">
      <div className="min-w-0">
        <p className="font-rajdhani font-semibold text-lg truncate">{worker.name}</p>
        <p className="text-xs text-gray-400 truncate">{worker.area || worker.location.city}</p>
      </div>
      <span
        className={`shrink-0 px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-[0.16em] font-semibold ${worker.available
            ? 'bg-emerald-500/20 text-emerald-300'
            : 'bg-gray-500/20 text-gray-300'
          }`}
      >
        {worker.available ? '✓ Available' : '◆ Busy'}
      </span>
    </div>
    <div className="flex items-center justify-between text-xs text-gray-300">
      <a href={`tel:${worker.phone}`} className="hover:text-accentBlue underline underline-offset-2 transition">
        {worker.phone}
      </a>
      {onToggle && (
        <button
          type="button"
          onClick={() => onToggle(worker)}
          className="px-3 py-1 rounded-full bg-white/5 hover:bg-accentBlue/20 text-[11px] transition border border-white/10 hover:border-accentBlue/30"
        >
          Toggle
        </button>
      )}
    </div>
  </div>
);

export default WorkerCard;
