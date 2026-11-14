import json, os, sys, wave, numpy as np
from config import LAYERS, DURATION

SR = 22050
PENT = [0, 3, 5, 7, 10]                        # D-minor pentatonic scale
BREATH_K = {"dust": 12, "smoke": 40, "seasalt": 4, "sulfate": 20}

def adsr(n, a, r):
    e = np.ones(n); na, nr = min(n, int(a * SR)), min(n, int(r * SR))
    if na: e[:na] = np.linspace(0, 1, na)
    if nr: e[-nr:] *= np.linspace(1, 0, nr)
    return e

def organ(f, d, v):
    t = np.arange(int(d * SR)) / SR
    s = sum(a * np.sin(2 * np.pi * f * h * t) for h, a in [(1, 1), (2, .5), (3, .25)])
    return s * adsr(len(t), .3, .8)

def breath(f, d, v):
    n = int(d * SR); k = BREATH_K.get(v.get("type"), 15)
    x = np.convolve(np.random.randn(n), np.ones(k) / k, mode="same") * np.sqrt(k) * .5
    return x * adsr(n, .4, .6)

def strings(f, d, v):
    n = int(d * SR); t = np.arange(n) / SR
    slide = 0.3 * v.get("dx", 0)
    fr = f * (1 + slide * t / d) * (1 + 0.004 * np.sin(2 * np.pi * 5 * t))
    ph = 2 * np.pi * np.cumsum(fr) / SR
    return (np.sin(ph) + .5 * np.sin(2 * ph) + .3 * np.sin(3 * ph)) * adsr(n, .15, .5)

def bell(f, d, v):
    t = np.arange(int(d * SR)) / SR
    return np.sin(2 * np.pi * f * t + 2 * np.sin(2 * np.pi * f * 3.5 * t) * np.exp(-6 * t)) * np.exp(-4 * t)

SYN = dict(organ=organ, breath=breath, strings=strings, bell=bell)

def save_wav(path, stereo_audio):
    peak = np.max(np.abs(stereo_audio)) + 1e-6
    norm = np.clip(stereo_audio / peak * 0.85, -1.0, 1.0)
    pcm = (norm.T * 32767).astype(np.int16)
    with wave.open(path, "wb") as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2)
        wf.setframerate(SR)
        wf.writeframes(pcm.tobytes())
    print("Rendered:", path)

def render_layer(layer):
    cfg = LAYERS[layer]; sc = json.load(open(f"data/score/{layer}.json"))
    N = int(DURATION * SR); mix = np.zeros((2, N)); frames = sc["frames"]; flen = DURATION / len(frames)
    syn = SYN[cfg["instrument"]]
    for fr in frames:
        t0 = fr["i"] * flen
        for v in fr["voices"]:
            p = 1 - v["value"] if cfg["pitch"] == "value_inv" else (v["lat"] + 90) / 180
            idx = int(min(.999, max(0, p)) * 10)
            midi = cfg["root"] + 12 * (idx // 5) + PENT[idx % 5]
            f = 440 * 2 ** ((midi - 69) / 12)
            lo, hi = cfg["dur"]; d = lo + (hi - lo) * min(1, v["size"] * 15)
            start = t0 + (v["lon"] + 180) / 360 * flen * 0.9        # West -> East sweep
            a = int(start * SR)
            if a >= N: continue
            s = syn(f, d, v) * (0.3 + 0.7 * v["value"])
            dd = min(1, abs(v["drift"]) * 3)                        # Drift -> Detune beating
            if dd > 0.05 and cfg["instrument"] != "breath":
                detune_ratio = 2 ** ((dd * 0.45) / 12)              # Up to 45 cents sharp
                s = 0.65 * s + 0.35 * syn(f * detune_ratio, d, v) * (0.3 + 0.7 * v["value"])
            pan = (v["lon"] + 180) / 360                            # Stereo pan Left (West) -> Right (East)
            end = min(N, a + len(s))
            seg = s[:end - a]
            mix[0, a:end] += seg * np.cos(pan * np.pi / 2)
            mix[1, a:end] += seg * np.sin(pan * np.pi / 2)
    save_wav(f"output/{layer}.wav", mix)
    return mix

if __name__ == "__main__":
    targets = sys.argv[1:] or list(LAYERS.keys())
    full_mix = np.zeros((2, int(DURATION * SR)))
    for l in targets:
        if os.path.exists(f"data/score/{l}.json"):
            full_mix += render_layer(l)
    if len(targets) > 1:
        save_wav("output/earth_symphony.wav", full_mix)