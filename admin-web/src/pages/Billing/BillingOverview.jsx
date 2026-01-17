import React, { useState, useEffect } from 'react';
import { Typography, Row, Col, Card, Statistic, Space, Button, List, Tag } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined, CreditCardOutlined, PlusOutlined, HistoryOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';

const { Title, Text } = Typography;

const BillingOverview = () => {
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
                // In Phase 8, we fetch payments and billings to calculate info
                // This is a simplified fetch for the overview
                const [payRes, billRes, expRes] = await Promise.all([
                    api.get('/payments/pending'),
                    api.get('/billing?status=PAID'),
                    api.get('/expenses/summary')
                ]);

                const paidTotal = billRes.data.reduce((acc, curr) => acc + parseFloat(curr.amount), 0);
                const pendingTotal = payRes.data.reduce((acc, curr) => acc + parseFloat(curr.amountPaid), 0);

                setSummary(prev => ({
                    ...prev,
                    totalIncome: paidTotal,
                    pending: pendingTotal,
                    expenses: expRes.data.totalThisMonth || 0,
                    recentTransactions: payRes.data.slice(0, 5)
                }));
            } catch (error) {
                console.error('Failed to fetch billing summary', error);
            }
        };
        fetchSummary();
    }, []);

    const cards = [
        { title: 'Total Income', value: summary.totalIncome, prefix: 'Rs. ', icon: <ArrowUpOutlined />, color: '#7B57E4' },
        { title: 'Pending', value: summary.pending, prefix: 'Rs. ', icon: <HistoryOutlined />, color: '#FF9500' },
        { title: 'Expenses (MTD)', value: summary.expenses, prefix: 'Rs. ', icon: <ArrowDownOutlined />, color: '#FF3B30' },
        { title: 'Net Income', value: summary.totalIncome - summary.expenses, prefix: 'Rs. ', icon: <CreditCardOutlined />, color: '#34C759' },
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
                                        title={<Text strong>Payment for {item.billingPayments?.[0]?.billing?.student?.fullName}</Text>}
                                        description={item.paymentMethod}
                                    />
                                    <div style={{ textAlign: 'right' }}>
                                        <Text strong style={{ color: '#34C759' }}>+ Rs. {item.amountPaid}</Text><br />
                                        <Text type="secondary" style={{ fontSize: 12 }}>{new Date(item.createdAt).toLocaleDateString()}</Text>
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
