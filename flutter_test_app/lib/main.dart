import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;

// Constants - Configure these for your environment
// TODO: Replace these values with your own configuration
const String SUPABASE_URL = "YOUR_SUPABASE_URL"; // e.g., https://xxxxx.supabase.co

// Backend API URL - Update with your server URL
const String API_BASE_URL = "YOUR_API_BASE_URL"; // e.g., http://192.168.1.100:3000

// Supabase Anon Key - Get from Supabase Dashboard:
// Settings → API → Project API keys → anon/public key
const String SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";

// Test configuration
const String TEST_USER_ID = "tester_01";
const String TEST_LOCK_ID = "L1";

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Initialize Firebase
  await Firebase.initializeApp();
  
  // Initialize Supabase
  await Supabase.initialize(
    url: SUPABASE_URL,
    anonKey: SUPABASE_ANON_KEY,
  );
  
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Lock Tester',
      theme: ThemeData(
        primarySwatch: Colors.blue,
        useMaterial3: true,
      ),
      home: const NotificationTestScreen(),
    );
  }
}

class NotificationTestScreen extends StatefulWidget {
  const NotificationTestScreen({super.key});

  @override
  State<NotificationTestScreen> createState() => _NotificationTestScreenState();
}

class _NotificationTestScreenState extends State<NotificationTestScreen> {
  String _status = "Initializing...";
  String _fcmToken = "Fetching token...";
  final FirebaseMessaging _messaging = FirebaseMessaging.instance;

  @override
  void initState() {
    super.initState();
    _initializeNotifications();
  }

  Future<void> _initializeNotifications() async {
    try {
      // Request notification permissions
      NotificationSettings settings = await _messaging.requestPermission(
        alert: true,
        badge: true,
        sound: true,
      );

      if (settings.authorizationStatus == AuthorizationStatus.authorized) {
        // Get FCM Token
        String? token = await _messaging.getToken();
        
        if (token != null) {
          setState(() {
            _fcmToken = token;
          });

          // Upsert token to Supabase
          await _upsertTokenToSupabase(token);

          setState(() {
            _status = "Registered";
          });
        } else {
          setState(() {
            _status = "Failed: No token received";
          });
        }
      } else {
        setState(() {
          _status = "Failed: Permission denied";
        });
      }

      // Setup notification click listener
      _setupNotificationListeners();

    } catch (e) {
      setState(() {
        _status = "Failed: $e";
      });
    }
  }

  Future<void> _upsertTokenToSupabase(String token) async {
    try {
      final supabase = Supabase.instance.client;
      
      await supabase.from('lock_user_mapping').upsert({
        'user_id': TEST_USER_ID,
        'lock_id': TEST_LOCK_ID,
        'fcm_id': token,
      }, onConflict: 'user_id');
      
    } catch (e) {
      print('Error upserting to Supabase: $e');
      setState(() {
        _status = "Registered (Supabase sync failed: $e)";
      });
    }
  }

  void _setupNotificationListeners() {
    // Handle notification when app is opened from terminated state
    FirebaseMessaging.instance.getInitialMessage().then((RemoteMessage? message) {
      if (message != null) {
        _handleNotificationClick(message.data);
      }
    });

    // Handle notification when app is in background and user taps on it
    FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
      _handleNotificationClick(message.data);
    });

    // Handle notification when app is in foreground
    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      print('Got a message in foreground!');
      print('Message data: ${message.data}');
      
      if (message.notification != null) {
        print('Message also contained a notification: ${message.notification}');
        // Show a simple snackbar for foreground notifications
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(message.notification?.title ?? 'New notification'),
            duration: const Duration(seconds: 3),
          ),
        );
      }
    });
  }

  Future<void> _updateBatteryCheck(String lockId, String userId, String campaignId) async {
    try {
      print('🔄 Updating battery check for lock: $lockId');
      
      final response = await http.post(
        Uri.parse('$API_BASE_URL/api/battery-checked'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode({
          'lock_id': lockId,
          'user_id': userId,
          'campaign_id': campaignId,
        }),
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        print('✅ Battery check updated: ${data['updated_at']}');
      } else {
        print('❌ Failed to update battery check: ${response.statusCode}');
      }
    } catch (e) {
      print('❌ Error calling API: $e');
    }
  }

  void _handleNotificationClick(Map<String, dynamic> data) {
    String campaignId = data['campaign_id'] ?? 'Not provided';
    String lockId = data['lock_id'] ?? '';
    String userId = data['user_id'] ?? '';
    
    // Update battery check in backend
    if (lockId.isNotEmpty) {
      _updateBatteryCheck(lockId, userId, campaignId);
    }
    
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          title: const Text('Notification Clicked'),
          content: SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text('Campaign ID: $campaignId', 
                  style: const TextStyle(fontWeight: FontWeight.bold)),
                const SizedBox(height: 16),
                const Text('Full Payload:', 
                  style: TextStyle(fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                Text(data.toString()),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Close'),
            ),
          ],
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Lock Notification Tester'),
        backgroundColor: Theme.of(context).colorScheme.inversePrimary,
      ),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              // Status Icon
              Icon(
                _status.startsWith("Registered") 
                  ? Icons.check_circle 
                  : _status.startsWith("Failed") 
                    ? Icons.error 
                    : Icons.hourglass_empty,
                size: 64,
                color: _status.startsWith("Registered")
                    ? Colors.green
                    : _status.startsWith("Failed")
                        ? Colors.red
                        : Colors.orange,
              ),
              const SizedBox(height: 24),
              
              // Status Text
              Text(
                'Status: $_status',
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 32),
              
              // FCM Token Container
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.grey[100],
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.grey[300]!),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'FCM Token:',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 8),
                    SelectableText(
                      _fcmToken,
                      style: const TextStyle(
                        fontSize: 12,
                        fontFamily: 'monospace',
                      ),
                    ),
                    const SizedBox(height: 8),
                    ElevatedButton.icon(
                      onPressed: () {
                        Clipboard.setData(ClipboardData(text: _fcmToken));
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text('Token copied to clipboard!'),
                            duration: Duration(seconds: 2),
                          ),
                        );
                      },
                      icon: const Icon(Icons.copy, size: 16),
                      label: const Text('Copy Token'),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),
              
              // Info Text
              Text(
                'User: $TEST_USER_ID\nLock: $TEST_LOCK_ID',
                style: TextStyle(
                  fontSize: 14,
                  color: Colors.grey[600],
                ),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
