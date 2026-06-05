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
WIDGET_PROFILE_PATH="$AUTH_DIR/meditationjournal_widget_appstore.mobileprovision"
API_KEY_PATH="$AUTH_DIR/AuthKey_${APPLE_CONNECT_KEY_ID}.p8"
SIGNING_IDENTITY="Apple Distribution: Joel Crawford (5469PA59T3)"
BUNDLE_ID="com.havehopeyo.meditationjournal"
WIDGET_BUNDLE_ID="com.havehopeyo.meditationjournal.MeditationJournalWidget"
WORKSPACE="ios/MeditationJournal.xcworkspace"
SCHEME="MeditationJournal"
INFO_PLIST="ios/MeditationJournal/Info.plist"
ARCHIVE_PATH="/tmp/MeditationJournal.xcarchive"
EXPORT_PATH="/tmp/MeditationJournal-export"
EXPORT_OPTIONS="/tmp/MeditationJournal-export-options.plist"
DECODED_PROFILE="/tmp/meditationjournal-profile.plist"
UUID_FILE="/tmp/meditationjournal-profile-uuid.txt"
WIDGET_UUID_FILE="/tmp/meditationjournal-widget-profile-uuid.txt"
LOG="/tmp/meditationjournal-ship.log"

# project.pbxproj patching — Release XCBuildConfiguration IDs (stable, set by Xcode)
PBXPROJ="ios/MeditationJournal.xcodeproj/project.pbxproj"
PBXPROJ_BACKUP="/tmp/meditationjournal-project-backup.pbxproj"
MAIN_CONFIG_ID="13B07F951A680F5B00A75B9A"
WIDGET_CONFIG_ID="5DA4522C2FD23D4C00BC1AF1"

KEYCHAIN_PATH="$HOME/Library/Keychains/meditationjournal-build.keychain-db"
KEYCHAIN_PASSWORD="meditationjournal-tmp"

ORIGINAL_KEYCHAINS=$(security list-keychains -d user | xargs)
STEP=0
TOTAL=8

> "$LOG"

cleanup() {
  security list-keychains -d user -s $ORIGINAL_KEYCHAINS 2>/dev/null || true
  security delete-keychain "$KEYCHAIN_PATH" 2>/dev/null || true
  rm -f "$EXPORT_OPTIONS" "$DECODED_PROFILE" "$UUID_FILE" "$WIDGET_UUID_FILE"
  if [ -f "$PBXPROJ_BACKUP" ]; then
    cp "$PBXPROJ_BACKUP" "$PBXPROJ"
    rm -f "$PBXPROJ_BACKUP"
  fi
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
  mkdir -p ~/Library/MobileDevice/Provisioning\ Profiles

  # Main app profile
  security cms -D -i "$PROFILE_PATH" -o "$DECODED_PROFILE"
  /usr/libexec/PlistBuddy -c 'Print :UUID' "$DECODED_PROFILE" > "$UUID_FILE"
  rm -f "$DECODED_PROFILE"
  cp "$PROFILE_PATH" ~/Library/MobileDevice/Provisioning\ Profiles/"$(cat "$UUID_FILE").mobileprovision"

  # Widget extension profile
  security cms -D -i "$WIDGET_PROFILE_PATH" -o "$DECODED_PROFILE"
  /usr/libexec/PlistBuddy -c 'Print :UUID' "$DECODED_PROFILE" > "$WIDGET_UUID_FILE"
  rm -f "$DECODED_PROFILE"
  cp "$WIDGET_PROFILE_PATH" ~/Library/MobileDevice/Provisioning\ Profiles/"$(cat "$WIDGET_UUID_FILE").mobileprovision"
}

step_bump_build() {
  set -e
  CURRENT=$(/usr/libexec/PlistBuddy -c 'Print :CFBundleVersion' "$INFO_PLIST")
  NEXT=$((CURRENT + 1))
  /usr/libexec/PlistBuddy -c "Set :CFBundleVersion $NEXT" "$INFO_PLIST"
  echo "Build number: $CURRENT → $NEXT"
}

step_patch_project() {
  set -e
  cp "$PBXPROJ" "$PBXPROJ_BACKUP"
  PROFILE_UUID=$(cat "$UUID_FILE")
  WIDGET_UUID=$(cat "$WIDGET_UUID_FILE")
  # Patch Release XCBuildConfiguration blocks: Manual signing + per-target profile UUIDs.
  # Backup is restored by cleanup() on EXIT regardless of success or failure.
  python3 - "$PBXPROJ" \
    "$MAIN_CONFIG_ID" "$PROFILE_UUID" \
    "$WIDGET_CONFIG_ID" "$WIDGET_UUID" << 'PYEOF'
import sys, re

path = sys.argv[1]
patches = {}
for i in range(2, len(sys.argv), 2):
    patches[sys.argv[i]] = sys.argv[i + 1]

with open(path, 'r') as f:
    content = f.read()

for cid, uuid in patches.items():
    marker = cid + ' /* Release */'
    start = content.find(marker)
    if start == -1:
        sys.exit(f'ERROR: Config block {cid} not found in project.pbxproj')
    depth, i, end = 0, start, -1
    while i < len(content):
        if content[i] == '{':
            depth += 1
        elif content[i] == '}':
            depth -= 1
            if depth == 0:
                end = i + 1
                break
        i += 1
    if end == -1:
        sys.exit(f'ERROR: Could not find end of block {cid}')
    block = content[start:end]
    block = block.replace('CODE_SIGN_IDENTITY = "Apple Development";',
                          'CODE_SIGN_IDENTITY = "Apple Distribution";')
    block = block.replace('CODE_SIGN_STYLE = Automatic;', 'CODE_SIGN_STYLE = Manual;')
    if 'PROVISIONING_PROFILE =' not in block:
        if 'PROVISIONING_PROFILE_SPECIFIER' in block:
            block = block.replace(
                '\t\t\t\tPROVISIONING_PROFILE_SPECIFIER',
                f'\t\t\t\tPROVISIONING_PROFILE = "{uuid}";\n\t\t\t\tPROVISIONING_PROFILE_SPECIFIER')
        else:
            block = block.replace(
                '\t\t\t\tPRODUCT_NAME =',
                f'\t\t\t\tPROVISIONING_PROFILE = "{uuid}";\n\t\t\t\tPRODUCT_NAME =')
    else:
        block = re.sub(r'PROVISIONING_PROFILE = "[^"]*";',
                       f'PROVISIONING_PROFILE = "{uuid}";', block)
    content = content[:start] + block + content[end:]

with open(path, 'w') as f:
    f.write(content)
print(f'Patched {len(patches)} Release config(s) for manual signing')
PYEOF
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
  rm -rf "$ARCHIVE_PATH"
  xcodebuild archive \
    -workspace "$WORKSPACE" \
    -scheme "$SCHEME" \
    -configuration Release \
    -archivePath "$ARCHIVE_PATH" \
    -destination "generic/platform=iOS" \
    CODE_SIGN_STYLE=Manual \
    "CODE_SIGN_IDENTITY=$SIGNING_IDENTITY" \
    DEVELOPMENT_TEAM=5469PA59T3 \
    "OTHER_CODE_SIGN_FLAGS=--keychain $KEYCHAIN_PATH"
}

step_export() {
  set -e
  PROFILE_UUID=$(cat "$UUID_FILE")
  WIDGET_PROFILE_UUID=$(cat "$WIDGET_UUID_FILE")
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
    <key>$WIDGET_BUNDLE_ID</key>
    <string>$WIDGET_PROFILE_UUID</string>
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
run_step "Patching project for signing   " step_patch_project
run_step "Pre-extracting RN prebuilt libs" step_preextract
run_step "Xcode archive (Release)        " step_archive
run_step "Exporting IPA                  " step_export
run_step "Uploading to App Store Connect " step_submit

echo ""
echo "✓ Done! Check App Store Connect → Meditation Journal → TestFlight."
echo ""
