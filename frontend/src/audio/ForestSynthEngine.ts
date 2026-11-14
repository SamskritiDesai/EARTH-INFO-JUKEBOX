// ForestSynthEngine.ts (Themed Chord Engine)
// Calm, Ambient Bio-Acoustic Jukebox Synthesizer for TERRA-SCAN
// 4 Streamlined Parameters locked into a Soothing F Major 9 / D Minor 7 Palette at 72 BPM
// 1. Global Sea Surface Currents & Temp: Velvet Sub-Pad & Gentle Wave Wash
// 2. GEOS Aerosols: Lush "Flowy Chords" — Airy Lydian Pads
// 3. DYAMOND Global CO2: Deep, Soft Felt Bass Heartbeat
// 4. GEDI Forest Height: Warm Organic Rhodes & Soft Kalimba/Pad
// Supports Graceful Timeline Availability Masking & Master Crossfader

import { CanopyColumnData, DJMixerState, PlaybackMode } from '../types/forest';
import { TIMELINE_ERAS, TimelineEraId } from '../data/EarthDatasets';

export interface ChordVoicing {
  name: string;
  oceanChord: string;
  aerosolChord: string;
  co2BassNote: string;
  forestChord: string;
  co2BassHz: number;
  oceanTones: number[]; // e.g. Fmaj9 [F2, C3, E3, G3, A3]
  aerosolTones: number[]; // e.g. Cmaj9 / Fmaj7#11 [C3, G3, B3, E4, G4]
  forestTones: number[]; // e.g. Dm9 [D3, F3, A3, C4, E4]
  noteNames: string[];
}

// 4-Bar Soothing F Major 9 / D Minor 7 Ambient Pentatonic Progression (72 BPM)
const AMBIENT_PROGRESSION: ChordVoicing[] = [
  // Bar 1 (Steps 0–3): Fmaj9 (Warm, serene tonic)
  {
    name: 'Fmaj9 // Dm7',
    oceanChord: 'Fmaj9',
    aerosolChord: 'Cmaj9',
    co2BassNote: 'F1',
    forestChord: 'Fmaj7',
    co2BassHz: 43.65, // F1 (43.65 Hz)
    oceanTones: [87.31, 130.81, 164.81, 196.00, 220.00], // F2, C3, E3, G3, A3
    aerosolTones: [130.81, 196.00, 246.94, 329.63, 392.00], // C3, G3, B3, E4, G4
    forestTones: [174.61, 220.00, 261.63, 329.63], // F3, A3, C4, E4
    noteNames: ['F', 'A', 'C', 'E', 'G'],
  },
  // Bar 2 (Steps 4–7): Dm9 (Deep, reflective forest minor)
  {
    name: 'Dm9 // Fmaj7',
    oceanChord: 'Dm9',
    aerosolChord: 'Gsus2',
    co2BassNote: 'D1',
    forestChord: 'Dm9',
    co2BassHz: 36.71, // D1 (36.71 Hz)
    oceanTones: [73.42, 110.00, 146.83, 174.61, 220.00], // D2, A2, D3, F3, A3
    aerosolTones: [196.00, 293.66, 392.00, 440.00], // G3, D4, G4, A4
    forestTones: [146.83, 174.61, 220.00, 261.63, 329.63], // D3, F3, A3, C4, E4
    noteNames: ['D', 'F', 'A', 'C', 'E'],
  },
  // Bar 3 (Steps 8–11): Bbmaj7(#11) (Lush, expansive Lydian air)
  {
    name: 'Bbmaj7(#11) // C6',
    oceanChord: 'Bbmaj7',
    aerosolChord: 'Fmaj7#11',
    co2BassNote: 'Bb1',
    forestChord: 'Bbmaj9',
    co2BassHz: 58.27, // Bb1 (58.27 Hz)
    oceanTones: [116.54, 174.61, 220.00, 261.63, 293.66], // Bb2, F3, A3, C4, D4
    aerosolTones: [174.61, 246.94, 261.63, 329.63, 392.00], // F3, B3, C4, E4, G4
    forestTones: [233.08, 293.66, 349.23, 440.00], // Bb3, D4, F4, A4
    noteNames: ['Bb', 'D', 'F', 'A', 'C'],
  },
  // Bar 4 (Steps 12–15): Csus2(add9) (Warm resolution)
  {
    name: 'Csus2(9) // Am7',
    oceanChord: 'Csus2',
    aerosolChord: 'Cmaj9',
    co2BassNote: 'C2',
    forestChord: 'Am7',
    co2BassHz: 65.41, // C2 (65.41 Hz)
    oceanTones: [65.41, 98.00, 146.83, 196.00, 293.66], // C2, G2, D3, G3, D4
    aerosolTones: [130.81, 164.81, 196.00, 261.63, 329.63], // C3, E3, G3, C4, E4
    forestTones: [220.00, 261.63, 329.63, 392.00], // A3, C4, E4, G4
    noteNames: ['C', 'E', 'G', 'B', 'D'],
  },
];

export class ForestSynthEngine {
  private ctx: AudioContext | null = null;
  private isInitialized: boolean = false;
  private isPlaying: boolean = false;

  // Master Nodes
  private masterGain: GainNode | null = null;
  private masterLimiter: DynamicsCompressorNode | null = null;
  private masterReverb: ConvolverNode | null = null;
  private masterReverbGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;

  // Crossfader Buses
  private oceanAerosolBus: GainNode | null = null; // CH 1 (Ocean) & CH 2 (Aerosols)
  private forestCo2Bus: GainNode | null = null; // CH 3 (CO2) & CH 4 (Forest)

  // 4 Channel Gains
  private chOceanGain: GainNode | null = null;
  private chAerosolsGain: GainNode | null = null;
  private chCo2Gain: GainNode | null = null;
  private chForestGain: GainNode | null = null;

  // Channel 1: Ocean Breeze Wave Wash Pink Noise
  private oceanNoiseSource: AudioBufferSourceNode | null = null;
  private oceanNoiseFilter: BiquadFilterNode | null = null;
  private oceanNoiseGain: GainNode | null = null;

  // Channel 3: Deep Felt Bass Oscillators
  private subBassOsc: OscillatorNode | null = null;
  private subBassFilter: BiquadFilterNode | null = null;
  private subBassGain: GainNode | null = null;

  // Channel 4: Rhodes Stereo Tremolo
  private rhodesTremoloLfo: OscillatorNode | null = null;
  private rhodesTremoloGain: GainNode | null = null;

  // Timeline Availability Mask
  private timelineAvailability = {
    ocean: true,
    aerosols: true,
    co2: true,
    forest: true,
  };

  // Mixer State
  private mixerState: DJMixerState = {
    chOcean: { volume: 0.82, muted: false, solo: false, frequency: 174, activityLevel: 0, themeLabel: 'SEA CURRENTS', isAvailable: true },
    chAerosols: { volume: 0.80, muted: false, solo: false, frequency: 261, activityLevel: 0, themeLabel: 'GEOS AEROSOLS', isAvailable: true },
    chCo2: { volume: 0.88, muted: false, solo: false, frequency: 44, activityLevel: 0, themeLabel: 'DYAMOND CO2', isAvailable: true },
    chForest: { volume: 0.85, muted: false, solo: false, frequency: 220, activityLevel: 0, themeLabel: 'GEDI CANOPY', isAvailable: true },
    crossfader: 0.5,
    masterVolume: 0.85,
    bpm: 72, // Relaxed 72 BPM ambient tempo
    currentStep: 0,
    currentChord: 'Fmaj9 // Dm7',
    chordTones: ['F', 'A', 'C', 'E', 'G'],
    harmonicKey: 'F Major 9 / D Minor 7 Ambient Pentatonic',
    isPlaying: false,
    isAudioInitialized: false,
    playbackMode: 'MANUAL_POINTER',
    activeTimeline: 'full_composite',
  };

  private timerId: number | null = null;
  private stepDurationMs: number = 208; // 72 BPM 16th notes = ~208ms
  private activeColumnData: CanopyColumnData | null = null;

  private onStepCallbacks: ((step: number) => void)[] = [];
  private onStateChangeCallbacks: ((state: DJMixerState) => void)[] = [];

  constructor() {
    this.updateStepDuration();
  }

  public async initialize(): Promise<boolean> {
    if (this.isInitialized && this.ctx) {
      if (this.ctx.state === 'suspended') {
        await this.ctx.resume();
      }
      this.mixerState.isAudioInitialized = true;
      this.notifyStateChange();
      return true;
    }

    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      if (this.ctx.state === 'suspended') {
        await this.ctx.resume();
      }

      this.buildCalmAudioGraph();
      this.isInitialized = true;
      this.isPlaying = true;
      this.mixerState.isAudioInitialized = true;
      this.mixerState.isPlaying = true;

      this.startSequencer();
      this.notifyStateChange();
      return true;
    } catch (err) {
      console.error('Failed to initialize ambient jukebox Web Audio engine:', err);
      return false;
    }
  }

  // =========================================================================
  // CALM & WARM AMBIENT AUDIO GRAPH
  // =========================================================================
  private buildCalmAudioGraph() {
    if (!this.ctx) return;

    // 1. Master Output Chain (Soft Limiter, Analyser)
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.mixerState.masterVolume, this.ctx.currentTime);

    this.masterLimiter = this.ctx.createDynamicsCompressor();
    this.masterLimiter.threshold.setValueAtTime(-18, this.ctx.currentTime);
    this.masterLimiter.knee.setValueAtTime(10, this.ctx.currentTime);
    this.masterLimiter.ratio.setValueAtTime(3.5, this.ctx.currentTime);
    this.masterLimiter.attack.setValueAtTime(0.02, this.ctx.currentTime);
    this.masterLimiter.release.setValueAtTime(0.3, this.ctx.currentTime);

    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.smoothingTimeConstant = 0.88; // Gentle analog needle smoothing

    this.masterGain.connect(this.masterLimiter);
    this.masterLimiter.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);

    // 2. Reverb & Space Bus
    this.buildLushAmbientReverb();

    // 3. Crossfader Buses
    this.oceanAerosolBus = this.ctx.createGain();
    this.forestCo2Bus = this.ctx.createGain();
    this.oceanAerosolBus.connect(this.masterGain);
    this.forestCo2Bus.connect(this.masterGain);
    this.updateBusGains();

    // 4. CH-1: Global Sea Surface Currents & Temp
    this.chOceanGain = this.ctx.createGain();
    this.chOceanGain.connect(this.oceanAerosolBus);
    this.buildOceanWaveWash();

    // 5. CH-2: GEOS Aerosols (Lush "Flowy Chords" - Airy Lydian Pads)
    this.chAerosolsGain = this.ctx.createGain();
    this.chAerosolsGain.connect(this.oceanAerosolBus);
    if (this.masterReverbGain) this.chAerosolsGain.connect(this.masterReverbGain);

    // 6. CH-3: DYAMOND Global CO2 (Deep, Soft Felt Bass Heartbeat)
    this.chCo2Gain = this.ctx.createGain();
    this.chCo2Gain.connect(this.forestCo2Bus);
    this.buildDeepSubFeltBass();

    // 7. CH-4: GEDI Forest Height (Warm Organic Rhodes & Soft Kalimba/Pad)
    this.chForestGain = this.ctx.createGain();
    this.chForestGain.connect(this.forestCo2Bus);
    if (this.masterReverbGain) this.chForestGain.connect(this.masterReverbGain);

    this.updateChannelGains();
  }

  // Generates a soft, warm synthetic impulse response for ambient vinyl space
  private buildLushAmbientReverb() {
    if (!this.ctx) return;
    try {
      const sampleRate = this.ctx.sampleRate;
      const length = sampleRate * 2.2; // 2.2s lush tail
      const decay = 2.4;
      const buffer = this.ctx.createBuffer(2, length, sampleRate);
      const left = buffer.getChannelData(0);
      const right = buffer.getChannelData(1);

      for (let i = 0; i < length; i++) {
        const factor = Math.exp(-i / (sampleRate * (decay / 4)));
        left[i] = (Math.random() * 2 - 1) * factor * 0.25;
        right[i] = (Math.random() * 2 - 1) * factor * 0.25;
      }

      this.masterReverb = this.ctx.createConvolver();
      this.masterReverb.buffer = buffer;
      this.masterReverbGain = this.ctx.createGain();
      this.masterReverbGain.gain.setValueAtTime(0.35, this.ctx.currentTime);
      this.masterReverb.connect(this.masterReverbGain);
      if (this.masterGain) this.masterReverbGain.connect(this.masterGain);
    } catch {
      // Reverb fallback
    }
  }

  // Builds soft pink-noise ocean wave wash
  private buildOceanWaveWash() {
    if (!this.ctx || !this.chOceanGain) return;

    const bufferSize = this.ctx.sampleRate * 4;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.997 * b0 + white * 0.05;
      b1 = 0.985 * b1 + white * 0.11;
      b2 = 0.950 * b2 + white * 0.22;
      output[i] = (b0 + b1 + b2) * 0.04; // Very soft gentle wash
    }

    this.oceanNoiseSource = this.ctx.createBufferSource();
    this.oceanNoiseSource.buffer = noiseBuffer;
    this.oceanNoiseSource.loop = true;

    this.oceanNoiseFilter = this.ctx.createBiquadFilter();
    this.oceanNoiseFilter.type = 'lowpass';
    this.oceanNoiseFilter.frequency.setValueAtTime(450, this.ctx.currentTime);
    this.oceanNoiseFilter.Q.setValueAtTime(1.2, this.ctx.currentTime);

    this.oceanNoiseGain = this.ctx.createGain();
    this.oceanNoiseGain.gain.setValueAtTime(0.2, this.ctx.currentTime);

    this.oceanNoiseSource.connect(this.oceanNoiseFilter);
    this.oceanNoiseFilter.connect(this.oceanNoiseGain);
    this.oceanNoiseGain.connect(this.chOceanGain);

    this.oceanNoiseSource.start();
  }

  // Builds deep felt analog bass drone
  private buildDeepSubFeltBass() {
    if (!this.ctx || !this.chCo2Gain) return;

    this.subBassOsc = this.ctx.createOscillator();
    this.subBassOsc.type = 'sine';
    this.subBassOsc.frequency.setValueAtTime(43.65, this.ctx.currentTime); // F1

    this.subBassFilter = this.ctx.createBiquadFilter();
    this.subBassFilter.type = 'lowpass';
    this.subBassFilter.frequency.setValueAtTime(95, this.ctx.currentTime); // Pure warm sub bass
    this.subBassFilter.Q.setValueAtTime(2.0, this.ctx.currentTime);

    this.subBassGain = this.ctx.createGain();
    this.subBassGain.gain.setValueAtTime(0.4, this.ctx.currentTime);

    this.subBassOsc.connect(this.subBassFilter);
    this.subBassFilter.connect(this.subBassGain);
    this.subBassGain.connect(this.chCo2Gain);

    this.subBassOsc.start();
  }

  // =========================================================================
  // TELEMETRY UPDATES FOR THE 4 PARAMETERS
  // =========================================================================
  public updateTelemetry(data: CanopyColumnData) {
    this.activeColumnData = data;
    if (!this.ctx || !this.isInitialized) return;

    const now = this.ctx.currentTime;
    const { oceanCurrentSpeed, aerosolOpticalDepth, co2Ppm, maxCanopyHeight } = data;

    // 1. Ocean Currents: Modulate wave wash swell and gentle filter opening
    if (this.oceanNoiseFilter && this.oceanNoiseGain) {
      const oceanCut = 300 + oceanCurrentSpeed * 180;
      this.oceanNoiseFilter.frequency.setTargetAtTime(oceanCut, now, 0.3);
      const waveVol = Math.min(0.35, 0.12 + oceanCurrentSpeed * 0.1);
      this.oceanNoiseGain.gain.setTargetAtTime(waveVol, now, 0.3);
      this.mixerState.chOcean.frequency = Math.round(oceanCut);
    }

    // 2. GEOS Aerosols (Lush Flowy Pads): Clean Lydian air brightness (400 - 950 Hz)
    this.mixerState.chAerosols.frequency = Math.round(420 + aerosolOpticalDepth * 400);

    // 3. DYAMOND CO2: Sub bass frequency tuning
    if (this.subBassFilter) {
      const co2Sub = 75 + ((co2Ppm - 405) / 25) * 45;
      this.subBassFilter.frequency.setTargetAtTime(co2Sub, now, 0.2);
      this.mixerState.chCo2.frequency = Math.round(co2Sub);
    }

    // 4. GEDI Forest Height: Warm Rhodes & Kalimba resonance
    this.mixerState.chForest.frequency = Math.round(220 + (maxCanopyHeight / 60) * 260);
  }

  // =========================================================================
  // 16-STEP SEQUENCER RUNNER (HARMONIC LOCK PROGRESSION AT 72 BPM)
  // =========================================================================
  private startSequencer() {
    if (this.timerId !== null) clearInterval(this.timerId);

    this.timerId = window.setInterval(() => {
      if (!this.isPlaying || !this.ctx || this.ctx.state !== 'running') return;

      const step = (this.mixerState.currentStep + 1) % 16;
      this.mixerState.currentStep = step;

      this.triggerStepAudio(step);
      this.onStepCallbacks.forEach((cb) => cb(step));
    }, this.stepDurationMs);
  }

  private triggerStepAudio(step: number) {
    if (!this.ctx || !this.activeColumnData) return;
    const now = this.ctx.currentTime;
    const data = this.activeColumnData;

    // Harmonic Lock: 4-bar relaxing progression (4 steps per bar)
    const barIndex = Math.floor(step / 4);
    const chord = AMBIENT_PROGRESSION[barIndex % 4];

    // Update active chord names
    this.mixerState.currentChord = chord.name;
    this.mixerState.chordTones = chord.noteNames;
    this.mixerState.chOcean.chordName = chord.oceanChord;
    this.mixerState.chAerosols.chordName = chord.aerosolChord;
    this.mixerState.chCo2.chordName = chord.co2BassNote;
    this.mixerState.chForest.chordName = chord.forestChord;

    // Smooth activity damping
    this.mixerState.chOcean.activityLevel *= 0.75;
    this.mixerState.chAerosols.activityLevel *= 0.75;
    this.mixerState.chCo2.activityLevel *= 0.75;
    this.mixerState.chForest.activityLevel *= 0.75;

    // 1. TRIGGER SEA CURRENTS & TEMP (Velvet Sub-Pad & Warm Chords)
    // Only if unmuted and available in timeline
    if (!this.isChannelMuted('chOcean') && this.timelineAvailability.ocean && step % 4 === 0) {
      this.triggerVelvetOceanPad(now, chord.oceanTones, data.oceanCurrentSpeed);
      this.mixerState.chOcean.activityLevel = 0.9;
    }

    // 2. TRIGGER GEOS AEROSOLS (Lush "Flowy Chords" - Airy Lydian Pads)
    // Long 1.8s gentle swelling attack triggered on bar downbeats
    if (!this.isChannelMuted('chAerosols') && this.timelineAvailability.aerosols && (step === 0 || step === 8)) {
      this.triggerFlowyAerosolPad(now, chord.aerosolTones, data.aerosolOpticalDepth);
      this.mixerState.chAerosols.activityLevel = 0.95;
    }

    // 3. TRIGGER DYAMOND CO2 (Deep, Soft Felt Bass Heartbeat)
    // Slow steady heartbeat pulse on steps 0 and 8
    if (!this.isChannelMuted('chCo2') && this.timelineAvailability.co2 && (step === 0 || step === 8)) {
      this.triggerFeltBassHeartbeat(now, chord.co2BassHz, data.co2Ppm);
      this.mixerState.chCo2.activityLevel = 1.0;
    }

    // 4. TRIGGER GEDI FOREST HEIGHT (Warm Organic Rhodes & Soft Kalimba/Pad)
    // Gentle sustained rhodes voicings on syncopated steps (steps 1, 4, 7, 10, 13)
    if (!this.isChannelMuted('chForest') && this.timelineAvailability.forest && [1, 4, 7, 10, 13].includes(step)) {
      this.triggerWarmRhodesVoicing(now, step, chord.forestTones, data.maxCanopyHeight);
      this.mixerState.chForest.activityLevel = 0.9;
    }
  }

  // =========================================================================
  // CALM SOOTHING INSTRUMENT VOICINGS
  // =========================================================================

  // 1. Velvet Ocean Pad (Smooth sine + soft triangle with 1.4s release)
  private triggerVelvetOceanPad(time: number, chordTones: number[], currentSpeed: number) {
    if (!this.ctx || !this.chOceanGain) return;

    const voices = chordTones.slice(0, 3);
    voices.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, time);

      const amp = (0.24 / voices.length) * (0.8 + Math.min(0.5, currentSpeed * 0.2));
      gain.gain.setValueAtTime(0.001, time);
      gain.gain.linearRampToValueAtTime(amp, time + 0.6); // Slow 600ms attack
      gain.gain.exponentialRampToValueAtTime(0.001, time + 2.4); // 2.4s long warm release

      osc.connect(gain);
      gain.connect(this.chOceanGain!);

      osc.start(time);
      osc.stop(time + 2.5);
    });
  }

  // 2. GEOS Aerosols: Lush "Flowy Chords" Airy Lydian Pad
  // Smooth, weightless Cmaj9 / Fmaj7#11 / Gsus2 swells with slow 1.8s attack
  private triggerFlowyAerosolPad(time: number, chordTones: number[], aod: number) {
    if (!this.ctx || !this.chAerosolsGain) return;

    const voices = chordTones.slice(0, 4);
    const attackTime = 1.6;
    const releaseTime = 3.2;

    voices.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const filter = this.ctx!.createBiquadFilter();
      const gain = this.ctx!.createGain();

      // Sine for weightless airy texture
      osc.type = i % 2 === 0 ? 'sine' : 'triangle';
      // Gentle chorus detune
      osc.frequency.setValueAtTime(freq * (1 + (i - 1.5) * 0.003), time);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(850 + aod * 300, time); // Warm cutoff <= 1150 Hz
      filter.Q.setValueAtTime(0.8, time);

      gain.gain.setValueAtTime(0.001, time);
      gain.gain.linearRampToValueAtTime(0.2 / voices.length, time + attackTime);
      gain.gain.exponentialRampToValueAtTime(0.001, time + releaseTime);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.chAerosolsGain!);

      osc.start(time);
      osc.stop(time + releaseTime + 0.1);
    });
  }

  // 3. DYAMOND CO2: Deep, Soft Felt Bass Heartbeat
  // Round sub-octave sine/triangle bass with a slow, steady pulse
  private triggerFeltBassHeartbeat(time: number, rootHz: number, co2Ppm: number) {
    if (!this.ctx || !this.chCo2Gain) return;

    // Retune continuous sub drone smoothly
    if (this.subBassOsc) {
      this.subBassOsc.frequency.setTargetAtTime(rootHz, time, 0.15);
    }

    // Heartbeat felt pulse
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'triangle'; // Soft round felt bass
    osc.frequency.setValueAtTime(rootHz, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(80, time); // Deep warm lowpass (no harsh overtones)
    filter.Q.setValueAtTime(1.5, time);

    const amp = Math.min(0.55, 0.38 + ((co2Ppm - 405) / 25) * 0.15);
    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(amp, time + 0.12); // Soft felt attack
    gain.gain.exponentialRampToValueAtTime(0.001, time + 1.2); // Warm 1.2s decay

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.chCo2Gain);

    osc.start(time);
    osc.stop(time + 1.3);
  }

  // 4. GEDI Forest Height: Warm Organic Rhodes & Soft Kalimba/Pad
  // Silky vintage electric piano (sine + soft triangle) with subtle stereo tremolo
  private triggerWarmRhodesVoicing(time: number, step: number, chordTones: number[], canopyHeight: number) {
    if (!this.ctx || !this.chForestGain) return;

    const noteIdx = step % chordTones.length;
    const freq = chordTones[noteIdx];
    const notes = [freq, freq * 1.5]; // Root + gentle fifth harmonic

    notes.forEach((f, idx) => {
      const osc = this.ctx!.createOscillator();
      const filter = this.ctx!.createBiquadFilter();
      const gain = this.ctx!.createGain();

      osc.type = idx === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(f, time);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(750 + (canopyHeight / 60) * 350, time); // Max 1100 Hz warm cutoff
      filter.Q.setValueAtTime(1.0, time);

      const amp = (0.22 / notes.length) * (0.8 + (canopyHeight / 60) * 0.3);
      gain.gain.setValueAtTime(0.001, time);
      gain.gain.linearRampToValueAtTime(amp, time + 0.08); // Silky soft attack
      gain.gain.exponentialRampToValueAtTime(0.001, time + 1.4); // 1.4s gentle decay

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.chForestGain!);

      osc.start(time);
      osc.stop(time + 1.5);
    });
  }

  // =========================================================================
  // TIMELINE AVAILABILITY MASKING
  // =========================================================================
  public setTimelineEra(eraId: TimelineEraId) {
    const era = TIMELINE_ERAS.find((e) => e.id === eraId) || TIMELINE_ERAS[0];
    this.timelineAvailability = { ...era.availability };
    this.mixerState.activeTimeline = era.id;

    // Update availability in channel states
    this.mixerState.chOcean.isAvailable = era.availability.ocean;
    this.mixerState.chAerosols.isAvailable = era.availability.aerosols;
    this.mixerState.chCo2.isAvailable = era.availability.co2;
    this.mixerState.chForest.isAvailable = era.availability.forest;

    this.updateChannelGains();
    this.notifyStateChange();
  }

  public getTimelineAvailability() {
    return { ...this.timelineAvailability };
  }

  // =========================================================================
  // CONTROLS & CROSSFADER
  // =========================================================================
  public setChannelVolume(ch: 'chOcean' | 'chAerosols' | 'chCo2' | 'chForest', vol: number) {
    this.mixerState[ch].volume = Math.max(0, Math.min(1, vol));
    this.updateChannelGains();
    this.notifyStateChange();
  }

  public toggleMute(ch: 'chOcean' | 'chAerosols' | 'chCo2' | 'chForest') {
    this.mixerState[ch].muted = !this.mixerState[ch].muted;
    this.updateChannelGains();
    this.notifyStateChange();
  }

  public toggleSolo(ch: 'chOcean' | 'chAerosols' | 'chCo2' | 'chForest') {
    this.mixerState[ch].solo = !this.mixerState[ch].solo;
    this.updateChannelGains();
    this.notifyStateChange();
  }

  // Master Crossfader: [ FLOWY AIR/OCEAN <====|====> WARM FOREST/CO2 ]
  public setCrossfader(val: number) {
    this.mixerState.crossfader = Math.max(0, Math.min(1, val));
    this.updateBusGains();
    this.notifyStateChange();
  }

  public setMasterVolume(val: number) {
    this.mixerState.masterVolume = Math.max(0, Math.min(1, val));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.mixerState.masterVolume, this.ctx.currentTime);
    }
    this.notifyStateChange();
  }

  public setBPM(bpm: number) {
    this.mixerState.bpm = Math.max(50, Math.min(120, bpm));
    this.updateStepDuration();
    if (this.isPlaying) {
      this.startSequencer();
    }
    this.notifyStateChange();
  }

  public setPlaybackMode(mode: PlaybackMode) {
    this.mixerState.playbackMode = mode;
    this.notifyStateChange();
  }

  public togglePlayPause() {
    this.isPlaying = !this.isPlaying;
    this.mixerState.isPlaying = this.isPlaying;
    if (this.isPlaying) {
      this.startSequencer();
    }
    this.notifyStateChange();
  }

  private isChannelMuted(ch: 'chOcean' | 'chAerosols' | 'chCo2' | 'chForest'): boolean {
    const hasSolo =
      this.mixerState.chOcean.solo ||
      this.mixerState.chAerosols.solo ||
      this.mixerState.chCo2.solo ||
      this.mixerState.chForest.solo;

    if (hasSolo) {
      return !this.mixerState[ch].solo;
    }
    return this.mixerState[ch].muted;
  }

  private updateChannelGains() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const gainMap: Record<'chOcean' | 'chAerosols' | 'chCo2' | 'chForest', GainNode | null> = {
      chOcean: this.chOceanGain,
      chAerosols: this.chAerosolsGain,
      chCo2: this.chCo2Gain,
      chForest: this.chForestGain,
    };

    const availabilityMap: Record<'chOcean' | 'chAerosols' | 'chCo2' | 'chForest', boolean> = {
      chOcean: this.timelineAvailability.ocean,
      chAerosols: this.timelineAvailability.aerosols,
      chCo2: this.timelineAvailability.co2,
      chForest: this.timelineAvailability.forest,
    };

    (['chOcean', 'chAerosols', 'chCo2', 'chForest'] as const).forEach((ch) => {
      const node = gainMap[ch];
      if (node) {
        // If not available in timeline, cleanly mute/bypass
        const isAvail = availabilityMap[ch];
        const isMuted = this.isChannelMuted(ch) || !isAvail;
        const targetGain = isMuted ? 0 : this.mixerState[ch].volume;
        node.gain.setTargetAtTime(targetGain, now, 0.08);
      }
    });
  }

  private updateBusGains() {
    if (!this.ctx || !this.oceanAerosolBus || !this.forestCo2Bus) return;
    const now = this.ctx.currentTime;
    const x = this.mixerState.crossfader;
    // Equal-power crossfade curve
    const oceanAerosolGain = Math.cos(x * 0.5 * Math.PI);
    const forestCo2Gain = Math.sin(x * 0.5 * Math.PI);

    this.oceanAerosolBus.gain.setTargetAtTime(oceanAerosolGain, now, 0.08);
    this.forestCo2Bus.gain.setTargetAtTime(forestCo2Gain, now, 0.08);
  }

  private updateStepDuration() {
    this.stepDurationMs = (60 / this.mixerState.bpm / 4) * 1000;
  }

  public getWaveformData(array: Uint8Array) {
    if (this.analyser) {
      (this.analyser as unknown as { getByteTimeDomainData: (arr: Uint8Array) => void }).getByteTimeDomainData(array);
    } else {
      array.fill(128);
    }
  }

  public getFrequencyData(array: Uint8Array) {
    if (this.analyser) {
      (this.analyser as unknown as { getByteFrequencyData: (arr: Uint8Array) => void }).getByteFrequencyData(array);
    } else {
      array.fill(0);
    }
  }

  public getMixerState(): DJMixerState {
    return { ...this.mixerState };
  }

  public onStep(cb: (step: number) => void) {
    this.onStepCallbacks.push(cb);
  }

  public onStateChange(cb: (state: DJMixerState) => void) {
    this.onStateChangeCallbacks.push(cb);
  }

  private notifyStateChange() {
    this.onStateChangeCallbacks.forEach((cb) => cb({ ...this.mixerState }));
  }
}

export const globalSynthEngine = new ForestSynthEngine();
