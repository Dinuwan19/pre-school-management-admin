import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { signup } from '../services/auth.service';
import { LinearGradient } from 'expo-linear-gradient';

import { COLORS, SIZES, FONTS } from '../constants/theme';

const SignupScreen = ({ navigation }) => {
    const [nic, setNic] = useState('');
    const [email, setEmail] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSignup = async () => {
        if (!nic || !email || !username || !password) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        setLoading(true);
        try {
            await signup({ nationalId: nic, email, username, password });
            Alert.alert('Success', 'Account created successfully!', [
                { text: 'OK', onPress: () => navigation.replace('Dashboard') }
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
                                placeholder="Registered Email"
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                placeholderTextColor={COLORS.gray[400]}
                            />
                            <TextInput
                                style={styles.input}
                                placeholder="Choose Username"
                                value={username}
                                onChangeText={setUsername}
                                autoCapitalize="none"
                                placeholderTextColor={COLORS.gray[400]}
                            />
                            <TextInput
                                style={styles.input}
                                placeholder="Password"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={true}
                                placeholderTextColor={COLORS.gray[400]}
                            />

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
});

export default SignupScreen;
