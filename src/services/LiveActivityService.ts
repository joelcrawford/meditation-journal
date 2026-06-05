import {NativeModules, Platform} from 'react-native';

const {LiveActivityModule} = NativeModules;

class LiveActivityService {
  async start(objectName: string, endTimeMs: number): Promise<void> {
    if (Platform.OS !== 'ios' || !LiveActivityModule?.start) return;
    await LiveActivityModule.start(objectName, endTimeMs).catch(() => {});
  }

  async update(endTimeMs: number): Promise<void> {
    if (Platform.OS !== 'ios' || !LiveActivityModule?.update) return;
    await LiveActivityModule.update(endTimeMs).catch(() => {});
  }

  async end(): Promise<void> {
    if (Platform.OS !== 'ios' || !LiveActivityModule?.end) return;
    await LiveActivityModule.end().catch(() => {});
  }
}

export const liveActivityService = new LiveActivityService();
