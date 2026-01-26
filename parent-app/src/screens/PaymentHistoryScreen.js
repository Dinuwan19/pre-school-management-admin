import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    SafeAreaView,
    ActivityIndicator,
    Alert,
    Modal,
    Image,
    Dimensions,
    TextInput
} from 'react-native';
import { ChevronLeft, ChevronRight, CreditCard, Calendar, Download, AlertCircle, CheckCircle2, Upload, Plus, X, User, ChevronDown } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SIZES, FONTS } from '../constants/theme';
import { getChildBillings, getLinkedChildren } from '../services/child.service';
import { uploadPaymentReceipt } from '../services/payment.service';
import CommonHeader from '../components/CommonHeader';
import * as ImagePicker from 'expo-image-picker';
import dayjs from 'dayjs';


const { width } = Dimensions.get('window');

const PaymentHistoryScreen = ({ navigation, route }) => {
    const { studentId: routeStudentId, studentName: routeStudentName } = route.params || {};
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [selectedMonth, setSelectedMonth] = useState(dayjs());
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [image, setImage] = useState(null);
    const [paymentAmount, setPaymentAmount] = useState('15000');
    const [paymentNote, setPaymentNote] = useState('');

    const [paymentStep, setPaymentStep] = useState(1);
    const [selectedMonths, setSelectedMonths] = useState([]);
    const [availableStudents, setAvailableStudents] = useState([]);

    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const [selectedPaymentYear, setSelectedPaymentYear] = useState(dayjs().year());
    const [billings, setBillings] = useState([]);
    const [allBillings, setAllBillings] = useState([]);
    const [stats, setStats] = useState({ totalPaid: '0.00', pending: '0.00' });

    // Modal & Upload State
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedBilling, setSelectedBilling] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [isStudentSwitcherVisible, setIsStudentSwitcherVisible] = useState(false);

    useEffect(() => {
        if (routeStudentId) {
            setSelectedStudent({ id: routeStudentId, fullName: routeStudentName });
        } else {
            fetchData(); // Initial fetch for children and billings
        }
    }, [routeStudentId]);

    useEffect(() => {
        if (selectedStudent?.id) {
            fetchData(selectedMonth);
        }
    }, [selectedStudent, selectedMonth]);

    const fetchData = async (month = selectedMonth) => {
        setLoading(true);
        try {
            const children = await getLinkedChildren();
            setAvailableStudents(children);
            if (!selectedStudent && children.length > 0) {
                setSelectedStudent(children[0]);
            }

            if (selectedStudent) {
                const data = await getChildBillings(selectedStudent.id, month.format('MM'), month.format('YYYY'));
                setBillings(data.billings || []);
                setStats({
                    totalPaid: data.totalPaid || 0,
                    pending: data.pending || 0
                });

                // Fetch all billings (limitless) to help with multi-month mapping
                const allData = await getChildBillings(selectedStudent.id);
                setAllBillings(allData.billings || []);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const pickImage = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaType.Images,
            allowsEditing: true,
            quality: 1,
        });

        if (!result.canceled) {
            setImage(result.assets[0].uri);
        }
    };

    const handlePaymentSubmit = async () => {
        if (!image) {
            Alert.alert('Error', 'Please upload the slip');
            return;
        }

        let billingIds = [];
        if (selectedBilling) {
            billingIds = [selectedBilling.id];
        } else if (selectedMonths.length > 0) {
            // Find billings matching selected months
            // We'll use allBillings which should be fetched
            billingIds = allBillings
                .filter(b => selectedMonths.includes(b.billingMonth))
                .map(b => b.id);

            if (billingIds.length === 0) {
                Alert.alert('Notice', 'No matching invoices found for selected months. Admin will reconcile manually.');
                // We'll proceed if backend allows or handle differently
            }
        }

        setUploading(true);
        try {
            const file = {
                uri: image,
                type: 'image/jpeg',
                name: 'payment_receipt.jpg'
            };

            await uploadPaymentReceipt(
                billingIds,
                paymentAmount,
                'ONLINE_TRANSFER',
                file,
                paymentNote + (selectedMonths.length > 0 ? ` (Months: ${selectedMonths.join(', ')})` : '')
            );

            Alert.alert('Success', 'Payment slip submitted for approval');
            setModalVisible(false);
            setImage(null);
            setSelectedMonths([]);
            fetchData();
        } catch (error) {
            Alert.alert('Error', error.message || 'Failed to submit payment');
        } finally {
            setUploading(false);
        }
    };

    const nextMonth = () => setSelectedMonth(selectedMonth.add(1, 'month'));
    const prevMonth = () => setSelectedMonth(selectedMonth.subtract(1, 'month'));

    const renderHeader = () => (
        <CommonHeader
            title="Payments"
            showBack={true}
            backgroundColor={COLORS.white}
            rightIcon={
                <TouchableOpacity
                    style={styles.childHeaderSwitcher}
                    onPress={() => setIsStudentSwitcherVisible(true)}
                >
                    <Text style={styles.childHeaderSwitcherText}>
                        {selectedStudent?.fullName ? selectedStudent.fullName.split(' ')[0] : 'Select'}
                    </Text>
                    <ChevronDown size={14} color="#9D5BF0" />
                </TouchableOpacity>
            }
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
        <View style={styles.statsContainer}>
            <View style={[styles.statBox, { backgroundColor: COLORS.white }]}>
                <Text style={styles.statLabel}>Total Paid</Text>
                <Text style={[styles.statValue, { color: COLORS.success }]}>LKR {stats.totalPaid}</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: COLORS.white }]}>
                <Text style={styles.statLabel}>Pending</Text>
                <Text style={[styles.statValue, { color: COLORS.error }]}>LKR {stats.pending}</Text>
            </View>
        </View>
    );

    const renderInvoiceItem = (item, index) => {
        const isPaid = item.status === 'PAID' || item.status === 'SUCCESS';
        return (
            <View key={index} style={styles.invoiceCard}>
                <View style={styles.invoiceHeader}>
                    <View style={styles.invoiceInfo}>
                        <Text style={styles.invoiceTitle}>{item.billingMonth}</Text>
                        <Text style={styles.invoiceDate}>Due: {dayjs(item.createdAt).add(7, 'day').format('MMM DD, YYYY')}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: isPaid ? COLORS.success + '20' : COLORS.error + '20' }]}>
                        <Text style={[styles.statusBadgeText, { color: isPaid ? COLORS.success : COLORS.error }]}>
                            {item.status}
                        </Text>
                    </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.invoiceFooter}>
                    <Text style={styles.amount}>LKR {parseFloat(item.amount).toLocaleString()}</Text>
                    {!isPaid ? (
                        <TouchableOpacity
                            style={styles.payButton}
                            onPress={() => {
                                setSelectedBilling(item);
                                setModalVisible(true);
                            }}
                        >
                            <Text style={styles.payButtonText}>Pay Now</Text>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity style={styles.downloadButton}>
                            <Download size={18} color={COLORS.primary} />
                            <Text style={styles.downloadText}>Receipt</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            {renderHeader()}
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                <View style={styles.welcomeSection}>
                    <Text style={styles.studentName}>{selectedStudent?.fullName || 'Student'}'s Billing</Text>
                    <Text style={styles.subtitle}>Manage fees and view payment history</Text>
                </View>

                {renderMonthSelector()}
                {renderStats()}

                <View style={styles.historySection}>
                    <Text style={styles.sectionTitle}>Invoices</Text>
                    {loading ? (
                        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 20 }} />
                    ) : billings.length > 0 ? (
                        billings.map((item, index) => renderInvoiceItem(item, index))
                    ) : (
                        <View style={styles.emptyState}>
                            <AlertCircle size={48} color={COLORS.gray[300]} />
                            <Text style={styles.emptyText}>No invoices for this month</Text>
                        </View>
                    )}
                </View>
                <TouchableOpacity
                    style={styles.makePaymentFab}
                    onPress={() => {
                        setPaymentStep(1);
                        setModalVisible(true);
                    }}
                >
                    <Plus size={24} color="#fff" />
                    <Text style={styles.makePaymentFabText}>Make Payment</Text>
                </TouchableOpacity>
            </ScrollView>

            {/* Payment Modal */}
            {/* Make Payment Modal (New Structured Layout) */}
            <Modal visible={modalVisible} animationType="fade" transparent={true}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <TouchableOpacity onPress={() => { setModalVisible(false); setPaymentStep(1); }}>
                                <ChevronLeft size={24} color="#1E293B" />
                            </TouchableOpacity>
                            <Text style={styles.modalTitle}>Make Payment</Text>
                            <View style={{ width: 24 }} />
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            <View style={styles.paymentCard}>
                                <Text style={styles.modalLabel}>Select Student</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                                    {availableStudents.map(s => (
                                        <TouchableOpacity
                                            key={s.id}
                                            style={[styles.miniStudentOption, selectedStudent?.id === s.id && styles.selectedMiniOption]}
                                            onPress={() => setSelectedStudent(s)}
                                        >
                                            <Text style={[styles.miniOptionText, selectedStudent?.id === s.id && styles.selectedMiniText]}>{s.fullName.split(' ')[0]}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>

                                <View style={styles.yearSelectorRow}>
                                    <Text style={styles.modalLabel}>Select Year</Text>
                                    <View style={styles.yearControls}>
                                        <TouchableOpacity onPress={() => { setSelectedPaymentYear(selectedPaymentYear - 1); setSelectedMonths([]); }}>
                                            <ChevronLeft size={20} color="#9D5BF0" />
                                        </TouchableOpacity>
                                        <Text style={styles.yearValueText}>{selectedPaymentYear}</Text>
                                        <TouchableOpacity onPress={() => { setSelectedPaymentYear(selectedPaymentYear + 1); setSelectedMonths([]); }}>
                                            <ChevronRight size={20} color="#9D5BF0" />
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                <Text style={styles.modalLabel}>Select Months to Pay</Text>
                                <View style={styles.monthsGrid}>
                                    {months.map((m, idx) => {
                                        const isPaid = allBillings.some(b =>
                                            b.billingMonth === m &&
                                            b.billingYear === selectedPaymentYear.toString() &&
                                            (b.status === 'PAID' || b.status === 'SUCCESS' || b.status === 'PENDING')
                                        );
                                        const isSelected = selectedMonths.includes(m);

                                        return (
                                            <TouchableOpacity
                                                key={m}
                                                disabled={isPaid}
                                                style={[
                                                    styles.monthOption,
                                                    isSelected && styles.selectedMonthOption,
                                                    isPaid && styles.disabledMonthOption
                                                ]}
                                                onPress={() => {
                                                    let newSelection = [...selectedMonths];
                                                    if (isSelected) {
                                                        // Check if unselecting breaks continuity
                                                        // Only allow unselecting from the start or end of the current selection
                                                        const monthIndices = newSelection.map(name => months.indexOf(name)).sort((a, b) => a - b);
                                                        const monthIdx = months.indexOf(m);
                                                        if (monthIdx === monthIndices[0] || monthIdx === monthIndices[monthIndices.length - 1]) {
                                                            newSelection = newSelection.filter(x => x !== m);
                                                        } else {
                                                            Alert.alert("Notice", "Please unselect months from the start or end of your range to maintain continuity.");
                                                            return;
                                                        }
                                                    } else {
                                                        // Check for continuity
                                                        if (newSelection.length === 0) {
                                                            newSelection.push(m);
                                                        } else {
                                                            const monthIndices = newSelection.map(name => months.indexOf(name)).sort((a, b) => a - b);
                                                            const minIdx = monthIndices[0];
                                                            const maxIdx = monthIndices[monthIndices.length - 1];
                                                            const currentIdx = idx;

                                                            if (currentIdx === minIdx - 1 || currentIdx === maxIdx + 1) {
                                                                newSelection.push(m);
                                                            } else {
                                                                Alert.alert("Notice", "Please select months in sequence (e.g., January then February).");
                                                                return;
                                                            }
                                                        }
                                                    }
                                                    setSelectedMonths(newSelection);
                                                }}
                                            >
                                                <Text style={[
                                                    styles.monthOptionText,
                                                    isSelected && styles.selectedMonthText,
                                                    isPaid && styles.disabledMonthText
                                                ]}>{m.slice(0, 3)}</Text>
                                                {isPaid && <CheckCircle2 size={10} color="#94A3B8" style={{ marginTop: 2 }} />}
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>

                                <Text style={styles.modalLabel}>Amount (LKR)</Text>
                                <TextInput
                                    style={styles.paymentInput}
                                    value={paymentAmount}
                                    onChangeText={setPaymentAmount}
                                    keyboardType="numeric"
                                    placeholder="0.00"
                                />

                                <Text style={styles.modalLabel}>Upload Payment Slip <Text style={{ color: '#EF4444' }}>*</Text></Text>
                                <TouchableOpacity style={styles.uploadDashedBox} onPress={pickImage}>
                                    {image ? (
                                        <Image source={{ uri: image }} style={styles.previewImage} />
                                    ) : (
                                        <View style={styles.uploadPlaceholder}>
                                            <View style={styles.cloudCircle}>
                                                <Upload size={24} color="#9D5BF0" />
                                            </View>
                                            <Text style={styles.uploadMainText}>Tap to upload slip</Text>
                                            <Text style={styles.uploadSubText}>JPG, PNG, PDF (max 5MB)</Text>
                                        </View>
                                    )}
                                </TouchableOpacity>

                                <Text style={styles.modalLabel}>Note (Optional)</Text>
                                <TextInput
                                    style={[styles.paymentInput, { height: 80, textAlignVertical: 'top' }]}
                                    multiline
                                    value={paymentNote}
                                    onChangeText={setPaymentNote}
                                    placeholder="Any additional details..."
                                />

                                {selectedMonths.length > 0 && (
                                    <View style={styles.paymentSummaryCard}>
                                        <Text style={styles.summaryCardTitle}>Payment Details</Text>
                                        <View style={styles.summaryCardRow}>
                                            <Text style={styles.summaryCardLabel}>Months</Text>
                                            <Text style={styles.summaryCardValue}>{selectedMonths.join(', ')}</Text>
                                        </View>
                                        <View style={styles.summaryCardRow}>
                                            <Text style={styles.summaryCardLabel}>Amount</Text>
                                            <Text style={[styles.summaryCardValue, { color: '#9D5BF0' }]}>LKR {parseFloat(paymentAmount).toLocaleString()}</Text>
                                        </View>
                                    </View>
                                )}

                                <TouchableOpacity
                                    style={[styles.submitPaymentBtn, (!image || selectedMonths.length === 0) && { opacity: 0.5 }]}
                                    onPress={handlePaymentSubmit}
                                    disabled={!image || selectedMonths.length === 0 || uploading}
                                >
                                    {uploading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitPaymentBtnText}>Submit Payment</Text>}
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Student Switcher Modal */}
            <Modal
                visible={isStudentSwitcherVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setIsStudentSwitcherVisible(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setIsStudentSwitcherVisible(false)}
                >
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Select Child</Text>
                            <TouchableOpacity onPress={() => setIsStudentSwitcherVisible(false)}>
                                <Text style={styles.closeBtn}>Close</Text>
                            </TouchableOpacity>
                        </View>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            {availableStudents.map((child) => (
                                <TouchableOpacity
                                    key={child.id}
                                    style={[
                                        styles.childOption,
                                        selectedStudent?.id === child.id && styles.selectedChildOption
                                    ]}
                                    onPress={() => {
                                        setSelectedStudent(child);
                                        setIsStudentSwitcherVisible(false);
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
                                    {selectedStudent?.id === child.id && (
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
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    scrollContent: {
        padding: SIZES.padding,
        paddingBottom: 100,
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
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 25,
    },
    statBox: {
        width: '48%',
        padding: 15,
        borderRadius: SIZES.radius,
        ...StyleSheet.create({
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 10,
            elevation: 2,
        }),
    },
    statLabel: {
        ...FONTS.small,
        color: COLORS.gray[500],
        marginBottom: 5,
    },
    statValue: {
        ...FONTS.h3,
        fontSize: 18,
    },
    historySection: {
        marginTop: 10,
    },
    sectionTitle: {
        ...FONTS.h4,
        color: COLORS.black,
        marginBottom: 15,
    },
    invoiceCard: {
        backgroundColor: COLORS.white,
        borderRadius: SIZES.radius,
        padding: 15,
        marginBottom: 15,
        ...StyleSheet.create({
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 10,
            elevation: 2,
        }),
    },
    invoiceHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    invoiceInfo: {
        flex: 1,
    },
    invoiceTitle: {
        ...FONTS.h4,
        fontSize: 16,
        color: COLORS.black,
    },
    invoiceDate: {
        ...FONTS.small,
        color: COLORS.gray[500],
        marginTop: 2,
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusBadgeText: {
        ...FONTS.small,
        fontSize: 10,
        fontWeight: 'bold',
    },
    divider: {
        height: 1,
        backgroundColor: COLORS.gray[100],
        marginVertical: 12,
    },
    invoiceFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    amount: {
        ...FONTS.h3,
        fontSize: 18,
        color: COLORS.black,
    },
    payButton: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 20,
    },
    payButtonText: {
        color: COLORS.white,
        fontSize: 14,
        fontWeight: '600',
    },
    downloadButton: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    downloadText: {
        ...FONTS.small,
        color: COLORS.primary,
        marginLeft: 4,
        fontWeight: '600',
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyText: {
        ...FONTS.body,
        color: COLORS.gray[400],
        marginTop: 10,
    },
    // Floating Button (Bottom Right)
    makePaymentFab: {
        position: 'absolute',
        bottom: 30,
        right: 24,
        backgroundColor: '#9D5BF0',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderRadius: 28,
        elevation: 10,
        shadowColor: '#9D5BF0',
        shadowOpacity: 0.4,
        shadowRadius: 10,
    },
    makePaymentFabText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 15,
        marginLeft: 8,
    },

    // Multi-month styles
    miniStudentOption: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F1F5F9', marginRight: 8, borderWidth: 1, borderColor: '#E2E8F0' },
    selectedMiniOption: { backgroundColor: '#F3EFFF', borderColor: '#9D5BF0' },
    miniOptionText: { fontSize: 13, color: '#64748B', fontWeight: '600' },
    selectedMiniText: { color: '#9D5BF0' },

    monthsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
    monthOption: { width: '23%', aspectRatio: 1.2, backgroundColor: '#F8FAFC', borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
    selectedMonthOption: { backgroundColor: '#F3EFFF', borderColor: '#9D5BF0' },
    monthOptionText: { fontSize: 13, color: '#64748B', fontWeight: '500' },
    selectedMonthText: { color: '#9D5BF0', fontWeight: 'bold' },

    // Modal Styles
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    modalContent: {
        backgroundColor: '#F8F9FB',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        padding: 24,
        paddingBottom: 40,
        maxHeight: Dimensions.get('window').height * 0.85
    },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#9D5BF0' },

    paymentCard: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 20,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    yearSelectorRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, marginBottom: 8 },
    yearControls: { flexDirection: 'row', alignItems: 'center', gap: 15, backgroundColor: '#F8FAFC', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0' },
    yearValueText: { fontSize: 16, fontWeight: 'bold', color: '#1E293B' },
    disabledMonthOption: { backgroundColor: '#F1F5F9', borderColor: '#E2E8F0', opacity: 0.6 },
    disabledMonthText: { color: '#94A3B8' },
    modalLabel: { fontSize: 13, fontWeight: '600', color: '#64748B', marginBottom: 8 },

    paymentInput: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        padding: 12,
        borderRadius: 12,
        fontSize: 15,
        color: '#1E293B'
    },

    uploadDashedBox: {
        height: 120,
        backgroundColor: '#fff',
        borderRadius: 16,
        borderStyle: 'dashed',
        borderWidth: 1,
        borderColor: '#CBD5E1',
        justifyContent: 'center',
        alignItems: 'center',
        marginVertical: 10,
        overflow: 'hidden'
    },
    uploadPlaceholder: { alignItems: 'center' },
    cloudCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F5F3FF', justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
    uploadMainText: { fontWeight: 'bold', color: '#1E293B', fontSize: 13 },
    uploadSubText: { color: '#94A3B8', fontSize: 10, marginTop: 2 },
    previewImage: { width: '100%', height: '100%' },

    submitPaymentBtn: { backgroundColor: '#A594F9', borderRadius: 16, height: 56, justifyContent: 'center', alignItems: 'center', marginTop: 24 },
    submitPaymentBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },

    // Standard Switcher Styles
    childHeaderSwitcher: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 20,
        backgroundColor: '#F3EFFF',
        borderWidth: 1,
        borderColor: '#9D5BF0'
    },
    childHeaderSwitcherText: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#9D5BF0',
        marginRight: 4
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
    closeBtn: {
        color: '#9D5BF0',
        fontWeight: 'bold',
        fontSize: 16,
    },
    paymentSummaryCard: {
        backgroundColor: '#F5F3FF',
        borderRadius: 16,
        padding: 15,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#DDD6FE',
    },
    summaryCardTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#4B5563',
        marginBottom: 10,
    },
    summaryCardRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 5,
    },
    summaryCardLabel: {
        fontSize: 13,
        color: '#6B7280',
    },
    summaryCardValue: {
        fontSize: 13,
        fontWeight: '600',
        color: '#1F2937',
        flex: 1,
        textAlign: 'right',
        marginLeft: 10,
    },
});

export default PaymentHistoryScreen;
