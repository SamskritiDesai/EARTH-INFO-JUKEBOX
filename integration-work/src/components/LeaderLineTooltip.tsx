import React from 'react';
import { ParameterId, PARAMETERS } from '../data/earthDataEngine';

interface LeaderLineTooltipProps {
  paramId: ParameterId | null;
  cursorPos: { x: number; y: number } | null;
}

export const LeaderLineTooltip: React.FC<LeaderLineTooltipProps> = ({ paramId, cursorPos }) => {
  if (!paramId || !cursorPos) return null;

  const meta = PARAMETERS[paramId];
  if (!meta) return null;

  // Box coordinates positioned offset from cursor
  const boxX = Math.min(window.innerWidth - 320, Math.max(20, cursorPos.x + 40));
  const boxY = Math.max(60, Math.min(window.innerHeight - 240, cursorPos.y - 80));

  return (
    <div
      className="leader-line-tooltip-portal"
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 9999
      }}
    >
      {/* SVG Angled Leader Line */}
      <svg
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none'
        }}
      >
        <line
          x1={cursorPos.x}
          y1={cursorPos.y}
          x2={boxX - 10}
          y2={boxY + 20}
          stroke="#00ffff"
          strokeWidth="1.5"
          strokeDasharray="3 3"
        />
        <circle cx={cursorPos.x} cy={cursorPos.y} r="3" fill="#00ffff" />
      </svg>

      {/* 16-Bit Pixel HUD Callout Box */}
      <div
        className="pixel-callout-box font-vt323"
        style={{
          position: 'absolute',
          left: boxX,
          top: boxY,
          width: 290
        }}
      >
        <div className="callout-header">
          <span className="callout-tag">[NASA SVS TELEMETRY]</span>
          <span className="callout-id">{meta.shortLabel}</span>
        </div>

        <div className="callout-body">
          <div className="callout-row">
            <span className="field-lbl">DATASET:</span>
            <span className="field-val white">{meta.name}</span>
          </div>
          <div className="callout-row">
            <span className="field-lbl">SOURCE:</span>
            <span className="field-val cyan">{meta.svsSource}</span>
          </div>
          <div className="callout-row">
            <span className="field-lbl">INSTRUMENT:</span>
            <span className="field-val green">{meta.instrument}</span>
          </div>
          <div className="callout-row">
            <span className="field-lbl">UNITS:</span>
            <span className="field-val amber">{meta.units}</span>
          </div>
          <div className="callout-divider" />
          <div className="callout-row">
            <span className="field-lbl">SONIFICATION:</span>
            <span className="field-val white">{meta.voiceStyle}</span>
          </div>
          <div className="callout-mapping-rule">
            &gt; {meta.mappingRule}
          </div>
        </div>
      </div>
    </div>
  );
};