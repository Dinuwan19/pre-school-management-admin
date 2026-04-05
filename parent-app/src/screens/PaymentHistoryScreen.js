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
    Platform,
    Linking, // Added Linking for opening URLs
    RefreshControl
} from 'react-native';
import { ChevronLeft, ChevronRight, CreditCard, Calendar, Download, AlertCircle, CheckCircle2, Upload, Plus, X, User, ChevronDown, Check, CheckCircle, Lock } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SIZES, FONTS } from '../constants/theme';
import { PROXY_BASE } from '../config/api'; // Added PROXY_BASE import
import CommonHeader from '../components/CommonHeader'; // Added CommonHeader import
import { AVATARS, getAvatarSource } from '../constants/avatars';
import { getChildBillings, getLinkedChildren } from '../services/child.service';
import { uploadPaymentReceipt, getBillingCategories } from '../services/payment.service';
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
    const [paymentType, setPaymentType] = useState('MONTHLY'); // 'MONTHLY' | 'EXTRA'

    const [paymentStep, setPaymentStep] = useState(1);
    const [selectedMonths, setSelectedMonths] = useState([]);
    const [availableStudents, setAvailableStudents] = useState([]);
    const [availableCategories, setAvailableCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const [selectedPaymentYear, setSelectedPaymentYear] = useState(dayjs().year());
    const [billings, setBillings] = useState([]);
    const [allBillings, setAllBillings] = useState([]);
    const [allPayments, setAllPayments] = useState([]); // Track all payments for month locking

    // Modal & Upload State
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedBilling, setSelectedBilling] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [isStudentSwitcherVisible, setIsStudentSwitcherVisible] = useState(false);
    const [selectedPayment, setSelectedPayment] = useState(null);

    // Derived State for Extras
    const unpaidExtras = allBillings.filter(b =>
        (b.categoryId || b.billingCategory) &&
        b.status !== 'PAID' &&
        b.status !== 'APPROVED' &&
        b.status !== 'SUCCESS' &&
        b.status !== 'PENDING'
    );

    // [New] Duplicate Prevention: List of categories that haven't been billed yet
    const filteredCategories = React.useMemo(() => {
        // Collect all category IDs that already have a record for this child
        const existingCategoryIds = allBillings
            .filter(b => b.categoryId || b.billingCategory?.id)
            .map(b => Number(b.categoryId || b.billingCategory?.id));
        
        return availableCategories.filter(cat => !existingCategoryIds.includes(Number(cat.id)));
    }, [availableCategories, allBillings]);



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

    // Auto-calculate amount based on selected months
    useEffect(() => {
        if (paymentType === 'MONTHLY') {
            const count = selectedMonths.length || 1;
            setPaymentAmount((15000 * count).toString());
        }
    }, [selectedMonths, paymentType]);

    const fetchData = async (month = selectedMonth) => {
        setLoading(true);
        try {
            const children = await getLinkedChildren();
            setAvailableStudents(children);
            if (!selectedStudent && children.length > 0) {
                setSelectedStudent(children[0]);
            }

            if (selectedStudent) {
                // Fetch basic data for the month view
                const data = await getChildBillings(selectedStudent.id, month.format('MM'), month.format('YYYY'));
                setBillings(data.billings || []);

                // Fetch ALL history for Unpaid Extras/Locking
                const allData = await getChildBillings(selectedStudent.id);
                setAllBillings(allData.billings || []);
                setAllPayments(allData.payments || []);
            }

            // Only fetch categories if needed
            const cats = await getBillingCategories(true);
            setAvailableCategories(cats || []);

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
        // [New] Duplicate Prevention Safety Check
        if (paymentType === 'EXTRA' && selectedCategory) {
            const hasExisting = allBillings.some(b => 
                Number(b.categoryId || b.billingCategory?.id) === Number(selectedCategory.id)
            );
            if (hasExisting) {
                Alert.alert('Duplicate Payment', 'A record for this payment category already exists for this student. Please use the "Pay Pending Bill" section if it is unpaid.');
                return;
            }
        }

        if (!image) {
            Alert.alert('Error', 'Please upload the slip');
            return;
        }

        let billingIds = [];
        let descType = 'Monthly Fee';
        let targetCodes = [];

        if (paymentType === 'EXTRA') {
            // ... existing EXTRA logic ...
        } else {
            // Monthly Fee Logic
            if (selectedMonths.length === 0) {
                Alert.alert('Error', 'Please select at least one month to pay');
                return;
            }

            targetCodes = selectedMonths.map(name => {
                const idx = months.indexOf(name);
                return `${selectedPaymentYear}-${String(idx + 1).padStart(2, '0')}`;
            });

            // Find matching billings (unpaid) to link
            billingIds = allBillings
                .filter(b => targetCodes.includes(b.billingMonth) && !b.categoryId && (b.status !== 'PAID' && b.status !== 'APPROVED'))
                .map(b => b.id);

            descType = `Monthly Fee (${selectedMonths.join(', ')})`;

            // Allow generic payment if no ID found
            if (billingIds.length === 0) {
                // No specific behavior defined, proceeding as generic payment
            }
        }

        const description = `[Student: ${selectedStudent?.fullName || 'Unknown'}] [Type: ${descType}] ${paymentNote ? `[Note: ${paymentNote}]` : ''}`;

        setUploading(true);
        try {
            const file = {
                uri: image.uri,
                type: image.mimeType || 'image/jpeg',
                name: image.name || 'payment_receipt.jpg'
            };

            await uploadPaymentReceipt(
                billingIds,
                parseFloat(paymentAmount || 0).toString(),
                'ONLINE_TRANSFER',
                file,
                description,
                selectedCategory?.id, // Pass categoryId if any
                selectedStudent?.id,   // Pass studentId 
                targetCodes           // Pass billingMonths for backend auto-creation
            );

            Alert.alert('Success', 'Payment slip submitted for approval');
            setModalVisible(false);
            setImage(null);
            setSelectedBilling(null);
            setSelectedMonths([]); // Clear selection to prevent stuck locked months
            fetchData();
        } catch (error) {
            console.log('Submission Error:', error);
            Alert.alert('Error', JSON.stringify(error) || error.message || 'Failed to submit payment');
        } finally {
            setUploading(false);
        }
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
                `[Student: ${selectedStudent?.fullName || 'Unknown'}] [Student ID: ${selectedStudent?.studentUniqueId || 'N/A'}] ` +
                (paymentFor ? `[${paymentFor}] ` : '') +
                (selectedMonths.length > 0 ? `[Months: ${selectedMonths.join(', ')}] ` : '') +
                paymentNote
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
                    source={getAvatarSource(selectedStudent?.photoUrl, 'CHILD', null, selectedStudent?.gender)}
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


    const renderInvoiceItem = (item, index) => {
        const isBilling = item.type === 'BILLING';
        // Treat APPROVED cash payments as paid
        const isPaid = item.status === 'PAID' || item.status === 'APPROVED' || item.status === 'SUCCESS';
        const dueDate = dayjs(item.createdAt).add(7, 'day');
        const isOverdue = !isPaid && dayjs().isAfter(dueDate);

        // UI Styling Configuration
        let statusConfig = { color: '#3B82F6', bg: '#EFF6FF', label: 'Unpaid', icon: null };

        if (isPaid) {
            statusConfig = { color: '#059669', bg: '#ECFDF5', label: 'Paid', icon: <CheckCircle2 size={12} color="#059669" /> };
        } else if (item.status === 'PENDING') {
            statusConfig = { color: '#D97706', bg: '#FFFBEB', label: 'Pending Approval', icon: <AlertCircle size={12} color="#D97706" /> };
        } else if (isOverdue && isBilling) {
            statusConfig = { color: '#DC2626', bg: '#FEF2F2', label: 'Overdue', icon: <AlertCircle size={12} color="#DC2626" /> };
        }

        // Robust Title Parsing
        let displayTitle = '';
        let monthSubtitle = '';

        if (isBilling) {
            if (item.billingCategory?.name) {
                displayTitle = item.billingCategory.name;
            } else {
                displayTitle = item.billingMonth ? dayjs(item.billingMonth).format('MMMM') : 'Monthly Fee';
            }
            monthSubtitle = item.billingMonth ? dayjs(item.billingMonth).year() : '';
        } else if (item.transactionRef) {
            // Try [Months: ...] tag first
            const monthMatch = item.transactionRef.match(/\[Months:\s(.*?)\]/);
            if (monthMatch) {
                displayTitle = monthMatch[1]; // e.g. "January, February"
            } else {
                // Fallback: Check if common month names exist in text
                const foundMonths = months.filter(m => item.transactionRef.includes(m));
                displayTitle = foundMonths.length > 0 ? foundMonths.join(', ') : 'Payment';
            }
        } else {
            displayTitle = 'Generic Payment';
        }

        const amount = isBilling ? item.amount : (item.amountPaid || item.amount);

        // Determine correct download link (Invoice for Billing/Cash, Receipt for Uploads)
        // Check finding nested payment invoice for billings
        let linkedInvoiceUrl = null;
        if (isBilling && item.billingpayment?.length > 0) {
            // Find valid invoice in linked payments
            const validPayment = item.billingpayment.find(bp => bp.payment?.invoiceUrl);
            linkedInvoiceUrl = validPayment?.payment?.invoiceUrl;
        }

        const downloadUrl = linkedInvoiceUrl || item.invoiceUrl || item.paymentInfo?.invoiceUrl || item.receiptUrl;
        const isInvoice = !!(linkedInvoiceUrl || item.invoiceUrl || (isBilling && item.paymentInfo?.invoiceUrl));

        return (
            <View key={item.key || (isBilling ? `b-${item.id}` : `p-${item.id}`) || index} style={styles.invoiceListItem}>
                {/* Left: Icon & Info */}
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <View style={[styles.iconBox, { backgroundColor: isPaid ? '#ECFDF5' : '#F8FAFC' }]}>
                        {isPaid ? <CheckCircle2 size={24} color="#10B981" /> : <Calendar size={24} color="#94A3B8" />}
                    </View>
                    <View style={{ marginLeft: 12, flex: 1 }}>
                        <Text style={styles.invoiceListTitle} numberOfLines={1}>{displayTitle}</Text>
                        <Text style={styles.invoiceListDate}>
                            {dayjs(item.createdAt).format('DD MMM YYYY')}
                            {monthSubtitle ? ` • ${monthSubtitle}` : ''}
                        </Text>
                    </View>
                </View>

                {/* Right: Amount & Status */}
                <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.invoiceListAmount}>Rs. {parseFloat(amount).toLocaleString()}</Text>

                    <View style={[styles.statusBadgeSmall, { backgroundColor: statusConfig.bg, flexDirection: 'row', alignItems: 'center' }]}>
                        {statusConfig.icon}
                        <Text style={[styles.statusBadgeTextSmall, { color: statusConfig.color, marginLeft: 4 }]}>
                            {statusConfig.label}
                        </Text>
                    </View>

                    {/* Download Link */}
                    {/* Unified Action Chip for Download */}
                    {downloadUrl ? (
                        <TouchableOpacity
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                backgroundColor: isInvoice ? '#F3E8FF' : '#E0F2FE',
                                paddingHorizontal: 10,
                                paddingVertical: 4,
                                borderRadius: 12,
                                marginTop: 6,
                                borderWidth: 1,
                                borderColor: isInvoice ? '#D8B4FE' : '#BAE6FD'
                            }}
                            onPress={() => {
                                const finalUrl = downloadUrl.startsWith('http') ? downloadUrl : `${PROXY_BASE}${downloadUrl}`;
                                Linking.openURL(finalUrl).catch(err => Alert.alert('Error', 'Could not open link'));
                            }}
                        >
                            <Download size={12} color={isInvoice ? '#9333EA' : '#0284C7'} />
                            <Text style={{
                                fontSize: 11,
                                color: isInvoice ? '#9333EA' : '#0284C7',
                                marginLeft: 4,
                                fontWeight: '600'
                            }}>
                                {isInvoice ? 'Invoice' : 'Receipt'}
                            </Text>
                        </TouchableOpacity>
                    ) : (
                        // Placeholder for when URL is missing but payment is approved (e.g. pending generation)
                        (isPaid && !isInvoice && !item.receiptUrl) && (
                            <View style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                backgroundColor: '#F1F5F9',
                                paddingHorizontal: 10,
                                paddingVertical: 4,
                                borderRadius: 12,
                                marginTop: 6,
                                borderWidth: 1,
                                borderColor: '#E2E8F0',
                                opacity: 0.7
                            }}>
                                <Text style={{ fontSize: 11, color: '#94A3B8', fontWeight: '500' }}>Processing</Text>
                            </View>
                        )
                    )}
                </View>
            </View>
        );
    };

    const renderPaymentInfo = () => {
        // Collect all outstanding extra fees (Pending or Unpaid)
        const pendingOrUnpaidExtras = allBillings.filter(b => 
            (b.categoryId || b.billingCategory) && 
            b.status !== 'PAID' && b.status !== 'APPROVED' && b.status !== 'SUCCESS'
        );

        return (
            <View style={styles.paymentInfoBox}>
                <Text style={styles.paymentInfoTitle}>Payment Information & Records</Text>
                
                {/* Monthly Fee (Standard Reference) */}
                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Monthly Fee</Text>
                    <Text style={styles.infoValue}>Rs. 15,000</Text>
                </View>

                {/* Dynamic Tracking for Extra Payments */}
                {pendingOrUnpaidExtras.map(extra => (
                    <View key={extra.id} style={[styles.infoRow, { borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 10, marginTop: 5 }]}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.infoLabel}>{extra.billingCategory?.name || 'Extra Fee'}</Text>
                            <Text style={{ fontSize: 11, color: '#94A3B8' }}>{dayjs(extra.createdAt).format('MMM DD, YYYY')}</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                            <Text style={styles.infoValue}>Rs. {parseFloat(extra.amount).toLocaleString()}</Text>
                            <View style={[styles.statusBadgeSmall, { backgroundColor: extra.status === 'PENDING' ? '#FFFBEB' : '#FEF2F2', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginTop: 2 }]}>
                                <Text style={{ fontSize: 10, fontWeight: 'bold', color: extra.status === 'PENDING' ? '#D97706' : '#EF4444' }}>
                                    {extra.status === 'PENDING' ? 'Pending Approval' : 'To Pay'}
                                </Text>
                            </View>
                        </View>
                    </View>
                ))}

                <View style={[styles.infoRow, { borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 10 }]}>
                    <Text style={styles.infoLabel}>Payment Due Date</Text>
                    <Text style={styles.infoValue}>5th of each month</Text>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            {renderHeader()}
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl refreshing={loading} onRefresh={() => fetchData()} colors={['#9D5BF0']} />
                }
            >
                <View style={styles.welcomeSection}>
                    <Text style={styles.studentName}>{selectedStudent?.fullName || 'Student'}'s Billing</Text>
                    <Text style={styles.subtitle}>Manage fees and view payment history</Text>
                </View>

                {renderMonthSelector()}

                <View style={[styles.historySection, { backgroundColor: '#fff', borderRadius: 20, padding: 15, elevation: 2 }]}>
                    {loading ? (
                        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 20 }} />
                    ) : (() => {
                        // Autolock Check
                        const enrollmentDate = selectedStudent?.enrollmentDate ? dayjs(selectedStudent.enrollmentDate) : null;
                        const isPreEnrollment = enrollmentDate ? selectedMonth.isBefore(enrollmentDate, 'month') : false;

                        if (isPreEnrollment) {
                            return (
                                <View style={styles.caughtUpCard}>
                                    <View style={styles.checkCircleBlue}>
                                        <Lock size={32} color="#3B82F6" />
                                    </View>
                                    <Text style={styles.caughtUpTitle}>Not Enrolled Yet</Text>
                                    <Text style={styles.caughtUpSub}>Student was not enrolled during this period.</Text>
                                </View>
                            );
                        }

                        const currentMonthName = selectedMonth.format('MMMM'); // "January"
                        const currentYearStr = selectedMonth.format('YYYY');   // "2026"
                        const currentMonthCode = selectedMonth.format('YYYY-MM'); // "2026-01"

                        // 1. Merge Billings and Payments
                        const mergedHistory = [
                            ...allBillings.map(b => ({ ...b, type: 'BILLING' })),
                            ...allPayments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                                .filter(p => !p.billingpayment || p.billingpayment.length === 0)
                                .map(p => ({ ...p, type: 'PAYMENT' }))
                        ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

                        // 2. Apply "Smart Presence" Filter
                        const filteredHistory = mergedHistory.filter(item => {
                            const isExtra = item.categoryId || item.billingCategory;

                            if (item.type === 'BILLING') {
                                if (!isExtra) {
                                    // Official Monthly Billing: match current view month
                                    return item.billingMonth === currentMonthCode;
                                } else {
                                    // Other Payments (Extras): Show ONLY when Pending or Paid.
                                    // Place them in the month where the activity happened (updatedAt).
                                    const isActive = item.status === 'PAID' || item.status === 'APPROVED' || item.status === 'SUCCESS' || item.status === 'PENDING';
                                    if (!isActive) return false;
                                    
                                    return dayjs(item.updatedAt).format('YYYY-MM') === currentMonthCode;
                                }
                            }

                            // B. Unallocated Payments: Matching by Text tags
                            if (item.transactionRef) {
                                const monthMatch = item.transactionRef.match(/\[Months:\s(.*?)\]/);
                                if (monthMatch) {
                                    const monthsList = monthMatch[1];
                                    return monthsList.includes(currentMonthName) && dayjs(item.createdAt).format('YYYY') == currentYearStr;
                                }
                            }

                            // C. Fallback to Creation Month (Generic payments)
                            return dayjs(item.createdAt).format('YYYY-MM') === currentMonthCode;
                        });

                        // 3. Deduplicate (just in case)
                        const uniqueHistory = filteredHistory.filter((item, index, self) =>
                            index === self.findIndex((t) => (
                                t.id === item.id && t.type === item.type
                            ))
                        );

                        if (uniqueHistory.length > 0) {
                            return uniqueHistory.map((item, index) => renderInvoiceItem(item, index));
                        } else {
                            return (
                                <View style={styles.emptyState}>
                                    <AlertCircle size={48} color={COLORS.gray[300]} />
                                    <Text style={styles.emptyText}>No records for {currentMonthName}</Text>
                                </View>
                            );
                        }
                    })()}
                </View>

                {renderPaymentInfo()}
            </ScrollView>

            {/* Floating Action Button - Hide when modal is open */}
            {!modalVisible && (
                <TouchableOpacity
                    style={styles.fab}
                    onPress={() => {
                        setPaymentStep(1);
                        setSelectedMonths([]); // Reset selection when opening modal
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
                            <Text style={styles.modalTitleBlack}>Make a Payment</Text>
                            <View style={{ width: 24 }} />
                        </View>

                        <ScrollView
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
                            keyboardShouldPersistTaps="always"
                        >
                            {/* Payment Type Toggle */}
                            <View style={styles.toggleContainer}>
                                <TouchableOpacity
                                    style={[styles.toggleBtn, paymentType === 'MONTHLY' && styles.toggleBtnActive]}
                                    onPress={() => setPaymentType('MONTHLY')}
                                >
                                    <Text style={[styles.toggleText, paymentType === 'MONTHLY' && styles.toggleTextActive]}>Monthly Fee</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.toggleBtn, paymentType === 'EXTRA' && styles.toggleBtnActive]}
                                    onPress={() => setPaymentType('EXTRA')}
                                >
                                    <Text style={[styles.toggleText, paymentType === 'EXTRA' && styles.toggleTextActive]}>Other Payments</Text>
                                </TouchableOpacity>
                            </View>

                            {/* Context / Selection Area */}
                            <View style={styles.contextContainer}>
                                {paymentType === 'MONTHLY' ? (
                                    <View>
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
                                                const targetBillingMonth = `${selectedPaymentYear}-${String(idx + 1).padStart(2, '0')}`;

                                                // Logic: Only block if fully PAID or APPROVED. 
                                                // PENDING/REJECTED should remain clickable.
                                                const isPaid = allBillings.some(b => {
                                                    const monthMatch = (b.billingMonth || '').includes(targetBillingMonth) || (b.billingMonth || '').includes(m);
                                                    // Include PENDING to lock it
                                                    const statusMatch = (b.status === 'PAID' || b.status === 'SUCCESS' || b.status === 'APPROVED' || b.status === 'PENDING');
                                                    return monthMatch && statusMatch;
                                                }) || allPayments.some(p => {
                                                    const ref = p.transactionRef || '';
                                                    // 1. Check Status (include PENDING)
                                                    const isValidStatus = p.status === 'APPROVED' || p.status === 'PAID' || p.status === 'SUCCESS' || p.status === 'PENDING';
                                                    if (!isValidStatus) return false;

                                                    // 2. Check Year
                                                    const createdYear = dayjs(p.createdAt).year();
                                                    const hasYearInRef = ref.includes(String(selectedPaymentYear));
                                                    const isYearMatch = hasYearInRef || (createdYear === selectedPaymentYear);
                                                    if (!isYearMatch) return false;

                                                    // 3. Check Month
                                                    const monthMatch = ref.match(/\[Months:\s(.*?)\]/);
                                                    if (monthMatch) {
                                                        return monthMatch[1].includes(m);
                                                    } else {
                                                        return ref.includes(m);
                                                    }
                                                });

                                                // Strict Enrollment Lock
                                                const enrollmentDate = selectedStudent?.enrollmentDate ? dayjs(selectedStudent.enrollmentDate) : null;
                                                const monthDate = dayjs(`${selectedPaymentYear}-${String(idx + 1).padStart(2, '0')}-01`);

                                                const isPreEnrollment = enrollmentDate ? monthDate.isBefore(enrollmentDate, 'month') : false;
                                                const isBlocked = isPaid || isPreEnrollment;
                                                const isSelected = selectedMonths.includes(m); // Restored Line

                                                return (
                                                    <TouchableOpacity
                                                        key={m}
                                                        disabled={isBlocked}
                                                        style={[
                                                            styles.monthCard,
                                                            isPaid && styles.monthCardPaid,
                                                            isPreEnrollment && { opacity: 0.3, backgroundColor: '#F1F5F9' },
                                                            isSelected && styles.monthCardSelected,
                                                            !isBlocked && !isSelected && styles.monthCardAvailable
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
                                                        {/* Top Icon */}
                                                        <View style={styles.monthCardIcon}>
                                                            {isPaid ? (
                                                                <Lock size={16} color="#15803d" />
                                                            ) : isSelected ? (
                                                                <Check size={16} color="#ffffff" />
                                                            ) : (
                                                                <View style={styles.monthCardCircle} />
                                                            )}
                                                        </View>

                                                        {/* Month Name */}
                                                        <Text style={[
                                                            styles.monthCardText,
                                                            isPaid && styles.monthCardTextPaid,
                                                            isSelected && styles.monthCardTextSelected,
                                                        ]}>{m.slice(0, 3)}</Text>
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
                                    </View>
                                ) : (
                                    <View style={styles.extrasList}>
                                        {/* 1. New Payment Selection */}
                                        <View style={styles.sectionHeader}>
                                            <Text style={styles.sectionTitle}>Start New Payment</Text>
                                        </View>

                                        <TouchableOpacity
                                            style={styles.dropdownSelector}
                                            onPress={() => setShowCategoryDropdown(!showCategoryDropdown)}
                                        >
                                            <Text style={{ color: selectedCategory ? '#1E293B' : '#64748B', fontWeight: '600' }}>
                                                {selectedCategory ? `${selectedCategory.name} (Rs. ${selectedCategory.amount})` : 'Select Payment Category'}
                                            </Text>
                                            <ChevronDown size={20} color="#64748B" />
                                        </TouchableOpacity>

                                        {showCategoryDropdown && (
                                            <View style={styles.dropdownList}>
                                                {filteredCategories.length > 0 ? filteredCategories.map(cat => (
                                                    <TouchableOpacity
                                                        key={cat.id}
                                                        style={styles.dropdownItem}
                                                        onPress={() => {
                                                            setSelectedCategory(cat);
                                                            setPaymentAmount(cat.amount.toString());
                                                            setSelectedBilling(null); // Clear bill selection
                                                            setShowCategoryDropdown(false);
                                                        }}
                                                    >
                                                        <Text style={{ fontWeight: '600', color: '#334155' }}>{cat.name}</Text>
                                                        <Text style={{ fontSize: 12, color: '#64748B' }}>Rs. {parseFloat(cat.amount).toLocaleString()}</Text>
                                                    </TouchableOpacity>
                                                )) : (
                                                    <View style={{ padding: 12 }}><Text style={{ color: '#94A3B8' }}>No categories available</Text></View>
                                                )}
                                            </View>
                                        )}

                                        {selectedCategory && (
                                            <View style={{ marginBottom: 20 }}>
                                                <Text style={styles.inputLabel}>Amount (Rs.)</Text>
                                                <TextInput
                                                    style={styles.styledInput}
                                                    value={paymentAmount}
                                                    onChangeText={setPaymentAmount}
                                                    keyboardType="numeric"
                                                />
                                            </View>
                                        )}

                                        {/* 2. Pending Bills Selection */}
                                        <View style={[styles.sectionHeader, { marginTop: 10 }]}>
                                            <Text style={styles.sectionTitle}>OR Pay Pending Bill</Text>
                                        </View>

                                        {unpaidExtras.length > 0 ? (
                                            unpaidExtras.map(item => (
                                                <TouchableOpacity
                                                    key={item.id}
                                                    style={[styles.extraItem, selectedBilling?.id === item.id && styles.extraItemActive]}
                                                    onPress={() => {
                                                        setSelectedBilling(item);
                                                        setSelectedCategory(null); // Clear category
                                                        setPaymentAmount(item.amount.toString());
                                                    }}
                                                >
                                                    <View>
                                                        <Text style={styles.extraItemTitle}>{item.billingCategory?.name || 'Extra Payment'}</Text>
                                                        <Text style={styles.extraItemSub}>{dayjs(item.createdAt).format('MMM DD')}</Text>
                                                    </View>
                                                    <Text style={styles.extraItemAmount}>LKR {parseFloat(item.amount).toLocaleString()}</Text>
                                                </TouchableOpacity>
                                            ))
                                        ) : (
                                            <Text style={[styles.emptyText, { textAlign: 'left', paddingLeft: 0 }]}>No pending extra payments found.</Text>
                                        )}
                                    </View>
                                )}
                            </View>

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
                                    style={[styles.submitBtnRefined, (!image || (paymentType === 'EXTRA' && !selectedBilling && !selectedCategory)) && { opacity: 0.5 }]}
                                    onPress={handlePaymentSubmit}
                                    disabled={uploading || (paymentType === 'EXTRA' && !selectedBilling && !selectedCategory)}
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
                        <View style={[styles.dropdownList, { maxHeight: 400 }]}>
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
    },
    // New Styles for Payment Toggle & Extras
    toggleContainer: { flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 12, padding: 4, marginBottom: 20 },
    toggleBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
    toggleBtnActive: { backgroundColor: '#fff', elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4 },
    toggleText: { fontWeight: '600', color: '#64748B' },
    toggleTextActive: { color: '#9D5BF0', fontWeight: 'bold' },

    contextContainer: { marginBottom: 20 },
    selectionCard: { backgroundColor: '#F8FAFC', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0' },
    selectionLabel: { fontSize: 12, color: '#64748B', fontWeight: 'bold', marginBottom: 4 },
    selectionValue: { fontSize: 16, color: '#1E293B', fontWeight: 'bold' },
    infoLabel: { fontSize: 12, color: '#64748B', fontWeight: 'bold', marginBottom: 4 },

    extrasList: { backgroundColor: '#F8FAFC', padding: 10, borderRadius: 12 },
    extraItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderRadius: 8, marginBottom: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: 'transparent' },
    extraItemActive: { borderColor: '#9D5BF0', backgroundColor: '#F5F3FF' },
    extraItemTitle: { fontWeight: 'bold', color: '#1E293B' },
    extraItemSub: { fontSize: 12, color: '#64748B' },
    extraItemAmount: { fontWeight: 'bold', color: '#9D5BF0' },
    extraItemAmount: { fontWeight: 'bold', color: '#9D5BF0' },
    emptyText: { textAlign: 'center', color: '#94A3B8', padding: 10 },

    // Dropdown Styles
    dropdownSelector: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#CBD5E1', marginBottom: 12 },
    dropdownList: { backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 16, maxHeight: 200 },
    dropdownItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    sectionHeader: { marginBottom: 8, marginTop: 4 },
    sectionTitle: { fontWeight: 'bold', color: '#64748B', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
    styledInput: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, padding: 12, fontSize: 16, color: '#1E293B' },

    // New Card Styles
    monthCard: {
        width: '30%',
        height: 80,
        borderRadius: 12,
        marginBottom: 12,
        padding: 10,
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        backgroundColor: '#fff',
        elevation: 1,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    monthCardAvailable: {
        backgroundColor: '#fff',
        borderColor: '#E2E8F0',
    },
    monthCardSelected: {
        backgroundColor: '#9D5BF0',
        borderColor: '#9D5BF0',
        elevation: 4,
        shadowColor: '#9D5BF0',
        shadowOpacity: 0.3,
    },
    monthCardPaid: {
        backgroundColor: '#DCFCE7', // Soft Green
        borderColor: '#86EFAC',
        opacity: 0.8
    },
    monthCardIcon: {
        alignItems: 'flex-end',
    },
    monthCardCircle: {
        width: 16,
        height: 16,
        borderRadius: 8,
        borderWidth: 1.5,
        borderColor: '#CBD5E1',
    },
    monthCardText: {
        fontWeight: 'bold',
        fontSize: 16,
        color: '#334155',
    },
    monthCardTextSelected: {
        color: '#fff',
    },
    monthCardTextPaid: {
        color: '#166534', // Dark Green
    },
});

export default PaymentHistoryScreen;
