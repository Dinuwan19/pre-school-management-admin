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
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [form] = Form.useForm();

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
    }, []);

    const handleCreate = async () => {
        try {
            const values = await form.validateFields();
            setLoading(true);
            await api.post('/notifications', values);
            message.success('Announcement published');
            setIsModalVisible(false);
            form.resetFields();
            fetchAnnouncements();
        } catch (error) {
            message.error('Failed to publish announcement');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        try {
            await api.delete(`/notifications/${id}`);
            message.success('Announcement deleted');
            fetchAnnouncements();
        } catch (error) {
            message.error('Failed to delete');
        }
    };

    const getTargetTag = (target) => {
        switch (target) {
            case 'ALL': return <Tag color="blue" icon={<GlobalOutlined />}>Everyone</Tag>;
            case 'TEACHER': return <Tag color="purple" icon={<UserOutlined />}>Teachers Only</Tag>;
            case 'PARENT': return <Tag color="cyan" icon={<TeamOutlined />}>Parents Only</Tag>;
            default: return <Tag>{target}</Tag>;
        }
    };

    return (
        <div style={{ maxWidth: 1000, margin: '0 auto', paddingBottom: 40 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
                <div>
                    <Title level={3} style={{ margin: 0 }}>Announcements</Title>
                    <Text type="secondary">Broadcast important updates to school community</Text>
                </div>
                {user?.role !== 'TEACHER' && (
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        size="large"
                        onClick={() => setIsModalVisible(true)}
                        style={{ background: '#7B57E4', borderRadius: 8, height: 44 }}
                    >
                        New Announcement
                    </Button>
                )}
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
                                        {getTargetTag(item.targetRole)}
                                        <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>
                                            {dayjs(item.createdAt).format('MMMM D, YYYY')} by {item.createdBy?.fullName}
                                        </Text>
                                    </div>
                                    <Paragraph style={{ fontSize: 15, color: '#555', lineHeight: 1.6 }}>
                                        {item.message}
                                    </Paragraph>
                                </div>
                            </div>
                            {user?.role !== 'TEACHER' && (
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
                    <Form.Item name="targetRole" label="Recipient Group" rules={[{ required: true }]} initialValue="ALL">
                        <Select size="large">
                            <Option value="ALL">All Users</Option>
                            <Option value="TEACHER">Staff & Teachers</Option>
                            <Option value="PARENT">Parents Only</Option>
                        </Select>
                    </Form.Item>
                    <Form.Item name="title" label="Announcement Title" rules={[{ required: true }]}>
                        <Input placeholder="Enter a clear, descriptive title" size="large" />
                    </Form.Item>
                    <Form.Item name="message" label="Message Content" rules={[{ required: true }]}>
                        <Input.TextArea rows={5} placeholder="Type your announcement details here..." />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default Announcements;
