//
//  MeditationJournalWidgetBundle.swift
//  MeditationJournalWidget
//
//  Created by Joel Crawford on 2026-06-04.
//

import WidgetKit
import SwiftUI

@main
struct MeditationJournalWidgetBundle: WidgetBundle {
    var body: some Widget {
        MeditationJournalWidget()
        MeditationJournalWidgetLiveActivity()
    }
}
