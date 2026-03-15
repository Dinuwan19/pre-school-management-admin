import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    Modal,
    Image,
    Platform,
    Alert,
    Dimensions,
    Linking
} from 'react-native';
import { Bell, Info, Calendar, ChevronRight, ChevronLeft, ChevronDown, CheckCircle2, Camera, Download, X, BookOpen, MessageSquare } from 'lucide-react-native';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import api from '../config/api';
import { COLORS, SIZES, FONTS } from '../constants/theme';
import dayjs from 'dayjs';
import { getLinkedChildren } from '../services/child.service';
import { getParentMeetings } from '../services/meeting.service';
import { getAvatarSource } from '../constants/avatars';

const { width } = Dimensions.get('window');

const UpdatesScreen = ({ navigation }) => {
    // Data State
    const [announcements, setAnnouncements] = useState([]);
    const [events, setEvents] = useState([]);
    const [meetings, setMeetings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [enrollmentError, setEnrollmentError] = useState(null);

    // UI State
    const [activeTab, setActiveTab] = useState('announcements'); // 'announcements' | 'events' | 'meetings'
    const [isStudentSwitcherVisible, setIsStudentSwitcherVisible] = useState(false);
    const [detailModalVisible, setDetailModalVisible] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [imageModalVisible, setImageModalVisible] = useState(false);
    const [selectedImageUrl, setSelectedImageUrl] = useState(null);
    const [isDownloading, setIsDownloading] = useState(false);

    // Student State
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [availableStudents, setAvailableStudents] = useState([]);

    const fetchUpdates = async () => {
        setLoading(true);
        try {
            // Fetch Announcements (and Homework merged from backend)
            const announcementsRes = await api.get('/notifications');
            setAnnouncements(announcementsRes.data);

            // Fetch Events
            const eventsRes = await api.get('/events?status=ALL');
            setEvents(eventsRes.data);

            // Fetch Meetings
            const meetingsData = await getParentMeetings();
            setMeetings(meetingsData || []);

        } catch (error) {
            console.error('Fetch Updates Error full:', error);
            const errData = error.response?.data || error;
            if (errData.reason === 'NO_ACTIVE_ENROLLMENT') {
                setEnrollmentError(errData.message);
            } else {
                Alert.alert('Error', 'Failed to load updates. Please pull down to refresh.');
            }
        } finally {
            setLoading(false);
        }
    };

    const fetchStudents = async () => {
        try {
            const children = await getLinkedChildren();
            setAvailableStudents(children);
            if (children.length > 0 && !selectedStudent) {
                setSelectedStudent(children[0]);
            }
        } catch (error) {
            console.error('Fetch Students Error:', error);
        }
    };

    const onRefresh = React.useCallback(() => {
        setRefreshing(true);
        Promise.all([fetchUpdates(), fetchStudents()]).then(() => setRefreshing(false));
    }, []);

    useEffect(() => {
        fetchUpdates();
        fetchStudents();
    }, []);

    // Filter Logic
    const filteredAnnouncements = React.useMemo(() => {
        if (!selectedStudent) return announcements;
        return announcements.filter(item => {
            const isSchoolWide = !item.targetClassroomId && !item.targetParentId && (item.targetRole === 'ALL' || item.targetRole === 'PARENT');
            const isForChildClass = item.targetClassroomId && Number(item.targetClassroomId) === Number(selectedStudent.classroomId);
            const isForDirectParent = item.targetParentId && Number(item.targetParentId) === Number(selectedStudent.parentUserId);
            return isSchoolWide || isForChildClass || isForDirectParent;
        });
    }, [announcements, selectedStudent]);

    const filteredEvents = React.useMemo(() => {
        if (!selectedStudent) return events;
        return events.filter(event => {
            const eventClassroomIds = (event.classrooms || []).map(c => Number(c.id));
            const isSchoolWide = eventClassroomIds.length === 0;
            const isForChildClass = eventClassroomIds.includes(Number(selectedStudent.classroomId));
            return isSchoolWide || isForChildClass;
        });
    }, [events, selectedStudent]);

    const filteredMeetings = React.useMemo(() => {
        if (!selectedStudent) return meetings;
        return meetings.filter(m => Number(m.studentId) === Number(selectedStudent.id));
    }, [meetings, selectedStudent]);

    const openDetail = (item) => {
        setSelectedItem(item);
        setDetailModalVisible(true);
    };

    const handleDownload = async () => {
        if (!selectedImageUrl) return;

        setIsDownloading(true);
        try {
            const { status } = await MediaLibrary.requestPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission needed', 'Please grant gallery permissions to download photos.');
                return;
            }

            const fileName = `school_event_${Date.now()}.jpg`;
            const fileUri = `${FileSystem.documentDirectory}${fileName}`;

            const downloadRes = await FileSystem.downloadAsync(selectedImageUrl, fileUri);

            const asset = await MediaLibrary.createAssetAsync(downloadRes.uri);
            await MediaLibrary.createAlbumAsync('SchoolEvents', asset, false);

            Alert.alert('Success', 'Photo saved to your gallery!');
        } catch (error) {
            console.error('Download Error:', error);
            Alert.alert('Error', 'Failed to save photo.');
        } finally {
            setIsDownloading(false);
        }
    };

    const openImageFullscreen = (url) => {
        setSelectedImageUrl(url);
        setImageModalVisible(true);
    };

    const renderHeader = () => (
        <View style={styles.customHeader}>
            <Text style={styles.customHeaderTitle}>Updates & Events</Text>
            <TouchableOpacity
                style={styles.headerAvatarSwitcher}
                onPress={() => setIsStudentSwitcherVisible(true)}
            >
                <Image
                    source={getAvatarSource(selectedStudent?.photoUrl, 'CHILD', null, selectedStudent?.gender)}
                    style={styles.headerAvatar}
                />
                <View style={styles.headerAvatarBadge}>
                    <ChevronDown size={8} color="#fff" />
                </View>
            </TouchableOpacity>
        </View>
    );

    const renderTabs = () => (
        <View style={styles.tabContainer}>
            <TouchableOpacity
                style={[styles.tab, activeTab === 'announcements' && styles.activeTab]}
                onPress={() => setActiveTab('announcements')}
            >
                <Text style={[styles.tabText, activeTab === 'announcements' && styles.activeTabText]}>
                    Announcements
                </Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={[styles.tab, activeTab === 'events' && styles.activeTab]}
                onPress={() => setActiveTab('events')}
            >
                <Text style={[styles.tabText, activeTab === 'events' && styles.activeTabText]}>
                    Events
                </Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={[styles.tab, activeTab === 'meetings' && styles.activeTab]}
                onPress={() => setActiveTab('meetings')}
            >
                <Text style={[styles.tabText, activeTab === 'meetings' && styles.activeTabText]}>
                    Meetings
                </Text>
            </TouchableOpacity>
        </View>
    );

    const renderAnnouncementItem = (item) => {
        const isHomework = item.type === 'HOMEWORK';
        const isAlert = item.type === 'ALERT'; // Fee Reminders (Red)

        let iconColor = '#9D5BF0';
        let bgColor = '#F3EFFF';
        let badgeColor = '#EFF6FF';
        let badgeText = '#3B82F6';
        let label = 'NOTICE';
        let Icon = Bell;

        if (isHomework) {
            iconColor = '#3B82F6';
            bgColor = '#EFF6FF';
            badgeColor = '#F0F9FF';
            badgeText = '#0369A1';
            label = 'HOMEWORK';
            Icon = BookOpen;
        } else if (isAlert) {
            iconColor = '#EF4444';
            bgColor = '#FEF2F2';
            badgeColor = '#FEF2F2';
            badgeText = '#EF4444';
            label = 'PAYMENT';
            Icon = Bell;
        }

        return (
            <TouchableOpacity
                key={`notice-${item.id}`}
                style={styles.card}
                onPress={() => openDetail({ ...item, type: label === 'HOMEWORK' ? 'Homework' : 'Announcement' })}
            >
                <View style={[styles.iconContainer, { backgroundColor: bgColor }]}>
                    <Icon size={24} color={iconColor} />
                </View>
                <View style={styles.content}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                            <Text style={[styles.title, { flexShrink: 1 }]} numberOfLines={0}>{item.title}</Text>
                        </View>
                        <View style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: badgeColor, alignSelf: 'flex-start', flexShrink: 0 }}>
                            <Text style={{ fontSize: 10, fontWeight: 'bold', color: badgeText }}>
                                {label}
                            </Text>
                        </View>
                    </View>
                    <Text style={styles.message} numberOfLines={2}>{item.message}</Text>
                    <View style={styles.cardFooter}>
                        <Text style={styles.date}>
                            {dayjs(item.createdAt).format('MMM DD, YYYY')}
                        </Text>
                        {item.targetClassroomId ? (
                            <View style={styles.miniChildBadge}>
                                <Text style={styles.miniChildBadgeText}>
                                    {selectedStudent && Number(selectedStudent.classroomId) === Number(item.targetClassroomId)
                                        ? selectedStudent.fullName.split(' ')[0]
                                        : (availableStudents.find(c => Number(c.classroomId) === Number(item.targetClassroomId))?.fullName?.split(' ')[0] || 'Class')}
                                </Text>
                            </View>
                        ) : (
                            <View style={[styles.miniChildBadge, { backgroundColor: '#F1F5F9' }]}>
                                <Text style={[styles.miniChildBadgeText, { color: '#64748B' }]}>School</Text>
                            </View>
                        )}
                    </View>
                </View>
                <ChevronRight size={20} color="#CBD5E1" />
            </TouchableOpacity>
        );
    };

    const renderEventItem = (item) => (
        <TouchableOpacity key={`event-${item.id}`} style={styles.card} onPress={() => openDetail({ ...item, type: 'Event' })}>
            <View style={[styles.iconContainer, { backgroundColor: '#ECFDF5' }]}>
                <Calendar size={24} color="#10B981" />
            </View>
            <View style={styles.content}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.message} numberOfLines={2}>
                    {dayjs(item.eventDate).format('MMM DD, YYYY')} • {item.startTime}
                </Text>
                <View style={styles.cardFooter}>
                    <Text style={styles.date}>{item.location || 'School Campus'}</Text>
                    {item.classrooms?.length > 0 ? (
                        <View style={styles.miniChildBadge}>
                            <Text style={styles.miniChildBadgeText}>
                                {selectedStudent && item.classrooms.some(cl => Number(cl.id) === Number(selectedStudent.classroomId))
                                    ? selectedStudent.fullName.split(' ')[0]
                                    : (availableStudents.find(c => item.classrooms.some(cl => Number(cl.id) === Number(c.classroomId)))?.fullName?.split(' ')[0] || 'Class')}
                            </Text>
                        </View>
                    ) : (
                        <View style={[styles.miniChildBadge, { backgroundColor: '#F1F5F9' }]}>
                            <Text style={[styles.miniChildBadgeText, { color: '#64748B' }]}>School</Text>
                        </View>
                    )}
                </View>
                {item.event_media?.length > 0 && (
                    <View style={styles.listMediaBadge}>
                        <Camera size={12} color="#9D5BF0" />
                        <Text style={styles.listMediaBadgeText}>{item.event_media.length} Photos</Text>
                    </View>
                )}
            </View>
            <ChevronRight size={20} color="#CBD5E1" />
        </TouchableOpacity>
    );

    const renderMeetingItem = (item) => (
        <TouchableOpacity key={`meeting-${item.id}`} style={styles.card} onPress={() => { }}>
            <View style={[styles.iconContainer, { backgroundColor: '#F3F0FF' }]}>
                <MessageSquare size={24} color="#9D5BF0" />
            </View>
            <View style={styles.content}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.message} numberOfLines={2}>
                    {dayjs(item.requestDate).format('MMM DD, YYYY')} • {item.preferredTime}
                </Text>
                <Text style={styles.date}>Status: {item.status}</Text>
            </View>
            <ChevronRight size={20} color="#CBD5E1" />
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            {renderHeader()}

            <View style={{ paddingHorizontal: 20, paddingTop: 10 }}>
                {renderTabs()}
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} color="#9D5BF0" />}
            >
                {loading ? (
                    <ActivityIndicator size="large" color="#9D5BF0" style={{ marginTop: 40 }} />
                ) : (
                    activeTab === 'announcements' ? (
                        filteredAnnouncements.length > 0 ? filteredAnnouncements.map(renderAnnouncementItem) : (
                            <View style={styles.emptyContainer}>
                                <Bell size={64} color="#E2E8F0" />
                                <Text style={styles.emptyText}>No recent updates</Text>
                            </View>
                        )
                    ) : activeTab === 'events' ? (
                        filteredEvents.length > 0 ? filteredEvents.map(renderEventItem) : (
                            <View style={styles.emptyContainer}>
                                <Calendar size={64} color="#E2E8F0" />
                                <Text style={styles.emptyText}>No upcoming events</Text>
                            </View>
                        )
                    ) : (
                        filteredMeetings.length > 0 ? filteredMeetings.map(renderMeetingItem) : (
                            <View style={styles.emptyContainer}>
                                <MessageSquare size={64} color="#E2E8F0" />
                                <Text style={styles.emptyText}>No meeting requests</Text>
                            </View>
                        )
                    )
                )}
            </ScrollView>

            {/* Student Switcher Overlay */}
            {isStudentSwitcherVisible && (
                <View style={[styles.dropdownOverlay, { zIndex: 3000 }]}>
                    <TouchableOpacity
                        style={styles.fullScreenTouch}
                        activeOpacity={1}
                        onPress={() => setIsStudentSwitcherVisible(false)}
                    >
                        {/* Touch catcher */}
                    </TouchableOpacity>

                    <View style={styles.dropdownContent}>
                        <View style={styles.dropdownHeader}>
                            <Text style={styles.dropdownTitle}>Switch Student</Text>
                        </View>
                        <View style={styles.dropdownList}>
                            <ScrollView
                                style={{ maxHeight: 300 }}
                                showsVerticalScrollIndicator={true}
                                contentContainerStyle={{ paddingBottom: 10 }}
                            >
                                {(availableStudents || []).map((child) => (
                                    <TouchableOpacity
                                        key={child.id}
                                        style={[
                                            styles.dropdownOption,
                                            selectedStudent?.id === child.id && styles.selectedDropdownOption
                                        ]}
                                        onPress={() => {
                                            setSelectedStudent(child);
                                            setIsStudentSwitcherVisible(false);
                                            // Optionally refetch/filter data here
                                        }}
                                    >
                                        <View style={styles.optionAvatarContainer}>
                                            <Image
                                                source={getAvatarSource(child.photoUrl, 'CHILD', null, child.gender)}
                                                style={styles.optionAvatar}
                                            />
                                            {selectedStudent?.id === child.id && (
                                                <View style={styles.avatarCheck}>
                                                    <CheckCircle2 size={12} color="#fff" />
                                                </View>
                                            )}
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[
                                                styles.optionName,
                                                selectedStudent?.id === child.id && styles.selectedOptionText
                                            ]}>{child.fullName}</Text>
                                            <Text style={styles.optionSub}>{child.classroom || 'Student'}</Text>
                                        </View>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                    </View>
                </View>
            )}

            {/* Detail Modal */}
            <Modal
                visible={detailModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setDetailModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalType}>{selectedItem?.type || 'Details'}</Text>
                            <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
                                <View style={styles.closeBtn}><Text style={styles.closeText}>✕</Text></View>
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            {selectedItem?.type === 'Event' && selectedItem?.mediaUrl && (
                                <TouchableOpacity
                                    activeOpacity={0.9}
                                    onPress={() => openImageFullscreen(selectedItem.mediaUrl.startsWith('http') ? selectedItem.mediaUrl : `${BASE_URL}${selectedItem.mediaUrl}`)}
                                >
                                    <Image
                                        source={{ uri: selectedItem.mediaUrl.startsWith('http') ? selectedItem.mediaUrl : `${BASE_URL}${selectedItem.mediaUrl}` }}
                                        style={styles.modalCover}
                                        resizeMode="cover"
                                    />
                                </TouchableOpacity>
                            )}
                            <Text style={styles.itemTitle}>{selectedItem?.title}</Text>
                            <Text style={styles.itemDate}>
                                {selectedItem?.eventDate
                                    ? `${dayjs(selectedItem.eventDate).format('dddd, MMM DD, YYYY')} • ${selectedItem.startTime}`
                                    : dayjs(selectedItem?.createdAt).format('MMM DD, YYYY')}
                            </Text>

                            <Text style={styles.itemBody}>
                                {selectedItem?.description || selectedItem?.message || 'No details content.'}
                            </Text>

                            {/* Event Media Gallery */}
                            {selectedItem?.type === 'Event' && selectedItem?.event_media?.length > 0 && (
                                <View style={styles.galleryContainer}>
                                    <View style={styles.sectionHeader}>
                                        <Camera size={18} color="#9D5BF0" />
                                        <Text style={styles.sectionTitle}>Event Photos & Files</Text>
                                    </View>
                                    <View style={styles.galleryGrid}>
                                        {selectedItem.event_media.map((media) => (
                                            <TouchableOpacity
                                                key={media.id}
                                                style={styles.galleryItem}
                                                onPress={() => {
                                                    const uri = media.url.startsWith('http') ? media.url : `${BASE_URL}${media.url}`;
                                                    if (media.type === 'IMAGE') {
                                                        openImageFullscreen(uri);
                                                    } else {
                                                        Linking.openURL(uri);
                                                    }
                                                }}
                                            >
                                                {media.type === 'IMAGE' ? (
                                                    <Image
                                                        source={{ uri: media.url.startsWith('http') ? media.url : `${BASE_URL}${media.url}` }}
                                                        style={styles.galleryImage}
                                                    />
                                                ) : (
                                                    <View style={styles.filePlaceholder}>
                                                        <Bell size={24} color="#94A3B8" />
                                                        <Text style={styles.fileText}>File</Text>
                                                    </View>
                                                )}
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>
                            )}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
            {/* Image Viewer Modal */}
            <Modal
                visible={imageModalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setImageModalVisible(false)}
            >
                <View style={styles.imageViewerOverlay}>
                    <TouchableOpacity
                        style={styles.imageViewerCloseBtn}
                        onPress={() => setImageModalVisible(false)}
                    >
                        <X size={28} color="#fff" />
                    </TouchableOpacity>

                    {selectedImageUrl && (
                        <Image
                            source={{ uri: selectedImageUrl }}
                            style={styles.fullscreenImage}
                            resizeMode="contain"
                        />
                    )}

                    <TouchableOpacity
                        style={styles.imageDownloadBtn}
                        onPress={handleDownload}
                        disabled={isDownloading}
                    >
                        {isDownloading ? (
                            <ActivityIndicator color="#fff" size="small" />
                        ) : (
                            <>
                                <Download size={20} color="#fff" />
                                <Text style={styles.imageDownloadText}>Save to Device</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    customHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'ios' ? 60 : 20,
        paddingBottom: 15,
        backgroundColor: '#fff',
    },
    customHeaderTitle: {
        ...FONTS.h2,
        color: '#1E293B',
        fontWeight: 'bold'
    },
    headerAvatarSwitcher: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F3EFFF',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        borderWidth: 1,
        borderColor: '#9D5BF0'
    },
    headerAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
    },
    headerAvatarBadge: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        backgroundColor: '#9D5BF0',
        width: 14,
        height: 14,
        borderRadius: 7,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#fff'
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 4,
        marginBottom: 10
    },
    tab: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 8,
    },
    activeTab: {
        backgroundColor: '#F3EFFF',
    },
    tabText: {
        color: '#64748B',
        fontWeight: '600',
        fontSize: 14
    },
    activeTabText: {
        color: '#9D5BF0',
        fontWeight: 'bold'
    },
    scrollContent: { padding: 20 },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 16,
        marginBottom: 16,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 14,
        backgroundColor: '#F3EFFF',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    content: { flex: 1 },
    title: { fontSize: 16, fontWeight: 'bold', color: '#1E293B', marginBottom: 4 },
    message: { fontSize: 14, color: '#64748B', lineHeight: 20 },
    date: { fontSize: 12, color: '#94A3B8', marginTop: 8 },
    listMediaBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
        backgroundColor: '#F3EFFF',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        alignSelf: 'flex-start',
        gap: 4
    },
    listMediaBadgeText: {
        fontSize: 11,
        color: '#9D5BF0',
        fontWeight: 'bold'
    },
    emptyContainer: { alignItems: 'center', marginTop: 100 },
    emptyText: { marginTop: 16, fontSize: 16, color: '#94A3B8' },

    // Switcher Overlay Styles
    dropdownOverlay: {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
    },
    fullScreenTouch: {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        width: '100%', height: '100%'
    },
    dropdownContent: {
        width: '100%',
        maxWidth: 340,
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 20,
        zIndex: 3001,
        elevation: 5
    },
    dropdownHeader: { alignItems: 'center', marginBottom: 15 },
    dropdownTitle: { fontSize: 18, fontWeight: 'bold', color: '#1E293B' },
    dropdownList: { maxHeight: 300 },
    dropdownOption: {
        flexDirection: 'row', alignItems: 'center',
        padding: 12, borderRadius: 16,
        backgroundColor: '#F8FAFC', marginBottom: 10,
        borderWidth: 1, borderColor: '#F1F5F9'
    },
    selectedDropdownOption: {
        backgroundColor: '#F3EFFF', borderColor: '#9D5BF0'
    },
    optionAvatarContainer: {
        width: 40, height: 40, marginRight: 12, position: 'relative'
    },
    optionAvatar: {
        width: 40, height: 40, borderRadius: 20, backgroundColor: '#E2E8F0', resizeMode: 'cover'
    },
    avatarCheck: {
        position: 'absolute', bottom: -2, right: -2,
        width: 16, height: 16, borderRadius: 8,
        backgroundColor: '#9D5BF0', borderWidth: 1.5, borderColor: '#fff',
        justifyContent: 'center', alignItems: 'center'
    },
    optionName: { fontSize: 15, fontWeight: '600', color: '#1E293B' },
    selectedOptionText: { color: '#9D5BF0' },
    optionSub: { fontSize: 12, color: '#64748B' },

    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end'
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        padding: 24,
        height: '80%',
    },
    modalHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 20
    },
    modalType: {
        fontSize: 14, fontWeight: 'bold', color: '#9D5BF0', textTransform: 'uppercase', letterSpacing: 1
    },
    closeBtn: {
        width: 32, height: 32, borderRadius: 16,
        backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center'
    },
    closeText: {
        fontSize: 16, color: '#64748B', fontWeight: 'bold'
    },
    modalCover: {
        width: '100%', height: 200, borderRadius: 24, marginBottom: 20
    },
    itemTitle: {
        fontSize: 24, fontWeight: 'bold', color: '#1E293B', marginBottom: 8
    },
    itemDate: {
        fontSize: 14, color: '#64748B', marginBottom: 20
    },
    itemBody: {
        fontSize: 16, color: '#334155', lineHeight: 26, marginBottom: 30
    },
    mediaButton: {
        backgroundColor: '#9D5BF0',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 16,
        gap: 10,
        marginBottom: 30
    },
    mediaButtonText: {
        color: '#fff', fontSize: 16, fontWeight: 'bold'
    },
    galleryContainer: { marginTop: 10, marginBottom: 30 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, gap: 8 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1E293B' },
    galleryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    galleryItem: {
        width: (width - 88) / 3, // 3 columns with padding/gap
        aspectRatio: 1,
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: '#F1F5F9',
        borderWidth: 1,
        borderColor: '#F1F5F9'
    },
    galleryImage: { width: '100%', height: '100%' },
    filePlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    fileText: { fontSize: 10, color: '#94A3B8', marginTop: 4 },
    imageViewerOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.95)',
        justifyContent: 'center',
        alignItems: 'center'
    },
    imageViewerCloseBtn: {
        position: 'absolute',
        top: 50,
        right: 20,
        zIndex: 10,
        padding: 10,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 25
    },
    fullscreenImage: {
        width: width,
        height: '70%'
    },
    imageDownloadBtn: {
        position: 'absolute',
        bottom: 50,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#9D5BF0',
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 30,
        gap: 10,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10
    },
    imageDownloadText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold'
    },
    titleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
        paddingRight: 10
    },
    typeBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
    },
    noticeBadge: {
        backgroundColor: '#EFF6FF',
    },
    homeworkBadge: {
        backgroundColor: '#F3EFFF',
    },
    typeBadgeText: {
        fontSize: 10,
        fontWeight: 'bold',
    },
    noticeBadgeText: {
        color: '#3B82F6',
    },
    homeworkBadgeText: {
        color: '#9D5BF0',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
        marginTop: 60
    },
    errorTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#1E293B',
        marginTop: 20
    },
    errorText: {
        fontSize: 15,
        color: '#64748B',
        textAlign: 'center',
        marginTop: 12,
        lineHeight: 22
    },
    logoutBtnSmall: {
        marginTop: 30,
        paddingHorizontal: 24,
        paddingVertical: 12,
        backgroundColor: '#F1F5F9',
        borderRadius: 12
    },
    logoutBtnText: {
        color: '#EF4444',
        fontWeight: 'bold'
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 4
    },
    miniChildBadge: {
        backgroundColor: '#F3EFFF',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    miniChildBadgeText: {
        fontSize: 10,
        color: '#9D5BF0',
        fontWeight: 'bold',
    },
});

export default UpdatesScreen;
