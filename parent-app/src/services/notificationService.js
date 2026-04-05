import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
      console.log('Failed to get push token for push notification!');
      return null;
    }
    
    // Project ID is required for SDK 49+
    token = (await Notifications.getExpoPushTokenAsync({
        projectId: '6bed4c92-f081-4782-b419-2e187e90538f' // From app.json
    })).data;
    
  } else {
    console.log('Must use physical device for Push Notifications');
  }

  return token;
};

export const registerTokenWithBackend = async (token) => {
    try {
        if (!token) return;
        
        const userToken = await AsyncStorage.getItem('userToken');
        if (!userToken) return;

        await axios.post(`${getApiUrl()}/parents/push-token`, 
            { pushToken: token },
            { headers: { Authorization: `Bearer ${userToken}` } }
        );
        console.log('Push token successfully registered with backend');
    } catch (error) {
        console.error('Error registering push token:', error.response?.data || error.message);
    }
};
