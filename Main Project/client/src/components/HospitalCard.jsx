import React from 'react';

const HospitalCard = ({ hospital }) => (
  <div className="glass-card p-4 flex flex-col gap-2 hover-lift transition">
    <div className="flex items-center justify-between gap-2">
      <div className="min-w-0">
        <p className="font-rajdhani font-semibold text-lg truncate">{hospital.name}</p>
        <p className="text-xs text-gray-400 truncate">{hospital.address}</p>
      </div>
      <span
        className={`shrink-0 px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-[0.16em] font-semibold ${hospital.type === 'government'
            ? 'bg-emerald-500/20 text-emerald-300'
            : 'bg-blue-500/20 text-blue-300'
          }`}
      >
        {hospital.type === 'government' ? 'Govt' : 'Private'}
      </span>
    </div>
    <div className="flex items-center justify-between text-xs text-gray-300">
      <a href={`tel:${hospital.phone}`} className="hover:text-accentBlue underline underline-offset-2 transition">
        📞 {hospital.phone}
      </a>
      {hospital.distance != null && (
        <p className="text-[11px] text-accentBlue font-semibold">
          {hospital.distance.toFixed(1)} km
        </p>
      )}
    </div>
    {hospital.emergencyAvailable && (
      <span className="mt-1 inline-flex items-center w-fit gap-1.5 px-2.5 py-0.5 rounded-full bg-accentRed/20 text-[10px] text-accentRed tracking-[0.16em] uppercase font-semibold">
        <span className="h-2 w-2 rounded-full bg-accentRed animate-pulse" />
        Emergency Available
      </span>
    )}
  </div>
);

export default HospitalCard;
