import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    SafeAreaView,
    ActivityIndicator,
    Dimensions
} from 'react-native';
import { ChevronLeft, ChevronRight, Calendar, UserCheck, UserX, Clock } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SIZES, FONTS } from '../constants/theme';
import { getParentDashboardStats } from '../services/dashboard.service';
import { getStudentAttendanceSummary } from '../services/attendance.service';
import CommonHeader from '../components/CommonHeader';
import dayjs from 'dayjs';

const { width } = Dimensions.get('window');

const AttendanceScreen = ({ navigation, route }) => {
    const { studentId, studentName } = route.params || {};
    const [selectedMonth, setSelectedMonth] = useState(dayjs());
    const [loading, setLoading] = useState(false);
    const [attendanceData, setAttendanceData] = useState([]);
    const [stats, setStats] = useState({ present: 0, absent: 0, percentage: 0 });

    useEffect(() => {
        fetchAttendance();
    }, [selectedMonth]);

    const fetchAttendance = async () => {
        setLoading(true);
        try {
            if (studentId) {
                const response = await getStudentAttendanceSummary(studentId);
                setAttendanceData(response.history || []);
                setStats({
                    present: response.presentDays || 0,
                    absent: response.totalDays - response.presentDays || 0,
                    percentage: response.attendanceRate || 0
                });
            }
        } catch (error) {
            console.error('Error fetching attendance:', error);
        } finally {
            setLoading(false);
        }
    };

    const nextMonth = () => setSelectedMonth(selectedMonth.add(1, 'month'));
    const prevMonth = () => setSelectedMonth(selectedMonth.subtract(1, 'month'));

    const renderHeader = () => (
        <CommonHeader
            title="Attendance"
            showBack={true}
            backgroundColor={COLORS.white}
        />
    );

    const renderMonthSelector = () => (
        <View style={styles.monthSelector}>
            <TouchableOpacity onPress={prevMonth} style={styles.monthNavButton}>
                <ChevronLeft color={COLORS.primary} size={24} />
            </TouchableOpacity>
            <View style={styles.monthDisplay}>
                <Calendar color={COLORS.primary} size={20} style={{ marginRight: 8 }} />
                <Text style={styles.monthText}>{selectedMonth.format('MMMM YYYY')}</Text>
            </View>
            <TouchableOpacity onPress={nextMonth} style={styles.monthNavButton}>
                <ChevronRight color={COLORS.primary} size={24} />
            </TouchableOpacity>
        </View>
    );

    const renderStats = () => (
        <LinearGradient
            colors={[COLORS.primary, COLORS.accent]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.statsCard}
        >
            <View style={styles.statsRow}>
                <View style={styles.statItem}>
                    <Text style={styles.statValue}>{stats.percentage}%</Text>
                    <Text style={styles.statLabel}>Monthly Rate</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                    <Text style={styles.statValue}>{stats.present}</Text>
                    <Text style={styles.statLabel}>Days Present</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                    <Text style={styles.statValue}>{stats.absent}</Text>
                    <Text style={styles.statLabel}>Days Absent</Text>
                </View>
            </View>
        </LinearGradient>
    );

    const renderHistoryItem = (item, index) => {
        const isPresent = item.status === 'Present';
        return (
            <View key={index} style={styles.historyItem}>
                <View style={[styles.statusIndicator, { backgroundColor: isPresent ? '#D1FAE5' : '#FEE2E2' }]}>
                    {isPresent ? <UserCheck size={20} color={COLORS.success} /> : <UserX size={20} color={COLORS.error} />}
                </View>
                <View style={styles.historyContent}>
                    <Text style={styles.historyDate}>{dayjs(item.date).format('dddd, MMM DD')}</Text>
                    <View style={styles.historySub}>
                        <Clock size={14} color={COLORS.gray[400]} style={{ marginRight: 4 }} />
                        <Text style={styles.historyTime}>{isPresent ? `Arrived at ${item.time}` : 'Absent'}</Text>
                    </View>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: isPresent ? COLORS.success + '20' : COLORS.error + '20' }]}>
                    <Text style={[styles.statusBadgeText, { color: isPresent ? COLORS.success : COLORS.error }]}>
                        {item.status}
                    </Text>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            {renderHeader()}
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                <View style={styles.welcomeSection}>
                    <Text style={styles.studentName}>{studentName || 'Student'}'s History</Text>
                    <Text style={styles.subtitle}>Keep track of daily school attendance</Text>
                </View>

                {renderMonthSelector()}
                {renderStats()}

                <View style={styles.historySection}>
                    <Text style={styles.sectionTitle}>Recent Logs</Text>
                    {loading ? (
                        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 20 }} />
                    ) : (
                        attendanceData.map((item, index) => renderHistoryItem(item, index))
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    scrollContent: {
        padding: SIZES.padding,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SIZES.padding,
        paddingVertical: 15,
        backgroundColor: COLORS.white,
    },
    headerTitle: {
        ...FONTS.h3,
        color: COLORS.black,
    },
    backButton: {
        padding: 5,
    },
    welcomeSection: {
        marginBottom: 20,
    },
    studentName: {
        ...FONTS.h2,
        color: COLORS.black,
    },
    subtitle: {
        ...FONTS.body,
        color: COLORS.gray[500],
        marginTop: 4,
    },
    monthSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: COLORS.white,
        borderRadius: SIZES.radius,
        padding: 15,
        marginBottom: 20,
        ...StyleSheet.create({
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 10,
            elevation: 2,
        }),
    },
    monthDisplay: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    monthText: {
        ...FONTS.h4,
        color: COLORS.black,
    },
    monthNavButton: {
        padding: 5,
    },
    statsCard: {
        borderRadius: SIZES.radius * 1.5,
        padding: 20,
        marginBottom: 25,
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    statItem: {
        alignItems: 'center',
        flex: 1,
    },
    statValue: {
        ...FONTS.h2,
        color: COLORS.white,
    },
    statLabel: {
        ...FONTS.small,
        color: COLORS.white,
        opacity: 0.9,
        marginTop: 4,
    },
    statDivider: {
        width: 1,
        height: 40,
        backgroundColor: COLORS.white,
        opacity: 0.3,
    },
    historySection: {
        marginTop: 10,
    },
    sectionTitle: {
        ...FONTS.h4,
        color: COLORS.black,
        marginBottom: 15,
    },
    historyItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        borderRadius: SIZES.radius,
        padding: 15,
        marginBottom: 12,
        ...StyleSheet.create({
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 5,
            elevation: 1,
        }),
    },
    statusIndicator: {
        width: 45,
        height: 45,
        borderRadius: 22.5,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    historyContent: {
        flex: 1,
    },
    historyDate: {
        ...FONTS.h4,
        fontSize: 16,
        color: COLORS.black,
    },
    historySub: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    historyTime: {
        ...FONTS.small,
        color: COLORS.gray[500],
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    statusBadgeText: {
        ...FONTS.small,
        fontWeight: '600',
    },
});

export default AttendanceScreen;
