import React, { useState, useEffect } from 'react';
import { TimelineEpoch, TIMELINES } from '../data/earthDataEngine';
import { Volume2, VolumeX, Play, Pause, Radio, Mic, MicOff, Satellite, Disc3, ShieldAlert } from 'lucide-react';

interface HudTopHeaderProps {
  timeline: TimelineEpoch;
  onTimelineChange: (t: TimelineEpoch) => void;
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

export const HudTopHeader: React.FC<HudTopHeaderProps> = ({
  timeline,
  onTimelineChange,
  isPlaying,
  onTogglePlay,
  autoPlayEnabled,
  onToggleAutoPlay,
  isScanPlaneActive,
  onToggleScanPlane,
  narratorEnabled,
  onToggleNarrator,
  onOpenNasaDrawer
}) => {
  const [utcTime, setUtcTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      setUtcTime(d.toISOString().substring(11, 19) + ' UTC');
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const currentInfo = TIMELINES[timeline];
  const unavailableCount = Object.values(currentInfo.availableParams).filter(v => !v).length;

  return (
    <header className="hud-top-header pixel-panel-blue" role="banner">
      {/* Brand & 16-Bit Title */}
      <div className="header-brand-block">
        <div className="brand-title-wrap">
          <Radio className="pixel-icon-cyan pulse" size={18} />
          <h1 className="brand-title">EARTH FM</h1>
          <span className="badge-crt-green">LIVE</span>
        </div>
        <div className="brand-subtitle">
          EARTH INFORMATION JUKEBOX // 16-BIT CYBERNETIC HUD TELEMETRY CONSOLE
        </div>
      </div>

      {/* Timeline / Epoch Selector */}
      <div className="timeline-selector-block">
        <div className="timeline-header-row">
          <span className="timeline-title">MISSION EPOCH:</span>
          {unavailableCount > 0 && (
            <span className="badge-warning-crimson" title="Some parameters unavailable in this epoch">
              <ShieldAlert size={12} style={{ display: 'inline', marginRight: 4 }} />
              {unavailableCount} PARAMETER OFFLINE
            </span>
          )}
        </div>
        <div className="timeline-pills-row" role="tablist" aria-label="Dataset Timeline Epochs">
          {(Object.keys(TIMELINES) as TimelineEpoch[]).map((epochKey) => {
            const info = TIMELINES[epochKey];
            const isSelected = timeline === epochKey;
            return (
              <button
                key={epochKey}
                role="tab"
                aria-selected={isSelected}
                className={`timeline-pill-btn ${isSelected ? 'active' : ''}`}
                onClick={() => onTimelineChange(epochKey)}
                title={`${info.season} - ${info.notes}`}
              >
                {epochKey}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Mode Controllers & Accessibility Buttons */}
      <div className="header-actions-block">
        {/* Play / Pause Ambient Jukebox */}
        <button
          className={`hud-pixel-btn ${isPlaying ? 'btn-active-cyan' : 'btn-alert-crimson'}`}
          onClick={onTogglePlay}
          title="Play / Pause Audio Synthesis (Spacebar)"
          aria-label={isPlaying ? 'Pause Audio' : 'Play Audio'}
        >
          {isPlaying ? <Pause size={14} /> : <Play size={14} />}
          <span>{isPlaying ? 'AUDIO ON' : 'MUTED'}</span>
        </button>

        {/* Auto-Play Satellite Route Mode */}
        <button
          className={`hud-pixel-btn ${autoPlayEnabled ? 'btn-active-green' : 'btn-idle'}`}
          onClick={onToggleAutoPlay}
          title="Toggle Satellite Route Auto-Play Mode"
        >
          <Satellite size={14} />
          <span>ROUTE AUTO-PLAY</span>
        </button>

        {/* 3D Scan Plane */}
        <button
          className={`hud-pixel-btn ${isScanPlaneActive ? 'btn-active-green' : 'btn-idle'}`}
          onClick={onToggleScanPlane}
          title="Toggle 3D Phosphor Scan Plane"
        >
          <Disc3 size={14} />
          <span>3D SCAN PLANE</span>
        </button>

        {/* Accessibility: Spoken Audio Narrator */}
        <button
          className={`hud-pixel-btn ${narratorEnabled ? 'btn-active-amber' : 'btn-idle'}`}
          onClick={onToggleNarrator}
          title="Toggle Spoken Speech Synthesizer for Location & Sonics"
          aria-label="Toggle Spoken Audio Narrator"
        >
          {narratorEnabled ? <Mic size={14} /> : <MicOff size={14} />}
          <span>NARRATOR: {narratorEnabled ? 'ON' : 'OFF'}</span>
        </button>

        {/* NASA Custom Loader */}
        <button
          className="hud-pixel-btn btn-load-nasa"
          onClick={onOpenNasaDrawer}
          title="Load Custom NASA SVS Dataset / Textures"
        >
          [ LOAD NASA DATASET ]
        </button>

        {/* UTC Clock */}
        <div className="hud-utc-badge font-vt323">{utcTime}</div>
      </div>
    </header>
  );
};
