import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, SIZES } from '../constants/theme';

const { width, height } = Dimensions.get('window');

const SplashScreen = ({ navigation }) => {
    return (
        <View style={styles.container}>
            {/* Background Decorative Bubbles */}
            <View style={[styles.bubble, { width: 150, height: 150, top: -20, left: -20, opacity: 0.1 }]} />
            <View style={[styles.bubble, { width: 250, height: 250, top: 40, right: -50, opacity: 0.15 }]} />
            <View style={[styles.bubble, { width: 180, height: 180, bottom: 200, left: -40, opacity: 0.12 }]} />
            <View style={[styles.bubble, { width: 300, height: 300, bottom: -100, right: -100, opacity: 0.1 }]} />

            <View style={[styles.smallBubble, { top: 200, left: 100 }]} />
            <View style={[styles.smallBubble, { top: 450, left: 180 }]} />
            <View style={[styles.smallBubble, { top: 350, right: 80, width: 30, height: 30, backgroundColor: '#fff' }]} />

            <SafeAreaView style={styles.content}>
                <View style={styles.logoContainer}>
                    <View style={styles.logoCircle}>
                        <Image
                            source={require('../../assets/logo.png')}
                            style={styles.logo}
                            resizeMode="contain"
                        />
                    </View>
                </View>

                <View style={styles.textContainer}>
                    <Text style={styles.title}>Mal Kekulu Future Mind</Text>
                    <Text style={styles.subtitle}>Montessori</Text>
                </View>

                <TouchableOpacity
                    style={styles.button}
                    onPress={() => navigation.replace('Login')}
                >
                    <Text style={styles.buttonText}>Let's Started</Text>
                </TouchableOpacity>
            </SafeAreaView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
    },
    bubble: {
        position: 'absolute',
        borderRadius: 999,
        backgroundColor: COLORS.primary,
    },
    smallBubble: {
        position: 'absolute',
        width: 15,
        height: 15,
        borderRadius: 999,
        backgroundColor: COLORS.primary,
        opacity: 0.3,
    },
    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 50,
    },
    logoContainer: {
        marginTop: 50,
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoCircle: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: COLORS.primary,
        padding: 5,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 10,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
    },
    logo: {
        width: 100,
        height: 100,
    },
    textContainer: {
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    title: {
        fontSize: 34,
        fontWeight: '900',
        color: COLORS.accent,
        textAlign: 'center',
        lineHeight: 45,
    },
    subtitle: {
        fontSize: 24,
        color: COLORS.primary,
        marginTop: 10,
        fontWeight: '500',
    },
    button: {
        width: width * 0.8,
        height: 56,
        backgroundColor: COLORS.primary,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        elevation: 5,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
    },
    buttonText: {
        color: COLORS.white,
        fontSize: 18,
        fontWeight: 'bold',
    },
});

export default SplashScreen;
