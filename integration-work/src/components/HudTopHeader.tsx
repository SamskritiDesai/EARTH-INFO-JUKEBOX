import React, { useState, useEffect } from 'react';
import { ParameterId, DatasetFrameInfo } from '../data/earthDataEngine';
import { Play, Pause, Mic, MicOff, Satellite, Disc3 } from 'lucide-react';

interface HudTopHeaderProps {
  frameInfo: Record<ParameterId, DatasetFrameInfo>;
  onFrameChange: (param: ParameterId, index: number) => void;
  datasetLoading: boolean;
  datasetError: string | null;
  isPlaying: boolean;
  onTogglePlay: () => void;
  autoPlayEnabled: boolean;
  onToggleAutoPlay: () => void;
  isScanPlaneActive: boolean;
  onToggleScanPlane: () => void;
  narratorEnabled: boolean;
  onToggleNarrator: () => void;
  onOpenNasaDrawer: () => void;
}

// Equalizer bars that rise next to the site name (same idea as the bars around the logo globe).
// Bars in the middle reach higher than the ones at the edges.
const EQ_COUNT = 14;
const EQ_BARS = Array.from({ length: EQ_COUNT }, (_, i) => ({
  peak: 0.3 + 0.7 * Math.sin((Math.PI * (i + 0.5)) / EQ_COUNT),
  delay: (i * 0.137) % 1.1,
  duration: 0.7 + ((i * 37) % 9) / 10
}));

const FRAME_LABELS: Record<ParameterId, string> = {
  sst: 'SST / ECCO2', aerosols: 'AEROSOLS / GEOS', co2: 'CO₂ / DYAMOND', forest: 'BIOSPHERE'
};
// Short labels so each slider fits on ONE line inside the 48px header bar
const FRAME_SHORT: Record<ParameterId, string> = { sst: 'SST', aerosols: 'AERO', co2: 'CO₂', forest: 'BIO' };

export const HudTopHeader: React.FC<HudTopHeaderProps> = ({
  frameInfo, onFrameChange, datasetLoading, datasetError,
  isPlaying, onTogglePlay, autoPlayEnabled, onToggleAutoPlay,
  isScanPlaneActive, onToggleScanPlane, narratorEnabled, onToggleNarrator, onOpenNasaDrawer
}) => {
  const [utcTime, setUtcTime] = useState('');
  useEffect(() => {
    const updateTime = () => setUtcTime(new Date().toISOString().substring(11, 19) + ' UTC');
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const params: ParameterId[] = ['sst', 'aerosols', 'co2', 'forest'];
  return (
    <header className="hud-top-header pixel-panel-blue" role="banner">
      <div className="header-brand-block">
        <img className="brand-mark" src={`${import.meta.env.BASE_URL}earth-fm-mark.png`} alt="" aria-hidden="true" draggable={false} />
        <div className="brand-text">
          <div className="brand-title-wrap">
            <h1 className="brand-title">EARTH FM</h1>
            <span className="eq-bars" aria-hidden="true">
              {EQ_BARS.map((b, i) => (
                <span
                  key={i}
                  style={{ '--peak': b.peak, animationDelay: `${b.delay}s`, animationDuration: `${b.duration}s` } as React.CSSProperties}
                />
              ))}
            </span>
            <span className="badge-crt-green">LIVE</span>
          </div>
          <div className="brand-subtitle">EARTH INFORMATION JUKEBOX // NASA DATA TELEMETRY CONSOLE</div>
        </div>
      </div>

      <div className="timeline-selector-block dataset-frame-selector">
        {/* Status badge only shows while loading / on error (overlaid, takes no height) */}
        {(datasetLoading || datasetError) && (
          <div className="timeline-header-row dataset-status-overlay">
            {datasetLoading && <span className="badge-warning-crimson">LOADING DATASETS…</span>}
            {datasetError && <span className="badge-warning-crimson" title={datasetError}>DATA LOAD ERROR</span>}
          </div>
        )}
        <div className="dataset-frame-grid">
          {params.map(param => {
            const info = frameInfo[param];
            return (
              <label className="dataset-frame-control" key={param} title={`${FRAME_LABELS[param]} — ${info.period}. ${info.label}`}>
                <span>{FRAME_SHORT[param]}</span>
                <input
                  type="range" min={0} max={info.count - 1} value={info.index}
                  disabled={datasetLoading || !!datasetError}
                  onChange={e => onFrameChange(param, Number(e.target.value))}
                  aria-label={`${FRAME_LABELS[param]} date`}
                  aria-valuetext={info.label}
                />
                <strong>{info.label}</strong>
              </label>
            );
          })}
        </div>
      </div>

      <div className="header-actions-block">
        <button className={`hud-pixel-btn ${isPlaying ? 'btn-active-cyan' : 'btn-alert-crimson'}`}
          onClick={onTogglePlay} title="Play / Pause Audio Synthesis (Spacebar)"
          aria-label={isPlaying ? 'Pause audio' : 'Play audio'}>
          {isPlaying ? <Pause size={14} /> : <Play size={14} />}
          <span>{isPlaying ? 'AUDIO ON' : 'MUTED'}</span>
        </button>
        <button className={`hud-pixel-btn ${autoPlayEnabled ? 'btn-active-green' : 'btn-idle'}`}
          onClick={onToggleAutoPlay} title="Toggle Satellite Route Auto-Play Mode (R)"
          aria-label="Route auto-play" aria-pressed={autoPlayEnabled}>
          <Satellite size={14} /><span>ROUTE AUTO-PLAY</span>
        </button>
        <button className={`hud-pixel-btn ${isScanPlaneActive ? 'btn-active-green' : 'btn-idle'}`}
          onClick={onToggleScanPlane} title="3D scan: the globe becomes a bar grid of the active NASA layers, with a scanning band"
          aria-label="Scan grid" aria-pressed={isScanPlaneActive}>
          <Disc3 size={14} /><span>3D SCAN</span>
        </button>
        <button className={`hud-pixel-btn ${narratorEnabled ? 'btn-active-amber' : 'btn-idle'}`}
          onClick={onToggleNarrator} title="Toggle Spoken Audio Narrator (N)" aria-label="Narrator" aria-pressed={narratorEnabled}>
          {narratorEnabled ? <Mic size={14} /> : <MicOff size={14} />}
          <span>NARRATOR: {narratorEnabled ? 'ON' : 'OFF'}</span>
        </button>
        <button className="hud-pixel-btn btn-load-nasa" onClick={onOpenNasaDrawer}
          title="Load Custom NASA SVS Dataset / Textures" aria-label="Load NASA dataset">[ LOAD NASA DATASET ]</button>
        <div className="hud-utc-badge font-vt323" aria-hidden="true">{utcTime}</div>
      </div>
    </header>
  );
};
