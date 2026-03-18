import React, { useState, useEffect } from 'react';
import { Card, Button, Tag, Modal, Form, Input, DatePicker, TimePicker, Select, Typography, message, Space, Row, Col, Upload, List, Avatar, theme } from 'antd';
import { CalendarOutlined, PlusOutlined, EnvironmentOutlined, UserOutlined, FileTextOutlined, CheckCircleOutlined, DeleteOutlined, EditOutlined, UploadOutlined, EyeOutlined, ClockCircleOutlined } from '@ant-design/icons';
import api, { getMediaUrl } from '../api/client';
import dayjs from 'dayjs';
import { useAuth } from '../context/AuthContext';

const { Title, Text } = Typography;
const { TextArea } = Input;

const Events = () => {
    const [events, setEvents] = useState([]);
    const [waitingList, setWaitingList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [classrooms, setClassrooms] = useState([]); // Added state
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [form] = Form.useForm();
    const [mediaForm] = Form.useForm();
    const [submitting, setSubmitting] = useState(false);
    const [filterStatus, setFilterStatus] = useState('All Events');
    const [editingEvent, setEditingEvent] = useState(null);
    const [mediaModalVisible, setMediaModalVisible] = useState(false);
    const [selectedEventForMedia, setSelectedEventForMedia] = useState(null);
    const [viewingGallery, setViewingGallery] = useState(false);
    const [detailModalVisible, setDetailModalVisible] = useState(false);
    const [selectedEventForDetails, setSelectedEventForDetails] = useState(null);
    const { user } = useAuth();
    const {
        token: { colorBgContainer, colorBgLayout, colorPrimary, colorTextSecondary, colorBorder, colorText, colorPrimaryBg },
    } = theme.useToken();

    const fetchEvents = async () => {
        setLoading(true);
        try {
            const response = await api.get('/events');
            setEvents(response.data);
        } catch (error) {
            message.error('Failed to fetch events');
        } finally {
            setLoading(false);
        }
    };

    const fetchWaitingList = async () => {
        try {
            const response = await api.get('/events/waiting-list/all');
            setWaitingList(response.data);
        } catch (error) {
            console.error('Failed to fetch waiting list');
        }
    };

    const fetchClassrooms = async () => {
        try {
            const response = await api.get('/classrooms');
            setClassrooms(response.data);
        } catch (error) {
            console.error('Failed to fetch classrooms');
        }
    };

    useEffect(() => {
        fetchEvents();
        fetchWaitingList();
        fetchClassrooms();
    }, []);

    const handleCreateEvent = async (values) => {
        setSubmitting(true);
        try {
            const payload = {
                ...values,
                eventDate: values.eventDate.format('YYYY-MM-DD'),
                startTime: values.startTime.format('HH:mm'),
                endTime: values.endTime.format('HH:mm'),
            };
            await api.post('/events', payload);
            message.success('Event created successfully');
            setIsModalVisible(false);
            form.resetFields();
            fetchEvents();
        } catch (error) {
            message.error('Failed to create event');
        } finally {
            setSubmitting(false);
        }
    };

    const handleApprovePayload = async (id) => {
        try {
            await api.put(`/events/waiting-list/${id}/approve`);
            message.success('Request approved');
            fetchWaitingList();
            fetchEvents(); // Update event counts
        } catch (error) {
            message.error('Failed to approve request');
        }
    };

    const handleApproveEvent = async (id) => {
        try {
            await api.put(`/events/${id}/approve`);
            message.success('Event approved and published');
            fetchEvents();
        } catch (error) {
            message.error('Failed to approve event');
        }
    };

    const handleEdit = (event) => {
        setEditingEvent(event);
        form.setFieldsValue({
            ...event,
            eventDate: dayjs(event.eventDate),
            startTime: dayjs(`2000-01-01 ${event.startTime}`),
            endTime: dayjs(`2000-01-01 ${event.endTime}`),
        });
        setIsModalVisible(true);
    };

    const handleUpdateEvent = async (values) => {
        setSubmitting(true);
        try {
            const payload = {
                ...values,
                eventDate: values.eventDate.format('YYYY-MM-DD'),
                startTime: values.startTime.format('HH:mm'),
                endTime: values.endTime.format('HH:mm'),
            };
            await api.put(`/events/${editingEvent.id}/status`, payload);
            message.success('Event updated successfully');
            setIsModalVisible(false);
            setEditingEvent(null);
            form.resetFields();
            fetchEvents();
        } catch (error) {
            message.error('Failed to update event');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = (id) => {
        Modal.confirm({
            title: 'Delete Event',
            content: 'Are you sure you want to delete this event?',
            okText: 'Yes, Delete',
            okType: 'danger',
            cancelText: 'No',
            onOk: async () => {
                try {
                    await api.delete(`/events/${id}`);
                    message.success('Event deleted');
                    fetchEvents();
                } catch (error) {
                    message.error('Failed to delete event');
                }
            }
        });
    };

    const getStatusColor = (status) => {
        const colors = {
            'UPCOMING': 'blue',
            'PUBLISHED': 'blue',
            'COMPLETED': 'green',
            'CANCELLED': 'red',
            'PENDING': 'orange'
        };
        return colors[status] || 'default';
    };

    const handleUploadMedia = async (values) => {
        setSubmitting(true);
        try {
            const formData = new FormData();
            if (values.media && values.media.fileList) {
                values.media.fileList.forEach(file => {
                    formData.append('media', file.originFileObj);
                });
            }

            await api.post(`/events/${selectedEventForMedia.id}/media`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            message.success('Media uploaded successfully');
            setMediaModalVisible(false);
            mediaForm.resetFields();

            // Refresh both the list and the active detail view if open
            if (selectedEventForDetails) {
                const updatedEvent = await api.get(`/events/${selectedEventForDetails.id}`);
                setSelectedEventForDetails(updatedEvent.data);
            }
            fetchEvents();
        } catch (error) {
            message.error('Failed to upload media');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteMedia = async (mediaId) => {
        try {
            await api.delete(`/events/media/${mediaId}`);
            message.success('Media deleted');
            // Refresh the selected event data to update the gallery
            if (selectedEventForDetails) {
                const updatedEvent = await api.get(`/events/${selectedEventForDetails.id}`);
                setSelectedEventForDetails(updatedEvent.data);
            }
            fetchEvents();
        } catch (error) {
            message.error('Failed to delete media');
        }
    };

    const filteredEvents = events.filter(event => {
        if (filterStatus === 'All Events') return true;
        return event.status === filterStatus.toUpperCase();
    });

    return (
        <div style={{ paddingBottom: 40, background: colorBgLayout, minHeight: '100vh' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
                <div>
                    <Title level={4} style={{ margin: 0 }}>Events</Title>
                    <Text type="secondary">Manage school events and activities</Text>
                </div>
                {['SUPER_ADMIN', 'ADMIN', 'STAFF'].includes(user?.role) && (
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => { setEditingEvent(null); form.resetFields(); setIsModalVisible(true); }}
                        style={{ background: '#7B57E4', borderRadius: 8, height: 44, fontWeight: 600, padding: '0 20px' }}
                    >
                        Create Event
                    </Button>
                )}
            </div>

            <div style={{ marginBottom: 24 }}>
                <Space size={8}>
                    {['All Events', 'Upcoming', 'Completed', 'Pending'].map(s => (
                        <Tag.CheckableTag
                            key={s}
                            checked={filterStatus === s}
                            onChange={() => setFilterStatus(s)}
                            style={{
                                padding: '6px 16px',
                                borderRadius: 20,
                                fontSize: 13,
                                border: 'none',
                                background: filterStatus === s ? colorPrimary : 'transparent',
                                color: filterStatus === s ? 'white' : colorTextSecondary
                            }}
                        >
                            {s}
                        </Tag.CheckableTag>
                    ))}
                </Space>
            </div>

            <List
                grid={{ gutter: 24, xs: 1, sm: 2, md: 2, lg: 3, xl: 3 }}
                dataSource={filteredEvents}
                loading={loading}
                renderItem={item => (
                    <List.Item>
                        <Card
                            hoverable
                            style={{ borderRadius: 20, border: 'none', boxShadow: 'none', background: colorBgContainer }}
                            bodyStyle={{ padding: 24 }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                                <Title level={4} style={{ margin: 0, fontSize: 18 }}>{item.title}</Title>
                                <Space size={4} style={{ color: colorTextSecondary }}>
                                    <UserOutlined />
                                    <Text style={{ fontSize: 13 }}>{item.attendees || 0}/20</Text>
                                </Space>
                            </div>

                            <Tag color={getStatusColor(item.status)} style={{ borderRadius: 6, margin: '8px 0 16px 0', border: 'none', padding: '2px 8px' }}>
                                {item.status}
                            </Tag>

                            <div style={{ marginBottom: 24 }}>
                                <Space direction="vertical" size={4} style={{ width: '100%' }}>
                                    <Space><CalendarOutlined style={{ color: colorTextSecondary }} /> <Text style={{ color: colorTextSecondary }}>{dayjs(item.eventDate).format('MMM D, YYYY')}</Text></Space>
                                    <Space><EnvironmentOutlined style={{ color: colorTextSecondary }} /> <Text style={{ color: colorTextSecondary }}>{item.location}</Text></Space>
                                </Space>
                            </div>

                            <div style={{ borderTop: `1px solid ${colorBorder}`, paddingTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Space>
                                    <Avatar icon={<UserOutlined />} size="small" style={{ backgroundColor: colorPrimaryBg, color: colorPrimary }} />
                                    <div>
                                        <Text type="secondary" style={{ fontSize: 11, display: 'block', lineHeight: 1 }}>Lead Teacher</Text>
                                        <Text strong style={{ fontSize: 13 }}>{item.user?.fullName || 'Admin'}</Text>
                                    </div>
                                </Space>
                                {(user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN') && (
                                    <Space>
                                        <Button
                                            type="text"
                                            icon={<EditOutlined />}
                                            onClick={(e) => { e.stopPropagation(); handleEdit(item); }}
                                            size="small"
                                        />
                                        <Button
                                            type="text"
                                            danger
                                            icon={<DeleteOutlined />}
                                            onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                                            size="small"
                                        />
                                    </Space>
                                )}
                            </div>

                            <div style={{ marginTop: 16 }}>
                                <Button
                                    block
                                    style={{ borderRadius: 12, height: 40, color: colorPrimary, borderColor: colorBorder, background: colorBgLayout }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedEventForDetails(item);
                                        setDetailModalVisible(true);
                                    }}
                                >
                                    View Details
                                </Button>
                            </div>

                            {/* Legacy buttons removed to clean up card, moved to Details view */}


                        </Card>
                    </List.Item>
                )}
            />

            {/* Unified Event Detail Modal (Read-only + Gallery) */}
            <Modal
                title={null}
                open={detailModalVisible}
                onCancel={() => setDetailModalVisible(false)}
                width={800}
                footer={[
                    <Button key="close" onClick={() => setDetailModalVisible(false)}>Close</Button>
                ]}
                bodyStyle={{ padding: 0 }}
                centered
            >
                <div style={{ padding: '24px 32px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                        <div>
                            <Title level={3} style={{ margin: 0 }}>{selectedEventForDetails?.title}</Title>
                            <Tag color={getStatusColor(selectedEventForDetails?.status)} style={{ marginTop: 8, borderRadius: 6, border: 'none' }}>
                                {selectedEventForDetails?.status}
                            </Tag>
                        </div>
                        <Space size={12}>
                            {(user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN') && (
                                <Button
                                    icon={<EditOutlined />}
                                    onClick={() => {
                                        setDetailModalVisible(false);
                                        handleEdit(selectedEventForDetails);
                                    }}
                                >
                                    Edit
                                </Button>
                            )}
                            {(user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN') && selectedEventForDetails?.status === 'COMPLETED' && (
                                <Button
                                    type="primary"
                                    icon={<UploadOutlined />}
                                    style={{ background: '#7B57E4', border: 'none' }}
                                    onClick={() => {
                                        setSelectedEventForMedia(selectedEventForDetails);
                                        setMediaModalVisible(true);
                                    }}
                                >
                                    Upload Media
                                </Button>
                            )}
                        </Space>
                    </div>

                    <Row gutter={48}>
                        <Col span={24} md={14}>
                            <Title level={5}>Description</Title>
                            <Text style={{ display: 'block', marginBottom: 24, fontSize: 15, color: colorText, lineHeight: 1.6 }}>
                                {selectedEventForDetails?.description || 'No description provided.'}
                            </Text>

                            <Space direction="vertical" size={16} style={{ width: '100%', padding: '20px', background: colorBgLayout, borderRadius: 12 }}>
                                <Space><CalendarOutlined style={{ color: colorPrimary }} /> <Text strong>Date:</Text> <Text>{dayjs(selectedEventForDetails?.eventDate).format('MMMM D, YYYY')}</Text></Space>
                                <Space><ClockCircleOutlined style={{ color: colorPrimary }} /> <Text strong>Time:</Text> <Text>{selectedEventForDetails?.startTime} - {selectedEventForDetails?.endTime}</Text></Space>
                                <Space><EnvironmentOutlined style={{ color: colorPrimary }} /> <Text strong>Location:</Text> <Text>{selectedEventForDetails?.location}</Text></Space>
                            </Space>
                        </Col>

                        <Col span={24} md={10}>
                            <Title level={5}>Event Media</Title>
                            <div style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: 8 }}>
                                <Row gutter={12}>
                                    {selectedEventForDetails?.event_media?.map(media => (
                                        <Col key={media.id} span={12} style={{ marginBottom: 12 }}>
                                            <Card
                                                hoverable
                                                size="small"
                                                bodyStyle={{ padding: 4 }}
                                                cover={
                                                    media.type === 'IMAGE' ? (
                                                        <img
                                                            alt="media"
                                                            src={getMediaUrl(media.url)}
                                                            style={{ height: 100, objectFit: 'cover' }}
                                                            onClick={() => window.open(getMediaUrl(media.url), '_blank')}
                                                        />
                                                    ) : (
                                                        <div
                                                            style={{ height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: colorBgLayout }}
                                                            onClick={() => window.open(getMediaUrl(media.url), '_blank')}
                                                        >
                                                            <FileTextOutlined style={{ fontSize: 24, color: colorTextSecondary }} />
                                                        </div>
                                                    )
                                                }
                                                actions={[
                                                    <Button
                                                        type="text"
                                                        danger
                                                        icon={<DeleteOutlined />}
                                                        size="small"
                                                        onClick={(e) => { e.stopPropagation(); handleDeleteMedia(media.id); }}
                                                    />
                                                ]}
                                            />
                                        </Col>
                                    ))}
                                </Row>
                                {(!selectedEventForDetails?.event_media || selectedEventForDetails.event_media.length === 0) && (
                                    <div style={{ padding: '32px 0', textAlign: 'center', border: '1px dashed #E2E8F0', borderRadius: 12 }}>
                                        <Text type="secondary">No media yet</Text>
                                    </div>
                                )}
                            </div>
                        </Col>
                    </Row>
                </div>
            </Modal>

            <Modal
                title={editingEvent ? "Edit Event" : "Create New Event"}
                open={isModalVisible}
                onOk={() => form.submit()}
                okText={editingEvent ? "Update Event" : "Create Event"}
                okButtonProps={{ style: { background: '#7B57E4', fontWeight: 600, borderRadius: 8 }, loading: submitting }}
                onCancel={() => {
                    setIsModalVisible(false);
                    setEditingEvent(null);
                    form.resetFields();
                }}
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={editingEvent ? handleUpdateEvent : handleCreateEvent}
                >
                    <Form.Item name="title" label="Event Title" rules={[{ required: true }]}>
                        <Input placeholder="Ex: Sports Day" />
                    </Form.Item>
                    <Form.Item name="description" label="Description">
                        <TextArea rows={3} />
                    </Form.Item>
                    <Form.Item name="targetClassroomIds" label="Target Audience (Classrooms)">
                        <Select
                            mode="multiple"
                            placeholder="Select classrooms (Leave empty for All)"
                            optionFilterProp="children"
                        >
                            <Select.Option value="all">All Classrooms</Select.Option>
                            {classrooms.map(c => (
                                <Select.Option key={c.id} value={c.id}>{c.name}</Select.Option>
                            ))}
                        </Select>
                    </Form.Item>

                    <Form.Item name="status" label="Event Status" rules={[{ required: true }]}>
                        <Select>
                            <Select.Option value="PENDING">PENDING</Select.Option>
                            <Select.Option value="UPCOMING">PUBLISHED / UPCOMING</Select.Option>
                            <Select.Option value="COMPLETED">COMPLETED</Select.Option>
                            <Select.Option value="CANCELLED">CANCELLED</Select.Option>
                        </Select>
                    </Form.Item>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="eventDate" label="Date" rules={[{ required: true }]}>
                                <DatePicker style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="location" label="Location">
                                <Input prefix={<EnvironmentOutlined />} />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="startTime" label="Start Time" rules={[{ required: true }]}>
                                <TimePicker format="HH:mm" style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="endTime" label="End Time" rules={[{ required: true }]}>
                                <TimePicker format="HH:mm" style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Button type="primary" htmlType="submit" loading={submitting} block style={{ background: '#7B57E4', borderColor: '#7B57E4', height: 40, borderRadius: 8 }}>
                        {editingEvent ? "Update Event" : "Create Event"}
                    </Button>
                </Form>
            </Modal>

            {/* Upload Media Modal */}
            <Modal
                title={`Upload Media - ${selectedEventForMedia?.title}`}
                open={mediaModalVisible}
                onCancel={() => setMediaModalVisible(false)}
                footer={null}
            >
                <Form form={mediaForm} layout="vertical" onFinish={handleUploadMedia}>
                    <Form.Item
                        name="media"
                        label="Select Images/Files"
                        rules={[{ required: true, message: 'Please select at least one file' }]}
                    >
                        <Upload
                            multiple
                            beforeUpload={() => false}
                            listType="picture"
                            accept="image/*,.pdf,.doc,.docx"
                        >
                            <Button icon={<UploadOutlined />}>Click to Select</Button>
                        </Upload>
                    </Form.Item>
                    <Button type="primary" htmlType="submit" loading={submitting} block style={{ background: '#7B57E4', borderColor: '#7B57E4' }}>
                        Start Upload
                    </Button>
                </Form>
            </Modal>

            {/* Legacy gallery modal removed in favor of integrated view */}
        </div>
    );
};

export default Events;
