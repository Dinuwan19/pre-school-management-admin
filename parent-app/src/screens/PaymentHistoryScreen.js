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
    TextInput,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import { ChevronLeft, ChevronRight, CreditCard, Calendar, Download, AlertCircle, CheckCircle2, Upload, Plus, X, User, ChevronDown } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SIZES, FONTS } from '../constants/theme';
import { AVATARS, getAvatarSource } from '../constants/avatars';
import { getChildBillings, getLinkedChildren } from '../services/child.service';
import { uploadPaymentReceipt } from '../services/payment.service';
import * as DocumentPicker from 'expo-document-picker';
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
    const [paymentFor, setPaymentFor] = useState('Monthly Fee');

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
        (async () => {
            if (Platform.OS !== 'web') {
                const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                if (status !== 'granted') {
                    Alert.alert('Permission Denied', 'We need access to your gallery to upload payment slips.');
                }
            }
        })();
    }, []);

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
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['image/*', 'application/pdf'],
                copyToCacheDirectory: true,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const file = result.assets[0];
                setImage(file);
            }
        } catch (err) {
            console.log('Document picker error:', err);
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
            billingIds = allBillings
                .filter(b => selectedMonths.includes(b.billingMonth))
                .map(b => b.id);

            if (billingIds.length === 0) {
                Alert.alert(
                    'Notice',
                    'No matching invoices found for selected months. This will be recorded as a generic payment on account. Admin will reconcile manually.',
                    [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Proceed', onPress: () => processSubmission(billingIds) }
                    ]
                );
                return;
            }
        }

        processSubmission(billingIds);
    };

    const processSubmission = async (billingIds) => {
        setUploading(true);
        try {
            const file = {
                uri: image.uri,
                type: image.mimeType || 'image/jpeg',
                name: image.name || 'payment_receipt.jpg'
            };

            await uploadPaymentReceipt(
                billingIds,
                paymentAmount,
                'ONLINE_TRANSFER',
                file,
                `[Student: ${selectedStudent?.fullName || 'Unknown'}] ` + (paymentFor ? `[${paymentFor}] ` : '') + paymentNote + (selectedMonths.length > 0 ? ` (Months: ${selectedMonths.join(', ')})` : '')
            );

            Alert.alert('Success', 'Payment slip submitted for approval');
            setModalVisible(false);
            setImage(null);
            setSelectedMonths([]);
            fetchData();
        } catch (error) {
            console.log('Submission Error:', error);
            Alert.alert('Error', JSON.stringify(error) || error.message || 'Failed to submit payment');
        } finally {
            setUploading(false);
        }
    };

    const nextMonth = () => setSelectedMonth(selectedMonth.add(1, 'month'));
    const prevMonth = () => setSelectedMonth(selectedMonth.subtract(1, 'month'));

    const renderHeader = () => (
        <View style={styles.customHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBackBtn}>
                    <ChevronLeft size={24} color="#1E293B" />
                </TouchableOpacity>
                <Text style={styles.customHeaderTitle}>Payments</Text>
            </View>
            <TouchableOpacity
                style={styles.headerAvatarSwitcher}
                onPress={() => {
                    console.log('Opening switcher...');
                    setIsStudentSwitcherVisible(true);
                }}
                hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
            >
                <Image
                    source={getAvatarSource(selectedStudent?.photoUrl, 'CHILD')}
                    style={styles.headerAvatar}
                />
                <View style={styles.headerAvatarBadge}>
                    <ChevronDown size={8} color="#fff" />
                </View>
            </TouchableOpacity>
        </View>
    );

    const renderMonthSelector = () => (
        <View style={styles.modernMonthSelector}>
            <LinearGradient
                colors={['#F8FAFC', '#F1F5F9']}
                style={styles.monthPill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                <TouchableOpacity onPress={prevMonth} style={styles.modernMonthNav}>
                    <ChevronLeft color="#64748B" size={20} />
                </TouchableOpacity>
                <View style={styles.modernMonthDisplay}>
                    <Calendar color="#9D5BF0" size={18} />
                    <Text style={styles.modernMonthText}>{selectedMonth.format('MMMM YYYY')}</Text>
                </View>
                <TouchableOpacity onPress={nextMonth} style={styles.modernMonthNav}>
                    <ChevronRight color="#64748B" size={20} />
                </TouchableOpacity>
            </LinearGradient>
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
        const dueDate = dayjs(item.createdAt).add(7, 'day');
        const isOverdue = !isPaid && dayjs().isAfter(dueDate);

        // Determine Status Color & Text
        let statusColor = COLORS.error; // Default Red for Overdue
        let statusBg = COLORS.error + '20';
        let statusText = 'Overdue';

        if (isPaid) {
            statusColor = '#059669'; // Emerald
            statusBg = '#ECFDF5';
            statusText = 'Paid';
        } else if (item.status === 'PENDING') {
            statusColor = '#D97706'; // Amber
            statusBg = '#FFFBEB';
            statusText = 'Pending Approval';
        } else if (isOverdue) {
            statusColor = '#DC2626'; // Red
            statusBg = '#FEF2F2';
            statusText = 'Overdue';
        } else {
            statusColor = '#2563EB'; // Blue
            statusBg = '#EFF6FF';
            statusText = 'Unpaid';
        }

        return (
            <View key={index} style={styles.invoiceListItem}>
                <View style={styles.invoiceListLeft}>
                    <Text style={styles.invoiceListTitle}>{item.billingMonth} {item.billingYear}</Text>
                    <Text style={styles.invoiceListDate}>{dayjs(item.createdAt).format('DD MMM YYYY')}</Text>
                </View>
                <View style={styles.invoiceListRight}>
                    <Text style={styles.invoiceListAmount}>Rs. {parseFloat(item.amount).toLocaleString()}</Text>
                    <View style={[styles.statusBadgeSmall, { backgroundColor: statusBg }]}>
                        <Text style={[styles.statusBadgeTextSmall, { color: statusColor }]}>
                            {statusText}
                        </Text>
                    </View>
                </View>
            </View>
        );
    };

    const renderPaymentInfo = () => (
        <View style={styles.paymentInfoBox}>
            <Text style={styles.paymentInfoTitle}>Payment Information</Text>

            <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Monthly Fee</Text>
                <Text style={styles.infoValue}>Rs. 15,000</Text>
            </View>

            <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Payment Due Date</Text>
                <Text style={styles.infoValue}>5th of each month</Text>
            </View>
        </View>
    );

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

                <View style={[styles.historySection, { backgroundColor: '#fff', borderRadius: 20, padding: 15, elevation: 2 }]}>
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

                {renderPaymentInfo()}
            </ScrollView>

            {/* Floating Action Button - Hide when modal is open */}
            {!modalVisible && (
                <TouchableOpacity
                    style={styles.fab}
                    onPress={() => {
                        setPaymentStep(1);
                        setModalVisible(true);
                    }}
                >
                    <Text style={styles.fabText}>Make Payment</Text>
                </TouchableOpacity>
            )}

            {/* Payment Modal - Replaced with Absolute View for navigation availability */}
            {modalVisible && (
                <View style={[styles.modalOverlay, { zIndex: 2000 }]}>
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        style={styles.modalContentFull}
                    >
                        <View style={styles.modalHeaderBorder}>
                            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalBackBtn}>
                                <ChevronLeft size={24} color="#000" />
                            </TouchableOpacity>
                            <Text style={styles.modalTitleBlack}>Make Payment</Text>
                            <View style={{ width: 24 }} />
                        </View>

                        <ScrollView
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
                            keyboardShouldPersistTaps="always"
                        >
                            <Text style={styles.inputLabel}>Payment For</Text>
                            <TextInput
                                style={styles.styledInput}
                                placeholder="e.g., Monthly Fee"
                                value={paymentFor}
                                onChangeText={setPaymentFor}
                            />

                            <Text style={styles.inputLabel}>Description (Optional)</Text>
                            <TextInput
                                style={[styles.styledInput, { height: 80, textAlignVertical: 'top' }]}
                                placeholder="Any additional details..."
                                multiline
                                value={paymentNote}
                                onChangeText={setPaymentNote}
                            />

                            <View style={styles.yearSelectorRowRefined}>
                                <Text style={styles.inputLabelNoMargin}>Select Year</Text>
                                <View style={styles.yearControlsRefined}>
                                    <TouchableOpacity onPress={() => { setSelectedPaymentYear(selectedPaymentYear - 1); setSelectedMonths([]); }}>
                                        <ChevronLeft size={20} color="#9D5BF0" />
                                    </TouchableOpacity>
                                    <Text style={styles.yearValueTextRefined}>{selectedPaymentYear}</Text>
                                    <TouchableOpacity onPress={() => { setSelectedPaymentYear(selectedPaymentYear + 1); setSelectedMonths([]); }}>
                                        <ChevronRight size={20} color="#9D5BF0" />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <Text style={styles.inputLabel}>Select Months to Pay</Text>
                            <View style={styles.monthsGridRefined}>
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
                                                styles.monthOptionRefined,
                                                isSelected && styles.selectedMonthOptionRefined,
                                                isPaid && styles.disabledMonthOptionRefined
                                            ]}
                                            onPress={() => {
                                                let newSelection = [...selectedMonths];
                                                if (isSelected) {
                                                    const monthIndices = newSelection.map(name => months.indexOf(name)).sort((a, b) => a - b);
                                                    const monthIdx = months.indexOf(m);
                                                    if (monthIdx === monthIndices[0] || monthIdx === monthIndices[monthIndices.length - 1]) {
                                                        newSelection = newSelection.filter(x => x !== m);
                                                    } else {
                                                        Alert.alert("Notice", "Please unselect months from the start or end of your range to maintain continuity.");
                                                        return;
                                                    }
                                                } else {
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
                                                styles.monthOptionTextRefined,
                                                isSelected && styles.selectedMonthTextRefined,
                                                isPaid && styles.disabledMonthTextRefined
                                            ]}>{m.slice(0, 3)}</Text>
                                            {isPaid && <CheckCircle2 size={10} color="#94A3B8" style={{ marginTop: 2 }} />}
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            <Text style={styles.inputLabel}>Amount (Rs.)</Text>
                            <TextInput
                                style={styles.styledInput}
                                placeholder="e.g., 15000"
                                keyboardType="numeric"
                                value={paymentAmount}
                                onChangeText={setPaymentAmount}
                            />

                            <Text style={styles.inputLabel}>Upload Payment Slip</Text>
                            <TouchableOpacity
                                style={styles.uploadBoxRefined}
                                onPress={() => {
                                    console.log('Pick image pressed');
                                    pickImage();
                                }}
                                activeOpacity={0.7}
                            >
                                {image ? (
                                    image.mimeType === 'application/pdf' ? (
                                        <View style={[styles.uploadedImage, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#F1F5F9' }]}>
                                            <Download size={32} color="#94A3B8" />
                                            <Text style={{ marginTop: 8, color: '#64748B', fontWeight: 'bold' }}>{image.name}</Text>
                                        </View>
                                    ) : (
                                        <Image source={{ uri: image.uri }} style={styles.uploadedImage} />
                                    )
                                ) : (
                                    <View style={styles.uploadContent}>
                                        <Upload size={32} color="#CBD5E1" />
                                        <Text style={styles.uploadLink}>Click to upload or drag and drop</Text>
                                        <Text style={styles.uploadHint}>PNG, JPG, PDF up to 5MB</Text>
                                    </View>
                                )}
                            </TouchableOpacity>

                            <View style={styles.modalFooterBtns}>
                                <TouchableOpacity
                                    style={styles.cancelBtn}
                                    onPress={() => setModalVisible(false)}
                                >
                                    <Text style={styles.cancelBtnText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.submitBtnRefined}
                                    onPress={handlePaymentSubmit}
                                    disabled={uploading || selectedMonths.length === 0}
                                >
                                    {uploading ? (
                                        <ActivityIndicator color="#fff" />
                                    ) : (
                                        <Text style={styles.submitBtnTextRefined}>Submit Payment</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </KeyboardAvoidingView>
                </View>
            )}

            {/* Student Switcher - Replaced with Absolute View for navigation availability */}
            {isStudentSwitcherVisible && (
                <View style={[styles.dropdownOverlay, { zIndex: 3000 }]}>
                    <TouchableOpacity
                        style={styles.fullScreenTouch}
                        activeOpacity={1}
                        onPress={() => setIsStudentSwitcherVisible(false)}
                    >
                        {/* Empty container just to catch taps */}
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
                                {(availableStudents || []).length > 0 ? (
                                    (availableStudents || []).map((child) => {
                                        if (!child || !child.id) return null;
                                        return (
                                            <TouchableOpacity
                                                key={child.id}
                                                style={[
                                                    styles.dropdownOption,
                                                    selectedStudent?.id === child.id && styles.selectedDropdownOption
                                                ]}
                                                onPress={() => {
                                                    setSelectedStudent(child);
                                                    setIsStudentSwitcherVisible(false);
                                                }}
                                            >
                                                <View style={styles.optionAvatarContainer}>
                                                    <Image
                                                        source={getAvatarSource(child.photoUrl, 'CHILD')}
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
                                                    <Text style={styles.optionSub}>{child.classroom || 'Nursery'}</Text>
                                                </View>
                                            </TouchableOpacity>
                                        );
                                    })
                                ) : (
                                    <View style={{ padding: 30, alignItems: 'center' }}>
                                        <Text style={{ ...FONTS.body, color: '#64748B' }}>No other students found</Text>
                                        <TouchableOpacity
                                            onPress={() => setIsStudentSwitcherVisible(false)}
                                            style={{ marginTop: 15, padding: 10 }}
                                        >
                                            <Text style={{ color: '#9D5BF0', fontWeight: 'bold' }}>Close</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </ScrollView>
                        </View>
                    </View>
                </View>
            )}
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
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
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
    customHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'ios' ? 50 : 40,
        paddingBottom: 20,
        backgroundColor: COLORS.white,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    customHeaderTitle: {
        ...FONTS.h2,
        color: '#1E293B',
    },
    headerStudentSwitcher: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    headerStudentName: {
        ...FONTS.body,
        fontSize: 14,
        color: '#64748B',
        marginHorizontal: 6,
    },
    headerMakePaymentBtn: {
        backgroundColor: '#9D5BF0',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        elevation: 2,
        shadowColor: '#9D5BF0',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    headerMakePaymentText: {
        ...FONTS.h4,
        color: COLORS.white,
        marginLeft: 6,
    },
    historySection: {
        marginTop: 10,
    },
    invoiceListItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    invoiceListLeft: {
        flex: 1,
    },
    invoiceListTitle: {
        ...FONTS.h4,
        fontSize: 16,
        color: '#1E293B',
    },
    invoiceListDate: {
        ...FONTS.body,
        fontSize: 13,
        color: '#94A3B8',
        marginTop: 2,
    },
    invoiceListRight: {
        alignItems: 'flex-end',
    },
    invoiceListAmount: {
        ...FONTS.h3,
        fontSize: 16,
        color: '#1E293B',
        marginBottom: 4,
    },
    statusBadgeSmall: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
    },
    statusBadgeTextSmall: {
        ...FONTS.small,
        fontSize: 11,
        fontWeight: 'bold',
    },
    paymentInfoBox: {
        backgroundColor: COLORS.white,
        borderRadius: 20,
        padding: 24,
        marginTop: 20,
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 10,
    },
    paymentInfoTitle: {
        ...FONTS.h3,
        fontSize: 18,
        color: '#475569',
        marginBottom: 20,
    },
    infoRow: {
        marginBottom: 16,
    },
    infoLabel: {
        ...FONTS.body,
        fontSize: 13,
        color: '#94A3B8',
        marginBottom: 4,
    },
    infoValue: {
        ...FONTS.h4,
        fontSize: 16,
        color: '#1E293B',
    },
    modalOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContentFull: {
        backgroundColor: COLORS.white,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        height: '92%', // Cover more area
        paddingBottom: Platform.OS === 'ios' ? 40 : 20, // Extra padding for bottom
    },
    dropdownOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24
    },
    fullScreenTouch: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        height: '100%',
    },
    dropdownContent: {
        backgroundColor: COLORS.white,
        borderRadius: 24,
        padding: 24,
        width: '85%',
        maxWidth: 400,
        elevation: 20,
        shadowColor: '#000',
        shadowOpacity: 0.25,
        shadowRadius: 20,
        // Center the content in the overlay
        position: 'relative',
        zIndex: 3001,
        alignSelf: 'center',
    },
    dropdownHeader: {
        marginBottom: 20,
        alignItems: 'center'
    },
    dropdownTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1E293B'
    },
    dropdownList: {
        gap: 12
    },
    dropdownOption: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 16,
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#F1F5F9'
    },
    selectedDropdownOption: {
        backgroundColor: '#F3EFFF',
        borderColor: '#9D5BF0'
    },
    optionAvatarContainer: {
        position: 'relative',
        marginRight: 15,
        width: 40,
        height: 40
    },
    optionAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#E2E8F0',
        resizeMode: 'cover'
    },
    avatarCheck: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        backgroundColor: '#9D5BF0',
        width: 16,
        height: 16,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#fff'
    },
    selectedOptionText: {
        color: '#9D5BF0'
    },
    modalHeaderBorder: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 24,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    modalBackBtn: {
        padding: 4,
        marginLeft: -10
    },
    modalTitleBlack: {
        ...FONTS.h3,
        color: '#000',
    },
    inputLabel: {
        ...FONTS.h4,
        fontSize: 14,
        color: '#475569',
        marginBottom: 8,
        marginTop: 16,
    },
    inputLabelNoMargin: {
        ...FONTS.h4,
        fontSize: 14,
        color: '#475569',
    },
    styledInput: {
        ...FONTS.body,
        backgroundColor: COLORS.white,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        padding: 16,
        fontSize: 15,
        color: '#1E293B',
    },
    yearSelectorRowRefined: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 8,
    },
    yearControlsRefined: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 15,
        backgroundColor: '#F8FAFC',
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0'
    },
    yearValueTextRefined: {
        ...FONTS.h4,
        fontSize: 16,
        color: '#1E293B'
    },
    monthsGridRefined: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        justifyContent: 'space-between',
        marginTop: 10
    },
    monthOptionRefined: {
        width: '23%',
        aspectRatio: 1.2,
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E2E8F0'
    },
    selectedMonthOptionRefined: {
        backgroundColor: '#F3EFFF',
        borderColor: '#9D5BF0'
    },
    disabledMonthOptionRefined: {
        backgroundColor: '#F1F5F9',
        opacity: 0.6
    },
    monthOptionTextRefined: {
        ...FONTS.body,
        fontSize: 13,
        color: '#64748B'
    },
    selectedMonthTextRefined: {
        ...FONTS.h4,
        color: '#9D5BF0'
    },
    disabledMonthTextRefined: {
        color: '#94A3B8'
    },
    modernMonthSelector: {
        marginBottom: 20,
        paddingHorizontal: 5
    },
    monthPill: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#F1F5F9'
    },
    modernMonthNav: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 5
    },
    modernMonthDisplay: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10
    },
    modernMonthText: {
        ...FONTS.h4,
        fontSize: 15,
        color: '#1E293B',
        fontWeight: 'bold'
    },
    headerAvatarSwitcher: {
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 2,
        borderColor: '#9D5BF0',
        padding: 2,
        backgroundColor: '#F3EFFF',
        position: 'relative'
    },
    headerAvatar: {
        width: '100%',
        height: '100%',
        borderRadius: 20
    },
    headerAvatarBadge: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        backgroundColor: '#9D5BF0',
        width: 16,
        height: 16,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#fff'
    },
    bottomActions: {
        padding: 20,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9'
    },
    mainMakePaymentBtn: {
        width: '100%',
        borderRadius: 16,
        overflow: 'hidden',
        elevation: 4,
        shadowColor: '#9D5BF0',
        shadowOpacity: 0.3,
        shadowRadius: 10,
    },
    gradientBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        gap: 10
    },
    mainMakePaymentText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold'
    },
    customHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'ios' ? 44 : 20,
        height: Platform.OS === 'ios' ? 94 : 74,
        backgroundColor: COLORS.white,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    headerBackBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F8FAFC',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    customHeaderTitle: {
        ...FONTS.h3,
        fontSize: 18,
        color: '#1E293B',
        fontWeight: 'bold'
    },
    fab: {
        position: 'absolute',
        bottom: 30,
        right: 24,
        backgroundColor: '#9D5BF0',
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 30,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        elevation: 8,
        shadowColor: '#9D5BF0',
        shadowOpacity: 0.4,
        shadowRadius: 10,
        zIndex: 1000,
    },
    fabText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16
    },
    uploadBoxRefined: {
        height: 120,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderStyle: 'dashed',
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        marginTop: 4,
        overflow: 'hidden'
    },
    uploadContent: {
        alignItems: 'center',
    },
    uploadLink: {
        ...FONTS.body,
        fontSize: 14,
        color: '#64748B',
        marginTop: 8,
    },
    uploadHint: {
        ...FONTS.body,
        fontSize: 12,
        color: '#94A3B8',
        marginTop: 2,
    },
    uploadedImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover'
    },
    modalFooterBtns: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 32,
        marginBottom: 80, // Increased for keyboard clearance
    },
    cancelBtn: {
        flex: 1,
        paddingVertical: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        alignItems: 'center',
    },
    cancelBtnText: {
        ...FONTS.h4,
        fontSize: 16,
        color: '#64748B',
    },
    submitBtnRefined: {
        flex: 2,
        backgroundColor: '#9D5BF0',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    submitBtnTextRefined: {
        ...FONTS.h4,
        fontSize: 16,
        color: COLORS.white,
    }
});

export default PaymentHistoryScreen;
