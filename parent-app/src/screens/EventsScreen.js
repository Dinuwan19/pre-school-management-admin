import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Image, Modal, ScrollView, Linking, ActivityIndicator, Alert, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Calendar, MapPin, Clock, FileText, Download, X, Camera } from 'lucide-react-native';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import dayjs from 'dayjs';
import { COLORS } from '../constants/theme';
import { BASE_URL } from '../config/api';
import CommonHeader from '../components/CommonHeader';
import api from '../config/api';

const { width } = Dimensions.get('window');

const EventCard = React.memo(({ item, onPress, getMediaUri }) => (
    <TouchableOpacity style={styles.card} onPress={onPress}>
        {item.mediaUrl && (
            <Image
                source={{ uri: item.mediaUrl.startsWith('http') ? item.mediaUrl : `${BASE_URL}${item.mediaUrl}` }}
                style={styles.commImage}
                resizeMode="cover"
            />
        )}
        <View style={styles.cardContent}>
            <View style={styles.dateBox}>
                <Text style={styles.month}>{dayjs(item.eventDate).format('MMM').toUpperCase()}</Text>
                <Text style={styles.day}>{dayjs(item.eventDate).format('DD')}</Text>
            </View>
            <View style={styles.info}>
                <Text style={styles.title}>{item.title}</Text>
                <View style={styles.row}>
                    <Clock size={14} color="#6B7280" />
                    <Text style={styles.metaText}>{item.startTime} - {item.endTime}</Text>
                </View>
                <View style={styles.row}>
                    <MapPin size={14} color="#6B7280" />
                    <Text style={styles.metaText}>{item.location || 'School Premises'}</Text>
                </View>
            </View>
        </View>
        {item.description && (
            <Text style={styles.desc} numberOfLines={2}>{item.description}</Text>
        )}
        {item.event_media?.length > 0 && (
            <View style={styles.mediaBadge}>
                <Image source={{ uri: getMediaUri(item.event_media[0].url) }} style={styles.tinyMedia} />
                <Text style={styles.mediaCount}>+{item.event_media.length} Photos</Text>
            </View>
        )}
    </TouchableOpacity>
));

const EventsScreen = ({ navigation }) => {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [filter, setFilter] = useState('ALL'); // Default to ALL
    const [imageModalVisible, setImageModalVisible] = useState(false);
    const [selectedImageUrl, setSelectedImageUrl] = useState(null);
    const [isDownloading, setIsDownloading] = useState(false);

    const fetchEvents = async () => {
        setLoading(true);
        try {
            const response = await api.get(`/events?status=${filter}`);
            setEvents(response.data);
        } catch (error) {
            console.error('Failed to fetch events', error);
        } finally {
            setLoading(false);
        }
    };

    const getMediaUri = useCallback((path) => {
        if (!path) return null;
        return path.startsWith('http') ? path : `${BASE_URL}${path}`;
    }, []);

    // ... (Downloading & Modal logic remains same)

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

    useFocusEffect(
        useCallback(() => {
            fetchEvents();
        }, [filter])
    );

    const renderEvent = useCallback(({ item }) => (
        <EventCard
            item={item}
            onPress={() => setSelectedEvent(item)}
            getMediaUri={getMediaUri}
        />
    ), [getMediaUri]);

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <CommonHeader title="All School Events" showBack={false} />

            {/* Filter Tabs Removed - Single List View */}

            <FlatList
                data={events}
                renderItem={renderEvent}
                keyExtractor={item => item.id.toString()}
                contentContainerStyle={styles.list}
                refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchEvents} colors={[COLORS.primary]} />}
                ListEmptyComponent={
                    !loading && <Text style={styles.emptyText}>No events found.</Text>
                }
            />

            <Modal
                visible={!!selectedEvent}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setSelectedEvent(null)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            {selectedEvent?.mediaUrl && (
                                <TouchableOpacity
                                    activeOpacity={0.9}
                                    onPress={() => openImageFullscreen(selectedEvent.mediaUrl.startsWith('http') ? selectedEvent.mediaUrl : `${BASE_URL}${selectedEvent.mediaUrl}`)}
                                >
                                    <Image
                                        source={{ uri: getMediaUri(selectedEvent.mediaUrl) }}
                                        style={styles.modalCover}
                                    />
                                </TouchableOpacity>
                            )}
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>{selectedEvent?.title}</Text>
                                <TouchableOpacity onPress={() => setSelectedEvent(null)}>
                                    <View style={styles.closeBtn}><Text style={styles.closeText}>✕</Text></View>
                                </TouchableOpacity>
                            </View>

                            <View style={styles.modalMeta}>
                                <View style={styles.metaRow}>
                                    <Calendar size={18} color="#9D5BF0" />
                                    <Text style={styles.modalMetaText}>{selectedEvent?.eventDate && dayjs(selectedEvent.eventDate).format('MMMM D, YYYY')}</Text>
                                </View>
                                <View style={styles.metaRow}>
                                    <Clock size={18} color="#9D5BF0" />
                                    <Text style={styles.modalMetaText}>{selectedEvent?.startTime} - {selectedEvent?.endTime}</Text>
                                </View>
                                <View style={styles.metaRow}>
                                    <MapPin size={18} color="#9D5BF0" />
                                    <Text style={styles.modalMetaText}>{selectedEvent?.location || 'School Premises'}</Text>
                                </View>
                            </View>

                            <Text style={styles.modalDesc}>{selectedEvent?.description}</Text>

                            {selectedEvent?.event_media?.length > 0 && (
                                <View style={styles.galleryContainer}>
                                    <Text style={styles.sectionTitle}>Event Media</Text>
                                    <View style={styles.galleryGrid}>
                                        {selectedEvent.event_media.map((media) => (
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
                                                    <Image source={{ uri: getMediaUri(media.url) }} style={styles.galleryImage} />
                                                ) : (
                                                    <View style={styles.filePlaceholder}>
                                                        <FileText size={24} color="#9CA3AF" />
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
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    list: { padding: 16 },
    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 5
    },
    commImage: {
        width: '100%',
        height: 150,
        borderRadius: 12,
        marginBottom: 12
    },
    cardContent: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    dateBox: {
        width: 50,
        height: 50,
        borderRadius: 12,
        backgroundColor: '#F3E8FF',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16
    },
    month: { fontSize: 10, color: '#9D5BF0', fontWeight: 'bold' },
    day: { fontSize: 18, color: '#9D5BF0', fontWeight: 'bold' },
    info: { flex: 1 },
    title: { fontSize: 16, fontWeight: 'bold', color: '#1F2937', marginBottom: 4 },
    row: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
    metaText: { fontSize: 12, color: '#6B7280', marginLeft: 4 },
    desc: { fontSize: 13, color: '#4B5563', lineHeight: 18, marginTop: 4 },
    emptyText: { textAlign: 'center', marginTop: 50, color: '#9CA3AF' },

    // New Styles
    filterContainer: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 8, gap: 8 },
    filterBtn: { paddingVertical: 6, paddingHorizontal: 16, borderRadius: 20, backgroundColor: '#F3F4F6' },
    filterBtnActive: { backgroundColor: '#9D5BF0' },
    filterText: { fontSize: 12, color: '#6B7280', fontWeight: 'bold' },
    filterTextActive: { color: '#fff' },
    mediaBadge: { flexDirection: 'row', alignItems: 'center', marginTop: 12, backgroundColor: '#F3E8FF', padding: 4, borderRadius: 8, alignSelf: 'flex-start' },
    tinyMedia: { width: 24, height: 24, borderRadius: 4, marginRight: 6 },
    mediaCount: { fontSize: 11, color: '#9D5BF0', fontWeight: 'bold' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 32, borderTopRightRadius: 32, height: '85%', padding: 24 },
    modalCover: { width: '100%', height: 200, borderRadius: 24, marginBottom: 20 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
    modalTitle: { fontSize: 24, fontWeight: 'bold', color: '#111827', flex: 1 },
    closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
    closeText: { fontSize: 16, color: '#6B7280' },
    modalMeta: { backgroundColor: '#F9FAFB', borderRadius: 16, padding: 16, marginBottom: 20, gap: 12 },
    metaRow: { flexDirection: 'row', alignItems: 'center' },
    modalMetaText: { marginLeft: 10, color: '#4B5563', fontSize: 14 },
    modalDesc: { color: '#4B5563', lineHeight: 22, fontSize: 15, marginBottom: 24 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827', marginBottom: 16 },
    galleryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    galleryItem: { width: '30%', aspectRatio: 1, borderRadius: 12, overflow: 'hidden', backgroundColor: '#F3F4F6' },
    galleryImage: { width: '100%', height: '100%' },
    filePlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    fileText: { fontSize: 10, color: '#9CA3AF', marginTop: 4 },

    // Image Viewer Styles
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
    }
});

export default EventsScreen;
