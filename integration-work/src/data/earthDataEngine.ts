// EARTH FM - NASA binary dataset engine
export type ParameterId = 'sst' | 'aerosols' | 'co2' | 'forest';

export interface ParameterMetadata {
  id: ParameterId; name: string; shortLabel: string; svsSource: string;
  instrument: string; units: string; minVal: number; maxVal: number;
  colorSpectrum: string; defaultColor: string; voiceStyle: string; mappingRule: string;
}

export const PARAMETERS: Record<ParameterId, ParameterMetadata> = {
  sst: {
    id: 'sst', name: 'Sea Surface Temperature', shortLabel: 'SEA SURFACE TEMP',
    svsSource: 'NASA SVS #3821 / ECCO2 model', instrument: 'ECCO2 ocean model visualization',
    units: '°C (approx.)', minVal: 0, maxVal: 30,
    colorSpectrum: 'Thermal blue -> cyan -> orange -> crimson', defaultColor: '#00ccff',
    voiceStyle: 'Deep Liquid Warm Chords', mappingRule: 'Approximate sea-surface temperature -> liquid piano voicing'
  },
  aerosols: {
    id: 'aerosols', name: 'GEOS Aerosol Composition', shortLabel: 'GEOS AEROSOLS',
    svsSource: 'NASA SVS #5572 / GEOS', instrument: 'GEOS aerosol model visualization',
    units: 'Relative strength (0–1)', minVal: 0, maxVal: 1,
    colorSpectrum: 'Dust amber, carbon violet-gray, sea salt cyan', defaultColor: '#ffaa00',
    voiceStyle: 'Flowy Chords', mappingRule: 'Relative aerosol mixture and strength -> airy pad modulation'
  },
  co2: {
    id: 'co2', name: 'DYAMOND Carbon Dioxide', shortLabel: 'DYAMOND CO₂',
    svsSource: 'NASA SVS #5436 / DYAMOND', instrument: 'DYAMOND atmospheric model visualization',
    units: 'ppm (approx.)', minVal: 380, maxVal: 460,
    colorSpectrum: 'Emerald -> amber -> magenta', defaultColor: '#ff3366',
    voiceStyle: 'Soft Warm Sub-Pad', mappingRule: 'Approximate CO₂ concentration -> low-octave sub-pad'
  },
  forest: {
    id: 'forest', name: 'Global Biosphere Greenness', shortLabel: 'BIOSPHERE',
    svsSource: 'NASA SVS #5006 / Global Biosphere', instrument: 'Global biosphere visualization',
    units: 'Relative greenness (0–1)', minVal: 0, maxVal: 1,
    colorSpectrum: 'Deep moss -> lime green; ocean chlorophyll', defaultColor: '#00dd55',
    voiceStyle: 'Warm Acoustic Kalimba', mappingRule: 'Relative land greenness / ocean chlorophyll -> warm acoustic notes'
  }
};

export interface SampledEarthTelemetry {
  lat: number; lon: number; nearestRegion: string; isWater: boolean;
  sst: { tempC: number; normalized: number; available: boolean };
  aerosols: { blackCarbon: number; dust: number; seaSalt: number; sulfate: number; strength: number; normalized: number; available: boolean };
  co2: { ppm: number; normalized: number; available: boolean; plume: boolean };
  forest: { greenness: number; chlorophyll: number; normalized: number; available: boolean };
}
export interface DatasetFrameInfo { index: number; count: number; label: string; period: string; }

const SST_W = 256, SST_H = 128, SST_BYTES = SST_W * SST_H * 2, SST_COUNT = 22;
const AER_W = 128, AER_H = 64, AER_BYTES = AER_W * AER_H * 5, AER_COUNT = 37;
const CO2_W = 128, CO2_H = 64, CO2_BYTES = CO2_W * CO2_H * 2, CO2_COUNT = 39;
const BIO_W = 256, BIO_H = 128, BIO_BYTES = BIO_W * BIO_H * 2, BIO_COUNT = 40;

const CO2_DATES = ['Jan 14','Jan 16','Jan 17','Jan 18','Jan 19','Jan 21','Jan 22','Jan 23','Jan 24','Jan 26','Jan 27','Jan 28','Jan 29','Jan 31','Feb 01','Feb 02','Feb 03','Feb 05','Feb 06','Feb 07','Feb 08','Feb 10','Feb 11','Feb 12','Feb 13','Feb 15','Feb 16','Feb 17','Feb 18','Feb 20','Feb 21','Feb 22','Feb 23','Feb 25','Feb 26','Feb 27','Feb 28','Mar 01','Mar 02'];
const BIO_DATES = ['Mar 2017','May 2017','Jun 2017','Aug 2017','Sep 2017','Nov 2017','Dec 2017','Feb 2018','Mar 2018','May 2018','Jun 2018','Aug 2018','Sep 2018','Nov 2018','Dec 2018','Feb 2019','Mar 2019','May 2019','Jun 2019','Aug 2019','Sep 2019','Nov 2019','Dec 2019','Feb 2020','Mar 2020','May 2020','Jun 2020','Aug 2020','Sep 2020','Nov 2020','Dec 2020','Feb 2021','Mar 2021','May 2021','Jun 2021','Aug 2021','Sep 2021','Nov 2021','Dec 2021','Feb 2022'];

class EarthDataEngine {
  private sst: Uint8Array | null = null;
  private aerosols: Uint8Array | null = null;
  private co2: Uint8Array | null = null;
  private bio: Uint8Array | null = null;
  private frames: Record<ParameterId, number> = { sst: SST_COUNT - 1, aerosols: AER_COUNT - 1, co2: CO2_COUNT - 1, forest: BIO_COUNT - 1 };
  private loaded = false;

  public async load(): Promise<void> {
    const loadBin = async (name: string, expected: number) => {
      const response = await fetch(`/nasa/${name}`);
      if (!response.ok) throw new Error(`Could not load /nasa/${name} (${response.status})`);
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (bytes.length !== expected) throw new Error(`${name}: expected ${expected} bytes, received ${bytes.length}`);
      return bytes;
    };
    const [sst, aerosols, co2, bio] = await Promise.all([
      loadBin('sst_time.bin', SST_BYTES * SST_COUNT),
      loadBin('aerosols_time.bin', AER_BYTES * AER_COUNT),
      loadBin('co2_time.bin', CO2_BYTES * CO2_COUNT),
      loadBin('bio_time.bin', BIO_BYTES * BIO_COUNT)
    ]);
    this.sst = sst; this.aerosols = aerosols; this.co2 = co2; this.bio = bio;
    this.loaded = true;
  }

  public isLoaded(): boolean { return this.loaded; }
  public setFrame(param: ParameterId, index: number): void {
    const max = this.getFrameInfo(param).count - 1;
    this.frames[param] = Math.max(0, Math.min(max, Math.round(index)));
  }
  public getFrameInfo(param: ParameterId): DatasetFrameInfo {
    const index = this.frames[param];
    const count = param === 'sst' ? SST_COUNT : param === 'aerosols' ? AER_COUNT : param === 'co2' ? CO2_COUNT : BIO_COUNT;
    let label = '';
    let period = '';
    if (param === 'sst') { label = `Frame ${index + 1}`; period = 'ECCO2 model • 2005 (approximate sequence)'; }
    if (param === 'aerosols') {
      const day = Math.round(index * (44 / 36));
      const date = new Date(Date.UTC(2024, 7, 1 + day));
      label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
      period = 'GEOS model • Aug 1–Sep 14, 2024 (approximate daily steps)';
    }
    if (param === 'co2') { label = `${CO2_DATES[index]}, 2020`; period = 'DYAMOND model • Jan 14–Mar 2, 2020'; }
    if (param === 'forest') { label = BIO_DATES[index]; period = 'Global Biosphere • Mar 2017–Feb 2022'; }
    return { index, count, label, period };
  }

  private pixel(lat: number, lon: number, width: number, height: number): number {
    const x = Math.min(width - 1, Math.max(0, Math.floor((((lon + 180) % 360 + 360) % 360) / 360 * width)));
    const y = Math.min(height - 1, Math.max(0, Math.floor((90 - Math.max(-90, Math.min(90, lat))) / 180 * height)));
    return y * width + x;
  }

  public sample(lat: number, lon: number): SampledEarthTelemetry {
    const sstIdx = this.pixel(lat, lon, SST_W, SST_H);
    const aerIdx = this.pixel(lat, lon, AER_W, AER_H);
    const co2Idx = this.pixel(lat, lon, CO2_W, CO2_H);
    const bioIdx = this.pixel(lat, lon, BIO_W, BIO_H);
    // SST + biosphere are stored as two planes per frame: [class plane][value plane]
    const sstClassOff = this.frames.sst * SST_BYTES + sstIdx;
    const sstValueOff = sstClassOff + SST_W * SST_H;
    const aerOffset = this.frames.aerosols * AER_BYTES + aerIdx * 5;
    const co2Offset = this.frames.co2 * CO2_BYTES + co2Idx * 2;
    const bioClassOff = this.frames.forest * BIO_BYTES + bioIdx;
    const bioValueOff = bioClassOff + BIO_W * BIO_H;

    const sstClass = this.sst ? this.sst[sstClassOff] : 1;
    const tempC = this.sst ? this.sst[sstValueOff] / 255 * 30 : 0;
    const aer = this.aerosols;
    const blackCarbon = aer ? aer[aerOffset] / 255 : 0;
    const dust = aer ? aer[aerOffset + 1] / 255 : 0;
    const seaSalt = aer ? aer[aerOffset + 2] / 255 : 0;
    const sulfate = aer ? aer[aerOffset + 3] / 255 : 0;
    const strength = aer ? aer[aerOffset + 4] / 255 : 0;
    const ppmIndex = this.co2 ? this.co2[co2Offset] : 0;
    const density = this.co2 ? this.co2[co2Offset + 1] : 0;
    const ppm = 380 + ppmIndex / 255 * 80;
    const bioClass = this.bio ? this.bio[bioClassOff] : 2;
    const bioValue = this.bio ? this.bio[bioValueOff] / 255 : 0;
    const isWater = this.sst ? sstClass === 0 : bioClass === 0;
    const sstAvailable = !!this.sst && sstClass === 0;
    const aerAvailable = !!this.aerosols && strength > 0;
    // 'plume' = the model has a CO2 cloud here; everywhere else the file has 0 (= background, not missing data)
    const co2Plume = !!this.co2 && ppmIndex > 0 && density > 0;
    const co2Available = !!this.co2;
    const bioAvailable = !!this.bio && (bioClass === 0 || bioClass === 1);
    return {
      lat, lon, nearestRegion: this.resolveNearestLandmark(lat, lon, isWater),
      isWater,
      sst: { tempC: Number(tempC.toFixed(1)), normalized: tempC / 30, available: sstAvailable },
      aerosols: { blackCarbon, dust, seaSalt, sulfate, strength, normalized: strength, available: aerAvailable },
      co2: { ppm: Number(ppm.toFixed(1)), normalized: co2Plume ? ppmIndex / 255 : 0, available: co2Available, plume: co2Plume },
      forest: {
        greenness: bioClass === 1 ? bioValue : 0,
        chlorophyll: bioClass === 0 ? bioValue : 0,
        normalized: bioValue,
        available: bioAvailable
      }
    };
  }

  private resolveNearestLandmark(lat: number, lon: number, isWater: boolean): string {
    if (isWater) {
      if (lat > 65) return 'Arctic Ocean';
      if (lat < -55) return 'Southern Ocean';
      if (lon >= 40 && lon <= 110 && lat < 25) return 'Indian Ocean Basin';
      if (lon > -80 && lon < 0 && lat > 0) return 'North Atlantic Ocean';
      if (lon < -80 || lon > 120) return 'Pacific Ocean';
      return 'Global Ocean';
    }
    if (lat > 18 && lat < 30 && lon > 68 && lon < 90) return 'India / Indo-Gangetic Basin';
    if (lat > -20 && lat < 5 && lon > -75 && lon < -45) return 'Amazon Basin';
    if (lat > 15 && lat < 32 && lon > -15 && lon < 35) return 'Sahara Region';
    if (lat > 55 && lat < 70 && lon > 60 && lon < 140) return 'Siberian Taiga';
    return 'Continental Land Mass';
  }

  public getEquirectangularCanvas(param: ParameterId): HTMLCanvasElement {
    const width = param === 'sst' || param === 'forest' ? 256 : 128;
    const height = param === 'sst' || param === 'forest' ? 128 : 64;
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;
    const image = ctx.createImageData(width, height);
    const out = image.data;
    const frame = this.frames[param];
    for (let i = 0; i < width * height; i++) {
      const p = i * 4;
      if (param === 'sst' && this.sst) {
        const base = frame * SST_BYTES;
        if (this.sst[base + i] !== 0) continue;           // class plane: 0 = ocean
        const n = this.sst[base + width * height + i] / 255; // value plane
        const rgb = n < .33 ? [0, Math.round(n * 3 * 220), 255] : n < .66 ? [0, 220, Math.round((.66 - n) * 3 * 255)] : [255, Math.round((1 - n) * 150), 20];
        out[p] = rgb[0]; out[p+1] = rgb[1]; out[p+2] = rgb[2]; out[p+3] = 205;
      } else if (param === 'aerosols' && this.aerosols) {
        const o = frame * AER_BYTES + i * 5;
        const carbon = this.aerosols[o], dust = this.aerosols[o+1], salt = this.aerosols[o+2], sulfate = this.aerosols[o+3], strength = this.aerosols[o+4];
        if (!strength) continue;
        out[p] = Math.min(255, Math.round(dust * .9 + carbon * .45 + sulfate * .35));
        out[p+1] = Math.min(255, Math.round(dust * .48 + salt * .75 + sulfate * .55));
        out[p+2] = Math.min(255, Math.round(salt * .95 + carbon * .55 + sulfate * .8));
        out[p+3] = Math.round(35 + strength * .68);
      } else if (param === 'co2' && this.co2) {
        const o = frame * CO2_BYTES + i * 2;
        const idx = this.co2[o], density = this.co2[o+1];
        if (!idx || !density) continue;
        const n = idx / 255;
        // emerald (0,221,85) -> amber (255,170,0) -> magenta (255,17,85), same as the legend bar
        const t = n < .5 ? n * 2 : (n - .5) * 2;
        const a = n < .5 ? [0, 221, 85] : [255, 170, 0];
        const b = n < .5 ? [255, 170, 0] : [255, 17, 85];
        out[p] = Math.round(a[0] + (b[0] - a[0]) * t);
        out[p+1] = Math.round(a[1] + (b[1] - a[1]) * t);
        out[p+2] = Math.round(a[2] + (b[2] - a[2]) * t);
        out[p+3] = Math.round(35 + density * .65);
      } else if (param === 'forest' && this.bio) {
        const base = frame * BIO_BYTES;
        const cls = this.bio[base + i], value = this.bio[base + width * height + i];
        if (cls === 1) {
          out[p] = Math.round(value * .22); out[p+1] = Math.round(75 + value * .7);
          out[p+2] = Math.round(value * .12); out[p+3] = Math.round(55 + value * .65);
        } else if (cls === 0) {
          out[p] = 0; out[p+1] = Math.round(value * .65); out[p+2] = Math.round(90 + value * .55);
          out[p+3] = Math.round(25 + value * .45);
        } else if (cls === 2) {
          out[p] = 170; out[p+1] = 205; out[p+2] = 225; out[p+3] = 110;
        }
      }
    }
    ctx.putImageData(image, 0, 0);
    return canvas;
  }
}

export const earthDataEngine = new EarthDataEngine();
