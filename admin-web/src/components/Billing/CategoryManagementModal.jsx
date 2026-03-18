import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Typography, Card, Modal, Form, Input, DatePicker, Select, message, Statistic, Row, Col, Tag, Empty, Divider, Badge } from 'antd';
import { PlusOutlined, DeleteOutlined, BarChartOutlined, CalendarOutlined, BankOutlined } from '@ant-design/icons';
import { fetchBillingCategories, fetchClassrooms, createBillingCategory, deleteBillingCategory, fetchBillingCategoryStats } from '../../api/services';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;

const CategoryManagementModal = ({ open, onCancel, onSuccess }) => {
    const [categories, setCategories] = useState([]);
    const [classrooms, setClassrooms] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isCreateVisible, setIsCreateVisible] = useState(false);
    const [statsModalVisible, setStatsModalVisible] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [categoryStats, setCategoryStats] = useState(null);
    const [form] = Form.useForm();

    const fetchCategories = async () => {
        setLoading(true);
        try {
            const res = await fetchBillingCategories();
            setCategories(res.data);
        } catch (error) {
            message.error('Failed to load billing categories');
        } finally {
            setLoading(false);
        }
    };

    const fetchClassrooms = async () => {
        try {
            const res = await fetchClassrooms();
            setClassrooms(res.data);
        } catch (error) {
            console.error('Failed to fetch classrooms');
        }
    };

    useEffect(() => {
        if (open) {
            fetchCategories();
            fetchClassrooms();
        }
    }, [open]);

    const handleCreate = async () => {
        try {
            const values = await form.validateFields();
            setLoading(true);
            const payload = {
                ...values,
                amount: parseFloat(values.amount),
                validUntil: values.validUntil.format('YYYY-MM-DD')
            };

            await createBillingCategory(payload);
            message.success('Billing category created');
            setIsCreateVisible(false);
            form.resetFields();
            fetchCategories();
            if (onSuccess) onSuccess();
        } catch (error) {
            message.error(error.response?.data?.message || 'Failed to create category');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        Modal.confirm({
            title: 'Delete Category',
            content: 'Are you sure? This will not affect existing bills.',
            okText: 'Delete',
            okType: 'danger',
            onOk: async () => {
                try {
                    await deleteBillingCategory(id);
                    message.success('Category deleted');
                    fetchCategories();
                    if (onSuccess) onSuccess();
                } catch (error) {
                    message.error('Failed to delete category');
                }
            }
        });
    };

    const showStats = async (category) => {
        setSelectedCategory(category);
        setStatsModalVisible(true);
        setCategoryStats(null);
        try {
            const res = await fetchBillingCategoryStats(category.id);
            setCategoryStats(res.data);
        } catch (error) {
            message.error('Failed to load stats');
        }
    };

    const columns = [
        {
            title: 'Name',
            dataIndex: 'name',
            render: (text) => <Text strong>{text}</Text>
        },
        {
            title: 'Frequency',
            dataIndex: 'frequency',
            render: (freq) => {
                const color = freq === 'ONE_TIME' ? 'purple' : 'cyan';
                const label = freq === 'ONE_TIME' ? 'One-Time' : 'Recurring';
                return <Tag color={color}>{label}</Tag>;
            }
        },
        {
            title: 'Scope',
            dataIndex: 'classrooms',
            render: (classes) => (
                <Space wrap size={4}>
                    {classes.map(c => <Tag color="blue" key={c.id} style={{ borderRadius: 4 }}>{c.name}</Tag>)}
                </Space>
            )
        },
        {
            title: 'Amount',
            dataIndex: 'amount',
            render: (a) => <Text strong>Rs. {parseFloat(a).toLocaleString()}</Text>
        },
        {
            title: 'Valid Until',
            dataIndex: 'validUntil',
            render: (d) => {
                const isExpired = dayjs(d).isBefore(dayjs());
                return <Tag color={isExpired ? 'error' : 'success'}>{dayjs(d).format('MMM DD, YYYY')}</Tag>;
            }
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, record) => record.isSystem ? (
                <Button icon={<BarChartOutlined />} disabled size="small" title="System stats coming soon" />
            ) : (
                <Space>
                    <Button icon={<BarChartOutlined />} onClick={() => showStats(record)} size="small" />
                    <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)} size="small" />
                </Space>
            )
        }
    ];

    const dataSource = [
        {
            id: 'system-monthly',
            name: 'Standard Monthly Fee',
            amount: 15000,
            validUntil: '9999-12-31',
            classrooms: classrooms,
            isSystem: true
        },
        ...categories
    ];

    return (
        <Modal
            title={<Space><BankOutlined /> Fee Categories Management</Space>}
            open={open}
            onCancel={onCancel}
            footer={null}
            width={900}
            style={{ top: 50 }}
        >
            <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Space size="large">
                    <Statistic
                        title="Active Templates"
                        value={categories.filter(c => dayjs(c.validUntil).isAfter(dayjs())).length + 1}
                        valueStyle={{ fontSize: 20, color: '#52c41a' }}
                    />
                    <Statistic
                        title="Total Types"
                        value={categories.length + 1}
                        valueStyle={{ fontSize: 20, color: '#7B57E4' }}
                    />
                </Space>
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => setIsCreateVisible(true)}
                    style={{ background: '#7B57E4' }}
                >
                    Add Ad-hoc Category
                </Button>
            </div>

            <Table
                columns={columns}
                dataSource={dataSource}
                loading={loading}
                rowKey="id"
                pagination={{ pageSize: 5 }}
                size="small"
                locale={{ emptyText: <Empty description="No categories yet" /> }}
            />

            {/* Create Inner Modal */}
            <Modal
                title="New Fee Category"
                open={isCreateVisible}
                onCancel={() => setIsCreateVisible(false)}
                onOk={handleCreate}
                okText="Create"
                okButtonProps={{ style: { background: '#7B57E4' } }}
            >
                <Form form={form} layout="vertical" style={{ marginTop: 10 }}>
                    <Form.Item name="name" label="Name" rules={[{ required: true }]}>
                        <Input placeholder="e.g. Uniform Fee, Field Trip" />
                    </Form.Item>
                    <Form.Item name="classroomIds" label="Classes" rules={[{ required: true }]}>
                        <Select mode="multiple" placeholder="Select target classes">
                            {classrooms.map(c => <Option key={c.id} value={c.id}>{c.name}</Option>)}
                        </Select>
                    </Form.Item>
                    <Row gutter={12}>
                        <Col span={12}>
                            <Form.Item name="frequency" label="Frequency" rules={[{ required: true }]} initialValue="RECURRING">
                                <Select>
                                    <Option value="RECURRING">Recurring (Payable Multiple Times)</Option>
                                    <Option value="ONE_TIME">One-Time (Payable Once per Student)</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="validUntil" label="Valid Until" rules={[{ required: true }]}>
                                <DatePicker style={{ width: '100%' }} disabledDate={(c) => c && c < dayjs().endOf('day')} />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={12}>
                        <Col span={24}>
                            <Form.Item name="amount" label="Amount (Rs.)" rules={[{ required: true }]}>
                                <Input type="number" prefix="Rs." />
                            </Form.Item>
                        </Col>
                    </Row>
                </Form>
            </Modal>

            {/* Stats Inner Modal */}
            <Modal
                title={`Stats: ${selectedCategory?.name}`}
                open={statsModalVisible}
                onCancel={() => setStatsModalVisible(false)}
                footer={null}
            >
                {categoryStats ? (
                    <div style={{ padding: '10px 0' }}>
                        <Row gutter={16}>
                            <Col span={12}>
                                <Card size="small" style={{ background: '#f5f5f5' }}>
                                    <Statistic title="Expected" value={categoryStats.stats.totalExpected} prefix="Rs. " precision={2} />
                                </Card>
                            </Col>
                            <Col span={12}>
                                <Card size="small" style={{ background: '#f6ffed' }}>
                                    <Statistic title="Collected" value={categoryStats.stats.totalPaid} valueStyle={{ color: '#3f8600' }} prefix="Rs. " precision={2} />
                                </Card>
                            </Col>
                        </Row>
                        <div style={{ marginTop: 20 }}>
                            <Text strong>Collection Progress ({categoryStats.stats.collectionRate}%)</Text>
                            <div style={{ height: 10, width: '100%', background: '#eee', borderRadius: 5, marginTop: 8, overflow: 'hidden' }}>
                                <div style={{ width: `${categoryStats.stats.collectionRate}%`, height: '100%', background: '#52c41a' }} />
                            </div>
                        </div>
                    </div>
                ) : <div style={{ textAlign: 'center', padding: 20 }}>Loading...</div>}
            </Modal>
        </Modal>
    );
};

export default CategoryManagementModal;
