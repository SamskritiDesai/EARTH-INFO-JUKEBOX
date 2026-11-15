// Data scan grid (bulging wireframe): a thin glowing lat/lon line mesh wraps the globe. Every grid point is lifted
// off the surface by the REAL NASA value under it and coloured with the layer's legend colours, so hot oceans, aerosol
// plumes and CO2 clouds show up as raised ridges of grid lines. A bright band sweeps pole to pole: the lines it
// touches flare and lift, and a readout shows the average of every active layer along the band's latitude.
import * as THREE from 'three';
import { ParameterId, earthDataEngine } from '../data/earthDataEngine';

const STEP = 3;                       // degrees between grid lines
const ROWS = 180 / STEP;              // latitude intervals (ROWS + 1 vertex rows, pole to pole)
const COLS = 360 / STEP;              // longitude intervals (wraps around)
const H_MAX = 0.28;                   // tallest bulge, in globe units (globe radius is 2.0)

function latLon(lat: number, lon: number, r: number): THREE.Vector3 {
  const phi = (90 - lat) * Math.PI / 180, theta = (lon + 180) * Math.PI / 180;
  return new THREE.Vector3(-r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta));
}

type RGB = [number, number, number];
const lerp3 = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

// Same scales as the globe textures / legend
const sstColor = (n: number): RGB =>
  n < 0.33 ? [0, (n * 3 * 220) / 255, 1] : n < 0.66 ? [0, 220 / 255, ((0.66 - n) * 3 * 255) / 255] : [1, ((1 - n) * 150) / 255, 20 / 255];
const co2Color = (n: number): RGB => n < 0.5 ? lerp3([0, 221 / 255, 85 / 255], [1, 170 / 255, 0], n * 2) : lerp3([1, 170 / 255, 0], [1, 17 / 255, 85 / 255], (n - 0.5) * 2);
const landColor = (n: number): RGB => lerp3([0.05, 0.45, 0.2], [170 / 255, 1, 0], n);               // moss -> lime
const seaGreenColor = (n: number): RGB => lerp3([0, 0.35, 0.45], [0, 1, 208 / 255], n);            // ocean chlorophyll
const aeroColor = (dust: number, carbon: number, salt: number, sulfate: number): RGB => {
  const r = Math.min(1, dust * 0.9 + carbon * 0.45 + sulfate * 0.35);
  const g = Math.min(1, dust * 0.48 + salt * 0.75 + sulfate * 0.55);
  const b = Math.min(1, salt * 0.95 + carbon * 0.55 + sulfate * 0.8);
  const m = Math.max(r, g, b, 0.001);
  const k = Math.min(3, 0.95 / m);           // brighten faint mixtures so the lines stay visible
  return [Math.min(1, r * k), Math.min(1, g * k), Math.min(1, b * k)];
};
const EMPTY: RGB = [0.05, 0.4, 0.3];         // dim teal: grid line over a point with no data

// The non-3D globe paints each layer from earthDataEngine.getEquirectangularCanvas(). Reading the colour straight from
// that same canvas guarantees the 3D grid uses exactly the same colours. (The functions above are only a fallback.)
interface Pixels { w: number; h: number; data: Uint8ClampedArray }
function readLayerPixels(param: ParameterId): Pixels | null {
  try {
    const canvas = earthDataEngine.getEquirectangularCanvas(param);
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    return { w: canvas.width, h: canvas.height, data: ctx.getImageData(0, 0, canvas.width, canvas.height).data };
  } catch { return null; }
}
function paintedColor(px: Pixels | null, lat: number, lon: number): RGB | null {
  if (!px) return null;
  const x = Math.min(px.w - 1, Math.max(0, Math.floor((((lon + 180) % 360 + 360) % 360) / 360 * px.w)));
  const y = Math.min(px.h - 1, Math.max(0, Math.floor((90 - Math.max(-90, Math.min(90, lat))) / 180 * px.h)));
  const o = (y * px.w + x) * 4;
  if (px.data[o + 3] === 0) return null;
  return [px.data[o] / 255, px.data[o + 1] / 255, px.data[o + 2] / 255];
}

export interface DataScanGrid {
  group: THREE.Group;
  setData: (active: Record<ParameterId, boolean>) => void;
  update: (t: number) => number;                        // returns the band latitude in degrees
  readoutAt: (latDeg: number) => string;
}

export function createDataScanGrid(radius: number): DataScanGrid {
  const group = new THREE.Group();
  const VROWS = ROWS + 1;
  const vcount = VROWS * COLS;
  const vid = (k: number, m: number) => k * COLS + (m % COLS);

  // vertex lattice + line indices (parallels and meridians)
  const positions = new THREE.BufferAttribute(new Float32Array(vcount * 3), 3);
  const colors = new THREE.BufferAttribute(new Float32Array(vcount * 4), 4);
  const idx: number[] = [];
  for (let k = 0; k < VROWS; k++) {
    for (let m = 0; m < COLS; m++) {
      if (k > 0 && k < ROWS) idx.push(vid(k, m), vid(k, m + 1));   // parallel (skip the poles: all points coincide)
      if (k < ROWS) idx.push(vid(k, m), vid(k + 1, m));            // meridian
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', positions);
  geo.setAttribute('aColor', colors);
  geo.setIndex(idx);

  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uSweep: { value: 0 }, uDir: { value: 1 }, uAng: { value: 0 }, uPop: { value: 0.06 } },
    vertexShader: `
      attribute vec4 aColor;
      uniform float uSweep; uniform float uDir; uniform float uAng; uniform float uPop;
      varying vec4 vCol; varying float vBand;
      void main() {
        vec3 n = normalize(position);
        float d = n.y - uSweep;
        float band = exp(-d * d * 220.0);
        float behind = -d * uDir;
        float trail = behind > 0.0 ? exp(-behind * 7.0) * 0.45 : 0.0;
        float ang = atan(n.x, n.z);
        float dl = abs(mod(ang - uAng + 3.14159265, 6.2831853) - 3.14159265);
        float wedge = exp(-dl * dl * 40.0) * 0.3;
        vec3 p = position + n * band * uPop;
        vCol = aColor;
        vBand = clamp(band + trail + wedge, 0.0, 1.0);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: `
      varying vec4 vCol; varying float vBand;
      void main() {
        vec3 col = vCol.rgb + vec3(0.55, 1.0, 0.75) * vBand * 0.9;
        float a = clamp(vCol.a + vBand * 0.8, 0.0, 1.0);
        gl_FragColor = vec4(col, a);
      }`
  });

  const lines = new THREE.LineSegments(geo, mat);
  lines.frustumCulled = false;
  group.add(lines);

  // thin ring that rides on the band, just above the tallest bulge
  const ringR = radius + H_MAX + 0.06;
  const ringPts: THREE.Vector3[] = [];
  for (let i = 0; i < 128; i++) {
    const a0 = (i / 128) * Math.PI * 2, a1 = ((i + 1) / 128) * Math.PI * 2;
    ringPts.push(new THREE.Vector3(Math.sin(a0), 0, Math.cos(a0)), new THREE.Vector3(Math.sin(a1), 0, Math.cos(a1)));
  }
  const ring = new THREE.LineSegments(
    new THREE.BufferGeometry().setFromPoints(ringPts),
    new THREE.LineBasicMaterial({ color: 0xaaffcc, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  group.add(ring);

  // per-latitude averages for the readout
  const rowSst = new Float32Array(VROWS), rowAero = new Float32Array(VROWS), rowCo2 = new Float32Array(VROWS), rowBio = new Float32Array(VROWS);
  let activeNow: Record<ParameterId, boolean> = { sst: true, aerosols: true, co2: true, forest: true };

  const setData = (active: Record<ParameterId, boolean>) => {
    activeNow = { ...active };
    const px: Record<ParameterId, Pixels | null> = {
      sst: active.sst ? readLayerPixels('sst') : null,
      aerosols: active.aerosols ? readLayerPixels('aerosols') : null,
      co2: active.co2 ? readLayerPixels('co2') : null,
      forest: active.forest ? readLayerPixels('forest') : null
    };
    for (let k = 0; k < VROWS; k++) {
      const lat = -90 + STEP * k;
      let sSst = 0, nSst = 0, sAer = 0, nAer = 0, sCo2 = 0, nCo2 = 0, sBio = 0, nBio = 0;
      for (let m = 0; m < COLS; m++) {
        const lon = -180 + STEP * m;
        const s = earthDataEngine.sample(lat, lon, false);

        // statistics for the readout (independent of which layer wins the point)
        if (s.sst.available) { sSst += s.sst.tempC; nSst++; }
        if (s.aerosols.available) { sAer += s.aerosols.strength; nAer++; }
        if (s.co2.plume) { sCo2 += s.co2.ppm; nCo2++; }
        if (s.forest.available) { sBio += s.forest.normalized; nBio++; }

        // which layer does this grid point show?
        //  surface: ocean -> sea temperature (or ocean chlorophyll if SST is off); land -> biosphere greenness
        //  air: aerosol / CO2 plumes take over the point where they are strong
        let surfN = -1; let surfC: RGB = EMPTY;
        if (s.isWater || s.surface === 'coast') {
          if (active.sst && s.sst.available) { surfN = s.sst.normalized; surfC = paintedColor(px.sst, lat, lon) ?? sstColor(surfN); }
          else if (active.forest && s.forest.available && s.forest.kind === 'ocean') { surfN = s.forest.normalized; surfC = paintedColor(px.forest, lat, lon) ?? seaGreenColor(surfN); }
        }
        if (surfN < 0 && s.surface !== 'ocean' && s.surface !== 'sea-ice' && active.forest && s.forest.available && s.forest.kind === 'land') {
          surfN = s.forest.normalized; surfC = paintedColor(px.forest, lat, lon) ?? landColor(surfN);
        }
        let airN = -1; let airC: RGB = EMPTY;
        if (active.aerosols && s.aerosols.available && s.aerosols.normalized > 0.12) {
          airN = s.aerosols.normalized;
          airC = paintedColor(px.aerosols, lat, lon) ?? aeroColor(s.aerosols.dust, s.aerosols.blackCarbon, s.aerosols.seaSalt, s.aerosols.sulfate);
        }
        if (active.co2 && s.co2.plume && s.co2.normalized > 0.12 && s.co2.normalized > airN) {
          airN = s.co2.normalized; airC = paintedColor(px.co2, lat, lon) ?? co2Color(airN);
        }
        let n = -1; let c: RGB = EMPTY;
        if (airN >= 0.3 || (airN >= 0 && surfN < 0)) { n = airN; c = airC; }
        else if (surfN >= 0) { n = surfN; c = surfC; }

        const h = n < 0 ? 0 : Math.min(1, n) * H_MAX;               // the bulge
        const alpha = n < 0 ? 0.2 : 0.5 + Math.min(1, n) * 0.5;       // taller = brighter
        const v = latLon(lat, lon, radius * 1.004 + h);
        const id = vid(k, m);
        positions.setXYZ(id, v.x, v.y, v.z);
        colors.setXYZW(id, c[0], c[1], c[2], alpha);
      }
      rowSst[k] = nSst ? sSst / nSst : NaN;
      rowAero[k] = nAer ? sAer / nAer : NaN;
      rowCo2[k] = nCo2 ? sCo2 / nCo2 : NaN;
      rowBio[k] = nBio ? sBio / nBio : NaN;
    }
    positions.needsUpdate = true;
    colors.needsUpdate = true;
  };

  const readoutAt = (latDeg: number): string => {
    const k = Math.max(0, Math.min(VROWS - 1, Math.round((latDeg + 90) / STEP)));
    const parts: string[] = [`SCAN ${Math.abs(latDeg).toFixed(0)}°${latDeg >= 0 ? 'N' : 'S'}`];
    if (activeNow.sst) parts.push(`SST ${Number.isNaN(rowSst[k]) ? '--' : rowSst[k].toFixed(1) + '°C'}`);
    if (activeNow.aerosols) parts.push(`AERO ${Number.isNaN(rowAero[k]) ? '--' : Math.round(rowAero[k] * 100) + '%'}`);
    if (activeNow.co2) parts.push(`CO2 ${Number.isNaN(rowCo2[k]) ? '--' : Math.round(rowCo2[k]) + 'ppm'}`);
    if (activeNow.forest) parts.push(`BIO ${Number.isNaN(rowBio[k]) ? '--' : Math.round(rowBio[k] * 100) + '%'}`);
    return parts.join('  ');
  };

  const update = (t: number): number => {
    const phase = t * 0.5;
    const sweep = Math.sin(phase) * 0.98;           // pole to pole and back
    mat.uniforms.uSweep.value = sweep;
    mat.uniforms.uDir.value = Math.cos(phase) >= 0 ? 1 : -1;
    mat.uniforms.uAng.value = (t * 0.7) % (Math.PI * 2);
    const r = Math.sqrt(Math.max(0, 1 - sweep * sweep)) * ringR;
    ring.scale.set(r, 1, r);
    ring.position.y = sweep * ringR;
    return Math.asin(sweep) * 180 / Math.PI;
  };

  return { group, setData, update, readoutAt };
}
