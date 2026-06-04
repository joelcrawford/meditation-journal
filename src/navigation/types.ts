export type RootStackParamList = {
  Home: undefined;
  Before: undefined;
  Timer: {sessionId: number};
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
  BellPicker: undefined;
  Settings: undefined;
};
