import {LocalSessionRepository} from '../repositories/LocalSessionRepository';
import {LocalCheckinRepository} from '../repositories/LocalCheckinRepository';
import {LocalMeditationObjectRepository} from '../repositories/LocalMeditationObjectRepository';
import {SessionService} from './SessionService';
import {CheckinService} from './CheckinService';
import {MeditationObjectService} from './MeditationObjectService';
import {StreakService} from './StreakService';

const sessionRepo = new LocalSessionRepository();
const checkinRepo = new LocalCheckinRepository();
const objectRepo = new LocalMeditationObjectRepository();

export const sessionService = new SessionService(sessionRepo);
export const checkinService = new CheckinService(checkinRepo);
export const meditationObjectService = new MeditationObjectService(objectRepo);
export const streakService = new StreakService(sessionRepo);
