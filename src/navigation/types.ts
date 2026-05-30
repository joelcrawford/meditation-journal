export type RootStackParamList = {
  Home: undefined;
  Before: undefined;
  After: {sessionId: number};
  CheckinModal: {checkinType: 'morning' | 'afternoon' | 'evening'};
  CheckinResult: {
    dt_score: number | null;
    tiger: number;
    donkey: number;
    neutralCount: number;
    type: 'morning' | 'afternoon' | 'evening';
  };
  MeditationObjectSheet: undefined;
  Settings: undefined;
};
