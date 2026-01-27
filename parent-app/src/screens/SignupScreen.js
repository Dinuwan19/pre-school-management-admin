import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { signup } from '../services/auth.service';
import { LinearGradient } from 'expo-linear-gradient';
import { Eye, EyeOff } from 'lucide-react-native';

import { COLORS, SIZES, FONTS } from '../constants/theme';

const SignupScreen = ({ navigation }) => {
    const [nic, setNic] = useState('');
    const [email, setEmail] = useState('');
    const [fullName, setFullName] = useState('');
    const [phone, setPhone] = useState('');
    const [relationship, setRelationship] = useState('FATHER');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSignup = async () => {
        if (!nic || !email || !username || !password || !fullName || !phone) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        setLoading(true);
        try {
            const signupData = { nationalId: nic, email, username, password, fullName, phone, relationship };
            const response = await signup(signupData, true); // Pass true for public signup

            Alert.alert('Verify Email', response.message, [
                { text: 'OK', onPress: () => navigation.navigate('EmailVerification', { userId: response.userId, email }) }
            ]);
        } catch (error) {
            Alert.alert('Signup Failed', error.message || 'Validation failed');
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
                            <Text style={styles.title}>Create Account</Text>
                            <Text style={styles.subtitle}>Join the Mal Kekulu Community</Text>
                        </View>

                        <View style={styles.card}>
                            <TextInput
                                style={styles.input}
                                placeholder="NIC Number"
                                value={nic}
                                onChangeText={setNic}
                                autoCapitalize="characters"
                                placeholderTextColor={COLORS.gray[400]}
                            />
                            <TextInput
                                style={styles.input}
                                placeholder="Full Name"
                                value={fullName}
                                onChangeText={setFullName}
                                placeholderTextColor={COLORS.gray[400]}
                            />
                            <TextInput
                                style={styles.input}
                                placeholder="Phone Number"
                                value={phone}
                                onChangeText={setPhone}
                                keyboardType="phone-pad"
                                placeholderTextColor={COLORS.gray[400]}
                            />
                            <TextInput
                                style={styles.input}
                                placeholder="Registered Email"
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                placeholderTextColor={COLORS.gray[400]}
                            />
                            {/* Simplified Relationship Selector */}
                            <View style={styles.selectorContainer}>
                                {['FATHER', 'MOTHER', 'GUARDIAN'].map((role) => (
                                    <TouchableOpacity
                                        key={role}
                                        style={[styles.selectorBtn, relationship === role && styles.selectorBtnActive]}
                                        onPress={() => setRelationship(role)}
                                    >
                                        <Text style={[styles.selectorText, relationship === role && styles.selectorTextActive]}>
                                            {role}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                            <TextInput
                                style={styles.input}
                                placeholder="Choose Username"
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

                            <TouchableOpacity style={styles.button} onPress={handleSignup} disabled={loading === true}>
                                {loading ? <ActivityIndicator color="#fff" animating={true} /> : <Text style={styles.buttonText}>Sign Up</Text>}
                            </TouchableOpacity>

                            <View style={styles.signupLink}>
                                <Text style={styles.grayText}>Already have an account? </Text>
                                <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                                    <Text style={styles.primaryText}>Login</Text>
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
    scrollContent: { flexGrow: 1, justifyContent: 'center', padding: SIZES.padding, paddingVertical: 50 },
    header: { marginBottom: 30, alignItems: 'center' },
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
        marginBottom: 16,
        color: COLORS.black,
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
    signupLink: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
    grayText: { color: COLORS.gray[500] },
    primaryText: { color: COLORS.primary, fontWeight: 'bold' },
    selectorContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
    selectorBtn: { flex: 1, padding: 12, borderRadius: SIZES.radius, backgroundColor: COLORS.gray[50], borderWidth: 1, borderColor: COLORS.gray[200], marginHorizontal: 4, alignItems: 'center' },
    selectorBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    selectorText: { fontSize: 12, color: COLORS.gray[500], fontWeight: 'bold' },
    selectorTextActive: { color: COLORS.white },
    passwordContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.gray[50],
        borderWidth: 1,
        borderColor: COLORS.gray[200],
        borderRadius: SIZES.radius,
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

export default SignupScreen;
