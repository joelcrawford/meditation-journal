import {NativeModules} from 'react-native';
import {storage, STORAGE_KEYS} from '../storage/mmkv';

const {BellSound} = NativeModules;

class BellService {
  async loadSound(): Promise<void> {}

  async playBell(): Promise<void> {
    const stem = storage.getString(STORAGE_KEYS.BELL_SOUND) ?? 'tibetan-bowl';
    if (BellSound?.play) await BellSound.play(stem);
  }

  async previewBell(stem: string): Promise<void> {
    if (BellSound?.play) await BellSound.play(stem);
  }

  async unloadSound(): Promise<void> {}
}

export const bellService = new BellService();
