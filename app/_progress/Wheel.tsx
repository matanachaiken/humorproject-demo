"use client";

import { PRIZES, type PrizeId } from "@/lib/progression";

const C = 110; // center
const R = 104; // radius

// Segments are sized by their real odds, measured clockwise from the top.
const SEGMENTS = (() => {
  let start = 0;
  return PRIZES.map((prize) => {
    const sweep = prize.chance * 360;
    const segment = { ...prize, start, end: start + sweep, mid: start + sweep / 2 };
    start += sweep;
    return segment;
  });
})();

const point = (deg: number, r = R) => {
  const rad = (deg * Math.PI) / 180;
  return `${C + r * Math.sin(rad)} ${C - r * Math.cos(rad)}`;
};

// Final rotation that brings `prize` under the pointer after a few full turns.
export function rotationFor(prize: PrizeId, turns = 6) {
  const seg = SEGMENTS.find((s) => s.id === prize)!;
  // Land somewhere inside the segment, not always dead center.
  const wiggle = (Math.random() - 0.5) * (seg.end - seg.start) * 0.6;
  return turns * 360 - seg.mid + wiggle;
}

export default function Wheel({ rotation }: { rotation: number }) {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-64">
      <svg viewBox="0 0 220 220" className="h-full w-full drop-shadow-xl" aria-hidden="true">
        <g
          style={{
            transform: `rotate(${rotation}deg)`,
            transformOrigin: "110px 110px",
            transition: rotation ? "transform 4s cubic-bezier(0.15, 0.7, 0.1, 1)" : undefined,
          }}
        >
          {SEGMENTS.map((s) => (
            <g key={s.id}>
              <path
                d={`M ${C} ${C} L ${point(s.start)} A ${R} ${R} 0 ${s.end - s.start > 180 ? 1 : 0} 1 ${point(s.end)} Z`}
                fill={s.color}
                stroke="white"
                strokeWidth="2"
              />
              <text
                x={C}
                y={C - 70}
                transform={`rotate(${s.mid} ${C} ${C})`}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-white font-display text-[15px] font-extrabold"
              >
                {s.short}
              </text>
            </g>
          ))}
        </g>
        <circle cx={C} cy={C} r="16" fill="white" />
        <circle cx={C} cy={C} r="7" fill="#1c1714" />
      </svg>
      {/* Pointer */}
      <div className="absolute -top-1 left-1/2 h-0 w-0 -translate-x-1/2 border-x-[12px] border-t-[20px] border-x-transparent border-t-[#1c1714] drop-shadow dark:border-t-white" />
    </div>
  );
}
