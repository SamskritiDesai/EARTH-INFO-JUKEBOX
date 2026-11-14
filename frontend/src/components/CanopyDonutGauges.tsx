// CanopyDonutGauges.tsx
// Dual concentric pixel-art donut ring gauges + LiDAR vertical return waveform plot

import React, { useEffect, useRef } from 'react';
import { CanopyColumnData, HoverTooltipInfo } from '../types/forest';

interface CanopyDonutGaugesProps {
  telemetry: CanopyColumnData;
  onSetHoverTooltip: (info: HoverTooltipInfo | null) => void;
}

export const CanopyDonutGauges: React.FC<CanopyDonutGaugesProps> = ({ telemetry, onSetHoverTooltip }) => {
  const donutCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const lidarCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Draw Concentric Donut Ring Gauges
  useEffect(() => {
    const canvas = donutCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const centerX = w / 2;
    const centerY = h / 2;

    // Background circle
    ctx.fillStyle = '#00081c';
    ctx.beginPath();
    ctx.arc(centerX, centerY, 42, 0, Math.PI * 2);
    ctx.fill();

    // Outer Ring: Emergent Crown Ratio (Red/Yellow)
    drawPixelArc(ctx, centerX, centerY, 38, 5, 0, telemetry.emergentRatio, '#ff3333', '#ffff00');

    // Middle Ring: Mid-Canopy Ratio (Green/Cyan)
    drawPixelArc(ctx, centerX, centerY, 30, 5, 0, telemetry.midCanopyRatio, '#00ff66', '#00ccff');

    // Inner Ring: Understory Ground Ratio (Royal/Navy Blue)
    drawPixelArc(ctx, centerX, centerY, 22, 5, 0, telemetry.understoryRatio, '#0066ff', '#00ffff');

    // Center Core: Stratification Indicator
    ctx.fillStyle = telemetry.maxCanopyHeight > 40 ? '#00ff88' : '#00aaff';
    ctx.beginPath();
    ctx.arc(centerX, centerY, 7, 0, Math.PI * 2);
    ctx.fill();

    // Center crosshair
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(centerX - 10, centerY);
    ctx.lineTo(centerX + 10, centerY);
    ctx.moveTo(centerX, centerY - 10);
    ctx.lineTo(centerX, centerY + 10);
    ctx.stroke();
  }, [telemetry]);

  const drawPixelArc = (
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    radius: number,
    thickness: number,
    startRatio: number,
    endRatio: number,
    colorStart: string,
    colorEnd: string
  ) => {
    const startAngle = -Math.PI / 2 + startRatio * Math.PI * 2;
    const endAngle = -Math.PI / 2 + Math.min(1, endRatio) * Math.PI * 2;

    // Track background
    ctx.strokeStyle = '#001a44';
    ctx.lineWidth = thickness;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();

    if (endRatio <= 0.02) return;

    // Active arc gradient
    const grad = ctx.createLinearGradient(cx - radius, cy - radius, cx + radius, cy + radius);
    grad.addColorStop(0, colorStart);
    grad.addColorStop(1, colorEnd);

    ctx.strokeStyle = grad;
    ctx.lineWidth = thickness;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, startAngle, endAngle);
    ctx.stroke();
  };

  // Draw LiDAR Waveform Return Pulse (Multi-Peak)
  useEffect(() => {
    const canvas = lidarCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Background Grid
    ctx.fillStyle = '#000614';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = '#001e55';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 15) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 12) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Ground elevation line (transmitted baseline)
    ctx.strokeStyle = '#0044aa';
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.moveTo(0, h - 8);
    ctx.lineTo(w, h - 8);
    ctx.stroke();
    ctx.setLineDash([]);

    // Synthesize or draw LiDAR waveform curve:
    // Vertical axis: height 0 to 60m (from bottom to top)
    // Horizontal axis: laser return energy amplitude
    ctx.beginPath();
    ctx.moveTo(10, h - 8);

    const strata = telemetry.strata;
    const points: [number, number][] = [];

    // Base ground return spike (at bottom)
    points.push([12, h - 4]);
    points.push([35 + (telemetry.understoryRatio * 45), h - 8]);
    points.push([14, h - 14]);

    // For each of the 8 strata, calculate amplitude at corresponding altitude
    strata.forEach((stratum, idx) => {
      const altNorm = stratum.maxAlt / 60; // 0 to 1
      const y = h - 8 - altNorm * (h - 16);
      // Amplitude scales with Leaf Area Density (LAD)
      const amp = 10 + stratum.density * (w - 28);
      points.push([amp, y]);
    });

    // Top noise floor
    points.push([10, 4]);

    // Draw Smooth Pixel Curve
    ctx.strokeStyle = '#00ff66';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#00ff66';
    ctx.shadowBlur = 6;

    ctx.beginPath();
    points.forEach((pt, i) => {
      if (i === 0) ctx.moveTo(pt[0], pt[1]);
      else ctx.lineTo(pt[0], pt[1]);
    });
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Fill underneath curve
    ctx.lineTo(10, 4);
    ctx.lineTo(10, h - 8);
    ctx.closePath();
    ctx.fillStyle = 'rgba(0, 255, 100, 0.12)';
    ctx.fill();

    // Peak Elevation Marker
    const peakY = h - 8 - (Math.min(60, telemetry.maxCanopyHeight) / 60) * (h - 16);
    ctx.fillStyle = '#ff3333';
    ctx.fillRect(4, Math.max(2, peakY - 1), 6, 3);

    // Callout text on canvas
    ctx.fillStyle = '#ffffff';
    ctx.font = '7px "Press Start 2P"';
    ctx.fillText(`RH98: ${telemetry.maxCanopyHeight.toFixed(1)}m`, 28, Math.max(12, peakY + 3));
  }, [telemetry]);

  return (
    <div
      className="hud-panel panel-top-left"
      onMouseEnter={() =>
        onSetHoverTooltip({
          visible: true,
          x: 0,
          y: 0,
          title: 'CANOPY STRATA RATIO & LIDAR',
          parameterName: 'Vertical Canopy Strata',
          gediMetric: 'RH98 / LAD(z)',
          currentValue: `${telemetry.maxCanopyHeight.toFixed(1)} m`,
          units: 'Meters',
          percentageValue: (telemetry.maxCanopyHeight / 60) * 100,
          barColor: '#00ff88',
          scientificDescription: 'Dual concentric donut rings measuring Understory (0-10m), Mid-Canopy (10-30m), and Emergent Crown (30-60m).',
          soundDescription: 'Governs the ratio of woody bass kicks, arpeggiated FM marimbas, and soaring pentatonic leads.',
        })
      }
      onMouseLeave={() => onSetHoverTooltip(null)}
    >
      <div className="hud-panel-header">
        <span>CANOPY PROFILE & LIDAR</span>
        <span style={{ color: '#00ff66', fontSize: '8px' }}>LIVE GEDI</span>
      </div>

      <div className="hud-panel-body" style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
          {/* Dual Donut Rings */}
          <div style={{ position: 'relative', width: '92px', height: '92px', flexShrink: 0 }}>
            <canvas ref={donutCanvasRef} width={92} height={92} style={{ width: '100%', height: '100%' }} />
            <div
              style={{
                position: 'absolute',
                bottom: '-2px',
                left: '0',
                right: '0',
                textAlign: 'center',
                fontSize: '6px',
                color: '#88aacc',
                fontFamily: 'var(--font-retro-pixel)',
              }}
            >
              DONUT STRATA
            </div>
          </div>

          {/* Vertical LiDAR Waveform Plot */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '7px', color: '#00ccff', marginBottom: '2px' }}>
              <span>WAVEFORM P(z)</span>
              <span>60m</span>
            </div>
            <div style={{ position: 'relative', width: '100%', height: '76px', border: '1px solid #0044aa' }}>
              <canvas ref={lidarCanvasRef} width={160} height={76} style={{ width: '100%', height: '100%' }} />
            </div>
          </div>
        </div>

        {/* Legend / Metrics summary row */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: '4px',
            background: '#000f2e',
            border: '1px solid #002f77',
            padding: '4px 6px',
            fontSize: '7px',
            fontFamily: 'var(--font-retro-pixel)',
          }}
        >
          <div>
            <span style={{ color: '#00aaff' }}>UND: </span>
            <span>{Math.round(telemetry.understoryRatio * 100)}%</span>
          </div>
          <div>
            <span style={{ color: '#00ff66' }}>MID: </span>
            <span>{Math.round(telemetry.midCanopyRatio * 100)}%</span>
          </div>
          <div>
            <span style={{ color: '#ff3333' }}>CRW: </span>
            <span>{Math.round(telemetry.emergentRatio * 100)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};
