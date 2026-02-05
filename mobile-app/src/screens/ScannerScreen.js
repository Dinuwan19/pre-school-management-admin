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
    const [scanMode, setScanMode] = useState('AUTO'); // AUTO, CHECK_IN, CHECK_OUT
    const lastScanRef = useRef(0);

    useEffect(() => {
        if (!permission?.granted) {
            requestPermission();
        }
    }, [permission]);

    const handleBarCodeScanned = async ({ type, data }) => {
        const now = Date.now();
        if (scanned || now - lastScanRef.current < 1500) return; // 1.5 sec debounce
        lastScanRef.current = now;
        setScanned(true);

        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

            let studentId;
            try {
                const parsed = JSON.parse(data);
                studentId = parsed.id || data;
            } catch (e) {
                studentId = data;
            }

            console.log(`[Scan] studentId: ${studentId}, mode: ${scanMode}`);
            const response = await api.post('/attendance/scan', {
                studentId: parseInt(studentId),
                deviceId: 'MOBILE_APP_STAFF',
                forceMode: scanMode === 'AUTO' ? null : scanMode
            });

            const { status, message, type: scanType, student: studentInfo } = response.data;

            let feedbackType = 'SUCCESS';
            if (scanType === 'IGNORED' || scanType === 'ALREADY_IN' || scanType === 'ALREADY_OUT') feedbackType = 'WARNING';
            if (status === 'ERROR') feedbackType = 'ERROR';

            if (feedbackType === 'SUCCESS') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            else if (feedbackType === 'WARNING') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            else Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

            setResult({
                type: feedbackType,
                message: message,
                student: studentInfo,
                scanType: scanType
            });

        } catch (error) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            setResult({
                type: 'ERROR',
                message: error.response?.data?.message || 'Network Error',
                student: null
            });
        }

        // Auto-dismiss faster for rapid scanning
        setTimeout(() => {
            setScanned(false);
            setResult(null);
        }, 1500);
    };

    if (!permission) return <View />;
    if (!permission.granted) return <View style={styles.container}><Text>No Camera Access</Text></View>;

    return (
        <View style={styles.container}>
            <CameraView
                style={StyleSheet.absoluteFillObject}
                onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                barcodeScannerSettings={{
                    barcodeTypes: ["qr"],
                }}
            />

            {/* Overlay Viewfinder */}
            <View style={styles.overlay}>
                <View style={styles.header}>
                    <Text style={styles.headerText}>Staff Scanner</Text>
                </View>

                <View style={styles.modeContainer}>
                    <TouchableOpacity
                        style={[styles.modeButton, scanMode === 'AUTO' && styles.modeButtonActive]}
                        onPress={() => setScanMode('AUTO')}
                    >
                        <Text style={[styles.modeButtonText, scanMode === 'AUTO' && styles.modeButtonTextActive]}>Auto</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.modeButton, scanMode === 'CHECK_IN' && styles.modeButtonActive]}
                        onPress={() => setScanMode('CHECK_IN')}
                    >
                        <Text style={[styles.modeButtonText, scanMode === 'CHECK_IN' && styles.modeButtonTextActive]}>In</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.modeButton, scanMode === 'CHECK_OUT' && styles.modeButtonActive]}
                        onPress={() => setScanMode('CHECK_OUT')}
                    >
                        <Text style={[styles.modeButtonText, scanMode === 'CHECK_OUT' && styles.modeButtonTextActive]}>Out</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.scannerFrame} />

                <View style={styles.footer}>
                    <Text style={styles.footerText}>Mode: {scanMode.replace('_', ' ')}</Text>
                </View>
            </View>

            {/* Verification Result Overlay */}
            {result && (
                <View style={[styles.resultOverlay, { backgroundColor: result.type === 'SUCCESS' ? 'rgba(16, 185, 129, 0.95)' : result.type === 'WARNING' ? 'rgba(245, 158, 11, 0.95)' : 'rgba(239, 68, 68, 0.95)' }]}>
                    <Text style={styles.resultTitle}>{result.scanType?.replace('_', ' ') || result.type}</Text>

                    {result.student && (
                        <View style={styles.studentCard}>
                            <View style={styles.photoPlaceholder}>
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
    modeContainer: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 25,
        padding: 4,
        position: 'absolute',
        top: 120,
        width: '60%',
        justifyContent: 'space-between',
    },
    modeButton: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 20,
    },
    modeButtonActive: {
        backgroundColor: '#fff',
    },
    modeButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    modeButtonTextActive: {
        color: '#4f46e5',
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
