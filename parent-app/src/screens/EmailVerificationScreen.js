import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../config/api';
import { COLORS, FONTS, SIZES } from '../constants/theme';
import { Mail } from 'lucide-react-native';

const EmailVerificationScreen = ({ route, navigation }) => {
    const { userId, email } = route.params;
    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);

    const handleVerify = async () => {
        if (otp.length !== 6) {
            Alert.alert('Error', 'Please enter a 6-digit code');
            return;
        }

        setLoading(true);
        try {
            await api.post('/parent-auth/verify-email', { userId, otp });
            Alert.alert('Success', 'Email verified successfully! You can now login.', [
                { text: 'OK', onPress: () => navigation.navigate('Login') }
            ]);
        } catch (error) {
            Alert.alert('Verification Failed', error.response?.data?.message || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        setResending(true);
        try {
            await api.post('/parent-auth/resend-verification', { email });
            Alert.alert('Success', 'A new code has been sent to your email.');
        } catch (error) {
            Alert.alert('Error', 'Failed to resend code');
        } finally {
            setResending(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <View style={styles.iconContainer}>
                    <Mail size={40} color={COLORS.primary} />
                </View>

                <Text style={FONTS.h2}>Verify Your Email</Text>
                <Text style={styles.subtitle}>
                    We've sent a 6-digit verification code to {'\n'}
                    <Text style={{ fontWeight: 'bold' }}>{email}</Text>
                </Text>

                <TextInput
                    style={styles.otpInput}
                    placeholder="000000"
                    placeholderTextColor={COLORS.gray[300]}
                    keyboardType="number-pad"
                    maxLength={6}
                    value={otp}
                    onChangeText={setOtp}
                    letterSpacing={SIZES.base}
                />

                <TouchableOpacity
                    style={[styles.button, otp.length !== 6 && styles.buttonDisabled]}
                    onPress={handleVerify}
                    disabled={loading || otp.length !== 6}
                >
                    {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Verify Account</Text>}
                </TouchableOpacity>

                <View style={styles.resendContainer}>
                    <Text style={styles.grayText}>Didn't receive a code? </Text>
                    <TouchableOpacity onPress={handleResend} disabled={resending}>
                        <Text style={styles.primaryText}>{resending ? 'Sending...' : 'Resend Code'}</Text>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <Text style={styles.grayText}>Back to Sign Up</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.white },
    content: { flex: 1, padding: SIZES.padding, alignItems: 'center', justifyContent: 'center' },
    iconContainer: {
        width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.light,
        justifyContent: 'center', alignItems: 'center', marginBottom: 24
    },
    subtitle: {
        textAlign: 'center', color: COLORS.gray[500], marginTop: 12, marginBottom: 40,
        fontSize: 16, lineHeight: 24
    },
    otpInput: {
        width: '100%', height: 60, backgroundColor: COLORS.gray[50], borderRadius: 12,
        borderWidth: 1, borderColor: COLORS.gray[200], fontSize: 28, fontWeight: 'bold',
        textAlign: 'center', marginBottom: 30, color: COLORS.primary
    },
    button: {
        width: '100%', height: 56, backgroundColor: COLORS.primary, borderRadius: 12,
        justifyContent: 'center', alignItems: 'center'
    },
    buttonDisabled: { opacity: 0.6 },
    buttonText: { color: COLORS.white, fontSize: 18, fontWeight: 'bold' },
    resendContainer: { flexDirection: 'row', marginTop: 30 },
    grayText: { color: COLORS.gray[500] },
    primaryText: { color: COLORS.primary, fontWeight: 'bold' },
    backButton: { marginTop: 20 }
});

export default EmailVerificationScreen;
