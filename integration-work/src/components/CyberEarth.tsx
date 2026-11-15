import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { ParameterId, earthDataEngine, SampledEarthTelemetry } from '../data/earthDataEngine';
import { COASTLINE_POLYLINES, BORDER_POLYLINES, Landmark } from '../data/worldBoundaries';
import { createDataScanGrid, DataScanGrid } from './dataScanGrid';

interface CyberEarthProps {
  activeParams: Record<ParameterId, boolean>;
  dataVersion: number;
  probeLat: number;
  probeLon: number;
  onProbeChange: (lat: number, lon: number) => void;
  autoPlayEnabled: boolean;
  autoPlaySource: Landmark | null;
  autoPlayDest: Landmark | null;
  autoPlayProgress: number; // 0..1
  isScanPlaneActive: boolean;
  hoverScanEnabled?: boolean;
  onReticleScreenPosChange?: (pos: { x: number; y: number } | null) => void;
}

const GLOBE_RADIUS = 2.0;

// Coordinate transformations matching Three.js equirectangular UV mapping
export function latLonToVector3(lat: number, lon: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);

  const x = -radius * Math.sin(phi) * Math.cos(theta);
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.sin(theta);

  return new THREE.Vector3(x, y, z);
}

export function vector3ToLatLon(v: THREE.Vector3, radius: number): { lat: number; lon: number } {
  const norm = v.clone().normalize();
  const lat = Math.asin(Math.max(-1, Math.min(1, norm.y))) * (180 / Math.PI);
  const theta = Math.atan2(norm.z, -norm.x);
  let lon = (theta * (180 / Math.PI)) - 180;
  while (lon < -180) lon += 360;
  while (lon > 180) lon -= 360;
  return { lat, lon };
}

export const CyberEarth: React.FC<CyberEarthProps> = ({
  activeParams,
  dataVersion,
  probeLat,
  probeLon,
  onProbeChange,
  autoPlayEnabled,
  autoPlaySource,
  autoPlayDest,
  autoPlayProgress,
  isScanPlaneActive,
  hoverScanEnabled = true,
  onReticleScreenPosChange
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const globeGroupRef = useRef<THREE.Group | null>(null);
  const globeMeshRef = useRef<THREE.Mesh | null>(null);
  const reticleGroupRef = useRef<THREE.Group | null>(null);
  const satelliteMeshRef = useRef<THREE.Group | null>(null);
  const routeArcMeshRef = useRef<THREE.Line | null>(null);
  const scanPlaneRef = useRef<DataScanGrid | null>(null);
  const scanReadoutRef = useRef<HTMLDivElement | null>(null);

  // Layer textures and meshes
  const layerMeshesRef = useRef<Record<ParameterId, THREE.Mesh | null>>({
    sst: null,
    aerosols: null,
    co2: null,
    forest: null
  });

  const isDraggingRef = useRef(false);
  const prevMouseRef = useRef({ x: 0, y: 0 });
  const autoPlayProgressRef = useRef(autoPlayProgress);
  autoPlayProgressRef.current = autoPlayProgress;
  // The Three.js loop is created once ([] deps), so it must read live values from refs
  const probeRef = useRef({ lat: probeLat, lon: probeLon });
  probeRef.current = { lat: probeLat, lon: probeLon };
  const scanActiveRef = useRef(isScanPlaneActive);
  scanActiveRef.current = isScanPlaneActive;
  const activeParamsRef = useRef(activeParams);
  activeParamsRef.current = activeParams;
  const reticleCbRef = useRef(onReticleScreenPosChange);
  reticleCbRef.current = onReticleScreenPosChange;
  const lastReticleRef = useRef<{ x: number; y: number } | null>(null);
  // Auto-play route caches (so the arc is not rebuilt every frame)
  const routeKeyRef = useRef('');
  const arcPointsRef = useRef<THREE.Vector3[]>([]);
  const lastRouteProbeRef = useRef<{ lat: number; lon: number } | null>(null);

  // Initialize Three.js scene
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0, 5.2);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.LinearToneMapping;
    rendererRef.current = renderer;
    container.appendChild(renderer.domElement);

    // Master Globe Group
    const globeGroup = new THREE.Group();
    scene.add(globeGroup);
    globeGroupRef.current = globeGroup;

    // 1. Base Earth Mesh (Dark Navy / Black Grid Sphere)
    const baseGeo = new THREE.SphereGeometry(GLOBE_RADIUS, 64, 64);
    const baseMat = new THREE.MeshBasicMaterial({
      color: 0x050c18,
      wireframe: false
    });
    const baseGlobe = new THREE.Mesh(baseGeo, baseMat);
    globeGroup.add(baseGlobe);
    globeMeshRef.current = baseGlobe;

    // 2. Graticule Lines (15° Lat/Lon Grid) in glowing cobalt blue
    const graticuleLines = createGraticuleLines(GLOBE_RADIUS * 1.001);
    globeGroup.add(graticuleLines);

    // 3. Crisp Vector Coastline & Country Boundary Lines
    const vectorCoastlines = createCoastlineLines(GLOBE_RADIUS * 1.002);
    globeGroup.add(vectorCoastlines);

    // 4. Data Layer Meshes (4 NASA parameters)
    const paramsList: ParameterId[] = ['sst', 'aerosols', 'co2', 'forest'];
    paramsList.forEach((param, i) => {
      const canvas = earthDataEngine.getEquirectangularCanvas(param);
      const texture = new THREE.CanvasTexture(canvas);
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.NearestFilter; // Crisp 16-bit pixel aesthetic

      const layerGeo = new THREE.SphereGeometry(GLOBE_RADIUS * (1.003 + i * 0.001), 64, 64);
      const layerMat = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        opacity: activeParams[param] ? 0.75 : 0.0,
        blending: param === 'sst' ? THREE.NormalBlending : THREE.AdditiveBlending,
        depthWrite: false
      });
      const layerMesh = new THREE.Mesh(layerGeo, layerMat);
      globeGroup.add(layerMesh);
      layerMeshesRef.current[param] = layerMesh;
    });

    // 5. Data scan grid: raised, data-coloured cells over the globe, with a band sweeping pole to pole (visual only)
    const scanGrid = createDataScanGrid(GLOBE_RADIUS);
    globeGroup.add(scanGrid.group);
    scanPlaneRef.current = scanGrid;
    if (earthDataEngine.isLoaded()) scanGrid.setData(activeParamsRef.current);

    // 6. Interactive 3D Target Reticle (Point Probe Mode)
    const reticleGroup = createReticle();
    globeGroup.add(reticleGroup);
    reticleGroupRef.current = reticleGroup;

    // 7. 3D Mini-Satellite Model for Auto-Play Mode
    const satelliteModel = createSatelliteModel();
    scene.add(satelliteModel); // Added to scene so it orbits above globe
    satelliteMeshRef.current = satelliteModel;
    satelliteModel.visible = false;

    // Animation Loop
    let animId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const elapsedTime = clock.getElapsedTime();

      // Scan plane sweep pulse
      if (scanPlaneRef.current) {
        scanPlaneRef.current.group.visible = scanActiveRef.current;
        if (scanActiveRef.current) {
          scanPlaneRef.current.update(elapsedTime); // band sweep only; no text readout is shown
        }
      }

      // Update Target Reticle Position in globe local space
      if (reticleGroupRef.current) {
        const reticleLocal = latLonToVector3(probeRef.current.lat, probeRef.current.lon, GLOBE_RADIUS * 1.015);
        reticleGroupRef.current.position.copy(reticleLocal);
        reticleGroupRef.current.lookAt(0, 0, 0);

        // Compute 2D Screen Coordinates for HUD leader-line callout
        if (cameraRef.current && reticleCbRef.current && rendererRef.current) {
          const worldPos = reticleGroupRef.current.getWorldPosition(new THREE.Vector3());
          // Check if reticle is on front-facing hemisphere
          const camDir = cameraRef.current.position.clone().sub(worldPos).normalize();
          const dot = worldPos.clone().normalize().dot(camDir);

          if (dot > 0.1) {
            const screenVec = worldPos.clone().project(cameraRef.current);
            const rect = rendererRef.current.domElement.getBoundingClientRect();
            const screenX = ((screenVec.x + 1) / 2) * rect.width;
            const screenY = ((-screenVec.y + 1) / 2) * rect.height;
            // only push to React when the reticle moved >=1px (was re-rendering the whole app at 60fps)
            const last = lastReticleRef.current;
            if (!last || Math.abs(last.x - screenX) >= 1 || Math.abs(last.y - screenY) >= 1) {
              lastReticleRef.current = { x: screenX, y: screenY };
              reticleCbRef.current({ x: screenX, y: screenY });
            }
          } else if (lastReticleRef.current) {
            lastReticleRef.current = null;
            reticleCbRef.current(null);
          }
        }
      }

      // Render Scene
      renderer.render(scene, camera);
    };

    animate();

    // Handle Resize
    const handleResize = () => {
      if (!container || !rendererRef.current || !cameraRef.current) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      if (scanReadoutRef.current && scanReadoutRef.current.parentNode) scanReadoutRef.current.parentNode.removeChild(scanReadoutRef.current);
      renderer.dispose();
    };
  }, []);

  // Replace each globe layer texture whenever a NASA frame is loaded or changed.
  useEffect(() => {
    if (dataVersion === 0 || !earthDataEngine.isLoaded()) return;
    (['sst', 'aerosols', 'co2', 'forest'] as ParameterId[]).forEach((param) => {
      const mesh = layerMeshesRef.current[param];
      if (!mesh || !(mesh.material instanceof THREE.MeshBasicMaterial)) return;
      const oldMap = mesh.material.map;
      const nextMap = new THREE.CanvasTexture(earthDataEngine.getEquirectangularCanvas(param));
      nextMap.minFilter = THREE.LinearFilter;
      nextMap.magFilter = THREE.NearestFilter;
      mesh.material.map = nextMap;
      mesh.material.needsUpdate = true;
      oldMap?.dispose();
    });
  }, [dataVersion]);

  // Update Data Layer Visibility & Opacity
  useEffect(() => {
    const paramsList: ParameterId[] = ['sst', 'aerosols', 'co2', 'forest'];
    paramsList.forEach((param) => {
      const mesh = layerMeshesRef.current[param];
      if (mesh && mesh.material instanceof THREE.MeshBasicMaterial) {
        const isAvail = earthDataEngine.isLoaded();
        const isToggled = activeParams[param];

        if (isToggled && isAvail && !isScanPlaneActive) {   // the scan grid replaces the flat painted layers
          mesh.material.opacity = param === 'sst' ? 0.8 : 0.65;
          mesh.visible = true;
        } else {
          mesh.material.opacity = 0.0;
          mesh.visible = false;
        }
      }
    });
  }, [activeParams, dataVersion, isScanPlaneActive]);

  // Rebuild the scan grid from the NASA data whenever a frame, a layer toggle or the scan switch changes
  useEffect(() => {
    if (!isScanPlaneActive || !earthDataEngine.isLoaded()) return;
    scanPlaneRef.current?.setData(activeParams);
  }, [activeParams, dataVersion, isScanPlaneActive]);

  // Exact Cursor-to-Sphere Raycast Alignment
  // Drag = spin the globe. Click (no real movement) = place the probe. Shift+drag = scrub the probe.
  const dragStartRef = useRef({ x: 0, y: 0 });
  const dragMovedRef = useRef(false);
  const lastHoverTimeRef = useRef(0);
  const lastHoverProbeRef = useRef<{ lat: number; lon: number } | null>(null);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingRef.current = true;
    dragMovedRef.current = false;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    prevMouseRef.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) {
      // Hover scan: the probe follows the pointer across the globe (no clicking needed).
      // Off while the satellite route is driving the probe, and for touch (where moving = dragging).
      if (hoverScanEnabled && !autoPlayEnabled && e.pointerType === 'mouse') {
        const nowMs = performance.now();
        if (nowMs - lastHoverTimeRef.current > 70) {
          lastHoverTimeRef.current = nowMs;
          performRaycast(e.clientX, e.clientY, true);
        }
      }
      return;
    }

    // ignore tiny jitters so a click does not turn into a drag
    if (!dragMovedRef.current) {
      const moved = Math.hypot(e.clientX - dragStartRef.current.x, e.clientY - dragStartRef.current.y);
      if (moved < 4) return;
      dragMovedRef.current = true;
    }

    const dx = e.clientX - prevMouseRef.current.x;
    const dy = e.clientY - prevMouseRef.current.y;
    prevMouseRef.current = { x: e.clientX, y: e.clientY };

    if (e.shiftKey) {
      performRaycast(e.clientX, e.clientY); // scrub the probe across the surface
    } else if (globeGroupRef.current) {
      globeGroupRef.current.rotation.y += dx * 0.005;
      // clamp so the globe cannot be flipped upside down
      globeGroupRef.current.rotation.x = Math.max(-1.4, Math.min(1.4, globeGroupRef.current.rotation.x + dy * 0.005));
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const wasClick = isDraggingRef.current && !dragMovedRef.current;
    isDraggingRef.current = false;
    dragMovedRef.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // Ignored if already released
    }
    if (wasClick) performRaycast(e.clientX, e.clientY);
  };

  // Perform Exact Raycast against the rotating sphere
  const performRaycast = useCallback((clientX: number, clientY: number, hover = false) => {
    const renderer = rendererRef.current;
    const camera = cameraRef.current;
    const globeMesh = globeMeshRef.current;
    if (!renderer || !camera || !globeMesh) return;

    const rect = renderer.domElement.getBoundingClientRect();
    const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -((clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);

    const intersects = raycaster.intersectObject(globeMesh, false);
    if (intersects.length > 0) {
      const hitPointWorld = intersects[0].point;
      // Convert world point to globeMesh local space (accounts for all rotations/scales)
      const localPoint = globeMesh.worldToLocal(hitPointWorld.clone());
      const { lat, lon } = vector3ToLatLon(localPoint, GLOBE_RADIUS);
      if (hover) {
        // skip tiny moves so telemetry and audio are not refreshed for nothing
        const lp = lastHoverProbeRef.current;
        if (lp && Math.abs(lp.lat - lat) < 0.4 && Math.abs(lp.lon - lon) < 0.4) return;
        lastHoverProbeRef.current = { lat, lon };
      }
      onProbeChange(lat, lon);
    }
  }, [onProbeChange]);

  // Update Route Arc & Satellite along great-circle geodesic in Auto-Play Mode
  useEffect(() => {
    const scene = sceneRef.current;
    const globeGroup = globeGroupRef.current;
    const satellite = satelliteMeshRef.current;
    if (!scene || !globeGroup || !satellite) return;

    if (!autoPlayEnabled || !autoPlaySource || !autoPlayDest) {
      satellite.visible = false;
      if (routeArcMeshRef.current) {
        routeArcMeshRef.current.visible = false;
      }
      return;
    }

    satellite.visible = true;

    // Create the geodesic signal arc only when the route changes (not on every progress tick)
    const routeKey = `${autoPlaySource.lat},${autoPlaySource.lon}>${autoPlayDest.lat},${autoPlayDest.lon}`;
    const segments = 48;
    if (routeKey !== routeKeyRef.current || !routeArcMeshRef.current) {
    const p1 = latLonToVector3(autoPlaySource.lat, autoPlaySource.lon, GLOBE_RADIUS * 1.005);
    const p2 = latLonToVector3(autoPlayDest.lat, autoPlayDest.lon, GLOBE_RADIUS * 1.005);

    // Compute Great-Circle arc points
    const newArcPoints: THREE.Vector3[] = [];
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      // Spherical linear interpolation (Slerp) on vectors
      const v = p1.clone().lerp(p2, t).normalize();
      // Arch height above globe surface (highest in middle)
      const altitude = GLOBE_RADIUS * (1.02 + 0.18 * Math.sin(t * Math.PI));
      newArcPoints.push(v.multiplyScalar(altitude));
    }

    if (routeArcMeshRef.current) {
      routeArcMeshRef.current.geometry.dispose();
      globeGroup.remove(routeArcMeshRef.current);
    }

    const arcGeo = new THREE.BufferGeometry().setFromPoints(newArcPoints);
    const arcMat = new THREE.LineBasicMaterial({
      color: 0x00ffcc,
      linewidth: 2,
      transparent: true,
      opacity: 0.85
    });
    const arcLine = new THREE.Line(arcGeo, arcMat);
    globeGroup.add(arcLine);
    routeArcMeshRef.current = arcLine;
    arcPointsRef.current = newArcPoints;
    routeKeyRef.current = routeKey;
    }
    if (routeArcMeshRef.current) routeArcMeshRef.current.visible = true;
    const arcPoints = arcPointsRef.current;

    // Place satellite at current progress along the arc
    const segIdx = Math.min(segments - 1, Math.floor(autoPlayProgress * segments));
    const nextIdx = Math.min(segments, segIdx + 1);
    const subT = (autoPlayProgress * segments) - segIdx;

    if (arcPoints[segIdx] && arcPoints[nextIdx]) {
      const localSatPos = arcPoints[segIdx].clone().lerp(arcPoints[nextIdx], subT);
      const worldSatPos = globeGroup.localToWorld(localSatPos.clone());
      satellite.position.copy(worldSatPos);
      satellite.lookAt(globeGroup.position);

      // Extract latitude & longitude beneath satellite
      const { lat, lon } = vector3ToLatLon(localSatPos, GLOBE_RADIUS);
      // only update the probe when the satellite has moved >= 0.2 degrees (was 60 app re-renders/sec)
      const lp = lastRouteProbeRef.current;
      if (!lp || Math.abs(lp.lat - lat) >= 0.2 || Math.abs(lp.lon - lon) >= 0.2) {
        lastRouteProbeRef.current = { lat, lon };
        onProbeChange(lat, lon);
      }

      // Smoothly rotate globe to keep the satellite centered in view.
      // Longitude L faces the camera when rotation.y = -L - 90deg (the old code was missing the -90deg,
      // which parked the satellite on the right edge of the globe). Take the shortest way round so the
      // globe does not spin the long way when the route crosses the 180 degree meridian.
      const targetRotY = -(lon * Math.PI) / 180 - Math.PI / 2;
      const targetRotX = (lat * Math.PI) / 360;
      let dy = (targetRotY - globeGroup.rotation.y) % (2 * Math.PI);
      if (dy > Math.PI) dy -= 2 * Math.PI;
      if (dy < -Math.PI) dy += 2 * Math.PI;
      if (!isDraggingRef.current) { // let the user turn the globe while auto-play is running
        globeGroup.rotation.y += dy * 0.05;
        globeGroup.rotation.x = THREE.MathUtils.lerp(globeGroup.rotation.x, targetRotX, 0.05);
      }
    }
  }, [autoPlayEnabled, autoPlaySource, autoPlayDest, autoPlayProgress, onProbeChange]);

  return (
    <div
      ref={mountRef}
      className="cyber-earth-viewport"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onContextMenu={(e) => e.preventDefault()}
      role="application"
      tabIndex={0}
      aria-label="Interactive Earth globe. Drag to rotate. Move the mouse over it to scan places, or use the arrow keys to move the probe."
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        cursor: 'grab',
        touchAction: 'none'
      }}
    />
  );
};

// Helper: 15° Cobalt-Blue Lat/Lon Graticule Lines
function createGraticuleLines(radius: number): THREE.LineSegments {
  const points: THREE.Vector3[] = [];

  // Latitude circles (-75 to +75 by 15°)
  for (let lat = -75; lat <= 75; lat += 15) {
    const latRad = (lat * Math.PI) / 180;
    const y = radius * Math.sin(latRad);
    const r = radius * Math.cos(latRad);

    const segments = 48;
    for (let i = 0; i < segments; i++) {
      const theta1 = (i / segments) * Math.PI * 2;
      const theta2 = ((i + 1) / segments) * Math.PI * 2;
      points.push(new THREE.Vector3(r * Math.cos(theta1), y, r * Math.sin(theta1)));
      points.push(new THREE.Vector3(r * Math.cos(theta2), y, r * Math.sin(theta2)));
    }
  }

  // Longitude meridians (-180 to 180 by 15°)
  for (let lon = -180; lon < 180; lon += 15) {
    const segments = 36;
    for (let i = 0; i < segments; i++) {
      const lat1 = -85 + (i / segments) * 170;
      const lat2 = -85 + ((i + 1) / segments) * 170;
      points.push(latLonToVector3(lat1, lon, radius));
      points.push(latLonToVector3(lat2, lon, radius));
    }
  }

  const geo = new THREE.BufferGeometry().setFromPoints(points);
  const mat = new THREE.LineBasicMaterial({
    color: 0x0044bb,
    transparent: true,
    opacity: 0.45
  });
  return new THREE.LineSegments(geo, mat);
}

// Helper: Crisp Vector Coastlines & Borders Lines
function createCoastlineLines(radius: number): THREE.LineSegments {
  const points: THREE.Vector3[] = [];

  // Coastlines
  COASTLINE_POLYLINES.forEach((poly) => {
    for (let i = 0; i < poly.length - 1; i++) {
      const p1 = latLonToVector3(poly[i][1], poly[i][0], radius);
      const p2 = latLonToVector3(poly[i + 1][1], poly[i + 1][0], radius);
      points.push(p1);
      points.push(p2);
    }
  });

  // Borders
  BORDER_POLYLINES.forEach((poly) => {
    for (let i = 0; i < poly.length - 1; i++) {
      const p1 = latLonToVector3(poly[i][1], poly[i][0], radius);
      const p2 = latLonToVector3(poly[i + 1][1], poly[i + 1][0], radius);
      points.push(p1);
      points.push(p2);
    }
  });

  const geo = new THREE.BufferGeometry().setFromPoints(points);
  const mat = new THREE.LineBasicMaterial({
    color: 0x00f0ff,
    transparent: true,
    opacity: 0.95
  });
  return new THREE.LineSegments(geo, mat);
}

// Helper: 16-Bit Target Reticle (Point Probe)
function createReticle(): THREE.Group {
  const group = new THREE.Group();

  // White square corner box ticks
  const s = 0.08;
  const points: THREE.Vector3[] = [
    // Top-left corner
    new THREE.Vector3(-s, s - s * 0.4, 0), new THREE.Vector3(-s, s, 0),
    new THREE.Vector3(-s, s, 0), new THREE.Vector3(-s + s * 0.4, s, 0),
    // Top-right corner
    new THREE.Vector3(s - s * 0.4, s, 0), new THREE.Vector3(s, s, 0),
    new THREE.Vector3(s, s, 0), new THREE.Vector3(s, s - s * 0.4, 0),
    // Bottom-right corner
    new THREE.Vector3(s, -s + s * 0.4, 0), new THREE.Vector3(s, -s, 0),
    new THREE.Vector3(s, -s, 0), new THREE.Vector3(s - s * 0.4, -s, 0),
    // Bottom-left corner
    new THREE.Vector3(-s + s * 0.4, -s, 0), new THREE.Vector3(-s, -s, 0),
    new THREE.Vector3(-s, -s, 0), new THREE.Vector3(-s, -s + s * 0.4, 0)
  ];

  const geo = new THREE.BufferGeometry().setFromPoints(points);
  const mat = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 });
  const box = new THREE.LineSegments(geo, mat);
  group.add(box);

  // Center glowing pixel dot
  const dotGeo = new THREE.PlaneGeometry(0.02, 0.02);
  const dotMat = new THREE.MeshBasicMaterial({ color: 0x00ffcc });
  const dot = new THREE.Mesh(dotGeo, dotMat);
  group.add(dot);

  return group;
}

// Helper: 16-Bit Retro 3D Mini-Satellite Model
function createSatelliteModel(): THREE.Group {
  const sat = new THREE.Group();

  // Central chassis bus
  const bodyGeo = new THREE.BoxGeometry(0.12, 0.12, 0.16);
  const bodyMat = new THREE.MeshBasicMaterial({ color: 0xddeeff });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  sat.add(body);

  // Dual cyan solar panels
  const panelGeo = new THREE.BoxGeometry(0.35, 0.08, 0.015);
  const panelMat = new THREE.MeshBasicMaterial({ color: 0x00ddff });

  const leftPanel = new THREE.Mesh(panelGeo, panelMat);
  leftPanel.position.set(-0.25, 0, 0);
  sat.add(leftPanel);

  const rightPanel = new THREE.Mesh(panelGeo, panelMat);
  rightPanel.position.set(0.25, 0, 0);
  sat.add(rightPanel);

  // Blinking green beacon
  const beaconGeo = new THREE.SphereGeometry(0.03, 8, 8);
  const beaconMat = new THREE.MeshBasicMaterial({ color: 0x00ff44 });
  const beacon = new THREE.Mesh(beaconGeo, beaconMat);
  beacon.position.set(0, 0.09, 0);
  sat.add(beacon);

  return sat;
}