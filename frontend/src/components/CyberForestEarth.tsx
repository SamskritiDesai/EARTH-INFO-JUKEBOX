// CyberForestEarth.tsx
// Interactive 3D Earth Globe with Split Cybernetic Wireframe + Adaptive 2D/3D Forest Canopy
// Features 360° Laser Scan Plane, Target Reticle with Leader Lines, and GeoJSON region boundaries

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { CanopyColumnData, DatasetMode, HoverTooltipInfo, PlaybackMode, RegionBiome, ScanAxisConfig } from '../types/forest';
import { globalForestLoader } from '../data/UniversalForestLoader';
import { globalSynthEngine } from '../audio/ForestSynthEngine';

interface CyberForestEarthProps {
  datasetMode: DatasetMode;
  playbackMode: PlaybackMode;
  activeRegion: RegionBiome | null;
  targetCoord?: { lat: number; lon: number } | null;
  activeScanAxis: ScanAxisConfig;
  scanRPM: number;
  isScanning: boolean;
  zElevationGate: number;
  onProbeUpdate: (data: CanopyColumnData) => void;
  onSetHoverTooltip: (info: HoverTooltipInfo | null) => void;
}

export const CyberForestEarth: React.FC<CyberForestEarthProps> = ({
  datasetMode,
  playbackMode,
  activeRegion,
  targetCoord,
  activeScanAxis,
  scanRPM,
  isScanning,
  zElevationGate,
  onProbeUpdate,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [activeLatLon, setActiveLatLon] = useState<{ lat: number; lon: number }>({ lat: -3.46, lon: -62.21 }); // Amazon start
  const [reticleScreenPos, setReticleScreenPos] = useState<{ x: number; y: number } | null>(null);

  // Three.js References
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const globeGroupRef = useRef<THREE.Group | null>(null);
  const surfaceMeshRef = useRef<THREE.Mesh | null>(null);
  const wireframeGlobeRef = useRef<THREE.LineSegments | null>(null);
  const voxelInstancesRef = useRef<THREE.InstancedMesh | null>(null);
  const scanPlaneRef = useRef<THREE.Group | null>(null);
  const reticleAnchorRef = useRef<THREE.Group | null>(null);
  const regionHighlightMeshRef = useRef<THREE.Line | null>(null);

  // Interaction State
  const isDraggingRef = useRef(false);
  const prevMousePosRef = useRef({ x: 0, y: 0 });
  const globeRotationRef = useRef({ x: 0.15, y: -1.2 }); // Euler angles
  const targetLatLonRef = useRef({ lat: -3.46, lon: -62.21 });
  const activeLatLonRef = useRef({ lat: -3.46, lon: -62.21 });
  const canvasTextureRef = useRef<THREE.CanvasTexture | null>(null);

  // 1. Setup Three.js Scene, Camera, Renderer, Materials, Geometries
  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 0, 4.8);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0); // Transparent so cobalt CSS grid shows through!
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x00ccff, 1.5);
    dirLight.position.set(5, 3, 5);
    scene.add(dirLight);

    // Master Globe Group
    const globeGroup = new THREE.Group();
    globeGroupRef.current = globeGroup;
    scene.add(globeGroup);

    // 2. Base Surface Globe (Sphere with Canvas Texture)
    const globeRadius = 1.6;
    const globeGeo = new THREE.SphereGeometry(globeRadius, 64, 48);

    // Offscreen Canvas Texture from UniversalForestLoader
    const offscreenCanvas = globalForestLoader.getCanvas2D();
    const canvasTexture = new THREE.CanvasTexture(offscreenCanvas);
    canvasTexture.minFilter = THREE.NearestFilter; // Pixel-art crispness
    canvasTexture.magFilter = THREE.NearestFilter;
    canvasTextureRef.current = canvasTexture;

    const surfaceMat = new THREE.MeshBasicMaterial({
      map: canvasTexture,
      transparent: true,
      opacity: 0.95,
    });
    const surfaceMesh = new THREE.Mesh(globeGeo, surfaceMat);
    surfaceMeshRef.current = surfaceMesh;
    globeGroup.add(surfaceMesh);

    // 3. Glowing Cobalt-Blue Wireframe Latitude/Longitude Cage
    const wireGeo = new THREE.WireframeGeometry(new THREE.SphereGeometry(globeRadius * 1.008, 24, 16));
    const wireMat = new THREE.LineBasicMaterial({
      color: 0x0055ff,
      transparent: true,
      opacity: 0.45,
    });
    const wireframeGlobe = new THREE.LineSegments(wireGeo, wireMat);
    wireframeGlobeRef.current = wireframeGlobe;
    globeGroup.add(wireframeGlobe);

    // 4. Outer Equator & Coordinate Rings
    const ringGeo = new THREE.RingGeometry(globeRadius * 1.22, globeRadius * 1.25, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x002277,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.6,
    });
    const orbitalRing = new THREE.Mesh(ringGeo, ringMat);
    orbitalRing.rotation.x = Math.PI / 2;
    globeGroup.add(orbitalRing);

    // 5. Angled 3D Green Wireframe Laser Scan Plane (#00DD00 / #00FF55)
    const scanPlaneGroup = new THREE.Group();
    const planeGeo = new THREE.PlaneGeometry(5.2, 5.2, 26, 26);
    const planeWireGeo = new THREE.WireframeGeometry(planeGeo);
    const planeMat = new THREE.LineBasicMaterial({
      color: 0x00ff66,
      transparent: true,
      opacity: 0.35,
    });
    const planeMesh = new THREE.LineSegments(planeWireGeo, planeMat);
    planeMesh.rotation.x = Math.PI / 2; // horizontal orbital plane
    scanPlaneGroup.add(planeMesh);

    // Bright Laser Edge Circle
    const laserRingGeo = new THREE.RingGeometry(1.61, 1.63, 64);
    const laserRingMat = new THREE.MeshBasicMaterial({
      color: 0x00ff88,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
    });
    const laserRing = new THREE.Mesh(laserRingGeo, laserRingMat);
    laserRing.rotation.x = Math.PI / 2;
    scanPlaneGroup.add(laserRing);

    scanPlaneRef.current = scanPlaneGroup;
    scene.add(scanPlaneGroup);

    // 6. 3D Volumetric Extruded Canopy Spikes (InstancedMesh)
    const spikeCount = 2800;
    const spikeGeo = new THREE.BoxGeometry(0.016, 0.016, 0.08); // extruded spike
    const spikeMat = new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
    });
    const voxelInstances = new THREE.InstancedMesh(spikeGeo, spikeMat, spikeCount);
    voxelInstancesRef.current = voxelInstances;
    buildVoxelSpikeGrid(voxelInstances, globeRadius);
    globeGroup.add(voxelInstances);

    // 7. Reticle Target 3D Anchor
    const reticleGroup = new THREE.Group();
    const reticleGeo = new THREE.RingGeometry(0.04, 0.06, 16);
    const reticleMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide,
    });
    const reticleCircle = new THREE.Mesh(reticleGeo, reticleMat);
    reticleGroup.add(reticleCircle);

    // Normal pointer line
    const ptrLineGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, 0.25),
    ]);
    const ptrLine = new THREE.Line(ptrLineGeo, new THREE.LineBasicMaterial({ color: 0x00ffaa }));
    reticleGroup.add(ptrLine);

    reticleAnchorRef.current = reticleGroup;
    globeGroup.add(reticleGroup);

    // Initial position probe
    updateReticlePosition(-3.46, -62.21, globeRadius);

    // 8. Animation & Render Loop
    let animId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      // Two Playback Modes: Automated Ensemble Mode (Auto-Play Whole Globe) vs Manual Pointer
      const shouldAutoSweep = playbackMode === 'AUTO_PLAY_GLOBE' || isScanning;
      if (shouldAutoSweep) {
        const rpm = scanRPM || 10;
        const radPerSec = (rpm * 2 * Math.PI) / 60;
        globeRotationRef.current.y += radPerSec * delta;

        // Calculate lon from current globe rotation
        let scanLon = ((-globeRotationRef.current.y * 180) / Math.PI) % 360;
        if (scanLon > 180) scanLon -= 360;
        if (scanLon < -180) scanLon += 360;

        const baseLat = activeScanAxis.type === 'LATITUDE' ? activeScanAxis.value : 0;
        const undulatingLat = Math.max(-75, Math.min(75, baseLat + Math.sin(elapsed * 0.35) * 6));

        activeLatLonRef.current = { lat: undulatingLat, lon: scanLon };
        setActiveLatLon({ lat: undulatingLat, lon: scanLon });
        updateReticlePosition(undulatingLat, scanLon, globeRadius);

        const data = globalForestLoader.sampleCanopyColumn(undulatingLat, scanLon);
        globalSynthEngine.updateTelemetry(data);
        onProbeUpdate(data);
      }

      // Smooth camera/globe interpolation to target rotation if region changed
      if (globeGroupRef.current) {
        globeGroupRef.current.rotation.x = globeRotationRef.current.x;
        globeGroupRef.current.rotation.y = globeRotationRef.current.y;
      }

      // Pulse scan plane laser
      if (scanPlaneRef.current) {
        const pulse = 0.3 + 0.15 * Math.sin(elapsed * 4);
        (planeMat as THREE.LineBasicMaterial).opacity = pulse;
      }

      // Update Screen Coordinates of Target Reticle for 2D HUD Leader Line
      if (reticleAnchorRef.current && cameraRef.current) {
        const worldPos = new THREE.Vector3();
        reticleAnchorRef.current.getWorldPosition(worldPos);

        // Check if facing camera
        const camDir = new THREE.Vector3();
        cameraRef.current.getWorldDirection(camDir);
        const toTarget = worldPos.clone().sub(cameraRef.current.position).normalize();

        const isFrontFacing = worldPos.z > -0.2; // roughly front hemisphere
        if (isFrontFacing) {
          const proj = worldPos.clone().project(cameraRef.current);
          const sx = ((proj.x + 1) / 2) * width;
          const sy = ((-proj.y + 1) / 2) * height;
          setReticleScreenPos({ x: sx, y: sy });
        } else {
          setReticleScreenPos(null);
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    // 9. Resize Observer
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
      if (rendererRef.current && rendererRef.current.domElement) {
        container.removeChild(rendererRef.current.domElement);
      }
      renderer.dispose();
    };
  }, []);

  // Update Volumetric Voxel Spikes
  const buildVoxelSpikeGrid = (mesh: THREE.InstancedMesh, radius: number) => {
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    let idx = 0;

    // Distribute sample points across globe
    const latSteps = 50;
    const lonSteps = 60;

    for (let i = 0; i < latSteps; i++) {
      const lat = 85 - (i / (latSteps - 1)) * 170;
      const phi = (90 - lat) * (Math.PI / 180);

      for (let j = 0; j < lonSteps; j++) {
        const lon = -180 + (j / lonSteps) * 360;
        const theta = (lon + 180) * (Math.PI / 180);

        if (idx >= mesh.count) break;

        const { heightMeters } = globalForestLoader.calculateForestHeightAtCoordinate(lat, lon);

        if (heightMeters > 3) {
          // Position on sphere surface
          const x = -radius * Math.sin(phi) * Math.cos(theta);
          const y = radius * Math.cos(phi);
          const z = radius * Math.sin(phi) * Math.sin(theta);

          dummy.position.set(x, y, z);
          dummy.lookAt(x * 2, y * 2, z * 2);

          // Extrude length proportional to tree height (RH98: 0 to 60m)
          const scaleZ = Math.max(0.2, (heightMeters / 60) * 3.5);
          dummy.scale.set(1, 1, scaleZ);
          dummy.updateMatrix();
          mesh.setMatrixAt(idx, dummy.matrix);

          // Rainbow Thermal Color based on height
          const rgb = globalForestLoader.heightToThermalRGB(heightMeters);
          color.setRGB(rgb.r / 255, rgb.g / 255, rgb.b / 255);
          mesh.setColorAt(idx, color);

          idx++;
        }
      }
    }

    // Hide remaining instances
    for (let k = idx; k < mesh.count; k++) {
      dummy.position.set(0, 0, 0);
      dummy.scale.set(0, 0, 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(k, dummy.matrix);
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  };

  // Switch between 2D Surface & 3D Volumetric representations
  useEffect(() => {
    if (voxelInstancesRef.current && surfaceMeshRef.current) {
      if (datasetMode === '3D_VOLUMETRIC') {
        voxelInstancesRef.current.visible = true;
        (surfaceMeshRef.current.material as THREE.MeshBasicMaterial).opacity = 0.55;
      } else {
        voxelInstancesRef.current.visible = false;
        (surfaceMeshRef.current.material as THREE.MeshBasicMaterial).opacity = 0.98;
      }
    }
  }, [datasetMode]);

  // Altitude Gate Scrubbing (Slice filter for 3D voxels)
  useEffect(() => {
    if (!voxelInstancesRef.current) return;
    const dummy = new THREE.Object3D();
    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const scale = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();

    // Scale instances according to altitude gate
    for (let i = 0; i < voxelInstancesRef.current.count; i++) {
      voxelInstancesRef.current.getMatrixAt(i, matrix);
      matrix.decompose(position, quaternion, scale);

      if (scale.length() > 0.01) {
        // Check if within current elevation gate
        // If zElevationGate is e.g. 30m, hide elements way above it
        const currentScaleZ = scale.z;
        const estimatedHeight = (currentScaleZ / 3.5) * 60;
        if (datasetMode === '3D_VOLUMETRIC' && estimatedHeight > zElevationGate + 10) {
          dummy.position.copy(position);
          dummy.quaternion.copy(quaternion);
          dummy.scale.set(scale.x, scale.y, 0.05); // flatten
        } else {
          dummy.position.copy(position);
          dummy.quaternion.copy(quaternion);
          dummy.scale.set(scale.x, scale.y, scale.z);
        }
        dummy.updateMatrix();
        voxelInstancesRef.current.setMatrixAt(i, dummy.matrix);
      }
    }
    voxelInstancesRef.current.instanceMatrix.needsUpdate = true;
  }, [zElevationGate, datasetMode]);

  // Update reticle position on 3D globe surface
  const updateReticlePosition = (lat: number, lon: number, radius = 1.6) => {
    if (!reticleAnchorRef.current) return;
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);

    const x = -radius * 1.01 * Math.sin(phi) * Math.cos(theta);
    const y = radius * 1.01 * Math.cos(phi);
    const z = radius * 1.01 * Math.sin(phi) * Math.sin(theta);

    reticleAnchorRef.current.position.set(x, y, z);
    reticleAnchorRef.current.lookAt(x * 2, y * 2, z * 2);
  };

  // React to Region selection change
  useEffect(() => {
    if (!activeRegion) return;
    targetLatLonRef.current = { lat: activeRegion.lat, lon: activeRegion.lon };
    activeLatLonRef.current = { lat: activeRegion.lat, lon: activeRegion.lon };
    setActiveLatLon({ lat: activeRegion.lat, lon: activeRegion.lon });

    updateReticlePosition(activeRegion.lat, activeRegion.lon);

    // Smoothly rotate globe towards selected region
    const targetRotY = -((activeRegion.lon + 180) * Math.PI) / 180 + Math.PI / 2;
    const targetRotX = (activeRegion.lat * Math.PI) / 180 * 0.4;
    globeRotationRef.current = { x: targetRotX, y: targetRotY };

    // Sample and sonify region
    const data = globalForestLoader.sampleCanopyColumn(activeRegion.lat, activeRegion.lon);
    globalSynthEngine.updateTelemetry(data);
    onProbeUpdate(data);

    // Render region boundary ring on globe
    renderRegionOutline(activeRegion.lat, activeRegion.lon);
  }, [activeRegion]);

  // React to programmatic / keyboard Arrow Key stepping
  useEffect(() => {
    if (!targetCoord) return;
    targetLatLonRef.current = targetCoord;
    activeLatLonRef.current = targetCoord;
    setActiveLatLon(targetCoord);
    updateReticlePosition(targetCoord.lat, targetCoord.lon);

    const targetRotY = -((targetCoord.lon + 180) * Math.PI) / 180 + Math.PI / 2;
    const targetRotX = (targetCoord.lat * Math.PI) / 180 * 0.4;
    globeRotationRef.current = { x: targetRotX, y: targetRotY };

    const data = globalForestLoader.sampleCanopyColumn(targetCoord.lat, targetCoord.lon);
    globalSynthEngine.updateTelemetry(data);
    onProbeUpdate(data);
  }, [targetCoord]);

  const renderRegionOutline = (lat: number, lon: number) => {
    if (!globeGroupRef.current) return;
    if (regionHighlightMeshRef.current) {
      globeGroupRef.current.remove(regionHighlightMeshRef.current);
    }

    const radius = 1.61;
    const phiCenter = (90 - lat) * (Math.PI / 180);
    const thetaCenter = (lon + 180) * (Math.PI / 180);
    const points: THREE.Vector3[] = [];
    const segments = 32;
    const angularRadius = 0.14; // ~800km radius circle

    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const dPhi = Math.sin(angle) * angularRadius;
      const dTheta = Math.cos(angle) * angularRadius;

      const pPhi = phiCenter + dPhi;
      const pTheta = thetaCenter + dTheta;

      const x = -radius * Math.sin(pPhi) * Math.cos(pTheta);
      const y = radius * Math.cos(pPhi);
      const z = radius * Math.sin(pPhi) * Math.sin(pTheta);
      points.push(new THREE.Vector3(x, y, z));
    }

    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({ color: 0x00ff88, linewidth: 2 });
    const line = new THREE.Line(geo, mat);
    regionHighlightMeshRef.current = line;
    globeGroupRef.current.add(line);
  };

  // Re-render when offscreen canvas updates (e.g. file upload)
  useEffect(() => {
    const unsub = globalForestLoader.onDataUpdated(() => {
      if (canvasTextureRef.current) {
        canvasTextureRef.current.needsUpdate = true;
      }
      if (voxelInstancesRef.current) {
        buildVoxelSpikeGrid(voxelInstancesRef.current, 1.6);
      }
      // Re-probe current point
      const cur = activeLatLonRef.current;
      const data = globalForestLoader.sampleCanopyColumn(cur.lat, cur.lon);
      globalSynthEngine.updateTelemetry(data);
      onProbeUpdate(data);
    });
    return unsub;
  }, [onProbeUpdate]);

  // Adjust scan plane tilt / latitude position when activeScanAxis changes
  useEffect(() => {
    if (!scanPlaneRef.current) return;
    if (activeScanAxis.type === 'LATITUDE') {
      const lat = activeScanAxis.value;
      const yOffset = 1.6 * Math.sin((lat * Math.PI) / 180);
      scanPlaneRef.current.position.y = yOffset;
      scanPlaneRef.current.rotation.x = Math.PI / 2;
      scanPlaneRef.current.rotation.y = 0;
    } else {
      // Longitude / Meridian plane
      scanPlaneRef.current.position.y = 0;
      scanPlaneRef.current.rotation.x = 0;
      scanPlaneRef.current.rotation.y = Math.PI / 2;
    }
  }, [activeScanAxis]);

  // =========================================================================
  // MOUSE & TOUCH INTERACTION (DRAGGING GLOBE & PROBING POINT)
  // =========================================================================
  const handlePointerDown = (e: React.PointerEvent) => {
    isDraggingRef.current = true;
    prevMousePosRef.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    handleRaycastProbe(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - prevMousePosRef.current.x;
    const dy = e.clientY - prevMousePosRef.current.y;
    prevMousePosRef.current = { x: e.clientX, y: e.clientY };

    // Rotate Globe
    globeRotationRef.current.y += dx * 0.007;
    globeRotationRef.current.x = Math.max(-1.2, Math.min(1.2, globeRotationRef.current.x + dy * 0.007));

    // Also probe point under cursor if in Point Probe mode
    handleRaycastProbe(e.clientX, e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isDraggingRef.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // Ignore
    }
  };

  const handleRaycastProbe = (clientX: number, clientY: number) => {
    if (!mountRef.current || !cameraRef.current || !surfaceMeshRef.current) return;
    const rect = mountRef.current.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(x, y), cameraRef.current);

    const intersects = raycaster.intersectObject(surfaceMeshRef.current, false);
    if (intersects.length > 0) {
      const hit = intersects[0];
      if (hit.uv) {
        // Map uv to Lat/Lon
        const lon = hit.uv.x * 360 - 180;
        const lat = 90 - hit.uv.y * 180;

        activeLatLonRef.current = { lat, lon };
        setActiveLatLon({ lat, lon });
        updateReticlePosition(lat, lon);

        // Sonify & Dispatch Telemetry
        const data = globalForestLoader.sampleCanopyColumn(lat, lon);
        globalSynthEngine.updateTelemetry(data);
        onProbeUpdate(data);
      }
    }
  };

  return (
    <div className="hud-threejs-canvas-container" style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Three.js Canvas Container */}
      <div
        ref={mountRef}
        style={{ width: '100%', height: '100%', cursor: 'crosshair', touchAction: 'none' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      />

      {/* Target Reticle with 16-Bit White Angled Leader Lines Overlay */}
      {reticleScreenPos && (
        <div
          style={{
            position: 'absolute',
            left: `${reticleScreenPos.x}px`,
            top: `${reticleScreenPos.y}px`,
            pointerEvents: 'none',
            zIndex: 35,
            transform: 'translate(-50%, -50%)',
          }}
        >
          {/* Pixel Reticle Box */}
          <div
            style={{
              width: '26px',
              height: '26px',
              border: '2px solid #ffffff',
              boxShadow: '0 0 8px #00ffcc, inset 0 0 4px #00ffcc',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div style={{ width: '4px', height: '4px', background: '#00ff66' }} />
            {/* Corner Crosshairs */}
            <div style={{ position: 'absolute', top: '-6px', left: '10px', width: '2px', height: '4px', background: '#fff' }} />
            <div style={{ position: 'absolute', bottom: '-6px', left: '10px', width: '2px', height: '4px', background: '#fff' }} />
            <div style={{ position: 'absolute', left: '-6px', top: '10px', width: '4px', height: '2px', background: '#fff' }} />
            <div style={{ position: 'absolute', right: '-6px', top: '10px', width: '4px', height: '2px', background: '#fff' }} />
          </div>

          {/* Angled White Leader Line Callout */}
          <svg
            style={{
              position: 'absolute',
              top: '0px',
              left: '14px',
              width: '180px',
              height: '80px',
              overflow: 'visible',
            }}
          >
            {/* Angled stroke: (0,0) -> (30, -25) -> (120, -25) */}
            <polyline
              points="0,0 26,-24 130,-24"
              fill="none"
              stroke="#ffffff"
              strokeWidth="2"
              strokeDasharray="4 2"
              filter="drop-shadow(0 0 3px #00ccff)"
            />
            {/* Coordinate Label */}
            <text
              x="30"
              y="-30"
              fill="#ffffff"
              fontFamily="var(--font-retro-pixel)"
              fontSize="8px"
              letterSpacing="0.5px"
            >
              PROBE: {activeLatLon.lat.toFixed(2)}°, {activeLatLon.lon.toFixed(2)}°
            </text>
            <text
              x="30"
              y="-12"
              fill="#00ff66"
              fontFamily="var(--font-silk)"
              fontSize="7px"
            >
              {datasetMode === '3D_VOLUMETRIC' ? `VOXEL STRATA Z=${zElevationGate.toFixed(0)}m` : 'SURFACE PIXEL ALLOMETRIC'}
            </text>
          </svg>
        </div>
      )}
    </div>
  );
};
