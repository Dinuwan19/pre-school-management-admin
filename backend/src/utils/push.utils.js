const axios = require('axios');

/**
 * Sends push notifications via Expo Push API
 * Uses high-priority FCM flags for WhatsApp-style screen-off delivery
 * @param {string[]} tokens - Array of Expo Push Tokens
 * @param {string} title - Notification Title
 * @param {string} body - Notification Body
 * @param {object} data - Extra data to send with the notification
 */
const sendPushNotification = async (tokens, title, body, data = {}) => {
    try {
        const validTokens = tokens.filter(token => token && token.startsWith('ExponentPushToken'));
        
        if (validTokens.length === 0) return;

        const messages = validTokens.map(token => ({
            to: token,
            sound: 'default',
            title,
            body,
            data,

            // Android: Force highest priority — wakes device even with screen off (like WhatsApp)
            priority: 'high',
            channelId: 'default',
            
            // Android: Keep message alive for 1 hour if device is unreachable
            ttl: 3600,

            // iOS: Wake app in background to process notification
            _contentAvailable: true,
        }));

        const response = await axios.post('https://exp.host/--/api/v2/push/send', messages, {
            headers: {
                'Accept': 'application/json',
                'Accept-encoding': 'gzip, deflate',
                'Content-Type': 'application/json',
            },
        });

        // Log any per-token errors from Expo
        const results = response.data?.data || [];
        results.forEach((result, i) => {
            if (result.status === 'error') {
                console.error(`[Push] Token error for ${validTokens[i]}: ${result.message} (${result.details?.error})`);
            }
        });

        return response.data;
    } catch (error) {
        console.error('Error sending push notification:', error.response?.data || error.message);
    }
};

module.exports = { sendPushNotification };

