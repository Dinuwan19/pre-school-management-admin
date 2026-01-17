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
    ];

    if (loading && !data) return <div style={{ padding: 40, textAlign: 'center' }}><Progress percent={50} status="active" showInfo={false} /></div>;

    return (
        <div style={{ paddingBottom: 40 }}>
            <div style={{ marginBottom: 32 }}>
                <Title level={2} style={{ margin: 0, fontWeight: 700 }}>Welcome back, {user?.fullName || user?.username}!</Title>
                <Text type="secondary" style={{ fontSize: 16 }}>Here is what's happening in your school today.</Text>
            </div>

            <Row gutter={[24, 24]} style={{ marginBottom: 32 }}>
                {statCards.map((stat, index) => (
                    <Col xs={24} sm={8} key={index}>
                        <Card
                            hoverable
                            onClick={() => navigate(stat.path)}
                            style={{ borderRadius: 20, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}
                            bodyStyle={{ padding: 24 }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                                <div style={{
                                    width: 56, height: 56, background: `${stat.color}15`, borderRadius: 16,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: stat.color, fontSize: 24
                                }}>
                                    {stat.icon}
                                </div>
                                <div>
                                    <Statistic title={<span style={{ fontSize: 14, color: '#8E8E93' }}>{stat.title}</span>} value={stat.value} valueStyle={{ fontWeight: 700, fontSize: 28 }} />
                                </div>
                            </div>
                        </Card>
                    </Col>
                ))}
            </Row>

            <Row gutter={[24, 24]}>
                {/* Left Side: Stats & Events */}
                <Col xs={24} lg={16}>
                    <Row gutter={[24, 24]}>
                        <Col span={24}>
                            <Card title="School Analytics" style={{ borderRadius: 20, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                                <Row gutter={48} align="middle">
                                    <Col span={12} style={{ textAlign: 'center' }}>
                                        <Progress
                                            type="dashboard"
                                            percent={data?.analytics?.attendanceToday || 0}
                                            strokeColor="#7B57E4"
                                            gapDegree={30}
                                        />
                                        <Title level={5} style={{ marginTop: 12 }}>Today's Attendance</Title>
                                        <Text type="secondary">Status: {data?.analytics?.attendanceToday > 80 ? 'Excellent' : 'Average'}</Text>
                                    </Col>
                                    <Col span={12} style={{ textAlign: 'center' }}>
                                        <Progress
                                            type="dashboard"
                                            percent={data?.analytics?.paymentProgress || 0}
                                            strokeColor="#52C41A"
                                            gapDegree={30}
                                        />
                                        <Title level={5} style={{ marginTop: 12 }}>Fee Collection</Title>
                                        <Text type="secondary">Target: 100% for this month</Text>
                                    </Col>
                                </Row>
                            </Card>
                        </Col>

                        <Col span={24}>
                            <Card
                                title={<Space><BellOutlined style={{ color: '#7B57E4' }} /> Recent Announcements & Events</Space>}
                                extra={<Button type="link" onClick={() => navigate('/announcements')}>View All <ArrowRightOutlined /></Button>}
                                style={{ borderRadius: 20, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}
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

                {/* Right Side: Quick Actions */}
                <Col xs={24} lg={8}>
                    <Card
                        title="Quick Actions"
                        style={{ borderRadius: 20, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', marginBottom: 24 }}
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
                        style={{ borderRadius: 20, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}
                    >
                        <Statistic
                            title="Total Parents"
                            value={data?.counts?.parents || 0}
                            prefix={<TeamOutlined style={{ marginRight: 8, color: '#FF4D4F' }} />}
                            valueStyle={{ fontWeight: 600 }}
                        />
                        <Divider style={{ margin: '12px 0' }} />
                        <Text type="secondary">Monitoring {data?.counts?.students || 0} students across {data?.counts?.classrooms || 0} active classrooms.</Text>
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export default Dashboard;
