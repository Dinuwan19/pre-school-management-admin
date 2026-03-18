import React, { useState, useEffect } from 'react';
import { Card, Button, Typography, List, Modal, Form, Input, Select, message, Tag, Space, Avatar, Divider, Row, Col, theme } from 'antd';
import { PlusOutlined, BellOutlined, UserOutlined, DeleteOutlined, GlobalOutlined, TeamOutlined } from '@ant-design/icons';
import { fetchClassrooms, fetchNotifications, createNotification, deleteNotification } from '../../api/services';
import { useAuth } from '../../context/AuthContext';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

const Announcements = () => {
    const { user } = useAuth();
    const { token: { colorBgContainer, colorBgLayout, colorPrimary, colorPrimaryBg, colorText, colorTextSecondary } } = theme.useToken();
    const [announcements, setAnnouncements] = useState([]);
    const [loading, setLoading] = useState(false);
    const [classrooms, setClassrooms] = useState([]);
    const [targetType, setTargetType] = useState(user?.role === 'TEACHER' ? 'CLASS' : 'ALL');
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [form] = Form.useForm();

    const fetchClassrooms = async () => {
        try {
            const res = await fetchClassrooms();
            setClassrooms(res.data);
        } catch (error) {
            console.error('Failed to load classrooms');
        }
    };

    const fetchAnnouncements = async () => {
        setLoading(true);
        try {
            const res = await fetchNotifications();
            setAnnouncements(res.data);
        } catch (error) {
            message.error(error.errorMessage || 'Failed to load announcements');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAnnouncements();
        fetchClassrooms();
    }, []);

    const handleCreate = async () => {
        try {
            const values = await form.validateFields();
            const payload = {
                ...values,
                targetRole: values.targetType === 'CLASS' ? 'PARENT' : values.targetType,
                targetClassroomId: values.targetType === 'CLASS' ? values.targetClassroomId : null
            };

            setLoading(true);
            await createNotification(payload);
            message.success('Announcement published');
            setIsModalVisible(false);
            form.resetFields();
            setTargetType(user?.role === 'TEACHER' ? 'CLASS' : 'ALL');
            fetchAnnouncements();
        } catch (error) {
            message.error('Failed to publish announcement');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        try {
            await deleteNotification(id);
            message.success('Announcement deleted');
            fetchAnnouncements();
        } catch (error) {
            message.error('Failed to delete');
        }
    };

    const getTargetTag = (item) => {
        if (item.targetClassroomId && item.classroom) {
            return <Tag color="orange" icon={<TeamOutlined />}>Class: {item.classroom.name}</Tag>;
        }
        switch (item.targetRole) {
            case 'ALL': return <Tag color="blue" icon={<GlobalOutlined />}>Everyone</Tag>;
            case 'TEACHER': return <Tag color="purple" icon={<UserOutlined />}>Teachers Only</Tag>;
            case 'PARENT': return <Tag color="cyan" icon={<TeamOutlined />}>Parents Only</Tag>;
            default: return <Tag>{item.targetRole}</Tag>;
        }
    };

    return (
        <div style={{ margin: '0 auto', paddingBottom: 40 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, marginTop: 12 }}>
                <div>
                    <Title level={4} style={{ margin: 0, color: colorText }}>Announcements</Title>
                    <Text type="secondary" style={{ fontSize: 13 }}>Broadcast important updates to parents and staff</Text>
                </div>
                {(user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN') && (
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => setIsModalVisible(true)}
                        style={{ background: '#7B57E4', height: 44, borderRadius: 8, fontWeight: 600, padding: '0 20px' }}
                    >
                        Create Announcement
                    </Button>
                )}
            </div>

            <List
                loading={loading}
                dataSource={announcements}
                renderItem={(item) => (
                    <Card
                        style={{ marginBottom: 12, borderRadius: 12, boxShadow: 'none', border: 'none', background: colorBgContainer }}
                        bodyStyle={{ padding: 16 }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ display: 'flex', gap: 12 }}>
                                <Avatar
                                    icon={<BellOutlined />}
                                    style={{ background: colorPrimaryBg, color: '#7B57E4' }}
                                    size={40}
                                />
                                <div>
                                    <Title level={5} style={{ margin: 0, marginBottom: 2 }}>{item.title}</Title>
                                    <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                                        {getTargetTag(item)}
                                        <Text type="secondary" style={{ fontSize: 12 }}>
                                            • {dayjs(item.createdAt).format('MMM D, YYYY')} by {item.createdBy?.fullName}
                                        </Text>
                                    </div>
                                    <Paragraph style={{ fontSize: 13.5, color: colorTextSecondary, lineHeight: 1.5, margin: 0 }}>
                                        {item.message}
                                    </Paragraph>
                                </div>
                            </div>
                            {(user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' || item.createdById === user?.id) && (
                                <Button
                                    type="text"
                                    danger
                                    icon={<DeleteOutlined />}
                                    onClick={() => handleDelete(item.id)}
                                />
                            )}
                        </div>
                    </Card>
                )}
                locale={{ emptyText: <div style={{ padding: '60px 0' }}>No announcements yet</div> }}
            />

            <Modal
                title="Create New Announcement"
                open={isModalVisible}
                onCancel={() => setIsModalVisible(false)}
                onOk={handleCreate}
                okText="Publish Announcement"
                confirmLoading={loading}
                width={600}
                okButtonProps={{ style: { background: '#7B57E4', fontWeight: 600, borderRadius: 8 } }}
            >
                <Form form={form} layout="vertical" style={{ marginTop: 24 }}>
                    <Form.Item name="title" label="Announcement Title" rules={[{ required: true }]}>
                        <Input placeholder="Enter a clear, descriptive title" size="large" />
                    </Form.Item>

                    <Form.Item name="targetType" label="Recipient Group" rules={[{ required: true }]} initialValue={user?.role === 'TEACHER' ? 'CLASS' : 'ALL'}>
                        <Select size="large" onChange={val => setTargetType(val)}>
                            {user?.role !== 'TEACHER' && <Option value="ALL">All Users</Option>}
                            {user?.role !== 'TEACHER' && <Option value="TEACHER">Staff & Teachers</Option>}
                            {user?.role !== 'TEACHER' && <Option value="PARENT">Parents Only</Option>}
                            <Option value="CLASS">Specific Classroom</Option>
                        </Select>
                    </Form.Item>

                    {targetType === 'CLASS' && (
                        <Form.Item name="targetClassroomId" label="Select Classroom" rules={[{ required: true, message: 'Please select a classroom' }]}>
                            <Select size="large" placeholder="Choose a class">
                                {classrooms.map(cls => (
                                    <Option key={cls.id} value={cls.id}>{cls.name}</Option>
                                ))}
                            </Select>
                        </Form.Item>
                    )}

                    <Form.Item name="message" label="Message Content" rules={[{ required: true }]}>
                        <Input.TextArea rows={5} placeholder="Type your announcement details here..." />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default Announcements;
