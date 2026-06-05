import ActivityKit
import WidgetKit
import SwiftUI

private let mossDark  = Color(red: 0.29, green: 0.42, blue: 0.31)
private let mossLight = Color(red: 0.89, green: 0.92, blue: 0.88)
private let paperBg   = Color(red: 0.98, green: 0.97, blue: 0.95)
private let inkColor  = Color(red: 0.10, green: 0.08, blue: 0.06)
private let inkFaint  = Color(red: 0.42, green: 0.38, blue: 0.32)

// MARK: - Lock Screen / Banner

struct MeditationLockScreenView: View {
    let context: ActivityViewContext<TimerAttributes>

    var body: some View {
        HStack(spacing: 14) {
            // Icon
            ZStack {
                RoundedRectangle(cornerRadius: 10)
                    .fill(mossLight)
                    .frame(width: 42, height: 42)
                Image(systemName: "figure.mind.and.body")
                    .font(.system(size: 20))
                    .foregroundStyle(mossDark)
            }

            VStack(alignment: .leading, spacing: 2) {
                Text(context.attributes.objectName)
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(inkFaint)
                Text(timerInterval: Date.now...context.state.endDate, countsDown: true)
                    .font(.system(size: 28, weight: .light, design: .serif))
                    .foregroundStyle(inkColor)
                    .monospacedDigit()
            }

            Spacer()
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .activityBackgroundTint(paperBg)
        .activitySystemActionForegroundColor(mossDark)
    }
}

// MARK: - Widget

struct MeditationJournalWidgetLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: TimerAttributes.self) { context in
            MeditationLockScreenView(context: context)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.center) {
                    VStack(spacing: 3) {
                        Text(timerInterval: Date.now...context.state.endDate, countsDown: true)
                            .font(.system(size: 36, weight: .light, design: .serif))
                            .foregroundStyle(inkColor)
                            .monospacedDigit()
                        Text(context.attributes.objectName)
                            .font(.system(size: 12))
                            .foregroundStyle(inkFaint)
                    }
                }
            } compactLeading: {
                Image(systemName: "figure.mind.and.body")
                    .font(.system(size: 14))
                    .foregroundStyle(mossDark)
            } compactTrailing: {
                Text(timerInterval: Date.now...context.state.endDate, countsDown: true)
                    .font(.system(size: 14, weight: .medium, design: .serif))
                    .foregroundStyle(inkColor)
                    .monospacedDigit()
                    .frame(minWidth: 40)
            } minimal: {
                Image(systemName: "timer")
                    .font(.system(size: 14))
                    .foregroundStyle(mossDark)
            }
            .widgetURL(URL(string: "meditationjournal://timer"))
            .keylineTint(mossDark)
        }
    }
}
