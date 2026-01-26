import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Dimensions, ActivityIndicator, Modal, TouchableWithoutFeedback, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
    ChevronLeft,
    User,
    Calendar,
    Activity,
    BookOpen,
    Phone,
    X,
    User as UserIcon,
    Pencil
} from 'lucide-react-native';
import { requestMeeting } from '../services/meeting.service';
import { getStudentDetails as fetchStudentDetails, updateStudentDetails } from '../services/child.service';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { COLORS } from '../constants/theme';
import CommonHeader from '../components/CommonHeader';

dayjs.extend(relativeTime);

const { width } = Dimensions.get('window');

const StudentProfileScreen = ({ route, navigation }) => {
    const { student: initialStudent, initialTab } = route.params || {};
    const [student, setStudent] = useState(initialStudent);
    const [details, setDetails] = useState(null);
    const [activeTab, setActiveTab] = useState(initialTab || 'Details');
    const [loading, setLoading] = useState(true);
    const [isAvatarModalVisible, setIsAvatarModalVisible] = useState(false);

    // Meeting State
    const [modalVisible, setModalVisible] = useState(false);
    const [meetingTitle, setMeetingTitle] = useState('');
    const [meetingDesc, setMeetingDesc] = useState('');
    const [preferredTime, setPreferredTime] = useState('');
    const [preferredDate, setPreferredDate] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Edit State
    const [isEditModalVisible, setIsEditModalVisible] = useState(false);
    const [editField, setEditField] = useState({ label: '', value: '', key: '' });

    const avatars = [
        'https://cdn-icons-png.flaticon.com/512/4140/4140048.png',
        'https://cdn-icons-png.flaticon.com/512/4140/4140047.png',
        'https://cdn-icons-png.flaticon.com/512/4140/4140051.png',
        'https://cdn-icons-png.flaticon.com/512/4140/4140049.png',
        'https://cdn-icons-png.flaticon.com/512/4140/4140052.png',
        'https://cdn-icons-png.flaticon.com/512/4140/4140050.png',
    ];

    useEffect(() => {
        if (initialStudent?.id) {
            fetchDetails();
        }
    }, [initialStudent]);

    const fetchDetails = async () => {
        setLoading(true);
        try {
            const data = await fetchStudentDetails(initialStudent.id);
            const mergedStudent = { ...initialStudent, ...data };
            setStudent(mergedStudent);
            setDetails(mergedStudent);
        } catch (error) {
            console.error("Fetch Student Details Error:", error);
            // Fallback to initial student data
            setDetails(initialStudent);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStudent = async (key, value) => {
        setSubmitting(true);
        try {
            const updated = await updateStudentDetails(student.id, { [key]: value });
            const newStudentData = { ...student, ...updated.student };
            setStudent(newStudentData);
            setDetails(newStudentData);
            setIsEditModalVisible(false);
            Alert.alert("Success", "Information updated successfully");
        } catch (error) {
            Alert.alert("Error", error.message || "Failed to update information");
        } finally {
            setSubmitting(false);
        }
    };

    const openEditModal = (label, value, key) => {
        setEditField({ label, value: value || '', key });
        setIsEditModalVisible(true);
    };

    const handleRequestMeeting = async () => {
        if (!meetingTitle || !preferredTime || !preferredDate) {
            Alert.alert('Error', 'Please fill all fields');
            return;
        }
        setSubmitting(true);
        try {
            const [day, month, year] = preferredDate.split('/');
            const formattedDate = `${year}-${month}-${day}`;
            await requestMeeting({
                studentId: student.id,
                title: meetingTitle,
                description: meetingDesc,
                requestDate: formattedDate,
                preferredTime: preferredTime
            });
            Alert.alert('Success', 'Request sent successfully!');
            setModalVisible(false);
            setMeetingTitle(''); setMeetingDesc(''); setPreferredTime(''); setPreferredDate('');
        } catch (error) {
            Alert.alert('Error', 'Failed to send request');
        } finally {
            setSubmitting(false);
        }
    };

    const renderDetails = () => (
        <View style={styles.tabContent}>
            <View style={styles.infoSection}>
                <Text style={styles.sectionHeading}>PERSONAL INFO</Text>

                <InfoRow
                    icon={<View style={[styles.iconCircle, { backgroundColor: '#F3E8FF' }]}><User size={18} color="#9D5BF0" /></View>}
                    label="Full Name"
                    value={student?.fullName}
                    onEdit={() => openEditModal('Full Name', student?.fullName, 'fullName')}
                />

                <InfoRow
                    icon={<View style={[styles.iconCircle, { backgroundColor: '#F3E8FF' }]}><Calendar size={18} color="#9D5BF0" /></View>}
                    label="Date of Birth"
                    value={student?.dateOfBirth ? dayjs(student.dateOfBirth).format('MMM DD, YYYY') : 'N/A'}
                    onEdit={() => openEditModal('Date of Birth', student?.dateOfBirth ? dayjs(student.dateOfBirth).format('YYYY-MM-DD') : '', 'dateOfBirth')}
                />

                <InfoRow
                    icon={<View style={[styles.iconCircle, { backgroundColor: '#F3E8FF' }]}><Activity size={18} color="#9D5BF0" /></View>}
                    label="Gender"
                    value={student?.gender || 'N/A'}
                    onEdit={() => openEditModal('Gender', student?.gender, 'gender')}
                />
            </View>

            <View style={styles.infoSection}>
                <Text style={styles.sectionHeading}>ACADEMIC INFO</Text>

                <InfoRow
                    icon={<View style={[styles.iconCircle, { backgroundColor: '#F3E8FF' }]}><BookOpen size={18} color="#9D5BF0" /></View>}
                    label="Class / Section"
                    value={`${student?.classroom?.name || 'Nursery'}`}
                />

                <InfoRow
                    icon={<View style={[styles.iconCircle, { backgroundColor: '#F3E8FF' }]}><User size={18} color="#9D5BF0" /></View>}
                    label="Class Teacher"
                    value={student?.classroom?.teacherprofile?.[0]?.user?.fullName || 'Ms. Dilani'}
                />

                <InfoRow
                    icon={<View style={[styles.iconCircle, { backgroundColor: '#F3E8FF' }]}><Calendar size={18} color="#9D5BF0" /></View>}
                    label="Admission Date"
                    value={student?.enrollmentDate ? dayjs(student.enrollmentDate).format('MMM DD, YYYY') : 'N/A'}
                />
            </View>

            <View style={[styles.infoSection, { backgroundColor: '#FFF5F5', borderColor: '#FEE2E2', borderWidth: 1 }]}>
                <Text style={[styles.sectionHeading, { color: '#B91C1C' }]}>EMERGENCY</Text>

                <InfoRow
                    icon={<View style={[styles.iconCircle, { backgroundColor: '#FEE2E2' }]}><Phone size={18} color="#DC2626" /></View>}
                    label="Emergency Contact"
                    value={student?.emergencyContact || 'N/A'}
                    showBorder={false}
                    onEdit={() => openEditModal('Emergency Contact', student?.emergencyContact, 'emergencyContact')}
                />

                <TouchableOpacity style={styles.medicalBox} onPress={() => openEditModal('Medical Notes', student?.medicalInfo, 'medicalInfo')}>
                    <View style={styles.medicalHeader}>
                        <View style={styles.statusDot} />
                        <Text style={styles.medicalTitle}>Medical Notes</Text>
                        <Pencil size={12} color="#9D5BF0" style={{ marginLeft: 'auto' }} />
                    </View>
                    <Text style={styles.medicalDesc}>{student?.medicalInfo || 'No known allergies'}</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderProgress = () => {
        const progressHistory = details?.progress || [];
        const latestProgress = (details?.progress && details.progress.length > 0)
            ? details.progress[0]
            : (details?.latestProgress || { remarks: details?.latestRemarks });

        return (
            <View style={styles.tabContent}>
                <View style={styles.infoSection}>
                    <Text style={styles.sectionHeading}>Skills Development</Text>
                    {latestProgress?.id ? (
                        <>
                            <SkillBar label="Reading" percentage={latestProgress.reading || 0} color="#9D5BF0" />
                            <SkillBar label="Writing" percentage={latestProgress.writing || 0} color="#3B82F6" />
                            <SkillBar label="Listening" percentage={latestProgress.listening || 0} color="#22C55E" />
                            <SkillBar label="Speaking" percentage={latestProgress.speaking || 0} color="#F97316" />
                            <SkillBar label="Mathematics" percentage={latestProgress.mathematics || 0} color="#EF4444" />
                            <SkillBar label="Social Skills" percentage={latestProgress.social || 0} color="#A855F7" />
                        </>
                    ) : (
                        <Text style={{ color: '#64748B', fontStyle: 'italic' }}>No skills assessed yet.</Text>
                    )}
                </View>

                <View style={[styles.infoSection, { backgroundColor: '#F8FAFC' }]}>
                    <Text style={styles.sectionHeading}>Teacher Notes</Text>
                    <View style={styles.noteBox}>
                        <Text style={styles.noteContent}>{latestProgress?.remarks || 'No notes added.'}</Text>
                    </View>
                </View>

                <View style={{ marginTop: 10 }}>
                    <Text style={styles.sectionHeading}>Progress History</Text>
                    {progressHistory.length > 0 ? (
                        progressHistory.map((item, index) => (
                            <TimelineItem
                                key={item.id}
                                date={dayjs(item.updatedAt).format('MMM DD, YYYY')}
                                teacher={item.user?.fullName || 'Teacher'}
                                status="Updated"
                                content={item.remarks}
                                tags={[]}
                                isLast={index === progressHistory.length - 1}
                            />
                        ))
                    ) : (
                        <Text style={{ color: '#94A3B8', marginTop: 10 }}>No history available.</Text>
                    )}
                </View>
            </View>
        );
    };

    if (loading && !student) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#9D5BF0" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <CommonHeader
                title="Student Profile"
                showBack={true}
                backgroundColor="transparent"
            />
            <ScrollView showsVerticalScrollIndicator={false}>
                <LinearGradient colors={['#9D5BF0', '#7C3AED']} style={styles.headerBackground}>
                    <SafeAreaView edges={['top']} style={{ paddingBottom: 20 }}>
                        <View style={styles.profileContainer}>
                            <TouchableOpacity
                                style={styles.profileImgContainer}
                                onPress={() => setIsAvatarModalVisible(true)}
                            >
                                <Image
                                    source={student?.photoUrl ? { uri: student.photoUrl } : { uri: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png' }}
                                    style={styles.profileImg}
                                />
                                <View style={styles.editBadge}>
                                    <Pencil size={14} color="#fff" />
                                </View>
                            </TouchableOpacity>
                            <View style={styles.profileInfo}>
                                <Text style={styles.studentName}>{student?.fullName}</Text>
                                <Text style={styles.studentSub}>ID: {student?.studentUniqueId}</Text>
                                <View style={styles.statusBadge}>
                                    <Text style={styles.statusText}>{student?.classroom?.name || 'Nursery'}</Text>
                                </View>
                            </View>
                        </View>
                    </SafeAreaView>
                </LinearGradient>

                <View style={styles.tabBar}>
                    {['Details', 'Progress'].map((tab) => (
                        <TouchableOpacity
                            key={tab}
                            style={styles.tabItem}
                            onPress={() => setActiveTab(tab)}
                        >
                            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>{tab}</Text>
                            {activeTab === tab && <View style={styles.tabIndicator} />}
                        </TouchableOpacity>
                    ))}
                </View>

                {activeTab === 'Details' ? renderDetails() : renderProgress()}
            </ScrollView>

            <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
                <Text style={styles.fabText}>Request Meeting</Text>
            </TouchableOpacity>

            {/* Avatar Modal */}
            <Modal
                visible={isAvatarModalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setIsAvatarModalVisible(false)}
            >
                <TouchableWithoutFeedback onPress={() => setIsAvatarModalVisible(false)}>
                    <View style={styles.modalOverlay}>
                        <TouchableWithoutFeedback>
                            <View style={styles.modalView}>
                                <View style={styles.modalHeader}>
                                    <View style={styles.modalIndicator} />
                                    <Text style={styles.modalTitle}>Choose Avatar</Text>
                                </View>
                                <View style={styles.avatarGrid}>
                                    {avatars.map((url, index) => (
                                        <TouchableOpacity
                                            key={index}
                                            style={styles.avatarOption}
                                            onPress={() => {
                                                handleUpdateStudent('photoUrl', url);
                                                setIsAvatarModalVisible(false);
                                            }}
                                        >
                                            <Image source={{ uri: url }} style={styles.gridAvatar} />
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>

            {/* Meeting Modal */}
            <Modal visible={modalVisible} transparent={true} animationType="slide">
                <View style={[styles.modalOverlay, { justifyContent: 'flex-end' }]}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Request Meeting</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <X size={24} color="#EF4444" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            <Text style={styles.label}>Student</Text>
                            <View style={styles.staticInput}>
                                <UserIcon size={18} color="#64748B" />
                                <Text style={styles.staticText}>{student?.fullName}</Text>
                            </View>

                            <View style={{ flexDirection: 'row', gap: 10 }}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.label}>Date (e.g. 25/01/2026)</Text>
                                    <TextInput style={styles.input} value={preferredDate} onChangeText={setPreferredDate} placeholder="DD/MM/YYYY" />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.label}>Time (e.g. 10:00 AM)</Text>
                                    <TextInput style={styles.input} value={preferredTime} onChangeText={setPreferredTime} placeholder="HH:mm AM" />
                                </View>
                            </View>

                            <Text style={styles.label}>Reason for Meeting</Text>
                            <TextInput
                                style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
                                value={meetingTitle}
                                onChangeText={setMeetingTitle}
                                multiline
                                placeholder="Briefly describe what you'd like to discuss..."
                            />
                            <TouchableOpacity style={styles.submitBtn} onPress={handleRequestMeeting} disabled={submitting}>
                                {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Submit Request</Text>}
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Field Edit Modal */}
            <Modal
                visible={isEditModalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setIsEditModalVisible(false)}
            >
                <TouchableWithoutFeedback onPress={() => setIsEditModalVisible(false)}>
                    <View style={styles.modalOverlay}>
                        <TouchableWithoutFeedback>
                            <View style={[styles.modalView, { paddingBottom: 40 }]}>
                                <Text style={styles.modalTitle}>Edit {editField.label}</Text>
                                <TextInput
                                    style={styles.modalInput}
                                    value={editField.value}
                                    onChangeText={(text) => setEditField({ ...editField, value: text })}
                                    placeholder={`Enter ${editField.label}`}
                                    autoFocus={true}
                                />
                                <View style={styles.modalActions}>
                                    <TouchableOpacity
                                        style={[styles.modalBtn, styles.cancelBtn]}
                                        onPress={() => setIsEditModalVisible(false)}
                                    >
                                        <Text style={styles.cancelBtnText}>Cancel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.modalBtn, styles.saveBtn]}
                                        onPress={() => handleUpdateStudent(editField.key, editField.value)}
                                    >
                                        {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save</Text>}
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
        </View>
    );
};

const InfoRow = ({ icon, label, value, showBorder = true, onEdit }) => (
    <View style={[styles.infoRow, showBorder && styles.borderBottom]}>
        {icon}
        <View style={styles.infoTextContainer}>
            <Text style={styles.infoLabel}>{label}</Text>
            <Text style={styles.infoValue}>{value}</Text>
        </View>
        {onEdit && (
            <TouchableOpacity onPress={onEdit} style={{ marginLeft: 'auto' }}>
                <Text style={{ color: '#9D5BF0', fontWeight: 'bold', fontSize: 13 }}>Edit</Text>
            </TouchableOpacity>
        )}
    </View>
);

const SkillBar = ({ label, percentage, color }) => (
    <View style={styles.skillBarContainer}>
        <View style={styles.skillRow}>
            <Text style={styles.skillLabel}>{label}</Text>
            <Text style={styles.skillValue}>{percentage}%</Text>
        </View>
        <View style={styles.barBackground}>
            <View style={[styles.barFill, { width: `${percentage}%`, backgroundColor: color }]} />
        </View>
    </View>
);

const TimelineItem = ({ date, teacher, status, content, tags, isLast }) => (
    <View style={styles.timelineRow}>
        <View style={styles.timelineLeft}>
            <View style={styles.timelineDot} />
            {!isLast && <View style={styles.timelineLine} />}
        </View>
        <View style={styles.timelineContent}>
            <View style={styles.timelineHeader}>
                <View>
                    <Text style={styles.timelineDate}>{date}</Text>
                    <Text style={styles.timelineTeacher}>By {teacher}</Text>
                </View>
                <View style={styles.excellentBadge}>
                    <Text style={styles.excellentText}>{status}</Text>
                </View>
            </View>
            <View style={styles.timelineCard}>
                <Text style={styles.timelineText}>{content}</Text>
            </View>
        </View>
    </View>
);

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    headerBackground: { paddingBottom: 10, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
    profileContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, marginTop: 10 },
    profileImgContainer: { width: 90, height: 90, borderRadius: 45, backgroundColor: 'rgba(255,255,255,0.2)', padding: 4, position: 'relative' },
    profileImg: { width: '100%', height: '100%', borderRadius: 45 },
    editBadge: { position: 'absolute', bottom: 5, right: 5, backgroundColor: '#9D5BF0', width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#fff' },

    profileInfo: { marginLeft: 20 },
    studentName: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
    studentSub: { fontSize: 15, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
    statusBadge: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start', marginTop: 10 },
    statusText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },

    tabBar: { flexDirection: 'row', backgroundColor: '#fff', paddingHorizontal: 24, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    tabItem: { flex: 1, alignItems: 'center', paddingVertical: 16, position: 'relative' },
    tabText: { fontSize: 15, fontWeight: '600', color: '#94A3B8' },
    activeTabText: { color: '#9D5BF0' },
    tabIndicator: { position: 'absolute', bottom: 0, width: '60%', height: 3, backgroundColor: '#9D5BF0', borderTopLeftRadius: 3, borderTopRightRadius: 3 },

    tabContent: { padding: 20 },
    infoSection: { backgroundColor: '#fff', borderRadius: 24, padding: 20, marginBottom: 20, elevation: 1, shadowColor: '#000', shadowOpacity: 0.02 },
    sectionHeading: { fontSize: 16, fontWeight: 'bold', color: '#1E293B', marginBottom: 15 },

    infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
    borderBottom: { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    iconCircle: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    infoTextContainer: { marginLeft: 16 },
    infoLabel: { fontSize: 12, color: '#94A3B8' },
    infoValue: { fontSize: 16, fontWeight: 'bold', color: '#1E293B', marginTop: 2 },

    medicalBox: { marginTop: 15, backgroundColor: '#FFF', borderRadius: 16, padding: 15, borderStyle: 'dashed', borderWidth: 1, borderColor: '#FECACA' },
    medicalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
    statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444', marginRight: 8 },
    medicalTitle: { fontSize: 14, fontWeight: 'bold', color: '#B91C1C' },
    medicalDesc: { fontSize: 14, color: '#B91C1C' },

    skillBarContainer: { marginBottom: 18 },
    skillRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    skillLabel: { fontSize: 15, fontWeight: 'bold', color: '#4B5563' },
    skillValue: { fontSize: 15, fontWeight: 'bold', color: '#1E293B' },
    barBackground: { height: 8, backgroundColor: '#F1F5F9', borderRadius: 4 },
    barFill: { height: '100%', borderRadius: 4 },

    noteBox: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginTop: 5, borderStyle: 'dashed', borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center' },
    noteContent: { color: '#64748B', fontStyle: 'italic', textAlign: 'center' },

    timelineRow: { flexDirection: 'row', marginBottom: 20 },
    timelineLeft: { width: 30, alignItems: 'center' },
    timelineDot: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#9D5BF0', zIndex: 1 },
    timelineLine: { position: 'absolute', top: 16, bottom: -20, width: 2, backgroundColor: '#F3EFFF' },
    timelineContent: { flex: 1, marginLeft: 10 },
    timelineHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    timelineDate: { fontSize: 16, fontWeight: 'bold', color: '#1E293B' },
    timelineTeacher: { fontSize: 13, color: '#94A3B8' },
    excellentBadge: { backgroundColor: '#F0FDF4', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    excellentText: { color: '#16A34A', fontSize: 12, fontWeight: 'bold' },
    timelineCard: { backgroundColor: '#F8FAFC', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#F1F5F9' },
    timelineText: { fontSize: 14, color: '#4B5563', lineHeight: 20 },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalView: { backgroundColor: '#fff', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 30 },
    modalHeader: { alignItems: 'center', marginBottom: 24, flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
    modalIndicator: { width: 40, height: 4, backgroundColor: '#E2E8F0', borderRadius: 2, position: 'absolute', top: -10, alignSelf: 'center' },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1E293B' },

    avatarGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 15, marginBottom: 30 },
    avatarOption: { width: '30%', aspectRatio: 1, borderRadius: 20, backgroundColor: '#F8F9FA', padding: 10, borderWidth: 1, borderColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
    gridAvatar: { width: '100%', height: '100%', borderRadius: 15 },

    fab: {
        position: 'absolute', bottom: 30, right: 30, backgroundColor: '#8B5CF6', paddingVertical: 14, paddingHorizontal: 24, borderRadius: 30,
        elevation: 8, shadowColor: '#8B5CF6', shadowOpacity: 0.4, shadowRadius: 10
    },
    fabText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },

    modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: 40, maxHeight: '80%' },
    label: { fontSize: 14, fontWeight: '600', color: '#64748B', marginBottom: 6, marginTop: 12 },
    staticInput: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', padding: 14, borderRadius: 12, gap: 10, marginBottom: 8 },
    staticText: { color: '#475569', fontWeight: '600' },
    input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2E8F0', padding: 14, borderRadius: 12, fontSize: 15, color: '#1E293B', marginBottom: 10 },
    submitBtn: { backgroundColor: '#8B5CF6', padding: 18, borderRadius: 16, alignItems: 'center', marginTop: 20, marginBottom: 20 },
    submitBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },

    modalInput: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', padding: 16, borderRadius: 16, fontSize: 16, color: '#1E293B', marginBottom: 20 },
    modalActions: { flexDirection: 'row', gap: 12 },
    modalBtn: { flex: 1, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    cancelBtn: { backgroundColor: '#F1F5F9' },
    saveBtn: { backgroundColor: '#9D5BF0' },
    cancelBtnText: { color: '#64748B', fontWeight: 'bold' },
    saveBtnText: { color: '#fff', fontWeight: 'bold' }
});

export default StudentProfileScreen;
