// EarthDatasets.ts
// NASA Earth Data Timelines, Availability Masks, and Satellite Routes

export type TimelineEraId = 'full_composite' | 'gedi_window' | 'dyamond_window' | 'ocean_aerosols';

export interface TimelineEra {
  id: TimelineEraId;
  label: string;
  years: string;
  description: string;
  availability: {
    ocean: boolean;
    aerosols: boolean;
    co2: boolean;
    forest: boolean;
  };
}

export const TIMELINE_ERAS: TimelineEra[] = [
  {
    id: 'full_composite',
    label: 'FULL COMPOSITE ERA',
    years: '2019–2025 COMPOSITE',
    description: 'All 4 Earth parameter datasets synchronized across multi-satellite instruments.',
    availability: {
      ocean: true,
      aerosols: true,
      co2: true,
      forest: true,
    },
  },
  {
    id: 'gedi_window',
    label: 'GEDI MISSION WINDOW',
    years: '2019–2020 HISTORICAL',
    description: 'ISS GEDI LiDAR prime laser observation period over global forest canopies.',
    availability: {
      ocean: false, // Not available
      aerosols: true,
      co2: true,
      forest: true,
    },
  },
  {
    id: 'dyamond_window',
    label: 'DYAMOND SIMULATION',
    years: '2020–2021 MODEL RUN',
    description: 'High-resolution 3km global storm-resolving atmospheric CO2 simulation.',
    availability: {
      ocean: true,
      aerosols: true,
      co2: true,
      forest: false, // Standby
    },
  },
  {
    id: 'ocean_aerosols',
    label: 'OCEAN & AEROSOL ERA',
    years: '2023–2024 RECENT',
    description: 'Global sea surface temperature currents and GEOS-FP aerosol optical depth monitoring.',
    availability: {
      ocean: true,
      aerosols: true,
      co2: false, // Standby
      forest: false, // Standby
    },
  },
];

export interface SatelliteRoutePreset {
  id: string;
  name: string;
  sourceLabel: string;
  destLabel: string;
  sourceLat: number;
  sourceLon: number;
  destLat: number;
  destLon: number;
  description: string;
  custom?: boolean;
}

export const PRESET_ROUTES: SatelliteRoutePreset[] = [
  {
    id: 'amazon_sahara',
    name: 'AMAZON -> SAHARA TRANSECT',
    sourceLabel: 'Amazon Basin',
    destLabel: 'Sahara Desert Plume',
    sourceLat: -3.46,
    sourceLon: -62.21,
    destLat: 23.80,
    destLon: 11.20,
    description: 'Trans-Atlantic dust & carbon corridor linking lush tropical rainforest to Saharan mineral dust.',
  },
  {
    id: 'mumbai_tokyo',
    name: 'MUMBAI -> TOKYO MONSOON ARC',
    sourceLabel: 'Mumbai (Arabian Sea)',
    destLabel: 'Tokyo (Kuroshio Current)',
    sourceLat: 18.97,
    sourceLon: 72.82,
    destLat: 35.68,
    destLon: 139.69,
    description: 'South Asian monsoon belt crossing the Bay of Bengal, Southeast Asian rainforests, and Kuroshio current.',
  },
  {
    id: 'newyork_london',
    name: 'NEW YORK -> LONDON GULF STREAM',
    sourceLabel: 'New York (Eastern US)',
    destLabel: 'London (Western Europe)',
    sourceLat: 40.71,
    sourceLon: -74.00,
    destLat: 51.50,
    destLon: -0.12,
    description: 'North Atlantic boundary current corridor tracing the warm Gulf Stream drift into European temperate woodlands.',
  },
  {
    id: 'arctic_antarctic',
    name: 'ARCTIC -> ANTARCTICA POLAR TRANSECT',
    sourceLabel: 'Siberian Taiga (60°N)',
    destLabel: 'Southern Ocean (-55°S)',
    sourceLat: 60.00,
    sourceLon: 105.00,
    destLat: -55.00,
    destLon: 140.00,
    description: 'Meridional cross-hemispheric route from circumpolar boreal coniferous spires to Antarctic sea spray.',
  },
];

const LOCAL_STORAGE_ROUTES_KEY = 'terra_scan_saved_routes_v1';

export function loadSavedRoutes(): SatelliteRoutePreset[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_ROUTES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn('Failed to load saved routes from localStorage', e);
  }
  return [];
}

export function saveCustomRoute(route: SatelliteRoutePreset): SatelliteRoutePreset[] {
  try {
    const existing = loadSavedRoutes();
    const updated = [route, ...existing.filter((r) => r.id !== route.id)].slice(0, 10);
    localStorage.setItem(LOCAL_STORAGE_ROUTES_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.warn('Failed to save route to localStorage', e);
    return [];
  }
}
