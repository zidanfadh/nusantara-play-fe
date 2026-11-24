'use client';

import { PILOT_PROVINCE } from '@/lib/jelajah/provinces';
import { BEATS } from '@/lib/jelajah/concept/script';
import { easeInOutCubic, easeOutCubic, lerp, seg } from '@/lib/jelajah/concept/timeline';
import { CONCEPT_PROVINCE_PATHS, mapToStage, mapTransformAttr, ProvincePaths } from '../art/MapArt';
import { VILLAGE, Village, VillageLive } from '../art/Village';
import { BLEED, cameraCss, LIVE, LIVE_OPACITY, Stage, useAttrs, useStyle, type SceneProps } from '../scene-kit';

const PILOT = CONCEPT_PROVINCE_PATHS.find((p) => p.kode === PILOT_PROVINCE.kode);
/**
 * Final zoom of the dive. The map is a compositor layer rasterised at its starting scale, so a deeper zoom
 * would turn blurry before the village takes over (the cross-fade starts at BEATS.jelajah.villageAt).
 */
const DIVE_SCALE = 6;

/**
 * Scene 5 "jelajah" (25–32 s): the camera dives into Sumatera Selatan (the pilot province with a village
 * scene) and the map cross-fades into a stylised isometric village whose stands and pavilion glow. Camera
 * moves are CSS transforms on compositor layers (no repaint of the map per frame).
 */
export function JelajahScene({ lt, layout, still }: SceneProps) {
  const { diveFrom, diveTo, villageAt } = BEATS.jelajah;
  const time = (t: number) => (still ? 5600 : t);
  const target: [number, number] = PILOT ? mapToStage(layout, PILOT.cx, PILOT.cy) : [0, 0];
  const { cx, cy } = VILLAGE[layout];

  const dive = useStyle(lt, (t) => {
    const e = easeInOutCubic(seg(time(t), diveFrom, diveTo));
    return cameraCss(layout, target, [lerp(target[0], cx, e), lerp(target[1], cy, e)], lerp(1, DIVE_SCALE, e * e));
  });
  const pulse = useAttrs<SVGCircleElement>(lt, (t) => {
    const phase = (time(t) % 1200) / 1200;
    const fade = 1 - seg(time(t), diveFrom + 600, diveFrom + 1200);
    return { transform: `scale(${(1 + phase * 2.4).toFixed(3)})`, opacity: (0.8 * (1 - phase) * fade).toFixed(3) };
  });
  const village = useStyle(lt, (t) => ({ opacity: easeOutCubic(seg(time(t), villageAt, villageAt + 700)) }));
  const villageCamera = useStyle(lt, (t) => {
    const k = easeOutCubic(seg(time(t), villageAt, villageAt + 2400));
    return cameraCss(layout, [cx, cy], [cx, cy], lerp(1.35, 1, k));
  });

  return (
    <div className="absolute inset-0 overflow-hidden" style={{ background: 'linear-gradient(180deg, #CFE6EA 0%, #9CC6CF 100%)' }}>
      <Stage layout={layout}>
        <rect {...BLEED} fill="url(#cv-kawung-cream)" opacity="0.35" />
      </Stage>
      <div ref={dive} className="absolute inset-0" style={LIVE}>
        <Stage layout={layout}>
          <g transform={mapTransformAttr(layout)}>
            <ProvincePaths fill="#F3E3C3" stroke="#B9AE9C" strokeWidth={1.2} />
            {PILOT && (
              <>
                <path d={PILOT.d} fill="#D4621A" stroke="#FEF3E2" strokeWidth={1.5} />
                <circle cx={PILOT.cx} cy={PILOT.cy} r="5" fill="#FEF3E2" stroke="#B4500F" strokeWidth="2.5" />
              </>
            )}
          </g>
        </Stage>
        {PILOT && (
          // The pulse has its own layer inside the dive, so the map is not repainted while it pulses.
          <Stage layout={layout} live>
            <g transform={mapTransformAttr(layout)}>
              <g transform={`translate(${PILOT.cx} ${PILOT.cy})`}>
                <circle ref={pulse} r="14" fill="none" stroke="#B4500F" strokeWidth="3" />
              </g>
            </g>
          </Stage>
        )}
      </div>
      <div ref={village} className="absolute inset-0" style={{ opacity: 0, ...LIVE_OPACITY }}>
        <div className="absolute inset-0" style={{ background: '#F4DFC0' }} />
        <Stage layout={layout}>
          <rect {...BLEED} fill="url(#cv-kawung-brown)" opacity="0.25" />
        </Stage>
        <div ref={villageCamera} className="absolute inset-0" style={LIVE}>
          <Stage layout={layout}>
            <Village layout={layout} />
          </Stage>
          <Stage layout={layout} live>
            <VillageLive lt={lt} layout={layout} still={still} />
          </Stage>
        </div>
      </div>
    </div>
  );
}
