import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Dimensions, ActivityIndicator, Modal, TouchableWithoutFeedback, TextInput, Alert, KeyboardAvoidingView, Platform, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
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
    Pencil,
    Utensils,
    Clock,
    Info,
    Coffee,
    Soup,
    Apple,
    ChefHat,
    Heart,
    Sparkles,
    Sun,
    Moon,
    TrendingUp,
    TrendingDown,
    Minus,
    Palette,
    Globe,
    Zap,
    ChevronDown,
    ChevronUp,
    CheckCircle2
} from 'lucide-react-native';
import { requestMeeting } from '../services/meeting.service';
import api from '../config/api';
import { getStudentDetails as fetchStudentDetails, updateStudentDetails } from '../services/child.service';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { COLORS } from '../constants/theme';
import { AVATARS, getAvatarSource } from '../constants/avatars';
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
    const [attendanceSummary, setAttendanceSummary] = useState(null);
    const [selectedTerm, setSelectedTerm] = useState(1);
    const [skillMetadata, setSkillMetadata] = useState([]);

    // Meeting State
    const [modalVisible, setModalVisible] = useState(false);
    const [meetingTitle, setMeetingTitle] = useState('');
    const [meetingDesc, setMeetingDesc] = useState('');
    const [preferredTime, setPreferredTime] = useState('');
    const [preferredDate, setPreferredDate] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [selectedTeacherId, setSelectedTeacherId] = useState(null);
    const [expandedCategories, setExpandedCategories] = useState([]);

    // Edit State
    const [isEditModalVisible, setIsEditModalVisible] = useState(false);
    const [editField, setEditField] = useState({ label: '', value: '', key: '' });

    const avatarKeys = Object.keys(AVATARS.CHILD);

    useFocusEffect(
        useCallback(() => {
            if (initialStudent?.id) {
                fetchDetails();
            }
        }, [initialStudent?.id])
    );

    const fetchDetails = async () => {
        setLoading(true);
        try {
            const [studentData, attendanceData] = await Promise.all([
                fetchStudentDetails(initialStudent.id),
                api.get(`/attendance/student/${initialStudent.id}`).then(res => res.data).catch(() => null)
            ]);
            const mergedStudent = { ...initialStudent, ...studentData };
            setStudent(mergedStudent);
            setDetails(mergedStudent);
            setAttendanceSummary(attendanceData);

            // Fetch metadata if not loaded
            if (skillMetadata.length === 0) {
                api.get('/students/metadata/skills').then(res => setSkillMetadata(res.data)).catch(() => { });
            }

            // Set initial selected teacher
            if (mergedStudent.availableStaff && mergedStudent.availableStaff.length > 0) {
                const lead = mergedStudent.availableStaff.find(s => s.isLead);
                setSelectedTeacherId(lead ? lead.id : mergedStudent.availableStaff[0].id);
            }
        } catch (error) {
            console.error("Fetch Student Details Error:", error);
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
            await requestMeeting(
                student.id,
                meetingTitle,
                meetingDesc,
                formattedDate,
                preferredTime,
                selectedTeacherId
            );
            Alert.alert('Success', 'Request sent successfully!');
            setModalVisible(false);
            setMeetingTitle(''); setMeetingDesc(''); setPreferredTime(''); setPreferredDate('');
            setSelectedTeacherId(null);
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
                />

                <InfoRow
                    icon={<View style={[styles.iconCircle, { backgroundColor: '#F3E8FF' }]}><Calendar size={18} color="#9D5BF0" /></View>}
                    label="Date of Birth"
                    value={student?.dateOfBirth ? dayjs(student.dateOfBirth).format('MMM DD, YYYY') : 'N/A'}
                />

                <InfoRow
                    icon={<View style={[styles.iconCircle, { backgroundColor: '#F3E8FF' }]}><Activity size={18} color="#9D5BF0" /></View>}
                    label="Gender"
                    value={student?.gender || 'N/A'}
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
                    value={student?.classroom?.teacherprofiles?.[0]?.user?.fullName || 'Teacher Not Assigned'}
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

                <View style={styles.medicalBox}>
                    <View style={styles.medicalHeader}>
                        <View style={styles.statusDot} />
                        <Text style={styles.medicalTitle}>Medical Notes</Text>
                    </View>
                    <Text style={styles.medicalDesc}>{student?.medicalInfo || 'No known allergies'}</Text>
                </View>
            </View>
        </View>
    );

    const renderAttendance = () => (
        <View style={styles.tabContent}>
            <View style={styles.infoSection}>
                <Text style={styles.sectionHeading}>ATTENDANCE SUMMARY</Text>
                <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Present</Text>
                        <Text style={[styles.statValue, { color: '#22C55E' }]}>{attendanceSummary?.presentDays || 0}</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Total Days</Text>
                        <Text style={styles.statValue}>{attendanceSummary?.totalDays || 0}</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Rate</Text>
                        <Text style={[styles.statValue, { color: '#9D5BF0' }]}>{attendanceSummary?.attendanceRate || 0}%</Text>
                    </View>
                </View>
            </View>

            <View style={styles.infoSection}>
                <Text style={styles.sectionHeading}>RECENT HISTORY</Text>
                {attendanceSummary?.history?.length > 0 ? (
                    attendanceSummary.history.map((record, index) => (
                        <View key={index} style={[styles.historyRow, index !== attendanceSummary.history.length - 1 && styles.borderBottom]}>
                            <View>
                                <Text style={styles.historyDate}>{dayjs(record.attendanceDate).format('ddd, MMM DD')}</Text>
                                <Text style={styles.historyTime}>
                                    {record.checkInTime ? dayjs(record.checkInTime).format('hh:mm A') : 'N/A'} - {record.checkOutTime ? dayjs(record.checkOutTime).format('hh:mm A') : 'N/A'}
                                </Text>
                            </View>
                            <View style={[styles.statusTag, { backgroundColor: record.status === 'PRESENT' || record.status === 'COMPLETED' ? '#F0FDF4' : '#FFF1F2' }]}>
                                <Text style={[styles.statusTagText, { color: record.status === 'PRESENT' || record.status === 'COMPLETED' ? '#16A34A' : '#E11D48' }]}>
                                    {record.status}
                                </Text>
                            </View>
                        </View>
                    ))
                ) : (
                    <Text style={styles.emptyText}>No recent attendance records.</Text>
                )}
            </View>
        </View>
    );

    const renderMealPlan = () => {
        let mealData = null;
        try {
            if (student?.classroom?.mealPlan) {
                if (student.classroom.mealPlan.trim().startsWith('{')) {
                    mealData = JSON.parse(student.classroom.mealPlan);
                }
            }
        } catch (e) {
            console.log('Error parsing meal plan:', e);
        }

        const getMealIcon = (text) => {
            const t = text.toLowerCase();
            if (t.includes('breakfast')) return <Coffee size={16} color="#F59E0B" />;
            if (t.includes('lunch')) return <Soup size={16} color="#10B981" />;
            if (t.includes('snack')) return <Apple size={16} color="#EC4899" />;
            if (t.includes('dinner')) return <Moon size={16} color="#6366F1" />;
            return <Utensils size={16} color="#9D5BF0" />;
        };

        const getMealBg = (text) => {
            const t = text.toLowerCase();
            if (t.includes('breakfast')) return '#FFFBEB';
            if (t.includes('lunch')) return '#ECFDF5';
            if (t.includes('snack')) return '#FDF2F8';
            if (t.includes('dinner')) return '#EEF2FF';
            return '#F3F0FF';
        };

        const getMealBorder = (text) => {
            const t = text.toLowerCase();
            if (t.includes('breakfast')) return '#FEF3C7';
            if (t.includes('lunch')) return '#D1FAE5';
            if (t.includes('snack')) return '#FCE7F3';
            if (t.includes('dinner')) return '#E0E7FF';
            return '#EBE5FF';
        };

        return (
            <View style={styles.tabContent}>
                <View style={styles.mealContainer}>
                    <View style={styles.mealHeaderRow}>
                        <View style={styles.mealHeaderIconBox}>
                            <ChefHat size={20} color="#fff" />
                        </View>
                        <View>
                            <Text style={styles.mealHeroTitle}>Weekly Menu</Text>
                            <Text style={styles.mealHeroSub}>Fresh and healthy meals every day</Text>
                        </View>
                    </View>

                    {mealData ? (
                        Object.entries(mealData).map(([day, meal], index) => {
                            const items = meal?.items && Array.isArray(meal.items)
                                ? meal.items
                                : (typeof meal === 'string' ? [meal] : []);

                            return (
                                <View key={index} style={styles.cuteMealCard}>
                                    <View style={styles.dayStrip}>
                                        <Sun size={14} color="#9D5BF0" />
                                        <Text style={styles.cuteMealDay}>{day.toUpperCase()}</Text>
                                    </View>

                                    <View style={styles.mealItemsList}>
                                        {items.length > 0 ? items.map((item, i) => (
                                            <View key={i} style={[styles.fancyMealRow, { backgroundColor: getMealBg(item), borderColor: getMealBorder(item) }]}>
                                                <View style={styles.fancyMealIcon}>{getMealIcon(item)}</View>
                                                <Text style={styles.fancyMealText}>{item}</Text>
                                            </View>
                                        )) : (
                                            <Text style={styles.emptyMealText}>No specific meals listed for this day.</Text>
                                        )}
                                    </View>
                                </View>
                            );
                        })
                    ) : (
                        <View style={styles.emptyMealState}>
                            <View style={styles.emptyMealIllustration}>
                                <Sparkles size={40} color="#9D5BF0" />
                            </View>
                            <Text style={styles.emptyMealTitle}>Menu Under Review</Text>
                            <Text style={styles.emptyMealDesc}>
                                {student?.classroom?.mealPlan && !student.classroom.mealPlan.trim().startsWith('{')
                                    ? student.classroom.mealPlan
                                    : 'Our nutritionists are finalizing the weekly menu. Check back shortly for healthy updates!'}
                            </Text>
                        </View>
                    )}

                    <View style={styles.nutritionNote}>
                        <Heart size={16} color="#EF4444" />
                        <Text style={styles.nutritionNoteText}>
                            All meals are prepared fresh with organic ingredients catering to kids' nutritional needs.
                        </Text>
                    </View>
                </View>
            </View>
        );
    };

    const renderProgress = () => {
        const assessments = details?.assessments || [];
        const currentAssessment = assessments.find(a => a.term === selectedTerm);
        const prevAssessment = assessments.find(a => a.term === selectedTerm - 1);

        const getStatusTheme = (percentage) => {
            if (percentage >= 85) return { label: 'Well Developed', color: '#22C55E', bgColor: '#F0FDF4' };
            if (percentage >= 45) return { label: 'Progressing', color: '#3B82F6', bgColor: '#EFF6FF' };
            return { label: 'Emerging', color: '#EF4444', bgColor: '#FEF2F2' };
        };

        const calculateCategoryStats = (assessment, catId) => {
            if (!assessment || !skillMetadata.length) return 0;
            const category = skillMetadata.find(c => c.id === catId);
            if (!category) return 0;

            const scores = assessment.scores.filter(s => s.subSkill?.categoryId === catId);
            const maxScore = category.skills.length * 3;
            const actualScore = scores.reduce((sum, s) => sum + s.score, 0);
            return maxScore > 0 ? Math.round((actualScore / maxScore) * 100) : 0;
        };

        const toggleCategory = (catId) => {
            setExpandedCategories(prev =>
                prev.includes(catId)
                    ? prev.filter(id => id !== catId)
                    : [...prev, catId]
            );
        };

        const renderTermSelector = () => (
            <View style={styles.termSelector}>
                {[1, 2, 3].map(t => (
                    <TouchableOpacity
                        key={t}
                        style={[styles.termButton, selectedTerm === t && styles.activeTermButton]}
                        onPress={() => setSelectedTerm(t)}
                    >
                        <Text style={[styles.termButtonText, selectedTerm === t && styles.activeTermButtonText]}>Term {t}</Text>
                    </TouchableOpacity>
                ))}
            </View>
        );

        if (!skillMetadata.length) {
            return (
                <View style={styles.loaderContainer}>
                    <ActivityIndicator size="small" color={COLORS.primary} />
                </View>
            );
        }

        return (
            <View style={styles.tabContent}>
                {renderTermSelector()}

                {!currentAssessment ? (
                    <View style={styles.emptyProgress}>
                        <Info size={40} color="#CBD5E1" />
                        <Text style={styles.emptyProgressText}>No assessment recorded for Term {selectedTerm}.</Text>
                    </View>
                ) : (
                    <>
                        <View style={styles.infoSection}>
                            <Text style={styles.sectionHeading}>Developmental Performance</Text>
                            {skillMetadata.map(cat => {
                                const catScores = currentAssessment.scores.filter(s => s.subSkill?.categoryId === cat.id);
                                const totalSkills = cat.skills.length;
                                const markedSkills = catScores.length;

                                let label, color, bgColor, percentage, percentageDisplay;
                                let TrendIcon = Minus;
                                let trendColor = '#94A3B8';

                                const CATEGORY_COLORS = {
                                    'Language Development Skills': '#1890ff', // Blue
                                    'Logical & Mathematical Skills': '#ff4d4f', // Red
                                    'Physical Development Skills': '#52c41a', // Green
                                    'Aesthetic & Creative Skills': '#faad14', // Orange
                                    'Living & Non-Living World': '#7b57e4', // Purple
                                    'Healthy Living Habits': '#2dd4bf', // Teal (Changed from Deep Purple)
                                    'Cultural Heritage & Values': '#eb2f96' // Magenta
                                };
                                const barColor = CATEGORY_COLORS[cat.name] || '#7b57e4';

                                if (markedSkills === 0) {
                                    label = 'Pending';
                                    color = '#64748B';
                                    bgColor = '#F1F5F9';
                                    percentage = 0;
                                    percentageDisplay = '--';
                                } else {
                                    const maxMarkedPossible = markedSkills * 3;
                                    const actualScore = catScores.reduce((sum, s) => sum + s.score, 0);
                                    percentage = Math.round((actualScore / maxMarkedPossible) * 100);
                                    percentageDisplay = `${percentage}%`;

                                    if (markedSkills < totalSkills) {
                                        label = 'In Progress';
                                        color = COLORS.primary;
                                        bgColor = '#F3EFFF';
                                    } else {
                                        if (percentage >= 85) { label = 'Well Developed'; color = '#22C55E'; bgColor = '#F0FDF4'; }
                                        else if (percentage >= 45) { label = 'Progressing'; color = '#3B82F6'; bgColor = '#EFF6FF'; }
                                        else { label = 'Emerging'; color = '#EF4444'; bgColor = '#FEF2F2'; }
                                    }

                                    // Trend Logic (Relative comparison)
                                    const prevCatScores = prevAssessment?.scores.filter(s => s.subSkill?.categoryId === cat.id) || [];
                                    if (prevCatScores.length > 0) {
                                        const prevMaxMarkedPossible = prevCatScores.length * 3;
                                        const prevActual = prevCatScores.reduce((sum, s) => sum + s.score, 0);
                                        const prevPercentage = Math.round((prevActual / prevMaxMarkedPossible) * 100);
                                        if (percentage > prevPercentage) { TrendIcon = TrendingUp; trendColor = '#22C55E'; }
                                        else if (percentage < prevPercentage) { TrendIcon = TrendingDown; trendColor = '#EF4444'; }
                                    }
                                }

                                 const isExpanded = expandedCategories.includes(cat.id);

                                 return (
                                     <View key={cat.id} style={[styles.categoryCard, markedSkills === 0 && { opacity: 0.8 }]}>
                                         <TouchableOpacity
                                             activeOpacity={0.7}
                                             onPress={() => toggleCategory(cat.id)}
                                         >
                                             <View style={styles.categoryHeader}>
                                                 <View style={[styles.themeBadge, { backgroundColor: bgColor }]}>
                                                     <Text style={[styles.themeBadgeText, { color: color }]}>{label}</Text>
                                                 </View>
                                                 <View style={styles.trendRow}>
                                                     <View style={styles.trendBox}>
                                                         <TrendIcon size={16} color={trendColor} />
                                                     </View>
                                                     <View style={[styles.expandIcon, { marginLeft: 10 }]}>
                                                         {isExpanded ? <ChevronUp size={20} color="#94A3B8" /> : <ChevronDown size={20} color="#94A3B8" />}
                                                     </View>
                                                 </View>
                                             </View>
                                             <View style={styles.categoryMain}>
                                                 <Text numberOfLines={1} style={[styles.categoryTitle, markedSkills === 0 && { color: '#64748B' }]}>{cat.name}</Text>
                                                 <Text style={[styles.categoryPercent, { color: barColor }]}>{percentageDisplay}</Text>
                                             </View>
                                             <View style={styles.customProgressBar}>
                                                 <View style={[styles.customProgressFill, { width: `${percentage}%`, backgroundColor: barColor, opacity: markedSkills === 0 ? 0.2 : 1 }]} />
                                             </View>
                                         </TouchableOpacity>

                                         {isExpanded && markedSkills > 0 && (
                                             <View style={styles.expandedContent}>
                                                 <View style={styles.divider} />
                                                 {cat.skills.map((skill) => {
                                                     const scoreObj = catScores.find(s => s.subSkillId === skill.id);
                                                     const score = scoreObj?.score || 0;
                                                     let skillStatus = 'Pending';
                                                     let statusColor = '#94A3B8';

                                                     if (score === 3) { skillStatus = 'Well Developed'; statusColor = '#22C55E'; }
                                                     else if (score === 2) { skillStatus = 'Progressing'; statusColor = '#3B82F6'; }
                                                     else if (score === 1) { skillStatus = 'Emerging'; statusColor = '#EF4444'; }

                                                     return (
                                                         <View key={skill.id} style={styles.subSkillRow}>
                                                             <View style={styles.subSkillInfo}>
                                                                 <Text style={styles.subSkillName}>{skill.name}</Text>
                                                                 <Text style={[styles.subSkillStatus, { color: statusColor }]}>{skillStatus}</Text>
                                                             </View>
                                                             <View style={styles.scoreIndicator}>
                                                                 {[1, 2, 3].map(step => (
                                                                     <View
                                                                         key={step}
                                                                         style={[
                                                                             styles.scoreStep,
                                                                             step <= score && { backgroundColor: statusColor, borderColor: statusColor }
                                                                         ]}
                                                                     />
                                                                 ))}
                                                             </View>
                                                         </View>
                                                     );
                                                 })}
                                             </View>
                                         )}
                                     </View>
                                 );
                             })}
                        </View>

                        <View style={styles.infoSection}>
                            <Text style={styles.sectionHeading}>Focus Areas</Text>
                            <View style={styles.focusContainer}>
                                {currentAssessment.scores.filter(s => s.score === 1).length > 0 ? (
                                    currentAssessment.scores.filter(s => s.score === 1).map((s, idx) => (
                                        <View key={idx} style={styles.focusBadge}>
                                            <Zap size={12} color="#F97316" />
                                            <Text style={styles.focusText}>{s.subSkill?.name}</Text>
                                        </View>
                                    ))
                                ) : (
                                    <Text style={styles.emptyFocusText}>Child is performing well across all areas!</Text>
                                )}
                            </View>
                        </View>

                        <View style={[styles.infoSection, { backgroundColor: '#F8FAFC' }]}>
                            <Text style={styles.sectionHeading}>Teacher's Summary</Text>
                            <View style={styles.noteBox}>
                                <Text style={styles.noteContent}>{currentAssessment.remarks || 'No summary notes added for this term.'}</Text>
                            </View>
                            <View style={styles.assessedBy}>
                                <Text style={styles.assessedByText}>Assessed by {currentAssessment.user?.fullName}</Text>
                            </View>
                        </View>
                    </>
                )}
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
                    <SafeAreaView edges={['top']} style={{ paddingBottom: 60 }}>
                        <View style={styles.profileContainer}>
                            <TouchableOpacity style={styles.profileImgContainer} onPress={() => setIsAvatarModalVisible(true)}>
                                <Image
                                    source={getAvatarSource(student?.photoUrl, 'CHILD', null, student?.gender)}
                                    style={styles.profileImg}
                                />
                                <View style={{ position: 'absolute', bottom: 0, right: 0, backgroundColor: '#fff', borderRadius: 12, padding: 4, elevation: 2 }}>
                                    <Pencil size={12} color="#9D5BF0" />
                                </View>
                            </TouchableOpacity>
                            <View style={styles.profileInfo}>
                                <Text style={styles.studentName}>{student?.fullName}</Text>
                                <Text style={styles.studentSub}>ID: {student?.studentUniqueId}</Text>
                                <View style={styles.statusBadge}>
                                    <View style={styles.activeDot} />
                                    <Text style={styles.statusText}>Active Student</Text>
                                </View>
                            </View>
                        </View>
                    </SafeAreaView>
                </LinearGradient>

                <View style={styles.gridContainer}>
                    <View style={styles.gridRow}>
                        <TouchableOpacity
                            style={[styles.menuCard, activeTab === 'Details' && styles.activeMenuCard]}
                            onPress={() => setActiveTab('Details')}
                        >
                            <View style={[styles.menuIconContainer, activeTab === 'Details' && styles.activeMenuIconContainer]}>
                                <BookOpen size={24} color={activeTab === 'Details' ? '#fff' : '#9D5BF0'} />
                            </View>
                            <View>
                                <Text style={[styles.menuLabel, activeTab === 'Details' && styles.activeMenuLabel]}>Details</Text>
                                <Text style={[styles.menuSubLabel, activeTab === 'Details' && styles.activeMenuSubLabel]}>Bio & Info</Text>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.menuCard, activeTab === 'Progress' && styles.activeMenuCard]}
                            onPress={() => setActiveTab('Progress')}
                        >
                            <View style={[styles.menuIconContainer, activeTab === 'Progress' && styles.activeMenuIconContainer]}>
                                <Activity size={24} color={activeTab === 'Progress' ? '#fff' : '#9D5BF0'} />
                            </View>
                            <View>
                                <Text style={[styles.menuLabel, activeTab === 'Progress' && styles.activeMenuLabel]}>Progress</Text>
                                <Text style={[styles.menuSubLabel, activeTab === 'Progress' && styles.activeMenuSubLabel]}>Performance</Text>
                            </View>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.gridRow}>
                        <TouchableOpacity
                            style={[styles.menuCard, activeTab === 'Attendance' && styles.activeMenuCard]}
                            onPress={() => setActiveTab('Attendance')}
                        >
                            <View style={[styles.menuIconContainer, activeTab === 'Attendance' && styles.activeMenuIconContainer]}>
                                <Calendar size={24} color={activeTab === 'Attendance' ? '#fff' : '#9D5BF0'} />
                            </View>
                            <View>
                                <Text style={[styles.menuLabel, activeTab === 'Attendance' && styles.activeMenuLabel]}>Attendance</Text>
                                <Text style={[styles.menuSubLabel, activeTab === 'Attendance' && styles.activeMenuSubLabel]}>{attendanceSummary ? `${attendanceSummary.attendanceRate}% Rate` : 'History'}</Text>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.menuCard, activeTab === 'Meal Plan' && styles.activeMenuCard]}
                            onPress={() => setActiveTab('Meal Plan')}
                        >
                            <View style={[styles.menuIconContainer, activeTab === 'Meal Plan' && styles.activeMenuIconContainer]}>
                                <Utensils size={24} color={activeTab === 'Meal Plan' ? '#fff' : '#9D5BF0'} />
                            </View>
                            <View>
                                <Text style={[styles.menuLabel, activeTab === 'Meal Plan' && styles.activeMenuLabel]}>Meal Plan</Text>
                                <Text style={[styles.menuSubLabel, activeTab === 'Meal Plan' && styles.activeMenuSubLabel]}>Today's Menu</Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>

                {activeTab === 'Details' && renderDetails()}
                {activeTab === 'Progress' && renderProgress()}
                {activeTab === 'Attendance' && renderAttendance()}
                {activeTab === 'Meal Plan' && renderMealPlan()}
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
                                    {avatarKeys.map((key) => (
                                        <TouchableOpacity
                                            key={key}
                                            style={styles.avatarOption}
                                            onPress={() => {
                                                handleUpdateStudent('photoUrl', key);
                                                setIsAvatarModalVisible(false);
                                            }}
                                        >
                                            <Image source={AVATARS.CHILD[key]} style={styles.gridAvatar} />
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

                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                            <Text style={styles.label}>Student</Text>
                            <View style={styles.staticInput}>
                                <UserIcon size={18} color="#64748B" />
                                <Text style={styles.staticText}>{student?.fullName}</Text>
                            </View>

                            <Text style={styles.label}>Select Staff / Admin</Text>
                            <View style={styles.teacherList}>
                                {details?.availableStaff?.map((staff) => (
                                    <TouchableOpacity
                                        key={staff.id}
                                        style={[
                                            styles.teacherChip,
                                            selectedTeacherId === staff.id && styles.selectedTeacherChip
                                        ]}
                                        onPress={() => setSelectedTeacherId(staff.id)}
                                    >
                                        <View style={{ flex: 1 }}>
                                            <Text style={[
                                                styles.teacherChipName,
                                                selectedTeacherId === staff.id && styles.selectedTeacherChipText
                                            ]}>
                                                {staff.name}
                                            </Text>
                                            <Text style={[
                                                styles.teacherChipRole,
                                                selectedTeacherId === staff.id && styles.selectedTeacherChipText
                                            ]}>
                                                {staff.role} {staff.isLead ? '(Lead)' : ''}
                                            </Text>
                                        </View>
                                        <View style={[
                                            styles.radioOuter,
                                            selectedTeacherId === staff.id && styles.radioActiveOuter
                                        ]}>
                                            {selectedTeacherId === staff.id && <View style={styles.radioInner} />}
                                        </View>
                                    </TouchableOpacity>
                                ))}
                                {(!details?.availableStaff || details.availableStaff.length === 0) && (
                                    <Text style={styles.emptyTextSmall}>No staff found for this classroom.</Text>
                                )}
                            </View>

                            <View style={{ flexDirection: 'row', gap: 10 }}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.label}>Preferred Date</Text>
                                    <TextInput style={styles.input} value={preferredDate} onChangeText={setPreferredDate} placeholder="DD/MM/YYYY" />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.label}>Preferred Time</Text>
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
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1 }}
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
                </KeyboardAvoidingView>
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
    profileImgContainer: { width: 90, height: 90, borderRadius: 45, backgroundColor: 'rgba(255,255,255,0.25)', padding: 3, position: 'relative', overflow: 'visible' },
    profileImg: { width: '100%', height: '100%', borderRadius: 45 },
    editBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#9D5BF0', width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#fff', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3 },

    profileInfo: { marginLeft: 20, flex: 1 },
    studentName: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 2 },
    studentSub: { fontSize: 16, color: 'rgba(255,255,255,0.9)', marginBottom: 8 },
    statusBadge: { backgroundColor: 'rgba(0,0,0,0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start' },
    activeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#4ADE80', marginRight: 8 },
    statusText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },

    gridContainer: { paddingHorizontal: 20, marginTop: -30, marginBottom: 10 },
    gridRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
    menuCard: { width: '48%', height: 130, backgroundColor: '#fff', borderRadius: 28, padding: 20, justifyContent: 'space-between', elevation: 4, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 },
    activeMenuCard: { backgroundColor: '#9D5BF0' },
    menuIconContainer: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#F3EFFF', justifyContent: 'center', alignItems: 'center' },
    activeMenuIconContainer: { backgroundColor: 'rgba(255,255,255,0.2)' },
    menuLabel: { fontSize: 16, fontWeight: 'bold', color: '#1E293B' },
    activeMenuLabel: { color: '#fff' },
    menuSubLabel: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
    activeMenuSubLabel: { color: 'rgba(255,255,255,0.7)' },

    statsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10 },
    statItem: { alignItems: 'center', flex: 1 },
    statLabel: { fontSize: 12, color: '#64748B', marginBottom: 4 },
    statValue: { fontSize: 20, fontWeight: 'bold', color: '#1E293B' },

    historyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
    historyDate: { fontSize: 15, fontWeight: '600', color: '#1E293B' },
    historyTime: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
    statusTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    statusTagText: { fontSize: 11, fontWeight: 'bold' },

    mealCard: { flexDirection: 'row', gap: 16, marginTop: 5 },
    mealIconBox: { width: 60, height: 60, borderRadius: 16, backgroundColor: '#F3EFFF', justifyContent: 'center', alignItems: 'center' },
    mealTitle: { fontSize: 16, fontWeight: 'bold', color: '#1E293B', marginBottom: 4 },
    mealContent: { fontSize: 14, color: '#64748B', lineHeight: 22 },

    tabContent: { padding: 20, paddingTop: 10 },
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
    saveBtnText: { color: '#fff', fontWeight: 'bold' },

    overviewRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
    overviewCard: { width: '48%', backgroundColor: '#fff', borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, elevation: 2, borderWidth: 1, borderColor: '#F1F5F9' },
    overviewIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    overviewLabel: { fontSize: 11, color: '#64748B', fontWeight: '600', marginBottom: 2 },
    overviewValue: { fontSize: 14, fontWeight: 'bold', color: '#1E293B' },
    overviewSub: { fontSize: 10, color: '#94A3B8' },

    teacherList: { marginVertical: 10, gap: 10 },
    teacherChip: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC',
        padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#F1F5F9'
    },
    selectedTeacherChip: { backgroundColor: '#F3EFFF', borderColor: '#9D5BF0' },
    teacherChipName: { fontSize: 16, fontWeight: 'bold', color: '#1E293B' },
    teacherChipRole: { fontSize: 13, color: '#64748B', marginTop: 2 },
    selectedTeacherChipText: { color: '#9D5BF0' },
    radioOuter: {
        width: 20, height: 20, borderRadius: 10, borderWidth: 2,
        borderColor: '#E2E8F0', justifyContent: 'center', alignItems: 'center', marginLeft: 10
    },
    radioActiveOuter: { borderColor: '#9D5BF0' },
    radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#9D5BF0' },
    emptyTextSmall: { fontSize: 13, color: '#94A3B8', fontStyle: 'italic', paddingLeft: 5 },

    mealItem: {
        flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12,
        borderBottomWidth: 1, borderBottomColor: '#F1F5F9'
    },
    mealDay: { fontSize: 14, fontWeight: 'bold', color: '#1E293B', width: 100 },
    mealValue: { fontSize: 14, color: '#64748B', flex: 1, textAlign: 'right' },

    // Cute Meal UI Styles
    mealContainer: { paddingVertical: 5 },
    mealHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    mealHeaderIconBox: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#9D5BF0', justifyContent: 'center', alignItems: 'center', marginRight: 15, elevation: 4, shadowColor: '#9D5BF0', shadowOpacity: 0.3, shadowRadius: 8 },
    mealHeroTitle: { fontSize: 20, fontWeight: 'bold', color: '#1E293B' },
    mealHeroSub: { fontSize: 13, color: '#64748B', marginTop: 2 },
    cuteMealCard: { backgroundColor: '#fff', borderRadius: 24, padding: 15, marginBottom: 15, borderWidth: 1, borderColor: '#F1F5F9', elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 },
    dayStrip: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, backgroundColor: '#F3F0FF', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, gap: 6 },
    cuteMealDay: { fontSize: 12, fontWeight: '800', color: '#9D5BF0', letterSpacing: 1 },
    mealItemsList: { gap: 8 },
    fancyMealRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 16, borderWidth: 1 },
    fancyMealIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.7)', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    fancyMealText: { fontSize: 14, fontWeight: '600', color: '#334155', flex: 1 },
    emptyMealText: { fontSize: 13, color: '#94A3B8', fontStyle: 'italic', paddingLeft: 5 },
    emptyMealState: { alignItems: 'center', padding: 40, backgroundColor: '#F8FAFC', borderRadius: 30, borderWidth: 1, borderColor: '#F1F5F9', borderStyle: 'dashed' },
    emptyMealIllustration: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', marginBottom: 20, elevation: 4, shadowColor: '#000', shadowOpacity: 0.05 },
    emptyMealTitle: { fontSize: 18, fontWeight: 'bold', color: '#1E293B', marginBottom: 8 },
    emptyMealDesc: { fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 20 },
    nutritionNote: { flexDirection: 'row', alignItems: 'center', padding: 15, backgroundColor: '#FFF1F2', borderRadius: 20, marginTop: 10, gap: 12 },
    nutritionNoteText: { fontSize: 12, color: '#E11D48', fontWeight: '500', flex: 1, lineHeight: 18 },
    emptyProgress: { alignItems: 'center', padding: 40, backgroundColor: '#F8FAFC', borderRadius: 12, margin: 16 },
    emptyProgressText: { marginTop: 12, color: '#64748B', textAlign: 'center' },
    termSelector: { flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 8, padding: 4, marginHorizontal: 16, marginBottom: 16 },
    termButton: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 6 },
    activeTermButton: { backgroundColor: '#fff', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
    termButtonText: { color: '#64748B', fontWeight: '500', fontSize: 13 },
    activeTermButtonText: { color: '#9D5BF0', fontWeight: '700' },
    categoryCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#F1F5F9' },
    categoryHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
    themeBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
    themeBadgeText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
    trendBox: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center' },
    categoryMain: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 8 },
    categoryTitle: { fontSize: 14, fontWeight: '600', color: '#1E293B', flex: 1 },
    categoryPercent: { fontSize: 18, fontWeight: '800' },
    customProgressBar: { height: 6, backgroundColor: '#F1F5F9', borderRadius: 3, overflow: 'hidden' },
    customProgressFill: { height: '100%', borderRadius: 3 },
    focusContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    focusBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF7ED', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#FFEDD5' },
    focusText: { marginLeft: 4, fontSize: 12, color: '#C2410C', fontWeight: '500' },
    emptyFocusText: { color: '#22C55E', fontStyle: 'italic', fontSize: 13 },
    assessedBy: { marginTop: 12, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#E2E8F0' },
    assessedByText: { fontSize: 11, color: '#94A3B8', textAlign: 'right' },
    loaderContainer: { height: 200, justifyContent: 'center', alignItems: 'center' },

    trendRow: { flexDirection: 'row', alignItems: 'center' },
    expandedContent: { marginTop: 15, paddingTop: 15 },
    divider: { height: 1, backgroundColor: '#F1F5F9', marginBottom: 15 },
    subSkillRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    subSkillInfo: { flex: 1, marginRight: 10 },
    subSkillName: { fontSize: 14, color: '#475569', fontWeight: '500', marginBottom: 2 },
    subSkillStatus: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
    scoreIndicator: { flexDirection: 'row', gap: 4 },
    scoreStep: { width: 14, height: 6, borderRadius: 3, backgroundColor: '#E2E8F0', borderWidth: 1, borderColor: '#E2E8F0' }
});

export default StudentProfileScreen;
