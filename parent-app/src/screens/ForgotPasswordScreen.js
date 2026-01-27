import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Key, Smartphone, Lock, Eye, EyeOff } from 'lucide-react-native';
import api from '../config/api';
import { COLORS, SIZES, FONTS } from '../constants/theme';

const ForgotPasswordScreen = ({ navigation }) => {
    const [step, setStep] = useState('request'); // 'request' | 'verify' | 'reset'
    const [username, setUsername] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleRequestOTP = async () => {
        if (!username) return Alert.alert('Error', 'Please enter your username');
        setLoading(true);
        try {
            await api.post('/auth/forgot-password', { username });
            setStep('verify');
        } catch (error) {
            Alert.alert('Error', error.response?.data?.message || 'Failed to request code');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOTP = async () => {
        if (otp.length !== 6) return Alert.alert('Error', 'Enter 6-digit code');
        setLoading(true);
        try {
            await api.post('/auth/validate-otp', { username, otp });
            setStep('reset');
        } catch (error) {
            Alert.alert('Verification Failed', 'Invalid or expired code');
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async () => {
        if (newPassword !== confirmPassword) return Alert.alert('Error', 'Passwords do not match');
        if (newPassword.length < 6) return Alert.alert('Error', 'Password must be at least 6 characters');

        setLoading(true);
        try {
            await api.post('/auth/verify-otp', { username, otp, newPassword });
            Alert.alert('Success', 'Your password has been reset successfully!', [
                { text: 'Login Now', onPress: () => navigation.navigate('Login') }
            ]);
        } catch (error) {
            Alert.alert('Error', 'Reset failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const renderHeader = (title, subtitle, icon) => (
        <View style={styles.header}>
            <TouchableOpacity onPress={() => step === 'request' ? navigation.goBack() : setStep('request')}>
                <ArrowLeft size={24} color={COLORS.black} />
            </TouchableOpacity>
            <View style={styles.titleContainer}>
                <View style={styles.iconBox}>{icon}</View>
                <Text style={styles.title}>{title}</Text>
                <Text style={styles.subtitle}>{subtitle}</Text>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.scrollContent}>

                    {step === 'request' && (
                        <>
                            {renderHeader('Recover Account', 'Enter your username to receive a security code', <Smartphone color={COLORS.primary} size={30} />)}
                            <View style={styles.form}>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Username"
                                    value={username}
                                    onChangeText={setUsername}
                                    autoCapitalize="none"
                                />
                                <TouchableOpacity style={styles.button} onPress={handleRequestOTP} disabled={loading}>
                                    {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Send Code</Text>}
                                </TouchableOpacity>
                            </View>
                        </>
                    )}

                    {step === 'verify' && (
                        <>
                            {renderHeader('Verify OTP', 'Enter the 6-digit code sent to your email', <Key color={COLORS.primary} size={30} />)}
                            <View style={styles.form}>
                                <TextInput
                                    style={styles.input}
                                    placeholder="OTP Code"
                                    keyboardType="number-pad"
                                    maxLength={6}
                                    value={otp}
                                    onChangeText={setOtp}
                                    letterSpacing={5}
                                    textAlign="center"
                                />
                                <TouchableOpacity style={styles.button} onPress={handleVerifyOTP} disabled={loading}>
                                    {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Verify Code</Text>}
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.resendBtn} onPress={handleRequestOTP}>
                                    <Text style={styles.primaryText}>Resend Code</Text>
                                </TouchableOpacity>
                            </View>
                        </>
                    )}

                    {step === 'reset' && (
                        <>
                            {renderHeader('New Password', 'Set a secure password for your account', <Lock color={COLORS.primary} size={30} />)}
                            <View style={styles.form}>
                                <View style={styles.passwordContainer}>
                                    <TextInput
                                        style={styles.passwordInput}
                                        placeholder="New Password"
                                        secureTextEntry={!showPassword}
                                        value={newPassword}
                                        onChangeText={setNewPassword}
                                    />
                                    <TouchableOpacity
                                        style={styles.eyeIcon}
                                        onPress={() => setShowPassword(!showPassword)}
                                    >
                                        {showPassword ? <Eye size={22} color={COLORS.gray[500]} /> : <EyeOff size={22} color={COLORS.gray[500]} />}
                                    </TouchableOpacity>
                                </View>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Confirm New Password"
                                    secureTextEntry={true}
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                />
                                <TouchableOpacity style={styles.button} onPress={handleResetPassword} disabled={loading}>
                                    {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Reset Password</Text>}
                                </TouchableOpacity>
                            </View>
                        </>
                    )}

                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.white },
    scrollContent: { padding: SIZES.padding },
    header: { marginBottom: 30 },
    titleContainer: { alignItems: 'center', marginTop: 20 },
    iconBox: { width: 70, height: 70, borderRadius: 20, backgroundColor: COLORS.light, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
    title: { fontSize: 24, fontWeight: 'bold', color: COLORS.black, marginBottom: 8 },
    subtitle: { fontSize: 14, color: COLORS.gray[500], textAlign: 'center', paddingHorizontal: 20, lineHeight: 22 },
    form: { marginTop: 20 },
    input: {
        backgroundColor: COLORS.gray[50], borderWidth: 1, borderColor: COLORS.gray[200],
        borderRadius: 12, padding: 16, fontSize: 16, marginBottom: 16, color: COLORS.black
    },
    button: {
        backgroundColor: COLORS.primary, height: 56, borderRadius: 12,
        justifyContent: 'center', alignItems: 'center', marginTop: 10
    },
    buttonText: { color: COLORS.white, fontSize: 18, fontWeight: 'bold' },
    resendBtn: { marginTop: 20, alignItems: 'center' },
    primaryText: { color: COLORS.primary, fontWeight: '700' },
    passwordContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.gray[50],
        borderWidth: 1,
        borderColor: COLORS.gray[200],
        borderRadius: 12,
        marginBottom: 16,
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
});

export default ForgotPasswordScreen;
