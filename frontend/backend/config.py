LAYERS = {
  "forest": dict(
    kind="value", legend="config/legend_forest.png",
    thresh=0.15, k=24, instrument="organ", root=38, pitch="value_inv",
    dur=(3, 8), baseline=None, label="forest canopy height"),
  "aerosol": dict(
    kind="category", thresh=0.15, k=12, instrument="breath", root=62, pitch="lat",
    dur=(1.5, 4), baseline="median", label="aerosols",
    types={   # REPLACE with your sampled HSV ranges: ((low_H, low_S, low_V), (high_H, high_S, high_V))
      "dust":    ((15, 80, 80),  (30, 255, 255)),
      "smoke":   ((0, 80, 60),   (10, 255, 255)),
      "seasalt": ((90, 40, 80),  (110, 255, 255)),
      "sulfate": ((40, 60, 60),  (80, 255, 255)),
    }),
  "currents": dict(
    kind="motion", thresh=0.4, k=12, instrument="strings", root=50, pitch="lat",
    dur=(1.5, 3.5), baseline="median", label="ocean current motion"),
  "nightlights": dict(
    kind="brightness", thresh=0.3, k=40, instrument="bell", root=74, pitch="lat",
    dur=(0.5, 1.5), baseline="first", label="city lights"),
}
DURATION = 40   # Total seconds for one full playthrough