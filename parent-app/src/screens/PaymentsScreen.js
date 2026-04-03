import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Modal, Image, Dimensions, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getChildBillings, getLinkedChildren } from '../services/child.service';
import { uploadPaymentReceipt } from '../services/payment.service';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import dayjs from 'dayjs';
import {
    ChevronLeft,
    Upload,
    CheckCircle2,
    Clock,
    AlertCircle,
    Wallet,
    CreditCard,
    DollarSign,
    Zap,
    ChevronDown,
    Download,
    Plus,
    Calendar // Added missing import
} from 'lucide-react-native';

import { PROXY_BASE } from '../config/api';
const { width } = Dimensions.get('window');

const PaymentsScreen = ({ navigation }) => {
    const [children, setChildren] = useState([]);
    const [selectedChild, setSelectedChild] = useState(null);
    const [billings, setBillings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedBilling, setSelectedBilling] = useState(null);
    const [selectedMonth, setSelectedMonth] = useState(dayjs());
    const [filteredBillings, setFilteredBillings] = useState([]);

    // Upload State
    const [image, setImage] = useState(null);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const childrenData = await getLinkedChildren();
            setChildren(childrenData);

            if (childrenData.length > 0) {
                const initialChild = childrenData[0];
                setSelectedChild(initialChild);
                await fetchBillings(initialChild.id);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const fetchBillings = async (studentId) => {
        try {
            const data = await getChildBillings(studentId);
            // Handle both legacy array and new object response { billings, payments }
            if (Array.isArray(data)) {
                const filtered = data.filter(b => b.studentId == studentId);
                setBillings(filtered);
            } else {
                const bList = data.billings?.filter(b => b.studentId == studentId) || [];
                setBillings(bList);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const toggleChild = () => {
        if (!children.length) return;
        const currentIndex = children.findIndex(c => c.id === selectedChild?.id);
        const nextIndex = (currentIndex + 1) % children.length;
        const nextChild = children[nextIndex];
        setSelectedChild(nextChild);
        fetchBillings(nextChild.id);
    };

    useEffect(() => {
        if (!selectedChild) return;

        // --- 1. Autolock Logic ---
        const enrollmentDate = selectedChild.enrollmentDate ? dayjs(selectedChild.enrollmentDate) : null;
        const isPreEnrollment = enrollmentDate ? selectedMonth.isBefore(enrollmentDate, 'month') : false;

        if (isPreEnrollment) {
            setFilteredBillings([]);
            return;
        }

        const currentMonthStr = selectedMonth.format('MMMM YYYY');

        // --- 2. Hybrid Display Logic ---
        const filtered = billings.filter(b => {
            // A. Monthly Fees (Standard) -> Show in their specific Billing Month
            if (!b.categoryId && !b.billingCategory) {
                // Try strict match first then loose match
                if (b.billingMonth === currentMonthStr) return true;
                return dayjs(b.billingMonth).isSame(selectedMonth, 'month');
            }

            // B. Extra Payments (Uniforms, etc.)
            // Logic: 
            // 1. If PAID, show it in the month it was PAID (updatedAt).
            // 2. If UNPAID/PENDING, show it in its Issued Month OR the REAL Current Month (persistent reminder).
            
            const isSelectedMonthCurrent = selectedMonth.isSame(dayjs(), 'month');
            const isRecentlyPaid = b.status === 'PAID' && dayjs().diff(dayjs(b.updatedAt), 'day') <= 30;
            
            if (b.status === 'PAID') {
                return dayjs(b.updatedAt).isSame(selectedMonth, 'month') || (isSelectedMonthCurrent && isRecentlyPaid);
            } else {
                // Persistent reminder: Show in its issued month OR always show in the current real-world month
                return dayjs(b.createdAt).isSame(selectedMonth, 'month') || isSelectedMonthCurrent;
            }
        });

        // 3. Rename Logic (Item Naming) happens at render time
        setFilteredBillings(filtered);
    }, [billings, selectedMonth, selectedChild]);

    const handleMonthChange = (direction) => {
        setSelectedMonth(prev => direction === 'next' ? prev.add(1, 'month') : prev.subtract(1, 'month'));
    };

    // --- Payment Modal State ---
    const [paymentType, setPaymentType] = useState('MONTHLY'); // 'MONTHLY' | 'EXTRA'
    const [unpaidExtras, setUnpaidExtras] = useState([]);

    // Refresh unpaid extras when opening modal or changing type
    useEffect(() => {
        if (modalVisible && paymentType === 'EXTRA') {
            const extras = billings.filter(b =>
                (b.categoryId || b.billingCategory) && b.status !== 'PAID'
            );
            setUnpaidExtras(extras);
            setSelectedBilling(null); // Reset selection
        } else if (modalVisible && paymentType === 'MONTHLY') {
            // Find current month's monthly fee if unpaid
            const currentMonthStr = selectedMonth.format('MMMM'); // Just Month name usually stored?
            // Logic to find relevant monthly bill
            const monthlyBill = billings.find(b =>
                !b.categoryId && !b.billingCategory &&
                b.status !== 'PAID' &&
                (b.billingMonth?.includes(currentMonthStr) || dayjs(b.billingMonth).isSame(selectedMonth, 'month'))
            );
            setSelectedBilling(monthlyBill || null);
        }
    }, [modalVisible, paymentType, billings, selectedMonth]);


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
        if (!image || !selectedBilling) {
            Alert.alert('Error', 'Please select a bill and upload the slip');
            return;
        }

        setUploading(true);
        try {
            const file = {
                uri: image,
                type: 'image/jpeg',
                name: 'payment_receipt.jpg'
            };

            // Dynamic Description based on Type
            const descType = selectedBilling.billingCategory?.name || 'Monthly Fee';
            const description = `[Student: ${selectedChild?.fullName || 'Unknown'}] [Type: ${descType}] [Month: ${selectedBilling.billingMonth}]`;

            await uploadPaymentReceipt(
                [selectedBilling.id],
                selectedBilling.amount,
                'ONLINE_TRANSFER',
                file,
                description
            );

            Alert.alert('Success', 'Payment slip submitted for approval');
            setModalVisible(false);
            setImage(null);
            fetchData();
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to submit payment');
        } finally {
            setUploading(false);
        }
    };

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#9D5BF0" animating={true} /></View>;

    // Autolock Check for Render
    const enrollmentDate = selectedChild?.enrollmentDate ? dayjs(selectedChild.enrollmentDate) : null;
    const isPreEnrollment = enrollmentDate ? selectedMonth.isBefore(enrollmentDate, 'month') : false;

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent} bounces={false} showsVerticalScrollIndicator={false}>
                {/* Gradient Header */}
                <LinearGradient colors={['#9D5BF0', '#7C3AED']} style={styles.headerGradient}>
                    <SafeAreaView edges={['top']} style={styles.headerContent}>
                        <View style={styles.topRow}>
                            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                                <ChevronLeft size={24} color="#fff" />
                            </TouchableOpacity>
                            <Text style={styles.headerTitle}>Payments</Text>
                            <TouchableOpacity style={styles.childSelector} onPress={toggleChild}>
                                <Text style={styles.selectedChildText}>{selectedChild?.fullName ? selectedChild.fullName.split(' ')[0] : 'Child'}</Text>
                                <ChevronDown size={14} color="#fff" />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.headerSubtext}>Manage fees and payment history</Text>
                    </SafeAreaView>
                </LinearGradient>

                {/* Main Content Containers */}
                <View style={styles.bodyContainer}>
                    <View style={styles.monthSelector}>
                        <TouchableOpacity onPress={() => handleMonthChange('prev')}>
                            <ChevronLeft size={24} color="#64748B" />
                        </TouchableOpacity>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Calendar size={18} color="#9D5BF0" style={{ marginRight: 8 }} />
                            <Text style={styles.monthText}>{selectedMonth.format('MMMM YYYY')}</Text>
                        </View>
                        <TouchableOpacity onPress={() => handleMonthChange('next')}>
                            <ChevronLeft size={24} color="#64748B" style={{ transform: [{ rotate: '180deg' }] }} />
                        </TouchableOpacity>
                    </View>

                    {/* Autolock State */}
                    {isPreEnrollment ? (
                        <View style={styles.caughtUpCard}>
                            <View style={[styles.checkCircleBlue, { backgroundColor: '#F3F4F6' }]}>
                                <Clock size={32} color="#9CA3AF" />
                            </View>
                            <Text style={[styles.caughtUpTitle, { color: '#6B7280' }]}>Not Enrolled Yet</Text>
                            <Text style={styles.caughtUpSub}>
                                Enrollment Date: {enrollmentDate?.format('MMM DD, YYYY')}
                            </Text>
                        </View>
                    ) : (
                        <>
                            {/* Summary Card */}
                            {(() => {
                                const paidTotal = billings.filter(b => b.status === 'PAID' && dayjs(b.updatedAt).isSame(selectedMonth, 'month')).reduce((sum, b) => sum + parseFloat(b.amount), 0);
                                return (
                                    <LinearGradient colors={['#22C55E', '#16A34A']} style={styles.summaryCard}>
                                        <View style={styles.summaryInfo}>
                                            <Text style={styles.summaryLabel}>Total Paid (This Month)</Text>
                                            <Text style={styles.summaryValue}>LKR {paidTotal.toLocaleString()}</Text>
                                            <View style={styles.statusRowHeader}>
                                                <CheckCircle2 size={16} color="#fff" />
                                                <Text style={styles.statusTextHeader}>Tracked Payments</Text>
                                            </View>
                                        </View>
                                        <View style={styles.checkCircleLarge}>
                                            <CheckCircle2 size={40} color="#fff" />
                                        </View>
                                    </LinearGradient>
                                );
                            })()}

                            <View style={styles.sectionHeader}>
                                <Text style={styles.sectionTitle}>Invoice History</Text>
                            </View>

                            {filteredBillings.length > 0 ? (
                                filteredBillings.map((bill) => {
                                    // Naming Logic with typo-fix
                                    const isMonthly = !bill.categoryId && !bill.billingCategory;
                                    let displayName = isMonthly
                                        ? `Monthly Fee (${bill.billingMonth})`
                                        : (bill.billingCategory?.name || 'Extra Payment');

                                    // Typo fix for Uniform
                                    if (displayName?.toLowerCase()?.includes('unifrom')) {
                                        displayName = 'Uniform Fee';
                                    }

                                    return (
                                        <View key={bill.id} style={styles.detailCard}>
                                            <View style={styles.detailRow}>
                                                <View>
                                                    <Text style={styles.detailMonth}>{displayName}</Text>
                                                    <Text style={styles.detailDue}>Issued: {dayjs(bill.createdAt).format('MMM DD, YYYY')}</Text>
                                                </View>
                                            </View>
                                            <Text style={styles.detailAmount}>LKR {parseFloat(bill.amount).toLocaleString()}</Text>
                                            <View style={styles.detailBadgeRow}>
                                                {bill.status === 'PAID' ? (
                                                    <View style={styles.paidBadge}>
                                                        <CheckCircle2 size={12} color="#16A34A" />
                                                        <Text style={styles.paidText}>Paid</Text>
                                                    </View>
                                                ) : (
                                                    <View style={[styles.paidBadge, { backgroundColor: '#FEF2F2' }]}>
                                                        <AlertCircle size={12} color="#EF4444" />
                                                        <Text style={[styles.paidText, { color: '#EF4444' }]}>Unpaid</Text>
                                                    </View>
                                                )}

                                                <TouchableOpacity 
                                                    style={styles.receiptBtn}
                                                    onPress={() => {
                                                        const invUrl = bill.billingpayment?.[0]?.payment?.invoiceUrl || bill.invoiceUrl || bill.receiptUrl;
                                                        if (invUrl) {
                                                            const finalUrl = invUrl.startsWith('http') ? invUrl : `${PROXY_BASE}${invUrl}`;
                                                            Linking.openURL(finalUrl).catch(err => Alert.alert('Error', 'Could not open link'));
                                                        } else {
                                                            Alert.alert('Notice', 'No invoice available yet.');
                                                        }
                                                    }}
                                                >
                                                    <Download size={14} color="#9D5BF0" />
                                                    <Text style={styles.receiptText}>Invoice</Text>
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    );
                                })
                            ) : (
                                <View style={styles.caughtUpCard}>
                                    <View style={styles.checkCircleBlue}>
                                        <CheckCircle2 size={32} color="#3B82F6" />
                                    </View>
                                    <Text style={styles.caughtUpTitle}>No Invoices Found</Text>
                                    <Text style={styles.caughtUpSub}>Check other months or add payment</Text>
                                </View>
                            )}
                        </>
                    )}
                </View>

                <View style={{ height: 120 }} />
            </ScrollView>

            <View style={styles.bottomContainer}>
                <TouchableOpacity style={styles.paymentButton} onPress={() => setModalVisible(true)}>
                    <Plus size={20} color="#fff" />
                    <Text style={styles.paymentButtonText}>Make Payment</Text>
                </TouchableOpacity>
            </View>

            <Modal visible={modalVisible} animationType="slide" transparent={true}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalView}>
                        <View style={styles.modalHeader}>
                            <View style={styles.modalIndicator} />
                            <Text style={styles.modalTitle}>Make a Payment</Text>
                        </View>

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
                                <View style={styles.selectionCard}>
                                    <Text style={styles.selectionLabel}>Paying for</Text>
                                    <Text style={styles.selectionValue}>Month: {selectedMonth.format('MMMM YYYY')}</Text>
                                    {!selectedBilling && (
                                        <Text style={styles.warningText}>No unpaid bill found for this month.</Text>
                                    )}
                                </View>
                            ) : (
                                <View style={styles.extrasList}>
                                    <Text style={styles.selectionLabel}>Select Bill to Pay:</Text>
                                    {unpaidExtras.length > 0 ? (
                                        <ScrollView style={{ maxHeight: 120 }}>
                                            {unpaidExtras.map(item => (
                                                <TouchableOpacity
                                                    key={item.id}
                                                    style={[styles.extraItem, selectedBilling?.id === item.id && styles.extraItemActive]}
                                                    onPress={() => setSelectedBilling(item)}
                                                >
                                                    <View>
                                                        <Text style={styles.extraItemTitle}>{item.billingCategory?.name || 'Extra Payment'}</Text>
                                                        <Text style={styles.extraItemSub}>{dayjs(item.createdAt).format('MMM DD')}</Text>
                                                    </View>
                                                    <Text style={styles.extraItemAmount}>LKR {parseFloat(item.amount).toLocaleString()}</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </ScrollView>
                                    ) : (
                                        <Text style={styles.emptyText}>No pending extra payments found.</Text>
                                    )}
                                </View>
                            )}
                        </View>

                        <Text style={styles.uploadLabel}>Upload Payment Slip</Text>
                        <TouchableOpacity style={styles.uploadBox} onPress={pickImage}>
                            {image ? (
                                <Image source={{ uri: image }} style={styles.previewImage} />
                            ) : (
                                <View style={styles.uploadPlaceholder}>
                                    <View style={styles.uploadCircle}>
                                        <Upload size={32} color="#9D5BF0" />
                                    </View>
                                    <Text style={styles.uploadText}>Tap to Browse Gallery</Text>
                                </View>
                            )}
                        </TouchableOpacity>

                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                                <Text style={styles.cancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.submitBtn, (!image || !selectedBilling) && { opacity: 0.5 }]}
                                onPress={handlePaymentSubmit}
                                disabled={!image || !selectedBilling || uploading}
                            >
                                {uploading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Submit Slip</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    scrollContent: { flexGrow: 1 },
    headerGradient: { paddingBottom: 60, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
    headerContent: { paddingHorizontal: 24, paddingTop: 10 },
    topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
    headerTitle: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
    headerSubtext: { color: 'rgba(255,255,255,0.8)', fontSize: 16 },
    childSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20
    },
    selectedChildText: { color: '#fff', fontWeight: 'bold', marginRight: 6 },

    bodyContainer: { paddingHorizontal: 24, marginTop: -30 },
    monthSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 20,
        elevation: 4,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 10,
        justifyContent: 'space-between'
    },
    monthText: { fontSize: 18, fontWeight: 'bold', color: '#1E293B', flex: 1, marginLeft: 12 },

    summaryCard: {
        borderRadius: 24,
        padding: 24,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        elevation: 8,
        shadowColor: '#22C55E',
        shadowOpacity: 0.2,
        shadowRadius: 15,
        marginBottom: 30
    },
    summaryInfo: { flex: 1 },
    summaryLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '600' },
    summaryValue: { color: '#fff', fontSize: 36, fontWeight: '900', marginVertical: 8 },
    statusRowHeader: { flexDirection: 'row', alignItems: 'center' },
    statusTextHeader: { color: '#fff', fontSize: 14, fontWeight: '700', marginLeft: 8 },
    checkCircleLarge: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },

    sectionHeader: { marginBottom: 15 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1E293B' },

    detailCard: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 24,
        marginBottom: 20,
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.03,
        borderWidth: 1,
        borderColor: '#F1F5F9'
    },
    detailMonth: { fontSize: 20, fontWeight: 'bold', color: '#1E293B' },
    detailDue: { fontSize: 14, color: '#94A3B8', marginTop: 4 },
    detailAmount: { fontSize: 24, fontWeight: '900', color: '#111827', marginVertical: 15 },
    detailBadgeRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
    paidBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0FDF4', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    paidText: { color: '#16A34A', fontSize: 13, fontWeight: 'bold', marginLeft: 4 },
    receiptBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    receiptText: { color: '#9D5BF0', fontSize: 13, fontWeight: 'bold' },

    caughtUpCard: {
        backgroundColor: '#EFF6FF',
        borderRadius: 24,
        padding: 30,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#DBEAFE',
        marginTop: 10
    },
    checkCircleBlue: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#DBEAFE', justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
    caughtUpTitle: { fontSize: 18, fontWeight: 'bold', color: '#1E293B' },
    caughtUpSub: { fontSize: 14, color: '#64748B', marginTop: 6 },

    bottomContainer: {
        position: 'absolute',
        bottom: 30,
        left: 20,
        right: 20,
        alignItems: 'center'
    },
    paymentButton: {
        backgroundColor: '#9D5BF0',
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        elevation: 6,
        shadowColor: '#9D5BF0',
        shadowOpacity: 0.3,
        shadowRadius: 10,
        width: '100%',
        justifyContent: 'center'
    },
    paymentButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalView: { backgroundColor: '#fff', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 30 },
    modalHeader: { alignItems: 'center', marginBottom: 20 },
    modalIndicator: { width: 40, height: 4, backgroundColor: '#E2E8F0', borderRadius: 2, marginBottom: 20 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1E293B' },

    toggleContainer: { flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 12, padding: 4, marginBottom: 20 },
    toggleBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
    toggleBtnActive: { backgroundColor: '#fff', elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4 },
    toggleText: { fontWeight: '600', color: '#64748B' },
    toggleTextActive: { color: '#9D5BF0', fontWeight: 'bold' },

    contextContainer: { marginBottom: 20 },
    selectionCard: { backgroundColor: '#F8FAFC', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0' },
    selectionLabel: { fontSize: 12, color: '#64748B', fontWeight: 'bold', marginBottom: 4 },
    selectionValue: { fontSize: 16, color: '#1E293B', fontWeight: 'bold' },
    warningText: { color: '#EF4444', fontSize: 12, marginTop: 4, fontWeight: '500' },

    extrasList: { backgroundColor: '#F8FAFC', padding: 10, borderRadius: 12 },
    extraItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderRadius: 8, marginBottom: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: 'transparent' },
    extraItemActive: { borderColor: '#9D5BF0', backgroundColor: '#F5F3FF' },
    extraItemTitle: { fontWeight: 'bold', color: '#1E293B' },
    extraItemSub: { fontSize: 12, color: '#64748B' },
    extraItemAmount: { fontWeight: 'bold', color: '#9D5BF0' },
    emptyText: { textAlign: 'center', color: '#94A3B8', padding: 10 },

    uploadLabel: { fontSize: 14, fontWeight: 'bold', color: '#1E293B', marginBottom: 10 },
    uploadBox: { height: 140, backgroundColor: '#F5F3FF', borderRadius: 20, borderStyle: 'dashed', borderWidth: 2, borderColor: '#9D5BF0', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
    uploadPlaceholder: { alignItems: 'center' },
    uploadCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', elevation: 2 },
    uploadText: { marginTop: 8, fontWeight: 'bold', color: '#1E293B', fontSize: 12 },
    previewImage: { width: '100%', height: '100%', borderRadius: 18 },

    modalActions: { flexDirection: 'row', gap: 12 },
    cancelBtn: { flex: 1, paddingVertical: 18, alignItems: 'center' },
    cancelText: { color: '#94A3B8', fontWeight: 'bold' },
    submitBtn: { flex: 2, backgroundColor: '#9D5BF0', borderRadius: 16, paddingVertical: 18, alignItems: 'center' },
    submitText: { color: '#fff', fontWeight: 'bold' },
});

export default PaymentsScreen;
