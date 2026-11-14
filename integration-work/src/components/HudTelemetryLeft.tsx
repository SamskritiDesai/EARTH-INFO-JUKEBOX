import React, { useEffect, useRef, useState } from 'react';
import { ParameterId, SampledEarthTelemetry, PARAMETERS } from '../data/earthDataEngine';
import { synthEngine } from '../audio/ThemedChordEngine';
import { Activity, Sparkles } from 'lucide-react';

interface HudTelemetryLeftProps {
  telemetry: SampledEarthTelemetry;
  activeParams: Record<ParameterId, boolean>;
  onToggleParam: (id: ParameterId) => void;
  onHoverParam?: (id: ParameterId | null, event?: React.MouseEvent) => void;
}

export const HudTelemetryLeft: React.FC<HudTelemetryLeftProps> = ({
  telemetry,
  activeParams,
  onToggleParam,
  onHoverParam
}) => {
  // Smoothed telemetry state using exponential lerp for calm, zero-flutter readouts
  const [smoothed, setSmoothed] = useState({
    sst: telemetry.sst.tempC,
    strength: telemetry.aerosols.strength,
    co2: telemetry.co2.ppm,
    forest: telemetry.forest.normalized
  });

  const canvasGraphRef = useRef<HTMLCanvasElement>(null);
  const canvasHeatmapRef = useRef<HTMLCanvasElement>(null);
  const historyRef = useRef<number[]>(Array(50).fill(0.3));

  // Lerp smoothing loop (runs at 60fps)
  useEffect(() => {
    let animId: number;
    const lerpFactor = 0.08; // Heavy calming low-pass interpolation

    const updateSmoothing = () => {
      animId = requestAnimationFrame(updateSmoothing);
      setSmoothed(prev => ({
        sst: prev.sst + (telemetry.sst.tempC - prev.sst) * lerpFactor,
        strength: prev.strength + (telemetry.aerosols.strength - prev.strength) * lerpFactor,
        co2: prev.co2 + (telemetry.co2.ppm - prev.co2) * lerpFactor,
        forest: prev.forest + (telemetry.forest.normalized - prev.forest) * lerpFactor
      }));
    };
    updateSmoothing();
    return () => cancelAnimationFrame(animId);
  }, [telemetry]);

  // Telemetry Graph Canvas & Rainbow Heatmap Canvas
  useEffect(() => {
    let animId: number;
    const freqData = new Uint8Array(256);

    const renderVisualizers = () => {
      animId = requestAnimationFrame(renderVisualizers);

      // 1. Telemetry Multi-Line Graph
      const gCanvas = canvasGraphRef.current;
      if (gCanvas) {
        const ctx = gCanvas.getContext('2d');
        if (ctx) {
          const w = gCanvas.width;
          const h = gCanvas.height;
          ctx.clearRect(0, 0, w, h);

          // Grid lines
          ctx.strokeStyle = '#002255';
          ctx.lineWidth = 1;
          for (let y = 10; y < h; y += 15) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
          }

          // Push latest combined normalized energy
          const latestEnergy =
            (telemetry.sst.normalized +
              telemetry.aerosols.normalized +
              telemetry.co2.normalized +
              telemetry.forest.normalized) /
            4;
          historyRef.current.shift();
          historyRef.current.push(latestEnergy);

          // Draw blue telemetry line
          ctx.beginPath();
          ctx.strokeStyle = '#00f0ff';
          ctx.lineWidth = 2;
          historyRef.current.forEach((val, i) => {
            const x = (i / (historyRef.current.length - 1)) * w;
            const y = h - val * (h - 10) - 5;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          });
          ctx.stroke();

          // Green fill glow
          ctx.lineTo(w, h);
          ctx.lineTo(0, h);
          ctx.fillStyle = 'rgba(0, 240, 255, 0.08)';
          ctx.fill();
        }
      }

      // 2. Scrolling Rainbow Spectral Heatmap
      const hCanvas = canvasHeatmapRef.current;
      if (hCanvas) {
        const ctx = hCanvas.getContext('2d');
        if (ctx) {
          synthEngine.getAudioFrequencyData(freqData);
          const w = hCanvas.width;
          const h = hCanvas.height;

          // Scroll previous pixels left by 2px
          ctx.drawImage(hCanvas, -2, 0);

          // Draw new vertical strip on rightmost 2 columns
          const colX = w - 2;
          const bins = 24;
          const binHeight = h / bins;

          for (let b = 0; b < bins; b++) {
            const val = freqData[b * 6] / 255; // 0..1
            // Rainbow thermal map: Blue -> Cyan -> Green -> Yellow -> Red
            let r = 0, g = 0, bl = 0;
            if (val < 0.25) {
              bl = Math.floor(val * 4 * 255);
            } else if (val < 0.5) {
              const t = (val - 0.25) * 4;
              g = Math.floor(t * 220);
              bl = 255;
            } else if (val < 0.75) {
              const t = (val - 0.5) * 4;
              r = Math.floor(t * 255);
              g = 255;
              bl = Math.floor((1 - t) * 255);
            } else {
              const t = (val - 0.75) * 4;
              r = 255;
              g = Math.floor((1 - t) * 220);
              bl = 0;
            }

            ctx.fillStyle = `rgb(${r}, ${g}, ${bl})`;
            ctx.fillRect(colX, h - (b + 1) * binHeight, 2, binHeight);
          }
        }
      }
    };

    renderVisualizers();
    return () => cancelAnimationFrame(animId);
  }, [telemetry]);

  // Format Lat / Lon
  const latStr = `${Math.abs(telemetry.lat).toFixed(2)}┬░ ${telemetry.lat >= 0 ? 'N' : 'S'}`;
  const lonStr = `${Math.abs(telemetry.lon).toFixed(2)}┬░ ${telemetry.lon >= 0 ? 'E' : 'W'}`;

  // Param List
  const params: ParameterId[] = ['sst', 'aerosols', 'co2', 'forest'];

  return (
    <aside className="hud-telemetry-left" aria-label="Earth Telemetry and Layer Controls">
      {/* 1. Top Section: Concentric Donut Gauges & Telemetry Plot */}
      <div className="telemetry-box pixel-panel-blue">
        <div className="telemetry-box-title">
          <Activity size={14} className="icon-cyan" />
          <span>HARMONIC RATIO & ENERGY</span>
        </div>

        <div className="donut-and-graph-row">
          {/* Concentric Donut Gauge SVG */}
          <div className="donut-gauge-container">
            <svg viewBox="0 0 100 100" className="pixel-donut-svg">
              {/* Outer Ring: Thermal Energy */}
              <circle cx="50" cy="50" r="40" stroke="#003366" strokeWidth="6" fill="none" />
              <circle
                cx="50"
                cy="50"
                r="40"
                stroke="#00ffff"
                strokeWidth="6"
                strokeDasharray="251.2"
                strokeDashoffset={251.2 * (1 - telemetry.sst.normalized)}
                strokeLinecap="square"
                fill="none"
              />
              {/* Middle Ring: Aerosol Density */}
              <circle cx="50" cy="50" r="30" stroke="#443300" strokeWidth="6" fill="none" />
              <circle
                cx="50"
                cy="50"
                r="30"
                stroke="#ffaa00"
                strokeWidth="6"
                strokeDasharray="188.4"
                strokeDashoffset={188.4 * (1 - telemetry.aerosols.normalized)}
                strokeLinecap="square"
                fill="none"
              />
              {/* Inner Ring: Canopy / Biomass */}
              <circle cx="50" cy="50" r="20" stroke="#004411" strokeWidth="6" fill="none" />
              <circle
                cx="50"
                cy="50"
                r="20"
                stroke="#00dd55"
                strokeWidth="6"
                strokeDasharray="125.6"
                strokeDashoffset={125.6 * (1 - telemetry.forest.normalized)}
                strokeLinecap="square"
                fill="none"
              />
              <text x="50" y="53" textAnchor="middle" fill="#ffffff" fontSize="10" fontFamily="VT323">
                {Math.round((telemetry.sst.normalized + telemetry.forest.normalized) * 50)}%
              </text>
            </svg>
          </div>

          {/* Real-Time Scrolling Telemetry Waveform */}
          <div className="graph-container">
            <canvas ref={canvasGraphRef} width={130} height={75} className="telemetry-graph-canvas" />
          </div>
        </div>
      </div>

      {/* 2. Mid Section: High-Contrast Monospace Scientific Telemetry */}
      <div className="telemetry-box pixel-panel-blue">
        <div className="telemetry-box-title">
          <span>SURFACE COORD & READINGS</span>
          <span className="badge-cyan font-vt323">{telemetry.isWater ? 'OCEAN' : 'LAND'}</span>
        </div>

        <div className="telemetry-readout-rows font-vt323">
          <div className="telemetry-line">
            <span className="label">COORDINATES:</span>
            <span className="val-white">{latStr} / {lonStr}</span>
          </div>
          <div className="telemetry-line">
            <span className="label">TERRITORY:</span>
            <span className="val-cyan" title={telemetry.nearestRegion}>
              {telemetry.nearestRegion.length > 20
                ? telemetry.nearestRegion.substring(0, 19) + 'ΓÇª'
                : telemetry.nearestRegion}
            </span>
          </div>

          <div className="telemetry-divider" />

          {/* SST */}
          <div className="telemetry-line">
            <span className="label">1. SEA-SURFACE TEMP:</span>
            {telemetry.sst.available ? (
              <span className="val-cyan">{smoothed.sst.toFixed(1)} °C</span>
            ) : (
              <span className="val-crimson">[UNAVAILABLE]</span>
            )}
          </div>

          {/* Aerosols */}
          <div className="telemetry-line">
            <span className="label">2. AEROSOL STRENGTH:</span>
            {telemetry.aerosols.available ? (
              <span className="val-amber">{(smoothed.strength * 100).toFixed(0)}% REL.</span>
            ) : (
              <span className="val-crimson">[UNAVAILABLE]</span>
            )}
          </div>

          {/* CO2 */}
          <div className="telemetry-line">
            <span className="label">3. DYAMOND CO₂:</span>
            {telemetry.co2.available ? (
              <span className="val-magenta">{smoothed.co2.toFixed(1)} ppm</span>
            ) : (
              <span className="val-crimson">[UNAVAILABLE]</span>
            )}
          </div>

          {/* GEDI Forest */}
          <div className="telemetry-line">
            <span className="label">{telemetry.isWater ? '4. OCEAN CHLOROPHYLL:' : '4. BIOSPHERE GREENNESS:'}</span>
            {telemetry.forest.available ? (
              <span className="val-green">{(smoothed.forest * 100).toFixed(0)}% REL.</span>
            ) : (
              <span className="val-crimson">[UNAVAILABLE]</span>
            )}
          </div>
        </div>
      </div>

      {/* 3. Parameter Active Layer Toggles */}
      <div className="telemetry-box pixel-panel-blue">
        <div className="telemetry-box-title">
          <span>DATASET LAYERS (COMBINE)</span>
        </div>

        <div className="param-layer-toggles-grid">
          {params.map((pid) => {
            const meta = PARAMETERS[pid];
            const isToggled = activeParams[pid];
            const isAvail = telemetry[pid].available;

            return (
              <div
                key={pid}
                className={`param-toggle-card ${isToggled ? 'toggled' : 'untoggled'} ${!isAvail ? 'offline' : ''}`}
                onClick={() => onToggleParam(pid)}
                onMouseEnter={(e) => onHoverParam?.(pid, e)}
                onMouseLeave={() => onHoverParam?.(null)}
              >
                <div className="card-top-row">
                  <span className="card-param-name">{meta.shortLabel}</span>
                  {!isAvail ? (
                    <span className="badge-offline-red">OFFLINE</span>
                  ) : (
                    <span className={`pill-status ${isToggled ? 'on' : 'off'}`}>
                      {isToggled ? 'ACTIVE' : 'MUTED'}
                    </span>
                  )}
                </div>
                <div className="card-voice-tag font-vt323">
                  {isAvail ? meta.voiceStyle.split(' ')[0] + ' Voice' : '[DATA NOT AVAILABLE]'}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Bottom-Left: Live Scrolling Rainbow Spectral Heatmap */}
      <div className="telemetry-box pixel-panel-blue">
        <div className="telemetry-box-title">
          <Sparkles size={12} className="icon-cyan" />
          <span>RAINBOW SPECTRAL TERRAIN</span>
        </div>
        <div className="spectral-heatmap-container">
          <canvas ref={canvasHeatmapRef} width={220} height={55} className="spectral-canvas" />
        </div>
      </div>
    </aside>
  );
};
