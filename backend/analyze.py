import cv2, glob, json, os, sys, numpy as np
from config import LAYERS

W, H = 360, 180

def load(layer):
    files = sorted(glob.glob(f"data/frames/{layer}/*.png"))
    assert files, f"No frames found in data/frames/{layer}"
    return files, [cv2.resize(cv2.imread(f), (W, H), interpolation=cv2.INTER_AREA) for f in files]

def legend_lookup(img, cfg, max_dist=25):
    leg = cv2.imread(cfg["legend"])
    if leg.shape[0] > leg.shape[1]:
        leg = cv2.rotate(leg, cv2.ROTATE_90_CLOCKWISE)
    if cfg.get("legend_flip"): leg = leg[:, ::-1]
    leg = cv2.resize(leg, (256, 1), interpolation=cv2.INTER_AREA)
    L = cv2.cvtColor(leg, cv2.COLOR_BGR2LAB).reshape(256, 3).astype(np.float32)
    P = cv2.cvtColor(img, cv2.COLOR_BGR2LAB).reshape(-1, 3).astype(np.float32)
    d2 = (P ** 2).sum(1)[:, None] - 2 * P @ L.T + (L ** 2).sum(1)[None]
    v = d2.argmin(1) / 255.0
    v[np.sqrt(np.maximum(d2.min(1), 0)) > cfg.get("max_dist", max_dist)] = np.nan
    return v.reshape(H, W)

def category_fields(img, cfg):
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    out = {}
    for name, (lo, hi) in cfg["types"].items():
        m = cv2.inRange(hsv, np.array(lo), np.array(hi)).astype(np.float32) / 255
        out[name] = cv2.GaussianBlur(m, (0, 0), 3)
    return out

def extract(field, thresh, k, drift, vec=None, tag=None):
    f = np.nan_to_num(field)
    m = cv2.morphologyEx((f > thresh).astype(np.uint8), cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    n, lab, st, cen = cv2.connectedComponentsWithStats(m)
    out = []
    for i in range(1, n):
        a = st[i, cv2.CC_STAT_AREA]
        if a < 20: continue
        sel = lab == i
        v = dict(lon=cen[i][0] / W * 360 - 180, lat=90 - cen[i][1] / H * 180,
                 size=a / (W * H), value=float(f[sel].mean()), drift=float(drift[sel].mean()))
        if vec is not None:
            dx, dy = vec[sel].mean(0); mag = np.hypot(dx, dy) + 1e-6
            v["dx"], v["dy"] = float(dx / mag), float(dy / mag)
        if tag: v["type"] = tag
        out.append(v)
    out.sort(key=lambda v: -v["size"] * v["value"])
    return [{a: (round(b, 3) if isinstance(b, float) else b) for a, b in v.items()} for v in out[:k]]

def describe(cfg, k, n, voices):
    head = f"{cfg['label'].capitalize()}, frame {k+1} of {n}."
    if not voices: return head + " Almost nothing detected."
    v = max(voices, key=lambda v: v["size"] * v["value"])
    ns = "north" if v["lat"] >= 0 else "south"; ew = "east" if v["lon"] >= 0 else "west"
    s = f"{head} Strongest feature near {abs(v['lat']):.0f}° {ns}, {abs(v['lon']):.0f}° {ew}."
    d = np.mean([abs(x["drift"]) for x in voices])
    return s + (" Notes are detuned: significant change from baseline." if d > 0.1
                else " Notes are in tune: close to baseline.")

def run(layer):
    cfg = LAYERS[layer]; files, imgs = load(layer); n = len(imgs); kind = cfg["kind"]
    fields, vecs, typef = [], [None] * n, [None] * n
    if kind == "value":
        fields = [legend_lookup(i, cfg) for i in imgs]
    elif kind == "category":
        typef = [category_fields(i, cfg) for i in imgs]
        fields = [np.max(list(t.values()), axis=0) for t in typef]
    elif kind == "brightness":
        g = [cv2.cvtColor(i, cv2.COLOR_BGR2GRAY).astype(np.float32) for i in imgs]
        p = np.percentile(np.stack(g), 99) + 1e-6
        fields = [np.clip(x / p, 0, 1) for x in g]
    elif kind == "motion":
        assert n >= 2, "Currents requires at least 2 frames"
        gray = [cv2.cvtColor(i, cv2.COLOR_BGR2GRAY) for i in imgs]
        flows = [cv2.calcOpticalFlowFarneback(a, b, None, 0.5, 3, 15, 3, 5, 1.2, 0)
                 for a, b in zip(gray[:-1], gray[1:])]
        flows.append(flows[-1])
        speeds = [np.linalg.norm(f, axis=2) for f in flows]
        p = np.percentile(np.stack(speeds), 98) + 1e-6
        fields = [np.clip(s / p, 0, 1) for s in speeds]; vecs = flows

    stack = np.stack([np.nan_to_num(f) for f in fields])
    base = {"median": np.median(stack, 0), "first": stack[0]}.get(cfg["baseline"], stack[0] * 0 + stack.mean())
    frames_out = []
    for k in range(n):
        f = np.nan_to_num(fields[k]); drift = f - base
        if kind == "category":
            per = max(1, cfg["k"] // len(cfg["types"]))
            voices = [v for name, tf in typef[k].items()
                      for v in extract(tf, cfg["thresh"], per, drift, tag=name)]
        else:
            voices = extract(fields[k], cfg["thresh"], cfg["k"], drift, vec=vecs[k])
        frames_out.append(dict(
            i=k, file=os.path.basename(files[k]), mean=round(float(f.mean()), 3),
            bands=[round(float(s.mean()), 3) for s in np.array_split(f, 36, axis=1)],
            grid=np.round(cv2.resize(f, (72, 36), interpolation=cv2.INTER_AREA), 2).tolist(),
            voices=voices, text=describe(cfg, k, n, voices)))
        vis = cv2.applyColorMap((f * 255).astype(np.uint8), cv2.COLORMAP_VIRIDIS)
        for v in voices:
            cv2.circle(vis, (int((v["lon"] + 180) / 360 * W), int((90 - v["lat"]) / 180 * H)),
                       4, (255, 255, 255), 1)
        cv2.imwrite(f"data/debug/{layer}_{k:03d}.png", np.hstack([imgs[k], vis]))
    meta = {a: cfg[a] for a in ("kind", "instrument", "label", "baseline")}
    json.dump(dict(layer=layer, meta=meta, frames=frames_out), open(f"data/score/{layer}.json", "w"))
    print(f"{layer} -> {n} frames, {sum(len(f['voices']) for f in frames_out)} voices")

if __name__ == "__main__":
    for l in (sys.argv[1:] or LAYERS): run(l)