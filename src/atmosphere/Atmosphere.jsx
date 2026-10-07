import NeonLoader from './NeonLoader.jsx'
import SparkleCursor from './SparkleCursor.jsx'
import ScrollProgress from './ScrollProgress.jsx'
import KonamiRain from './KonamiRain.jsx'

// Page-wide, non-interactive polish layer. Everything here is pointer-events-none.
export default function Atmosphere() {
  return (
    <>
      <NeonLoader />
      <SparkleCursor />
      <ScrollProgress />
      <KonamiRain />
    </>
  )
}
