// RegionSelector.tsx
// Territory & Forest Biome Selector + Automated Ensemble Sweep Controls + Z-Gate Altitude Slider

import React from 'react';
import { DatasetMode, HoverTooltipInfo, PlaybackMode, RegionBiome, ScanAxisConfig } from '../types/forest';

export const BUILTIN_REGIONS: RegionBiome[] = [
  {
    id: 'amazon',
    name: 'Amazon Basin // Brazil',
    shortLabel: 'AMAZON',
    lat: -3.46,
    lon: -62.21,
    zoomDist: 3.2,
    canopyAvg: 54,
    dominantTrees: 'Bertholletia excelsa (Brazil Nut), Cecropia',
    description: 'Dense tropical emergent rainforest with super-canopy spires exceeding 55m.',
  },
  {
    id: 'congo',
    name: 'Congo Basin // Central Africa',
    shortLabel: 'CONGO',
    lat: -0.78,
    lon: 21.50,
    zoomDist: 3.2,
    canopyAvg: 48,
    dominantTrees: 'Entandrophragma (Sapele), Guibourtia demeusei',
    description: 'Second largest contiguous tropical rainforest on Earth with multi-tier canopy.',
  },
  {
    id: 'borneo',
    name: 'Borneo Rainforest // Indonesia',
    shortLabel: 'BORNEO',
    lat: 0.96,
    lon: 114.50,
    zoomDist: 3.2,
    canopyAvg: 56,
    dominantTrees: 'Shorea faguetiana (Yellow Meranti 100m+)',
    description: 'Home of the tallest tropical angiosperm trees on Earth.',
  },
  {
    id: 'pnw',
    name: 'Pacific Northwest // Cascadia',
    shortLabel: 'PNW',
    lat: 46.85,
    lon: -121.76,
    zoomDist: 3.4,
    canopyAvg: 58,
    dominantTrees: 'Pseudotsuga menziesii (Douglas Fir), Redwoods',
    description: 'Temperate giant coniferous forest with immense biomass density.',
  },
  {
    id: 'siberia',
    name: 'Boreal Taiga // Siberia',
    shortLabel: 'SIBERIA',
    lat: 60.00,
    lon: 105.00,
    zoomDist: 3.6,
    canopyAvg: 24,
    dominantTrees: 'Larix sibirica (Siberian Larch), Pinus sylvestris',
    description: 'Continuous circumpolar boreal coniferous belt adapted to extreme cold.',
  },
  {
    id: 'valdivia',
    name: 'Valdivian Rainforest // Chile',
    shortLabel: 'VALDIVIA',
    lat: -40.10,
    lon: -72.50,
    zoomDist: 3.5,
    canopyAvg: 42,
    dominantTrees: 'Fitzroya cupressoides (Alerce), Nothofagus',
    description: 'Ancient southern temperate rainforest rich in endemic conifer relics.',
  },
  {
    id: 'daintree',
    name: 'Daintree Rainforest // Australia',
    shortLabel: 'DAINTREE',
    lat: -16.20,
    lon: 145.40,
    zoomDist: 3.4,
    canopyAvg: 44,
    dominantTrees: 'Idiospermum australiense (Ribbonwood)',
    description: 'One of the oldest surviving tropical rainforest ecosystems.',
  },
  {
    id: 'bialowieza',
    name: 'Bialowieza Primeval // Europe',
    shortLabel: 'BIALOWIEZA',
    lat: 52.70,
    lon: 23.80,
    zoomDist: 3.5,
    canopyAvg: 34,
    dominantTrees: 'Quercus robur (English Oak), Picea abies',
    description: 'Last remnants of primary lowland European primeval mixed forest.',
  },
];

export const BUILTIN_SCAN_AXES: ScanAxisConfig[] = [
  { id: 'equator', name: 'Equator (0.0° Lat)', type: 'LATITUDE', value: 0.0, description: 'Sweeps tropical rainforest belt across Americas, Africa, Indonesia' },
  { id: 'cancer', name: 'Tropic of Cancer (23.5°N)', type: 'LATITUDE', value: 23.5, description: 'Sweeps subtropical dry forest and monsoon woodlands' },
  { id: 'boreal', name: 'Boreal Belt (60.0°N)', type: 'LATITUDE', value: 60.0, description: 'Sweeps circumpolar taiga spires through Siberia, Canada, Norway' },
  { id: 'capricorn', name: 'Tropic of Capricorn (23.5°S)', type: 'LATITUDE', value: -23.5, description: 'Sweeps southern subtropical forests and savannas' },
  { id: 'meridian', name: 'Prime Meridian (0.0° Lon)', type: 'LONGITUDE', value: 0.0, description: 'Vertical polar sweep across Europe, Africa, and oceans' },
];

interface RegionSelectorProps {
  playbackMode: PlaybackMode;
  onSetPlaybackMode: (mode: PlaybackMode) => void;
  activeRegion: RegionBiome | null;
  onSelectRegion: (region: RegionBiome) => void;
  activeScanAxis: ScanAxisConfig;
  onSelectScanAxis: (axis: ScanAxisConfig) => void;
  scanRPM: number;
  onSetScanRPM: (rpm: number) => void;
  isScanning: boolean;
  onToggleScanning: () => void;
  zElevationGate: number;
  onSetZElevationGate: (z: number) => void;
  datasetMode: DatasetMode;
  onSetHoverTooltip: (info: HoverTooltipInfo | null) => void;
}

export const RegionSelector: React.FC<RegionSelectorProps> = ({
  playbackMode,
  onSetPlaybackMode,
  activeRegion,
  onSelectRegion,
  activeScanAxis,
  onSelectScanAxis,
  scanRPM,
  onSetScanRPM,
  isScanning,
  onToggleScanning,
  zElevationGate,
  onSetZElevationGate,
  datasetMode,
  onSetHoverTooltip,
}) => {
  return (
    <div
      className="hud-panel panel-mid-right"
      onMouseEnter={() =>
        onSetHoverTooltip({
          visible: true,
          x: 0,
          y: 0,
          title: 'PLAYBACK & REGION CONSOLE',
          parameterName: 'Navigation & Biome Selector',
          gediMetric: 'NAV BUS',
          currentValue: playbackMode === 'AUTO_PLAY_GLOBE' ? 'AUTO-SWEEP' : activeRegion?.shortLabel || 'POINT',
          units: 'MODE',
          percentageValue: playbackMode === 'AUTO_PLAY_GLOBE' ? 100 : 50,
          barColor: '#00ff66',
          scientificDescription: 'Allows switching between manual coordinate probing and hands-free whole globe automated sweep.',
          soundDescription: 'Manual Mode plays exact coordinates; Auto-Play sweeps coordinates to play an evolving chord composition.',
        })
      }
      onMouseLeave={() => onSetHoverTooltip(null)}
    >
      <div className="hud-panel-header hud-panel-header-green">
        <span>NAVIGATION & SCAN AXIS</span>
        <span style={{ fontSize: '8px', color: '#00ff66' }}>
          {playbackMode === 'AUTO_PLAY_GLOBE' ? 'AUTO 360°' : 'MANUAL'}
        </span>
      </div>

      <div className="hud-panel-body" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '6px' }}>
        {/* Playback Mode Radio Toggle */}
        <div style={{ display: 'flex', gap: '3px' }}>
          <button
            className={`pixel-btn ${playbackMode === 'MANUAL_POINTER' ? 'pixel-btn-active' : ''}`}
            style={{ flex: 1, fontSize: '7px', padding: '3px 2px', justifyContent: 'center' }}
            onClick={() => onSetPlaybackMode('MANUAL_POINTER')}
          >
            [ MANUAL POINTER ]
          </button>
          <button
            className={`pixel-btn ${playbackMode === 'AUTO_PLAY_GLOBE' ? 'pixel-btn-active' : ''}`}
            style={{ flex: 1, fontSize: '7px', padding: '3px 2px', justifyContent: 'center' }}
            onClick={() => onSetPlaybackMode('AUTO_PLAY_GLOBE')}
          >
            [ AUTO-PLAY GLOBE ]
          </button>
        </div>

        {/* Content based on Playback Mode */}
        {playbackMode === 'MANUAL_POINTER' ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px', overflowY: 'auto', maxHeight: '140px' }}>
            <div style={{ fontSize: '7px', color: '#00ccff', marginBottom: '2px' }}>CLICK TO JUMP & SONIFY BIOME:</div>
            {BUILTIN_REGIONS.map((r) => {
              const isSelected = activeRegion?.id === r.id;
              return (
                <button
                  key={r.id}
                  className={`pixel-btn ${isSelected ? 'pixel-btn-active' : ''}`}
                  style={{
                    fontSize: '8px',
                    justifyContent: 'space-between',
                    padding: '3px 6px',
                    background: isSelected ? 'var(--matrix-green-bright)' : '#001438',
                    color: isSelected ? '#000' : '#fff',
                  }}
                  onClick={() => onSelectRegion(r)}
                >
                  <span>{r.shortLabel}</span>
                  <span style={{ fontSize: '7px', opacity: 0.8 }}>{r.canopyAvg}m RH98</span>
                </button>
              );
            })}
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ fontSize: '7px', color: '#00ff66' }}>SELECT LASER READ-HEAD AXIS:</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              {BUILTIN_SCAN_AXES.map((axis) => {
                const isSelected = activeScanAxis.id === axis.id;
                return (
                  <button
                    key={axis.id}
                    className={`pixel-btn ${isSelected ? 'pixel-btn-active' : ''}`}
                    style={{ fontSize: '7px', justifyContent: 'space-between', padding: '3px 6px' }}
                    onClick={() => onSelectScanAxis(axis)}
                  >
                    <span>{axis.name}</span>
                    <span style={{ color: isSelected ? '#000' : '#00e5ff' }}>SELECT</span>
                  </button>
                );
              })}
            </div>

            {/* Sweep Play / Pause & RPM slider */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '2px' }}>
              <button
                className={`pixel-btn ${isScanning ? 'pixel-btn-crimson' : 'pixel-btn-green'}`}
                style={{ fontSize: '8px', padding: '4px 8px' }}
                onClick={onToggleScanning}
              >
                {isScanning ? '■ PAUSE ROTATION' : '▶ RESUME SWEEP'}
              </button>
              <div style={{ fontSize: '8px', color: '#ffff00', fontFamily: 'var(--font-mono-term)' }}>
                SPEED: {scanRPM} RPM
              </div>
            </div>
            <input
              type="range"
              min={2}
              max={30}
              value={scanRPM}
              onChange={(e) => onSetScanRPM(Number(e.target.value))}
              style={{ width: '100%', accentColor: '#00ff66' }}
            />
          </div>
        )}

        {/* Z-Axis Altitude Scrubbing Gate */}
        <div
          style={{
            background: '#001035',
            border: '1px solid #0044aa',
            padding: '5px 6px',
            display: 'flex',
            flexDirection: 'column',
            gap: '3px',
          }}
          onMouseEnter={() =>
            onSetHoverTooltip({
              visible: true,
              x: 0,
              y: 0,
              title: 'Z-AXIS ALTITUDE ELEVATION GATE',
              parameterName: 'Vertical Altitude Filter',
              gediMetric: 'Z-GATE [m]',
              currentValue: `${zElevationGate.toFixed(0)} m`,
              units: 'Meters',
              percentageValue: (zElevationGate / 60) * 100,
              barColor: '#ff0055',
              scientificDescription: 'Scrubs vertical slice cross-section through canopy voxels (0m ground to 60m emergent crown).',
              soundDescription: 'Filters out upper canopy layers, muting shimmering leads and leaving only understory drones.',
            })
          }
          onMouseLeave={() => onSetHoverTooltip(null)}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '7px' }}>
            <span style={{ color: '#00ccff' }}>Z-AXIS ELEVATION GATE</span>
            <span
              style={{
                fontSize: '6px',
                padding: '1px 3px',
                background: datasetMode === '3D_VOLUMETRIC' ? '#007722' : '#770000',
                color: '#fff',
                border: '1px solid #fff',
              }}
            >
              {datasetMode === '3D_VOLUMETRIC' ? 'VOXEL NATIVE' : 'SYNTHESIZED PROFILE'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <input
              type="range"
              min={0}
              max={60}
              step={2.5}
              value={zElevationGate}
              onChange={(e) => onSetZElevationGate(Number(e.target.value))}
              style={{ flex: 1, accentColor: '#ff0055' }}
            />
            <span style={{ fontFamily: 'var(--font-mono-term)', fontSize: '13px', color: '#ff3366', minWidth: '32px' }}>
              {zElevationGate.toFixed(0)}m
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
