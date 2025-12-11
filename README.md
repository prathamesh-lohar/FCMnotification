# Lock Battery Notification System

Campaign-based notification system for monitoring smart lock battery status with analytics tracking.

## Screenshots

### Notification Examples

**Notification Received**

<img src="ScreenShots/Notiificaion.png" width="300" alt="Notification">

**Notification Opened**

<img src="ScreenShots/opened notification.png" width="300" alt="Opened Notification">

### Campaign Analytics Tracking

![Campaign Tracking](ScreenShots/campain_tracking.png)

*Real-time campaign analytics with click tracking*

---

## Architecture

- **DynamoDB**: Stores lock data with `last_battery_check` timestamps
- **Supabase**: User mappings, FCM tokens, and campaign analytics
- **Firebase**: FCM notification delivery
- **Flutter App**: Mobile notification handler with auto-registration

## Components

### Backend Scripts

**index.js** - Main notification sender
- Scans DynamoDB for locks with stale battery checks (>1 month)
- Queries Supabase for user mappings
- Sends FCM notifications with campaign tracking
- Logs analytics for each sent notification

**api-server.js** - Express API server
- `POST /api/battery-checked`: Updates DynamoDB and logs click analytics
- `GET /health`: Health check endpoint

**analytics.js** - Campaign analytics module
- `logNotificationSent()`: Records notification sent events
- `logNotificationClicked()`: Marks notifications as clicked
- `getCampaignStats()`: Retrieves campaign metrics
- `getAllCampaignsSummary()`: Overview of all campaigns

**dashboard.js** - Analytics dashboard CLI
- `node dashboard.js`: Shows all campaigns summary
- `node dashboard.js [campaign_name]`: Campaign-specific stats
- `node dashboard.js user [user_id]`: User engagement metrics

### Flutter App

Located in `flutter_test_app/` - Single-file test app for FCM verification

Features:
- Auto-registers FCM token to Supabase on launch
- Handles notifications in all app states (foreground/background/terminated)
- Calls API on notification click to update battery check
- Displays FCM token for testing

## Setup

### 1. Environment Variables

Create `.env` file in the root directory:
\`\`\`env
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1
POSTGRES_URI=postgresql://user:password@host:port/database?sslmode=require
FIREBASE_BASE64=base64_encoded_firebase_service_account_json
\`\`\`

**Getting credentials:**
- **AWS**: IAM Console → Create user with DynamoDB access
- **Supabase**: Dashboard → Settings → Database → Connection string
- **Firebase**: Project Settings → Service accounts → Generate new private key → Base64 encode the JSON

### 2. Install Dependencies

\`\`\`bash
npm install
\`\`\`

### 3. Flutter App Setup

**⚠️ Security Note**: The Flutter app contains hardcoded credentials in `main.dart` for testing. For production:
- Remove hardcoded `SUPABASE_ANON_KEY` and use environment variables
- Enable Row Level Security (RLS) in Supabase
- See `SECURITY.md` for detailed recommendations

\`\`\`bash
cd flutter_test_app
flutter pub get
\`\`\`

**Add Firebase config:**
- Download `google-services.json` from Firebase Console
- Place in `flutter_test_app/android/app/`

**Update configuration in `main.dart`:**
\`\`\`dart
const String SUPABASE_URL = "your_supabase_url";
const String SUPABASE_ANON_KEY = "your_anon_key";
const String API_BASE_URL = "http://your_server_ip:3000";
const String TEST_USER_ID = "your_test_user";
const String TEST_LOCK_ID = "your_test_lock";
\`\`\`

**Run the app:**
\`\`\`bash
flutter run
\`\`\`

## Usage

### Send Notifications

\`\`\`bash
node index.js
\`\`\`

Scans for stale locks and sends notifications to assigned users.

### Run API Server

\`\`\`bash
node api-server.js
\`\`\`

Starts server on port 3000 to handle notification responses.

### View Analytics

\`\`\`bash
# All campaigns
node dashboard.js

# Specific campaign
node dashboard.js battery_low_alert

# User stats
node dashboard.js user tester_01
\`\`\`

## Database Schema

### DynamoDB - locks table
- `locks_id` (Primary Key)
- `last_battery_check` (ISO timestamp)

### Supabase - lock_user_mapping
- `user_id`
- `lock_id`
- `fcm_id`

### Supabase - campaign_analytics
- `id` (Primary Key)
- `user_id`
- `lock_id`
- `campaign_name`
- `event_type` ('sent')
- `sent_at` (timestamp)
- `batch_id` (FCM message ID)
- `clicked` (boolean)

## Campaign Flow

1. **Send**: `index.js` detects stale locks → sends FCM → logs to analytics with `clicked=false`
2. **Click**: User taps notification → Flutter app calls API → API updates DynamoDB and sets `clicked=true`
3. **Analytics**: Dashboard queries for CTR (Click-Through Rate) and engagement metrics

## Notes

- Campaign ID: `battery_low_alert`
- API runs on port 3000 (configure in Flutter app's `API_BASE_URL`)
- Uses boolean `clicked` column for tracking (not separate event rows)
- Notifications include data payload: `campaign_id`, `lock_id`, `user_id`, `timestamp`

## Security

⚠️ **Important**: Review `SECURITY.md` before deploying or committing to public repositories.

**Current Status:**
- ✅ Backend: All credentials in `.env` (properly ignored by git)
- ⚠️ Flutter: Contains hardcoded Supabase credentials (test app only)
- ✅ `.gitignore`: Configured to exclude sensitive files

**Best Practices:**
- Never commit `.env` files
- Use environment variables or build-time configuration for Flutter
- Enable Row Level Security (RLS) in Supabase
- Rotate keys if accidentally exposed

## Project Structure

```
lock-checker/
├── index.js              # Notification sender
├── api-server.js         # API endpoint for clicks
├── analytics.js          # Analytics tracking
├── dashboard.js          # Analytics dashboard
├── package.json          # Node dependencies
├── .env                  # Environment variables (not in git)
├── .gitignore           # Git ignore rules
├── README.md            # This file
├── SECURITY.md          # Security documentation
└── flutter_test_app/    # Flutter mobile app
    ├── lib/main.dart    # Single-file app
    ├── pubspec.yaml     # Flutter dependencies
    ├── android/         # Android configuration
    └── .gitignore       # Flutter git ignore
```

## Troubleshooting

**Notifications not received:**
- Check FCM token is registered in Supabase
- Verify Firebase service account has messaging permissions
- Check device has internet and notifications enabled

**API connection failed:**
- Ensure API server is running on correct port
- Update `API_BASE_URL` in Flutter app with correct IP
- Check firewall allows connections on port 3000

**Analytics showing clicked=false:**
- Verify API server is receiving requests (check logs)
- Ensure campaign_id, user_id, lock_id match sent notification
- Check Supabase has matching 'sent' record with clicked=false

**DynamoDB access denied:**
- Verify AWS credentials in `.env`
- Check IAM user has DynamoDB read/write permissions
- Confirm table name is 'locks' with key 'locks_id'
