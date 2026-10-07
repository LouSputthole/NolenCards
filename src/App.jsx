import { useState } from 'react'
import Hero from './sections/Hero.jsx'
import Nav from './sections/Nav.jsx'
import Categories from './sections/Categories.jsx'
import Community from './sections/Community.jsx'
import Reviews from './sections/Reviews.jsx'
import Visit from './sections/Visit.jsx'
import Footer from './sections/Footer.jsx'

export default function App() {
  // true once the pack has been opened (or skipped) so the nav can show the promo code.
  const [revealed, setRevealed] = useState(false)

  return (
    <>
      <Nav revealed={revealed} />
      <main>
        <Hero onRevealed={() => setRevealed(true)} />
        <Categories />
        <Community />
        <Reviews />
        <Visit />
      </main>
      <Footer />
    </>
  )
}
