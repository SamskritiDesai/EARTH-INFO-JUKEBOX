import React from 'react';
import { ParameterId, PARAMETERS } from '../data/earthDataEngine';

interface ColorScaleBarProps {
  activeParams: Record<ParameterId, boolean>;
}

export const ColorScaleBar: React.FC<ColorScaleBarProps> = ({ activeParams }) => {
  const activeKeys = (Object.keys(activeParams) as ParameterId[]).filter(k => activeParams[k]);
  if (activeKeys.length === 0) return null;

  return (
    <div className="color-scale-bar-dock pixel-panel-blue font-vt323" aria-label="Active Map Legends">
      <div className="scale-title">MAP SCALE LEGEND</div>
      {activeKeys.map((k) => {
        const meta = PARAMETERS[k];
        return (
          <div key={k} className="scale-item-row">
            <div className="scale-item-header">
              <span className="scale-param-name">{meta.shortLabel}</span>
              <span className="scale-units">{meta.units}</span>
            </div>
            {/* Gradient Bar */}
            <div className={`scale-gradient-bar gradient-${k}`} />
            <div className="scale-range-labels">
              <span>{meta.minVal}</span>
              <span>{meta.maxVal}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};