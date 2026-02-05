import React, { useState, useEffect } from 'react';
import { Card, Button, Typography, List, Modal, Form, Input, Select, message, Tag, Space, Avatar, Divider, Row, Col } from 'antd';
import { PlusOutlined, BellOutlined, UserOutlined, DeleteOutlined, GlobalOutlined, TeamOutlined } from '@ant-design/icons';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

const Announcements = () => {
    const { user } = useAuth();
    const [announcements, setAnnouncements] = useState([]);
    const [loading, setLoading] = useState(false);
    const [classrooms, setClassrooms] = useState([]);
    const [targetType, setTargetType] = useState(user?.role === 'TEACHER' ? 'CLASS' : 'ALL');
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [form] = Form.useForm();

    const fetchClassrooms = async () => {
        try {
            const res = await api.get('/classrooms');
            setClassrooms(res.data);
        } catch (error) {
            console.error('Failed to load classrooms');
        }
    };

    const fetchAnnouncements = async () => {
        setLoading(true);
        try {
            const res = await api.get('/notifications');
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
            // If target is specific class, set role to PARENT (usually) or STUDENT? 
            // Backend expects targetRole AND/OR targetClassroomId.
            // If class is selected, usually it implies parents of that class.

            const payload = {
                ...values,
                targetRole: values.targetType === 'CLASS' ? 'PARENT' : values.targetType,
                targetClassroomId: values.targetType === 'CLASS' ? values.targetClassroomId : null
            };

            setLoading(true);
            await api.post('/notifications', payload);
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

    // ... delete logic ...

    // ... render ...
    <Form.Item name="targetType" label="Recipient Group" rules={[{ required: true }]} initialValue="ALL">
        <Select size="large" onChange={val => setTargetType(val)}>
            <Option value="ALL">All Users</Option>
            <Option value="TEACHER">Staff & Teachers</Option>
            <Option value="PARENT">Parents Only</Option>
            <Option value="CLASS">Specific Classroom</Option>
        </Select>
    </Form.Item>

    {
        targetType === 'CLASS' && (
            <Form.Item name="targetClassroomId" label="Select Classroom" rules={[{ required: true, message: 'Please select a classroom' }]}>
                <Select size="large" placeholder="Choose a class">
                    {classrooms.map(cls => (
                        <Option key={cls.id} value={cls.id}>{cls.name}</Option>
                    ))}
                </Select>
            </Form.Item>
        )
    }

    const handleDelete = async (id) => {
        try {
            await api.delete(`/notifications/${id}`);
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
        <div style={{ maxWidth: 1000, margin: '0 auto', paddingBottom: 40 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40, marginTop: 24 }}>
                <div>
                    <Title level={2} style={{ margin: 0, color: '#1E293B' }}>Announcements</Title>
                    <Text type="secondary">Broadcast important updates to parents and staff</Text>
                </div>
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => setIsModalVisible(true)}
                    style={{ background: '#7B57E4', height: 44, borderRadius: 10, padding: '0 24px' }}
                >
                    Create Announcement
                </Button>
            </div>

            <List
                loading={loading}
                dataSource={announcements}
                renderItem={(item) => (
                    <Card
                        style={{ marginBottom: 20, borderRadius: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.05)', border: 'none' }}
                        bodyStyle={{ padding: 24 }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ display: 'flex', gap: 16 }}>
                                <Avatar
                                    icon={<BellOutlined />}
                                    style={{ background: '#F0EAFB', color: '#7B57E4' }}
                                    size={48}
                                />
                                <div>
                                    <Title level={4} style={{ margin: 0, marginBottom: 4 }}>{item.title}</Title>
                                    <div style={{ marginBottom: 12 }}>
                                        {getTargetTag(item)}
                                        <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>
                                            {dayjs(item.createdAt).format('MMMM D, YYYY')} by {item.createdBy?.fullName}
                                        </Text>
                                    </div>
                                    <Paragraph style={{ fontSize: 15, color: '#555', lineHeight: 1.6 }}>
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
                okButtonProps={{ style: { background: '#7B57E4' } }}
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
