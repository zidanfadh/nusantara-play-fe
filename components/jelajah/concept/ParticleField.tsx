'use client';

/**
 * Particle canvas of the concept video (Phase 19), full and lite tiers only (300 / 120 particles; never on
 * the 2d tier, with reduced motion or after a low frame rate: the scenes then draw their SVG fallback).
 *
 * Scene 2: the toys turn to dust that drifts away to the right. Scene 3: the dust flows back from the right
 * and settles on the outline of Indonesia, then fades as the provinces light up. Every position is a pure
 * function of the film time and the particle's seed (deterministic seeking); the canvas is redrawn only
 * while the film time is inside that window. Positions come from the scenes' DOM anchors
 * (`data-cv-anchor`), measured once per phase and again after a resize.
 */
import type { MotionValue } from 'framer-motion';
import { useEffect, useMemo, useRef } from 'react';
import { CONCEPT_MAP_VIEW, CONCEPT_PROVINCE_PATHS } from '@/lib/jelajah/concept/indonesia-paths';
import { makeParticleSeeds, outlinePoints } from '@/lib/jelajah/concept/particles';
import { BEATS, CONCEPT_SCENES } from '@/lib/jelajah/concept/script';
import { easeInOutCubic, seg } from '@/lib/jelajah/concept/timeline';

const S2 = CONCEPT_SCENES[1].start;
const S3 = CONCEPT_SCENES[2].start;
const S3_END = S3 + CONCEPT_SCENES[2].duration;
const FROM = S2 + BEATS.terlupa.dustFrom - 100;
const TO = S3_END + 600;

let outlineCache: [number, number][] | null = null;
const outline = () => (outlineCache ??= outlinePoints(CONCEPT_PROVINCE_PATHS, 3));

function sprite(color: string): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 32;
  c.height = 32;
  const ctx = c.getContext('2d');
  if (ctx) {
    const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    g.addColorStop(0, '#FFFFFF');
    g.addColorStop(0.25, color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 32, 32);
  }
  return c;
}

export function ParticleField({ time, count, maxDpr }: { time: MotionValue<number>; count: number; maxDpr: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const seeds = useMemo(() => makeParticleSeeds(count), [count]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const dust = sprite('#E8D9B8');
    const gold = sprite('#F7C95C');
    const targets = outline();
    let sources: DOMRect[] | null = null;
    let ctm: DOMMatrix | null = null;
    let w = 0;
    let h = 0;
    let dpr = 1;
    let blank = true;
    let retry = 0;

    const resize = () => {
      dpr = Math.min(maxDpr, window.devicePixelRatio || 1);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      sources = null;
      ctm = null;
    };
    resize();

    const measureSources = () => {
      const scene = document.querySelector('[data-cv-scene="terlupa"]');
      if (!scene) return null;
      const rects = ['board', 'top', 'kids'].map((a) => scene.querySelector(`[data-cv-anchor="${a}"]`)?.getBoundingClientRect());
      return rects.every((r): r is DOMRect => !!r && r.width > 0) ? rects : null;
    };
    const measureMap = () => {
      const el = document.querySelector<SVGGraphicsElement>('[data-cv-anchor="map"]');
      return el?.getScreenCTM() ?? null;
    };

    const draw = (t: number) => {
      if (t < FROM || t > TO) {
        if (!blank) {
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          blank = true;
        }
        return;
      }
      if (!sources && t < S3 + 600) sources = measureSources();
      if (!ctm && t >= S3 - 600) ctm = measureMap();
      // Right after a seek the scene that holds the anchors may not be mounted yet: draw again next frame.
      if (((!sources && t < S3 + 600) || (!ctm && t >= S3 - 600)) && !retry) {
        retry = requestAnimationFrame(() => {
          retry = 0;
          draw(time.get());
        });
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';
      blank = false;
      const { dustFrom } = BEATS.terlupa;
      const { gatherFrom, lightFrom, lightTo } = BEATS.nusantara;

      for (let i = 0; i < seeds.length; i += 1) {
        const p = seeds[i];
        const r = 1.1 + p.size * 2.3;
        const tg = S3 + gatherFrom + p.delay * 1500;
        let x: number;
        let y: number;
        let a: number;
        let img = dust;
        if (t < tg) {
          // Dust from the toys, drifting right.
          const tb = S2 + dustFrom + p.delay * 1600;
          if (t < tb || !sources) continue;
          const src = sources[p.source];
          const age = (t - tb) / 1000;
          const ox = src.x + p.ox * src.width;
          const oy = src.y + p.oy * src.height;
          x = ox + w * (0.08 + 0.16 * p.drift) * age ** 1.35;
          y = oy - (14 + 30 * p.wave) * age + Math.sin(age * 2 + p.phase * 6.28) * 10;
          a = Math.min(1, age / 0.3) * 0.85;
          if (x > w + 20) continue;
        } else {
          // Back from the right onto the outline of Indonesia.
          if (!ctm) continue;
          const dur = 1500 + p.drift * 700;
          const k = easeInOutCubic(seg(t, tg, tg + dur));
          const [mx, my] = targets[p.target % targets.length];
          const tx = ctm.a * mx + ctm.c * my + ctm.e;
          const ty = ctm.b * mx + ctm.d * my + ctm.f;
          const sx = w + 40 + p.ox * w * 0.25;
          const sy = h * (0.1 + p.oy * 0.7);
          const cx = w * (0.5 + p.wave * 0.35);
          const cy = (sy + ty) / 2 - h * 0.3 * (p.phase - 0.5);
          const v = 1 - k;
          x = v * v * sx + 2 * v * k * cx + k * k * tx;
          y = v * v * sy + 2 * v * k * cy + k * k * ty;
          img = gold;
          const lit = S3 + lightFrom + (mx / CONCEPT_MAP_VIEW.width) * (lightTo - lightFrom - 600);
          const twinkle = k >= 1 ? 0.65 + 0.35 * Math.sin(t / 180 + p.phase * 6.28) : 0.95;
          a = twinkle * (1 - 0.85 * seg(t, lit, lit + 700)) * (1 - seg(t, S3_END - 400, S3_END + 500));
        }
        if (a <= 0.01) continue;
        ctx.globalAlpha = a;
        ctx.drawImage(img, x - r * 2, y - r * 2, r * 4, r * 4);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    };

    const onResize = () => {
      resize();
      draw(time.get());
    };
    window.addEventListener('resize', onResize);
    draw(time.get());
    const unsubscribe = time.on('change', draw);
    return () => {
      unsubscribe();
      cancelAnimationFrame(retry);
      window.removeEventListener('resize', onResize);
    };
  }, [time, seeds, maxDpr]);

  return <canvas ref={canvasRef} aria-hidden className="pointer-events-none fixed inset-0 z-[2] h-full w-full" />;
}
