import { motion } from 'framer-motion'
import { shop, reviews } from '../content.js'

function Star() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6 text-gold sm:h-7 sm:w-7" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
      />
    </svg>
  )
}

export default function Reviews() {
  return (
    <section id="reviews" aria-labelledby="reviews-title" className="section">
      <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-end sm:gap-10">
        <h2
          id="reviews-title"
          className="font-display text-[8rem] leading-[0.8] tracking-tighter text-snow sm:text-[12rem]"
        >
          <span className="sr-only">Rated </span>
          <span className="neon-red">{shop.rating}</span>
        </h2>
        <div className="pb-2">
          <div
            role="img"
            aria-label={`${shop.rating} out of 5 stars`}
            className="flex gap-1 drop-shadow-[0_0_10px_rgba(255,209,102,0.5)]"
          >
            {[0, 1, 2, 3, 4].map((i) => (
              <Star key={i} />
            ))}
          </div>
          <p className="mt-3 text-lg text-fog">
            <span className="font-medium text-snow">{shop.reviewCount}</span> Google reviews
          </p>
        </div>
      </div>

      <ul className="mt-14 grid list-none gap-5 p-0 md:grid-cols-3">
        {reviews.map((r, i) => (
          <motion.li
            key={r.quote}
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.6, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] }}
            className="relative overflow-hidden rounded-2xl border border-line bg-ink-2 p-7 pt-14"
          >
            <span
              aria-hidden="true"
              className="neon-blue absolute left-6 top-2 font-display text-8xl leading-none"
            >
              &ldquo;
            </span>
            <blockquote className="m-0">
              <p className="text-lg leading-relaxed text-snow">{r.quote}</p>
              <footer className="mt-6 text-sm tracking-wide text-fog">{r.who}</footer>
            </blockquote>
          </motion.li>
        ))}
      </ul>
    </section>
  )
}
