import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Modal, Image, Dimensions } from 'react-native';
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
            // Handle both legacy array and new object response
            const billingList = Array.isArray(data) ? data : (data.billings || []);
            const filtered = billingList.filter(b => b.studentId === studentId);
            setBillings(filtered);

            // If data has stats, we could use them, but this screen calculates locally for the specific month view
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
        // Filter by month
        const currentMonthStr = selectedMonth.format('MMMM YYYY');
        // Flexible matching: exact match OR date parsing match
        const filtered = billings.filter(b => {
            // Try strict match first
            if (b.billingMonth === currentMonthStr) return true;
            // Try parsing b.billingMonth
            return dayjs(b.billingMonth).isSame(selectedMonth, 'month');
        });
        setFilteredBillings(filtered);
    }, [billings, selectedMonth, selectedChild]);

    const handleMonthChange = (direction) => {
        setSelectedMonth(prev => direction === 'next' ? prev.add(1, 'month') : prev.subtract(1, 'month'));
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
        if (!image || !selectedBilling) {
            Alert.alert('Error', 'Please select a bill and upload the slip');
            return;
        }

        setUploading(true);
        try {
            // Prepare file object
            const file = {
                uri: image,
                type: 'image/jpeg',
                name: 'payment_receipt.jpg'
            };

            await uploadPaymentReceipt(
                [selectedBilling.id], // Send as array
                selectedBilling.amount,
                'ONLINE_TRANSFER',
                file,
                `[Student: ${selectedChild?.fullName || 'Unknown'}] [Student ID: ${selectedChild?.studentUniqueId || 'N/A'}] [Months: ${selectedBilling.billingMonth}] Monthly Fee`
            );

            Alert.alert('Success', 'Payment slip submitted for approval');
            setModalVisible(false);
            setImage(null);
            fetchData(); // Refresh list to show status change if any
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to submit payment');
        } finally {
            setUploading(false);
        }
    };

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#9D5BF0" animating={true} /></View>;

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

                    {/* Summary Card - Calculate totals */}
                    {(() => {
                        const paidTotal = billings.filter(b => b.status === 'PAID').reduce((sum, b) => sum + parseFloat(b.amount), 0);
                        return (
                            <LinearGradient colors={['#22C55E', '#16A34A']} style={styles.summaryCard}>
                                <View style={styles.summaryInfo}>
                                    <Text style={styles.summaryLabel}>Paid Total</Text>
                                    <Text style={styles.summaryValue}>LKR {paidTotal.toLocaleString()}</Text>
                                    <View style={styles.statusRowHeader}>
                                        <CheckCircle2 size={16} color="#fff" />
                                        <Text style={styles.statusTextHeader}>All clear</Text>
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
                        filteredBillings.map((bill) => (
                            <View key={bill.id} style={styles.detailCard}>
                                <View style={styles.detailRow}>
                                    <View>
                                        <Text style={styles.detailMonth}>{bill.billingMonth}</Text>
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
                                        <TouchableOpacity
                                            style={[styles.paidBadge, { backgroundColor: '#FEF2F2' }]}
                                            onPress={() => {
                                                setSelectedBilling(bill);
                                                setModalVisible(true);
                                            }}
                                        >
                                            <AlertCircle size={12} color="#EF4444" />
                                            <Text style={[styles.paidText, { color: '#EF4444' }]}>Pay Now</Text>
                                        </TouchableOpacity>
                                    )}

                                    <TouchableOpacity style={styles.receiptBtn}>
                                        <Download size={14} color="#9D5BF0" />
                                        <Text style={styles.receiptText}>Invoice</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))
                    ) : (
                        <View style={styles.caughtUpCard}>
                            <View style={styles.checkCircleBlue}>
                                <CheckCircle2 size={32} color="#3B82F6" />
                            </View>
                            <Text style={styles.caughtUpTitle}>No Invoices Found</Text>
                            <Text style={styles.caughtUpSub}>Check back later for new fees</Text>
                        </View>
                    )}
                </View>

                <View style={{ height: 120 }} />
            </ScrollView>

            {/* Floating Action Button */}
            {/* Fixed Bottom Button (Resized) */}
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
                            <Text style={styles.modalTitle}>Upload Payment Slip</Text>
                            <Text style={styles.modalSubtitle}>Please upload your bank transfer or deposit slip.</Text>
                        </View>

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
                                style={[styles.submitBtn, !image && { opacity: 0.5 }]}
                                onPress={handlePaymentSubmit}
                                disabled={!image || uploading}
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
    modalHeader: { alignItems: 'center', marginBottom: 24 },
    modalIndicator: { width: 40, height: 4, backgroundColor: '#E2E8F0', borderRadius: 2, marginBottom: 20 },
    modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#1E293B' },
    modalSubtitle: { fontSize: 14, color: '#64748B', textAlign: 'center', marginTop: 8 },
    uploadBox: { height: 200, backgroundColor: '#F5F3FF', borderRadius: 24, borderStyle: 'dashed', borderWidth: 2, borderColor: '#9D5BF0', justifyContent: 'center', alignItems: 'center', marginBottom: 30, overflow: 'hidden' },
    uploadPlaceholder: { alignItems: 'center' },
    uploadCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', elevation: 2 },
    uploadText: { marginTop: 12, fontWeight: 'bold', color: '#1E293B' },
    previewImage: { width: '100%', height: '100%' },
    modalActions: { flexDirection: 'row', gap: 12 },
    cancelBtn: { flex: 1, paddingVertical: 18, alignItems: 'center' },
    cancelText: { color: '#94A3B8', fontWeight: 'bold' },
    submitBtn: { flex: 2, backgroundColor: '#9D5BF0', borderRadius: 16, paddingVertical: 18, alignItems: 'center' },
    submitText: { color: '#fff', fontWeight: 'bold' },
});

export default PaymentsScreen;
