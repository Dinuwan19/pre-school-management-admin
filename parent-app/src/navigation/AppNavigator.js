import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home, Users, CreditCard, Bell, Settings, Calendar } from 'lucide-react-native';

import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import DashboardScreen from '../screens/DashboardScreen';
import EventsScreen from '../screens/EventsScreen';
import StudentProfileScreen from '../screens/StudentProfileScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ChildrenListScreen from '../screens/ChildrenListScreen';
import AttendanceScreen from '../screens/AttendanceScreen';
import PaymentHistoryScreen from '../screens/PaymentHistoryScreen';
import SplashScreen from '../screens/SplashScreen';
import EmailVerificationScreen from '../screens/EmailVerificationScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

import UpdatesScreen from '../screens/UpdatesScreen';

const TabNavigator = () => {
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarActiveTintColor: '#9D5BF0',
                tabBarInactiveTintColor: '#9CA3AF',
                tabBarStyle: {
                    height: 70,
                    paddingBottom: 12,
                    paddingTop: 10,
                    backgroundColor: '#FFFFFF',
                    borderTopWidth: 1,
                    borderTopColor: '#F3F4F6',
                    elevation: 10,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: -4 },
                    shadowOpacity: 0.05,
                    shadowRadius: 10,
                },
                tabBarLabelStyle: {
                    fontSize: 10,
                    fontWeight: '700',
                    marginTop: 4,
                },
                tabBarIcon: ({ color, size }) => {
                    if (route.name === 'Home') return <Home size={22} color={color} />;
                    if (route.name === 'Students') return <Users size={22} color={color} />;
                    if (route.name === 'Payments') return <CreditCard size={22} color={color} />;
                    if (route.name === 'Updates') return <Bell size={22} color={color} />;
                    if (route.name === 'Settings') return <Settings size={22} color={color} />;
                },
            })}
        >
            <Tab.Screen name="Home" component={DashboardScreen} />
            <Tab.Screen name="Students" component={ChildrenListScreen} />
            <Tab.Screen name="Payments" component={PaymentHistoryScreen} />
            <Tab.Screen name="Updates" component={UpdatesScreen} options={{ tabBarLabel: 'Updates' }} />
            <Tab.Screen name="Settings" component={ProfileScreen} />
        </Tab.Navigator>
    );
};

const AppNavigator = () => {
    return (
        <Stack.Navigator
            initialRouteName="Splash"
            screenOptions={{
                headerShown: false,
                cardStyle: { backgroundColor: '#fff' }
            }}
        >
            <Stack.Screen name="Splash" component={SplashScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Signup" component={SignupScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
            <Stack.Screen name="EmailVerification" component={EmailVerificationScreen} />
            <Stack.Screen name="MainTabs" component={TabNavigator} />
            <Stack.Screen name="StudentProfile" component={StudentProfileScreen} />
            <Stack.Screen name="AttendanceHistory" component={AttendanceScreen} />
            <Stack.Screen name="PaymentHistory" component={PaymentHistoryScreen} />
        </Stack.Navigator>
    );
};

export default AppNavigator;
