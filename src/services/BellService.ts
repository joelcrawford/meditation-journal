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

  async activateKeepAwake(): Promise<void> {
    if (BellSound?.activateKeepAwake) await BellSound.activateKeepAwake();
  }

  async deactivateKeepAwake(): Promise<void> {
    if (BellSound?.deactivateKeepAwake) await BellSound.deactivateKeepAwake();
  }

  async startSilentLoop(): Promise<void> {
    if (BellSound?.startSilentLoop) await BellSound.startSilentLoop();
  }

  async stopSilentLoop(): Promise<void> {
    if (BellSound?.stopSilentLoop) await BellSound.stopSilentLoop();
  }

  async unloadSound(): Promise<void> {}
}

export const bellService = new BellService();
