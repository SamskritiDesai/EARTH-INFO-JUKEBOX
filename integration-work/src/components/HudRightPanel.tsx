import React, { useState, useEffect, useRef } from 'react';
import { ParameterId, SampledEarthTelemetry, PARAMETERS } from '../data/earthDataEngine';
import { Landmark, LANDMARKS, SatelliteRoutePreset, DEFAULT_ROUTE_PRESETS } from '../data/worldBoundaries';
import { synthEngine } from '../audio/ThemedChordEngine';
import { Compass, Volume2, BookmarkPlus, Navigation, Radio, Terminal } from 'lucide-react';

interface HudRightPanelProps {
  telemetry: SampledEarthTelemetry;
  scanAngle: number;
  autoPlayEnabled: boolean;
  selectedSource: Landmark;
  selectedDest: Landmark;
  onSelectSource: (lm: Landmark) => void;
  onSelectDest: (lm: Landmark) => void;
  routeBpm: number;
  onBpmChange: (bpm: number) => void;
  onApplyPreset: (preset: SatelliteRoutePreset) => void;
  savedPresets: SatelliteRoutePreset[];
  onSaveCurrentRoute: () => void;
  narratorActive: boolean;
}

export const HudRightPanel: React.FC<HudRightPanelProps> = ({
  telemetry,
  scanAngle,
  autoPlayEnabled,
  selectedSource,
  selectedDest,
  onSelectSource,
  onSelectDest,
  routeBpm,
  onBpmChange,
  onApplyPreset,
  savedPresets,
  onSaveCurrentRoute,
  narratorActive
}) => {
  // Peak VU level states
  const [vuLevels, setVuLevels] = useState({ left: 45, right: 50, peakLeft: 60, peakRight: 65 });
  const freqDataRef = useRef(new Uint8Array(128));

  // 60fps VU Meter animation
  useEffect(() => {
    let animId: number;
    const updateVu = () => {
      animId = requestAnimationFrame(updateVu);
      synthEngine.getAudioFrequencyData(freqDataRef.current);

      let sumL = 0;
      let sumR = 0;
      for (let i = 0; i < 32; i++) {
        sumL += freqDataRef.current[i];
        sumR += freqDataRef.current[i + 32];
      }
      const l = Math.min(100, Math.floor((sumL / 32 / 255) * 120));
      const r = Math.min(100, Math.floor((sumR / 32 / 255) * 120));

      setVuLevels(prev => ({
        left: l,
        right: r,
        peakLeft: Math.max(l, prev.peakLeft - 1.2),
        peakRight: Math.max(r, prev.peakRight - 1.2)
      }));
    };
    updateVu();
    return () => cancelAnimationFrame(animId);
  }, []);

  // Format Scan Angle as 3-digit padded number: e.g. "045°"
  const scanAngleStr = `${Math.floor(scanAngle % 360).toString().padStart(3, '0')}°`;

  // Build Dynamic Live Sonic Transcript
  const activeNotes = synthEngine.getActiveNotes();
  const availableParamsPlaying: string[] = [];
  const unavailableParams: string[] = [];

  const paramKeys: ParameterId[] = ['sst', 'aerosols', 'co2', 'forest'];
  paramKeys.forEach((p) => {
    if (telemetry[p].available) {
      availableParamsPlaying.push(PARAMETERS[p].shortLabel);
    } else {
      unavailableParams.push(PARAMETERS[p].shortLabel);
    }
  });

  return (
    <aside className="hud-right-panel" aria-label="Route Navigation & Telemetry Monitor">
      {/* 1. Top-Right: Master Tempo / Scan Angle & Dual Vertical Equalizer VU Meters */}
      <div className="telemetry-box pixel-panel-blue">
        <div className="telemetry-box-title">
          <Compass size={14} className="icon-cyan" />
          <span>SCAN AZIMUTH & OUTPUT LEVEL</span>
        </div>

        <div className="azimuth-and-vu-row">
          {/* Digital Azimuth / Tempo Display */}
          <div className="digital-counter-block font-vt323">
            <div className="counter-row">
              <span className="counter-label">ORBIT ANGLE:</span>
              <span className="counter-digit val-white">{scanAngleStr}</span>
            </div>
            <div className="counter-row">
              <span className="counter-label">PLAY TEMPO:</span>
              <span className="counter-digit val-cyan">{routeBpm} BPM</span>
            </div>
            <div className="counter-row">
              <span className="counter-label">CHORD KEY:</span>
              <span className="counter-digit val-green">C-PENT / F-LYD</span>
            </div>
          </div>

          {/* Dual Vertical Pixel VU Meters */}
          <div className="dual-vu-container">
            {/* Left Channel */}
            <div className="vu-meter-column">
              <div className="vu-meter-track">
                <div
                  className="vu-meter-bar-left"
                  style={{ height: `${vuLevels.left}%` }}
                />
                <div
                  className="vu-peak-indicator"
                  style={{ bottom: `${vuLevels.peakLeft}%` }}
                />
              </div>
              <span className="vu-label font-vt323">L</span>
            </div>

            {/* Right Channel */}
            <div className="vu-meter-column">
              <div className="vu-meter-track">
                <div
                  className="vu-meter-bar-right"
                  style={{ height: `${vuLevels.right}%` }}
                />
                <div
                  className="vu-peak-indicator"
                  style={{ bottom: `${vuLevels.peakRight}%` }}
                />
              </div>
              <span className="vu-label font-vt323">R</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Route-Based Satellite Auto-Play System & Presets */}
      <div className="telemetry-box pixel-panel-blue">
        <div className="telemetry-box-title">
          <Navigation size={14} className="icon-cyan" />
          <span>SATELLITE SIGNAL ROUTE (AUTO-PLAY)</span>
        </div>

        <div className="route-selection-controls">
          {/* Source Dropdown */}
          <div className="dropdown-control-group">
            <label className="dropdown-label font-vt323">ORIGIN (SOURCE):</label>
            <select
              className="hud-pixel-select"
              value={selectedSource.id}
              onChange={(e) => {
                const found = LANDMARKS.find(l => l.id === e.target.value);
                if (found) onSelectSource(found);
              }}
              aria-label="Route Origin"
            >
              {LANDMARKS.map(lm => (
                <option key={lm.id} value={lm.id}>
                  {lm.name} ({lm.region})
                </option>
              ))}
            </select>
          </div>

          {/* Destination Dropdown */}
          <div className="dropdown-control-group">
            <label className="dropdown-label font-vt323">DESTINATION:</label>
            <select
              className="hud-pixel-select"
              value={selectedDest.id}
              onChange={(e) => {
                const found = LANDMARKS.find(l => l.id === e.target.value);
                if (found) onSelectDest(found);
              }}
              aria-label="Route Destination"
            >
              {LANDMARKS.map(lm => (
                <option key={lm.id} value={lm.id}>
                  {lm.name} ({lm.region})
                </option>
              ))}
            </select>
          </div>

          {/* Tempo / Route Speed Slider */}
          <div className="tempo-slider-group">
            <div className="tempo-slider-header font-vt323">
              <span>ROUTE TRANSIT SPEED:</span>
              <span className="val-cyan">{routeBpm} BPM</span>
            </div>
            <input
              type="range"
              min="65"
              max="95"
              step="1"
              value={routeBpm}
              onChange={(e) => onBpmChange(Number(e.target.value))}
              className="hud-pixel-range"
              aria-label="Route Transit Speed Slider"
            />
          </div>

          {/* Save Route Button */}
          <button
            className="hud-pixel-btn btn-save-route"
            onClick={onSaveCurrentRoute}
            title="Save this Source -> Destination route to your Presets"
          >
            <BookmarkPlus size={13} style={{ display: 'inline', marginRight: 4 }} />
            [ + SAVE ROUTE AS PRESET ]
          </button>
        </div>

        {/* Featured Tracks & Presets Bar */}
        <div className="presets-bar-section">
          <div className="presets-header-title font-vt323">FEATURED SATELLITE TRACKS:</div>
          <div className="presets-pills-wrap">
            {DEFAULT_ROUTE_PRESETS.map(preset => (
              <button
                key={preset.id}
                className="preset-track-pill"
                onClick={() => onApplyPreset(preset)}
                title={`${preset.subtitle}: ${preset.description}`}
              >
                {preset.title}
              </button>
            ))}
            {savedPresets.map(preset => (
              <button
                key={preset.id}
                className="preset-track-pill saved"
                onClick={() => onApplyPreset(preset)}
                title={`User Saved Route: ${preset.subtitle}`}
              >
                ★ {preset.title}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Docked Live Sonic Transcript Panel */}
      <div className="telemetry-box pixel-panel-blue sonic-transcript-box" aria-live="polite">
        <div className="telemetry-box-title">
          <Terminal size={14} className="icon-cyan" />
          <span>[ SONIC TRANSCRIPT ]</span>
          {narratorActive && <span className="badge-crt-amber font-vt323">SPEAKING</span>}
        </div>

        <div className="transcript-content font-vt323">
          <div className="transcript-line">
            <span className="transcript-tag cyan">&gt; CURRENT PROBE:</span> {telemetry.nearestRegion}
          </div>
          <div className="transcript-line">
            <span className="transcript-tag white">&gt; CHORDS PLAYING:</span>{' '}
            {activeNotes.length > 0
              ? activeNotes.map(n => `${n.note} (${Math.round(n.freq)}Hz)`).join(' + ')
              : 'Warm Ambient Base Tones (C Major Pentatonic)'}
          </div>
          <div className="transcript-line">
            <span className="transcript-tag green">&gt; ACTIVE VOICES:</span>{' '}
            {availableParamsPlaying.join(', ')}
          </div>
          {unavailableParams.length > 0 && (
            <div className="transcript-line">
              <span className="transcript-tag crimson">&gt; MUTED OFFLINE:</span>{' '}
              {unavailableParams.map(p => `${p} [DATA NOT AVAILABLE]`).join(', ')}
            </div>
          )}
          <div className="transcript-status-footer">
            SIGNAL: OPTIMAL // SMOOTHING: 0.35s // ENVELOPE: 1.2s SWELL
          </div>
        </div>
      </div>
    </aside>
  );
};