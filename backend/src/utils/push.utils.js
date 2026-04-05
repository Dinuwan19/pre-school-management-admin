const axios = require('axios');

/**
 * Sends push notifications via Expo Push API
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
            priority: 'high',
            channelId: 'default'
        }));

        const response = await axios.post('https://exp.host/--/api/v2/push/send', messages, {
            headers: {
                'Accept': 'application/json',
                'Accept-encoding': 'gzip, deflate',
                'Content-Type': 'application/json',
            },
        });

        return response.data;
    } catch (error) {
        console.error('Error sending push notification:', error.response?.data || error.message);
    }
};

module.exports = { sendPushNotification };
