import React from 'react';

const contacts = [
  { label: 'Police', number: '100' },
  { label: 'Ambulance', number: '108' },
  { label: 'Fire', number: '101' },
  { label: 'Women Helpline', number: '1091' },
  { label: 'Disaster Management', number: '108' },
];

const EmergencyContacts = () => (
  <div className="space-y-3">
    <h3 className="font-rajdhani font-semibold tracking-[0.18em] uppercase text-xs text-gray-300">
      Emergency Contacts
    </h3>
    <div className="grid sm:grid-cols-2 gap-3">
      {contacts.map((c) => (
        <div
          key={c.label}
          className="glass-card flex items-center justify-between px-3 py-2 text-xs"
        >
          <div>
            <p className="font-semibold">{c.label}</p>
            <p className="text-gray-400">{c.number}</p>
          </div>
          <a
            href={`tel:${c.number}`}
            className="px-2 py-1 rounded-full bg-accentRed/20 text-[11px] tracking-[0.16em] uppercase text-accentRed hover:bg-accentRed/30"
          >
            Call Now
          </a>
        </div>
      ))}
    </div>
  </div>
);

export default EmergencyContacts;

