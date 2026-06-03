import {NativeModules} from 'react-native';

const {BellSound} = NativeModules;

class BellService {
  async loadSound(): Promise<void> {}

  async playBell(): Promise<void> {
    if (BellSound?.play) {
      await BellSound.play();
    }
  }

  async unloadSound(): Promise<void> {}
}

export const bellService = new BellService();
