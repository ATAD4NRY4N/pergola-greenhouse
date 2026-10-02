/**
 * Local sourcing list for Runcorn / Widnes and the surrounding Cheshire area.
 *
 * These are the kinds of counter you will actually walk into for each part.
 * Branch names and stock change often, so treat this as a shortlist and a
 * set of search terms — confirm before you set off, and always ask whether
 * they cut to length on site.
 */

export interface Supplier {
  category: string;
  name: string;
  where: string;
  for: string;
  search: string;
}

export const SUPPLIERS: Supplier[] = [
  {
    category: "Builders’ merchants",
    name: "Jewson",
    where: "Runcorn",
    for: "SHS, C and Z purlins, fixings, concrete, track",
    search: "Jewson Runcorn builders merchant",
  },
  {
    category: "Builders’ merchants",
    name: "Travis Perkins",
    where: "Runcorn / Widnes",
    for: "Steel section, timber, fixings, buckets of ballast",
    search: "Travis Perkins Runcorn branch",
  },
  {
    category: "Builders’ merchants",
    name: "Buildbase",
    where: "Runcorn",
    for: "Sheet materials, insulation, drainage, general",
    search: "Buildbase Runcorn",
  },
  {
    category: "Builders’ merchants",
    name: "B&Q / Toolstation",
    where: "Runcorn / Widnes",
    for: "Consumables, tek screws, workwear, offcuts",
    search: "B&Q Runcorn supercentre",
  },
  {
    category: "Steel & section",
    name: "Huws Steel",
    where: "Deeside / Flintshire — short drive",
    for: "Cold-formed Z and C purlins cut to length, SHS, cleats",
    search: "Huws Steel purlins cut to length",
  },
  {
    category: "Steel & section",
    name: "Barrett Steel",
    where: "North West",
    for: "Z purlins, C sections, SHS, pressed cleats and brackets",
    search: "Barrett Steel North West purlin",
  },
  {
    category: "Steel & section",
    name: "Righton Blackburns",
    where: "North West / Midlands",
    for: "Cold rolled sections, purlin systems, self-drilling fixings",
    search: "Righton Blackburns steel sections",
  },
  {
    category: "Polycarbonate",
    name: "Roofglaze",
    where: "Runcorn",
    for: "Twinwall / triplewall in 8 × 4 ft, cut to size, DIY-friendly",
    search: "Roofglaze Runcorn twinwall polycarbonate",
  },
  {
    category: "Polycarbonate",
    name: "GlazeTrade",
    where: "Runcorn",
    for: "Polycarb sheets, aluminium glazing bar, silicone and tape",
    search: "GlazeTrade Runcorn",
  },
  {
    category: "Polycarbonate",
    name: "Amari Plastics",
    where: "UK online / collector",
    for: "Cut-to-size polycarb, PVC capping, aluminium or uPVC trim",
    search: "Amari Plastics polycarbonate sheet cut to size",
  },
  {
    category: "Doors & hardware",
    name: "Sintek",
    where: "Runcorn",
    for: "Plastic fabrication — welded polycarb door infills and trims",
    search: "Sintek Runcorn plastic fabrication",
  },
  {
    category: "Doors & hardware",
    name: "Hafele",
    where: "National / online",
    for: "Sliding door track, wheels, soft-close, brushed pulls",
    search: "Hafele sliding door track wheel set",
  },
  {
    category: "Doors & hardware",
    name: "Ironmongery Direct",
    where: "National / online",
    for: "Track, rollers, flush pulls, aluminium box section for casing",
    search: "Ironmongery Direct sliding door hardware",
  },
  {
    category: "Foundations",
    name: "Local concrete & groundwork",
    where: "Runcorn / Widnes",
    for: "Post pads, concrete, drainage, and a mixer hire for the pads",
    search: "concrete post pads Runcorn ready mix",
  },
];

export const SUPPLIER_CATEGORIES = [
  ...new Set(SUPPLIERS.map((s) => s.category)),
];
