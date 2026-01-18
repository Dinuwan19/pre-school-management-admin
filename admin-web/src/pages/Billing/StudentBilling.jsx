import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Tag, Modal, Form, Input, Select, message, Typography, Card, Badge, Descriptions, Divider, List, Tabs } from 'antd';
import { PlusOutlined, EyeOutlined, BellOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';

const { Title, Text } = Typography;
const { Option } = Select;

const StudentBilling = () => {
    const { user } = useAuth();
    const [billings, setBillings] = useState([]);
    const [overdueBillings, setOverdueBillings] = useState([]);
    const [pendingPayments, setPendingPayments] = useState([]);
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isAddModalVisible, setIsAddModalVisible] = useState(false);
    const [isVerifyModalVisible, setIsVerifyModalVisible] = useState(false);
    const [form] = Form.useForm();

    const fetchData = async () => {
        setLoading(true);
        try {
            const [billRes, payRes, stuRes, overdueRes] = await Promise.all([
                api.get('/billing'),
                api.get('/payments/pending'),
                api.get('/students'),
                api.get('/billing/overdue')
            ]);
            setBillings(billRes.data);
            setPendingPayments(payRes.data);
            setStudents(stuRes.data);
            setOverdueBillings(overdueRes.data);
        } catch (error) {
            console.error(error);
            message.error('Failed to load billing data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleGenerate = async () => {
        try {
            const values = await form.validateFields();
            setLoading(true);
            const payload = {
                ...values,
                billingMonths: values.billingMonths // Now passing array of strings
            };
            await api.post('/billing/generate', payload);
            message.success('Billing record generated');
            setIsAddModalVisible(false);
            form.resetFields();
            fetchData();
        } catch (error) {
            message.error(error.response?.data?.message || 'Failed to generate billing');
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async (paymentId, status) => {
        try {
            setLoading(true);
            await api.post('/payments/verify', { paymentId, status });
            message.success(`Payment ${status.toLowerCase()}ed`);
            setIsVerifyModalVisible(false);
            fetchData();
        } catch (error) {
            message.error('Failed to verify payment');
        } finally {
            setLoading(false);
        }
    };

    const handleNotify = async (billingId) => {
        try {
            await api.post('/billing/notify', { billingId });
            message.success('Fee reminder sent to parent');
        } catch (error) {
            message.error('Failed to send notification');
        }
    };

    const columns = [
        {
            title: 'Student',
            dataIndex: ['student', 'fullName'],
            key: 'student',
            render: (text, record) => (
                <Space direction="vertical" size={0}>
                    <Text strong>{text}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>{record.student?.studentUniqueId}</Text>
                </Space>
            )
        },
        {
            title: 'Billing Month',
            dataIndex: 'billingMonth',
            key: 'month',
            render: (text) => <Tag color="blue">{text}</Tag>
        },
        {
            title: 'Amount',
            dataIndex: 'amount',
            key: 'amount',
            render: (text) => <Text strong>Rs. {parseFloat(text).toLocaleString()}</Text>
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status) => {
                let color = 'gold';
                if (status === 'PAID') color = 'green';
                if (status === 'UNPAID') color = 'red';
                return <Tag color={color} style={{ borderRadius: 10, padding: '0 12px' }}>{status}</Tag>
            }
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, record) => (
                <Space>
                    {record.status === 'UNPAID' && (
                        <Button
                            icon={<BellOutlined />}
                            size="small"
                            onClick={() => handleNotify(record.id)}
                            style={{ color: '#FAAD14', borderColor: '#FAAD14' }}
                        >
                            Notify
                        </Button>
                    )}
                    {record.status === 'PAID' && (
                        <Button
                            icon={<EyeOutlined />}
                            size="small"
                            onClick={() => {
                                // Simulate invoice download
                                message.loading('Generating invoice...', 1);
                                setTimeout(() => window.print(), 1000);
                            }}
                        >
                            Download Invoice
                        </Button>
                    )}
                </Space>
            )
        }
    ];

    return (
        <div style={{ paddingBottom: 40 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
                <div>
                    <Title level={3}>Student Billing</Title>
                    <Text type="secondary">Manage monthly fees and verify payments</Text>
                </div>
                <Space>
                    <Badge count={pendingPayments.length}>
                        <Button
                            type="dashed"
                            onClick={() => setIsVerifyModalVisible(true)}
                            icon={<CheckCircleOutlined />}
                        >
                            Verification Queue
                        </Button>
                    </Badge>
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => setIsAddModalVisible(true)}
                        style={{ background: '#7B57E4', borderRadius: 8 }}
                        size="large"
                    >
                        Generate Billing
                    </Button>
                </Space>
            </div>

            <Card bordered={false} style={{ borderRadius: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                <Tabs items={[
                    {
                        key: '1',
                        label: 'All Billings',
                        children: <Table columns={columns} dataSource={billings} loading={loading} rowKey="id" />
                    },
                    {
                        key: '2',
                        label: <Badge count={overdueBillings.length} offset={[10, 0]}>Overdue Payments</Badge>,
                        children: (
                            <div>
                                <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
                                    <Button type="primary" danger icon={<BellOutlined />} onClick={() => {
                                        message.success(`Notifications sent to ${overdueBillings.length} parents`);
                                    }}>Notify All Overdue</Button>
                                </div>
                                <Table
                                    columns={columns}
                                    dataSource={overdueBillings}
                                    loading={loading}
                                    rowKey="id"
                                />
                            </div>
                        )
                    }
                ]} />
            </Card>

            {/* Generate Billing Modal */}
            <Modal
                title="Generate Monthly Billing"
                open={isAddModalVisible}
                onCancel={() => setIsAddModalVisible(false)}
                onOk={handleGenerate}
                okText="Generate"
                okButtonProps={{ style: { background: '#7B57E4' } }}
            >
                <Form form={form} layout="vertical" style={{ marginTop: 20 }}>
                    <Form.Item name="studentId" label="Select Student" rules={[{ required: true }]}>
                        <Select placeholder="Choose student" showSearch optionFilterProp="children">
                            {students.map(s => <Option key={s.id} value={s.id}>{s.fullName} ({s.studentUniqueId})</Option>)}
                        </Select>
                    </Form.Item>
                    <Form.Item
                        name="billingMonths"
                        label="Billing Months"
                        rules={[
                            { required: true, message: 'Select at least one month' },
                            { type: 'array', max: 6, message: 'You can select a maximum of 6 months' }
                        ]}
                    >
                        <Select
                            mode="multiple"
                            placeholder="Select months"
                            style={{ width: '100%' }}
                            maxTagCount="responsive"
                        >
                            {Array.from({ length: 12 }, (_, i) => {
                                const date = dayjs().add(i, 'month');
                                const value = date.format('YYYY-MM');
                                return <Option key={value} value={value}>{date.format('MMMM YYYY')}</Option>;
                            })}
                        </Select>
                    </Form.Item>
                    <Form.Item name="amount" label="Fee Amount (Rs.)" rules={[{ required: true }]} initialValue={15000}>
                        <Input type="number" />
                    </Form.Item>
                </Form>
            </Modal>

            {/* Verification Queue Modal */}
            <Modal
                title="Payment Verification Queue"
                open={isVerifyModalVisible}
                onCancel={() => setIsVerifyModalVisible(false)}
                footer={null}
                width={800}
            >
                <List
                    dataSource={pendingPayments}
                    renderItem={(item) => (
                        <Card style={{ marginBottom: 16, borderRadius: 12 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <Descriptions column={2} size="small" title={`Payment from ${item.billingpayment?.[0]?.billing?.student?.fullName}`}>
                                    <Descriptions.Item label="Amount">Rs. {item.amountPaid}</Descriptions.Item>
                                    <Descriptions.Item label="Method">{item.paymentMethod}</Descriptions.Item>
                                    <Descriptions.Item label="Ref">{item.transactionRef || 'N/A'}</Descriptions.Item>
                                    <Descriptions.Item label="Date">{new Date(item.createdAt).toLocaleDateString()}</Descriptions.Item>
                                    <Descriptions.Item label="Months" span={2}>
                                        {(item.billingpayment || []).map(bp => (
                                            <Tag key={bp.billing.id}>{bp.billing.billingMonth}</Tag>
                                        ))}
                                    </Descriptions.Item>
                                </Descriptions>
                                <Space direction="vertical">
                                    <Button type="primary" style={{ background: '#52c41a', borderColor: '#52c41a' }} icon={<CheckCircleOutlined />} onClick={() => handleVerify(item.id, 'APPROVED')}>Approve</Button>
                                    <Button danger icon={<CloseCircleOutlined />} onClick={() => handleVerify(item.id, 'REJECTED')}>Reject</Button>
                                </Space>
                            </div>
                            {item.receiptUrl && (
                                <div style={{ marginTop: 12 }}>
                                    <Button type="link" onClick={() => window.open(item.receiptUrl)}>View Receipt Image</Button>
                                </div>
                            )}
                        </Card>
                    )}
                    locale={{ emptyText: 'No pending payments to verify' }}
                />
            </Modal>
        </div>
    );
};

export default StudentBilling;
