// Campaign Analytics System
require('dotenv').config();
const { Client } = require('pg');

// Setup Supabase PostgreSQL connection
const pgClient = new Client({
    connectionString: process.env.POSTGRES_URI,
    ssl: { rejectUnauthorized: false }
});

// Connect to database
async function connectDB() {
    if (pgClient._connected) return;
    await pgClient.connect();
    pgClient._connected = true;
}

// Log notification sent
async function logNotificationSent(campaignId, userId, lockId, fcmMessageId, metadata = {}) {
    try {
        await connectDB();
        
        const query = `
            INSERT INTO campaign_analytics 
            (user_id, lock_id, campaign_name, event_type, sent_at, batch_id, clicked)
            VALUES ($1, $2, $3, 'sent', NOW(), $4, false)
        `;
        await pgClient.query(query, [userId, lockId, campaignId, fcmMessageId]);
    } catch (error) {
        console.error('❌ Analytics error:', error.message);
    }
}

// Update notification as clicked
async function logNotificationClicked(campaignId, userId, lockId, metadata = {}) {
    try {
        await connectDB();
        
        const query = `
            UPDATE campaign_analytics 
            SET clicked = true
            WHERE id = (
                SELECT id 
                FROM campaign_analytics 
                WHERE user_id = $1 
                AND lock_id = $2 
                AND campaign_name = $3
                AND event_type = 'sent'
                AND clicked = false
                ORDER BY sent_at DESC
                LIMIT 1
            )
        `;
        const result = await pgClient.query(query, [userId, lockId, campaignId]);
        
        if (result.rowCount > 0) {
            console.log(`✅ Clicked: ${userId}`);
        } else {
            console.log(`⚠️ No sent notification found to mark as clicked`);
        }
    } catch (error) {
        console.error('❌ Analytics error:', error.message);
    }
}

// Get campaign statistics
async function getCampaignStats(campaignId) {
    try {
        await connectDB();
        
        const query = `
            SELECT 
                campaign_name as campaign_id,
                COUNT(*) as sent_count,
                COUNT(*) FILTER (WHERE clicked = true) as clicked_count,
                COUNT(DISTINCT user_id) as unique_users_sent,
                COUNT(DISTINCT user_id) FILTER (WHERE clicked = true) as unique_users_clicked,
                MIN(sent_at) as first_sent,
                MAX(sent_at) FILTER (WHERE clicked = true) as last_clicked,
                CASE 
                    WHEN COUNT(*) > 0 
                    THEN ROUND((COUNT(*) FILTER (WHERE clicked = true)::numeric / COUNT(*)::numeric * 100), 2)
                    ELSE 0 
                END as click_through_rate,
                CASE 
                    WHEN COUNT(DISTINCT user_id) > 0 
                    THEN ROUND((COUNT(DISTINCT user_id) FILTER (WHERE clicked = true)::numeric / COUNT(DISTINCT user_id)::numeric * 100), 2)
                    ELSE 0 
                END as user_engagement_rate
            FROM campaign_analytics
            WHERE campaign_name = $1 AND event_type = 'sent'
            GROUP BY campaign_name
        `;
        
        const result = await pgClient.query(query, [campaignId]);
        return result.rows[0] || null;
    } catch (error) {
        console.error('Error getting campaign stats:', error.message);
        return null;
    }
}

// Get all campaigns summary
async function getAllCampaignsSummary() {
    try {
        await connectDB();
        
        const query = `
            SELECT 
                campaign_name,
                COUNT(*) as sent_count,
                COUNT(*) FILTER (WHERE clicked = true) as clicked_count,
                COUNT(DISTINCT user_id) as unique_users,
                MIN(sent_at) as first_activity,
                MAX(sent_at) as last_activity,
                CASE 
                    WHEN COUNT(*) > 0 
                    THEN ROUND((COUNT(*) FILTER (WHERE clicked = true)::numeric / COUNT(*)::numeric * 100), 2)
                    ELSE 0 
                END as ctr_percent
            FROM campaign_analytics
            WHERE event_type = 'sent'
            GROUP BY campaign_name
            ORDER BY last_activity DESC
        `;
        
        const result = await pgClient.query(query);
        return result.rows;
    } catch (error) {
        console.error('Error getting campaigns summary:', error.message);
        return [];
    }
}

// Get detailed user engagement
async function getUserEngagement(userId) {
    try {
        await connectDB();
        
        const query = `
            SELECT 
                campaign_name,
                lock_id,
                event_type,
                sent_at,
                batch_id
            FROM campaign_analytics
            WHERE user_id = $1
            ORDER BY sent_at DESC
        `;
        
        const result = await pgClient.query(query, [userId]);
        return result.rows;
    } catch (error) {
        console.error('Error getting user engagement:', error.message);
        return [];
    }
}

module.exports = {
    logNotificationSent,
    logNotificationClicked,
    getCampaignStats,
    getAllCampaignsSummary,
    getUserEngagement,
    pgClient
};
