# Mobile App Development Guide

This document explains how to build and run the OpenRouter Chat app on iOS and Android using Apache Cordova.

## Prerequisites

### For Android Development
- Java JDK 17 or later
- Android Studio with Android SDK
- Set `ANDROID_HOME` environment variable
- Add Android SDK tools to your `PATH`

### For iOS Development
- macOS with Xcode installed
- Xcode Command Line Tools
- CocoaPods (`sudo gem install cocoapods`)
- Valid Apple Developer account (for device testing)

## Project Structure

```
/
├── www/                    # Cordova web app files
│   ├── index.html         # Main HTML file (mobile-optimized)
│   ├── css/
│   │   └── style.css      # Mobile-responsive styles
│   └── js/
│       ├── app.js         # Main app with Cordova support
│       ├── api.js         # OpenRouter API client
│       ├── chat.js        # Chat management
│       ├── models.js      # Model handling
│       └── storage.js     # LocalStorage management
├── config.xml             # Cordova configuration
├── res/                   # App icons and splash screens
├── platforms/             # Generated platform projects (gitignored)
└── plugins/               # Cordova plugins (gitignored)
```

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Add Platforms (if not already added)

```bash
npx cordova platform add ios android
```

### 3. Build for Development

```bash
# Build all platforms
npm run cordova:build

# Build specific platform
npm run cordova:build:android
npm run cordova:build:ios
```

### 4. Run on Device/Emulator

```bash
# Run on Android device/emulator
npm run cordova:run:android

# Run on iOS simulator
npm run cordova:emulate:ios

# Run on iOS device
npm run cordova:run:ios
```

## Available NPM Scripts

| Script | Description |
|--------|-------------|
| `npm run cordova:prepare` | Prepare platforms for build |
| `npm run cordova:build` | Build all platforms |
| `npm run cordova:build:ios` | Build iOS app |
| `npm run cordova:build:android` | Build Android app |
| `npm run cordova:run:ios` | Run on iOS device |
| `npm run cordova:run:android` | Run on Android device |
| `npm run cordova:emulate:ios` | Run on iOS simulator |
| `npm run cordova:emulate:android` | Run on Android emulator |
| `npm run android:debug` | Build Android debug APK |
| `npm run android:release` | Build Android release APK |
| `npm run ios:debug` | Build iOS debug |
| `npm run ios:release` | Build iOS release |

## Building for Release

### Android Release APK

1. Create a keystore (first time only):
```bash
keytool -genkey -v -keystore release-key.keystore -alias openrouter-chat -keyalg RSA -keysize 2048 -validity 10000
```

2. Build release APK:
```bash
npm run android:release -- -- --keystore=release-key.keystore --storePassword=YOUR_STORE_PASSWORD --alias=openrouter-chat --password=YOUR_KEY_PASSWORD
```

3. Find the APK at:
```
platforms/android/app/build/outputs/apk/release/app-release.apk
```

### iOS Release (App Store)

1. Open the Xcode project:
```bash
open platforms/ios/OpenRouter\ Chat.xcworkspace
```

2. Configure signing in Xcode:
   - Select your team in Signing & Capabilities
   - Set bundle identifier (com.openrouter.chat)

3. Archive and upload via Xcode

## App Configuration

### config.xml Settings

Key configuration options in `config.xml`:

```xml
<!-- App identifier and version -->
<widget id="com.openrouter.chat" version="1.0.0">

<!-- iOS deployment target -->
<preference name="deployment-target" value="13.0" />

<!-- Android SDK versions -->
<preference name="android-minSdkVersion" value="24" />
<preference name="android-targetSdkVersion" value="34" />
```

### Customizing Icons

Replace the SVG icon at `res/icon/icon.svg` with your app icon.

For production builds, generate platform-specific icon sizes:
- Use tools like [cordova-res](https://github.com/ionic-team/cordova-res)
- Or generate manually and add to config.xml

## Cordova Plugins

Installed plugins:
- `cordova-plugin-statusbar` - Control status bar appearance
- `cordova-plugin-splashscreen` - Splash screen support

To add more plugins:
```bash
npx cordova plugin add <plugin-name>
```

## Mobile-Specific Features

The mobile version includes:
- Safe area support for notched devices (iPhone X+)
- Proper keyboard handling
- Touch-optimized UI with 44px minimum touch targets
- Overscroll bounce prevention
- Android back button handling
- Light/dark mode support (follows system preference)

## Troubleshooting

### "cordova: command not found"
Use `npx cordova` instead of `cordova` directly.

### iOS build fails with signing errors
Ensure you have a valid Apple Developer account and signing certificates configured in Xcode.

### Android SDK not found
Set the `ANDROID_HOME` environment variable:
```bash
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/tools:$ANDROID_HOME/platform-tools
```

### WebView issues
The app uses WKWebView on iOS (default) and modern WebView on Android. Ensure your target SDK versions support the JavaScript features used.

## Testing the Web Version

You can test the mobile web app without building native apps:

```bash
# Serve the www directory
npm run serve:www
```

Then open `http://localhost:3000` in a mobile browser or browser dev tools mobile emulator.

## Development Workflow

1. Make changes to files in `www/`
2. Test in browser with `npm run serve:www`
3. Build and test on device/emulator
4. Run tests: `npm test`

## Support

- [Apache Cordova Documentation](https://cordova.apache.org/docs/en/latest/)
- [OpenRouter API Documentation](https://openrouter.ai/docs)
