// VerticalMeters.tsx
// Dual vertical pixel level bars with white arrow indicators + oversized digital counters (441 / 807 style)
// Showing Peak Canopy Elevation (m) and Master Tempo / Sonification Hz

import React, { useEffect, useState } from 'react';
import { CanopyColumnData, DJMixerState, HoverTooltipInfo } from '../types/forest';
import { globalSynthEngine } from '../audio/ForestSynthEngine';

interface VerticalMetersProps {
  telemetry: CanopyColumnData;
  mixerState: DJMixerState;
  onSetHoverTooltip: (info: HoverTooltipInfo | null) => void;
}

export const VerticalMeters: React.FC<VerticalMetersProps> = ({ telemetry, mixerState, onSetHoverTooltip }) => {
  const [audioLevelLeft, setAudioLevelLeft] = useState(0.4);
  const [audioLevelRight, setAudioLevelRight] = useState(0.4);

  // Read Web Audio analyser for VU meter animation
  useEffect(() => {
    let animId: number;
    const freqData = new Uint8Array(64);

    const update = () => {
      globalSynthEngine.getFrequencyData(freqData);

      // Bass energy (CH1/CH2)
      let lowSum = 0;
      for (let i = 0; i < 16; i++) lowSum += freqData[i];
      const lowNorm = lowSum / (16 * 255);

      // Treble energy (CH3/CH4)
      let highSum = 0;
      for (let i = 16; i < 48; i++) highSum += freqData[i];
      const highNorm = highSum / (32 * 255);

      setAudioLevelLeft(Math.max(0.1, lowNorm * 1.5));
      setAudioLevelRight(Math.max(0.1, highNorm * 1.5));

      animId = requestAnimationFrame(update);
    };

    update();
    return () => cancelAnimationFrame(animId);
  }, []);

  // Total meter segments
  const totalSegments = 20;
  const activeLeftCount = Math.round(Math.min(1, audioLevelLeft) * totalSegments);
  const activeRightCount = Math.round(
    Math.min(1, telemetry.maxCanopyHeight / 60) * totalSegments
  );

  return (
    <div
      className="hud-panel panel-top-right"
      onMouseEnter={() =>
        onSetHoverTooltip({
          visible: true,
          x: 0,
          y: 0,
          title: 'ACOUSTIC & ELEVATION METERS',
          parameterName: 'Peak Canopy & Master Acoustic VU',
          gediMetric: 'RH98 & VU',
          currentValue: `${Math.round(telemetry.maxCanopyHeight)}m / ${mixerState.chForest.frequency}Hz`,
          units: 'm & Hz',
          percentageValue: (telemetry.maxCanopyHeight / 60) * 100,
          barColor: '#ff2255',
          scientificDescription: 'Live digital counters showing peak vegetation height and active synthesizer carrier frequencies.',
          soundDescription: 'Visualizes master audio output level and acoustic harmonic lock frequencies.',
        })
      }
      onMouseLeave={() => onSetHoverTooltip(null)}
    >
      <div className="hud-panel-header hud-panel-header-crimson">
        <span>BIO-METERS & COUNTERS</span>
        <span style={{ color: '#ffffff', fontSize: '8px' }}>CALIB OK</span>
      </div>

      <div className="hud-panel-body" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '6px' }}>
        {/* Top Digital Counters */}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
          <div style={{ background: '#000c26', border: '1px solid #003388', padding: '4px 6px', flex: 1 }}>
            <div style={{ fontSize: '7px', color: '#88aacc', fontFamily: 'var(--font-retro-pixel)' }}>PEAK CANOPY</div>
            <div className="big-digital-counter counter-crimson">
              {Math.round(telemetry.maxCanopyHeight).toString().padStart(3, '0')}
              <span style={{ fontSize: '14px', color: '#ffffff' }}>m</span>
            </div>
          </div>

          <div style={{ background: '#000c26', border: '1px solid #003388', padding: '4px 6px', flex: 1 }}>
            <div style={{ fontSize: '7px', color: '#88aacc', fontFamily: 'var(--font-retro-pixel)' }}>HARMONIC TONE</div>
            <div className="big-digital-counter counter-cyan">
              {mixerState.chForest.frequency.toString().padStart(4, '0')}
              <span style={{ fontSize: '13px', color: '#00ff88' }}>Hz</span>
            </div>
          </div>
        </div>

        {/* Dual Vertical Pixel VU Meters with Needle Indicators */}
        <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', marginTop: '2px' }}>
          {/* Left Meter: Sonification Audio Level */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '7px', color: '#00ccff' }}>VU ACOUSTIC</span>
            <div className="v-meter-strip">
              {/* White Needle Arrow */}
              <div
                className="v-meter-needle"
                style={{
                  bottom: `${Math.min(132, Math.max(0, audioLevelLeft * 135))}px`,
                }}
              />
              {Array.from({ length: totalSegments }).map((_, i) => {
                const isActive = i < activeLeftCount;
                let colorClass = 'active-green';
                if (i >= 16) colorClass = 'active-red';
                else if (i >= 12) colorClass = 'active-yellow';

                return (
                  <div
                    key={i}
                    className={`v-meter-segment ${isActive ? colorClass : ''}`}
                  />
                );
              })}
            </div>
            <span style={{ fontSize: '8px', color: '#00ff66', fontFamily: 'var(--font-mono-term)' }}>
              {Math.round(audioLevelLeft * 100)}%
            </span>
          </div>

          {/* Center Info Strip */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              fontFamily: 'var(--font-mono-term)',
              fontSize: '12px',
              color: '#88aacc',
              textAlign: 'center',
            }}
          >
            <div>BPM: <span style={{ color: '#ffff00', fontWeight: 'bold' }}>{mixerState.bpm}</span></div>
            <div>GATE: <span style={{ color: '#00ff66' }}>{telemetry.activeZGate.toFixed(0)}m</span></div>
            <div>PAI: <span style={{ color: '#00ffff' }}>{telemetry.plantAreaIndex}</span></div>
            <div style={{ color: '#ff3333', fontSize: '10px' }}>ALERT: NOMINAL</div>
          </div>

          {/* Right Meter: Canopy Elevation Gate Meter */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '7px', color: '#ffff00' }}>RH98 SCALE</span>
            <div className="v-meter-strip">
              {/* White Needle Arrow */}
              <div
                className="v-meter-needle"
                style={{
                  bottom: `${Math.min(132, Math.max(0, (telemetry.maxCanopyHeight / 60) * 135))}px`,
                }}
              />
              {Array.from({ length: totalSegments }).map((_, i) => {
                const isActive = i < activeRightCount;
                let colorClass = 'active-green';
                if (i >= 16) colorClass = 'active-red';
                else if (i >= 12) colorClass = 'active-yellow';

                return (
                  <div
                    key={i}
                    className={`v-meter-segment ${isActive ? colorClass : ''}`}
                  />
                );
              })}
            </div>
            <span style={{ fontSize: '8px', color: '#ffff00', fontFamily: 'var(--font-mono-term)' }}>
              {Math.round(telemetry.maxCanopyHeight)}m
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
