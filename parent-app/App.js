import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AppNavigator from './src/navigation/AppNavigator';
import { registerForPushNotificationsAsync, registerTokenWithBackend } from './src/services/notificationService';

export default function App() {
  useEffect(() => {
    // Moved push registration to Dashboard to ensure user is logged in
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <NavigationContainer>
        <StatusBar style="dark" />
        <AppNavigator />
      </NavigationContainer>
    </View>
  );
}
