import { useSfx } from '../sfx.js'

export default function MuteToggle() {
  const { muted, toggle, play } = useSfx()

  const onClick = () => {
    toggle()
    // `muted` is the pre-toggle value: if it was muted, sound is now on.
    if (muted) setTimeout(() => play('click', { volume: 0.6 }), 0)
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={muted}
      aria-label="Mute sound effects"
      title={muted ? 'Sound off' : 'Sound on'}
      className="fixed bottom-4 right-4 z-50 flex h-11 w-11 items-center justify-center rounded-full border border-line bg-ink-2/80 text-snow backdrop-blur transition-colors hover:text-neon-blue focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neon-blue"
    >
      <svg
        viewBox="0 0 24 24"
        width="20"
        height="20"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M11 5 6 9H3v6h3l5 4V5z" fill="currentColor" />
        {muted ? (
          <>
            <path d="m16 9 5 6" />
            <path d="m21 9-5 6" />
          </>
        ) : (
          <>
            <path d="M15.5 8.5a5 5 0 0 1 0 7" />
            <path d="M18.5 5.5a9 9 0 0 1 0 13" />
          </>
        )}
      </svg>
    </button>
  )
}
