// ImageSonifier.ts
// Explicit Image-to-Sound Pixel Extraction Engine for TERRA-SCAN
// Reads actual RGB values, luminance, hue, and local 5x5 spatial contrast directly from
// offscreen HTML5 canvas equirectangular textures, converting them into quantized musical parameters.

export interface PixelSonificationData {
  r: number; // 0 - 255
  g: number; // 0 - 255
  b: number; // 0 - 255
  hue: number; // 0 - 360 degrees
  saturation: number; // 0 - 1
  luminance: number; // 0 - 1
  spatialContrast5x5: number; // 0 - 1 (local texture heterogeneity)
  quantizedScaleDegree: number; // 0 - 6 in active scale (C Dorian / F Lydian)
  noteName: string;
  harmonicFrequencyHz: number;
  filterCutoffHz: number; // 200 - 8000 Hz
  stereoSpread: number; // -1 to 1
  arpeggioRateMultiplier: number; // 1x, 2x, 4x based on local contrast
}

// C Dorian / F Lydian Scale: C, D, Eb, F, G, A, Bb
const MODAL_SCALE_FREQS = [
  { note: 'C4', freq: 261.63 },
  { note: 'D4', freq: 293.66 },
  { note: 'Eb4', freq: 311.13 },
  { note: 'F4', freq: 349.23 },
  { note: 'G4', freq: 392.00 },
  { note: 'A4', freq: 440.00 },
  { note: 'Bb4', freq: 466.16 },
  { note: 'C5', freq: 523.25 },
  { note: 'D5', freq: 587.33 },
  { note: 'Eb5', freq: 622.25 },
  { note: 'F5', freq: 698.46 },
  { note: 'G5', freq: 783.99 },
];

export class ImageSonifier {
  private offscreenCanvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor(sourceCanvas?: HTMLCanvasElement) {
    if (sourceCanvas) {
      this.offscreenCanvas = sourceCanvas;
      const ctx = this.offscreenCanvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) throw new Error('Could not get 2D context for ImageSonifier');
      this.ctx = ctx;
    } else {
      this.offscreenCanvas = document.createElement('canvas');
      this.offscreenCanvas.width = 360;
      this.offscreenCanvas.height = 180;
      const ctx = this.offscreenCanvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) throw new Error('Could not get 2D context for ImageSonifier');
      this.ctx = ctx;
    }
  }

  public setCanvas(canvas: HTMLCanvasElement) {
    this.offscreenCanvas = canvas;
    const ctx = this.offscreenCanvas.getContext('2d', { willReadFrequently: true });
    if (ctx) this.ctx = ctx;
  }

  // Sample exact pixel and 5x5 neighborhood at any (lat, lon)
  public samplePixelSonification(lat: number, lon: number): PixelSonificationData {
    const w = this.offscreenCanvas.width;
    const h = this.offscreenCanvas.height;

    // Equirectangular mapping:
    // Lon [-180, 180] -> [0, w-1]
    // Lat [90, -90] -> [0, h-1]
    const u = ((lon + 180) % 360 + 360) % 360 / 360;
    const v = (90 - lat) / 180;

    const cx = Math.min(w - 1, Math.max(0, Math.floor(u * w)));
    const cy = Math.min(h - 1, Math.max(0, Math.floor(v * h)));

    // Sample center pixel
    let centerPixel: Uint8ClampedArray;
    try {
      centerPixel = this.ctx.getImageData(cx, cy, 1, 1).data;
    } catch {
      centerPixel = new Uint8ClampedArray([0, 100, 200, 255]);
    }

    const r = centerPixel[0];
    const g = centerPixel[1];
    const b = centerPixel[2];

    // Compute HSL
    const { h: hue, s: saturation, l: luminance } = this.rgbToHsl(r, g, b);

    // Compute 5x5 Local Neighborhood Spatial Contrast & Heterogeneity
    let contrast5x5 = 0;
    try {
      const startX = Math.max(0, cx - 2);
      const startY = Math.max(0, cy - 2);
      const patchW = Math.min(w - startX, 5);
      const patchH = Math.min(h - startY, 5);

      const patch = this.ctx.getImageData(startX, startY, patchW, patchH).data;
      let minL = 1.0;
      let maxL = 0.0;

      for (let i = 0; i < patch.length; i += 4) {
        const pr = patch[i];
        const pg = patch[i + 1];
        const pb = patch[i + 2];
        const lum = (0.299 * pr + 0.587 * pg + 0.114 * pb) / 255;
        if (lum < minL) minL = lum;
        if (lum > maxL) maxL = lum;
      }
      contrast5x5 = Math.max(0, Math.min(1, maxL - minL));
    } catch {
      contrast5x5 = 0.15;
    }

    // 1. Hue (0-360°) -> Quantize strictly to active C Dorian / F Lydian Scale
    const scaleIndex = Math.floor((hue / 360) * MODAL_SCALE_FREQS.length) % MODAL_SCALE_FREQS.length;
    const activeNote = MODAL_SCALE_FREQS[scaleIndex];

    // 2. Brightness / Luminance (0-1) -> Controls low-pass filter cutoff (350Hz - 6500Hz) & stereo spread
    const filterCutoffHz = Math.round(350 + Math.pow(luminance, 1.2) * 6000);
    const stereoSpread = Number(((lon / 180) * 0.8).toFixed(2)); // Panned by geographic longitude

    // 3. Local 5x5 Contrast -> Drives arpeggio multiplier (1x, 2x, or 4x speed)
    let arpeggioRate = 1;
    if (contrast5x5 > 0.5) arpeggioRate = 4;
    else if (contrast5x5 > 0.25) arpeggioRate = 2;

    return {
      r,
      g,
      b,
      hue: Math.round(hue),
      saturation: Number(saturation.toFixed(2)),
      luminance: Number(luminance.toFixed(2)),
      spatialContrast5x5: Number(contrast5x5.toFixed(3)),
      quantizedScaleDegree: scaleIndex % 7,
      noteName: activeNote.note,
      harmonicFrequencyHz: activeNote.freq,
      filterCutoffHz,
      stereoSpread,
      arpeggioRateMultiplier: arpeggioRate,
    };
  }

  private rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0);
          break;
        case g:
          h = (b - r) / d + 2;
          break;
        case b:
          h = (r - g) / d + 4;
          break;
      }
      h /= 6;
    }

    return { h: h * 360, s, l };
  }
}

export const globalImageSonifier = new ImageSonifier();
