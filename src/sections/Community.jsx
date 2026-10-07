import { motion } from 'framer-motion'
import { shop, community } from '../content.js'

export default function Community() {
  return (
    <section id="community" aria-labelledby="community-title" className="section">
      <div className="grid gap-12 lg:grid-cols-2 lg:gap-20">
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="lg:sticky lg:top-28 lg:self-start"
        >
          <p className="font-script text-2xl text-neon-red">Nolensville&rsquo;s card community</p>
          <h2
            id="community-title"
            className="mt-2 font-display text-6xl leading-[0.9] tracking-tight text-snow sm:text-8xl"
          >
            More than <br />a <span className="neon-blue">shop</span>
          </h2>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-fog">
            Pretty Cool Cards is where collectors of every age meet up, trade, and rip packs
            together. Pull up a chair, bring a binder, make a friend.
          </p>
          <a
            href={shop.facebook}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-8 inline-flex items-center gap-2 rounded-full border border-neon-blue px-6 py-3 font-medium text-snow shadow-[0_0_20px_rgba(47,107,255,0.35)] transition hover:bg-neon-blue/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neon-blue"
          >
            Follow on Facebook
            <span className="sr-only"> (opens in a new tab)</span>
            <span aria-hidden="true">&rarr;</span>
          </a>
        </motion.div>

        <ol className="m-0 list-none border-t border-line p-0">
          {community.map((c, i) => (
            <motion.li
              key={c.title}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.6, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
              className="flex gap-5 border-b border-line py-7 sm:gap-8 sm:py-9"
            >
              <span
                aria-hidden="true"
                className="font-display text-4xl leading-none text-neon-red sm:text-5xl"
              >
                {String(i + 1).padStart(2, '0')}
              </span>
              <div>
                <h3 className="font-display text-3xl leading-none tracking-tight text-snow sm:text-4xl">
                  {c.title}
                </h3>
                <p className="mt-3 leading-relaxed text-fog">{c.blurb}</p>
              </div>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  )
}
