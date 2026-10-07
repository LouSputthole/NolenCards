import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { shop, hours } from '../content.js'
import { isOpenNow } from './openNow.js'

const MAP_SRC =
  'https://www.google.com/maps?q=7177+Nolensville+Rd+Suite+A3+Nolensville+TN+37135&output=embed'

export default function Visit() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])
  const { open, status, todayIndex } = isOpenNow(hours, now)

  return (
    <section id="visit" className="section scroll-mt-16" aria-labelledby="visit-title">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.6 }}
      >
        <p className="font-script text-2xl text-neon-red">Visit the shop</p>
        <h2 id="visit-title" className="font-display text-5xl tracking-wide sm:text-7xl neon-white">
          Come find us
        </h2>

        <div className="mt-10 grid gap-10 lg:grid-cols-2 lg:items-start">
          <div>
            <p
              aria-live="polite"
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-semibold ${
                open ? 'border-neon-blue/60 text-neon-white bg-neon-blue/10' : 'border-line text-fog bg-ink-2'
              }`}
            >
              <span
                aria-hidden="true"
                className={`relative inline-flex h-2.5 w-2.5 rounded-full ${open ? 'bg-neon-blue' : 'bg-fog/60'}`}
              >
                {open && <span className="absolute inset-0 animate-ping rounded-full bg-neon-blue" />}
              </span>
              {status}
            </p>

            <table className="mt-5 w-full border-collapse text-left">
              <caption className="sr-only">Store hours</caption>
              <tbody>
                {hours.map((h, i) => {
                  const today = i === todayIndex
                  return (
                    <tr
                      key={h.day}
                      aria-current={today ? 'date' : undefined}
                      className={`border-b border-line ${today ? 'bg-neon-blue/10 text-snow' : 'text-fog'}`}
                    >
                      <th scope="row" className={`px-3 py-3 font-medium ${today ? 'text-neon-white' : ''}`}>
                        {h.day}
                        {today && <span className="ml-2 text-xs uppercase tracking-wider text-neon-blue">Today</span>}
                      </th>
                      <td className="px-3 py-3 text-right tabular-nums">{h.open}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            <address className="mt-8 not-italic leading-relaxed text-snow">
              <span className="block">{shop.address}</span>
              <span className="block">{shop.cityStateZip}</span>
              <a
                href={shop.phoneHref}
                className="mt-1 inline-block text-neon-blue underline-offset-4 hover:underline"
              >
                {shop.phone}
              </a>
            </address>

            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href={shop.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full bg-neon-red px-6 py-3 font-semibold text-white shadow-[0_0_24px_rgba(255,42,60,0.45)] transition hover:brightness-110"
              >
                Get directions
              </a>
              <a
                href={shop.phoneHref}
                className="rounded-full border border-neon-blue px-6 py-3 font-semibold text-snow transition hover:bg-neon-blue/15"
              >
                Call the shop
              </a>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-neon-blue/50 shadow-[0_0_32px_rgba(47,107,255,0.35)]">
            <iframe
              src={MAP_SRC}
              title="Map to Pretty Cool Cards"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="block aspect-[4/3] w-full border-0"
              style={{ filter: 'invert(0.9) hue-rotate(180deg) saturate(0.6)' }}
            />
          </div>
        </div>
      </motion.div>
    </section>
  )
}
