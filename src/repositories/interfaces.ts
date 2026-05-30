import type {
  Session,
  NewBeforeData,
  AfterSessionData,
  Checkin,
  NewCheckinData,
  MeditationObject,
  NewObjectData,
} from '../types';

export interface SessionRepository {
  findByDate(date: string): Session[];
  findByDateRange(from: string, to: string): Session[];
  findById(id: number): Session | null;
  findAllCompleteDatesDesc(): string[];
  insert(date: string, data: NewBeforeData): Session;
  completeAfter(id: number, data: AfterSessionData): Session;
  delete(id: number): void;
}

export interface CheckinRepository {
  findByDate(date: string): Checkin[];
  insert(data: NewCheckinData): Checkin;
  delete(id: number): void;
}

export interface MeditationObjectRepository {
  findActive(): MeditationObject;
  findAll(): MeditationObject[];
  insert(data: NewObjectData, startDate: number): MeditationObject;
  deactivate(id: number, endedDate: number): void;
}
