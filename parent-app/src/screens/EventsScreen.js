import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, MapPin, Clock } from 'lucide-react-native';
import { COLORS } from '../constants/theme';
import CommonHeader from '../components/CommonHeader';
import api from '../config/api';

const EventsScreen = ({ navigation }) => {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchEvents = async () => {
        setLoading(true);
        try {
            const response = await api.get('/events?status=UPCOMING'); // Fetch upcoming by default
            setEvents(response.data);
        } catch (error) {
            console.error('Failed to fetch events', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEvents();
    }, []);

    const renderEvent = ({ item }) => (
        <View style={styles.card}>
            {item.mediaUrl && (
                <Image source={{ uri: item.mediaUrl }} style={styles.commImage} resizeMode="cover" />
            )}
            <View style={styles.cardContent}>
                <View style={styles.dateBox}>
                    <Text style={styles.month}>{new Date(item.eventDate).toLocaleString('default', { month: 'short' }).toUpperCase()}</Text>
                    <Text style={styles.day}>{new Date(item.eventDate).getDate()}</Text>
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
        </View>
    );

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <CommonHeader title="School Events" showBack={false} />
            <FlatList
                data={events}
                renderItem={renderEvent}
                keyExtractor={item => item.id.toString()}
                contentContainerStyle={styles.list}
                refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchEvents} colors={[COLORS.primary]} />}
                ListEmptyComponent={
                    !loading && <Text style={styles.emptyText}>No upcoming events found.</Text>
                }
            />
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
    emptyText: { textAlign: 'center', marginTop: 50, color: '#9CA3AF' }
});

export default EventsScreen;
