import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { shop, promo } from '../content.js'

const links = [
  { href: '#categories', label: 'Shop' },
  { href: '#community', label: 'Community' },
  { href: '#reviews', label: 'Reviews' },
  { href: '#visit', label: 'Visit' },
]

const focus =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neon-blue'

export default function Nav({ revealed }) {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const solid = scrolled || open

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-[background-color,backdrop-filter] duration-300 ${
        solid ? 'bg-ink/80 backdrop-blur-md' : 'bg-transparent'
      }`}
    >
      <nav
        aria-label="Primary"
        className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4"
      >
        <a href="#top" className={`flex shrink-0 items-center gap-2.5 rounded-lg ${focus}`}>
          <img
            src="/logo.jpg"
            alt=""
            width="36"
            height="36"
            className="h-9 w-9 rounded-lg object-cover ring-1 ring-white/10"
          />
          <span className="font-display text-xl tracking-wide text-snow max-[420px]:hidden">
            {shop.name}
          </span>
        </a>

        <div className="flex items-center gap-2 sm:gap-3">
          <AnimatePresence>
            {revealed && (
              <motion.span
                key="promo"
                initial={{ opacity: 0, scale: 0.8, y: -8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ type: 'spring', stiffness: 380, damping: 22 }}
                className="flex items-center gap-1.5 rounded-full bg-gold px-3 py-1 font-display text-sm tracking-wider text-ink shadow-[0_0_18px_rgba(255,209,102,0.45)]"
              >
                <span>{promo.code}</span>
                <span className="hidden border-l border-ink/30 pl-1.5 sm:inline">
                  {promo.percent}% OFF
                </span>
              </motion.span>
            )}
          </AnimatePresence>

          <ul className="hidden items-center gap-1 md:flex">
            {links.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  className={`rounded-full px-3 py-2 text-sm text-fog transition-colors hover:text-snow ${focus}`}
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>

          <a
            href={shop.phoneHref}
            className={`rounded-full border border-neon-blue px-4 py-1.5 text-sm font-medium text-snow shadow-[0_0_14px_rgba(47,107,255,0.35)] transition hover:bg-neon-blue/20 ${focus}`}
          >
            Call
          </a>

          <button
            type="button"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen((o) => !o)}
            className={`grid h-10 w-10 place-items-center rounded-full md:hidden ${focus}`}
          >
            <span className="relative block h-3.5 w-5" aria-hidden="true">
              <span
                className={`absolute left-0 h-0.5 w-5 bg-snow transition-all ${
                  open ? 'top-1.5 rotate-45' : 'top-0'
                }`}
              />
              <span
                className={`absolute left-0 top-1.5 h-0.5 w-5 bg-snow transition-opacity ${
                  open ? 'opacity-0' : 'opacity-100'
                }`}
              />
              <span
                className={`absolute left-0 h-0.5 w-5 bg-snow transition-all ${
                  open ? 'top-1.5 -rotate-45' : 'top-3'
                }`}
              />
            </span>
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.ul
            id="mobile-menu"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden px-4 pb-4 md:hidden"
          >
            {links.map((l) => (
              <li key={l.href} className="border-t border-line">
                <a
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className={`block py-3 font-display text-2xl tracking-wide text-snow ${focus}`}
                >
                  {l.label}
                </a>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </header>
  )
}
