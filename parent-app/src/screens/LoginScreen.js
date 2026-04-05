import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { login } from '../services/auth.service';
import { LinearGradient } from 'expo-linear-gradient';
import { Eye, EyeOff } from 'lucide-react-native';
import { registerForPushNotificationsAsync, registerTokenWithBackend } from '../services/notificationService';

import { COLORS, SIZES, FONTS } from '../constants/theme';

const LoginScreen = ({ navigation }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        if (!username || !password) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        setLoading(true);
        try {
            await login(username, password);
            
            // Register push notifications on successful login
            registerForPushNotificationsAsync().then(token => {
                if (token) {
                    registerTokenWithBackend(token);
                }
            });

            navigation.replace('MainTabs');
        } catch (error) {
            if (error.response?.status === 403 && error.response?.data?.requiresVerification) {
                Alert.alert('Verify Email', 'Your email is not verified. Redirecting to verification page...', [
                    { text: 'Verify Now', onPress: () => navigation.navigate('EmailVerification', { userId: error.response.data.userId, email: username }) }
                ]);
            } else {
                Alert.alert('Login Failed', error.message || 'Invalid credentials');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <LinearGradient colors={[COLORS.light, '#FFFFFF']} style={styles.container}>
            <SafeAreaView style={styles.safeArea}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} enabled={true} style={{ flex: 1 }}>
                    <ScrollView contentContainerStyle={styles.scrollContent}>
                        <View style={styles.header}>
                            <Text style={styles.title}>Welcome Back</Text>
                            <Text style={styles.subtitle}>Login to Mal Kekulu Parent Portal</Text>
                        </View>

                        <View style={styles.card}>
                            <TextInput
                                style={styles.input}
                                placeholder="Username"
                                value={username}
                                onChangeText={setUsername}
                                autoCapitalize="none"
                                placeholderTextColor={COLORS.gray[400]}
                            />

                            <View style={styles.passwordContainer}>
                                <TextInput
                                    style={styles.passwordInput}
                                    placeholder="Password"
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry={!showPassword}
                                    placeholderTextColor={COLORS.gray[400]}
                                />
                                <TouchableOpacity
                                    style={styles.eyeIcon}
                                    onPress={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? <Eye size={22} color={COLORS.gray[500]} /> : <EyeOff size={22} color={COLORS.gray[500]} />}
                                </TouchableOpacity>
                            </View>

                            <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading === true}>
                                {loading ? <ActivityIndicator color="#fff" animating={true} /> : <Text style={styles.buttonText}>Login</Text>}
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={{ marginTop: 15, alignItems: 'center' }}
                                onPress={() => navigation.navigate('ForgotPassword')}
                            >
                                <Text style={styles.primaryText}>Forgot Password?</Text>
                            </TouchableOpacity>

                            <View style={styles.signupLink}>
                                <Text style={styles.grayText}>Don't have an account? </Text>
                                <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
                                    <Text style={styles.primaryText}>Sign Up</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    safeArea: { flex: 1 },
    scrollContent: { flexGrow: 1, justifyContent: 'center', padding: SIZES.padding },
    header: { marginBottom: 40, alignItems: 'center' },
    title: { fontSize: 32, fontWeight: 'bold', color: COLORS.black, marginBottom: 8 },
    subtitle: { fontSize: 16, color: COLORS.gray[500], textAlign: 'center' },
    card: {
        backgroundColor: COLORS.white,
        borderRadius: SIZES.radius * 1.5,
        padding: 30,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
    },
    input: {
        backgroundColor: COLORS.gray[50],
        borderWidth: 1,
        borderColor: COLORS.gray[200],
        borderRadius: SIZES.radius,
        padding: 16,
        fontSize: 16,
        marginBottom: 20,
        color: COLORS.black,
    },
    passwordContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.gray[50],
        borderWidth: 1,
        borderColor: COLORS.gray[200],
        borderRadius: SIZES.radius,
        marginBottom: 20,
    },
    passwordInput: {
        flex: 1,
        padding: 16,
        fontSize: 16,
        color: COLORS.black,
    },
    eyeIcon: {
        padding: 16,
    },
    button: {
        backgroundColor: COLORS.primary,
        height: SIZES.buttonHeight,
        borderRadius: SIZES.radius,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 10,
    },
    buttonText: { color: COLORS.white, fontSize: 18, fontWeight: 'bold' },
    signupLink: { flexDirection: 'row', justifyContent: 'center', marginTop: 30 },
    grayText: { color: COLORS.gray[500] },
    primaryText: { color: COLORS.primary, fontWeight: 'bold' },
});

export default LoginScreen;
