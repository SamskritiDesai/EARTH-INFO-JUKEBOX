// TrackSelectorStrip.tsx
// Retro 16-Bit Curated Earth Jukebox Track Selector Strip
// 4 Signature One-Click Presets: Amazon, Monsoon, Equatorial Symphony, Megacity Air & Carbon

import React from 'react';
import { PlaybackMode, RegionBiome } from '../types/forest';
import { globalSynthEngine } from '../audio/ForestSynthEngine';

export interface JukeboxTrack {
  id: string;
  number: string;
  title: string;
  shortLabel: string;
  badgeColor: string;
  lat: number;
  lon: number;
  playbackMode: PlaybackMode;
  crossfader: number;
  layers: {
    chForest: { volume: number; muted: boolean; solo: boolean };
    chAir: { volume: number; muted: boolean; solo: boolean };
    chAerosols: { volume: number; muted: boolean; solo: boolean };
    chOcean: { volume: number; muted: boolean; solo: boolean };
    chCo2: { volume: number; muted: boolean; solo: boolean };
  };
  description: string;
}

export const CURATED_TRACKS: JukeboxTrack[] = [
  {
    id: 'track-01',
    number: '01',
    title: 'AMAZON CANOPY & CO2',
    shortLabel: 'TRK 01: AMAZON CANOPY',
    badgeColor: '#00ff88',
    lat: -3.46,
    lon: -62.21,
    playbackMode: 'MANUAL_POINTER',
    crossfader: 0.15,
    layers: {
      chForest: { volume: 0.95, muted: false, solo: true },
      chAir: { volume: 0.40, muted: true, solo: false },
      chAerosols: { volume: 0.30, muted: true, solo: false },
      chOcean: { volume: 0.30, muted: true, solo: false },
      chCo2: { volume: 0.95, muted: false, solo: true },
    },
    description: 'South America equatorial lock: GEDI Forest Height (lo-fi Dm9 rusty keys) + DYAMOND CO2 sub-harmonic analog bass.',
  },
  {
    id: 'track-02',
    number: '02',
    title: 'MONSOON & AEROSOL DRIFT',
    shortLabel: 'TRK 02: MONSOON & AEROSOL',
    badgeColor: '#00e5ff',
    lat: 12.00,
    lon: 85.00,
    playbackMode: 'MANUAL_POINTER',
    crossfader: 0.85,
    layers: {
      chForest: { volume: 0.30, muted: true, solo: false },
      chAir: { volume: 0.45, muted: true, solo: false },
      chAerosols: { volume: 0.90, muted: false, solo: true },
      chOcean: { volume: 0.90, muted: false, solo: true },
      chCo2: { volume: 0.30, muted: true, solo: false },
    },
    description: 'Bay of Bengal & Indian Ocean: Sea Surface Currents (liquid Fmaj9 e-piano) + GEOS Aerosols (crystalline shimmer plucks).',
  },
  {
    id: 'track-03',
    number: '03',
    title: 'GLOBAL EQUATORIAL SYMPHONY',
    shortLabel: 'TRK 03: EQUATORIAL SYMPHONY',
    badgeColor: '#ffff00',
    lat: 0.00,
    lon: 0.00,
    playbackMode: 'AUTO_PLAY_GLOBE',
    crossfader: 0.50,
    layers: {
      chForest: { volume: 0.85, muted: false, solo: false },
      chAir: { volume: 0.80, muted: false, solo: false },
      chAerosols: { volume: 0.75, muted: false, solo: false },
      chOcean: { volume: 0.82, muted: false, solo: false },
      chCo2: { volume: 0.88, muted: false, solo: false },
    },
    description: 'Automated 360° global equatorial sweep: all 5 Earth parameters clubbed in full balanced harmonic lock.',
  },
  {
    id: 'track-04',
    number: '04',
    title: 'MEGACITY AIR & CARBON PULSE',
    shortLabel: 'TRK 04: MEGACITY AIR & CARBON',
    badgeColor: '#ff3366',
    lat: 34.50,
    lon: 118.00,
    playbackMode: 'MANUAL_POINTER',
    crossfader: 0.65,
    layers: {
      chForest: { volume: 0.30, muted: true, solo: false },
      chAir: { volume: 0.95, muted: false, solo: true },
      chAerosols: { volume: 0.50, muted: true, solo: false },
      chOcean: { volume: 0.30, muted: true, solo: false },
      chCo2: { volume: 0.95, muted: false, solo: true },
    },
    description: 'East Asia industrial corridor: Air Quality (swelling flowy Lydian pads) + DYAMOND CO2 (pulsing deep analog sub bass).',
  },
];

interface TrackSelectorStripProps {
  activeTrackId: string | null;
  onSelectTrack: (track: JukeboxTrack) => void;
  onSpeakNotice?: (text: string) => void;
}

export const TrackSelectorStrip: React.FC<TrackSelectorStripProps> = ({
  activeTrackId,
  onSelectTrack,
  onSpeakNotice,
}) => {
  const handleTrackClick = (track: JukeboxTrack) => {
    // Apply crossfader and layer gains directly to synth engine
    globalSynthEngine.setCrossfader(track.crossfader);

    // Apply layers
    (['chForest', 'chAir', 'chAerosols', 'chOcean', 'chCo2'] as const).forEach((ch) => {
      const cfg = track.layers[ch];
      globalSynthEngine.setChannelVolume(ch, cfg.volume);

      const curState = globalSynthEngine.getMixerState()[ch];
      if (curState.muted !== cfg.muted) {
        globalSynthEngine.toggleMute(ch);
      }
      if (curState.solo !== cfg.solo) {
        globalSynthEngine.toggleSolo(ch);
      }
    });

    onSelectTrack(track);

    if (onSpeakNotice) {
      onSpeakNotice(`Loaded Preset ${track.number}: ${track.title}. ${track.description}`);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        background: 'linear-gradient(90deg, #001238 0%, #000922 100%)',
        borderBottom: '2px solid #0055cc',
        padding: '3px 8px',
        gap: '6px',
        overflowX: 'auto',
      }}
      role="region"
      aria-label="Earth Jukebox Featured Playlist Presets"
    >
      <div
        style={{
          fontFamily: 'var(--font-retro-pixel)',
          fontSize: '7px',
          color: '#ffffff',
          backgroundColor: '#aa0022',
          padding: '3px 6px',
          border: '1px solid #ff4466',
          whiteSpace: 'nowrap',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
        }}
      >
        <span>★ JUKEBOX PRESETS:</span>
      </div>

      <div style={{ display: 'flex', gap: '4px', flex: 1, minWidth: 'max-content' }}>
        {CURATED_TRACKS.map((track) => {
          const isActive = activeTrackId === track.id;
          return (
            <button
              key={track.id}
              className={`pixel-btn ${isActive ? 'pixel-btn-active' : ''}`}
              style={{
                fontSize: '7px',
                padding: '3px 6px',
                background: isActive ? track.badgeColor : '#001a4d',
                color: isActive ? '#000000' : '#ffffff',
                border: `1px solid ${isActive ? '#ffffff' : '#0066ff'}`,
                fontWeight: isActive ? 'bold' : 'normal',
                boxShadow: isActive ? `0 0 8px ${track.badgeColor}` : 'none',
              }}
              onClick={() => handleTrackClick(track)}
              aria-label={`Preset ${track.number}: ${track.title}`}
              title={track.description}
            >
              <span>{track.shortLabel}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
