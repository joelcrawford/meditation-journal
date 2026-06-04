#import "BellSoundModule.h"
#import <AVFoundation/AVFoundation.h>

@implementation BellSoundModule {
  AVAudioPlayer *_player;
}

RCT_EXPORT_MODULE(BellSound);

RCT_EXPORT_METHOD(play:(NSString *)stem
                resolver:(RCTPromiseResolveBlock)resolve
                rejecter:(RCTPromiseRejectBlock)reject)
{
  dispatch_async(dispatch_get_main_queue(), ^{
    NSString *path = [[NSBundle mainBundle] pathForResource:stem ofType:@"mp3"];
    if (!path) {
      resolve(nil);
      return;
    }
    NSError *err;
    [[AVAudioSession sharedInstance]
      setCategory:AVAudioSessionCategoryPlayback
      withOptions:AVAudioSessionCategoryOptionMixWithOthers
      error:nil];
    [[AVAudioSession sharedInstance] setActive:YES error:nil];
    self->_player = [[AVAudioPlayer alloc] initWithContentsOfURL:[NSURL fileURLWithPath:path] error:&err];
    [self->_player play];
    resolve(nil);
  });
}

- (dispatch_queue_t)methodQueue
{
  return dispatch_get_main_queue();
}

@end
