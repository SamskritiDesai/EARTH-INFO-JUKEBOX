import React, { useState, useEffect } from 'react';
import { ParameterId, DatasetFrameInfo } from '../data/earthDataEngine';
import { Play, Pause, Radio, Mic, MicOff, Satellite, Disc3 } from 'lucide-react';

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

const FRAME_LABELS: Record<ParameterId, string> = {
  sst: 'SST / ECCO2', aerosols: 'AEROSOLS / GEOS', co2: 'CO₂ / DYAMOND', forest: 'BIOSPHERE'
};

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
        <div className="brand-title-wrap">
          <Radio className="pixel-icon-cyan pulse" size={18} />
          <h1 className="brand-title">EARTH FM</h1>
          <span className="badge-crt-green">LIVE</span>
        </div>
        <div className="brand-subtitle">EARTH INFORMATION JUKEBOX // NASA DATA TELEMETRY CONSOLE</div>
      </div>

      <div className="timeline-selector-block dataset-frame-selector">
        <div className="timeline-header-row">
          <span className="timeline-title">INDEPENDENT NASA FRAMES:</span>
          {datasetLoading && <span className="badge-warning-crimson">LOADING DATASETS…</span>}
          {!datasetLoading && !datasetError && <span className="badge-crt-green">4 DATASETS READY</span>}
          {datasetError && <span className="badge-warning-crimson" title={datasetError}>DATA LOAD ERROR</span>}
        </div>
        <div className="dataset-frame-grid">
          {params.map(param => {
            const info = frameInfo[param];
            return (
              <label className="dataset-frame-control" key={param} title={`${info.period}. ${info.label}`}>
                <span>{FRAME_LABELS[param]}</span>
                <input
                  type="range" min={0} max={info.count - 1} value={info.index}
                  disabled={datasetLoading || !!datasetError}
                  onChange={e => onFrameChange(param, Number(e.target.value))}
                  aria-label={`${FRAME_LABELS[param]} frame`}
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
          aria-label={isPlaying ? 'Pause Audio' : 'Play Audio'}>
          {isPlaying ? <Pause size={14} /> : <Play size={14} />}
          <span>{isPlaying ? 'AUDIO ON' : 'MUTED'}</span>
        </button>
        <button className={`hud-pixel-btn ${autoPlayEnabled ? 'btn-active-green' : 'btn-idle'}`}
          onClick={onToggleAutoPlay} title="Toggle Satellite Route Auto-Play Mode">
          <Satellite size={14} /><span>ROUTE AUTO-PLAY</span>
        </button>
        <button className={`hud-pixel-btn ${isScanPlaneActive ? 'btn-active-green' : 'btn-idle'}`}
          onClick={onToggleScanPlane} title="Toggle 3D Phosphor Scan Plane">
          <Disc3 size={14} /><span>3D SCAN PLANE</span>
        </button>
        <button className={`hud-pixel-btn ${narratorEnabled ? 'btn-active-amber' : 'btn-idle'}`}
          onClick={onToggleNarrator} title="Toggle Spoken Audio Narrator" aria-label="Toggle Spoken Audio Narrator">
          {narratorEnabled ? <Mic size={14} /> : <MicOff size={14} />}
          <span>NARRATOR: {narratorEnabled ? 'ON' : 'OFF'}</span>
        </button>
        <button className="hud-pixel-btn btn-load-nasa" onClick={onOpenNasaDrawer}
          title="Load Custom NASA SVS Dataset / Textures">[ LOAD NASA DATASET ]</button>
        <div className="hud-utc-badge font-vt323">{utcTime}</div>
      </div>
    </header>
  );
};
