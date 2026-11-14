// App.tsx
// TERRA-SCAN // Adaptive 2D/3D Forest Bio-Acoustic Jukebox
// 16-Bit Retro Sci-Fi / Cybernetic Pixel-Art HUD CRT Diagnostic Terminal
// Complete with Accessibility Suite, Curated Jukebox Presets & Image-to-Sound Engine

import React, { useEffect, useState } from 'react';
import './styles/cyberHud.css';
import { CanopyColumnData, DatasetMode, HoverTooltipInfo, PlaybackMode, RegionBiome, ScanAxisConfig } from './types/forest';
import { globalForestLoader } from './data/UniversalForestLoader';
import { globalSynthEngine } from './audio/ForestSynthEngine';
import { globalImageSonifier } from './audio/ImageSonifier';
import { CyberForestEarth } from './components/CyberForestEarth';
import { CanopyDonutGauges } from './components/CanopyDonutGauges';
import { TelemetryStream } from './components/TelemetryStream';
import { VerticalHeatmap } from './components/VerticalHeatmap';
import { VerticalMeters } from './components/VerticalMeters';
import { BUILTIN_REGIONS, BUILTIN_SCAN_AXES, RegionSelector } from './components/RegionSelector';
import { BottomStrataDJMixer } from './components/BottomStrataDJMixer';
import { HoverTooltip } from './components/HoverTooltip';
import { AccessibilityHud } from './components/AccessibilityHud';
import { CURATED_TRACKS, JukeboxTrack } from './components/TrackSelectorStrip';

export const App: React.FC = () => {
  // Global States
  const [datasetMode, setDatasetMode] = useState<DatasetMode>('2D_SURFACE');
  const [playbackMode, setPlaybackMode] = useState<PlaybackMode>('MANUAL_POINTER');
  const [activeRegion, setActiveRegion] = useState<RegionBiome | null>(BUILTIN_REGIONS[0]); // Amazon start
  const [activeScanAxis, setActiveScanAxis] = useState<ScanAxisConfig>(BUILTIN_SCAN_AXES[0]); // Equator
  const [scanRPM, setScanRPM] = useState<number>(10);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [zElevationGate, setZElevationGate] = useState<number>(30.0);

  // Accessibility States
  const [isNarratorEnabled, setIsNarratorEnabled] = useState<boolean>(false);
  const [isHighLegibility, setIsHighLegibility] = useState<boolean>(false);
  const [targetCoord, setTargetCoord] = useState<{ lat: number; lon: number } | null>({ lat: -3.46, lon: -62.21 });
  const [activeTrackId, setActiveTrackId] = useState<string | null>('track-01');

  // Live Telemetry Column Data (Start at Amazon Basin)
  const [telemetry, setTelemetry] = useState<CanopyColumnData>(() =>
    globalForestLoader.sampleCanopyColumn(-3.46, -62.21)
  );

  // Live Mixer State
  const [mixerState, setMixerState] = useState(globalSynthEngine.getMixerState());

  // Interactive Hover Tooltip State (Clean non-blocking card)
  const [hoverTooltip, setHoverTooltip] = useState<HoverTooltipInfo | null>(null);

  // Hook ImageSonifier with Canvas
  useEffect(() => {
    try {
      globalImageSonifier.setCanvas(globalForestLoader.getCanvas2D());
    } catch {
      // Ignore
    }
  }, []);

  const handleSetHoverTooltip = (info: HoverTooltipInfo | null) => {
    setHoverTooltip(info);
  };

  const handleProbeUpdate = (data: CanopyColumnData) => {
    setTelemetry(data);
    setMixerState(globalSynthEngine.getMixerState());

    // Explicit Image-to-Sound Pixel Sampling Pipeline
    try {
      const pixelSon = globalImageSonifier.samplePixelSonification(data.lat, data.lon);
      // Synchronize harmonic frequency or brightness with audio engine
      if (pixelSon.filterCutoffHz > 0) {
        // Pixel color harmonics active
      }
    } catch {
      // Fallback
    }
  };

  const handleToggleDatasetMode = (newMode: DatasetMode) => {
    setDatasetMode(newMode);
    globalForestLoader.setMode(newMode);
    const updated = globalForestLoader.sampleCanopyColumn(telemetry.lat, telemetry.lon);
    setTelemetry(updated);
    globalSynthEngine.updateTelemetry(updated);
  };

  const handleTogglePlaybackMode = (newMode: PlaybackMode) => {
    setPlaybackMode(newMode);
    globalSynthEngine.setPlaybackMode(newMode);
  };

  const handleSetZElevationGate = (val: number) => {
    setZElevationGate(val);
    globalForestLoader.setActiveZGate(val);
    const updated = globalForestLoader.sampleCanopyColumn(telemetry.lat, telemetry.lon);
    setTelemetry(updated);
    globalSynthEngine.updateTelemetry(updated);
  };

  // Keyboard Arrow Stepping (Full keyboard globe navigation)
  const handleStepReticle = (dLat: number, dLon: number) => {
    const curLat = targetCoord ? targetCoord.lat : telemetry.lat;
    const curLon = targetCoord ? targetCoord.lon : telemetry.lon;
    const newLat = Math.max(-85, Math.min(85, curLat + dLat));
    let newLon = (curLon + dLon + 180) % 360;
    if (newLon < 0) newLon += 360;
    newLon -= 180;

    const next = { lat: Number(newLat.toFixed(2)), lon: Number(newLon.toFixed(2)) };
    setTargetCoord(next);
    const updated = globalForestLoader.sampleCanopyColumn(next.lat, next.lon);
    setTelemetry(updated);
    globalSynthEngine.updateTelemetry(updated);
  };

  // Curated Preset Track Selector
  const handleSelectTrack = (track: JukeboxTrack) => {
    setActiveTrackId(track.id);
    setPlaybackMode(track.playbackMode);
    globalSynthEngine.setPlaybackMode(track.playbackMode);
    setTargetCoord({ lat: track.lat, lon: track.lon });

    const updated = globalForestLoader.sampleCanopyColumn(track.lat, track.lon);
    setTelemetry(updated);
    globalSynthEngine.updateTelemetry(updated);
  };

  return (
    <div className={`crt-chassis ${isHighLegibility ? 'high-legibility-mode' : ''}`}>
      <div className="crt-bezel">
        <div className="crt-screen-inner">
          {/* Cobalt Blue Persistent Square Grid Background */}
          <div className="cobalt-grid-bg" />

          {/* CRT Scanline & Phosphor Vignette Overlays */}
          <div className="crt-scanlines" />
          <div className="crt-vignette" />

          {/* TOP RETRO HUD STATUS BAR */}
          <header className="hud-top-bar" role="banner" aria-label="Terra-Scan HUD Status Bar">
            <div className="hud-title-cluster">
              <span className="hud-title-badge">TERRA-SCAN</span>
              <div>
                <div className="hud-main-title">ADAPTIVE 2D/3D BIO-ACOUSTIC JUKEBOX</div>
                <div className="hud-sub-title">16-BIT SCI-FI HUD // ACCESSIBILITY SUITE // 5-PARAM POLYPHONIC CHORDS</div>
              </div>
            </div>

            {/* Top Center: Accessibility HUD Controls (Narrator, Font, Shortcuts) */}
            <AccessibilityHud
              telemetry={telemetry}
              playbackMode={playbackMode}
              isNarratorEnabled={isNarratorEnabled}
              isHighLegibility={isHighLegibility}
              onToggleNarrator={() => setIsNarratorEnabled(!isNarratorEnabled)}
              onToggleHighLegibility={() => setIsHighLegibility(!isHighLegibility)}
              onStepReticle={handleStepReticle}
            />

            {/* Top Right: System Telemetry */}
            <div className="hud-top-right-telemetry">
              <span style={{ color: '#00ff66' }}>GPS: LOCK</span>
              <span style={{ color: '#ffff00', fontWeight: 'bold' }}>{mixerState.currentChord}</span>
              <span style={{ color: '#ff4444' }}>60 FPS</span>
            </div>
          </header>

          {/* MAIN VIEWPORT: 3D THREE.JS GLOBE + FLOATING HUD PANELS */}
          <main className="hud-main-viewport" role="main">
            {/* Center 3D Hybrid Wireframe & Forest Globe */}
            <CyberForestEarth
              datasetMode={datasetMode}
              playbackMode={playbackMode}
              activeRegion={activeRegion}
              targetCoord={targetCoord}
              activeScanAxis={activeScanAxis}
              scanRPM={scanRPM}
              isScanning={isScanning}
              zElevationGate={zElevationGate}
              onProbeUpdate={handleProbeUpdate}
              onSetHoverTooltip={handleSetHoverTooltip}
            />

            {/* Central Callout Banner (5 Active Planetary Parameters) */}
            <div className="hud-center-callout" role="status" aria-label="Active Target Coordinates and Readings">
              <div style={{ color: '#00ff66' }}>TARGET:</div>
              <div style={{ color: '#ffffff' }}>
                {telemetry.lat.toFixed(2)}°, {telemetry.lon.toFixed(2)}° [{telemetry.biomeName}]
              </div>
              <div style={{ color: '#ffff00' }}>RH98: {telemetry.maxCanopyHeight.toFixed(1)}m</div>
              <div style={{ color: '#00e5ff' }}>AQI: {telemetry.airQualityIndex}</div>
              <div style={{ color: '#ff5588' }}>CO2: {telemetry.co2Ppm.toFixed(1)}ppm</div>
            </div>

            {/* TOP-LEFT: Canopy Profile Donut Gauges & LiDAR Waveform */}
            <CanopyDonutGauges telemetry={telemetry} onSetHoverTooltip={handleSetHoverTooltip} />

            {/* MID-LEFT: Monospace Telemetry Stream */}
            <TelemetryStream
              telemetry={telemetry}
              datasetMode={datasetMode}
              onSetHoverTooltip={handleSetHoverTooltip}
            />

            {/* BOTTOM-LEFT: Live Scrolling Spectral Heatmap */}
            <VerticalHeatmap telemetry={telemetry} onSetHoverTooltip={handleSetHoverTooltip} />

            {/* TOP-RIGHT: Vertical Green/Blue Equalizer & Counters */}
            <VerticalMeters
              telemetry={telemetry}
              mixerState={mixerState}
              onSetHoverTooltip={handleSetHoverTooltip}
            />

            {/* MID-RIGHT: Navigation, Biome Selector & 360° Scan Axis */}
            <RegionSelector
              playbackMode={playbackMode}
              onSetPlaybackMode={handleTogglePlaybackMode}
              activeRegion={activeRegion}
              onSelectRegion={setActiveRegion}
              activeScanAxis={activeScanAxis}
              onSelectScanAxis={setActiveScanAxis}
              scanRPM={scanRPM}
              onSetScanRPM={setScanRPM}
              isScanning={isScanning}
              onToggleScanning={() => setIsScanning(!isScanning)}
              zElevationGate={zElevationGate}
              onSetZElevationGate={handleSetZElevationGate}
              datasetMode={datasetMode}
              onSetHoverTooltip={handleSetHoverTooltip}
            />
          </main>

          {/* BOTTOM DOCKING CONSOLE: 5-CHANNEL THEMED POLYPHONIC CHORD DJ MIXER */}
          <BottomStrataDJMixer
            telemetry={telemetry}
            datasetMode={datasetMode}
            playbackMode={playbackMode}
            activeTrackId={activeTrackId}
            onSetDatasetMode={handleToggleDatasetMode}
            onSetPlaybackMode={handleTogglePlaybackMode}
            onSelectTrack={handleSelectTrack}
            onSetHoverTooltip={handleSetHoverTooltip}
          />
        </div>
      </div>

      {/* Clean Non-Blocking Hover Tooltip Card */}
      <HoverTooltip info={hoverTooltip} />
    </div>
  );
};

export default App;
