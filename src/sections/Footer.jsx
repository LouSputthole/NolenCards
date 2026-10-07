import { shop } from '../content.js'

const YEAR = new Date().getFullYear()

export default function Footer() {
  return (
    <footer className="border-t border-line bg-ink-2">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-12 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-4">
          <img src="/logo.jpg" alt="" width="56" height="56" className="h-14 w-14 rounded-xl object-cover" />
          <div>
            <p className="font-display text-3xl tracking-wide text-snow">
              {shop.name} {shop.city}
            </p>
            <p className="text-sm text-fog">{shop.tagline}</p>
          </div>
        </div>

        <address className="space-y-1 text-sm not-italic text-fog">
          <span className="block">{shop.address}</span>
          <span className="block">{shop.cityStateZip}</span>
          <a href={shop.phoneHref} className="block text-snow hover:text-neon-blue">
            {shop.phone}
          </a>
          <a
            href={shop.facebook}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-2 text-snow hover:text-neon-blue"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
              <path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07c0 6.02 4.39 11.02 10.13 11.93v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.69.24 2.69.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.88v2.26h3.33l-.53 3.49h-2.8V24C19.61 23.09 24 18.09 24 12.07z" />
            </svg>
            Facebook
          </a>
        </address>
      </div>
      <div className="border-t border-line px-4 py-5 text-center text-xs text-fog">
        <p>© {YEAR} Pretty Cool Cards Nolensville</p>
        <p className="mt-1">Built with Three.js</p>
      </div>
    </footer>
  )
}
