import React, { useEffect, useRef, useState } from 'react';
import { ParameterId, SampledEarthTelemetry, PARAMETERS } from '../data/earthDataEngine';
import { synthEngine, ChannelControl } from '../audio/ThemedChordEngine';
import { Sliders, VolumeX, Radio, Music } from 'lucide-react';

interface DjConsoleProps {
  telemetry: SampledEarthTelemetry;
  onHoverParam?: (id: ParameterId | null, event?: React.MouseEvent) => void;
}

// 12-Tone Semitone Array for 16-Bit Pixel Keyboard Strip
const PIANO_KEYS = [
  { note: 'C', isBlack: false, freqApprox: 130 },
  { note: 'C#', isBlack: true, freqApprox: 138 },
  { note: 'D', isBlack: false, freqApprox: 146 },
  { note: 'D#', isBlack: true, freqApprox: 155 },
  { note: 'E', isBlack: false, freqApprox: 164 },
  { note: 'F', isBlack: false, freqApprox: 174 },
  { note: 'F#', isBlack: true, freqApprox: 185 },
  { note: 'G', isBlack: false, freqApprox: 196 },
  { note: 'G#', isBlack: true, freqApprox: 207 },
  { note: 'A', isBlack: false, freqApprox: 220 },
  { note: 'A#', isBlack: true, freqApprox: 233 },
  { note: 'B', isBlack: false, freqApprox: 246 },
  { note: 'C2', isBlack: false, freqApprox: 261 },
  { note: 'D2', isBlack: false, freqApprox: 293 },
  { note: 'E2', isBlack: false, freqApprox: 329 },
  { note: 'F2', isBlack: false, freqApprox: 349 },
  { note: 'G2', isBlack: false, freqApprox: 392 },
  { note: 'A2', isBlack: false, freqApprox: 440 }
];

export const DjConsole: React.FC<DjConsoleProps> = ({ telemetry, onHoverParam }) => {
  const [channels, setChannels] = useState<Record<ParameterId, ChannelControl>>(
    synthEngine.getChannelControls()
  );
  const [crossfaderVal, setCrossfaderVal] = useState(synthEngine.getCrossfaderPosition());
  const oscCanvasRef = useRef<HTMLCanvasElement>(null);
  const timeDataRef = useRef(new Uint8Array(256));

  // Sync channel state
  const handleVolumeChange = (param: ParameterId, val: number) => {
    synthEngine.setChannelVolume(param, val);
    setChannels({ ...synthEngine.getChannelControls() });
  };

  const handleToggleMute = (param: ParameterId) => {
    synthEngine.toggleMute(param);
    setChannels({ ...synthEngine.getChannelControls() });
  };

  const handleToggleSolo = (param: ParameterId) => {
    synthEngine.toggleSolo(param);
    setChannels({ ...synthEngine.getChannelControls() });
  };

  const handleCutoffChange = (param: ParameterId, val: number) => {
    synthEngine.setChannelCutoff(param, val);
    setChannels({ ...synthEngine.getChannelControls() });
  };

  const handleCrossfaderChange = (val: number) => {
    setCrossfaderVal(val);
    synthEngine.updateCrossfader(val);
  };

  // Oscilloscope Animation Loop
  useEffect(() => {
    let animId: number;
    const canvas = oscCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const renderOscilloscope = () => {
      animId = requestAnimationFrame(renderOscilloscope);
      synthEngine.getAudioTimeDomainData(timeDataRef.current);

      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // CRT Grid
      ctx.strokeStyle = '#001a44';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, h / 2);
      ctx.lineTo(w, h / 2);
      ctx.stroke();

      // Jagged Cyan / Red Waveform
      ctx.beginPath();
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 2;
      const sliceWidth = w / 256;
      let x = 0;

      for (let i = 0; i < 256; i++) {
        const v = timeDataRef.current[i] / 128.0; // 0..2
        const y = (v * h) / 2;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        x += sliceWidth;
      }
      ctx.stroke();
    };

    renderOscilloscope();
    return () => cancelAnimationFrame(animId);
  }, []);

  const paramKeys: ParameterId[] = ['sst', 'aerosols', 'co2', 'forest'];
  const activeNotes = synthEngine.getActiveNotes();

  return (
    <footer className="hud-dj-console pixel-panel-blue" role="region" aria-label="4-Track DJ Mixing Console">
      <div className="console-main-row">
        {/* 4 Dedicated Parameter Channel Strips */}
        <div className="channel-strips-grid">
          {paramKeys.map((pId, idx) => {
            const meta = PARAMETERS[pId];
            const ctrl = channels[pId];
            const isAvail = telemetry[pId].available;

            return (
              <div
                key={pId}
                className={`channel-strip-box ${!isAvail ? 'unavailable' : ''}`}
                onMouseEnter={(e) => onHoverParam?.(pId, e)}
                onMouseLeave={() => onHoverParam?.(null)}
              >
                {/* Header */}
                <div className="channel-header">
                  <span className="channel-index font-vt323">CH {idx + 1}</span>
                  <span className="channel-label">{meta.shortLabel}</span>
                </div>

                {/* Status / Unavailable Badge */}
                {!isAvail ? (
                  <div className="unavailable-alert-badge">
                    <VolumeX size={12} />
                    <span>DATA NOT AVAILABLE</span>
                  </div>
                ) : (
                  <div className="channel-tone-badge font-vt323">
                    {meta.voiceStyle.split(' ')[0]} Chords
                  </div>
                )}

                {/* Channel Fader & Mini VU Row */}
                <div className="fader-controls-row">
                  {/* Vertical Rainbow Volume Fader */}
                  <div className="vertical-fader-wrap">
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={ctrl.volume}
                      disabled={!isAvail}
                      onChange={(e) => handleVolumeChange(pId, Number(e.target.value))}
                      className="vertical-slider"
                      aria-label={`${meta.shortLabel} volume`} aria-valuetext={`${Math.round(ctrl.volume * 100)} percent`}
                    />
                    <span className="fader-val-label font-vt323">
                      {Math.round(ctrl.volume * 100)}%
                    </span>
                  </div>

                  {/* Rotary / Range Filter Knobs */}
                  <div className="filter-knobs-column font-vt323">
                    <div className="knob-subgroup">
                      <span className="knob-label">CUTOFF</span>
                      <input
                        type="range"
                        min="200"
                        max="4500"
                        step="50"
                        value={ctrl.cutoff}
                        disabled={!isAvail}
                        onChange={(e) => handleCutoffChange(pId, Number(e.target.value))}
                        className="hud-mini-range"
                        aria-label={`${meta.shortLabel} filter`}
                        aria-valuetext={`${Math.round(ctrl.cutoff)} hertz`}
                      />
                      <span className="knob-val">{Math.round(ctrl.cutoff)}Hz</span>
                    </div>

                    {/* Mute & Solo Buttons */}
                    <div className="mute-solo-btns-row">
                      <button
                        className={`mute-btn ${ctrl.muted ? 'active-mute' : ''}`}
                        onClick={() => handleToggleMute(pId)}
                        disabled={!isAvail}
                        title="Mute Channel"
                        aria-label={`${meta.shortLabel} mute`}
                        aria-pressed={ctrl.muted}
                      >
                        M
                      </button>
                      <button
                        className={`solo-btn ${ctrl.solo ? 'active-solo' : ''}`}
                        onClick={() => handleToggleSolo(pId)}
                        disabled={!isAvail}
                        title="Solo Channel"
                        aria-label={`${meta.shortLabel} solo`}
                        aria-pressed={ctrl.solo}
                      >
                        S
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Center DJ Crossfader Section */}
        <div className="console-crossfader-section">
          <div className="crossfader-title font-vt323">
            <span>BANK A</span>
            <span className="crossfader-legend">DJ CROSSFADER</span>
            <span>BANK B</span>
          </div>

          <div className="crossfader-banks-desc font-vt323">
            <span>[SST + AERO]</span>
            <span>[CO2 + CANOPY]</span>
          </div>

          <div className="crossfader-slider-wrap">
            <input
              type="range"
              min="-1"
              max="1"
              step="0.02"
              value={crossfaderVal}
              onChange={(e) => handleCrossfaderChange(Number(e.target.value))}
              className="hud-horizontal-crossfader"
              aria-label="Crossfader" aria-valuetext={crossfaderVal < -0.1 ? `Bank A ${Math.round(Math.abs(crossfaderVal) * 100)} percent` : crossfaderVal > 0.1 ? `Bank B ${Math.round(crossfaderVal * 100)} percent` : 'centre'}
            />
          </div>

          <div className="crossfader-readout font-vt323">
            BALANCE: {crossfaderVal < -0.1 ? `BANK A ${Math.round(Math.abs(crossfaderVal) * 100)}%` : crossfaderVal > 0.1 ? `BANK B ${Math.round(crossfaderVal * 100)}%` : 'EQUAL CENTER'}
          </div>
        </div>

        {/* Right Section: Real-Time Oscilloscope Waveform */}
        <div className="console-oscilloscope-section">
          <div className="oscilloscope-header font-vt323">
            <Radio size={12} className="icon-cyan" />
            <span>REAL-TIME OSCILLOSCOPE</span>
          </div>
          <div className="osc-canvas-wrapper">
            <canvas ref={oscCanvasRef} width={180} height={70} className="osc-canvas" />
          </div>
        </div>
      </div>

      {/* 16-Bit Pixel Keyboard Strip along bottom */}
      <div className="pixel-keyboard-strip" aria-hidden="true">
        <div className="keyboard-header-label font-vt323">
          <Music size={12} style={{ display: 'inline', marginRight: 4 }} />
          <span>HARMONIC MATRIX: C MAJOR PENTATONIC // F LYDIAN</span>
        </div>
        <div className="keyboard-keys-container">
          {PIANO_KEYS.map((k, idx) => {
            // Check if this key corresponds to an actively playing note
            const isActive = activeNotes.some(n => {
              const diff = Math.abs(n.freq - k.freqApprox);
              return diff < 15;
            });

            return (
              <div
                key={idx}
                className={`pixel-key ${k.isBlack ? 'black-key' : 'white-key'} ${isActive ? 'active-triggered' : ''}`}
                title={`Note: ${k.note} (~${k.freqApprox}Hz)`}
              >
                <span className="key-note-label font-vt323">{k.note}</span>
              </div>
            );
          })}
        </div>
      </div>
    </footer>
  );
};