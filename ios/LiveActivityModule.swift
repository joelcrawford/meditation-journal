import ActivityKit
import Foundation
import React

@available(iOS 16.2, *)
@objc(LiveActivityModule)
class LiveActivityModule: NSObject {
  private var activity: Activity<TimerAttributes>?

  @objc func start(_ objectName: String,
                   endTime endTimeMs: Double,
                   resolver resolve: @escaping RCTPromiseResolveBlock,
                   rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard ActivityAuthorizationInfo().areActivitiesEnabled else {
      resolve(nil)
      return
    }
    Task {
      let endDate = Date(timeIntervalSince1970: endTimeMs / 1000)
      let attrs = TimerAttributes(objectName: objectName)
      let state = TimerAttributes.ContentState(endDate: endDate)
      let content = ActivityContent(state: state, staleDate: endDate)
      self.activity = try? Activity.request(attributes: attrs, content: content)
      resolve(nil)
    }
  }

  @objc func update(_ endTimeMs: Double,
                    resolver resolve: @escaping RCTPromiseResolveBlock,
                    rejecter reject: @escaping RCTPromiseRejectBlock) {
    Task {
      let endDate = Date(timeIntervalSince1970: endTimeMs / 1000)
      let state = TimerAttributes.ContentState(endDate: endDate)
      let content = ActivityContent(state: state, staleDate: endDate)
      await self.activity?.update(content)
      resolve(nil)
    }
  }

  @objc func end(_ resolve: @escaping RCTPromiseResolveBlock,
                 rejecter reject: @escaping RCTPromiseRejectBlock) {
    Task {
      await self.activity?.end(nil, dismissalPolicy: .immediate)
      self.activity = nil
      resolve(nil)
    }
  }

  @objc static func requiresMainQueueSetup() -> Bool { false }
}
