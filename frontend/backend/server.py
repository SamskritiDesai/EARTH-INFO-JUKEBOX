import json, os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from config import LAYERS, DURATION

app = FastAPI(title="TERRA-SCAN // Earth Score API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs("output", exist_ok=True)
os.makedirs("data/frames", exist_ok=True)

app.mount("/audio", StaticFiles(directory="output"), name="audio")
app.mount("/frames", StaticFiles(directory="data/frames"), name="frames")

@app.get("/api/layers")
def list_layers():
    available = [l for l in LAYERS if os.path.exists(f"data/score/{l}.json")]
    return {"duration": DURATION, "layers": available}

@app.get("/api/score/{layer}")
def get_score(layer: str):
    path = f"data/score/{layer}.json"
    if not os.path.exists(path):
        raise HTTPException(404, f"Score not found for {layer}. Run analyze.py first.")
    data = json.load(open(path))
    data["texture_url"] = f"http://localhost:8000/frames/{layer}/000.png"
    data["audio_url"] = f"http://localhost:8000/audio/{layer}.wav"
    return data