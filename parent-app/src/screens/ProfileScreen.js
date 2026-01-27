import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Switch, Alert, ActivityIndicator, Modal, TextInput, TouchableWithoutFeedback, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { logout, changePassword as apiChangePassword } from '../services/auth.service';
import { getParentDashboardStats } from '../services/dashboard.service';
import {
    User,
    Phone,
    Mail,
    Shield,
    Lock,
    LogOut,
    Moon,
    ChevronRight,
    MapPin,
    X
} from 'lucide-react-native';
import { COLORS } from '../constants/theme';
import CommonHeader from '../components/CommonHeader';
import { updateParentProfile } from '../services/child.service';

const ProfileScreen = ({ navigation }) => {
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isAvatarModalVisible, setIsAvatarModalVisible] = useState(false);
    const [isEditModalVisible, setIsEditModalVisible] = useState(false);
    const [editField, setEditField] = useState({ label: '', value: '', key: '' });
    const [isPasswordModalVisible, setIsPasswordModalVisible] = useState(false);
    const [passwordData, setPasswordData] = useState({ current: '', new: '', confirm: '' });
    const [submitting, setSubmitting] = useState(false);

    const avatars = [
        'https://cdn-icons-png.flaticon.com/512/4140/4140048.png',
        'https://cdn-icons-png.flaticon.com/512/4140/4140047.png',
        'https://cdn-icons-png.flaticon.com/512/4140/4140051.png',
        'https://cdn-icons-png.flaticon.com/512/4140/4140049.png',
        'https://cdn-icons-png.flaticon.com/512/4140/4140052.png',
        'https://cdn-icons-png.flaticon.com/512/4140/4140050.png',
    ];

    useFocusEffect(
        useCallback(() => {
            fetchProfile();
        }, [])
    );

    const fetchProfile = useCallback(async () => {
        try {
            const data = await getParentDashboardStats();
            if (data.profile) {
                setProfile(data.profile);
            }
        } catch (error) {
            console.error("Failed to fetch profile:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    const handleUpdateProfile = async (updatedData) => {
        try {
            setLoading(true);
            await updateParentProfile(updatedData);
            setProfile({ ...profile, ...updatedData });
            Alert.alert("Success", "Profile updated successfully");
        } catch (error) {
            Alert.alert("Error", error.message || "Failed to update profile");
        } finally {
            setLoading(false);
        }
    };

    const openEditModal = (label, value, key) => {
        setEditField({ label, value: value || '', key });
        setIsEditModalVisible(true);
    };

    const handleLogout = async () => {
        Alert.alert(
            "Log Out",
            "Are you sure you want to log out?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Log Out",
                    onPress: async () => {
                        await logout();
                        navigation.replace('Login');
                    },
                    style: 'destructive'
                }
            ]
        );
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.center]}>
                <ActivityIndicator size="large" color="#9D5BF0" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <CommonHeader
                title="Settings"
                backgroundColor={COLORS.white}
            />
            <View style={styles.safeArea}>

                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    {/* Profile Card */}
                    <LinearGradient colors={['#9D5BF0', '#7C3AED']} style={styles.profileCard}>
                        <TouchableOpacity
                            style={styles.avatarContainer}
                            onPress={() => setIsAvatarModalVisible(true)}
                        >
                            <Image
                                source={profile?.photoUrl ? { uri: profile.photoUrl } : { uri: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png' }}
                                style={styles.avatar}
                            />
                            <View style={styles.editBadge}>
                                <User size={12} color="#fff" />
                            </View>
                        </TouchableOpacity>
                        <Text style={styles.parentName}>{profile?.fullName || 'Parent'}</Text>
                        <Text style={styles.parentEmail}>{profile?.email || 'No email provided'}</Text>
                    </LinearGradient>

                    {/* Dark Mode Toggle */}
                    <View style={styles.settingItem}>
                        <View style={styles.settingLabelGroup}>
                            <View style={[styles.iconBox, { backgroundColor: '#F5F3FF' }]}>
                                <Moon size={20} color="#9D5BF0" />
                            </View>
                            <Text style={styles.settingLabel}>Dark Mode</Text>
                        </View>
                        <Switch
                            value={isDarkMode}
                            onValueChange={setIsDarkMode}
                            trackColor={{ false: '#E2E8F0', true: '#9D5BF0' }}
                            thumbColor="#fff"
                        />
                    </View>

                    {/* Info Section */}
                    <View style={styles.infoSection}>
                        <InfoRow
                            icon={<User size={20} color="#94A3B8" />}
                            label="Full Name"
                            value={profile?.fullName || "Not Set"}
                            onEdit={() => openEditModal('Full Name', profile?.fullName, 'fullName')}
                        />
                        <InfoRow
                            icon={<Phone size={20} color="#94A3B8" />}
                            label="Phone Number"
                            value={profile?.phone || "Not Set"}
                            onEdit={() => openEditModal('Phone Number', profile?.phone, 'phone')}
                        />
                        <InfoRow
                            icon={<Mail size={20} color="#94A3B8" />}
                            label="Email Address"
                            value={profile?.email || "Not Set"}
                            onEdit={() => openEditModal('Email Address', profile?.email, 'email')}
                        />
                        <InfoRow
                            icon={<Shield size={20} color="#94A3B8" />}
                            label="NIC Number"
                            value={profile?.nic || "Not Set"}
                            isLocked={true}
                        />
                        <InfoRow
                            icon={<MapPin size={20} color="#94A3B8" />}
                            label="Address"
                            value={profile?.address || "Not Set"}
                            onEdit={() => openEditModal('Address', profile?.address, 'address')}
                        />
                    </View>

                    {/* Actions Section */}
                    <View style={{ marginTop: 20 }}>
                        <TouchableOpacity style={styles.actionItem} onPress={() => setIsPasswordModalVisible(true)}>
                            <View style={styles.settingLabelGroup}>
                                <View style={[styles.iconBox, { backgroundColor: '#F8FAFC' }]}>
                                    <Lock size={20} color="#94A3B8" />
                                </View>
                                <Text style={styles.settingLabel}>Change Password</Text>
                            </View>
                            <ChevronRight size={20} color="#E2E8F0" />
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                            <LogOut size={20} color="#EF4444" />
                            <Text style={styles.logoutText}>Log Out</Text>
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.versionText}>App Version 1.0.1</Text>

                    <View style={{ height: 100 }} />
                </ScrollView>
            </View>

            {/* Avatar Selection Modal */}
            <Modal
                visible={isAvatarModalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setIsAvatarModalVisible(false)}
            >
                <TouchableWithoutFeedback onPress={() => setIsAvatarModalVisible(false)}>
                    <View style={styles.modalOverlay}>
                        <TouchableWithoutFeedback>
                            <View style={styles.modalView}>
                                <View style={styles.modalHeader}>
                                    <View style={styles.modalIndicator} />
                                    <View style={styles.modalTitleRow}>
                                        <Text style={styles.modalTitle}>Choose Avatar</Text>
                                        <TouchableOpacity onPress={() => setIsAvatarModalVisible(false)}>
                                            <X size={24} color={COLORS.black} />
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                <View style={styles.avatarGrid}>
                                    {avatars.map((url, index) => (
                                        <TouchableOpacity
                                            key={index}
                                            style={styles.avatarOption}
                                            onPress={() => {
                                                handleUpdateProfile({ photoUrl: url });
                                                setIsAvatarModalVisible(false);
                                            }}
                                        >
                                            <Image source={{ uri: url }} style={styles.gridAvatar} />
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                <TouchableOpacity style={styles.uploadBtn}>
                                    <Text style={styles.uploadBtnText}>Upload from Gallery</Text>
                                </TouchableOpacity>
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
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
                                        onPress={() => {
                                            handleUpdateProfile({ [editField.key]: editField.value });
                                            setIsEditModalVisible(false);
                                        }}
                                    >
                                        <Text style={styles.saveBtnText}>Save</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
            {/* Change Password Modal */}
            <Modal
                visible={isPasswordModalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setIsPasswordModalVisible(false)}
            >
                <TouchableWithoutFeedback onPress={() => setIsPasswordModalVisible(false)}>
                    <View style={styles.modalOverlay}>
                        <TouchableWithoutFeedback>
                            <View style={styles.modalView}>
                                <View style={styles.modalHeader}>
                                    <View style={styles.modalIndicator} />
                                    <Text style={styles.modalTitle}>Change Password</Text>
                                </View>

                                <TextInput
                                    style={styles.modalInput}
                                    placeholder="Current Password"
                                    secureTextEntry
                                    value={passwordData.current}
                                    onChangeText={(t) => setPasswordData({ ...passwordData, current: t })}
                                />
                                <TextInput
                                    style={styles.modalInput}
                                    placeholder="New Password"
                                    secureTextEntry
                                    value={passwordData.new}
                                    onChangeText={(t) => setPasswordData({ ...passwordData, new: t })}
                                />
                                <TextInput
                                    style={styles.modalInput}
                                    placeholder="Confirm New Password"
                                    secureTextEntry
                                    value={passwordData.confirm}
                                    onChangeText={(t) => setPasswordData({ ...passwordData, confirm: t })}
                                />

                                <TouchableOpacity
                                    style={[styles.saveBtn, { height: 56, borderRadius: 16, marginTop: 10 }]}
                                    onPress={async () => {
                                        if (passwordData.new !== passwordData.confirm) {
                                            Alert.alert("Error", "Passwords do not match");
                                            return;
                                        }
                                        setSubmitting(true);
                                        try {
                                            await apiChangePassword(passwordData.current, passwordData.new);
                                            Alert.alert("Success", "Password changed successfully");
                                            setIsPasswordModalVisible(false);
                                            setPasswordData({ current: '', new: '', confirm: '' });
                                        } catch (e) {
                                            Alert.alert("Error", e.message || "Failed to change password");
                                        } finally {
                                            setSubmitting(false);
                                        }
                                    }}
                                >
                                    {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Update Password</Text>}
                                </TouchableOpacity>
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
        </View>
    );
};

const InfoRow = ({ icon, label, value, onEdit, isLocked }) => (
    <View style={styles.infoRow}>
        <View style={styles.infoIconBox}>
            {icon}
        </View>
        <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>{label}</Text>
            <Text style={styles.infoValue}>{value}</Text>
        </View>
        {isLocked ? (
            <Lock size={16} color="#E2E8F0" />
        ) : (
            <TouchableOpacity onPress={onEdit}>
                <Text style={styles.editText}>Edit</Text>
            </TouchableOpacity>
        )}
    </View>
);

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    center: { justifyContent: 'center', alignItems: 'center' },
    safeArea: { flex: 1 },
    headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#9D5BF0', paddingHorizontal: 24, paddingVertical: 15 },
    scrollContent: { paddingHorizontal: 24 },

    profileCard: {
        borderRadius: 32,
        padding: 30,
        alignItems: 'center',
        marginBottom: 24,
        elevation: 8,
        shadowColor: '#9D5BF0',
        shadowOpacity: 0.3,
        shadowRadius: 15
    },
    avatarContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(255,255,255,0.2)',
        padding: 4,
        marginBottom: 16
    },
    avatar: { width: '100%', height: '100%', borderRadius: 50 },
    parentName: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
    parentEmail: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4 },

    settingItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 24,
        marginBottom: 20,
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.03,
        borderWidth: 1,
        borderColor: '#F1F5F9'
    },
    settingLabelGroup: { flexDirection: 'row', alignItems: 'center' },
    iconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
    settingLabel: { fontSize: 16, fontWeight: '600', color: '#1E293B' },

    infoSection: {
        backgroundColor: '#fff',
        borderRadius: 24,
        paddingVertical: 8,
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.03,
        borderWidth: 1,
        borderColor: '#F1F5F9'
    },
    infoRow: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
    infoIconBox: { marginRight: 16 },
    infoContent: { flex: 1 },
    infoLabel: { fontSize: 12, color: '#94A3B8', fontWeight: 'bold' },
    infoValue: { fontSize: 15, color: '#1E293B', fontWeight: 'bold', marginTop: 2 },
    editText: { color: '#9D5BF0', fontWeight: 'bold', fontSize: 14 },

    actionItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 24,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#F1F5F9'
    },

    logoutBtn: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFF5F5',
        padding: 18,
        borderRadius: 20,
        marginTop: 10
    },
    logoutText: { color: '#EF4444', fontWeight: 'bold', fontSize: 16, marginLeft: 10 },
    versionText: { textAlign: 'center', color: '#94A3B8', marginTop: 30, fontSize: 13, fontWeight: '500' },

    // Modal Styles
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalView: { backgroundColor: '#fff', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 30 },
    modalHeader: { alignItems: 'center', marginBottom: 24 },
    modalIndicator: { width: 40, height: 4, backgroundColor: '#E2E8F0', borderRadius: 2, marginBottom: 20 },
    modalTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' },
    modalTitle: { fontSize: 22, fontWeight: 'bold', color: COLORS.black },

    avatarGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 15, marginBottom: 30 },
    avatarOption: { width: '30%', aspectRatio: 1, borderRadius: 20, backgroundColor: '#F8F9FA', padding: 10, borderWidth: 1, borderColor: '#F1F5F9' },
    gridAvatar: { width: '100%', height: '100%', borderRadius: 15 },

    uploadBtn: { backgroundColor: '#F3EFFF', padding: 18, borderRadius: 20, alignItems: 'center', borderWidth: 1, borderColor: '#E9D5FF', borderStyle: 'dashed' },
    uploadBtnText: { color: '#9D5BF0', fontWeight: 'bold', fontSize: 16 },

    editBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#9D5BF0', width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#fff' },

    modalInput: { backgroundColor: '#F8FAFC', borderRadius: 16, padding: 18, fontSize: 16, marginVertical: 24, borderWidth: 1, borderColor: '#E2E8F0', color: COLORS.black },
    modalActions: { flexDirection: 'row', gap: 12 },
    modalBtn: { flex: 1, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    cancelBtn: { backgroundColor: '#F1F5F9' },
    cancelBtnText: { color: '#64748B', fontWeight: 'bold', fontSize: 16 },
    saveBtn: { backgroundColor: '#9D5BF0' },
    saveBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});

export default ProfileScreen;
