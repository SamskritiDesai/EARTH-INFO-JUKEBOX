// EARTH FM - Calm & Warm Ambient Jukebox Synthesis Engine
// Built strictly with Web Audio API, C Major Pentatonic / F Lydian Quantization,
// Slow 0.8s-2.0s attack/release envelopes, master plate reverb, and zero click setTargetAtTime smoothing.

import { ParameterId, SampledEarthTelemetry } from '../data/earthDataEngine';

// Frequencies for C Major Pentatonic / F Lydian in warm octaves (C2 to C5)
export const SCALE_FREQS = {
  // Octave 2 (Sub drone: 65Hz - 110Hz)
  C2: 65.41,
  D2: 73.42,
  E2: 82.41,
  F2: 87.31,
  G2: 98.00,
  A2: 110.00,
  // Octave 3 (Mid warm: 130Hz - 220Hz)
  C3: 130.81,
  D3: 146.83,
  E3: 164.81,
  F3: 174.61,
  G3: 196.00,
  A3: 220.00,
  B3: 246.94,
  // Octave 4 (Pads & Felt Piano: 261Hz - 440Hz)
  C4: 261.63,
  D4: 293.66,
  E4: 329.63,
  F4: 349.23,
  G4: 392.00,
  A4: 440.00,
  B4: 493.88,
  // Octave 5 (Sparkle accents)
  C5: 523.25,
  D5: 587.33,
  E5: 659.25
};

export interface ChannelControl {
  id: ParameterId;
  name: string;
  volume: number; // 0..1
  muted: boolean;
  solo: boolean;
  cutoff: number; // 200..8000 Hz
  resonance: number; // 0..10
}

export interface ActiveNoteInfo {
  note: string;
  freq: number;
  channel: ParameterId;
  intensity: number;
}

export class ThemedChordEngine {
  private ctx: AudioContext | null = null;
  private isUnlocked = false;
  private isPlaying = true;

  // Master Bus & FX
  private masterGain: GainNode | null = null;
  private masterFilter: BiquadFilterNode | null = null;
  private analyser: AnalyserNode | null = null;
  private reverbConvolver: ConvolverNode | null = null;
  private reverbGain: GainNode | null = null;
  private dryGain: GainNode | null = null;

  // DJ Crossfader (-1.0 = Bank A [SST + Aerosols], +1.0 = Bank B [CO2 + Forest])
  private crossfaderPosition = 0.0;
  private bankAGain: GainNode | null = null;
  private bankBGain: GainNode | null = null;

  // Channel Nodes & States
  private channelGains: Record<ParameterId, GainNode | null> = {
    sst: null,
    aerosols: null,
    co2: null,
    forest: null
  };
  private channelFilters: Record<ParameterId, BiquadFilterNode | null> = {
    sst: null,
    aerosols: null,
    co2: null,
    forest: null
  };
  private channelControls: Record<ParameterId, ChannelControl> = {
    sst: { id: 'sst', name: 'SST & Currents', volume: 0.75, muted: false, solo: false, cutoff: 1800, resonance: 1.2 },
    aerosols: { id: 'aerosols', name: 'GEOS Aerosols', volume: 0.70, muted: false, solo: false, cutoff: 2400, resonance: 1.5 },
    co2: { id: 'co2', name: 'DYAMOND CO2', volume: 0.72, muted: false, solo: false, cutoff: 800, resonance: 2.0 },
    forest: { id: 'forest', name: 'GEDI Canopy', volume: 0.78, muted: false, solo: false, cutoff: 2200, resonance: 1.0 }
  };

  // 1. Channel 1: Sea Surface Temp & Currents (Liquid E-Piano / Warm Sine-Pad)
  private sstOscs: OscillatorNode[] = [];
  private sstChorusLfo: OscillatorNode | null = null;
  private sstChorusDepth: GainNode | null = null;

  // 2. Channel 2: GEOS Aerosols (Lush Maj9 / Sus2 Ambient Pads)
  private aerosolOscs: OscillatorNode[] = [];
  private aerosolSubGain: GainNode | null = null;

  // 3. Channel 3: DYAMOND CO2 (Soft Warm Sub-Pad C2-G2 Breathing Drone)
  private co2Osc1: OscillatorNode | null = null;
  private co2Osc2: OscillatorNode | null = null;
  private co2Lfo: OscillatorNode | null = null;
  private co2LfoGain: GainNode | null = null;

  // 4. Channel 4: GEDI Forest Height (Warm Acoustic Kalimba / Felt Piano Chords)
  private kalimbaGain: GainNode | null = null;
  private kalimbaDelay: DelayNode | null = null;
  private kalimbaFeedback: GainNode | null = null;

  // Real-time smoothed chord tracking & throttling (transitions every 2-4 seconds)
  private lastChordSwitchTime = 0;
  private chordIntervalSec = 3.0; // relaxed 75-80 BPM pacing
  private activeNotes: ActiveNoteInfo[] = [];

  constructor() {
    // AudioContext will be initialized on first user gesture
  }

  public async unlock(): Promise<boolean> {
    if (this.isUnlocked && this.ctx) {
      if (this.ctx.state === 'suspended') {
        await this.ctx.resume();
      }
      return true;
    }

    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      if (this.ctx.state === 'suspended') {
        await this.ctx.resume();
      }

      this.buildAudioGraph();
      this.isUnlocked = true;
      return true;
    } catch (err) {
      console.warn('AudioContext failed to unlock:', err);
      return false;
    }
  }

  private buildAudioGraph() {
    if (!this.ctx) return;
    const ctx = this.ctx;

    // 1. Master Section
    this.masterGain = ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.85, ctx.currentTime);

    // Warm Master Low-pass Filter (~1400Hz to eliminate all harsh edges)
    this.masterFilter = ctx.createBiquadFilter();
    this.masterFilter.type = 'lowpass';
    this.masterFilter.frequency.setValueAtTime(1400, ctx.currentTime);
    this.masterFilter.Q.setValueAtTime(0.7, ctx.currentTime);

    // Analyser Node for HUD Oscilloscope & Heatmap
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 512;
    this.analyser.smoothingTimeConstant = 0.82;

    // Lush Reverb (Impulse response generated algorithmically)
    this.reverbConvolver = ctx.createConvolver();
    this.reverbConvolver.buffer = this.createPlateReverbBuffer(2.4, 0.03);

    this.reverbGain = ctx.createGain();
    this.reverbGain.gain.setValueAtTime(0.38, ctx.currentTime);

    this.dryGain = ctx.createGain();
    this.dryGain.gain.setValueAtTime(0.75, ctx.currentTime);

    // Connect Reverb & Master Bus
    this.dryGain.connect(this.masterFilter);
    this.reverbConvolver.connect(this.reverbGain);
    this.reverbGain.connect(this.masterFilter);

    this.masterFilter.connect(this.masterGain);
    this.masterGain.connect(this.analyser);
    this.analyser.connect(ctx.destination);

    // 2. DJ Crossfader Banks
    this.bankAGain = ctx.createGain();
    this.bankBGain = ctx.createGain();
    this.updateCrossfader(0.0);

    this.bankAGain.connect(this.dryGain);
    this.bankAGain.connect(this.reverbConvolver);
    this.bankBGain.connect(this.dryGain);
    this.bankBGain.connect(this.reverbConvolver);

    // 3. Channel Strips (Bank A = SST + Aerosols, Bank B = CO2 + Forest)
    const channelIds: ParameterId[] = ['sst', 'aerosols', 'co2', 'forest'];
    channelIds.forEach((id) => {
      const chGain = ctx.createGain();
      chGain.gain.setValueAtTime(this.channelControls[id].volume, ctx.currentTime);
      this.channelGains[id] = chGain;

      const chFilter = ctx.createBiquadFilter();
      chFilter.type = 'lowpass';
      chFilter.frequency.setValueAtTime(this.channelControls[id].cutoff, ctx.currentTime);
      chFilter.Q.setValueAtTime(this.channelControls[id].resonance, ctx.currentTime);
      this.channelFilters[id] = chFilter;

      chFilter.connect(chGain);

      // Route to Crossfader Bank
      if (id === 'sst' || id === 'aerosols') {
        chGain.connect(this.bankAGain!);
      } else {
        chGain.connect(this.bankBGain!);
      }
    });

    // 4. Initialize Continuous Synth Voices
    this.initSstVoice();
    this.initAerosolsVoice();
    this.initCo2Voice();
    this.initForestVoice();
  }

  // Create gentle synthetic plate impulse response for soothing ambient decay
  private createPlateReverbBuffer(duration: number, decay: number): AudioBuffer {
    if (!this.ctx) throw new Error('No ctx');
    const rate = this.ctx.sampleRate;
    const length = Math.floor(rate * duration);
    const impulse = this.ctx.createBuffer(2, length, rate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const t = i / length;
      const env = Math.exp(-t * (1 / decay));
      const n1 = (Math.random() * 2 - 1) * env;
      const n2 = (Math.random() * 2 - 1) * env;
      left[i] = n1 * 0.5;
      right[i] = n2 * 0.5;
    }
    return impulse;
  }

  // Channel 1: SST & Ocean Currents Voice
  private initSstVoice() {
    if (!this.ctx || !this.channelFilters.sst) return;
    const ctx = this.ctx;

    // Liquid warm chord: Fmaj7 / C chord (F3, A3, C4, E4)
    const freqs = [SCALE_FREQS.F3, SCALE_FREQS.A3, SCALE_FREQS.C4];
    this.sstOscs = freqs.map((f, i) => {
      const osc = ctx.createOscillator();
      osc.type = i === 0 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(f, ctx.currentTime);

      const oscGain = ctx.createGain();
      oscGain.gain.setValueAtTime(0.22, ctx.currentTime);
      osc.connect(oscGain);
      oscGain.connect(this.channelFilters.sst!);
      osc.start();
      return osc;
    });

    // Gentle wave stereo chorus
    this.sstChorusLfo = ctx.createOscillator();
    this.sstChorusLfo.frequency.setValueAtTime(0.18, ctx.currentTime); // slow wave sweep
    this.sstChorusDepth = ctx.createGain();
    this.sstChorusDepth.gain.setValueAtTime(4.5, ctx.currentTime);
    this.sstChorusLfo.connect(this.sstChorusDepth);
    this.sstChorusLfo.start();

    if (this.sstOscs[1]) {
      this.sstChorusDepth.connect(this.sstOscs[1].frequency);
    }
  }

  // Channel 2: GEOS Aerosols Voice (Lush Maj9 / Sus2 Airy Ambient Pads)
  private initAerosolsVoice() {
    if (!this.ctx || !this.channelFilters.aerosols) return;
    const ctx = this.ctx;

    // Weightless Cmaj9 / Fmaj7#11 pad: (C4, E4, G4, D5)
    const padFreqs = [SCALE_FREQS.C4, SCALE_FREQS.E4, SCALE_FREQS.G4, SCALE_FREQS.D5];
    this.aerosolOscs = padFreqs.map((f, i) => {
      const osc = ctx.createOscillator();
      // Sine and soft triangle for silky, non-abrasive pads
      osc.type = i % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(f, ctx.currentTime);

      const g = ctx.createGain();
      g.gain.setValueAtTime(0.18, ctx.currentTime);
      osc.connect(g);
      g.connect(this.channelFilters.aerosols!);
      osc.start();
      return osc;
    });
  }

  // Channel 3: DYAMOND CO2 Voice (Soft Warm Sub-Pad C2-G2 Breathing Drone)
  private initCo2Voice() {
    if (!this.ctx || !this.channelFilters.co2) return;
    const ctx = this.ctx;

    this.co2Osc1 = ctx.createOscillator();
    this.co2Osc1.type = 'sine';
    this.co2Osc1.frequency.setValueAtTime(SCALE_FREQS.C2, ctx.currentTime); // 65.4 Hz root

    this.co2Osc2 = ctx.createOscillator();
    this.co2Osc2.type = 'triangle';
    this.co2Osc2.frequency.setValueAtTime(SCALE_FREQS.G2, ctx.currentTime); // 98.0 Hz fifth

    // Slow breathing LFO (0.08 Hz = ~12 sec breath cycle)
    this.co2Lfo = ctx.createOscillator();
    this.co2Lfo.frequency.setValueAtTime(0.08, ctx.currentTime);
    this.co2LfoGain = ctx.createGain();
    this.co2LfoGain.gain.setValueAtTime(0.08, ctx.currentTime);

    const subGain = ctx.createGain();
    subGain.gain.setValueAtTime(0.35, ctx.currentTime);

    this.co2Lfo.connect(this.co2LfoGain);
    this.co2LfoGain.connect(subGain.gain);

    this.co2Osc1.connect(subGain);
    this.co2Osc2.connect(subGain);
    subGain.connect(this.channelFilters.co2);

    this.co2Osc1.start();
    this.co2Osc2.start();
    this.co2Lfo.start();
  }

  // Channel 4: GEDI Forest Canopy Voice (Warm Acoustic Kalimba / Felt Piano)
  private initForestVoice() {
    if (!this.ctx || !this.channelFilters.forest) return;
    const ctx = this.ctx;

    this.kalimbaGain = ctx.createGain();
    this.kalimbaGain.gain.setValueAtTime(0.35, ctx.currentTime);

    // Warm organic stereo tape delay for felt piano echoes
    this.kalimbaDelay = ctx.createDelay();
    this.kalimbaDelay.delayTime.setValueAtTime(0.38, ctx.currentTime); // dotted eighth note feel

    this.kalimbaFeedback = ctx.createGain();
    this.kalimbaFeedback.gain.setValueAtTime(0.32, ctx.currentTime);

    this.kalimbaDelay.connect(this.kalimbaFeedback);
    this.kalimbaFeedback.connect(this.kalimbaDelay);
    this.kalimbaDelay.connect(this.channelFilters.forest);

    this.kalimbaGain.connect(this.channelFilters.forest);
    this.kalimbaGain.connect(this.kalimbaDelay);
  }

  // Trigger gentle felt piano / kalimba notes on forest canopy density changes
  public triggerKalimbaNote(freq: number, velocity: number = 0.5) {
    if (!this.ctx || !this.kalimbaGain || !this.channelControls.forest.volume || this.channelControls.forest.muted) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = 'triangle'; // woody, soft felt-hammer timbre
    osc.frequency.setValueAtTime(freq, now);

    const env = ctx.createGain();
    // Warm soothing attack and gentle decay
    env.gain.setValueAtTime(0.0001, now);
    env.gain.exponentialRampToValueAtTime(Math.min(0.35, velocity * 0.4), now + 0.04);
    env.gain.exponentialRampToValueAtTime(0.0001, now + 1.6);

    osc.connect(env);
    env.connect(this.kalimbaGain);

    osc.start(now);
    osc.stop(now + 1.8);
  }

  // Smooth real-time modulation driven by Earth Telemetry
  public updateTelemetry(telemetry: SampledEarthTelemetry) {
    if (!this.ctx || !this.isUnlocked) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const smoothingTau = 0.35; // Heavy exponential smoothing (zero pops or clicks)

    // Check availability matrix: mute voices that are not available in the current timeline
    this.syncAvailabilityWithGains(telemetry);

    // 1. Modulate SST liquid piano voice
    if (telemetry.sst.available && this.sstOscs.length > 0) {
      // Current speed (0-2.5 m/s) modulates wave chorus speed and filter
      const vel = telemetry.sst.velocityMs;
      const normSst = telemetry.sst.normalized;
      if (this.sstChorusLfo) {
        this.sstChorusLfo.frequency.setTargetAtTime(0.12 + vel * 0.15, now, smoothingTau);
      }
      if (this.channelFilters.sst) {
        const targetCutoff = 800 + normSst * 1600;
        this.channelFilters.sst.frequency.setTargetAtTime(targetCutoff, now, smoothingTau);
      }
    }

    // 2. Modulate GEOS Aerosols pad
    if (telemetry.aerosols.available && this.channelFilters.aerosols) {
      const aod = telemetry.aerosols.aod;
      const targetPadCutoff = 1200 + Math.min(1.5, aod) * 1800;
      this.channelFilters.aerosols.frequency.setTargetAtTime(targetPadCutoff, now, smoothingTau);
    }

    // 3. Modulate DYAMOND CO2 sub drone
    if (telemetry.co2.available && this.co2Osc1 && this.co2Osc2) {
      const normCo2 = telemetry.co2.normalized; // 0..1 (405 to 435 ppm)
      // Slight pitch glide between C2 (65.4Hz) and D2 (73.4Hz)
      const targetSubFreq = SCALE_FREQS.C2 + normCo2 * 8.0;
      this.co2Osc1.frequency.setTargetAtTime(targetSubFreq, now, smoothingTau);
      this.co2Osc2.frequency.setTargetAtTime(SCALE_FREQS.G2 + normCo2 * 6.0, now, smoothingTau);

      if (this.channelFilters.co2) {
        this.channelFilters.co2.frequency.setTargetAtTime(320 + normCo2 * 500, now, smoothingTau);
      }
    }

    // 4. Modulate GEDI Forest Canopy
    if (telemetry.forest.available && this.channelFilters.forest) {
      const height = telemetry.forest.heightMeters;
      const targetCanopyCutoff = 1000 + (height / 65) * 2200;
      this.channelFilters.forest.frequency.setTargetAtTime(targetCanopyCutoff, now, smoothingTau);
    }

    // Relaxed periodic chord progression step (every 2-4 seconds)
    if (now - this.lastChordSwitchTime > this.chordIntervalSec) {
      this.lastChordSwitchTime = now;
      this.stepChordVoicing(telemetry);
    }
  }

  // Smoothly morph chord voicings across C Major Pentatonic / F Lydian
  private stepChordVoicing(telemetry: SampledEarthTelemetry) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const tau = 0.5; // Smooth slow chord transitions

    const activeList: ActiveNoteInfo[] = [];

    // Chords database in C Major Pentatonic & F Lydian:
    // Chords: 0 = Cmaj9, 1 = Fmaj7#11, 2 = Gsus2, 3 = Am7, 4 = Dm9
    const chordBank = [
      { name: 'Cmaj9', sst: [SCALE_FREQS.C3, SCALE_FREQS.G3, SCALE_FREQS.E4], aero: [SCALE_FREQS.G3, SCALE_FREQS.B3, SCALE_FREQS.D4, SCALE_FREQS.E4], kalimba: SCALE_FREQS.B4 },
      { name: 'Fmaj7#11', sst: [SCALE_FREQS.F3, SCALE_FREQS.C4, SCALE_FREQS.A4], aero: [SCALE_FREQS.A3, SCALE_FREQS.C4, SCALE_FREQS.E4, SCALE_FREQS.B4], kalimba: SCALE_FREQS.C5 },
      { name: 'Gsus2', sst: [SCALE_FREQS.G2, SCALE_FREQS.D3, SCALE_FREQS.G3], aero: [SCALE_FREQS.A3, SCALE_FREQS.D4, SCALE_FREQS.G4, SCALE_FREQS.A4], kalimba: SCALE_FREQS.D5 },
      { name: 'Am7', sst: [SCALE_FREQS.A2, SCALE_FREQS.E3, SCALE_FREQS.C4], aero: [SCALE_FREQS.C4, SCALE_FREQS.E4, SCALE_FREQS.G4, SCALE_FREQS.C5], kalimba: SCALE_FREQS.E5 }
    ];

    // Pick chord index based on geographic location / temperature
    const chordIdx = Math.floor(Math.abs(telemetry.lat * 3 + telemetry.lon * 2)) % chordBank.length;
    const chord = chordBank[chordIdx];

    // Transition SST oscillators
    if (telemetry.sst.available && this.sstOscs.length >= 3) {
      chord.sst.forEach((f, i) => {
        if (this.sstOscs[i]) {
          this.sstOscs[i].frequency.setTargetAtTime(f, now, tau);
        }
      });
      activeList.push({ note: chord.name, freq: chord.sst[0], channel: 'sst', intensity: telemetry.sst.normalized });
    }

    // Transition GEOS Aerosols pads
    if (telemetry.aerosols.available && this.aerosolOscs.length >= 4) {
      chord.aero.forEach((f, i) => {
        if (this.aerosolOscs[i]) {
          this.aerosolOscs[i].frequency.setTargetAtTime(f, now, tau);
        }
      });
      activeList.push({ note: chord.name + ' Pad', freq: chord.aero[0], channel: 'aerosols', intensity: telemetry.aerosols.normalized });
    }

    // Trigger Kalimba note if canopy exists
    if (telemetry.forest.available && telemetry.forest.heightMeters > 5) {
      const kalimbaFreq = chord.kalimba;
      this.triggerKalimbaNote(kalimbaFreq, Math.min(1.0, telemetry.forest.heightMeters / 50));
      activeList.push({ note: 'Kalimba', freq: kalimbaFreq, channel: 'forest', intensity: telemetry.forest.normalized });
    }

    if (telemetry.co2.available) {
      activeList.push({ note: 'C2 Sub', freq: SCALE_FREQS.C2, channel: 'co2', intensity: telemetry.co2.normalized });
    }

    this.activeNotes = activeList;
  }

  // Ensure unavailable timeline parameters are completely silenced
  private syncAvailabilityWithGains(telemetry: SampledEarthTelemetry) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const params: ParameterId[] = ['sst', 'aerosols', 'co2', 'forest'];

    // Check solo states
    const hasSolo = params.some((p) => this.channelControls[p].solo);

    params.forEach((p) => {
      const g = this.channelGains[p];
      if (!g) return;

      const isAvail = telemetry[p].available;
      const ctrl = this.channelControls[p];

      let targetGain = 0;
      if (isAvail && this.isPlaying) {
        if (hasSolo) {
          targetGain = ctrl.solo ? ctrl.volume : 0;
        } else {
          targetGain = ctrl.muted ? 0 : ctrl.volume;
        }
      }
      g.gain.setTargetAtTime(targetGain, now, 0.2);
    });
  }

  // DJ Crossfader Control (-1.0 to +1.0)
  public updateCrossfader(pos: number) {
    this.crossfaderPosition = Math.max(-1, Math.min(1, pos));
    if (!this.ctx || !this.bankAGain || !this.bankBGain) return;
    const now = this.ctx.currentTime;

    // Equal-power crossfader curve
    const x = (this.crossfaderPosition + 1) / 2; // 0..1
    const gainA = Math.cos(x * 0.5 * Math.PI);
    const gainB = Math.sin(x * 0.5 * Math.PI);

    this.bankAGain.gain.setTargetAtTime(gainA, now, 0.05);
    this.bankBGain.gain.setTargetAtTime(gainB, now, 0.05);
  }

  public setChannelVolume(param: ParameterId, vol: number) {
    this.channelControls[param].volume = Math.max(0, Math.min(1, vol));
  }

  public toggleMute(param: ParameterId): boolean {
    this.channelControls[param].muted = !this.channelControls[param].muted;
    return this.channelControls[param].muted;
  }

  public toggleSolo(param: ParameterId): boolean {
    this.channelControls[param].solo = !this.channelControls[param].solo;
    return this.channelControls[param].solo;
  }

  public setChannelCutoff(param: ParameterId, cutoffHz: number) {
    this.channelControls[param].cutoff = cutoffHz;
    if (this.ctx && this.channelFilters[param]) {
      this.channelFilters[param]!.frequency.setTargetAtTime(cutoffHz, this.ctx.currentTime, 0.05);
    }
  }

  public setChannelResonance(param: ParameterId, q: number) {
    this.channelControls[param].resonance = q;
    if (this.ctx && this.channelFilters[param]) {
      this.channelFilters[param]!.Q.setTargetAtTime(q, this.ctx.currentTime, 0.05);
    }
  }

  public setMasterGain(gain: number) {
    if (this.ctx && this.masterGain) {
      this.masterGain.gain.setTargetAtTime(Math.max(0, Math.min(1.5, gain)), this.ctx.currentTime, 0.05);
    }
  }

  public togglePlayPause(): boolean {
    this.isPlaying = !this.isPlaying;
    if (this.ctx && this.masterGain) {
      this.masterGain.gain.setTargetAtTime(this.isPlaying ? 0.85 : 0.0001, this.ctx.currentTime, 0.2);
    }
    return this.isPlaying;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public getChannelControls(): Record<ParameterId, ChannelControl> {
    return this.channelControls;
  }

  public getCrossfaderPosition(): number {
    return this.crossfaderPosition;
  }

  public getActiveNotes(): ActiveNoteInfo[] {
    return this.activeNotes;
  }

  public getAudioFrequencyData(array: Uint8Array) {
    if (this.analyser) {
      this.analyser.getByteFrequencyData(array as unknown as Uint8Array<ArrayBuffer>);
    }
  }

  public getAudioTimeDomainData(array: Uint8Array) {
    if (this.analyser) {
      this.analyser.getByteTimeDomainData(array as unknown as Uint8Array<ArrayBuffer>);
    }
  }
}

export const synthEngine = new ThemedChordEngine();
