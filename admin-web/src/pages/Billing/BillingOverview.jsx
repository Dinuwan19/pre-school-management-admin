import React, { useState, useEffect } from 'react';
import { Typography, Row, Col, Card, Statistic, Space, Button, List, Tag } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined, CreditCardOutlined, PlusOutlined, HistoryOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/client';

const { Title, Text } = Typography;

const BillingOverview = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [summary, setSummary] = useState({
        totalIncome: 0,
        pending: 0,
        expenses: 0,
        recentTransactions: []
    });

    useEffect(() => {
        const fetchSummary = async () => {
            try {
                const res = await api.get('/billing/dashboard-stats');
                setSummary({
                    totalIncome: res.data.incomeMTD,
                    pending: res.data.pendingTotal,
                    expenses: res.data.expenseMTD,
                    netIncome: res.data.netIncomeMTD,
                    recentTransactions: res.data.recentTransactions
                });
            } catch (error) {
                console.error('Failed to fetch billing dashboard', error);
            }
        };
        fetchSummary();
    }, []);

    const cards = [
        { title: 'Total Income (MTD)', value: summary.totalIncome, prefix: 'Rs. ', icon: <ArrowUpOutlined />, color: '#7B57E4' },
        { title: 'Pending Payments', value: summary.pending, prefix: 'Rs. ', icon: <HistoryOutlined />, color: '#FF9500' },
        { title: 'Expenses (MTD)', value: summary.expenses, prefix: 'Rs. ', icon: <ArrowDownOutlined />, color: '#FF3B30' },
        { title: 'Net Income (MTD)', value: summary.netIncome, prefix: 'Rs. ', icon: <CreditCardOutlined />, color: '#34C759' },
    ];

    return (
        <div style={{ paddingBottom: 40 }}>
            <div style={{ marginBottom: 32 }}>
                <Title level={3}>Billing Overview</Title>
                <Text type="secondary">Financial summary and quick actions</Text>
            </div>

            <Row gutter={[24, 24]} style={{ marginBottom: 32 }}>
                {cards.map((card, index) => (
                    <Col xs={24} sm={12} lg={6} key={index}>
                        <Card bordered={false} style={{ borderRadius: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                            <Statistic
                                title={<Text type="secondary">{card.title}</Text>}
                                value={card.value}
                                precision={2}
                                prefix={card.prefix}
                                valueStyle={{ color: card.color, fontWeight: 700 }}
                            />
                        </Card>
                    </Col>
                ))}
            </Row>

            <Row gutter={24}>
                <Col xs={24} lg={12}>
                    <Card title="Quick Actions" bordered={false} style={{ borderRadius: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.03)', height: '100%' }}>
                        <Space direction="vertical" style={{ width: '100%' }} size={16}>
                            <Button block size="large" onClick={() => navigate('/billing/students')} style={{ borderRadius: 12, height: 50, textAlign: 'left' }}>
                                Manage Student Billing
                            </Button>
                            {(user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN') && (
                                <Button block size="large" onClick={() => navigate('/billing/students')} style={{ borderRadius: 12, height: 50, textAlign: 'left' }}>
                                    Manage Fee Categories
                                </Button>
                            )}
                            <Button block size="large" onClick={() => navigate('/billing/expenses')} style={{ borderRadius: 12, height: 50, textAlign: 'left' }}>
                                Manage Expenses
                            </Button>
                        </Space>
                    </Card>
                </Col>
                <Col xs={24} lg={12}>
                    <Card title="Recent Transactions" bordered={false} style={{ borderRadius: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.03)', height: '100%' }}>
                        <List
                            dataSource={summary.recentTransactions}
                            renderItem={(item) => (
                                <List.Item style={{ padding: '12px 0' }}>
                                    <List.Item.Meta
                                        avatar={
                                            <div style={{
                                                width: 40, height: 40, borderRadius: 8,
                                                background: item.type === 'INCOME' ? '#F6FFED' : '#FFF1F0',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                color: item.type === 'INCOME' ? '#52C41A' : '#F5222D'
                                            }}>
                                                {item.type === 'INCOME' ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                                            </div>
                                        }
                                        title={<Text strong>{item.details}</Text>}
                                        description={item.type === 'INCOME' ? item.method : item.description}
                                    />
                                    <div style={{ textAlign: 'right' }}>
                                        <Text strong style={{ color: item.type === 'INCOME' ? '#52C41A' : '#F5222D' }}>
                                            {item.type === 'INCOME' ? '+' : '-'} Rs. {item.amount.toLocaleString()}
                                        </Text><br />
                                        <Text type="secondary" style={{ fontSize: 12 }}>{new Date(item.date).toLocaleDateString()}</Text>
                                    </div>
                                </List.Item>
                            )}
                            locale={{ emptyText: 'No recent transactions' }}
                        />
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export default BillingOverview;
