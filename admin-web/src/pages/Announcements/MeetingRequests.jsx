import React, { useState, useEffect } from 'react';
import { Card, Table, Tag, Button, Typography, Space, message, Modal, Tooltip, Badge, Row, Col, Avatar } from 'antd';
import {
    CalendarOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined,
    CloseCircleOutlined,
    UserOutlined,
    PhoneOutlined,
    MessageOutlined,
    CheckOutlined
} from '@ant-design/icons';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const MeetingRequests = () => {
    const { user } = useAuth();
    const [meetings, setMeetings] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchMeetings = async () => {
        setLoading(true);
        try {
            // Role-based endpoint
            const endpoint = (user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN')
                ? '/meetings/teacher' // Currently shared, but backend logic could filter.
                : '/meetings/teacher';

            const res = await api.get(endpoint);
            setMeetings(res.data);
        } catch (error) {
            message.error('Failed to load meeting requests');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMeetings();
    }, []);

    const handleStatusUpdate = async (id, status) => {
        try {
            await api.put(`/meetings/${id}/status`, { status });
            message.success(`Meeting ${status.toLowerCase()} successfully`);
            fetchMeetings();
        } catch (error) {
            message.error('Failed to update status');
        }
    };

    const columns = [
        {
            title: 'Student & Parent',
            key: 'student',
            render: (record) => (
                <Space direction="vertical" size={0}>
                    <Text strong style={{ fontSize: 15 }}>{record.student?.fullName}</Text>
                    <Space size={4}>
                        <UserOutlined style={{ fontSize: 12, color: '#888' }} />
                        <Text type="secondary" style={{ fontSize: 13 }}>Parent: {record.parent?.fullName}</Text>
                    </Space>
                </Space>
            ),
        },
        {
            title: 'Date & Time',
            key: 'datetime',
            render: (record) => (
                <Space direction="vertical" size={0}>
                    <Space size={4}>
                        <CalendarOutlined style={{ color: '#7B57E4' }} />
                        <Text strong>{dayjs(record.requestDate).format('MMM DD, YYYY')}</Text>
                    </Space>
                    <Space size={4}>
                        <ClockCircleOutlined style={{ color: '#888' }} />
                        <Text type="secondary">{record.preferredTime}</Text>
                    </Space>
                </Space>
            ),
        },
        {
            title: 'Purpose',
            dataIndex: 'title',
            key: 'title',
            render: (text, record) => (
                <Tooltip title={record.description}>
                    <div style={{ maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        <Text strong>{text}</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: 12 }}>{record.description}</Text>
                    </div>
                </Tooltip>
            ),
        },
        // Admin only column
        ...((user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') ? [{
            title: 'Assigned Teacher',
            dataIndex: ['teacher', 'fullName'],
            key: 'teacher',
            render: (text) => <Tag color="blue" style={{ borderRadius: 6 }}>{text || 'Not Assigned'}</Tag>
        }] : []),
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status) => {
                let color = 'blue';
                if (status === 'APPROVED') color = 'green';
                if (status === 'COMPLETED') color = 'gray';
                if (status === 'DECLINED') color = 'red';
                return (
                    <Tag color={color} style={{ borderRadius: 6, padding: '2px 10px', fontWeight: 600 }}>
                        {status}
                    </Tag>
                );
            },
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (record) => (
                <Space>
                    {record.status === 'PENDING' && (
                        <>
                            <Button
                                type="primary"
                                size="small"
                                icon={<CheckOutlined />}
                                onClick={() => handleStatusUpdate(record.id, 'APPROVED')}
                                style={{ borderRadius: 6, background: '#10B981' }}
                            >
                                Approve
                            </Button>
                            <Button
                                danger
                                size="small"
                                icon={<CloseCircleOutlined />}
                                onClick={() => handleStatusUpdate(record.id, 'DECLINED')}
                                style={{ borderRadius: 6 }}
                            >
                                Decline
                            </Button>
                        </>
                    )}
                    {record.status === 'APPROVED' && (
                        <Button
                            type="primary"
                            size="small"
                            icon={<CheckCircleOutlined />}
                            onClick={() => handleStatusUpdate(record.id, 'COMPLETED')}
                            style={{ borderRadius: 6, background: '#7B57E4' }}
                        >
                            Mark Complete
                        </Button>
                    )}
                </Space>
            ),
        },
    ];

    return (
        <div style={{ padding: '0 24px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, marginTop: 24 }}>
                <div>
                    <Title level={2} style={{ margin: 0, color: '#1E293B' }}>Meeting Requests</Title>
                    <Text type="secondary">Manage parent-teacher discussions and appointments</Text>
                </div>
            </div>

            <Card bordered={false} style={{ borderRadius: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                <Table
                    columns={columns}
                    dataSource={meetings}
                    rowKey="id"
                    loading={loading}
                    pagination={{ pageSize: 8 }}
                    style={{ borderRadius: 16 }}
                />
            </Card>

            <Row gutter={16} style={{ marginTop: 24 }}>
                <Col span={8}>
                    <Card style={{ borderRadius: 16, textAlign: 'center' }}>
                        <Title level={4} style={{ color: '#7B57E4', margin: 0 }}>
                            {meetings.filter(m => m.status === 'PENDING').length}
                        </Title>
                        <Text type="secondary">Pending Requests</Text>
                    </Card>
                </Col>
                <Col span={8}>
                    <Card style={{ borderRadius: 16, textAlign: 'center' }}>
                        <Title level={4} style={{ color: '#10B981', margin: 0 }}>
                            {meetings.filter(m => m.status === 'APPROVED').length}
                        </Title>
                        <Text type="secondary">Upcoming Meetings</Text>
                    </Card>
                </Col>
                <Col span={8}>
                    <Card style={{ borderRadius: 16, textAlign: 'center' }}>
                        <Title level={4} style={{ color: '#64748B', margin: 0 }}>
                            {meetings.filter(m => m.status === 'COMPLETED').length}
                        </Title>
                        <Text type="secondary">Completed This Month</Text>
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export default MeetingRequests;
