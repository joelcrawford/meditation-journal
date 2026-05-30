import {storage, STORAGE_KEYS} from '../storage/mmkv';
import type {MeditationObjectRepository} from '../repositories/interfaces';
import type {MeditationObject, NewObjectData} from '../types';

export class MeditationObjectService {
  constructor(private repo: MeditationObjectRepository) {}

  getCurrentObject(): MeditationObject {
    return this.repo.findActive();
  }

  setCurrentObject(data: NewObjectData): MeditationObject {
    const now = Math.floor(Date.now() / 1000);
    const current = this.repo.findActive();
    this.repo.deactivate(current.id, now);
    const next = this.repo.insert(data, now);
    storage.set(STORAGE_KEYS.OBJECT_CURRENT_ID, next.id);
    return next;
  }

  getObjectHistory(): MeditationObject[] {
    return this.repo.findAll();
  }
}
