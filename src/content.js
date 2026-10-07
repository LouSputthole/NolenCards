// Single source of truth for everything a human might want to change.
// Verified from Google listing / directories 2026-10-06. Owner should confirm.

export const shop = {
  name: 'Pretty Cool Cards',
  city: 'Nolensville',
  tagline: "Nolensville's home for sports cards & Pokémon",
  address: '7177 Nolensville Rd, Suite A3',
  cityStateZip: 'Nolensville, TN 37135',
  phone: '(615) 283-8186',
  phoneHref: 'tel:+16152838186',
  mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Pretty+Cool+Cards+7177+Nolensville+Rd+Nolensville+TN+37135',
  facebook: 'https://www.facebook.com/p/Pretty-Cool-Cards-Nolensville-61566604351659/',
  instagram: '', // TODO: owner to supply handle
  rating: '4.9',
  reviewCount: '215',
}

export const hours = [
  { day: 'Monday', open: '12 – 7 PM' },
  { day: 'Tuesday', open: 'Closed' },
  { day: 'Wednesday', open: '12 – 7 PM' },
  { day: 'Thursday', open: '12 – 7 PM' },
  { day: 'Friday', open: '12 – 7 PM' },
  { day: 'Saturday', open: '12 – 8 PM' },
  { day: 'Sunday', open: '12 – 7 PM' },
]

// The pack-opening reward. Show the code at the register.
export const promo = {
  percent: 10,
  code: 'PACKOPEN10',
  terms: 'One per customer. Show this screen at the register. Excludes graded cards and sealed cases.',
}

export const categories = [
  { title: 'Pokémon', blurb: 'Booster packs, ETBs, singles and vintage WOTC. New sets on release day.', accent: 'red' },
  { title: 'Sports Cards', blurb: 'Modern and vintage football, basketball, baseball. Hobby boxes and sealed wax.', accent: 'blue' },
  { title: 'One Piece & TCG', blurb: 'One Piece, Magic and more. Singles sleeved and priced.', accent: 'red' },
  { title: 'Graded & Singles', blurb: 'PSA, BGS, CGC slabs and a deep singles wall you can actually flip through.', accent: 'blue' },
  { title: 'Supplies', blurb: 'Sleeves, toploaders, binders and cases. Protect the hits.', accent: 'red' },
  { title: 'We Buy Collections', blurb: 'Bring in your cards for a fair, same-day cash or trade offer.', accent: 'blue' },
]

export const community = [
  { title: 'Trade Nights', blurb: 'Bring your binder. Weekly open trading at the back-room tables, all ages welcome.' },
  { title: 'Kids Club', blurb: 'A club for young collectors with its own events, giveaways and a friendly first trade.' },
  { title: 'Game Room', blurb: 'A family-friendly back room for playing the games you collect.' },
  { title: 'Release Day Rips', blurb: 'New set drops with in-store openings. Follow the Facebook page for dates.' },
]

export const reviews = [
  { quote: 'Clean, modern layout with well-organized displays. A wide mix for new fans and longtime collectors.', who: 'Google review' },
  { quote: 'The best card shop in the Nashville area. Staff actually know the hobby and treat kids great.', who: 'Google review' },
  { quote: 'Fair prices on singles and they gave me a real offer on my collection, not a lowball.', who: 'Google review' },
]

export const ticker = [
  'New Pokémon sets on release day',
  'We buy collections · cash or trade',
  'Trade nights · all ages',
  'Kids club',
  'Graded slabs: PSA · BGS · CGC',
  '7177 Nolensville Rd · Suite A3',
]
