require('dotenv').config();

if (!process.env.AWS_ACCESS_KEY_ID || !process.env.POSTGRES_URI || !process.env.FIREBASE_BASE64) {
    console.error("❌ Missing required environment variables");
    process.exit(1);
}

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, ScanCommand } = require("@aws-sdk/lib-dynamodb");
const { Client } = require('pg');
const admin = require('firebase-admin');
const { logNotificationSent } = require('./analytics');

// Setup AWS
const client = new DynamoDBClient({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});
const dynamoDb = DynamoDBDocumentClient.from(client);

// Setup Supabase
const pgClient = new Client({
    connectionString: process.env.POSTGRES_URI,
    ssl: { rejectUnauthorized: false }
});

// Setup Firebase
const serviceAccount = JSON.parse(Buffer.from(process.env.FIREBASE_BASE64, 'base64').toString('utf8'));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

async function main() {
    try {
        await pgClient.connect();

        const dateThreshold = new Date();
        dateThreshold.setMonth(dateThreshold.getMonth() - 1);
        const isoThreshold = dateThreshold.toISOString();
        console.log(`🔎 Scanning for locks with last check before: ${isoThreshold}`);

        const scanParams = {
            TableName: "locks",
            FilterExpression: "last_battery_check < :threshold",
            ExpressionAttributeValues: { ":threshold": isoThreshold }
        };

        const dynamoResult = await dynamoDb.send(new ScanCommand(scanParams));
        const staleLocks = dynamoResult.Items || [];
        console.log(`📦 Found ${staleLocks.length} stale locks`);

        if (staleLocks.length === 0) {
            console.log("⚠️ No stale locks found");
            return;
        }

        const staleLockIds = staleLocks.map(item => item.locks_id);
        const query = `
            SELECT user_id, fcm_id, lock_id 
            FROM lock_user_mapping 
            WHERE lock_id = ANY($1::text[])
        `;
        const pgResult = await pgClient.query(query, [staleLockIds]);
        const targets = pgResult.rows;
        console.log(`👥 Found ${targets.length} users to notify`);

        if (targets.length === 0) {
            console.log("⚠️ No users assigned to stale locks");
            return;
        }
        
        let successCount = 0;
        let failCount = 0;
        
        const campaignId = 'battery_low_alert';
        
        for (const target of targets) {
            try {
                const message = {
                    token: target.fcm_id,
                    notification: {
                        title: "🔋 Battery Alert",
                        body: `Lock ${target.lock_id} battery needs attention!`
                    },
                    data: {
                        campaign_id: campaignId,
                        lock_id: target.lock_id,
                        user_id: target.user_id,
                        timestamp: new Date().toISOString()
                    }
                };
                
                const response = await admin.messaging().send(message);
                console.log(`✅ Sent to ${target.user_id} (Lock: ${target.lock_id}):`, response);
                
                // Log analytics
                await logNotificationSent(
                    campaignId, 
                    target.user_id, 
                    target.lock_id, 
                    response,
                    { lock_id: target.lock_id }
                );
                
                successCount++;
            } catch (error) {
                console.error(`❌ Failed to send to ${target.user_id}:`, error.message);
                failCount++;
            }
        }
        
        console.log(`\n📊 Summary: ${successCount} sent, ${failCount} failed`);

    } catch (err) {
        console.error("❌ Error:", err.message);
    } finally {
        await pgClient.end();
    }
}

main();