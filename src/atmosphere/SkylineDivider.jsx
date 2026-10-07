import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'

// Silhouette, not a map: [x, width, height] blocks above the baseline, plus the AT&T "Batman" tower.
const BASE = 150
const W = 1440
const blocks = [
  [0, 60, 30], [60, 50, 52], [110, 44, 38], [154, 60, 70], [214, 40, 46], [254, 56, 84],
  [310, 48, 56], [358, 64, 40], [422, 46, 94], [468, 58, 62], [526, 44, 36], [570, 70, 76],
  [640, 52, 48], [692, 60, 102], [752, 46, 58], [798, 54, 40],
  // 852..932 is the Batman building
  [932, 56, 72], [988, 48, 50], [1036, 62, 90], [1098, 44, 44], [1142, 58, 66],
  [1200, 50, 38], [1250, 62, 80], [1312, 48, 54], [1360, 44, 34], [1404, 36, 26],
]

function buildTop() {
  const pts = [[0, BASE]]
  const rect = (x, w, h) => pts.push([x, BASE - h], [x + w, BASE - h])
  for (const [x, w, h] of blocks) if (x < 852) rect(x, w, h)
  // AT&T building: tall body, two horns, notch between them.
  const bx = 852
  pts.push([bx, BASE - 60], [bx + 8, BASE - 60], [bx + 14, BASE - 138], [bx + 22, BASE - 138])
  pts.push([bx + 30, BASE - 104], [bx + 40, BASE - 92], [bx + 50, BASE - 104])
  pts.push([bx + 58, BASE - 138], [bx + 66, BASE - 138], [bx + 72, BASE - 60], [bx + 80, BASE - 60])
  for (const [x, w, h] of blocks) if (x >= 932) rect(x, w, h)
  pts.push([W, BASE])
  return pts
}

const top = buildTop()
const line = top.map(([x, y]) => `${x},${y}`).join(' ')
const fill = `M0,${BASE + 40} L${top.map(([x, y]) => `${x},${y}`).join(' L')} L${W},${BASE + 40} Z`

// Section divider: dark skyline fill, red neon edge, ~20px scroll parallax.
export default function SkylineDivider({ id = 'atm-glow' }) {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], [0, 20])

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none relative -mb-px h-24 overflow-hidden sm:h-32 lg:h-40"
    >
      <motion.svg
        style={{ y, height: 'calc(100% + 20px)' }}
        className="absolute inset-x-0 top-0 w-full"
        viewBox={`0 0 ${W} ${BASE + 40}`}
        preserveAspectRatio="none"
      >
        <defs>
          <filter id={id} x="-5%" y="-30%" width="110%" height="160%">
            <feGaussianBlur stdDeviation="5" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <path d={fill} fill="#07070b" />
        <polyline
          points={line}
          fill="none"
          stroke="#ff2a3c"
          strokeWidth="2.5"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          filter={`url(#${id})`}
        />
      </motion.svg>
    </div>
  )
}
