#!/usr/bin/env node
// Campaign Analytics Dashboard
const { 
    getCampaignStats,
    getAllCampaignsSummary,
    getUserEngagement,
    pgClient
} = require('./analytics');

async function showDashboard() {
    try {
        console.log('\n' + '='.repeat(80));
        console.log('📊 CAMPAIGN ANALYTICS DASHBOARD');
        console.log('='.repeat(80) + '\n');
        
        // Get all campaigns
        const campaigns = await getAllCampaignsSummary();
        
        if (campaigns.length === 0) {
            console.log('No campaigns found. Send some notifications first!\n');
            await pgClient.end();
            return;
        }
        
        // Summary table
        console.log('📈 ALL CAMPAIGNS OVERVIEW:');
        console.log('-'.repeat(80));
        console.table(campaigns.map(c => ({
            'Campaign': c.campaign_name,
            'Sent': c.sent_count,
            'Clicked': c.clicked_count,
            'CTR %': c.ctr_percent + '%',
            'Users': c.unique_users,
            'First Activity': new Date(c.first_activity).toLocaleString(),
            'Last Activity': new Date(c.last_activity).toLocaleString()
        })));
        
        // Detailed stats for each campaign
        console.log('\n📊 DETAILED CAMPAIGN STATISTICS:\n');
        
        for (const campaign of campaigns) {
            const stats = await getCampaignStats(campaign.campaign_name);
            
            if (stats) {
                console.log(`\n🎯 Campaign: ${stats.campaign_name}`);
                console.log('-'.repeat(50));
                console.log(`  📤 Total Sent:              ${stats.sent_count}`);
                console.log(`  👆 Total Clicked:           ${stats.clicked_count}`);
                console.log(`  👥 Unique Users (Sent):     ${stats.unique_users_sent}`);
                console.log(`  👥 Unique Users (Clicked):  ${stats.unique_users_clicked}`);
                console.log(`  📊 Click-Through Rate:      ${stats.click_through_rate}%`);
                console.log(`  💚 User Engagement Rate:    ${stats.user_engagement_rate}%`);
                
                if (stats.first_sent) {
                    console.log(`  🕐 First Sent:              ${new Date(stats.first_sent).toLocaleString()}`);
                }
                if (stats.last_clicked) {
                    console.log(`  🕐 Last Clicked:            ${new Date(stats.last_clicked).toLocaleString()}`);
                }
            }
        }
        
        // Performance summary
        const totalSent = campaigns.reduce((sum, c) => sum + parseInt(c.sent_count), 0);
        const totalClicked = campaigns.reduce((sum, c) => sum + parseInt(c.clicked_count), 0);
        const avgCTR = totalSent > 0 ? ((totalClicked / totalSent) * 100).toFixed(2) : 0;
        
        console.log('\n' + '='.repeat(80));
        console.log('🎯 OVERALL PERFORMANCE:');
        console.log('-'.repeat(80));
        console.log(`  Total Notifications Sent:     ${totalSent}`);
        console.log(`  Total Clicks:                 ${totalClicked}`);
        console.log(`  Average CTR:                  ${avgCTR}%`);
        console.log(`  Total Campaigns:              ${campaigns.length}`);
        console.log('='.repeat(80) + '\n');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pgClient.end();
    }
}

async function showUserEngagement(userId) {
    try {
        console.log('\n' + '='.repeat(80));
        console.log(`👤 USER ENGAGEMENT: ${userId}`);
        console.log('='.repeat(80) + '\n');
        
        const engagement = await getUserEngagement(userId);
        
        if (engagement.length === 0) {
            console.log(`No engagement data found for user: ${userId}\n`);
            await pgClient.end();
            return;
        }
        
        console.table(engagement.map(e => ({
            'Campaign': e.campaign_name,
            'Lock': e.lock_id,
            'Event': e.event_type,
            'Time': new Date(e.sent_at).toLocaleString(),
            'Batch ID': e.batch_id || '-'
        })));
        
        console.log('\n');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pgClient.end();
    }
}

// CLI
const args = process.argv.slice(2);

if (args[0] === 'user' && args[1]) {
    showUserEngagement(args[1]);
} else {
    showDashboard();
}
