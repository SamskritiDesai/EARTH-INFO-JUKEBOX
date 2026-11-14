// VerticalHeatmap.tsx
// Live scrolling rainbow spectral elevation heatmap visualizing height/density history
// Blue -> Cyan -> Green -> Yellow -> Red

import React, { useEffect, useRef } from 'react';
import { CanopyColumnData, HoverTooltipInfo } from '../types/forest';
import { globalForestLoader } from '../data/UniversalForestLoader';

interface VerticalHeatmapProps {
  telemetry: CanopyColumnData;
  onSetHoverTooltip: (info: HoverTooltipInfo | null) => void;
}

export const VerticalHeatmap: React.FC<VerticalHeatmapProps> = ({ telemetry, onSetHoverTooltip }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const historyRef = useRef<number[]>([]);

  // Push new canopy height samples into rolling history buffer
  useEffect(() => {
    historyRef.current.push(telemetry.maxCanopyHeight);
    if (historyRef.current.length > 120) {
      historyRef.current.shift();
    }
  }, [telemetry]);

  // Render rolling spectral waterfall canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.fillStyle = '#000818';
      ctx.fillRect(0, 0, w, h);

      // Draw faint background grid
      ctx.strokeStyle = '#001a44';
      ctx.lineWidth = 1;
      for (let y = 0; y < h; y += 12) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      const history = historyRef.current;
      const colWidth = Math.max(2, w / 120);

      // Render vertical slices for each historical sample
      history.forEach((heightMeters, i) => {
        const x = i * colWidth;
        const normHeight = Math.min(1, heightMeters / 60);
        const barHeight = normHeight * (h - 8);

        // Rainbow Thermal color for this height
        const rgb = globalForestLoader.heightToThermalRGB(heightMeters);
        ctx.fillStyle = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
        ctx.fillRect(x, h - barHeight - 4, colWidth, barHeight);
      });

      // Overlay horizontal threshold line for current height
      const currentNorm = Math.min(1, telemetry.maxCanopyHeight / 60);
      const curY = h - currentNorm * (h - 8) - 4;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(0, curY);
      ctx.lineTo(w, curY);
      ctx.stroke();
      ctx.setLineDash([]);

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [telemetry]);

  return (
    <div
      className="hud-panel panel-bottom-left"
      onMouseEnter={() =>
        onSetHoverTooltip({
          visible: true,
          x: 0,
          y: 0,
          title: 'SPECTRAL ELEVATION WATERFALL',
          parameterName: 'Temporal Elevation Spectrogram',
          gediMetric: 'RH98 TRACE',
          currentValue: `${telemetry.maxCanopyHeight.toFixed(1)} m`,
          units: 'Meters',
          percentageValue: (telemetry.maxCanopyHeight / 60) * 100,
          barColor: '#ffff00',
          scientificDescription: 'Rolling temporal spectrum recording canopy height and biomass density over time.',
          soundDescription: 'Visualizes the pitch history of the pentatonic lead and tape-warbled chord layers as you explore.',
        })
      }
      onMouseLeave={() => onSetHoverTooltip(null)}
    >
      <div className="hud-panel-header">
        <span>SPECTRAL ELEVATION HEATMAP</span>
        <span style={{ color: '#ffff00', fontSize: '8px' }}>60m MAX</span>
      </div>

      <div className="hud-panel-body" style={{ padding: '4px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
        <div style={{ flex: 1, position: 'relative', border: '1px solid #003388' }}>
          <canvas ref={canvasRef} width={276} height={68} style={{ width: '100%', height: '100%', display: 'block' }} />
        </div>

        {/* Gradient Legend Strip */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '7px' }}>
          <span style={{ color: '#0066ff' }}>0m</span>
          <div
            style={{
              flex: 1,
              height: '6px',
              border: '1px solid #000',
              background: 'linear-gradient(to right, #0000ff, #00ffff, #00ff00, #ffff00, #ff0000)',
            }}
          />
          <span style={{ color: '#ff2222' }}>60m+</span>
        </div>
      </div>
    </div>
  );
};
