import React from 'react';

const HeatmapLegend = () => (
  <div className="absolute bottom-4 left-4 glass-card px-3 py-2 text-xs text-gray-200">
    <p className="font-semibold text-[11px] tracking-[0.16em] uppercase mb-1">
      Accident Intensity
    </p>
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1.5">
        <span className="h-3 w-3 rounded-full bg-[#30D158]" />
        <span className="text-[11px]">Low</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="h-3 w-3 rounded-full bg-[#FFD60A]" />
        <span className="text-[11px]">Medium</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="h-3 w-3 rounded-full bg-[#FF2D55]" />
        <span className="text-[11px]">High</span>
      </div>
    </div>
  </div>
);

export default HeatmapLegend;

