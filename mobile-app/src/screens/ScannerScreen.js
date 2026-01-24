import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Modal, Image, Dimensions } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera'; // Updated API
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import api from '../config/api';
import dayjs from 'dayjs';

// Status Colors
const COLORS = {
    SUCCESS: '#10B981', // Green
    WARNING: '#F59E0B', // Yellow
    ERROR: '#EF4444',   // Red
    IDLE: '#4B5563'     // Gray
};

const ScannerScreen = ({ navigation }) => {
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);
    const [result, setResult] = useState(null); // { status, message, student }
    const [stats, setStats] = useState({ present: 0 }); // Simple local stats
    const lastScanRef = useRef(0);

    useEffect(() => {
        if (!permission?.granted) {
            requestPermission();
        }
    }, [permission]);

    const playSound = async (success) => {
        try {
            // In a real app, load sound files. Here we rely on Haptics mostly.
            // But we can simulate "beep" via system if available, or just Vibrate.
        } catch (error) {
            console.log('Audio Error', error);
        }
    };

    const handleBarCodeScanned = async ({ type, data }) => {
        const now = Date.now();
        if (scanned || now - lastScanRef.current < 2000) return; // 2 sec debounce local
        lastScanRef.current = now;
        setScanned(true);

        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

            // Handle QR data: Could be a simple numeric ID or a JSON object
            console.log('QR Code Scanned:', data);
            let studentId;

            try {
                // Try parsing as JSON first (System Generated Format)
                const parsed = JSON.parse(data);
                studentId = parsed.id || data;
            } catch (e) {
                // Fallback to raw data (Legacy/Simple Format)
                studentId = data;
            }

            console.log('Processing scan for studentId:', studentId);
            const response = await api.post('/attendance/scan', { studentId: parseInt(studentId), deviceId: 'MOBILE_APP_1' });
            console.log('Scan Response:', response.data);

            const { status, message, type: scanType, student: studentInfo } = response.data;

            // Determine feedback
            let feedbackType = 'SUCCESS';
            if (scanType === 'IGNORED' || scanType === 'ALREADY_IN' || scanType === 'COMPLETED') feedbackType = 'WARNING';
            if (status === 'ERROR') feedbackType = 'ERROR';

            if (feedbackType === 'SUCCESS') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } else if (feedbackType === 'WARNING') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            } else {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            }

            setResult({
                type: feedbackType,
                message: message,
                student: studentInfo,
                scanType: scanType // CHECK_IN, CHECK_OUT
            });

        } catch (error) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            setResult({
                type: 'ERROR',
                message: error.response?.data?.message || 'Network/Server Error',
                student: null
            });
        }

        // Auto-dismiss result after 3 seconds to allow continuous scanning?
        // Better: Tap to dismiss or auto-dismiss.
        setTimeout(() => {
            setScanned(false);
            setResult(null);
        }, 3000);
    };

    if (!permission) return <View />;
    if (!permission.granted) return <View style={styles.container}><Text>No Camera Access</Text></View>;

    return (
        <View style={styles.container}>
            <CameraView
                style={StyleSheet.absoluteFillObject}
                onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                barcodeScannerSettings={{
                    barcodeTypes: ["qr", "pdf417"],
                }}
            />

            <View style={styles.overlay}>
                <View style={styles.header}>
                    <Text style={styles.headerText}>School Attendance</Text>
                </View>
                <View style={styles.scannerFrame} />
                <View style={styles.footer}>
                    <Text style={styles.footerText}>Align QR Code within the frame</Text>
                </View>
            </View>

            {/* Visual Verification Modal */}
            {result && (
                <View style={[styles.resultOverlay, { backgroundColor: result.type === 'SUCCESS' ? 'rgba(16, 185, 129, 0.9)' : result.type === 'WARNING' ? 'rgba(245, 158, 11, 0.9)' : 'rgba(239, 68, 68, 0.9)' }]}>
                    <Text style={styles.resultTitle}>{result.scanType?.replace('_', ' ') || result.type}</Text>

                    {result.student && (
                        <View style={styles.studentCard}>
                            <View style={styles.photoPlaceholder}>
                                {/* Use Image if photoUrl exists */}
                                <Text style={styles.photoText}>{result.student.fullName[0]}</Text>
                            </View>
                            <Text style={styles.studentName}>{result.student.fullName}</Text>
                            <Text style={styles.studentId}>{result.student.id}</Text>
                        </View>
                    )}

                    <Text style={styles.resultMessage}>{result.message}</Text>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        position: 'absolute',
        top: 60,
        backgroundColor: 'rgba(0,0,0,0.6)',
        padding: 10,
        borderRadius: 8,
    },
    headerText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    scannerFrame: {
        width: 250,
        height: 250,
        borderWidth: 2,
        borderColor: '#fff',
        borderRadius: 20,
        backgroundColor: 'transparent',
    },
    footer: {
        position: 'absolute',
        bottom: 80,
    },
    footerText: {
        color: '#fff',
        fontSize: 16,
    },
    resultOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    resultTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 20,
        textTransform: 'uppercase',
    },
    studentCard: {
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 16,
        alignItems: 'center',
        width: '80%',
        marginBottom: 20,
        elevation: 5,
    },
    photoPlaceholder: {
        width: 80,
        height: 80,
        backgroundColor: '#e0e7ff',
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    photoText: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#4f46e5',
    },
    studentName: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1f2937',
        textAlign: 'center',
    },
    studentId: {
        fontSize: 14,
        color: '#6b7280',
        marginTop: 4,
    },
    resultMessage: {
        color: '#fff',
        fontSize: 18,
        textAlign: 'center',
        marginTop: 10,
    }
});

export default ScannerScreen;
