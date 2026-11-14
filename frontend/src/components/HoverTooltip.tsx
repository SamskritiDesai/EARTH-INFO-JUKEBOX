// HoverTooltip.tsx
// Clean, readable, non-blocking tooltip card with high-contrast typography,
// visual scale bar, and plain-English description of what the parameter does & how it sounds.

import React, { useEffect, useState } from 'react';
import { HoverTooltipInfo } from '../types/forest';

interface HoverTooltipProps {
  info: HoverTooltipInfo | null;
}

export const HoverTooltip: React.FC<HoverTooltipProps> = ({ info }) => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  if (!info || !info.visible) return null;

  // Smart non-blocking viewport positioning:
  // Offset to the top-right or bottom-right of the mouse cursor,
  // clamped so it never covers the slider under the mouse and never clips screen edges.
  const cardWidth = 310;
  const cardHeight = 175;

  let posX = mousePos.x + 20;
  let posY = mousePos.y - cardHeight - 15;

  // If too close to top edge, place below cursor
  if (posY < 12) {
    posY = mousePos.y + 24;
  }
  // If too close to right edge, place to the left
  if (posX + cardWidth > window.innerWidth - 16) {
    posX = mousePos.x - cardWidth - 20;
  }
  // Clamp X and Y within screen bounds
  posX = Math.max(12, Math.min(window.innerWidth - cardWidth - 12, posX));
  posY = Math.max(12, Math.min(window.innerHeight - cardHeight - 12, posY));

  const pct = Math.max(0, Math.min(100, info.percentageValue));

  return (
    <div
      style={{
        position: 'fixed',
        left: `${posX}px`,
        top: `${posY}px`,
        width: `${cardWidth}px`,
        pointerEvents: 'none',
        zIndex: 9999,
        backgroundColor: 'rgba(0, 14, 42, 0.96)',
        border: '2px solid #00ccff',
        boxShadow: '0 0 16px rgba(0, 204, 255, 0.45), 4px 4px 0px rgba(0, 0, 0, 0.8)',
        padding: '10px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        backdropFilter: 'blur(4px)',
        transition: 'top 0.04s ease-out, left 0.04s ease-out',
      }}
    >
      {/* Header Row: Title & Tag */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #0044aa', paddingBottom: '4px' }}>
        <div style={{ fontFamily: 'var(--font-retro-pixel)', fontSize: '9px', color: '#ffffff', letterSpacing: '0.5px' }}>
          {info.parameterName.toUpperCase()}
        </div>
        <span
          style={{
            fontFamily: 'var(--font-silk)',
            fontSize: '7px',
            color: '#000',
            backgroundColor: info.barColor || '#00ff88',
            padding: '1px 5px',
            fontWeight: 'bold',
          }}
        >
          {info.gediMetric}
        </span>
      </div>

      {/* Value & Units Row */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '2px 0' }}>
        <span style={{ fontFamily: 'var(--font-mono-term)', fontSize: '20px', color: '#ffff00', fontWeight: 'bold' }}>
          {info.currentValue} <span style={{ fontSize: '13px', color: '#88ccff' }}>{info.units}</span>
        </span>
        <span style={{ fontFamily: 'var(--font-mono-term)', fontSize: '13px', color: '#00ff66' }}>
          {pct.toFixed(0)}% SCALE
        </span>
      </div>

      {/* Visual Bar Scale */}
      <div style={{ width: '100%', height: '8px', backgroundColor: '#00081c', border: '1px solid #003388', position: 'relative' }}>
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            backgroundColor: info.barColor || '#00ff88',
            boxShadow: `0 0 8px ${info.barColor || '#00ff88'}`,
            transition: 'width 0.1s linear',
          }}
        />
      </div>

      {/* What it does (Plain English) */}
      <div style={{ fontFamily: 'var(--font-tech)', fontSize: '11px', color: '#c0d4f0', lineHeight: '1.3' }}>
        <span style={{ color: '#00ccff', fontWeight: 'bold' }}>WHAT IT IS: </span>
        {info.scientificDescription}
      </div>

      {/* How it sounds (Plain English) */}
      <div
        style={{
          fontFamily: 'var(--font-tech)',
          fontSize: '11px',
          color: '#ffea88',
          lineHeight: '1.3',
          borderTop: '1px dashed #003388',
          paddingTop: '4px',
        }}
      >
        <span style={{ color: '#ff9900', fontWeight: 'bold' }}>HOW IT SOUNDS: </span>
        {info.soundDescription}
      </div>
    </div>
  );
};
