import { ticker } from '../content.js'

function Group({ hidden }) {
  return (
    <ul
      className="atm-ticker-group flex shrink-0 items-center"
      aria-hidden={hidden || undefined}
      data-dup={hidden ? 'true' : undefined}
    >
      {ticker.map((t) => (
        <li key={t} className="flex items-center whitespace-nowrap">
          <span className="font-display text-lg tracking-[0.12em] text-snow sm:text-xl">{t}</span>
          <span
            aria-hidden="true"
            className="mx-5 h-1.5 w-1.5 rounded-full bg-neon-red shadow-[0_0_8px_2px_rgba(255,42,60,0.7)] sm:mx-7"
          />
        </li>
      ))}
    </ul>
  )
}

// Infinite CSS marquee. The second group is an aria-hidden duplicate to make the loop seamless.
export default function Ticker() {
  return (
    <div
      className="atm-ticker relative overflow-hidden border-y border-line bg-ink-2 py-3"
      role="region"
      aria-label="Shop news"
    >
      <div className="atm-ticker-track flex w-max">
        <Group />
        <Group hidden />
      </div>
    </div>
  )
}
