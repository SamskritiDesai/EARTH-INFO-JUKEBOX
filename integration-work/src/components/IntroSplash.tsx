import React, { useEffect, useRef, useState } from 'react';

interface IntroSplashProps {
  onEnter: () => void;
  /** Called once, automatically, when the EARTH FM text effect has finished. */
  onWelcome?: () => void;
}

// ---- space backdrop (canvas 2D): twinkling pixel stars in 3 parallax layers, shooting stars, drifting asteroids ----
interface Star { x: number; y: number; z: number; tw: number; size: number; hue: number }
interface Shooter { x: number; y: number; vx: number; vy: number; life: number; max: number; len: number }
interface Asteroid { x: number; y: number; z: number; vx: number; vy: number; rot: number; spin: number; r: number; pts: number[]; craters: number[] }

const rand = (a: number, b: number) => a + Math.random() * (b - a);

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);

function makeAsteroid(w: number, h: number, anywhere: boolean): Asteroid {
  const z = rand(0.35, 1);                    // depth: small/slow/dim ... big/fast/bright
  const r = 3 + z * z * 13;
  const n = 8 + Math.floor(Math.random() * 4);
  const pts: number[] = [];
  for (let i = 0; i < n; i++) pts.push(rand(0.7, 1.15));
  const craters = [rand(-0.4, 0.4), rand(-0.4, 0.4), rand(0.1, 0.22), rand(-0.4, 0.4), rand(-0.4, 0.4), rand(0.08, 0.16)];
  const speed = 6 + z * 26;
  const ang = rand(Math.PI * 0.62, Math.PI * 0.88); // drift left and slightly down
  return {
    x: anywhere ? rand(0, w) : w + r * 2,
    y: anywhere ? rand(0, h) : rand(-r, h * 0.8),
    z, r, pts, craters,
    vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed * 0.6,
    rot: rand(0, 6.28), spin: rand(-0.5, 0.5) * (1.2 - z)
  };
}


export const IntroSplash: React.FC<IntroSplashProps> = ({ onEnter, onWelcome }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [leaving, setLeaving] = useState(false);
  const leavingRef = useRef(false);

  const enter = () => {
    if (leavingRef.current) return;
    leavingRef.current = true;
    setLeaving(true);
    onEnter();
  };
  const enterRef = useRef(enter);
  enterRef.current = enter;

  // The EARTH FM lettering (from the logo) plays an effect; when it ends the welcome is announced on its own.
  const welcomeRef = useRef(onWelcome);
  welcomeRef.current = onWelcome;
  const welcomedRef = useRef(false);
  const effectDone = () => {
    if (welcomedRef.current) return;
    welcomedRef.current = true;
    welcomeRef.current?.();
  };
  useEffect(() => {
    if (!prefersReducedMotion()) return;
    const t = window.setTimeout(effectDone, 400);
    return () => window.clearTimeout(t);
  }, []);

  // Any key (except Tab / modifiers, so keyboard users can still focus the button) starts the app.
  // Capture + stopImmediatePropagation so the key never also triggers an app shortcut underneath.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Tab' || e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt' || e.key === 'Meta') return;
      e.preventDefault();
      e.stopImmediatePropagation();
      enterRef.current();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

    let w = 0, h = 0, dpr = 1;
    let stars: Star[] = [];
    let asteroids: Asteroid[] = [];
    const shooters: Shooter[] = [];
    let nextShooter = 0.8;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth; h = window.innerHeight;
      canvas.width = Math.floor(w * dpr); canvas.height = Math.floor(h * dpr);
      canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(420, Math.floor((w * h) / 4200));
      stars = Array.from({ length: count }, () => {
        const z = Math.random();
        return { x: rand(0, w), y: rand(0, h), z, tw: rand(0, 6.28), size: z > 0.85 ? 3 : z > 0.5 ? 2 : 1, hue: Math.random() };
      });
      asteroids = Array.from({ length: Math.max(5, Math.min(11, Math.floor(w / 150))) }, () => makeAsteroid(w, h, true));
    };
    resize();
    window.addEventListener('resize', resize);

    let raf = 0;
    let last = performance.now();
    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const t = now / 1000;
      ctx.clearRect(0, 0, w, h);

      // stars
      for (const s of stars) {
        if (!reduced) {
          s.x -= (4 + s.z * 16) * dt;
          if (s.x < -4) { s.x = w + 4; s.y = rand(0, h); }
        }
        const tw = reduced ? 0.8 : 0.55 + 0.45 * Math.sin(t * (1 + s.z * 2.5) + s.tw);
        const a = (0.25 + s.z * 0.75) * tw;
        ctx.fillStyle = s.hue > 0.88 ? `rgba(120,255,200,${a})` : s.hue > 0.72 ? `rgba(120,200,255,${a})` : `rgba(255,255,255,${a})`;
        ctx.fillRect(Math.round(s.x), Math.round(s.y), s.size, s.size);
      }

      // asteroids (dark rock, neon wireframe edge, a couple of craters)
      for (let i = 0; i < asteroids.length; i++) {
        const a = asteroids[i];
        if (!reduced) {
          a.x += a.vx * dt; a.y += a.vy * dt; a.rot += a.spin * dt;
          if (a.x < -a.r * 2 || a.y > h + a.r * 2) asteroids[i] = makeAsteroid(w, h, false);
        }
        ctx.save();
        ctx.translate(a.x, a.y);
        ctx.rotate(a.rot);
        ctx.beginPath();
        const n = a.pts.length;
        for (let k = 0; k < n; k++) {
          const ang = (k / n) * Math.PI * 2;
          const rr = a.r * a.pts[k];
          const px = Math.cos(ang) * rr, py = Math.sin(ang) * rr;
          k === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fillStyle = `rgba(4,12,28,${0.55 + a.z * 0.4})`;
        ctx.fill();
        ctx.lineWidth = a.z > 0.7 ? 1.5 : 1;
        ctx.strokeStyle = `rgba(0,230,255,${0.25 + a.z * 0.5})`;
        ctx.stroke();
        if (a.r > 9) {
          ctx.strokeStyle = `rgba(0,230,255,${0.15 + a.z * 0.25})`;
          ctx.lineWidth = 1;
          for (let c = 0; c < 2; c++) {
            ctx.beginPath();
            ctx.arc(a.craters[c * 3] * a.r, a.craters[c * 3 + 1] * a.r, a.craters[c * 3 + 2] * a.r, 0, Math.PI * 2);
            ctx.stroke();
          }
        }
        ctx.restore();
      }

      // shooting stars
      if (!reduced) {
        nextShooter -= dt;
        if (nextShooter <= 0) {
          nextShooter = rand(0.9, 3.2);
          const ang = rand(0.35, 0.65); // radians below horizontal, travelling left
          const sp = rand(900, 1500);
          shooters.push({
            x: rand(w * 0.35, w * 1.05), y: rand(-20, h * 0.5),
            vx: -Math.cos(ang) * sp, vy: Math.sin(ang) * sp,
            life: 0, max: rand(0.55, 1.0), len: rand(90, 190)
          });
        }
        for (let i = shooters.length - 1; i >= 0; i--) {
          const s = shooters[i];
          s.life += dt; s.x += s.vx * dt; s.y += s.vy * dt;
          if (s.life > s.max) { shooters.splice(i, 1); continue; }
          const k = 1 - s.life / s.max;
          const sp = Math.hypot(s.vx, s.vy);
          const tx = s.x - (s.vx / sp) * s.len, ty = s.y - (s.vy / sp) * s.len;
          const g = ctx.createLinearGradient(tx, ty, s.x, s.y);
          g.addColorStop(0, 'rgba(0,255,170,0)');
          g.addColorStop(0.7, `rgba(120,255,230,${0.5 * k})`);
          g.addColorStop(1, `rgba(255,255,255,${k})`);
          ctx.strokeStyle = g; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(s.x, s.y); ctx.stroke();
          ctx.fillStyle = `rgba(255,255,255,${k})`;
          ctx.fillRect(Math.round(s.x) - 1, Math.round(s.y) - 1, 3, 3);
        }
      }
    };
    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);

  return (
    <div
      className={`intro-splash ${leaving ? 'intro-leaving' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label="Earth FM start screen"
      onClick={enter}
    >
      <canvas ref={canvasRef} className="intro-canvas" aria-hidden="true" />
      <div className="intro-glow" aria-hidden="true" />
      <div className="intro-center">
        <div className="intro-logo">
          <img className="intro-logo-globe" src={`${import.meta.env.BASE_URL}earth-fm-logo-globe.png`} alt="" draggable={false} />
          <img
            className="intro-logo-word"
            src={`${import.meta.env.BASE_URL}earth-fm-logo-word.png`}
            alt="Earth FM"
            draggable={false}
            onAnimationEnd={(e) => { if (e.animationName === 'introWordFlicker') effectDone(); }}
          />
        </div>
        <button type="button" className="intro-start font-press-start" onClick={(e) => { e.stopPropagation(); enter(); }} autoFocus>
          CLICK OR PRESS ANY KEY
        </button>
      </div>
    </div>
  );
};
