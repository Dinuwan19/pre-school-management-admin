import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { getLinkedChildren } from '../services/child.service';
import { LinearGradient } from 'expo-linear-gradient';
import {
    Zap,
    ChevronRight,
    CheckCircle2,
    Phone,
    BarChart3,
    CalendarCheck2
} from 'lucide-react-native';

import { COLORS } from '../constants/theme';
import CommonHeader from '../components/CommonHeader';

const ChildrenListScreen = ({ navigation }) => {
    const [children, setChildren] = useState([]);
    const [loading, setLoading] = useState(true);

    useFocusEffect(
        useCallback(() => {
            fetchChildren();
        }, [])
    );

    const fetchChildren = useCallback(async () => {
        try {
            const data = await getLinkedChildren();
            setChildren(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, []);

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#9D5BF0" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <CommonHeader title="My Children" />
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                bounces={false}
            >
                {/* Gradient Header Section */}
                <LinearGradient
                    colors={['#9D5BF0', '#7C3AED']}
                    style={styles.headerGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    <SafeAreaView edges={['top']} style={styles.headerContent}>
                        <View style={styles.greetingRow}>
                            <Zap size={24} color="#FFD700" fill="#FFD700" />
                            <Text style={styles.headerSubtext}>Track progress and manage your children's education</Text>
                        </View>
                    </SafeAreaView>
                    <View style={styles.headerWave} />
                </LinearGradient>

                {/* Children Cards */}
                {children.length > 0 ? (
                    <View style={styles.listContainer}>
                        {children.map((child) => (
                            <View key={child.id} style={styles.childCard}>
                                <View style={styles.cardContent}>
                                    <View style={styles.avatarColumn}>
                                        <View style={styles.avatarWrapper}>
                                            <Image
                                                source={child?.photoUrl ? { uri: child.photoUrl } : { uri: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png' }}
                                                style={styles.avatar}
                                            />
                                        </View>
                                    </View>

                                    <View style={styles.infoColumn}>
                                        <Text style={styles.childName}>{child?.fullName}</Text>
                                        <Text style={styles.childDetailText}>{child?.classroom?.name || child?.classroom || 'Nursery'} • {child.teacherName || 'Class Teacher'}</Text>

                                        <View style={styles.compactStatsRow}>
                                            <View style={styles.compactStat}>
                                                <BarChart3 size={14} color="#9D5BF0" />
                                                <Text style={styles.compactStatText}>Progress {child.progress !== undefined ? `${child.progress}%` : 'N/A'}</Text>
                                            </View>
                                            <View style={styles.compactStat}>
                                                <CalendarCheck2 size={14} color="#22C55E" />
                                                <Text style={styles.compactStatText}>Attd {child.attendanceRate !== undefined ? `${child.attendanceRate}%` : 'N/A'}</Text>
                                            </View>
                                        </View>
                                    </View>
                                </View>

                                <TouchableOpacity
                                    style={styles.viewProfileBtn}
                                    onPress={() => navigation.navigate('StudentProfile', { student: child })}
                                >
                                    <Text style={styles.viewProfileText}>View Profile</Text>
                                    <ChevronRight size={16} color="#fff" />
                                </TouchableOpacity>
                            </View>
                        ))}
                    </View>
                ) : (
                    <View style={styles.emptyContainer}>
                        <View style={styles.emptyIconBox}>
                            <Zap size={48} color="#94A3B8" />
                        </View>
                        <Text style={styles.emptyTitle}>No Children Enrolled</Text>
                        <Text style={styles.emptySubtext}>It looks like no students are linked to your account yet. Please contact the administration.</Text>
                    </View>
                )}
                <View style={{ height: 100 }} />
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    container: { flex: 1, backgroundColor: COLORS.background },
    scrollContent: { flexGrow: 1 },
    headerGradient: {
        paddingBottom: 40,
    },
    headerContent: { paddingHorizontal: 24, paddingVertical: 20 },
    greetingRow: { flexDirection: 'row', alignItems: 'center' },
    headerTitle: { color: '#fff', fontSize: 28, fontWeight: 'bold', marginLeft: 12 },
    headerSubtext: { color: 'rgba(255,255,255,0.8)', fontSize: 16, marginTop: 12, lineHeight: 22 },
    headerWave: {
        position: 'absolute',
        bottom: -20,
        width: '100%',
        height: 40,
        backgroundColor: COLORS.background,
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30
    },

    listContainer: { paddingHorizontal: 20, marginTop: 10 },
    childCard: {
        backgroundColor: '#F3E8FF', // Light Purplish Background as requested
        borderRadius: 20,
        marginBottom: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E9D5FF',
        elevation: 2,
        shadowColor: '#9D5BF0',
        shadowOpacity: 0.1,
        shadowRadius: 8
    },
    cardContent: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    avatarColumn: { marginRight: 16 },
    avatarWrapper: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#fff', padding: 2 },
    avatar: { width: '100%', height: '100%', borderRadius: 30 },

    infoColumn: { flex: 1 },
    childName: { fontSize: 18, fontWeight: 'bold', color: '#1E293B' },
    childDetailText: { fontSize: 13, color: '#6B7280', marginVertical: 4 },

    compactStatsRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
    compactStat: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.6)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    compactStatText: { fontSize: 11, fontWeight: '600', color: '#4B5563', marginLeft: 4 },

    viewProfileBtn: {
        backgroundColor: '#7C3AED',
        height: 44, // Reduced height
        borderRadius: 12,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        alignSelf: 'flex-start', // Not full width
        paddingHorizontal: 20,
        width: '100%' // Actually, let's keep full width but shorter height for better mobile touch, or specific size adjustment? "specific size adjustment" usually means smaller. I'll make it full width but shorter.
    },
    viewProfileText: { color: '#fff', fontSize: 14, fontWeight: 'bold', marginRight: 6 },

    emptyContainer: { alignItems: 'center', marginTop: 100, paddingHorizontal: 40 },
    emptyIconBox: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
    emptyTitle: { fontSize: 20, fontWeight: 'bold', color: '#1E293B', marginBottom: 8 },
    emptySubtext: { fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 22 },
});

export default ChildrenListScreen;
