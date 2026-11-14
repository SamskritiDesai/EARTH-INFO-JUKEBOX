// TelemetryStream.tsx
// Classic white pixel monospace vertical readout displaying live 5-parameter coordinates,
// active harmonized chords, and telemetry stream

import React, { useEffect, useState } from 'react';
import { CanopyColumnData, DatasetMode, HoverTooltipInfo } from '../types/forest';
import { globalSynthEngine } from '../audio/ForestSynthEngine';

interface TelemetryStreamProps {
  telemetry: CanopyColumnData;
  datasetMode: DatasetMode;
  onSetHoverTooltip: (info: HoverTooltipInfo | null) => void;
}

export const TelemetryStream: React.FC<TelemetryStreamProps> = ({ telemetry, datasetMode, onSetHoverTooltip }) => {
  const [packetTick, setPacketTick] = useState(1048);
  const [hexRegister, setHexRegister] = useState('0x4F7A');
  const [mixerChord, setMixerChord] = useState(globalSynthEngine.getMixerState().currentChord);

  useEffect(() => {
    const id = setInterval(() => {
      setPacketTick((prev) => (prev + 1) % 9999);
      const hex = Math.floor(Math.random() * 0xffff).toString(16).toUpperCase().padStart(4, '0');
      setHexRegister(`0x${hex}`);
      setMixerChord(globalSynthEngine.getMixerState().currentChord);
    }, 350);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className="hud-panel panel-mid-left"
      onMouseEnter={() =>
        onSetHoverTooltip({
          visible: true,
          x: 0,
          y: 0,
          title: 'EARTH TELEMETRY DATA STREAM',
          parameterName: '5-Parameter Telemetry Stream',
          gediMetric: 'TELEMETRY BUS',
          currentValue: `${telemetry.lat.toFixed(2)}°, ${telemetry.lon.toFixed(2)}°`,
          units: 'Degrees',
          percentageValue: 75,
          barColor: '#00ccff',
          scientificDescription: 'Real-time telemetry column integrating GEDI LiDAR, GEOS Aerosols, Air Quality, and DYAMOND CO2.',
          soundDescription: 'Continuously drives the 5 harmonized synth channels in real-time as coordinates shift.',
        })
      }
      onMouseLeave={() => onSetHoverTooltip(null)}
    >
      <div className="hud-panel-header">
        <span>TELEMETRY STREAM</span>
        <span style={{ color: '#00ccff', fontSize: '8px' }}>PKT#{packetTick}</span>
      </div>

      <div
        className="hud-panel-body"
        style={{
          fontFamily: 'var(--font-mono-term)',
          fontSize: '13px',
          lineHeight: '1.25',
          color: '#ffffff',
          overflowY: 'auto',
          padding: '4px 6px',
          background: 'rgba(0, 10, 30, 0.95)',
        }}
      >
        <div style={{ color: '#00ff66', display: 'flex', justifyContent: 'space-between' }}>
          <span>MODE: [{datasetMode}]</span>
          <span>REG: {hexRegister}</span>
        </div>

        {/* Live Active Chord Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#ffff00', fontWeight: 'bold' }}>
          <span>CHORD:</span>
          <span>{mixerChord}</span>
        </div>

        <div style={{ borderBottom: '1px dashed #003388', margin: '3px 0' }} />

        {/* Lat / Lon / Alt */}
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#88bbff' }}>LAT/LON:</span>
          <span style={{ color: '#ffffff' }}>
            {telemetry.lat >= 0 ? `+${telemetry.lat.toFixed(2)}` : telemetry.lat.toFixed(2)}° /{' '}
            {telemetry.lon >= 0 ? `+${telemetry.lon.toFixed(2)}` : telemetry.lon.toFixed(2)}°
          </span>
        </div>

        {/* The 5 Live Parameters */}
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#00ff88' }}>1. GEDI CANOPY:</span>
          <span style={{ color: '#00ff88', fontWeight: 'bold' }}>{telemetry.maxCanopyHeight.toFixed(1)} m</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#00e5ff' }}>2. AIR QUALITY:</span>
          <span style={{ color: '#00e5ff' }}>AQI {telemetry.airQualityIndex}</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#ffff00' }}>3. GEOS AEROSOLS:</span>
          <span style={{ color: '#ffff00' }}>{telemetry.aerosolOpticalDepth.toFixed(2)} AOD</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#00aaff' }}>4. SEA CURRENT:</span>
          <span style={{ color: '#00aaff' }}>{telemetry.oceanCurrentSpeed.toFixed(1)} m/s ({telemetry.seaSurfaceTempC}°C)</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#ff5588' }}>5. DYAMOND CO2:</span>
          <span style={{ color: '#ff5588', fontWeight: 'bold' }}>{telemetry.co2Ppm.toFixed(1)} ppm</span>
        </div>

        <div style={{ borderBottom: '1px dashed #003388', margin: '3px 0' }} />

        {/* Biome & Sync State */}
        <div style={{ color: '#7799bb', fontSize: '11px' }}>
          <div>BIOME: <span style={{ color: '#00ffcc' }}>{telemetry.biomeName}</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>SRC: {telemetry.sourceType}</span>
            <span style={{ color: '#00ff66' }}>HARMONIC LOCK</span>
          </div>
        </div>
      </div>
    </div>
  );
};
