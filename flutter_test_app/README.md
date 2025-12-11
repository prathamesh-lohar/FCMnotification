# Lock Notification Tester

A Flutter test app to verify backend FCM notifications with Supabase integration.

## Features

✅ **All code in single main.dart file**
- Firebase initialization
- Supabase integration
- Auto-registration of FCM tokens
- Notification click handling
- Simple UI with status display

## Setup Instructions

### 1. Prerequisites
- Flutter SDK installed
- Android Studio or VS Code with Flutter extensions
- Firebase project created
- Supabase project created

### 2. Firebase Configuration

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to Project Settings > General
4. Under "Your apps", add an Android app
5. Package name: `com.example.lock_tester`
6. Download `google-services.json`
7. Place it in: `flutter_test_app/android/app/google-services.json`

### 3. Update Constants in main.dart

Open `lib/main.dart` and update these constants:

```dart
const String SUPABASE_URL = "YOUR_SUPABASE_URL";
const String SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";
const String TEST_USER_ID = "tester_01";  // Your test user ID
const String TEST_LOCK_ID = "L1";          // Your test lock ID
```

### 4. Supabase Table Setup

Create a table in Supabase with this schema:

```sql
CREATE TABLE lock_user_mapping (
  user_id TEXT PRIMARY KEY,
  lock_id TEXT NOT NULL,
  fcm_id TEXT NOT NULL
);
```

### 5. Install Dependencies

```bash
cd flutter_test_app
flutter pub get
```

### 6. Run the App

```bash
flutter run
```

Or run from VS Code/Android Studio.

## How It Works

### Auto-Registration
When the app launches:
1. Initializes Firebase and Supabase
2. Requests notification permissions
3. Fetches the FCM token
4. Upserts the token to Supabase `lock_user_mapping` table
5. Shows "Status: Registered" on success

### Notification Handling
- **Foreground**: Shows a snackbar
- **Background**: Tap opens the app and shows an AlertDialog with campaign_id
- **Terminated**: Tap opens the app and shows an AlertDialog with campaign_id

### UI Elements
- Status indicator (icon + text)
- FCM Token display (selectable text)
- Copy button for quick token copying
- User ID and Lock ID display

## Testing Flow

1. **Launch App**: Wait for "Status: Registered"
2. **Copy Token**: Use the copy button to get your FCM token
3. **Send Notification**: Run your backend script with this token
4. **Verify**: 
   - App in foreground → See snackbar
   - App in background → Tap notification → See AlertDialog with campaign_id
   - App closed → Tap notification → App opens → See AlertDialog

## Troubleshooting

### "Failed: Permission denied"
- Check device notification settings
- Try restarting the app

### "Failed: No token received"
- Ensure `google-services.json` is properly placed
- Check Firebase configuration
- Verify internet connection

### "Registered (Supabase sync failed)"
- Check Supabase URL and anon key
- Verify table exists with correct schema
- Check Supabase RLS policies (disable for testing)

### Build Errors
```bash
# Clean and rebuild
flutter clean
flutter pub get
flutter run
```

## Project Structure

```
flutter_test_app/
├── lib/
│   └── main.dart          # ALL code here (single file)
├── android/
│   ├── app/
│   │   ├── build.gradle
│   │   ├── google-services.json  # Add this file
│   │   └── src/main/
│   │       ├── AndroidManifest.xml
│   │       └── kotlin/.../MainActivity.kt
│   ├── build.gradle
│   └── gradle.properties
└── pubspec.yaml
```

## Dependencies

- `firebase_core: ^3.0.0`
- `firebase_messaging: ^15.0.0`
- `supabase_flutter: ^2.0.0`

## Notes

- This is a **throwaway test app** for quick verification
- Not production-ready (hardcoded credentials, no error recovery)
- For testing backend notification integration only
- Token automatically re-registers on each app launch
