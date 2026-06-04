export const BELL_STEMS = [
  'tibetan-bowl',
  'tibetan-bowl-02',
  'tibetan-bowl-03',
  'tibetan-bowl-04',
  'tibetan-bowl-05',
  'tibetan-bowl-06',
  'tibetan-bowl-07',
  'tibetan-bowl-08',
  'tibetan-bowl-09',
  'tibetan-bowl-10',
] as const;

export type BellStem = (typeof BELL_STEMS)[number];

export function bellDisplayName(stem: string): string {
  const name = stem.replace(/[-_]/g, ' ');
  return name.charAt(0).toUpperCase() + name.slice(1);
}
