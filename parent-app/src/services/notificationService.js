import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { getApiUrl } from '../config/api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export const registerForPushNotificationsAsync = async () => {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('Failed to get push token for push notification!');
      return null;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        showBadge: true,
      });
    }

    try {
      token = (await Notifications.getExpoPushTokenAsync({
          projectId: '6bed4c92-f081-4782-b419-2e187e90538f' // From app.json
      })).data;
      console.log('Push Token Generated:', token);
    } catch (e) {
      console.error('Error fetching push token:', e.message);
      return null;
    }
  } else {
    console.log('Must use physical device for Push Notifications');
  }

  return token;
};

export const registerTokenWithBackend = async (pushToken) => {
  try {
    const userToken = await SecureStore.getItemAsync('parentToken');
    if (!userToken) {
      console.log('[Push] No parent token, skipping registration');
      return;
    }

    console.log('[Push] Sending token to backend:', pushToken);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const response = await fetch(`${getApiUrl()}/parent-auth/push-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`,
      },
      body: JSON.stringify({ pushToken }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    const data = await response.json();
    if (response.ok) {
      console.log('[Push] Success:', data);
    } else {
      console.warn('[Push] Failed side:', response.status, data.message);
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('[Push] Request timed out');
    } else {
      console.error('[Push] Network Error:', error.message);
    }
  }
};
