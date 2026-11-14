import cv2, sys, os, numpy as np

IMG = (".png", ".jpg", ".jpeg", ".tif", ".tiff")

def show_scaled(img, max_w=1400):
    s = min(1.0, max_w / img.shape[1])
    return cv2.resize(img, None, fx=s, fy=s), s

def pick(img, msg):
    small, s = show_scaled(img)
    x, y, w, h = cv2.selectROI(msg, small, False)
    cv2.destroyAllWindows()
    return int(x / s), int(y / s), int(w / s), int(h / s)

def frames(layer, srcs, n=24):
    out = f"data/frames/{layer}"; os.makedirs(out, exist_ok=True)
    if len(srcs) == 1 and not srcs[0].lower().endswith(IMG):
        cap = cv2.VideoCapture(srcs[0]); ok, f0 = cap.read(); assert ok, "cannot read video"
    else:
        cap = None; f0 = cv2.imread(srcs[0])
    cv2.imwrite(f"data/raw/{layer}_first.png", f0)
    x, y, w, h = pick(f0, "Drag box over BARE MAP ONLY (no titles/legends). Press ENTER")
    imgs = []
    if cap is not None:
        total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        for idx in np.linspace(0, total - 1, n).astype(int):
            cap.set(cv2.CAP_PROP_POS_FRAMES, int(idx)); ok, f = cap.read()
            if ok: imgs.append(f)
    else:
        imgs = [cv2.imread(s) for s in srcs]
    for k, f in enumerate(imgs):
        crop = cv2.resize(f[y:y+h, x:x+w], (720, 360), interpolation=cv2.INTER_AREA)
        cv2.imwrite(f"{out}/{k:03d}.png", crop)
    print(f"Saved {len(imgs)} frames to {out}")

def legend(layer, img_path):
    img = cv2.imread(img_path)
    x, y, w, h = pick(img, "Drag TIGHT box over COLOR BAR only. Press ENTER")
    cv2.imwrite(f"config/legend_{layer}.png", img[y:y+h, x:x+w])
    print("Saved", f"config/legend_{layer}.png")

def colors(path):
    img = cv2.imread(path); hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    small, s = show_scaled(img); name = "Click legend colors, press Q to quit"
    def cb(e, x, y, *a):
        if e == cv2.EVENT_LBUTTONDOWN:
            X, Y = int(x / s), int(y / s)
            print("BGR:", img[Y, X].tolist(), " -> HSV:", hsv[Y, X].tolist())
    cv2.imshow(name, small); cv2.setMouseCallback(name, cb)
    while cv2.waitKey(50) != ord("q"): pass
    cv2.destroyAllWindows()

if __name__ == "__main__":
    c = sys.argv[1]
    if c == "frames": frames(sys.argv[2], sys.argv[3:])
    if c == "legend": legend(sys.argv[2], sys.argv[3])
    if c == "colors": colors(sys.argv[2])