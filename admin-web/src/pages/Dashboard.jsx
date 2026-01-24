import React, { useState, useEffect } from 'react';
import { Typography, Card, Row, Col, Statistic, List, Avatar, Badge, Empty, Space, Button, Progress, Divider } from 'antd';
import { UserOutlined, TeamOutlined, HomeOutlined, BellOutlined, ArrowRightOutlined, BookOutlined, CalendarOutlined, DollarOutlined } from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const { Title, Text } = Typography;

const Dashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            const res = await api.get('/dashboard/stats');
            setData(res.data);
        } catch (error) {
            console.error('Failed to fetch dashboard data', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const statCards = [
        { title: 'Students', value: data?.counts?.students || 0, icon: <UserOutlined />, color: '#7B57E4', path: '/students' },
        { title: 'Classrooms', value: data?.counts?.classrooms || 0, icon: <HomeOutlined />, color: '#FF9500', path: '/classrooms' },
        { title: 'Staff', value: data?.counts?.staff || 0, icon: <TeamOutlined />, color: '#00C7BE', path: '/staff' },
        { title: 'Parents', value: data?.counts?.parents || 0, icon: <TeamOutlined />, color: '#FF4D4F', path: '/parents' },
    ];

    if (loading && !data) return <div style={{ padding: 40, textAlign: 'center' }}><Progress percent={50} status="active" showInfo={false} /></div>;

    const attendance = data?.analytics?.attendance || { present: 0, total: 0, percentage: 0 };
    const payments = data?.analytics?.payments || { paid: 0, pending: 0, overdue: 0, total: 0, progress: 0 };

    return (
        <div style={{ paddingBottom: 40 }}>
            <div style={{ marginBottom: 32 }}>
                <Title level={2} style={{ margin: 0, fontWeight: 700 }}>Welcome back, {user?.fullName || user?.username}!</Title>
                <Text type="secondary" style={{ fontSize: 16 }}>Here is what's happening in your school today.</Text>
            </div>

            <Row gutter={[20, 20]} style={{ marginBottom: 32 }}>
                {statCards.map((stat, index) => (
                    <Col xs={24} sm={12} md={6} key={index}>
                        <Card
                            hoverable
                            onClick={() => navigate(stat.path)}
                            style={{ borderRadius: 16, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}
                            bodyStyle={{ padding: 20 }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                <div style={{
                                    width: 48, height: 48, background: `${stat.color}15`, borderRadius: 12,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: stat.color, fontSize: 20
                                }}>
                                    {stat.icon}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <Statistic
                                        title={<span style={{ fontSize: 13, color: '#8E8E93' }}>{stat.title}</span>}
                                        value={stat.value}
                                        valueStyle={{ fontWeight: 700, fontSize: 24, lineHeight: 1 }}
                                    />
                                </div>
                            </div>
                        </Card>
                    </Col>
                ))}
            </Row>

            <Row gutter={[24, 24]}>
                <Col xs={24} lg={16}>
                    <Row gutter={[24, 24]}>
                        <Col span={24}>
                            <Row gutter={[24, 24]}>
                                <Col xs={24} md={12}>
                                    <Card
                                        title={<Space><CalendarOutlined style={{ color: '#7B57E4' }} /> Today's Attendance</Space>}
                                        style={{ borderRadius: 16, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.02)', height: '100%' }}
                                    >
                                        <div style={{ marginBottom: 20 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                                <Text type="secondary">Present</Text>
                                                <Text strong>{attendance.present} / {attendance.total}</Text>
                                            </div>
                                            <Progress percent={attendance.percentage} strokeColor="#7B57E4" strokeWidth={10} showInfo={false} />
                                            <div style={{ textAlign: 'right', marginTop: 4 }}>
                                                <Text style={{ fontSize: 12, color: '#8c8c8c' }}>{attendance.percentage}%</Text>
                                            </div>
                                        </div>
                                        <Button type="link" onClick={() => navigate('/attendance')} style={{ padding: 0 }}>
                                            View attendance details <ArrowRightOutlined />
                                        </Button>
                                    </Card>
                                </Col>
                                <Col xs={24} md={12}>
                                    <Card
                                        title={<Space><BookOutlined style={{ color: '#7B57E4' }} /> Payment</Space>}
                                        style={{ borderRadius: 16, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.02)', height: '100%' }}
                                    >
                                        <div style={{ marginBottom: 12 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                                                <Text type="secondary">Paid</Text>
                                                <Text strong>{payments.paid}</Text>
                                            </div>
                                            <Progress percent={payments.total > 0 ? (payments.paid / payments.total) * 100 : 0} strokeColor="#52C41A" size="small" showInfo={false} />
                                        </div>
                                        <div style={{ marginBottom: 12 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                                                <Text type="secondary">Pending</Text>
                                                <Text strong>{payments.pending}</Text>
                                            </div>
                                            <Progress percent={payments.total > 0 ? (payments.pending / payments.total) * 100 : 0} strokeColor="#1890FF" size="small" showInfo={false} />
                                        </div>
                                        <div style={{ marginBottom: 20 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                                                <Text type="secondary">Overdue</Text>
                                                <Text strong>{payments.overdue}</Text>
                                            </div>
                                            <Progress percent={payments.total > 0 ? (payments.overdue / payments.total) * 100 : 0} strokeColor="#F5222D" size="small" showInfo={false} />
                                        </div>
                                        <Button type="link" onClick={() => navigate('/billing/overview')} style={{ padding: 0 }}>
                                            View Payment <ArrowRightOutlined />
                                        </Button>
                                    </Card>
                                </Col>
                            </Row>
                        </Col>

                        <Col span={24}>
                            <Card
                                title={<Space><BellOutlined style={{ color: '#7B57E4' }} /> Recent Announcements & Events</Space>}
                                extra={<Button type="link" onClick={() => navigate('/announcements')}>View All <ArrowRightOutlined /></Button>}
                                style={{ borderRadius: 16, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}
                            >
                                <List
                                    loading={loading}
                                    dataSource={data?.events || []}
                                    renderItem={(item) => (
                                        <List.Item style={{ borderBottom: '1px solid #f0f0f0', padding: '16px 0' }}>
                                            <List.Item.Meta
                                                avatar={<Avatar style={{ backgroundColor: '#F0EAFB', color: '#7B57E4' }}>{item.targetRole?.[0] || 'A'}</Avatar>}
                                                title={<Text strong>{item.title}</Text>}
                                                description={<Text type="secondary" italic>{dayjs(item.createdAt).fromNow()}</Text>}
                                            />
                                            <div style={{ maxWidth: '60%', color: '#666' }}>
                                                {item.message}
                                            </div>
                                        </List.Item>
                                    )}
                                    locale={{ emptyText: <Empty description="No recent events" /> }}
                                />
                            </Card>
                        </Col>
                    </Row>
                </Col>

                <Col xs={24} lg={8}>
                    <Card
                        title="Quick Actions"
                        style={{ borderRadius: 16, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', marginBottom: 24 }}
                    >
                        <Space direction="vertical" style={{ width: '100%' }} size={16}>
                            <Button block size="large" onClick={() => navigate('/attendance')} icon={<CalendarOutlined />} style={{ borderRadius: 12, height: 50, textAlign: 'left', fontWeight: 500 }}>
                                Mark Daily Attendance
                            </Button>
                            <Button block size="large" onClick={() => navigate('/announcements')} icon={<BellOutlined />} style={{ borderRadius: 12, height: 50, textAlign: 'left', fontWeight: 500 }}>
                                Broadcast Announcement
                            </Button>
                            <Button block size="large" onClick={() => navigate('/homework')} icon={<BookOutlined />} style={{ borderRadius: 12, height: 50, textAlign: 'left', fontWeight: 500 }}>
                                Assign New Homework
                            </Button>
                            <Button block size="large" onClick={() => navigate('/billing/overview')} icon={<DollarOutlined />} style={{ borderRadius: 12, height: 50, textAlign: 'left', fontWeight: 500 }}>
                                Manage School Fees
                            </Button>
                        </Space>
                    </Card>

                    <Card
                        title="School Overview"
                        style={{ borderRadius: 16, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}
                    >
                        <Space direction="vertical" style={{ width: '100%' }}>
                            <Text type="secondary" style={{ fontSize: 13 }}>System Summary</Text>
                            <div style={{ padding: '8px 0' }}>
                                <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 4 }}>Monitoring Status</Text>
                                <Text type="secondary" style={{ fontSize: 12 }}>Currently managing {data?.counts?.students || 0} active students and {data?.counts?.parents || 0} registered parents across {data?.counts?.classrooms || 0} classrooms.</Text>
                            </div>
                            <Divider style={{ margin: '8px 0' }} />
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Text type="secondary">Staff Online</Text>
                                <Badge status="processing" text={data?.counts?.staff || 0} />
                            </div>
                        </Space>
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export default Dashboard;
