import { useState } from 'react'
import Hero from './sections/Hero.jsx'
import Nav from './sections/Nav.jsx'
import Categories from './sections/Categories.jsx'
import Community from './sections/Community.jsx'
import RipLab from './sections/RipLab.jsx'
import Reviews from './sections/Reviews.jsx'
import Visit from './sections/Visit.jsx'
import Footer from './sections/Footer.jsx'
import MuteToggle from './sections/MuteToggle.jsx'
import Atmosphere from './atmosphere/Atmosphere.jsx'
import Ticker from './atmosphere/Ticker.jsx'
import SkylineDivider from './atmosphere/SkylineDivider.jsx'

export default function App() {
  // true once the pack has been opened (or skipped) so the nav can show the promo code.
  const [revealed, setRevealed] = useState(false)

  return (
    <>
      <Atmosphere />
      <Nav revealed={revealed} />
      <main>
        <Hero onRevealed={() => setRevealed(true)} />
        <Ticker />
        <Categories />
        <RipLab />
        <Community />
        <SkylineDivider id="atm-glow-a" />
        <Reviews />
        <SkylineDivider id="atm-glow-b" />
        <Visit />
      </main>
      <Footer />
      <MuteToggle />
    </>
  )
}
