// Pure helper, no React imports so it runs under plain node for tests.

// '12 – 7 PM' -> { open: 12, close: 19 }, or null when closed / unparseable.
function parseRange(text) {
  const m = /(\d{1,2})\s*[–-]\s*(\d{1,2})\s*(AM|PM)/i.exec(text)
  if (!m) return null
  const a = Number(m[1]) % 12
  const b = Number(m[2]) % 12
  const pm = m[3].toUpperCase() === 'PM'
  const close = b + (pm ? 12 : 0)
  const open = a + 12 < close ? a + 12 : a
  return { open, close }
}

function fmtHour(h) {
  return `${h % 12 || 12} ${h >= 12 ? 'PM' : 'AM'}`
}

// hours: [{day, open}] starting Monday. date: any Date. Evaluated in America/Chicago.
// Returns { open: boolean, status: string, todayIndex: number } (todayIndex into hours).
export function isOpenNow(hours, date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    weekday: 'long',
    hour: 'numeric',
    minute: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(date)
  const get = (t) => parts.find((p) => p.type === t)?.value
  const weekday = get('weekday')
  const now = Number(get('hour')) + Number(get('minute')) / 60
  const todayIndex = hours.findIndex((h) => h.day === weekday)
  const range = todayIndex >= 0 ? parseRange(hours[todayIndex].open) : null

  if (!range) return { open: false, status: 'Closed today', todayIndex }
  if (now >= range.open && now < range.close) {
    return { open: true, status: `Open now · until ${fmtHour(range.close)}`, todayIndex }
  }
  if (now < range.open) {
    return { open: false, status: `Closed · opens at ${fmtHour(range.open)}`, todayIndex }
  }
  return { open: false, status: 'Closed', todayIndex }
}


