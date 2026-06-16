#import "BellSoundModule.h"
#import <AVFoundation/AVFoundation.h>

@implementation BellSoundModule {
  AVAudioPlayer *_player;
  AVAudioEngine *_silentEngine;
  AVAudioPlayerNode *_silentNode;
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

RCT_EXPORT_METHOD(activateKeepAwake:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
  dispatch_async(dispatch_get_main_queue(), ^{
    [[UIApplication sharedApplication] setIdleTimerDisabled:YES];
    resolve(nil);
  });
}

RCT_EXPORT_METHOD(deactivateKeepAwake:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
  dispatch_async(dispatch_get_main_queue(), ^{
    [[UIApplication sharedApplication] setIdleTimerDisabled:NO];
    resolve(nil);
  });
}

// Keeps the AVAudioSession alive so iOS doesn't freeze the JS thread while the
// screen is locked. Uses a zeroed PCM buffer looped via AVAudioEngine — no file
// needed. The category (Playback + MixWithOthers) lets the bell bypass the
// silent switch while not interrupting music the user may have playing.
RCT_EXPORT_METHOD(startSilentLoop:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
  dispatch_async(dispatch_get_main_queue(), ^{
    [[AVAudioSession sharedInstance]
      setCategory:AVAudioSessionCategoryPlayback
      withOptions:AVAudioSessionCategoryOptionMixWithOthers
      error:nil];
    [[AVAudioSession sharedInstance] setActive:YES error:nil];

    self->_silentEngine = [[AVAudioEngine alloc] init];
    self->_silentNode = [[AVAudioPlayerNode alloc] init];
    [self->_silentEngine attachNode:self->_silentNode];

    AVAudioFormat *format = [[AVAudioFormat alloc]
      initStandardFormatWithSampleRate:8000 channels:1];
    [self->_silentEngine connect:self->_silentNode
                             to:self->_silentEngine.mainMixerNode
                         format:format];

    // 1-second silent buffer; AVAudioPCMBuffer zero-initialises its samples
    AVAudioPCMBuffer *buf = [[AVAudioPCMBuffer alloc]
      initWithPCMFormat:format frameCapacity:8000];
    buf.frameLength = 8000;

    NSError *err;
    [self->_silentEngine startAndReturnError:&err];
    [self->_silentNode scheduleBuffer:buf
                               atTime:nil
                              options:AVAudioPlayerNodeBufferLoops
                    completionHandler:nil];
    [self->_silentNode play];
    resolve(nil);
  });
}

RCT_EXPORT_METHOD(stopSilentLoop:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
  dispatch_async(dispatch_get_main_queue(), ^{
    [self->_silentNode stop];
    [self->_silentEngine stop];
    self->_silentNode = nil;
    self->_silentEngine = nil;
    resolve(nil);
  });
}

- (dispatch_queue_t)methodQueue
{
  return dispatch_get_main_queue();
}

@end
