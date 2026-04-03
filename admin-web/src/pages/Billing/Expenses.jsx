import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Typography, Card, Modal, Form, Input, DatePicker, Select, message, Statistic, Row, Col, Upload } from 'antd';
import { PlusOutlined, DeleteOutlined, WalletOutlined, UploadOutlined, FileImageOutlined } from '@ant-design/icons';
import api, { getMediaUrl } from '../../api/client';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;

const Expenses = () => {
    const [expenses, setExpenses] = useState([]);
    const [summary, setSummary] = useState({ totalThisMonth: 0, countThisMonth: 0 });
    const [loading, setLoading] = useState(false);
    const [filterCurrentMonth, setFilterCurrentMonth] = useState(false);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [form] = Form.useForm();

    const fetchExpenses = async () => {
        setLoading(true);
        try {
            const res = await api.get('/expenses');
            setExpenses(res.data);
            const summaryRes = await api.get('/expenses/summary');
            setSummary(summaryRes.data);
        } catch (error) {
            console.error('Failed to fetch expenses');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchExpenses();
    }, []);

    const handleCreate = async () => {
        try {
            const values = await form.validateFields();
            setLoading(true);
            const payload = {
                ...values,
                amount: parseFloat(values.amount),
                expenseDate: values.expenseDate.format('YYYY-MM-DD')
            };

            const formData = new FormData();
            Object.keys(payload).forEach(key => {
                if (key !== 'receipt') formData.append(key, payload[key]);
            });

            if (values.receipt?.file) {
                formData.append('receipt', values.receipt.file.originFileObj);
            }

            await api.post('/expenses', formData);
            message.success('Expense recorded successfully');
            setIsModalVisible(false);
            form.resetFields();
            fetchExpenses();
        } catch (error) {
            message.error('Failed to record expense');
        } finally {
            setLoading(false);
        }
    };

    const columns = [
        { title: 'Date', dataIndex: 'expenseDate', key: 'date', render: (d) => dayjs(d).format('YYYY-MM-DD') },
        { title: 'Category', dataIndex: 'category', key: 'category' },
        { title: 'Description', dataIndex: 'description', key: 'desc' },
        { title: 'Amount', dataIndex: 'amount', key: 'amount', render: (a) => `Rs. ${parseFloat(a).toLocaleString()}` },
        {
            title: 'Receipt',
            key: 'receipt',
            render: (_, record) => {
                if (!record.receiptUrl || record.receiptUrl.includes('undefined')) return <Text type="secondary">-</Text>;
                const fullUrl = record.receiptUrl.startsWith('http') ? record.receiptUrl : getMediaUrl(record.receiptUrl);
                return <Button type="link" icon={<FileImageOutlined />} onClick={() => window.open(fullUrl, '_blank')}>View</Button>;
            }
        },
        { title: 'Action', key: 'action', render: () => <Button type="text" danger icon={<DeleteOutlined />} /> }
    ];

    return (
        <div style={{ paddingBottom: 40 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
                <div>
                    <Title level={3}>Expense Management</Title>
                    <Text type="secondary">Track school operational costs and overheads</Text>
                </div>
                <Space>
                    <Button
                        type={filterCurrentMonth ? "primary" : "default"}
                        onClick={() => setFilterCurrentMonth(!filterCurrentMonth)}
                    >
                        {filterCurrentMonth ? "Showing Current Month" : "Showing All Expenses"}
                    </Button>
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => setIsModalVisible(true)}
                        style={{ background: '#7B57E4', borderRadius: 8 }}
                        size="large"
                    >
                        Add Expense
                    </Button>
                </Space>
            </div>

            <Row gutter={16} style={{ marginBottom: 24 }}>
                <Col span={8}>
                    <Card bordered={false} style={{ borderRadius: 12 }}>
                        <Statistic
                            title="Total Expenses (This Month)"
                            value={summary.totalThisMonth}
                            precision={2}
                            prefix="Rs."
                            valueStyle={{ color: '#cf1322' }}
                            icon={<WalletOutlined />}
                        />
                    </Card>
                </Col>
                <Col span={8}>
                    <Card bordered={false} style={{ borderRadius: 12 }}>
                        <Statistic
                            title="Total Transactions"
                            value={summary.countThisMonth}
                            valueStyle={{ color: '#7B57E4' }}
                        />
                    </Card>
                </Col>
            </Row>

            <Card bordered={false} style={{ borderRadius: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                <Table
                    columns={columns}
                    dataSource={filterCurrentMonth
                        ? expenses.filter(e => dayjs(e.expenseDate).format('YYYY-MM') === dayjs().format('YYYY-MM'))
                        : expenses
                    }
                    loading={loading}
                    rowKey="id"
                    locale={{ emptyText: 'No expenses recorded yet' }}
                />
            </Card>

            <Modal
                title="Add New Expense"
                open={isModalVisible}
                onCancel={() => setIsModalVisible(false)}
                onOk={handleCreate}
                okText="Add Expense"
                okButtonProps={{ style: { background: '#7B57E4' } }}
            >
                <Form form={form} layout="vertical" style={{ marginTop: 20 }}>
                    <Form.Item name="category" label="Category" rules={[{ required: true }]}>
                        <Select placeholder="Select category">
                            <Option value="RENT">Rent / Premises</Option>
                            <Option value="SALARY">Staff Salaries</Option>
                            <Option value="UTILITIES">Utilities (Water, Electricity)</Option>
                            <Option value="SUPPLIES">School Supplies</Option>
                            <Option value="MAINTENANCE">Maintenance</Option>
                            <Option value="OTHER">Other</Option>
                        </Select>
                    </Form.Item>
                    <Form.Item name="amount" label="Amount (Rs.)" rules={[{ required: true }]}>
                        <Input type="number" prefix="Rs." />
                    </Form.Item>
                    <Form.Item name="expenseDate" label="Expense Date" rules={[{ required: true }]} initialValue={dayjs()}>
                        <DatePicker style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item name="description" label="Description">
                        <Input.TextArea rows={3} placeholder="Add details about this expense..." />
                    </Form.Item>
                    <Form.Item name="receipt" label="Upload Receipt (Optional)">
                        <Upload beforeUpload={() => false} maxCount={1} listType="picture">
                            <Button icon={<UploadOutlined />}>Select Receipt Image</Button>
                        </Upload>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default Expenses;
