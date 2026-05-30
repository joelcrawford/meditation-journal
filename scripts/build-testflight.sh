#!/bin/bash
set -e

# Load credentials from .env at project root
if [ -f ".env" ]; then
  export $(grep -v '^#' .env | xargs)
fi

# Check required vars
required_vars=(
  "APPLE_CONNECT_KEY_ID"
  "APPLE_CONNECT_ISSUER_ID"
  "APPLE_CONNECT_DIST_PASSWORD"
)
for var in "${required_vars[@]}"; do
  if [ -z "${!var}" ]; then
    echo "✗ Missing $var in .env"
    exit 1
  fi
done

# Config
AUTH_DIR="ios/_auth"
DIST_CERT_P12="$AUTH_DIR/meditation-journal-dist-cert.p12"
PROFILE_PATH="$AUTH_DIR/meditationjournal_appstore.mobileprovision"
API_KEY_PATH="$AUTH_DIR/AuthKey_${APPLE_CONNECT_KEY_ID}.p8"
SIGNING_IDENTITY="Apple Distribution: Joel Crawford (5469PA59T3)"
BUNDLE_ID="com.havehopeyo.meditationjournal"
WORKSPACE="ios/MeditationJournal.xcworkspace"
SCHEME="MeditationJournal"
INFO_PLIST="ios/MeditationJournal/Info.plist"
ARCHIVE_PATH="/tmp/MeditationJournal.xcarchive"
EXPORT_PATH="/tmp/MeditationJournal-export"
EXPORT_OPTIONS="/tmp/MeditationJournal-export-options.plist"
DECODED_PROFILE="/tmp/meditationjournal-profile.plist"
UUID_FILE="/tmp/meditationjournal-profile-uuid.txt"
LOG="/tmp/meditationjournal-ship.log"

KEYCHAIN_PATH="$HOME/Library/Keychains/meditationjournal-build.keychain-db"
KEYCHAIN_PASSWORD="meditationjournal-tmp"

ORIGINAL_KEYCHAINS=$(security list-keychains -d user | xargs)
STEP=0
TOTAL=7

> "$LOG"

cleanup() {
  security list-keychains -d user -s $ORIGINAL_KEYCHAINS 2>/dev/null || true
  security delete-keychain "$KEYCHAIN_PATH" 2>/dev/null || true
  rm -f "$EXPORT_OPTIONS" "$DECODED_PROFILE" "$UUID_FILE"
}
trap cleanup EXIT

run_step() {
  local desc="$1"
  local fn="$2"
  STEP=$((STEP + 1))
  printf "[%d/%d] %s" "$STEP" "$TOTAL" "$desc"

  $fn >> "$LOG" 2>&1 &
  local pid=$!
  while kill -0 "$pid" 2>/dev/null; do
    printf "."
    sleep 3
  done

  if wait "$pid"; then
    printf " ✓\n"
  else
    printf " ✗\n\n"
    echo "--- Error (last 40 lines of log) ---"
    tail -40 "$LOG"
    echo ""
    echo "Full log: $LOG"
    exit 1
  fi
}

# ── Steps ─────────────────────────────────────────────────────────────────────

step_keychain() {
  set -e
  security delete-keychain "$KEYCHAIN_PATH" 2>/dev/null || true
  security create-keychain -p "$KEYCHAIN_PASSWORD" "$KEYCHAIN_PATH"
  security set-keychain-settings -lut 21600 "$KEYCHAIN_PATH"
  security unlock-keychain -p "$KEYCHAIN_PASSWORD" "$KEYCHAIN_PATH"
  security list-keychains -d user -s "$KEYCHAIN_PATH" $ORIGINAL_KEYCHAINS
  security import "$DIST_CERT_P12" \
    -k "$KEYCHAIN_PATH" \
    -P "$APPLE_CONNECT_DIST_PASSWORD" \
    -T /usr/bin/codesign \
    -T /usr/bin/security
  security set-key-partition-list \
    -S "apple-tool:,apple:,codesign:" \
    -s -k "$KEYCHAIN_PASSWORD" \
    "$KEYCHAIN_PATH"
}

step_profile() {
  set -e
  security cms -D -i "$PROFILE_PATH" -o "$DECODED_PROFILE"
  /usr/libexec/PlistBuddy -c 'Print :UUID' "$DECODED_PROFILE" > "$UUID_FILE"
  rm -f "$DECODED_PROFILE"
  mkdir -p ~/Library/MobileDevice/Provisioning\ Profiles
  cp "$PROFILE_PATH" ~/Library/MobileDevice/Provisioning\ Profiles/"$(cat "$UUID_FILE").mobileprovision"
}

step_bump_build() {
  set -e
  CURRENT=$(/usr/libexec/PlistBuddy -c 'Print :CFBundleVersion' "$INFO_PLIST")
  NEXT=$((CURRENT + 1))
  /usr/libexec/PlistBuddy -c "Set :CFBundleVersion $NEXT" "$INFO_PLIST"
  echo "Build number: $CURRENT → $NEXT"
}

step_preextract() {
  set -e
  # Clear build-config caches and previous extractions so scripts start fresh
  rm -f ios/Pods/ReactNativeDependencies/.last_build_configuration
  rm -f ios/Pods/React-Core-prebuilt/.last_build_configuration
  rm -f ios/Pods/hermes-engine/.last_build_configuration
  rm -f ios/Pods/.last_build_configuration
  # Wipe previous extractions — the RN scripts use old rmdirSync which fails on non-empty dirs
  find ios/Pods/ReactNativeDependencies/framework -mindepth 1 -delete 2>/dev/null || true
  rmdir ios/Pods/ReactNativeDependencies/framework 2>/dev/null || true
  find ios/Pods/React-Core-prebuilt/React.xcframework -mindepth 1 -delete 2>/dev/null || true
  rmdir ios/Pods/React-Core-prebuilt/React.xcframework 2>/dev/null || true
  # Pre-extract RN prebuilt tarballs so parallel build phases don't race.
  # Both scripts must run from ios/Pods (they use relative paths internally).
  pushd ios/Pods > /dev/null
  node ../../node_modules/react-native/third-party-podspecs/replace_dependencies_version.js \
    -c Release -r 0.85.3 -p .
  node ../../node_modules/react-native/scripts/replace-rncore-version.js \
    -c Release -r 0.85.3 -p .
  popd > /dev/null
}

step_archive() {
  set -e
  PROFILE_UUID=$(cat "$UUID_FILE")
  rm -rf "$ARCHIVE_PATH"
  xcodebuild archive \
    -workspace "$WORKSPACE" \
    -scheme "$SCHEME" \
    -configuration Release \
    -archivePath "$ARCHIVE_PATH" \
    -destination "generic/platform=iOS" \
    CODE_SIGN_STYLE=Manual \
    "CODE_SIGN_IDENTITY=$SIGNING_IDENTITY" \
    "PROVISIONING_PROFILE=$PROFILE_UUID" \
    DEVELOPMENT_TEAM=5469PA59T3 \
    "OTHER_CODE_SIGN_FLAGS=--keychain $KEYCHAIN_PATH"
}

step_export() {
  set -e
  PROFILE_UUID=$(cat "$UUID_FILE")
  cat > "$EXPORT_OPTIONS" << PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>method</key>
  <string>app-store-connect</string>
  <key>signingStyle</key>
  <string>manual</string>
  <key>signingCertificate</key>
  <string>$SIGNING_IDENTITY</string>
  <key>provisioningProfiles</key>
  <dict>
    <key>$BUNDLE_ID</key>
    <string>$PROFILE_UUID</string>
  </dict>
  <key>stripSwiftSymbols</key>
  <true/>
  <key>compileBitcode</key>
  <false/>
</dict>
</plist>
PLIST
  rm -rf "$EXPORT_PATH"
  xcodebuild -exportArchive \
    -archivePath "$ARCHIVE_PATH" \
    -exportPath "$EXPORT_PATH" \
    -exportOptionsPlist "$EXPORT_OPTIONS"
}

step_submit() {
  set -e
  IPA_FILE=$(find "$EXPORT_PATH" -name "*.ipa" | head -1)
  if [ -z "$IPA_FILE" ]; then
    echo "No .ipa found in $EXPORT_PATH"
    exit 1
  fi
  mkdir -p ~/.appstoreconnect/private_keys
  cp "$(pwd)/$API_KEY_PATH" ~/.appstoreconnect/private_keys/AuthKey_${APPLE_CONNECT_KEY_ID}.p8
  xcrun altool --upload-app \
    --type ios \
    --file "$IPA_FILE" \
    --apiKey "$APPLE_CONNECT_KEY_ID" \
    --apiIssuer "$APPLE_CONNECT_ISSUER_ID"
}

# ── Run ───────────────────────────────────────────────────────────────────────

echo ""
run_step "Setting up signing keychain    " step_keychain
run_step "Installing provisioning profile" step_profile
run_step "Bumping build number           " step_bump_build
run_step "Pre-extracting RN prebuilt libs" step_preextract
run_step "Xcode archive (Release)        " step_archive
run_step "Exporting IPA                  " step_export
run_step "Uploading to App Store Connect " step_submit

echo ""
echo "✓ Done! Check App Store Connect → Meditation Journal → TestFlight."
echo ""
