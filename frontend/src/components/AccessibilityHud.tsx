// AccessibilityHud.tsx
// Comprehensive Blind & Low-Vision Accessibility Suite for TERRA-SCAN
// Features: Web Speech API Narrator, Live ARIA Regions, Sonic Scene Transcript,
// High-Legibility Font Switcher, Keyboard Shortcut Modal, and Haptic Feedback Pulses.

import React, { useEffect, useRef, useState } from 'react';
import { CanopyColumnData, PlaybackMode } from '../types/forest';
import { globalSynthEngine } from '../audio/ForestSynthEngine';

interface AccessibilityHudProps {
  telemetry: CanopyColumnData;
  playbackMode: PlaybackMode;
  isNarratorEnabled: boolean;
  isHighLegibility: boolean;
  onToggleNarrator: () => void;
  onToggleHighLegibility: () => void;
  onStepReticle: (dLat: number, dLon: number) => void;
}

export const AccessibilityHud: React.FC<AccessibilityHudProps> = ({
  telemetry,
  playbackMode,
  isNarratorEnabled,
  isHighLegibility,
  onToggleNarrator,
  onToggleHighLegibility,
  onStepReticle,
}) => {
  const [showKeysModal, setShowKeysModal] = useState(false);
  const [showTranscript, setShowTranscript] = useState(true);
  const [transcriptLog, setTranscriptLog] = useState<string[]>([]);
  const lastSpokenRef = useRef<string>('');
  const speakTimeoutRef = useRef<number | null>(null);

  // 1. Synthesize Scene Description into Plain English
  const generateSceneDescription = (): string => {
    const { lat, lon, maxCanopyHeight, airQualityIndex, aerosolOpticalDepth, oceanCurrentSpeed, co2Ppm, biomeName } = telemetry;
    const chord = globalSynthEngine.getMixerState().currentChord;

    const latDir = lat >= 0 ? `${lat.toFixed(0)}° North` : `${Math.abs(lat).toFixed(0)}° South`;
    const lonDir = lon >= 0 ? `${lon.toFixed(0)}° East` : `${Math.abs(lon).toFixed(0)}° West`;

    let narrative = `At ${latDir}, ${lonDir} over ${biomeName}: `;

    if (maxCanopyHeight > 35) {
      narrative += `Tall emergent canopy reaches ${maxCanopyHeight.toFixed(0)}m, driving warm tape-warbled ${chord} keys. `;
    } else {
      narrative += `Canopy elevation is ${maxCanopyHeight.toFixed(0)}m. `;
    }

    if (oceanCurrentSpeed > 0.5) {
      narrative += `Ocean currents flow at ${oceanCurrentSpeed.toFixed(1)} m/s, adding phased liquid electric-piano chords. `;
    }

    if (aerosolOpticalDepth > 0.3) {
      narrative += `Atmospheric aerosols at ${aerosolOpticalDepth.toFixed(2)} AOD add crystalline shimmer bell-plucks. `;
    }

    if (airQualityIndex > 70) {
      narrative += `Elevated particulate levels at AQI ${airQualityIndex}. `;
    }

    narrative += `Carbon dioxide reads ${co2Ppm.toFixed(1)} ppm with deep analog sub-bass resonance.`;
    return narrative;
  };

  // 2. Web Speech API Audio Narrator
  const speakText = (text: string) => {
    if (!isNarratorEnabled || typeof window === 'undefined' || !window.speechSynthesis) return;

    // Debounce to prevent overlapping speech
    if (speakTimeoutRef.current) clearTimeout(speakTimeoutRef.current);

    speakTimeoutRef.current = window.setTimeout(() => {
      if (lastSpokenRef.current === text) return;
      lastSpokenRef.current = text;

      window.speechSynthesis.cancel(); // Cancel any prior speech
      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = 1.05; // Slightly brisk retro terminal speech
      utter.pitch = 0.95;

      // Select english voice if available
      const voices = window.speechSynthesis.getVoices();
      const engVoice = voices.find((v) => v.lang.startsWith('en') && v.name.includes('Natural')) ||
        voices.find((v) => v.lang.startsWith('en'));
      if (engVoice) utter.voice = engVoice;

      window.speechSynthesis.speak(utter);
    }, 400);
  };

  // 3. Update Scene Transcript & Audio Narration on Telemetry Change
  useEffect(() => {
    const desc = generateSceneDescription();
    setTranscriptLog((prev) => [desc, ...prev.slice(0, 8)]);

    // Trigger concise spoken audio
    const conciseSpeech = `${telemetry.biomeName}. Canopy ${telemetry.maxCanopyHeight.toFixed(0)} meters. ${globalSynthEngine.getMixerState().currentChord} chords active.`;
    speakText(conciseSpeech);

    // Tactile Haptic Pulse for low-vision users on extreme values or coastline transitions
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      if (telemetry.maxCanopyHeight > 50 || telemetry.oceanCurrentSpeed > 1.8) {
        navigator.vibrate(35); // 35ms subtle tactile pulse
      }
    }
  }, [telemetry.lat, telemetry.lon, telemetry.biomeName]);

  // 4. Global Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is inside an input field
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      const stepSize = e.shiftKey ? 1 : 5;

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          onStepReticle(stepSize, 0);
          break;
        case 'ArrowDown':
          e.preventDefault();
          onStepReticle(-stepSize, 0);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          onStepReticle(0, -stepSize);
          break;
        case 'ArrowRight':
          e.preventDefault();
          onStepReticle(0, stepSize);
          break;
        case ' ': // Spacebar: Play/Pause
          e.preventDefault();
          globalSynthEngine.togglePlayPause();
          break;
        case 'm':
        case 'M': // M: Toggle Manual vs Auto-Play
          e.preventDefault();
          const nextMode = playbackMode === 'MANUAL_POINTER' ? 'AUTO_PLAY_GLOBE' : 'MANUAL_POINTER';
          globalSynthEngine.setPlaybackMode(nextMode);
          break;
        // Number Keys 1-5: Toggle Layers (or Shift+1-5 for Solo)
        case '1':
        case '!':
          e.preventDefault();
          if (e.shiftKey) globalSynthEngine.toggleSolo('chForest');
          else globalSynthEngine.toggleMute('chForest');
          break;
        case '2':
        case '@':
          e.preventDefault();
          if (e.shiftKey) globalSynthEngine.toggleSolo('chAir');
          else globalSynthEngine.toggleMute('chAir');
          break;
        case '3':
        case '#':
          e.preventDefault();
          if (e.shiftKey) globalSynthEngine.toggleSolo('chAerosols');
          else globalSynthEngine.toggleMute('chAerosols');
          break;
        case '4':
        case '$':
          e.preventDefault();
          if (e.shiftKey) globalSynthEngine.toggleSolo('chOcean');
          else globalSynthEngine.toggleMute('chOcean');
          break;
        case '5':
        case '%':
          e.preventDefault();
          if (e.shiftKey) globalSynthEngine.toggleSolo('chCo2');
          else globalSynthEngine.toggleMute('chCo2');
          break;
        case '?':
          setShowKeysModal((prev) => !prev);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onStepReticle, playbackMode]);

  return (
    <>
      {/* Hidden ARIA Live Status Region for Screen Readers */}
      <div
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          padding: 0,
          margin: '-1px',
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          border: 0,
        }}
      >
        {transcriptLog[0] || 'Terra-Scan Ready'}
      </div>

      {/* Top HUD Accessibility Control Buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        {/* Narrator Speech Toggle */}
        <button
          className={`pixel-btn ${isNarratorEnabled ? 'pixel-btn-active' : ''}`}
          style={{ fontSize: '8px', padding: '3px 8px' }}
          onClick={onToggleNarrator}
          aria-pressed={isNarratorEnabled}
          aria-label="Toggle Spoken Audio Narrator"
          title="Enable spoken audio descriptions of active biomes and chords"
        >
          {isNarratorEnabled ? '🔊 NARRATOR: ON' : '🔈 NARRATOR: OFF'}
        </button>

        {/* High-Legibility Font Switcher */}
        <button
          className={`pixel-btn ${isHighLegibility ? 'pixel-btn-active' : ''}`}
          style={{ fontSize: '8px', padding: '3px 8px' }}
          onClick={onToggleHighLegibility}
          aria-pressed={isHighLegibility}
          aria-label="Toggle High-Legibility Large Font Mode"
          title="Switch to high-contrast oversized font for low-vision reading"
        >
          {isHighLegibility ? 'Aa HIGH-LEGIBILITY' : 'Aa PIXEL FONT'}
        </button>

        {/* Keyboard Shortcuts Guide Button */}
        <button
          className="pixel-btn"
          style={{ fontSize: '8px', padding: '3px 6px' }}
          onClick={() => setShowKeysModal(true)}
          aria-label="Open Keyboard Navigation Shortcuts Guide"
          title="Full keyboard navigation instructions"
        >
          [ ? KEYS ]
        </button>

        {/* Sonic Transcript Toggle */}
        <button
          className={`pixel-btn ${showTranscript ? 'pixel-btn-active' : ''}`}
          style={{ fontSize: '8px', padding: '3px 6px' }}
          onClick={() => setShowTranscript(!showTranscript)}
          aria-expanded={showTranscript}
          aria-label="Toggle Sonic Scene Transcript Panel"
        >
          {showTranscript ? '▼ TRANSCRIPT' : '▲ TRANSCRIPT'}
        </button>
      </div>

      {/* Rich Descriptive Scene Transcript Panel (Collapsible floating card) */}
      {showTranscript && (
        <div
          style={{
            position: 'absolute',
            bottom: '210px',
            right: '10px',
            width: '320px',
            maxHeight: '135px',
            backgroundColor: 'rgba(0, 12, 36, 0.94)',
            border: '2px solid #00ff88',
            boxShadow: '0 0 12px rgba(0, 255, 136, 0.35)',
            zIndex: 40,
            display: 'flex',
            flexDirection: 'column',
            padding: '6px 8px',
            overflow: 'hidden',
          }}
          role="region"
          aria-label="Live Sonic Scene Transcript"
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '1px solid #005522',
              paddingBottom: '3px',
              marginBottom: '4px',
              fontFamily: 'var(--font-retro-pixel)',
              fontSize: '8px',
              color: '#00ff88',
            }}
          >
            <span>[ SONIC TRANSCRIPT ]</span>
            <span style={{ fontSize: '7px', color: '#88ccff' }}>LIVE NARRATIVE</span>
          </div>

          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              fontFamily: 'var(--font-tech)',
              fontSize: '11px',
              lineHeight: '1.35',
              color: '#d0e5ff',
            }}
          >
            {transcriptLog.map((entry, idx) => (
              <div
                key={idx}
                style={{
                  marginBottom: '4px',
                  opacity: idx === 0 ? 1 : Math.max(0.3, 1 - idx * 0.2),
                  color: idx === 0 ? '#ffffff' : '#88aacc',
                }}
              >
                {idx === 0 ? '► ' : '• '} {entry}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Reference Modal */}
      {showKeysModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.82)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="keys-modal-title"
        >
          <div
            style={{
              width: '460px',
              backgroundColor: '#001438',
              border: '3px solid #00ff66',
              boxShadow: '0 0 24px rgba(0, 255, 102, 0.5)',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              color: '#ffffff',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #00ff66', paddingBottom: '6px' }}>
              <span id="keys-modal-title" style={{ fontFamily: 'var(--font-retro-pixel)', fontSize: '11px', color: '#00ff66' }}>
                ACCESSIBILITY & KEYBOARD SHORTCUTS
              </span>
              <button
                className="pixel-btn pixel-btn-crimson"
                style={{ fontSize: '8px', padding: '2px 6px' }}
                onClick={() => setShowKeysModal(false)}
                aria-label="Close keyboard shortcuts dialog"
              >
                ✕ CLOSE
              </button>
            </div>

            <div style={{ fontFamily: 'var(--font-tech)', fontSize: '13px', lineHeight: '1.5', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div><strong style={{ color: '#00e5ff' }}>Arrow Keys (↑ ↓ ← →):</strong> Move target reticle across Latitude & Longitude in 5° steps (1° with Shift).</div>
              <div><strong style={{ color: '#ffff00' }}>Number Keys (1 – 5):</strong> Toggle mute on/off for each layer (1: Forest, 2: Air, 3: Aerosols, 4: Ocean, 5: CO2).</div>
              <div><strong style={{ color: '#ffea00' }}>Shift + 1 – 5:</strong> Solo individual parameter channel.</div>
              <div><strong style={{ color: '#00ff66' }}>Spacebar:</strong> Play / Pause audio synthesis clock.</div>
              <div><strong style={{ color: '#ff88aa' }}>M Key:</strong> Toggle between [ MANUAL POINTER ] and [ AUTO-PLAY WHOLE GLOBE ].</div>
              <div><strong style={{ color: '#ffffff' }}>Tab / Enter:</strong> Standard keyboard focus navigation with high-visibility green focus rings.</div>
            </div>

            <div style={{ borderTop: '1px solid #004488', paddingTop: '6px', fontSize: '10px', color: '#88aacc', fontFamily: 'var(--font-retro-pixel)' }}>
              PRESS ESCAPE OR CLICK CLOSE TO RETURN
            </div>
          </div>
        </div>
      )}
    </>
  );
};
