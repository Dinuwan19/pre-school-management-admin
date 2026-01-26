import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions, Modal, TextInput, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
    ChevronDown,
    BookOpen,
    Bell,
    Zap,
    Megaphone
} from 'lucide-react-native';

const { width } = Dimensions.get('window');
import { getHomework, getNotifications } from '../services/meeting.service';
import { getLinkedChildren } from '../services/child.service';
import dayjs from 'dayjs';
import { COLORS } from '../constants/theme';
import CommonHeader from '../components/CommonHeader';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const UpdatesScreen = () => {
    const [activeFilter, setActiveFilter] = useState('All');
    const [updates, setUpdates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [children, setChildren] = useState([]);
    const [selectedChild, setSelectedChild] = useState(null);
    const [isChildModalVisible, setIsChildModalVisible] = useState(false);



    const filters = ['All', 'Homework', 'Alerts', 'News', 'Meeting'];

    useEffect(() => {
        fetchData();
    }, [selectedChild]);

    const fetchData = async () => {
        try {
            const [homeworkData, notifsData, childrenData] = await Promise.all([
                getHomework(),
                getNotifications(),
                getLinkedChildren()
            ]);

            setChildren(childrenData);
            if (childrenData.length > 0) setSelectedChild(childrenData[0]);

            const formattedHomework = homeworkData.map(hw => ({
                id: `hw-${hw.id}`,
                type: 'Homework',
                title: hw.title,
                desc: `Due: ${dayjs(hw.dueDate).format('MMM DD')} • ${hw.description || 'No description'}`,
                time: dayjs(hw.createdAt).fromNow(),
                icon: <BookOpen size={20} color="#3B82F6" />,
                bgColor: '#EFF6FF'
            }));

            const formattedNotifs = notifsData.map(n => ({
                id: `notif-${n.id}`,
                type: n.targetRole === 'ALL' ? 'News' : 'Alerts',
                title: n.title,
                desc: n.message,
                time: dayjs(n.createdAt).fromNow(),
                icon: n.targetRole === 'ALL' ? <Megaphone size={20} color="#F59E0B" /> : <Bell size={20} color="#EF4444" />,
                bgColor: n.targetRole === 'ALL' ? '#FFFBEB' : '#FEF2F2'
            }));

            setUpdates([...formattedHomework, ...formattedNotifs].sort((a, b) => b.id.localeCompare(a.id)));
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };



    const toggleChild = () => {
        if (!children.length) return;
        const currentIndex = children.findIndex(c => c.id === selectedChild?.id);
        const nextIndex = (currentIndex + 1) % children.length;
        setSelectedChild(children[nextIndex]);
    };

    const filteredUpdates = updates.filter(u => {
        const matchesType = activeFilter === 'All' || u.type === activeFilter;
        // Assuming updates have studentId or targetRole. 
        // For MVP, we show all shared updates + specific student updates if they have studentId.
        // But the current mock data/formatting in fetchData doesn't preserve studentId.
        // Let's assume 'Alerts' and 'News' are global (All), 'Homework' is student specific?
        // Actually, let's just filter by Type for now as backend might not link every notif to student.
        return matchesType;
    });

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#9D5BF0" /></View>;

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent} bounces={false} showsVerticalScrollIndicator={false}>
                {/* Gradient Header */}
                <CommonHeader
                    title="Updates"
                    showBack={false}
                    rightIcon={
                        <TouchableOpacity style={styles.childSwitcher} onPress={() => setIsChildModalVisible(true)}>
                            <Text style={styles.selectedChildText}>{selectedChild?.fullName ? selectedChild.fullName.split(' ')[0] : 'All'}</Text>
                            <ChevronDown size={14} color="#fff" />
                        </TouchableOpacity>
                    }
                />

                <View style={styles.bodyContainer}>
                    {/* Filter Tabs */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterContent}>
                        {filters.map(f => (
                            <TouchableOpacity
                                key={f}
                                onPress={() => setActiveFilter(f)}
                                style={[styles.filterTab, activeFilter === f && styles.activeFilterTab]}
                            >
                                <Text style={[styles.filterTabText, activeFilter === f && styles.activeFilterTabText]}>{f}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    {/* Updates List */}
                    <View style={styles.listContainer}>
                        {filteredUpdates.length > 0 ? (
                            filteredUpdates.map(update => (
                                <View key={update.id} style={styles.updateCard}>
                                    <View style={[styles.iconBox, { backgroundColor: update.bgColor }]}>
                                        {update.icon}
                                    </View>
                                    <View style={styles.cardContent}>
                                        <View style={styles.cardHeader}>
                                            <Text style={styles.updateTitle}>{update.title}</Text>
                                            <Text style={styles.updateTime}>{update.time}</Text>
                                        </View>
                                        <Text style={styles.updateDesc}>{update.desc}</Text>
                                    </View>
                                </View>
                            ))
                        ) : (
                            <View style={styles.emptyContainer}>
                                <View style={styles.emptyIconBox}>
                                    <Bell size={40} color="#CBD5E1" />
                                </View>
                                <Text style={styles.emptyTitle}>No Updates</Text>
                                <Text style={styles.emptyText}>You're all caught up! Check back later.</Text>
                            </View>
                        )}
                    </View>
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
                                        source={child.photoUrl ? { uri: child.photoUrl } : { uri: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png' }}
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

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    scrollContent: { flexGrow: 1 },
    headerGradient: { paddingBottom: 60, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
    headerContent: { paddingHorizontal: 24, paddingTop: 10 },
    topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    titleRow: { flexDirection: 'row', alignItems: 'center' },
    headerTitle: { color: '#fff', fontSize: 28, fontWeight: 'bold', marginLeft: 10 },
    headerSubtext: { color: 'rgba(255,255,255,0.8)', fontSize: 16, marginTop: 8, maxWidth: width * 0.6 },
    childSwitcher: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20
    },
    selectedChildText: { color: '#fff', fontWeight: 'bold', marginRight: 6 },
    optionAvatar: { width: 44, height: 44, borderRadius: 22, marginRight: 15 },

    bodyContainer: { marginTop: -25 },
    filterScroll: { marginBottom: 20 },
    filterContent: { paddingHorizontal: 24 },
    filterTab: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 20,
        backgroundColor: '#fff',
        marginRight: 10,
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 5
    },
    activeFilterTab: { backgroundColor: '#9D5BF0' },
    filterTabText: { color: '#64748B', fontWeight: '600', fontSize: 15 },
    activeFilterTabText: { color: '#fff' },

    listContainer: { paddingHorizontal: 24 },
    updateCard: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 20,
        flexDirection: 'row',
        marginBottom: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.03,
        borderWidth: 1,
        borderColor: '#F1F5F9'
    },
    iconBox: {
        width: 44,
        height: 44,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16
    },
    cardContent: { flex: 1 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    updateTitle: { fontSize: 16, fontWeight: 'bold', color: '#1E293B' },
    updateTime: { fontSize: 12, color: '#94A3B8' },
    updateDesc: { fontSize: 14, color: '#64748B', marginTop: 6, lineHeight: 20 },

    fab: { position: 'absolute', bottom: 30, right: 24, left: 24, elevation: 8, shadowColor: '#9D5BF0', shadowOpacity: 0.3, shadowRadius: 15 },
    fabGradient: { height: 60, borderRadius: 30, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
    fabText: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginLeft: 12 },

    emptyContainer: { alignItems: 'center', marginTop: 80, padding: 20 },
    emptyIconBox: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
    emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#1E293B', marginBottom: 8 },
    emptyText: { color: '#64748B', textAlign: 'center' },

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

export default UpdatesScreen;
