// EARTH FM - human place names for any point on the globe.
// Oceans and seas use lat/lon boxes (first match wins, specific seas first).
// Land uses the nearest named point (big countries have several points), plus a few natural-region overrides.
// Names are approximate "what are we above" labels, not survey-grade borders.

interface Box { name: string; latMin: number; latMax: number; lonMin: number; lonMax: number }
interface Pt { name: string; lat: number; lon: number }

const SEAS: Box[] = [
  { name: 'Persian Gulf', latMin: 24, latMax: 30.5, lonMin: 48, lonMax: 57 },
  { name: 'Red Sea', latMin: 12, latMax: 28.5, lonMin: 32, lonMax: 43.5 },
  { name: 'Gulf of Aden', latMin: 10.5, latMax: 15, lonMin: 43, lonMax: 52 },
  { name: 'Arabian Sea', latMin: 0, latMax: 26, lonMin: 52, lonMax: 75 },
  { name: 'Andaman Sea', latMin: 6, latMax: 16, lonMin: 93, lonMax: 99 },
  { name: 'Bay of Bengal', latMin: 5, latMax: 23, lonMin: 78, lonMax: 100 },
  { name: 'Black Sea', latMin: 41, latMax: 47, lonMin: 27, lonMax: 42 },
  { name: 'Caspian Sea', latMin: 36, latMax: 47.5, lonMin: 47, lonMax: 55 },
  { name: 'Mediterranean Sea', latMin: 30, latMax: 45.5, lonMin: -6, lonMax: 36 },
  { name: 'Baltic Sea', latMin: 53, latMax: 66, lonMin: 10, lonMax: 30 },
  { name: 'North Sea', latMin: 51, latMax: 61, lonMin: -4, lonMax: 9 },
  { name: 'Bay of Biscay', latMin: 43, latMax: 48.5, lonMin: -10, lonMax: -1 },
  { name: 'Norwegian Sea', latMin: 62, latMax: 72, lonMin: -5, lonMax: 15 },
  { name: 'Greenland Sea', latMin: 72, latMax: 80, lonMin: -20, lonMax: 10 },
  { name: 'Barents Sea', latMin: 68, latMax: 80, lonMin: 15, lonMax: 55 },
  { name: 'Kara Sea', latMin: 68, latMax: 81, lonMin: 55, lonMax: 95 },
  { name: 'Laptev Sea', latMin: 70, latMax: 80, lonMin: 95, lonMax: 140 },
  { name: 'East Siberian Sea', latMin: 68, latMax: 79, lonMin: 140, lonMax: 180 },
  { name: 'Beaufort Sea', latMin: 68, latMax: 78, lonMin: -157, lonMax: -120 },
  { name: 'Hudson Bay', latMin: 51, latMax: 64, lonMin: -95, lonMax: -78 },
  { name: 'Baffin Bay', latMin: 66, latMax: 78, lonMin: -80, lonMax: -55 },
  { name: 'Labrador Sea', latMin: 50, latMax: 66, lonMin: -65, lonMax: -45 },
  { name: 'Gulf of St. Lawrence', latMin: 45, latMax: 51, lonMin: -68, lonMax: -58 },
  { name: 'Gulf of Mexico', latMin: 18, latMax: 30.5, lonMin: -98, lonMax: -82 },
  { name: 'Caribbean Sea', latMin: 9, latMax: 22, lonMin: -88, lonMax: -60 },
  { name: 'Sargasso Sea', latMin: 22, latMax: 35, lonMin: -70, lonMax: -45 },
  { name: 'Gulf of Guinea', latMin: -5, latMax: 6, lonMin: -10, lonMax: 10 },
  { name: 'Mozambique Channel', latMin: -26, latMax: -10, lonMin: 34, lonMax: 45 },
  { name: 'Gulf of Alaska', latMin: 53, latMax: 62, lonMin: -155, lonMax: -135 },
  { name: 'Bering Sea', latMin: 52, latMax: 66, lonMin: 162, lonMax: 180 },
  { name: 'Bering Sea', latMin: 52, latMax: 66, lonMin: -180, lonMax: -157 },
  { name: 'Sea of Okhotsk', latMin: 44, latMax: 60, lonMin: 135, lonMax: 160 },
  { name: 'Sea of Japan', latMin: 34, latMax: 52, lonMin: 127, lonMax: 142 },
  { name: 'Yellow Sea', latMin: 33, latMax: 40, lonMin: 119, lonMax: 126 },
  { name: 'East China Sea', latMin: 23, latMax: 33, lonMin: 120, lonMax: 130 },
  { name: 'South China Sea', latMin: 0, latMax: 23, lonMin: 100, lonMax: 121 },
  { name: 'Philippine Sea', latMin: 5, latMax: 30, lonMin: 122, lonMax: 145 },
  { name: 'Indonesian seas', latMin: -11, latMax: 5, lonMin: 105, lonMax: 135 },
  { name: 'Coral Sea', latMin: -25, latMax: -10, lonMin: 145, lonMax: 165 },
  { name: 'Tasman Sea', latMin: -45, latMax: -28, lonMin: 150, lonMax: 175 }
];

export function describeWater(lat: number, lon: number): string {
  for (const s of SEAS) {
    if (lat >= s.latMin && lat <= s.latMax && lon >= s.lonMin && lon <= s.lonMax) return s.name;
  }
  if (lat > 66) return 'Arctic Ocean';
  if (lat < -60) return 'Southern Ocean';
  if ((lon >= 20 && lon < 120 && lat < 30) || (lon >= 120 && lon < 147 && lat < -30)) return 'Indian Ocean';
  if (lon >= -70 && lon < 20) return lat >= 0 ? 'North Atlantic Ocean' : 'South Atlantic Ocean';
  if (lon >= 100 || lon < -70) return lat >= 0 ? 'North Pacific Ocean' : 'South Pacific Ocean';
  return 'Global Ocean';
}

const LAND_POINTS: Pt[] = [
  // North America
  { name: 'Canada', lat: 60, lon: -110 }, { name: 'Canada', lat: 53, lon: -123 }, { name: 'Canada', lat: 50, lon: -85 },
  { name: 'Canada', lat: 54, lon: -70 }, { name: 'Canada', lat: 70, lon: -100 }, { name: 'Canada', lat: 63, lon: -135 },
  { name: 'the United States', lat: 38, lon: -120 }, { name: 'the United States', lat: 44, lon: -110 }, { name: 'the United States', lat: 36, lon: -100 },
  { name: 'the United States', lat: 33, lon: -85 }, { name: 'the United States', lat: 41, lon: -76 }, { name: 'the United States', lat: 44, lon: -90 },
  { name: 'Alaska', lat: 64, lon: -150 },
  { name: 'Mexico', lat: 24, lon: -102 }, { name: 'Mexico', lat: 17, lon: -93 }, { name: 'Mexico', lat: 29, lon: -111 },
  { name: 'Central America', lat: 14, lon: -88 }, { name: 'Central America', lat: 9, lon: -83 },
  { name: 'Cuba', lat: 21.5, lon: -79 }, { name: 'Haiti and the Dominican Republic', lat: 19, lon: -71 },
  { name: 'Greenland', lat: 72, lon: -40 }, { name: 'Greenland', lat: 65, lon: -45 },
  // South America
  { name: 'Colombia', lat: 4, lon: -73 }, { name: 'Venezuela', lat: 7, lon: -66 }, { name: 'Guyana and Suriname', lat: 4.5, lon: -57 },
  { name: 'Brazil', lat: -10, lon: -52 }, { name: 'Brazil', lat: -6, lon: -40 }, { name: 'Brazil', lat: -22, lon: -46 }, { name: 'Brazil', lat: -4, lon: -62 }, { name: 'Brazil', lat: -12, lon: -62 },
  { name: 'Peru', lat: -9, lon: -75 }, { name: 'Ecuador', lat: -1.5, lon: -78 }, { name: 'Bolivia', lat: -17, lon: -65 }, { name: 'Paraguay', lat: -23, lon: -58 },
  { name: 'Chile', lat: -35, lon: -71 }, { name: 'Chile', lat: -45, lon: -72 }, { name: 'Chile', lat: -23, lon: -69 },
  { name: 'Argentina', lat: -35, lon: -64 }, { name: 'Argentina', lat: -46, lon: -68 }, { name: 'Argentina', lat: -27, lon: -64 }, { name: 'Uruguay', lat: -33, lon: -56 },
  // Europe
  { name: 'Iceland', lat: 64.9, lon: -18.5 }, { name: 'the United Kingdom', lat: 53, lon: -1.5 }, { name: 'Ireland', lat: 53, lon: -8 },
  { name: 'France', lat: 46.5, lon: 2.5 }, { name: 'Spain', lat: 40, lon: -3.5 }, { name: 'Portugal', lat: 39.5, lon: -8 },
  { name: 'Germany', lat: 51, lon: 10 }, { name: 'Italy', lat: 42.5, lon: 12.5 }, { name: 'Poland', lat: 52, lon: 19 },
  { name: 'Belgium and the Netherlands', lat: 51.5, lon: 5 }, { name: 'Austria and Switzerland', lat: 47, lon: 10 },
  { name: 'Central Europe', lat: 48, lon: 19 }, { name: 'the Balkans', lat: 43.5, lon: 20 }, { name: 'Romania', lat: 46, lon: 25 },
  { name: 'Greece', lat: 39, lon: 22 }, { name: 'Turkey', lat: 39, lon: 35 }, { name: 'Ukraine', lat: 49, lon: 32 }, { name: 'Belarus', lat: 53.5, lon: 28 },
  { name: 'the Baltic states', lat: 57, lon: 24.5 }, { name: 'Sweden', lat: 62, lon: 15 }, { name: 'Norway', lat: 62, lon: 9 }, { name: 'Norway', lat: 69, lon: 20 }, { name: 'Finland', lat: 63, lon: 26 },
  { name: 'Russia', lat: 56, lon: 38 }, { name: 'Russia', lat: 60, lon: 60 }, { name: 'Russia', lat: 62, lon: 100 },
  { name: 'Russia', lat: 62, lon: 130 }, { name: 'Russia', lat: 56, lon: 160 }, { name: 'Russia', lat: 68, lon: 75 },
  // Asia
  { name: 'Kazakhstan', lat: 48, lon: 68 }, { name: 'Central Asia', lat: 40, lon: 64 }, { name: 'Central Asia', lat: 39, lon: 71 }, { name: 'Mongolia', lat: 46.9, lon: 103.8 },
  { name: 'Iran', lat: 32, lon: 54 }, { name: 'Iraq', lat: 33, lon: 44 }, { name: 'Syria and Jordan', lat: 33, lon: 38 }, { name: 'Saudi Arabia', lat: 24, lon: 45 },
  { name: 'Oman', lat: 21, lon: 57 }, { name: 'Yemen', lat: 15.5, lon: 47.5 }, { name: 'the United Arab Emirates', lat: 24, lon: 54.5 },
  { name: 'Afghanistan', lat: 33.9, lon: 66 }, { name: 'Pakistan', lat: 30, lon: 70 },
  { name: 'India', lat: 26.5, lon: 80 }, { name: 'India', lat: 21, lon: 78 }, { name: 'India', lat: 14, lon: 77 }, { name: 'India', lat: 24, lon: 72 },
  { name: 'India', lat: 19.5, lon: 74 }, { name: 'India', lat: 23, lon: 85 }, { name: 'India', lat: 26, lon: 93 },
  { name: 'Nepal', lat: 28, lon: 84 }, { name: 'Bangladesh', lat: 23.7, lon: 90.3 }, { name: 'Sri Lanka', lat: 7.8, lon: 80.7 },
  { name: 'Myanmar', lat: 21, lon: 96 }, { name: 'Thailand', lat: 15, lon: 101 }, { name: 'Vietnam', lat: 15.5, lon: 107 },
  { name: 'Laos', lat: 19, lon: 102.5 }, { name: 'Cambodia', lat: 12.5, lon: 104.9 }, { name: 'Malaysia', lat: 4, lon: 102 },
  { name: 'Borneo', lat: 1, lon: 114 }, { name: 'Sumatra', lat: -0.5, lon: 101.5 }, { name: 'Java', lat: -7.5, lon: 110 }, { name: 'Sulawesi', lat: -2, lon: 121 },
  { name: 'New Guinea', lat: -5, lon: 140 }, { name: 'the Philippines', lat: 12, lon: 122 },
  { name: 'China', lat: 35, lon: 104 }, { name: 'Tibet, China', lat: 31, lon: 90 }, { name: 'China', lat: 40, lon: 117 }, { name: 'China', lat: 28, lon: 113 },
  { name: 'Xinjiang, China', lat: 42, lon: 86 }, { name: 'China', lat: 47, lon: 125 }, { name: 'China', lat: 25, lon: 102 }, { name: 'China', lat: 31, lon: 121 },
  { name: 'Korea', lat: 37, lon: 127.8 }, { name: 'North Korea', lat: 40, lon: 127 }, { name: 'Japan', lat: 36, lon: 138 }, { name: 'Japan', lat: 43, lon: 142 }, { name: 'Japan', lat: 33, lon: 131 },
  { name: 'Taiwan', lat: 23.7, lon: 121 },
  // Africa
  { name: 'Morocco', lat: 32, lon: -6.5 }, { name: 'Algeria', lat: 28, lon: 2.6 }, { name: 'Tunisia', lat: 34, lon: 9.5 }, { name: 'Libya', lat: 27, lon: 17 },
  { name: 'Egypt', lat: 26.5, lon: 30 }, { name: 'Sudan', lat: 15.5, lon: 30 }, { name: 'South Sudan', lat: 7, lon: 30 }, { name: 'Ethiopia', lat: 9, lon: 39.5 },
  { name: 'Somalia', lat: 5, lon: 46 }, { name: 'Kenya', lat: 0.5, lon: 38 }, { name: 'Uganda', lat: 1.5, lon: 32.5 }, { name: 'Tanzania', lat: -6.3, lon: 34.8 },
  { name: 'the Democratic Republic of the Congo', lat: -2, lon: 23.5 }, { name: 'the Democratic Republic of the Congo', lat: -8, lon: 25 },
  { name: 'the Republic of the Congo', lat: -0.7, lon: 15.2 }, { name: 'Gabon', lat: -0.8, lon: 11.6 }, { name: 'Cameroon', lat: 5.7, lon: 12.5 },
  { name: 'Nigeria', lat: 9.5, lon: 8 }, { name: 'Niger', lat: 17, lon: 9 }, { name: 'Chad', lat: 15, lon: 18.5 }, { name: 'Mali', lat: 17, lon: -3 },
  { name: 'Mauritania', lat: 20, lon: -10.5 }, { name: 'Senegal', lat: 14.5, lon: -14.5 }, { name: 'Guinea', lat: 10.5, lon: -11 },
  { name: 'Ivory Coast', lat: 7.5, lon: -5.5 }, { name: 'Ghana', lat: 7.9, lon: -1.2 }, { name: 'Burkina Faso', lat: 12.3, lon: -1.7 },
  { name: 'Liberia and Sierra Leone', lat: 7, lon: -11 }, { name: 'the Central African Republic', lat: 6.6, lon: 20.9 },
  { name: 'Angola', lat: -12, lon: 17.5 }, { name: 'Zambia', lat: -14, lon: 28 }, { name: 'Zimbabwe', lat: -19, lon: 29.8 }, { name: 'Mozambique', lat: -17, lon: 35 },
  { name: 'Malawi', lat: -13, lon: 34 }, { name: 'Namibia', lat: -22, lon: 17 }, { name: 'Botswana', lat: -22, lon: 24 }, { name: 'South Africa', lat: -29, lon: 24 },
  { name: 'Madagascar', lat: -19, lon: 46.7 }, { name: 'Western Sahara', lat: 24.5, lon: -13 },
  // Oceania
  { name: 'Australia', lat: -25, lon: 134 }, { name: 'Australia', lat: -33, lon: 147 }, { name: 'Australia', lat: -25, lon: 121 },
  { name: 'Australia', lat: -16, lon: 133 }, { name: 'Australia', lat: -37, lon: 144 }, { name: 'Australia', lat: -22, lon: 145 },
  { name: 'Papua New Guinea', lat: -6, lon: 145 }, { name: 'New Zealand', lat: -41, lon: 173 }, { name: 'New Zealand', lat: -44, lon: 170 },
  { name: 'Hawaii', lat: 20, lon: -157 }
];

// Natural regions that override the country names when a point falls inside them.
const NATURAL: Box[] = [
  { name: 'Greenland', latMin: 60, latMax: 84, lonMin: -73, lonMax: -12 },
  { name: 'the Amazon Rainforest', latMin: -12, latMax: 4, lonMin: -73, lonMax: -52 },
  { name: 'the Sahara Desert', latMin: 18, latMax: 29, lonMin: -12, lonMax: 30 },
  { name: 'the Congo Rainforest', latMin: -4, latMax: 4, lonMin: 12, lonMax: 28 },
  { name: 'the Siberian Taiga', latMin: 55, latMax: 68, lonMin: 70, lonMax: 140 },
  { name: 'the Himalayas', latMin: 27.5, latMax: 35, lonMin: 79, lonMax: 97 },
  { name: 'the Australian Outback', latMin: -30, latMax: -18, lonMin: 120, lonMax: 140 }
];

function distKm(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const r = Math.PI / 180;
  const dLat = (bLat - aLat) * r, dLon = (bLon - aLon) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * r) * Math.cos(bLat * r) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function describeLand(lat: number, lon: number): string {
  if (lat < -62) return 'Antarctica';
  for (const n of NATURAL) {
    if (lat >= n.latMin && lat <= n.latMax && lon >= n.lonMin && lon <= n.lonMax) return n.name;
  }
  let best = LAND_POINTS[0], bestD = Infinity;
  for (const p of LAND_POINTS) {
    const d = distKm(lat, lon, p.lat, p.lon);
    if (d < bestD) { bestD = d; best = p; }
  }
  return best.name;
}

/** "the Indian Ocean" / "India" - adds the article where spoken English needs it. */
export function withArticle(name: string): string {
  if (/^the /i.test(name)) return name;
  if (/\b(Ocean|Sea|Seas|seas|Gulf|Bay|Channel|Desert|Rainforest|Taiga)\b/.test(name) || name === 'Himalayas') return `the ${name}`;
  return name;
}

/** Display form used in labels: strips a leading "the" so panels read "UNITED KINGDOM". */
export function displayName(name: string): string {
  return name.replace(/^the /i, '');
}
