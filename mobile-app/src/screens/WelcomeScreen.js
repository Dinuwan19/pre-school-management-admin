import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions, SafeAreaView } from 'react-native';
import { StatusBar } from 'expo-status-bar';

const { width, height } = Dimensions.get('window');

const WelcomeScreen = ({ navigation }) => {
    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="dark" />

            {/* Background Bubbles */}
            <View style={[styles.bubble, styles.bubble1]} />
            <View style={[styles.bubble, styles.bubble2]} />
            <View style={[styles.bubble, styles.bubble3]} />
            <View style={[styles.bubble, styles.bubble4]} />
            <View style={[styles.bubble, styles.bubble5]} />

            <View style={styles.content}>
                {/* Logo Area */}
                <View style={styles.logoContainer}>
                    <View style={styles.logoCircle}>
                        <Image
                            source={require('../../assets/icon.png')}
                            style={styles.logo}
                            resizeMode="contain"
                        />
                    </View>
                </View>

                {/* Text Content */}
                <View style={styles.textContainer}>
                    <Text style={styles.title}>Mal Kekulu Future</Text>
                    <Text style={styles.title}>Mind</Text>
                    <Text style={styles.subtitle}>Montessori</Text>
                </View>

                {/* Footer / Button Area */}
                <View style={styles.footer}>
                    <TouchableOpacity
                        style={styles.button}
                        onPress={() => navigation.navigate('Scanner')}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.buttonText}>Open Scanner</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        overflow: 'hidden',
    },
    bubble: {
        position: 'absolute',
        borderRadius: 1000,
        backgroundColor: '#E9DFFF', // Very light purple
        opacity: 0.6,
    },
    bubble1: {
        width: 300,
        height: 300,
        top: -50,
        right: -50,
    },
    bubble2: {
        width: 150,
        height: 150,
        top: 150,
        left: -30,
    },
    bubble3: {
        width: 200,
        height: 200,
        bottom: 100,
        right: -40,
        backgroundColor: '#F3EFFF',
    },
    bubble4: {
        width: 100,
        height: 100,
        top: 400,
        right: 80,
    },
    bubble5: {
        width: 400,
        height: 400,
        bottom: -100,
        left: -50,
        backgroundColor: '#F7F3FF',
    },
    content: {
        flex: 1,
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 60,
        zIndex: 1,
    },
    logoContainer: {
        marginTop: 40,
        alignItems: 'center',
    },
    logoCircle: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#9D5BF0', // Main Purple
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 10,
        shadowColor: '#9D5BF0',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 15,
        borderWidth: 4,
        borderColor: '#E9DFFF',
    },
    logo: {
        width: 80,
        height: 80,
    },
    textContainer: {
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    title: {
        fontSize: 40,
        fontWeight: '900',
        color: '#6B21A8', // Deep Purple
        textAlign: 'center',
        lineHeight: 48,
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 24,
        color: '#9D5BF0',
        marginTop: 10,
        fontWeight: '500',
        letterSpacing: 1,
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '80%',
        marginTop: 20,
    },
    statCard: {
        backgroundColor: '#F3EFFF',
        padding: 15,
        borderRadius: 15,
        width: '45%',
        alignItems: 'center',
    },
    statValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#6B21A8',
    },
    statLabel: {
        fontSize: 12,
        color: '#9D5BF0',
        marginTop: 4,
    },
    footer: {
        width: '100%',
        paddingHorizontal: 40,
        marginBottom: 20,
    },
    button: {
        backgroundColor: '#9D5BF0',
        height: 60,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5,
        shadowColor: '#9D5BF0',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
});

export default WelcomeScreen;
