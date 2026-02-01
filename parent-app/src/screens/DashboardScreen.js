import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image, Dimensions, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import { logout } from '../services/auth.service';
import { LinearGradient } from 'expo-linear-gradient';
import {
    User,
    Calendar,
    CreditCard,
    Bell,
    ChevronDown,
    LogOut,
    Star,
    LayoutGrid,
    Clock,
    BookOpen,
    MessageSquare,
    ChevronRight,
    MapPin
} from 'lucide-react-native';

const { width } = Dimensions.get('window');

import { getParentDashboardStats } from '../services/dashboard.service';
import { COLORS } from '../constants/theme';
import { AVATARS, getAvatarSource } from '../constants/avatars';
import CommonHeader from '../components/CommonHeader';

const DashboardScreen = ({ navigation }) => {
    const [children, setChildren] = useState([]);
    const [selectedChild, setSelectedChild] = useState(null);
    const [stats, setStats] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isChildModalVisible, setIsChildModalVisible] = useState(false);

    useFocusEffect(
        useCallback(() => {
            fetchData();
        }, [])
    );

    const fetchData = useCallback(async () => {
        try {
            const data = await getParentDashboardStats();
            setChildren(data.children);
            // Limit updates to 5
            setStats({
                upcomingEvents: data.upcomingEvents,
                updates: data.updates?.slice(0, 5) || []
            });
            if (data.profile) setProfile(data.profile);

            if (data.children.length > 0) {
                setSelectedChild(data.children[0]);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, []);

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#9D5BF0" animating={true} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <CommonHeader
                title="Home"
                showBack={false}
                backgroundColor={['#9D5BF0', '#7C3AED'][0]} // Matches gradient start
            />
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
                    <View style={styles.headerContent}>
                        <View style={styles.topRow}>
                            <View style={styles.greetingContainer}>
                                <Text style={styles.parentName}>{profile?.fullName || 'Parent'}</Text>
                            </View>
                        </View>

                        <View style={styles.welcomeRow}>
                            <View style={styles.statusDot} />
                            <Text style={styles.welcomeSubtext}>Welcome back to your dashboard</Text>
                        </View>
                    </View>
                </LinearGradient>

                {/* Overlapping Quick Child Card */}
                {selectedChild && (
                    <TouchableOpacity
                        style={styles.childCardContainer}
                        onPress={() => setIsChildModalVisible(true)}
                        activeOpacity={0.9}
                    >
                        <View style={styles.childCard}>
                            <View style={styles.childCardHeader}>
                                <View style={styles.mainAvatarContainer}>
                                    <Image
                                        source={getAvatarSource(selectedChild?.photoUrl, 'CHILD')}
                                        style={styles.mainAvatar}
                                    />
                                </View>
                                <View style={styles.childInfoText}>
                                    <View style={styles.nameRow}>
                                        <Text style={styles.mainChildName}>{selectedChild.fullName}</Text>
                                        <ChevronDown size={18} color="#94A3B8" style={{ marginLeft: 8 }} />
                                    </View>
                                    <Text style={styles.mainChildSub}>{selectedChild.classroom || 'Nursery'} • {selectedChild.teacherName || 'Ms. Dilani'}</Text>
                                    <View style={styles.badgeRow}>
                                        <View style={[styles.badge, selectedChild.attendance === 'Present' ? styles.presentBadge : styles.absentBadge]}>
                                            <Text style={[styles.presentBadgeText, selectedChild.attendance !== 'Present' && { color: '#EF4444' }]}>
                                                {selectedChild.attendance === 'Present' ? 'Present Today' : 'Absent Today'}
                                            </Text>
                                        </View>
                                        <View style={[styles.badge, selectedChild.feeStatus === 'Paid' ? styles.feeBadge : styles.pendingBadge]}>
                                            <Text style={[styles.feeBadgeText, selectedChild.feeStatus !== 'Paid' && { color: '#F59E0B' }]}>
                                                {selectedChild.feeStatus === 'Paid' ? 'Fees Paid' : 'Fees Pending'}
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            </View>
                        </View>
                    </TouchableOpacity>
                )}

                {/* Recent Updates */}
                <View style={styles.sectionContainer}>
                    <View style={styles.sectionHeader}>
                        <View style={[styles.sectionIndicator, { backgroundColor: '#E11D48' }]} />
                        <Text style={styles.sectionTitle}>Recent Updates</Text>
                        <TouchableOpacity style={styles.viewAll} onPress={() => navigation.navigate('Updates', { tab: 'Announcements' })}>
                            <Text style={styles.viewAllText}>View All</Text>
                            <ChevronRight size={14} color="#A855F7" />
                        </TouchableOpacity>
                    </View>

                    {stats?.updates && stats.updates.length > 0 ? (
                        stats.updates.map((update) => (
                            <UpdateCard
                                key={update.id}
                                icon={<Bell size={20} color={update.type === 'ALERT' ? "#EF4444" : "#3B82F6"} />}
                                bgColor={update.type === 'ALERT' ? "#FEF2F2" : "#EFF6FF"}
                                title={update.title}
                                time={update.date}
                                desc={update.message}
                            />
                        ))
                    ) : (
                        <Text style={{ color: '#9CA3AF', fontStyle: 'italic' }}>No recent updates</Text>
                    )}
                </View>

                {/* Upcoming Events */}
                <View style={[styles.sectionContainer, { marginTop: 32 }]}>
                    <View style={styles.sectionHeader}>
                        <View style={[styles.sectionIndicator, { backgroundColor: '#6366F1' }]} />
                        <Text style={styles.sectionTitle}>Upcoming Events</Text>
                        <TouchableOpacity style={styles.viewAll} onPress={() => navigation.navigate('Updates', { tab: 'Events' })}>
                            <Text style={styles.viewAllText}>View All</Text>
                            <ChevronRight size={14} color="#A855F7" />
                        </TouchableOpacity>
                    </View>

                    {stats?.upcomingEvents && stats.upcomingEvents.length > 0 ? (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.eventScroll}>
                            {stats.upcomingEvents.map((event) => (
                                <View key={event.id} style={styles.eventCard}>
                                    <View style={styles.dateBox}>
                                        <Text style={styles.monthText}>{event.date.split(' ')[0].toUpperCase()}</Text>
                                        <Text style={styles.dayText}>{event.date.split(' ')[1]}</Text>
                                    </View>
                                    <View style={styles.eventContent}>
                                        <Text style={styles.eventTitle}>{event.title}</Text>
                                        <View style={styles.eventMetaRow}>
                                            <View style={styles.eventMeta}>
                                                <Calendar size={12} color="#94A3B8" />
                                                <Text style={styles.eventMetaText}>{event.time}</Text>
                                            </View>
                                            <View style={styles.eventMeta}>
                                                <MapPin size={12} color="#94A3B8" />
                                                <Text style={styles.eventMetaText}>School</Text>
                                            </View>
                                        </View>
                                    </View>
                                </View>
                            ))}
                        </ScrollView>
                    ) : (
                        <Text style={{ color: '#9CA3AF', fontStyle: 'italic', marginBottom: 20 }}>No upcoming events</Text>
                    )}
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>

            <Modal
                visible={isChildModalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setIsChildModalVisible(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setIsChildModalVisible(false)}
                >
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Select Child</Text>
                            <TouchableOpacity onPress={() => setIsChildModalVisible(false)}>
                                <Text style={styles.closeBtn}>Close</Text>
                            </TouchableOpacity>
                        </View>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            {children.map((child) => (
                                <TouchableOpacity
                                    key={child.id}
                                    style={[
                                        styles.childOption,
                                        selectedChild?.id === child.id && styles.selectedChildOption
                                    ]}
                                    onPress={() => {
                                        setSelectedChild(child);
                                        setIsChildModalVisible(false);
                                    }}
                                >
                                    <Image
                                        source={getAvatarSource(child.photoUrl, 'CHILD')}
                                        style={styles.optionAvatar}
                                    />
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.optionName}>{child.fullName}</Text>
                                        <Text style={styles.optionSub}>{child.classroom || 'Nursery'}</Text>
                                    </View>
                                    {selectedChild?.id === child.id && (
                                        <View style={styles.activeIndicator} />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
};

const ActionItem = ({ icon, label, bgColor, onPress }) => (
    <TouchableOpacity style={styles.gridItem} onPress={onPress}>
        <View style={[styles.iconBox, { backgroundColor: bgColor }]}>
            {icon}
        </View>
        <Text style={styles.gridLabel}>{label}</Text>
    </TouchableOpacity>
);

const UpdateCard = ({ icon, bgColor, title, time, desc }) => (
    <View style={styles.updateCard}>
        <View style={[styles.updateIconBox, { backgroundColor: bgColor }]}>
            {icon}
        </View>
        <View style={styles.updateContent}>
            <View style={styles.updateHeader}>
                <Text style={styles.updateTitle}>{title}</Text>
                <Text style={styles.updateTime}>{time}</Text>
            </View>
            <Text style={styles.updateDesc}>{desc}</Text>
        </View>
    </View>
);

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    scrollContent: { flexGrow: 1 },
    headerGradient: {
        paddingBottom: 60,
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
    },
    headerContent: { paddingHorizontal: 24, paddingTop: 10, paddingBottom: 20 },
    topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    greetingContainer: { flex: 1 },
    greetingRow: { flexDirection: 'row', alignItems: 'center' },
    morningText: { color: 'rgba(255,255,255,0.8)', fontSize: 16, fontWeight: '500' },
    parentName: { color: '#fff', fontSize: 24, fontWeight: 'bold', marginTop: 2 },
    profileSwitcher: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.2)',
        padding: 2,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    parentAvatar: {
        width: '100%',
        height: '100%',
        borderRadius: 22,
    },
    childSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 24,
        padding: 6,
        paddingRight: 12
    },
    miniAvatar: { width: 32, height: 32, borderRadius: 16, marginRight: 8, backgroundColor: '#fff' },
    selectedChildText: { color: '#fff', fontWeight: 'bold', marginRight: 6 },
    welcomeRow: { flexDirection: 'row', alignItems: 'center', marginTop: -10 },
    statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22C55E', marginRight: 8 },
    welcomeSubtext: { color: 'rgba(255,255,255,0.8)', fontSize: 15 },
    headerDeco: { position: 'absolute', right: 40, top: 80 },
    star1: { position: 'absolute', right: 0, top: 0 },
    star2: { position: 'absolute', right: 100, top: 60 },

    childCardContainer: { paddingHorizontal: 24, marginTop: -60, marginBottom: 20 },
    childCard: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 16,
        elevation: 10,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 20,
    },
    childCardHeader: { flexDirection: 'row', alignItems: 'center' },
    mainAvatarContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#F3F0FF',
        elevation: 2,
        padding: 4
    },
    mainAvatar: { width: '100%', height: '100%', borderRadius: 40 },
    childInfoText: { marginLeft: 16, flex: 1 },
    mainChildName: { fontSize: 22, fontWeight: 'bold', color: '#1F2937' },
    nameRow: { flexDirection: 'row', alignItems: 'center' },
    mainChildSub: { fontSize: 14, color: '#6B7280', marginVertical: 4 },
    badgeRow: { flexDirection: 'row', marginTop: 4 },
    badge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8, marginRight: 8 },
    presentBadge: { backgroundColor: '#F0FDF4' },
    absentBadge: { backgroundColor: '#FEF2F2' },
    feeBadge: { backgroundColor: '#F0F9FF' },
    pendingBadge: { backgroundColor: '#FFFBEB' },
    presentBadgeText: { color: '#16A34A', fontSize: 12, fontWeight: '600' },
    feeBadgeText: { color: '#0369A1', fontSize: 12, fontWeight: '600' },

    sectionContainer: { marginTop: 24, paddingHorizontal: 24 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    sectionIndicator: { width: 4, height: 20, backgroundColor: '#9D5BF0', borderRadius: 2, marginRight: 12 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937', flex: 1 },
    viewAll: { flexDirection: 'row', alignItems: 'center' },
    viewAllText: { color: '#A855F7', fontWeight: 'bold', marginRight: 4, fontSize: 14 },

    grid: { flexDirection: 'row', justifyContent: 'space-between' },
    gridItem: {
        width: (width - 48 - 20) / 3,
        alignItems: 'center'
    },
    iconBox: {
        width: 56,
        height: 56,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 5
    },
    gridLabel: { fontSize: 13, fontWeight: '600', color: '#4B5563' },

    statusRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
    statusCard: {
        width: '48%',
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 12,
        flexDirection: 'row',
        alignItems: 'center',
        elevation: 3,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        borderWidth: 1,
        borderColor: '#F1F5F9'
    },
    statusCardIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#F3E8FF',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10
    },
    statusCardLabel: { fontSize: 11, color: '#6B7280', fontWeight: '500' },
    statusCardValue: { fontSize: 15, fontWeight: 'bold', color: '#1F2937' },

    updateCard: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 16,
        flexDirection: 'row',
        marginBottom: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.03,
        borderWidth: 1,
        borderColor: '#F1F5F9'
    },
    updateIconBox: {
        width: 44,
        height: 44,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16
    },
    updateContent: { flex: 1 },
    updateHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    updateTitle: { fontSize: 16, fontWeight: 'bold', color: '#1F2937' },
    updateTime: { fontSize: 12, color: '#9CA3AF' },
    updateDesc: { fontSize: 13, color: '#64748B', marginTop: 4, lineHeight: 18 },

    eventScroll: { overflow: 'visible' },
    eventCard: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 12,
        marginRight: 16,
        flexDirection: 'row',
        alignItems: 'center',
        width: width * 0.75,
        elevation: 3,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 10,
        borderWidth: 1,
        borderColor: '#F1F5F9'
    },
    dateBox: {
        backgroundColor: '#9D5BF0',
        width: 65,
        height: 65,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center'
    },
    monthText: { color: '#fff', fontSize: 12, fontWeight: '700', opacity: 0.9 },
    dayText: { color: '#fff', fontSize: 24, fontWeight: '900', marginTop: -2 },
    eventContent: { marginLeft: 16, flex: 1 },
    eventTitle: { fontSize: 15, fontWeight: 'bold', color: '#1E293B' },
    eventMetaRow: { flexDirection: 'row', marginTop: 6 },
    eventMeta: { flexDirection: 'row', alignItems: 'center', marginRight: 12 },
    eventMetaText: { fontSize: 11, color: '#94A3B8', marginLeft: 4, fontWeight: '600' },

    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        padding: 24,
        maxHeight: '60%',
        elevation: 20
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1F2937',
    },
    closeBtn: {
        color: '#9D5BF0',
        fontWeight: 'bold',
        fontSize: 16,
    },
    childOption: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    selectedChildOption: {
        backgroundColor: '#F3EFFF',
        borderColor: '#9D5BF0',
    },
    optionAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        marginRight: 16,
    },
    optionName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1F2937',
    },
    optionSub: {
        fontSize: 13,
        color: '#6B7280',
        marginTop: 2,
    },
    activeIndicator: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#9D5BF0',
    },
});

export default DashboardScreen;
