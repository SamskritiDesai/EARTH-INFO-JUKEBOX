import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ParameterId, earthDataEngine, SampledEarthTelemetry, DatasetFrameInfo } from './data/earthDataEngine';
import { Landmark, LANDMARKS, SatelliteRoutePreset, DEFAULT_ROUTE_PRESETS } from './data/worldBoundaries';
import { synthEngine } from './audio/ThemedChordEngine';
import { CyberEarth } from './components/CyberEarth';
import { HudTopHeader } from './components/HudTopHeader';
import { HudTelemetryLeft } from './components/HudTelemetryLeft';
import { HudRightPanel } from './components/HudRightPanel';
import { DjConsole } from './components/DjConsole';
import { LeaderLineTooltip } from './components/LeaderLineTooltip';
import { ColorScaleBar } from './components/ColorScaleBar';
import { NasaLoaderDrawer } from './components/NasaLoaderDrawer';
import { IntroSplash } from './components/IntroSplash';
import { useHoverAnnouncer } from './accessibility/useHoverAnnouncer';
import './styles/cyberHud.css';

const LOCAL_STORAGE_PRESETS_KEY = 'earth_fm_saved_presets_v1';

export const App: React.FC = () => {
  // Master Audio & Telemetry States
  const [isPlaying, setIsPlaying] = useState(true);
  const [dataVersion, setDataVersion] = useState(0);
  const [datasetLoading, setDatasetLoading] = useState(true);
  const [datasetError, setDatasetError] = useState<string | null>(null);
  const frameInfo: Record<ParameterId, DatasetFrameInfo> = {
    sst: earthDataEngine.getFrameInfo('sst'),
    aerosols: earthDataEngine.getFrameInfo('aerosols'),
    co2: earthDataEngine.getFrameInfo('co2'),
    forest: earthDataEngine.getFrameInfo('forest')
  };
  const [activeParams, setActiveParams] = useState<Record<ParameterId, boolean>>({
    sst: true,
    aerosols: true,
    co2: true,
    forest: true
  });

  // 3D Probe & Route States
  const [probeLat, setProbeLat] = useState(19.0760); // Mumbai initial location
  const [probeLon, setProbeLon] = useState(72.8777);
  const [reticleScreenPos, setReticleScreenPos] = useState<{ x: number; y: number } | null>(null);

  // Auto-Play Satellite Route States
  const [autoPlayEnabled, setAutoPlayEnabled] = useState(false);
  const [selectedSource, setSelectedSource] = useState<Landmark>(LANDMARKS[2]); // Tokyo
  const [selectedDest, setSelectedDest] = useState<Landmark>(LANDMARKS[8]); // California
  const [routeBpm, setRouteBpm] = useState(78);
  const [autoPlayProgress, setAutoPlayProgress] = useState(0);

  // Features & Overlays
  const [isScanPlaneActive, setIsScanPlaneActive] = useState(false); // 3D SCAN starts OFF
  const [isNasaDrawerOpen, setIsNasaDrawerOpen] = useState(false);
  const [hoverScanEnabled, setHoverScanEnabled] = useState(false); // starts OFF (H key or the chip turns it on)
  const [showIntro, setShowIntro] = useState(true);

  // Hover Tooltip States
  const [hoverParam, setHoverParam] = useState<ParameterId | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);

  // Presets from LocalStorage
  const [savedPresets, setSavedPresets] = useState<SatelliteRoutePreset[]>(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_PRESETS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Accessibility Spoken Audio Narrator
  const [narratorEnabled, setNarratorEnabled] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const lastSpokenTimeRef = useRef(0);

  // Current Sampled Telemetry
  const [telemetry, setTelemetry] = useState<SampledEarthTelemetry>(() =>
    earthDataEngine.sample(probeLat, probeLon)
  );

  // Unlock Audio on First User Interaction
  const handleUserInteraction = useCallback(async () => {
    await synthEngine.unlock();
  }, []);

  // "Welcome to Earth FM." - spoken automatically when the start-screen effect ends. If the browser blocks speech
  // before the first click/key (autoplay policy), the attempt is marked failed and it is spoken on enter instead.
  const welcomeSpokenRef = useRef(false);
  const speakWelcome = useCallback(() => {
    if (!('speechSynthesis' in window) || welcomeSpokenRef.current) return;
    const welcome = new SpeechSynthesisUtterance('Welcome to Earth FM.');
    welcome.rate = 1.05;   // same voice settings as the narrator
    welcome.pitch = 1.0;
    welcome.onstart = () => { welcomeSpokenRef.current = true; };
    welcome.onerror = () => { welcomeSpokenRef.current = false; };
    try {
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(welcome);
    } catch { /* blocked: retried on enter */ }
  }, []);

  // Load the four NASA binary time series once, then refresh the probe telemetry.
  useEffect(() => {
    let cancelled = false;
    earthDataEngine.load()
      .then(() => {
        if (!cancelled) {
          setDatasetLoading(false);
          setDatasetError(null);
          setDataVersion(v => v + 1);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setDatasetLoading(false);
          setDatasetError(error instanceof Error ? error.message : 'NASA dataset load failed');
        }
      });
    return () => { cancelled = true; };
  }, []);

  // Sync telemetry and audio when the probe or any independent dataset frame changes.
  useEffect(() => {
    const data = earthDataEngine.sample(probeLat, probeLon);
    setTelemetry(data);
    synthEngine.updateTelemetry(data);
  }, [probeLat, probeLon, dataVersion]);

  const handleProbeChange = useCallback((lat: number, lon: number) => {
    setProbeLat(lat);
    setProbeLon(lon);
  }, []);

  const handleFrameChange = (param: ParameterId, index: number) => {
    earthDataEngine.setFrame(param, index);
    setDataVersion(v => v + 1);
  };

  // Spoken narrator. Speaks the place name when the place changes (auto-play: "Above the Indian Ocean", nothing
  // else). In manual mode it also gives the coordinates, and speaks again after moving a few degrees within one
  // place. One pending timer always speaks the LATEST place, so nothing is skipped or starved while moving.
  const lastSpokenPlaceRef = useRef('');
  const lastSpokenPosRef = useRef({ lat: 0, lon: 0 });
  const latestTelemetryRef = useRef(telemetry);
  latestTelemetryRef.current = telemetry;
  const autoPlayRef = useRef(autoPlayEnabled);
  autoPlayRef.current = autoPlayEnabled;
  const speakTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const speakPlace = useCallback(() => {
    const t = latestTelemetryRef.current;
    lastSpokenTimeRef.current = Date.now();
    lastSpokenPlaceRef.current = t.nearestRegion;
    lastSpokenPosRef.current = { lat: t.lat, lon: t.lon };
    window.speechSynthesis.cancel();

    let text: string;
    if (autoPlayRef.current) {
      text = `Above ${t.spokenPlace}.`;
    } else {
      const notes = Array.from(new Set(synthEngine.getActiveNotes().map(n => n.note))).join(' and ');
      const ice = t.surface === 'sea-ice' ? ' Covered by sea ice.' : t.surface === 'land-ice' ? ' Covered by ice and snow.' : '';
      text = `${t.spokenPlace}.${ice} ${Math.abs(t.lat).toFixed(0)} degrees ${t.lat >= 0 ? 'north' : 'south'}, ` +
        `${Math.abs(t.lon).toFixed(0)} degrees ${t.lon >= 0 ? 'east' : 'west'}. Synthesizing ${notes || 'ambient tones'}.`;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }, []);

  useEffect(() => {
    if (!narratorEnabled || !('speechSynthesis' in window)) {
      if (speakTimerRef.current) { clearTimeout(speakTimerRef.current); speakTimerRef.current = null; }
      return;
    }
    const needsSpeech = () => {
      const t = latestTelemetryRef.current;
      const moved = Math.hypot(t.lat - lastSpokenPosRef.current.lat, t.lon - lastSpokenPosRef.current.lon);
      return t.nearestRegion !== lastSpokenPlaceRef.current || (!autoPlayRef.current && moved >= 3);
    };
    if (!needsSpeech() || speakTimerRef.current) return;
    const wait = Math.max(0, 3500 - (Date.now() - lastSpokenTimeRef.current));
    speakTimerRef.current = setTimeout(() => {
      speakTimerRef.current = null;
      if (needsSpeech()) speakPlace();
    }, wait);
  }, [telemetry.nearestRegion, telemetry.lat, telemetry.lon, narratorEnabled, autoPlayEnabled, speakPlace]);

  useEffect(() => () => { if (speakTimerRef.current) clearTimeout(speakTimerRef.current); }, []);

  // Speak the name of any button / slider the pointer rests on (or that gets keyboard focus) while the narrator is on
  useHoverAnnouncer(narratorEnabled);

  // Screen-reader live announcement (silent text region). Not used while the built-in narrator is on, so they never double up.
  const [srAnnouncement, setSrAnnouncement] = useState('');
  useEffect(() => {
    if (narratorEnabled) { setSrAnnouncement(''); return; }
    const t = latestTelemetryRef.current;
    setSrAnnouncement(autoPlayEnabled
      ? `Above ${t.spokenPlace}.`
      : `${t.spokenPlace}. ${Math.abs(t.lat).toFixed(0)} degrees ${t.lat >= 0 ? 'north' : 'south'}, ${Math.abs(t.lon).toFixed(0)} degrees ${t.lon >= 0 ? 'east' : 'west'}.`);
    // only when the place changes, not on every coordinate tick
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [telemetry.nearestRegion, narratorEnabled, autoPlayEnabled]);

  // Auto-Play Satellite Route Animation Loop
  useEffect(() => {
    if (!autoPlayEnabled) return;
    let animId: number;
    let lastTime = performance.now();

    const loop = (currentTime: number) => {
      animId = requestAnimationFrame(loop);
      const dt = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      // Speed scaled by BPM (at 80 BPM, full cycle ~18 seconds)
      const cycleDuration = (60 / routeBpm) * 24;
      setAutoPlayProgress(prev => (prev + dt / cycleDuration) % 1.0);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [autoPlayEnabled, routeBpm]);

  // Toggle Parameter Voice & Visual Layer
  const handleToggleParam = (param: ParameterId) => {
    handleUserInteraction();
    setActiveParams(prev => {
      const next = { ...prev, [param]: !prev[param] };
      return next;
    });
  };

  // Toggle Master Audio Play/Pause
  const handleTogglePlay = () => {
    handleUserInteraction();
    const state = synthEngine.togglePlayPause();
    setIsPlaying(state);
  };

  // Toggle Auto-Play
  const handleToggleAutoPlay = () => {
    handleUserInteraction();
    setAutoPlayEnabled(prev => !prev);
  };

  // Toggle 3D Scan Plane
  const handleToggleScanPlane = () => {
    setIsScanPlaneActive(prev => !prev);
  };

  // Toggle Narrator with speech priming
  const handleToggleNarrator = () => {
    handleUserInteraction();
    if (!narratorEnabled && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const prime = new SpeechSynthesisUtterance('EARTH FM Narrator Online. Hover over any button to hear its name.');
      window.speechSynthesis.speak(prime);
      lastSpokenPlaceRef.current = ''; // announce the current place right after the intro
      lastSpokenTimeRef.current = Date.now(); // ...but let the intro finish first
    } else if (narratorEnabled && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
    setNarratorEnabled(prev => !prev);
  };

  // Save current route to user presets
  const handleSaveCurrentRoute = () => {
    const newPreset: SatelliteRoutePreset = {
      id: `user-${Date.now()}`,
      title: `${selectedSource.name.split(',')[0]} -> ${selectedDest.name.split(',')[0]}`,
      subtitle: `${selectedSource.name} to ${selectedDest.name}`,
      sourceId: selectedSource.id,
      destinationId: selectedDest.id,
      sourceLat: selectedSource.lat,
      sourceLon: selectedSource.lon,
      destLat: selectedDest.lat,
      destLon: selectedDest.lon,
      bpm: routeBpm,
      description: 'Custom user trajectory across planetary biome corridors.'
    };

    const updated = [newPreset, ...savedPresets];
    setSavedPresets(updated);
    try {
      localStorage.setItem(LOCAL_STORAGE_PRESETS_KEY, JSON.stringify(updated));
    } catch {
      // Ignored
    }
  };

  // Apply Route Preset
  const handleApplyPreset = (preset: SatelliteRoutePreset) => {
    const src = LANDMARKS.find(l => l.id === preset.sourceId) || {
      id: preset.sourceId,
      name: preset.title.split('->')[0].trim(),
      lat: preset.sourceLat,
      lon: preset.sourceLon,
      region: 'Custom',
      desc: ''
    };
    const dst = LANDMARKS.find(l => l.id === preset.destinationId) || {
      id: preset.destinationId,
      name: preset.title.split('->')[1]?.trim() || 'Custom',
      lat: preset.destLat,
      lon: preset.destLon,
      region: 'Custom',
      desc: ''
    };

    setSelectedSource(src);
    setSelectedDest(dst);
    setRouteBpm(preset.bpm);
    setAutoPlayProgress(0);
    setAutoPlayEnabled(true);
    handleUserInteraction();
  };

  // Keyboard Accessibility
  // (the listener is created once, so it calls the latest toggles through refs)
  const toggleNarratorRef = useRef(handleToggleNarrator);
  toggleNarratorRef.current = handleToggleNarrator;
  const toggleAutoPlayRef = useRef(handleToggleAutoPlay);
  toggleAutoPlayRef.current = handleToggleAutoPlay;
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      // Space / Enter on a focused button must press that button, not toggle the audio
      const onButton = e.target instanceof HTMLElement && !!e.target.closest('button, [role="button"]');

      if (e.key === 'n' || e.key === 'N') {
        toggleNarratorRef.current();
      } else if (e.key === 'h' || e.key === 'H') {
        setHoverScanEnabled(v => !v);
      } else if (e.key === 'r' || e.key === 'R') {
        toggleAutoPlayRef.current();
      } else if (e.code === 'Space' && !onButton) {
        e.preventDefault();
        handleTogglePlay();
      } else if (e.key === '1') {
        handleToggleParam('sst');
      } else if (e.key === '2') {
        handleToggleParam('aerosols');
      } else if (e.key === '3') {
        handleToggleParam('co2');
      } else if (e.key === '4') {
        handleToggleParam('forest');
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setProbeLat(lat => Math.min(88, lat + 2));
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setProbeLat(lat => Math.max(-88, lat - 2));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setProbeLon(lon => (lon - 2 < -180 ? lon - 2 + 360 : lon - 2));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setProbeLon(lon => (lon + 2 > 180 ? lon + 2 - 360 : lon + 2));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div
      className="earth-fm-root crt-screen-wrapper"
      onClick={handleUserInteraction}
      onPointerDown={handleUserInteraction}
    >
      {/* Start screen: space backdrop + logo. Any click / key enters and unlocks the audio. */}
      {showIntro && (
        <IntroSplash
          onWelcome={speakWelcome}
          onEnter={() => {
            handleUserInteraction();
            if (!welcomeSpokenRef.current && !window.speechSynthesis?.speaking) speakWelcome();
            window.setTimeout(() => setShowIntro(false), 800);
          }}
        />
      )}
      {/* Crisp 16-Bit Silver / Cobalt Beveled Screen Frame */}
      <div className="sr-only" role="status" aria-live="polite">{srAnnouncement}</div>
      <div className="crt-screen-bezel">
        {/* Subtle Non-Blurring CRT Scanline Overlay */}
        <div className="crt-scanlines-overlay" />

        {/* Persistent Pitch-Black Canvas with Crisp Cobalt Grid */}
        <div className="cyber-terminal-container">
          {/* Top Header Module */}
          <HudTopHeader
            frameInfo={frameInfo}
            onFrameChange={handleFrameChange}
            datasetLoading={datasetLoading}
            datasetError={datasetError}
            isPlaying={isPlaying}
            onTogglePlay={handleTogglePlay}
            autoPlayEnabled={autoPlayEnabled}
            onToggleAutoPlay={handleToggleAutoPlay}
            isScanPlaneActive={isScanPlaneActive}
            onToggleScanPlane={handleToggleScanPlane}
            narratorEnabled={narratorEnabled}
            onToggleNarrator={handleToggleNarrator}
            onOpenNasaDrawer={() => setIsNasaDrawerOpen(true)}
          />

          {/* Central 3D Globe + Left & Right HUD Telemetry Columns */}
          <main className="hud-center-layout">
            {/* Left Telemetry Column */}
            <HudTelemetryLeft
              telemetry={telemetry}
              activeParams={activeParams}
              onToggleParam={handleToggleParam}
              onHoverParam={(param, e) => {
                setHoverParam(param);
                if (e) setHoverPos({ x: e.clientX, y: e.clientY });
                else setHoverPos(null);
              }}
            />

            {/* Central 3D Earth Globe Viewport */}
            <section className="globe-viewport-container" aria-label="3D Earth Telemetry Globe">
              <CyberEarth
                activeParams={activeParams}
                dataVersion={dataVersion}
                probeLat={probeLat}
                probeLon={probeLon}
                onProbeChange={handleProbeChange}
                autoPlayEnabled={autoPlayEnabled}
                autoPlaySource={selectedSource}
                autoPlayDest={selectedDest}
                autoPlayProgress={autoPlayProgress}
                isScanPlaneActive={isScanPlaneActive}
                hoverScanEnabled={hoverScanEnabled}
                onReticleScreenPosChange={setReticleScreenPos}
              />

              {/* Explore controls: hover scan toggle + how to move around */}
              <div className="globe-hint-chip">
                <button
                  type="button"
                  className={`hud-pixel-btn ${hoverScanEnabled ? 'btn-active-green' : 'btn-idle'}`}
                  onClick={() => setHoverScanEnabled(v => !v)}
                  aria-pressed={hoverScanEnabled}
                  aria-label="Hover scan"
                  title="Hover scan: the probe follows your mouse over the globe (H)"
                >
                  HOVER SCAN: {hoverScanEnabled ? 'ON' : 'OFF'}
                </button>
                <span className="globe-hint-text font-vt323">DRAG = ROTATE · MOVE = SCAN · CLICK = PIN · ARROWS = MOVE</span>
              </div>

              {/* Dynamic Map Color Scale Bar */}
              <ColorScaleBar activeParams={activeParams} />

              {/* 3D Reticle Leader-Line Screen Overlay */}
              {reticleScreenPos && (
                <div
                  className="reticle-target-callout font-vt323"
                  style={{
                    position: 'absolute',
                    left: reticleScreenPos.x + 18,
                    top: reticleScreenPos.y - 28,
                    pointerEvents: 'none'
                  }}
                >
                  <div className="callout-reticle-line" />
                  <div className="callout-reticle-badge">
                    {autoPlayEnabled ? (
                      // during the satellite route: just the place, no coordinates
                      <span className="reticle-latlon">Above {telemetry.spokenPlace}</span>
                    ) : (
                      <>
                        <span className="reticle-latlon">
                          {Math.abs(probeLat).toFixed(1)}°{probeLat >= 0 ? 'N' : 'S'} / {Math.abs(probeLon).toFixed(1)}°{probeLon >= 0 ? 'E' : 'W'}
                        </span>
                        <span className="reticle-place">{telemetry.nearestRegion}</span>
                      </>
                    )}
                  </div>
                </div>
              )}
            </section>

            {/* Right Telemetry Column */}
            <HudRightPanel
              telemetry={telemetry}
              scanAngle={((probeLon + 180) % 360)}
              autoPlayEnabled={autoPlayEnabled}
              selectedSource={selectedSource}
              selectedDest={selectedDest}
              onSelectSource={setSelectedSource}
              onSelectDest={setSelectedDest}
              routeBpm={routeBpm}
              onBpmChange={setRouteBpm}
              onApplyPreset={handleApplyPreset}
              savedPresets={savedPresets}
              onSaveCurrentRoute={handleSaveCurrentRoute}
              narratorActive={isSpeaking}
            />
          </main>

          {/* Bottom Docking Console: 4-Track DJ Mixer & Step Visualizer */}
          <DjConsole
            telemetry={telemetry}
            onHoverParam={(param, e) => {
              setHoverParam(param);
              if (e) setHoverPos({ x: e.clientX, y: e.clientY });
              else setHoverPos(null);
            }}
          />

          {/* Hover Tooltip with Angled Leader Line */}
          <LeaderLineTooltip paramId={hoverParam} cursorPos={hoverPos} />

          {/* NASA SVS Dataset Ingestion Drawer */}
          <NasaLoaderDrawer
            isOpen={isNasaDrawerOpen}
            onClose={() => setIsNasaDrawerOpen(false)}
            onLoadCustomTexture={(param, url) => {
              console.log('Custom NASA texture loaded for', param, url);
            }}
          />
        </div>
      </div>
    </div>
  );
};