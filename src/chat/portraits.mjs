// A single source of truth for scene, menu, settings and wardrobe portraits.
export const PORTRAIT_VERSION = '20261030-cute1';
export const PORTRAIT_FILES = Object.freeze({
  waddy: 'waddy-hakodot-v1.webp',
  mitra: 'mitra.webp',
  hina: 'hina-cute-v1.webp',
  ayu: 'ayu-cute-v1.webp',
  kud: 'kud-cute-v1.webp',
  mii: 'mii-cute-v1.webp',
  nemurin: 'nemurin-cute-v1.webp',
  hinako: 'hinako-cute-v1.webp',
  astarotte: 'astarotte-cute-v1.webp',
  multi: 'multi-cute-v1.webp',
  rem: 'rem-cute-v1.webp',
  ecoko: 'ecoko-cute-v1.webp',
  tsumugi: 'tsumugi-cute-v1.webp',
  rizel: 'rizel-cute-v1.webp',
  mayuki: 'mayuki-cute-v1.webp',
  ana: 'ana-cute-v1.webp',
  dejiko: 'dejiko-cute-v1.webp',
  feiris: 'feiris-cute-v1.webp',
  ruriko: 'ruriko-cute-v1.webp',
  kyoko: 'kyoko-cute-v1.webp',
  sharo: 'sharo-cute-v1.webp',
  kukuri: 'kukuri-cute-v1.webp',
  rin: 'rin-cute-v1.webp',
  kotomi: 'kotomi-cute-v1.webp',
  minagi: 'minagi-cute-v1.webp',
  kiku8: 'kiku8-cute-v1.webp',
  mint: 'mint-cute-v1.webp',
  hazuki: 'hazuki-cute-v1.webp',
  mitsuba: 'mitsuba-cute-v1.webp',
  tama: 'tama-cute-v1.webp',
  hinahina: 'hinahina-cute-v1.webp',
  moegami: 'moegami-cute-v1.webp',
  oji: 'oji-cute-v1.webp',
});
export function portraitUrl(id) {
  const file = PORTRAIT_FILES[id];
  if (!file) throw new Error('Unknown resident portrait: ' + id);
  return new URL('../../assets/chat/characters/' + file + '?v=' + PORTRAIT_VERSION, import.meta.url).href;
}
