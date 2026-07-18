export const FORMATS = {
  STANDARD:              { label: "Standard",              defaultLife: 20,  minPlayers: 2, maxPlayers: 2 },
  PIONEER:                { label: "Pioneer",                defaultLife: 20,  minPlayers: 2, maxPlayers: 2 },
  MODERN:                 { label: "Modern",                 defaultLife: 20,  minPlayers: 2, maxPlayers: 2 },
  LEGACY:                 { label: "Legacy",                 defaultLife: 20,  minPlayers: 2, maxPlayers: 2 },
  VINTAGE:                { label: "Vintage",                defaultLife: 20,  minPlayers: 2, maxPlayers: 2 },
  PAUPER:                 { label: "Pauper",                 defaultLife: 20,  minPlayers: 2, maxPlayers: 2 },
  COMMANDER:              { label: "Commander (EDH)",        defaultLife: 40,  minPlayers: 2, maxPlayers: 6 },
  DUEL_COMMANDER:         { label: "Duel Commander",         defaultLife: 100, minPlayers: 2, maxPlayers: 2 },
  OATHBREAKER:            { label: "Oathbreaker",            defaultLife: 20,  minPlayers: 2, maxPlayers: 6 },
  BRAWL:                  { label: "Brawl",                  defaultLife: 25,  minPlayers: 2, maxPlayers: 4 },
  HISTORIC_BRAWL:         { label: "Historic Brawl",         defaultLife: 25,  minPlayers: 2, maxPlayers: 4 },
  HISTORIC:               { label: "Historic",               defaultLife: 20,  minPlayers: 2, maxPlayers: 2 },
  EXPLORER:               { label: "Explorer",               defaultLife: 20,  minPlayers: 2, maxPlayers: 2 },
  TIMELESS:               { label: "Timeless",               defaultLife: 20,  minPlayers: 2, maxPlayers: 2 },
  ALCHEMY:                { label: "Alchemy",                defaultLife: 20,  minPlayers: 2, maxPlayers: 2 },
  FRONTIER:               { label: "Frontier",               defaultLife: 20,  minPlayers: 2, maxPlayers: 2 },
  GLADIATOR:              { label: "Gladiator",              defaultLife: 30,  minPlayers: 2, maxPlayers: 6 },
  CANADIAN_HIGHLANDER:    { label: "Canadian Highlander",    defaultLife: 100, minPlayers: 2, maxPlayers: 2 },
  AUSTRALIAN_HIGHLANDER:  { label: "Australian Highlander",  defaultLife: 100, minPlayers: 2, maxPlayers: 2 },
  TINY_LEADERS:           { label: "Tiny Leaders",           defaultLife: 25,  minPlayers: 2, maxPlayers: 6 },
  ARTISAN:                { label: "Artisan",                defaultLife: 20,  minPlayers: 2, maxPlayers: 2 },
  PENNY_DREADFUL:         { label: "Penny Dreadful",         defaultLife: 20,  minPlayers: 2, maxPlayers: 2 },
  PREMODERN:              { label: "Premodern",              defaultLife: 20,  minPlayers: 2, maxPlayers: 2 },
  ALPHA_40:               { label: "Alpha 40",               defaultLife: 20,  minPlayers: 2, maxPlayers: 2 },
  BOOSTER_DRAFT:          { label: "Booster Draft",          defaultLife: 20,  minPlayers: 2, maxPlayers: 8 },
  SEALED:                 { label: "Sealed",                 defaultLife: 20,  minPlayers: 2, maxPlayers: 8 },
  CUBE:                   { label: "Cube",                   defaultLife: 20,  minPlayers: 2, maxPlayers: 8 },
  JUMPSTART:              { label: "Jumpstart",              defaultLife: 20,  minPlayers: 2, maxPlayers: 4 },
  PACK_WARS:              { label: "Pack Wars",              defaultLife: 20,  minPlayers: 2, maxPlayers: 4 },
  PLANECHASE:             { label: "Planechase",             defaultLife: 20,  minPlayers: 2, maxPlayers: 6 },
  ARCHENEMY:              { label: "Archenemy",              defaultLife: 20,  minPlayers: 2, maxPlayers: 5 },
  ARCHENEMY_COMMANDER:    { label: "Archenemy Commander",    defaultLife: 40,  minPlayers: 2, maxPlayers: 5 },
  TWO_HEADED_GIANT:       { label: "Two-Headed Giant",       defaultLife: 30,  minPlayers: 4, maxPlayers: 4 },
  CONSPIRACY:             { label: "Conspiracy",             defaultLife: 20,  minPlayers: 3, maxPlayers: 8 },
  FREEFORM:               { label: "Freeform",               defaultLife: 20,  minPlayers: 2, maxPlayers: 8 },
  MOMIR_BASIC:            { label: "Momir Basic",            defaultLife: 20,  minPlayers: 2, maxPlayers: 2 },
} as const;

export type FormatKey = keyof typeof FORMATS;
export const FORMAT_KEYS = Object.keys(FORMATS) as FormatKey[];

// Best-effort mapping from Moxfield's `format` string to our enum.
// Moxfield's API is unofficial/undocumented, so this is inferred from
// common naming conventions, not verified against a live response.
// Unmapped values are logged (see the import route) - extend this map
// as you encounter real ones.
const MOXFIELD_FORMAT_MAP: Record<string, FormatKey> = {
  standard: "STANDARD",
  pioneer: "PIONEER",
  modern: "MODERN",
  legacy: "LEGACY",
  vintage: "VINTAGE",
  pauper: "PAUPER",
  commander: "COMMANDER",
  duelcommander: "DUEL_COMMANDER",
  oathbreaker: "OATHBREAKER",
  brawl: "BRAWL",
  historicbrawl: "HISTORIC_BRAWL",
  historic: "HISTORIC",
  explorer: "EXPLORER",
  timeless: "TIMELESS",
  alchemy: "ALCHEMY",
  frontier: "FRONTIER",
  gladiator: "GLADIATOR",
  canadianhighlander: "CANADIAN_HIGHLANDER",
  australianhighlander: "AUSTRALIAN_HIGHLANDER",
  tinyleaders: "TINY_LEADERS",
  penny: "PENNY_DREADFUL",
  pennydreadful: "PENNY_DREADFUL",
  premodern: "PREMODERN",
};

export function mapMoxfieldFormat(raw: string | null | undefined): FormatKey | null {
  if (!raw) return null;
  const key = raw.toLowerCase().replace(/[^a-z]/g, "");
  return MOXFIELD_FORMAT_MAP[key] ?? null;
}

export function getFormatLife(format: FormatKey): number {
  return FORMATS[format].defaultLife;
}