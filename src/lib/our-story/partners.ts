// Sourcing partners for the Our Story page. Lives here rather than inside
// OurStorySourcing so the hero fact list, the timeline, and the by-the-numbers
// band can all derive the partner COUNT from the same array they're described
// by. Those surfaces used to claim "6+ local farms" while this list named
// three — deriving the number makes that contradiction impossible.
//
// The farms themselves are storefront fiction, like the staff bios: no Farm
// model exists and none is planned. What has to stay honest is the internal
// consistency and the geography — drive distances are real ones for San Diego
// County towns, replacing an earlier "Central Valley · 1.8hr drive" that was
// off by several hours.
export type SourcingPartner = {
  eyebrow: string;
  title: string;
  titleEm: string;
  body: string;
  meta: string;
  img: string;
  stats: { v: string; unit: string; label: string }[];
  flip: boolean;
};

export const PARTNERS: SourcingPartner[] = [
  {
    eyebrow: 'Beef · Since 2019',
    title: 'Hartwell',
    titleEm: 'Ranch',
    body: 'Family-run since 1962. They raise Black Angus on 4,000 acres of Ramona grassland and finish on a corn-and-barley blend for 120 days. We buy whole carcasses, never less.',
    meta: 'RAMONA, CA · 40 MI',
    img: '/images/our-story/partner-hartwell-ranch.jpg',
    stats: [
      { v: '4,000', unit: 'ac', label: 'Pasture' },
      { v: '120', unit: 'days', label: 'Grain finish' },
      { v: '1962', unit: '', label: 'Family-run since' },
    ],
    flip: false,
  },
  {
    eyebrow: 'Pork · Since 2023',
    title: 'Wildwood',
    titleEm: 'Farm',
    body: "Heritage Berkshire pork, pasture-raised on 80 acres of oak savannah outside Julian. The hogs forage acorns most of the year. That's why the fat tastes the way it does.",
    meta: 'JULIAN, CA · 60 MI',
    img: '/images/our-story/partner-wildwood-farm.jpg',
    stats: [
      { v: '80', unit: 'ac', label: 'Oak savannah' },
      { v: '100', unit: '%', label: 'Pasture-raised' },
      { v: '~120', unit: '', label: 'Hogs / year' },
    ],
    flip: true,
  },
  {
    eyebrow: 'Chicken · Since 2021',
    title: 'Sunridge',
    titleEm: 'Farm',
    body: 'Free-range heritage chickens raised on 60 acres of sage scrubland outside Escondido. No antibiotics, no confinement — the birds forage year-round, and the flavor shows it. We take whole-bird delivery every Tuesday and break them down ourselves.',
    meta: 'ESCONDIDO, CA · 31 MI',
    img: '/images/our-story/partner-sunridge-farm.jpg',
    stats: [
      { v: '60', unit: 'ac', label: 'Sage scrubland' },
      { v: '100', unit: '%', label: 'Free-range' },
      { v: '~180', unit: '', label: 'Birds per month' },
    ],
    flip: false,
  },
];

export const PARTNER_COUNT = PARTNERS.length;
