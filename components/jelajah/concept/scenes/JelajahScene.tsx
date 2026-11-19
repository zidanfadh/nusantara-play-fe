'use client';

import { PILOT_PROVINCE } from '@/lib/jelajah/provinces';
import { BEATS } from '@/lib/jelajah/concept/script';
import { easeInOutCubic, easeOutCubic, lerp, seg } from '@/lib/jelajah/concept/timeline';
import { CONCEPT_PROVINCE_PATHS, mapToStage, mapTransformAttr, ProvincePaths } from '../art/MapArt';
import { VILLAGE, Village } from '../art/Village';
import { BLEED, Stage, useAttr, useAttrs, type SceneProps } from '../scene-kit';

const PILOT = CONCEPT_PROVINCE_PATHS.find((p) => p.kode === PILOT_PROVINCE.kode);
const DIVE_SCALE = 14;

/**
 * Scene 5 "jelajah" (25–32 s): the camera dives into Sumatera Selatan (the pilot province with a village
 * scene) and the map cross-fades into a stylised isometric village whose stands and pavilion glow.
 */
export function JelajahScene({ lt, layout, still }: SceneProps) {
  const { diveFrom, diveTo, villageAt } = BEATS.jelajah;
  const time = (t: number) => (still ? 5600 : t);
  const target = PILOT ? mapToStage(layout, PILOT.cx, PILOT.cy) : [0, 0];
  const { cx, cy } = VILLAGE[layout];

  const dive = useAttr<SVGGElement>(lt, (t) => {
    const e = easeInOutCubic(seg(time(t), diveFrom, diveTo));
    const s = lerp(1, DIVE_SCALE, e * e);
    const px = lerp(target[0], cx, e);
    const py = lerp(target[1], cy, e);
    return `translate(${px.toFixed(2)} ${py.toFixed(2)}) scale(${s.toFixed(4)}) translate(${-target[0]} ${-target[1]})`;
  });
  const pulse = useAttrs<SVGCircleElement>(lt, (t) => {
    const phase = (time(t) % 1200) / 1200;
    const fade = 1 - seg(time(t), diveFrom + 600, diveFrom + 1200);
    return { transform: `scale(${(1 + phase * 2.4).toFixed(3)})`, opacity: (0.8 * (1 - phase) * fade).toFixed(3) };
  });
  const villageOpacity = useAttr<SVGGElement>(lt, (t) => easeOutCubic(seg(time(t), villageAt, villageAt + 700)).toFixed(3), 'opacity');
  const villageCamera = useAttr<SVGGElement>(lt, (t) => {
    const k = easeOutCubic(seg(time(t), villageAt, villageAt + 2400));
    const s = lerp(1.35, 1, k);
    return `translate(${cx} ${cy}) scale(${s.toFixed(4)}) translate(${-cx} ${-cy})`;
  });

  return (
    <div className="absolute inset-0 overflow-hidden" style={{ background: 'linear-gradient(180deg, #CFE6EA 0%, #9CC6CF 100%)' }}>
      <Stage layout={layout}>
        <rect {...BLEED} fill="url(#cv-kawung-cream)" opacity="0.35" />
        <g ref={dive}>
          <g transform={mapTransformAttr(layout)}>
            <ProvincePaths fill="#F3E3C3" stroke="#B9AE9C" strokeWidth={1.2} />
            {PILOT && (
              <>
                <path d={PILOT.d} fill="#9E3C24" stroke="#FFF6E0" strokeWidth={1.5} />
                <g transform={`translate(${PILOT.cx} ${PILOT.cy})`}>
                  <circle
                    ref={pulse}
                    r="14"
                    fill="none"
                    stroke="#9E3C24"
                    strokeWidth="3"
                  />
                  <circle r="5" fill="#FFF6E0" stroke="#9E3C24" strokeWidth="2.5" />
                </g>
              </>
            )}
          </g>
        </g>
        <g ref={villageOpacity}>
          <rect {...BLEED} fill="#F4DFC0" />
          <rect {...BLEED} fill="url(#cv-kawung-brown)" opacity="0.25" />
          <g ref={villageCamera}>
            <Village lt={lt} layout={layout} still={still} />
          </g>
        </g>
      </Stage>
    </div>
  );
}
