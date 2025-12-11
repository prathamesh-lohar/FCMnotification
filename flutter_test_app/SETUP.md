# Flutter Test App Configuration

## Quick Setup

1. **Update `lib/main.dart` with your configuration:**

```dart
const String SUPABASE_URL = "https://your-project.supabase.co";
const String SUPABASE_ANON_KEY = "your_anon_key_here";
const String API_BASE_URL = "http://your-server-ip:3000";
```

2. **Add Firebase configuration:**
   - Download `google-services.json` from Firebase Console
   - Place in `android/app/google-services.json`

3. **Install dependencies:**
```bash
flutter pub get
```

4. **Run the app:**
```bash
flutter run
```

## Configuration Details

### SUPABASE_URL
Get from: Supabase Dashboard → Settings → API → Project URL

### SUPABASE_ANON_KEY
Get from: Supabase Dashboard → Settings → API → Project API keys → anon public

### API_BASE_URL
Your backend server address (the machine running `api-server.js`)
- Format: `http://IP_ADDRESS:3000`
- Example: `http://192.168.1.100:3000`
- For local testing: Use your Mac/PC's local network IP

### TEST_USER_ID & TEST_LOCK_ID
Match these with data in your Supabase `lock_user_mapping` table

## Features

- Auto-registers FCM token to Supabase on launch
- Handles notifications in all app states (foreground/background/terminated)
- Calls backend API on notification click
- Updates DynamoDB battery check timestamp
- Displays FCM token for testing

## Security Note

⚠️ The anon key is safe to use in client apps but ensure you:
- Enable Row Level Security (RLS) in Supabase
- Set proper permissions on tables
- Never commit actual credentials to public repos
