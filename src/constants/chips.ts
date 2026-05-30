export const CHIP_LIST = {
  BEFORE_MIND: 'before_mind',
  DISTRACTIONS: 'distractions',
  BODY_SENSATIONS: 'body_sensations',
  FEELINGS: 'feelings',
  EMOTIONAL_TONE: 'emotional_tone',
  THOUGHT_TYPES: 'thought_types',
  POSTURE: 'posture',
  DT_DONKEY: 'dt_donkey',
  DT_TIGER: 'dt_tiger',
} as const;

export type ChipListName = (typeof CHIP_LIST)[keyof typeof CHIP_LIST];
