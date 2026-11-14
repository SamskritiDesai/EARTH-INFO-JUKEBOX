// BottomStrataDJMixer.tsx
// 5-Channel Themed Polyphonic DJ Mixer in Harmonic Lock with ARIA Slider Semantics,
// Curated 4-Preset Track Selector Strip, and Master Crossfader [ RUSTY FOREST <====|====> FLOWY AIR/OCEAN ]

import React, { useEffect, useRef, useState } from 'react';
import { CanopyColumnData, DatasetMode, DJMixerState, HoverTooltipInfo, PlaybackMode } from '../types/forest';
import { globalSynthEngine } from '../audio/ForestSynthEngine';
import { globalForestLoader } from '../data/UniversalForestLoader';
import { JukeboxTrack, TrackSelectorStrip } from './TrackSelectorStrip';

interface BottomStrataDJMixerProps {
  telemetry: CanopyColumnData;
  datasetMode: DatasetMode;
  playbackMode: PlaybackMode;
  activeTrackId: string | null;
  onSetDatasetMode: (mode: DatasetMode) => void;
  onSetPlaybackMode: (mode: PlaybackMode) => void;
  onSelectTrack: (track: JukeboxTrack) => void;
  onSetHoverTooltip: (info: HoverTooltipInfo | null) => void;
  onSpeakNotice?: (text: string) => void;
}

export const BottomStrataDJMixer: React.FC<BottomStrataDJMixerProps> = ({
  telemetry,
  datasetMode,
  playbackMode,
  activeTrackId,
  onSetDatasetMode,
  onSetPlaybackMode,
  onSelectTrack,
  onSetHoverTooltip,
  onSpeakNotice,
}) => {
  const [mixerState, setMixerState] = useState<DJMixerState>(globalSynthEngine.getMixerState());
  const [currentStep, setCurrentStep] = useState(0);
  const [uploadFeedback, setUploadFeedback] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const oscCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    globalSynthEngine.onStateChange((state) => setMixerState(state));
    globalSynthEngine.onStep((step) => setCurrentStep(step));
  }, []);

  // Oscilloscope Animation Frame Loop
  useEffect(() => {
    const canvas = oscCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const waveBuffer = new Uint8Array(128);

    const renderScope = () => {
      globalSynthEngine.getWaveformData(waveBuffer);

      const w = canvas.width;
      const h = canvas.height;
      ctx.fillStyle = '#00081c';
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = '#002255';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, h / 2);
      ctx.lineTo(w, h / 2);
      ctx.stroke();

      ctx.strokeStyle = '#00ff88';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#00ff88';
      ctx.shadowBlur = 4;

      ctx.beginPath();
      const sliceWidth = w / waveBuffer.length;
      let x = 0;

      for (let i = 0; i < waveBuffer.length; i++) {
        const v = waveBuffer[i] / 128.0;
        const y = (v * h) / 2;

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);

        x += sliceWidth;
      }

      ctx.stroke();
      ctx.shadowBlur = 0;

      animId = requestAnimationFrame(renderScope);
    };

    renderScope();
    return () => cancelAnimationFrame(animId);
  }, []);

  const handleBootAudio = async () => {
    const success = await globalSynthEngine.initialize();
    if (success) {
      setMixerState(globalSynthEngine.getMixerState());
      if (onSpeakNotice) onSpeakNotice('Bio-Acoustic Synthesizer Initialized and Online at 112 Beats Per Minute.');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadFeedback(`UPLOADING ${file.name}...`);
    const res = await globalForestLoader.loadFromFile(file);
    setUploadFeedback(res.message);
    onSetDatasetMode(globalForestLoader.getMode());

    setTimeout(() => {
      setUploadFeedback(null);
    }, 4500);
  };

  return (
    <div className="hud-bottom-dock" style={{ height: '228px' }}>
      {/* 4-PRESET CURATED JUKEBOX TRACK STRIP */}
      <TrackSelectorStrip
        activeTrackId={activeTrackId}
        onSelectTrack={onSelectTrack}
        onSpeakNotice={onSpeakNotice}
      />

      {/* Top Console Bar */}
      <div className="bottom-dock-top-row">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Audio Boot Button */}
          {!mixerState.isAudioInitialized ? (
            <button
              className="pixel-btn pixel-btn-crimson blink-fast"
              style={{ fontSize: '8px', padding: '4px 10px' }}
              onClick={handleBootAudio}
              onMouseEnter={() =>
                onSetHoverTooltip({
                  visible: true,
                  x: 0,
                  y: 0,
                  title: 'AUDIO HARDWARE INITIALIZER',
                  parameterName: 'Web Audio Synth Engine',
                  gediMetric: 'AUDIO BUS',
                  currentValue: 'OFFLINE',
                  units: '44.1kHz',
                  percentageValue: 0,
                  barColor: '#ff2222',
                  scientificDescription: 'Initializes the browser Web Audio graph and audio destination node.',
                  soundDescription: 'Boots all 5 polyphonic chord generators: tape-warbled keys, pads, chimes, electric pianos, and sub bass.',
                })
              }
              onMouseLeave={() => onSetHoverTooltip(null)}
              aria-label="Initialize Bio-Acoustic Synthesizer Engine"
            >
              [ INITIALIZE BIO-ACOUSTIC ENGINE ]
            </button>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '8px', height: '8px', background: '#00ff66', boxShadow: '0 0 6px #00ff66' }} />
              <span style={{ fontSize: '8px', color: '#00ff66', fontFamily: 'var(--font-retro-pixel)' }}>
                SYNTH ONLINE // {mixerState.bpm} BPM
              </span>
              <button
                className="pixel-btn"
                style={{ fontSize: '7px', padding: '2px 6px' }}
                onClick={() => globalSynthEngine.togglePlayPause()}
                aria-label={mixerState.isPlaying ? 'Pause Audio Clock' : 'Play Audio Clock'}
              >
                {mixerState.isPlaying ? 'PAUSE' : 'PLAY'}
              </button>
            </div>
          )}

          {/* TWO PLAYBACK MODES TOGGLE: [ MANUAL POINTER ] vs [ AUTO-PLAY WHOLE GLOBE ] */}
          <div className="mode-toggle-group">
            <button
              className={`mode-toggle-btn ${playbackMode === 'MANUAL_POINTER' ? 'active' : ''}`}
              onClick={() => {
                onSetPlaybackMode('MANUAL_POINTER');
                globalSynthEngine.setPlaybackMode('MANUAL_POINTER');
              }}
              onMouseEnter={() =>
                onSetHoverTooltip({
                  visible: true,
                  x: 0,
                  y: 0,
                  title: 'PLAYBACK MODE',
                  parameterName: 'Manual Pointer Mode',
                  gediMetric: 'POINT PROBE',
                  currentValue: 'MANUAL',
                  units: 'INTERACTIVE',
                  percentageValue: 50,
                  barColor: '#00ccff',
                  scientificDescription: 'Target reticle pointer mode for precise local point and regional ecosystem probing.',
                  soundDescription: 'Click or drag across the globe to play the chords for that specific geographic coordinate.',
                })
              }
              onMouseLeave={() => onSetHoverTooltip(null)}
              aria-pressed={playbackMode === 'MANUAL_POINTER'}
            >
              [ MANUAL POINTER ]
            </button>
            <button
              className={`mode-toggle-btn ${playbackMode === 'AUTO_PLAY_GLOBE' ? 'active' : ''}`}
              onClick={() => {
                onSetPlaybackMode('AUTO_PLAY_GLOBE');
                globalSynthEngine.setPlaybackMode('AUTO_PLAY_GLOBE');
              }}
              onMouseEnter={() =>
                onSetHoverTooltip({
                  visible: true,
                  x: 0,
                  y: 0,
                  title: 'PLAYBACK MODE',
                  parameterName: 'Auto-Play Whole Globe',
                  gediMetric: 'ENSEMBLE SWEEP',
                  currentValue: 'AUTO-SWEEP',
                  units: '360° ORBIT',
                  percentageValue: 100,
                  barColor: '#00ff66',
                  scientificDescription: 'Automated 360° planetary rotation and continuous multi-latitude scanning sweep.',
                  soundDescription: 'Hands-free automated performance: seamlessly blends all 5 parameter chords into an evolving song.',
                })
              }
              onMouseLeave={() => onSetHoverTooltip(null)}
              aria-pressed={playbackMode === 'AUTO_PLAY_GLOBE'}
            >
              [ AUTO-PLAY WHOLE GLOBE ]
            </button>
          </div>

          {/* 2D vs 3D Dataset Mode Switcher */}
          <div className="mode-toggle-group">
            <button
              className={`mode-toggle-btn ${datasetMode === '2D_SURFACE' ? 'active' : ''}`}
              onClick={() => {
                globalForestLoader.setMode('2D_SURFACE');
                onSetDatasetMode('2D_SURFACE');
              }}
              aria-pressed={datasetMode === '2D_SURFACE'}
            >
              2D SURFACE
            </button>
            <button
              className={`mode-toggle-btn ${datasetMode === '3D_VOLUMETRIC' ? 'active' : ''}`}
              onClick={() => {
                globalForestLoader.setMode('3D_VOLUMETRIC');
                onSetDatasetMode('3D_VOLUMETRIC');
              }}
              aria-pressed={datasetMode === '3D_VOLUMETRIC'}
            >
              3D VOLUMETRIC
            </button>
          </div>
        </div>

        {/* Live Active Chord Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              background: '#001438',
              border: '2px solid #0055ff',
              padding: '2px 8px',
              fontFamily: 'var(--font-retro-pixel)',
              fontSize: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span style={{ color: '#00e5ff' }}>CHORD:</span>
            <span style={{ color: '#ffff00', fontWeight: 'bold' }}>{mixerState.currentChord}</span>
            <span style={{ color: '#00ff88', fontSize: '7px' }}>
              [{mixerState.chordTones.join(' - ')}]
            </span>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".png,.jpg,.jpeg,.webp,.json"
            style={{ display: 'none' }}
            onChange={handleFileUpload}
          />
          <button
            className="pixel-btn"
            style={{ fontSize: '7px', padding: '3px 6px' }}
            onClick={() => fileInputRef.current?.click()}
            aria-label="Upload custom 2D image or 3D JSON dataset"
          >
            [ UPLOAD DATA ]
          </button>
        </div>
      </div>

      {/* Main 5 Channels + Master Crossfader / Scope Container */}
      <div className="bottom-channels-container">
        {/* CH-1: GEDI FOREST ("RUSTY CHORDS") */}
        <div
          className={`dj-channel-strip ${mixerState.chForest.activityLevel > 0.35 ? 'channel-active' : ''}`}
          onMouseEnter={() =>
            onSetHoverTooltip({
              visible: true,
              x: 0,
              y: 0,
              title: 'CHANNEL 1: GEDI FOREST HEIGHT',
              parameterName: 'GEDI RH98 Forest Canopy',
              gediMetric: 'RH98 [m]',
              currentValue: telemetry.maxCanopyHeight.toFixed(1),
              units: 'Meters',
              percentageValue: (telemetry.maxCanopyHeight / 60) * 100,
              barColor: '#00ff88',
              scientificDescription: 'NASA GEDI L2B LiDAR canopy top elevation above ground level.',
              soundDescription: 'Warm, tape-warbled lo-fi Dm9 / Gm7 vintage keys with subtle saturation and woody plucks.',
            })
          }
          onMouseLeave={() => onSetHoverTooltip(null)}
        >
          <div className="channel-badge" style={{ background: '#002b66' }}>
            CH-1: FOREST ("RUSTY")
          </div>
          <div className="channel-controls-body">
            <div className="rainbow-fader-container">
              <div className="rainbow-fader-track" />
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={mixerState.chForest.volume}
                onChange={(e) => globalSynthEngine.setChannelVolume('chForest', parseFloat(e.target.value))}
                role="slider"
                aria-label="Channel 1 GEDI Forest Height Volume"
                aria-valuenow={Math.round(mixerState.chForest.volume * 100)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuetext={`${Math.round(mixerState.chForest.volume * 100)}% Volume`}
                style={{
                  position: 'absolute',
                  width: '76px',
                  height: '20px',
                  transform: 'rotate(-90deg)',
                  opacity: 0,
                  cursor: 'pointer',
                  zIndex: 10,
                }}
              />
              <div className="rainbow-fader-thumb" style={{ bottom: `${mixerState.chForest.volume * 68}px` }} />
            </div>

            <div className="channel-mute-solo-group">
              <button
                className={`mute-btn ${mixerState.chForest.muted ? 'active' : ''}`}
                onClick={() => globalSynthEngine.toggleMute('chForest')}
                aria-label="Mute Channel 1 Forest"
                aria-pressed={mixerState.chForest.muted}
              >
                M
              </button>
              <button
                className={`solo-btn ${mixerState.chForest.solo ? 'active' : ''}`}
                onClick={() => globalSynthEngine.toggleSolo('chForest')}
                aria-label="Solo Channel 1 Forest"
                aria-pressed={mixerState.chForest.solo}
              >
                S
              </button>
              <div style={{ fontSize: '7px', color: '#00e5ff', textAlign: 'center' }}>
                {mixerState.chForest.chordName || 'Dm9'}
              </div>
            </div>
          </div>
        </div>

        {/* CH-2: AIR QUALITY ("FLOWY CHORDS") */}
        <div
          className={`dj-channel-strip ${mixerState.chAir.activityLevel > 0.35 ? 'channel-active' : ''}`}
          onMouseEnter={() =>
            onSetHoverTooltip({
              visible: true,
              x: 0,
              y: 0,
              title: 'CHANNEL 2: AIR QUALITY INDEX',
              parameterName: 'Atmospheric Air Quality (AQI)',
              gediMetric: 'AQI INDEX',
              currentValue: telemetry.airQualityIndex,
              units: 'AQI',
              percentageValue: (telemetry.airQualityIndex / 200) * 100,
              barColor: '#00e5ff',
              scientificDescription: 'Atmospheric particulate and gaseous air quality index across global air basins.',
              soundDescription: 'Ethereal, slow-swelling Cmaj9 / Gsus2 synth pads with wide stereo chorus and long reverb tails.',
            })
          }
          onMouseLeave={() => onSetHoverTooltip(null)}
        >
          <div className="channel-badge" style={{ background: '#003d55' }}>
            CH-2: AIR ("FLOWY")
          </div>
          <div className="channel-controls-body">
            <div className="rainbow-fader-container">
              <div className="rainbow-fader-track" />
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={mixerState.chAir.volume}
                onChange={(e) => globalSynthEngine.setChannelVolume('chAir', parseFloat(e.target.value))}
                role="slider"
                aria-label="Channel 2 Air Quality Volume"
                aria-valuenow={Math.round(mixerState.chAir.volume * 100)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuetext={`${Math.round(mixerState.chAir.volume * 100)}% Volume`}
                style={{
                  position: 'absolute',
                  width: '76px',
                  height: '20px',
                  transform: 'rotate(-90deg)',
                  opacity: 0,
                  cursor: 'pointer',
                  zIndex: 10,
                }}
              />
              <div className="rainbow-fader-thumb" style={{ bottom: `${mixerState.chAir.volume * 68}px` }} />
            </div>

            <div className="channel-mute-solo-group">
              <button
                className={`mute-btn ${mixerState.chAir.muted ? 'active' : ''}`}
                onClick={() => globalSynthEngine.toggleMute('chAir')}
                aria-label="Mute Channel 2 Air"
                aria-pressed={mixerState.chAir.muted}
              >
                M
              </button>
              <button
                className={`solo-btn ${mixerState.chAir.solo ? 'active' : ''}`}
                onClick={() => globalSynthEngine.toggleSolo('chAir')}
                aria-label="Solo Channel 2 Air"
                aria-pressed={mixerState.chAir.solo}
              >
                S
              </button>
              <div style={{ fontSize: '7px', color: '#00ff88', textAlign: 'center' }}>
                {mixerState.chAir.chordName || 'Cmaj9'}
              </div>
            </div>
          </div>
        </div>

        {/* CH-3: GEOS AEROSOLS ("SHIMMER CHORDS") */}
        <div
          className={`dj-channel-strip ${mixerState.chAerosols.activityLevel > 0.35 ? 'channel-active' : ''}`}
          onMouseEnter={() =>
            onSetHoverTooltip({
              visible: true,
              x: 0,
              y: 0,
              title: 'CHANNEL 3: GEOS AEROSOLS',
              parameterName: 'NASA GEOS Aerosol Optical Depth',
              gediMetric: 'AOD 550nm',
              currentValue: telemetry.aerosolOpticalDepth.toFixed(2),
              units: 'AOD',
              percentageValue: (telemetry.aerosolOpticalDepth / 1.0) * 100,
              barColor: '#ffff00',
              scientificDescription: 'Aerosol extinction mapping atmospheric dust plumes, wildfire smoke, and maritime sea-spray.',
              soundDescription: 'Crystalline add9 / sus4 granular bell-plucks mapped to smoke, dust, and sea-salt layers.',
            })
          }
          onMouseLeave={() => onSetHoverTooltip(null)}
        >
          <div className="channel-badge" style={{ background: '#554400' }}>
            CH-3: AEROSOLS ("SHIMMER")
          </div>
          <div className="channel-controls-body">
            <div className="rainbow-fader-container">
              <div className="rainbow-fader-track" />
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={mixerState.chAerosols.volume}
                onChange={(e) => globalSynthEngine.setChannelVolume('chAerosols', parseFloat(e.target.value))}
                role="slider"
                aria-label="Channel 3 GEOS Aerosols Volume"
                aria-valuenow={Math.round(mixerState.chAerosols.volume * 100)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuetext={`${Math.round(mixerState.chAerosols.volume * 100)}% Volume`}
                style={{
                  position: 'absolute',
                  width: '76px',
                  height: '20px',
                  transform: 'rotate(-90deg)',
                  opacity: 0,
                  cursor: 'pointer',
                  zIndex: 10,
                }}
              />
              <div className="rainbow-fader-thumb" style={{ bottom: `${mixerState.chAerosols.volume * 68}px` }} />
            </div>

            <div className="channel-mute-solo-group">
              <button
                className={`mute-btn ${mixerState.chAerosols.muted ? 'active' : ''}`}
                onClick={() => globalSynthEngine.toggleMute('chAerosols')}
                aria-label="Mute Channel 3 Aerosols"
                aria-pressed={mixerState.chAerosols.muted}
              >
                M
              </button>
              <button
                className={`solo-btn ${mixerState.chAerosols.solo ? 'active' : ''}`}
                onClick={() => globalSynthEngine.toggleSolo('chAerosols')}
                aria-label="Solo Channel 3 Aerosols"
                aria-pressed={mixerState.chAerosols.solo}
              >
                S
              </button>
              <div style={{ fontSize: '7px', color: '#ffff00', textAlign: 'center' }}>
                {mixerState.chAerosols.chordName || 'Dadd9'}
              </div>
            </div>
          </div>
        </div>

        {/* CH-4: SEA CURRENTS & TEMP ("LIQUID CHORDS") */}
        <div
          className={`dj-channel-strip ${mixerState.chOcean.activityLevel > 0.35 ? 'channel-active' : ''}`}
          onMouseEnter={() =>
            onSetHoverTooltip({
              visible: true,
              x: 0,
              y: 0,
              title: 'CHANNEL 4: SEA CURRENTS & TEMP',
              parameterName: 'Ocean Velocity & Sea Surface Temp',
              gediMetric: 'CURRENT / SST',
              currentValue: `${telemetry.oceanCurrentSpeed} m/s | ${telemetry.seaSurfaceTempC}°C`,
              units: 'm/s & °C',
              percentageValue: (telemetry.oceanCurrentSpeed / 2.2) * 100,
              barColor: '#00aaff',
              scientificDescription: 'Surface oceanic current velocity and thermal gradients from planetary boundary currents.',
              soundDescription: 'Smooth phased electric-piano Fmaj9 / Em11 chords modulated by ocean current speed.',
            })
          }
          onMouseLeave={() => onSetHoverTooltip(null)}
        >
          <div className="channel-badge" style={{ background: '#004477' }}>
            CH-4: OCEAN ("LIQUID")
          </div>
          <div className="channel-controls-body">
            <div className="rainbow-fader-container">
              <div className="rainbow-fader-track" />
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={mixerState.chOcean.volume}
                onChange={(e) => globalSynthEngine.setChannelVolume('chOcean', parseFloat(e.target.value))}
                role="slider"
                aria-label="Channel 4 Sea Currents Volume"
                aria-valuenow={Math.round(mixerState.chOcean.volume * 100)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuetext={`${Math.round(mixerState.chOcean.volume * 100)}% Volume`}
                style={{
                  position: 'absolute',
                  width: '76px',
                  height: '20px',
                  transform: 'rotate(-90deg)',
                  opacity: 0,
                  cursor: 'pointer',
                  zIndex: 10,
                }}
              />
              <div className="rainbow-fader-thumb" style={{ bottom: `${mixerState.chOcean.volume * 68}px` }} />
            </div>

            <div className="channel-mute-solo-group">
              <button
                className={`mute-btn ${mixerState.chOcean.muted ? 'active' : ''}`}
                onClick={() => globalSynthEngine.toggleMute('chOcean')}
                aria-label="Mute Channel 4 Ocean"
                aria-pressed={mixerState.chOcean.muted}
              >
                M
              </button>
              <button
                className={`solo-btn ${mixerState.chOcean.solo ? 'active' : ''}`}
                onClick={() => globalSynthEngine.toggleSolo('chOcean')}
                aria-label="Solo Channel 4 Ocean"
                aria-pressed={mixerState.chOcean.solo}
              >
                S
              </button>
              <div style={{ fontSize: '7px', color: '#00ddff', textAlign: 'center' }}>
                {mixerState.chOcean.chordName || 'Fmaj9'}
              </div>
            </div>
          </div>
        </div>

        {/* CH-5: DYAMOND CO2 ("DEEP SUB CHORDS") */}
        <div
          className={`dj-channel-strip ${mixerState.chCo2.activityLevel > 0.35 ? 'channel-active' : ''}`}
          onMouseEnter={() =>
            onSetHoverTooltip({
              visible: true,
              x: 0,
              y: 0,
              title: 'CHANNEL 5: DYAMOND CO2',
              parameterName: 'Atmospheric Carbon Dioxide',
              gediMetric: 'CO2 PPM',
              currentValue: telemetry.co2Ppm.toFixed(1),
              units: 'PPM',
              percentageValue: Math.max(0, ((telemetry.co2Ppm - 405) / 25) * 100),
              barColor: '#ff3366',
              scientificDescription: 'High-resolution atmospheric CO2 concentration modulated by photosynthetic vegetative drawdown.',
              soundDescription: 'Warm low-octave analog root-fifth-ninth bass chords (C2–G2–D3) pulsing with atmospheric CO2 levels.',
            })
          }
          onMouseLeave={() => onSetHoverTooltip(null)}
        >
          <div className="channel-badge" style={{ background: '#550022' }}>
            CH-5: CO2 ("DEEP SUB")
          </div>
          <div className="channel-controls-body">
            <div className="rainbow-fader-container">
              <div className="rainbow-fader-track" />
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={mixerState.chCo2.volume}
                onChange={(e) => globalSynthEngine.setChannelVolume('chCo2', parseFloat(e.target.value))}
                role="slider"
                aria-label="Channel 5 Carbon Dioxide Sub Bass Volume"
                aria-valuenow={Math.round(mixerState.chCo2.volume * 100)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuetext={`${Math.round(mixerState.chCo2.volume * 100)}% Volume`}
                style={{
                  position: 'absolute',
                  width: '76px',
                  height: '20px',
                  transform: 'rotate(-90deg)',
                  opacity: 0,
                  cursor: 'pointer',
                  zIndex: 10,
                }}
              />
              <div className="rainbow-fader-thumb" style={{ bottom: `${mixerState.chCo2.volume * 68}px` }} />
            </div>

            <div className="channel-mute-solo-group">
              <button
                className={`mute-btn ${mixerState.chCo2.muted ? 'active' : ''}`}
                onClick={() => globalSynthEngine.toggleMute('chCo2')}
                aria-label="Mute Channel 5 CO2"
                aria-pressed={mixerState.chCo2.muted}
              >
                M
              </button>
              <button
                className={`solo-btn ${mixerState.chCo2.solo ? 'active' : ''}`}
                onClick={() => globalSynthEngine.toggleSolo('chCo2')}
                aria-label="Solo Channel 5 CO2"
                aria-pressed={mixerState.chCo2.solo}
              >
                S
              </button>
              <div style={{ fontSize: '7px', color: '#ff5588', textAlign: 'center' }}>
                SUB CHORD
              </div>
            </div>
          </div>
        </div>

        {/* Master Output & Crossfader Strip */}
        <div className="dj-master-strip" style={{ width: '280px' }}>
          <canvas ref={oscCanvasRef} width={270} height={50} className="oscilloscope-canvas" aria-label="Real-time Oscilloscope Waveform Visualizer" />

          {/* Master Crossfader: [ RUSTY FOREST <====|====> FLOWY AIR/OCEAN ] */}
          <div
            className="crossfader-box"
            style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}
            onMouseEnter={() =>
              onSetHoverTooltip({
                visible: true,
                x: 0,
                y: 0,
                title: 'MASTER HARMONIC CROSSFADER',
                parameterName: 'Acoustic Strata Balance',
                gediMetric: 'CROSSFADER',
                currentValue: `${Math.round((1 - mixerState.crossfader) * 100)}% Forest / ${Math.round(mixerState.crossfader * 100)}% Air-Ocean`,
                units: 'Ratio',
                percentageValue: mixerState.crossfader * 100,
                barColor: '#00e5ff',
                scientificDescription: 'Equal-power spectral crossfader balancing vegetative land strata against fluid atmospheric/oceanic strata.',
                soundDescription: 'Slide left for warm woody tape-warbled lo-fi keys & sub-bass; slide right for shimmering pads, chimes, and electric piano.',
              })
            }
            onMouseLeave={() => onSetHoverTooltip(null)}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: '7px', color: '#88aacc' }}>
              <span style={{ color: '#00ff88' }}>[ RUSTY FOREST</span>
              <span style={{ color: '#ffff00' }}>&lt;====|====&gt;</span>
              <span style={{ color: '#00ccff' }}>FLOWY AIR/OCEAN ]</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={mixerState.crossfader}
              onChange={(e) => globalSynthEngine.setCrossfader(parseFloat(e.target.value))}
              className="crossfader-slider"
              style={{ width: '100%' }}
              role="slider"
              aria-label="Master Strata Crossfader: Rusty Forest versus Flowy Air and Ocean"
              aria-valuenow={Math.round(mixerState.crossfader * 100)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuetext={`${Math.round((1 - mixerState.crossfader) * 100)}% Forest, ${Math.round(mixerState.crossfader * 100)}% Air and Ocean`}
            />
          </div>
        </div>
      </div>

      {/* 16-Step Sequencer Strip */}
      <div className="sequencer-step-strip" role="presentation" aria-label="16 Step Sequencer Beat Indicator">
        {Array.from({ length: 16 }).map((_, stepIdx) => {
          const isActive = currentStep === stepIdx;
          const isBeat = stepIdx % 4 === 0;
          return (
            <div
              key={stepIdx}
              className={`step-key ${isActive ? 'active-step' : ''} ${isBeat ? 'beat-marker' : ''}`}
            >
              {stepIdx + 1}
            </div>
          );
        })}
      </div>
    </div>
  );
};
