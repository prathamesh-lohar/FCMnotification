# 🔥 Firebase Setup Required

## You need to add `google-services.json` to this directory!

### Steps to get your `google-services.json`:

1. **Go to Firebase Console**: https://console.firebase.google.com/

2. **Select your project** (or create one if you haven't)

3. **Add an Android app** (if not already added):
   - Click the gear icon ⚙️ → Project settings
   - Scroll down to "Your apps" section
   - Click "Add app" → Select Android icon
   - Enter package name: `com.example.lock_tester`
   - Click "Register app"

4. **Download google-services.json**:
   - After registering, click "Download google-services.json"
   - Or go to Project Settings → Your apps → Click on your Android app → Download google-services.json

5. **Place the file here**:
   ```
   flutter_test_app/android/app/google-services.json
   ```

6. **Run the app again**:
   ```bash
   cd flutter_test_app
   flutter run
   ```

---

## Quick Verification

After placing the file, verify with:
```bash
ls -la android/app/google-services.json
```

You should see the file listed!
