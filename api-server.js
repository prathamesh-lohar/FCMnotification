// API Server for handling notification responses
require('dotenv').config();
const express = require('express');
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const { logNotificationClicked } = require('./analytics');

const app = express();
app.use(express.json());

// Setup AWS
const client = new DynamoDBClient({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});
const dynamoDb = DynamoDBDocumentClient.from(client);

// Endpoint to update battery check
app.post('/api/battery-checked', async (req, res) => {
    try {
        const { lock_id, user_id, campaign_id } = req.body;

        if (!lock_id) {
            return res.status(400).json({ error: 'lock_id is required' });
        }

        console.log(`🔄 Battery check: lock=${lock_id}, user=${user_id}, campaign=${campaign_id}`);

        const updateParams = {
            TableName: 'locks',
            Key: { locks_id: lock_id },
            UpdateExpression: 'SET last_battery_check = :timestamp',
            ExpressionAttributeValues: {
                ':timestamp': new Date().toISOString()
            },
            ReturnValues: 'ALL_NEW'
        };

        const result = await dynamoDb.send(new UpdateCommand(updateParams));
        
        if (campaign_id && user_id && lock_id) {
            await logNotificationClicked(campaign_id, user_id, lock_id);
        }
        
        res.json({
            success: true,
            message: 'Battery check updated',
            lock_id: lock_id,
            updated_at: result.Attributes.last_battery_check
        });

    } catch (error) {
        console.error('❌ Error:', error.message);
        res.status(500).json({ 
            error: 'Failed to update battery check',
            details: error.message 
        });
    }
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 API Server running on port ${PORT}`);
});
