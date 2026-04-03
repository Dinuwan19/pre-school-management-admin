import React, { useState, useEffect } from 'react';
import { 
    Table, Button, Space, Typography, Card, Modal, 
    Form, Input, DatePicker, message, Popconfirm, Tag,
    Alert
} from 'antd';
import { PlusOutlined, DeleteOutlined, CalendarOutlined, InfoCircleOutlined } from '@ant-design/icons';
import api from '../api/client';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const SpecialDays = () => {
    const [specialDays, setSpecialDays] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [form] = Form.useForm();

    const fetchSpecialDays = async () => {
        setLoading(true);
        try {
            const res = await api.get('/special-days');
            setSpecialDays(res.data);
        } catch (error) {
            console.error('Failed to fetch special days');
            message.error('Failed to load special days');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSpecialDays();
    }, []);

    const handleCreate = async () => {
        try {
            const values = await form.validateFields();
            setLoading(true);
            
            const payload = {
                ...values,
                date: values.date.format('YYYY-MM-DD')
            };

            await api.post('/special-days', payload);
            message.success('Special day recorded successfully');
            setIsModalVisible(false);
            form.resetFields();
            fetchSpecialDays();
        } catch (error) {
            const errorMsg = error.response?.data?.message || 'Failed to record special day';
            message.error(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        try {
            setLoading(true);
            await api.delete(`/special-days/${id}`);
            message.success('Special day removed');
            fetchSpecialDays();
        } catch (error) {
            message.error('Failed to remove special day');
        } finally {
            setLoading(false);
        }
    };

    const columns = [
        { 
            title: 'Date', 
            dataIndex: 'date', 
            key: 'date', 
            render: (d) => (
                <Space>
                    <CalendarOutlined style={{ color: '#7B57E4' }} />
                    <Text strong>{dayjs(d).format('YYYY-MM-DD')}</Text>
                    {dayjs(d).isSame(dayjs(), 'day') && <Tag color="green">Today</Tag>}
                    {dayjs(d).isSame(dayjs().add(1, 'day'), 'day') && <Tag color="orange">Tomorrow</Tag>}
                </Space>
            ),
            sorter: (a, b) => dayjs(a.date).unix() - dayjs(b.date).unix(),
            defaultSortOrder: 'ascend'
        },
        { title: 'Event Name', dataIndex: 'name', key: 'name', render: (n) => <Text strong>{n}</Text> },
        { title: 'Description', dataIndex: 'description', key: 'desc', ellipsis: true },
        { 
            title: 'Action', 
            key: 'action', 
            render: (_, record) => (
                <Popconfirm
                    title="Remove Special Day"
                    description="Are you sure you want to remove this special day? Notifications already sent won't be retractred."
                    onConfirm={() => handleDelete(record.id)}
                    okText="Yes"
                    cancelText="No"
                    okButtonProps={{ danger: true }}
                >
                    <Button type="text" danger icon={<DeleteOutlined />} />
                </Popconfirm>
            ) 
        }
    ];

    return (
        <div style={{ paddingBottom: 40 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
                <div>
                    <Title level={3}>Special Days & Holidays</Title>
                    <Text type="secondary">Manage school holidays and special events. Parents will be notified automatically at 8 PM the day before.</Text>
                </div>
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => setIsModalVisible(true)}
                    style={{ background: '#7B57E4', borderRadius: 8 }}
                    size="large"
                >
                    Add Special Day
                </Button>
            </div>

            <Alert
                message="Automated Notifications"
                description="The system will automatically send an announcement to all parents at 8:00 PM on the day before any scheduled special day to inform them that preschool will not be held."
                type="info"
                showIcon
                icon={<InfoCircleOutlined />}
                style={{ marginBottom: 24, borderRadius: 12 }}
            />

            <Card bordered={false} style={{ borderRadius: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                <Table
                    columns={columns}
                    dataSource={specialDays}
                    loading={loading}
                    rowKey="id"
                    locale={{ emptyText: 'No special days scheduled yet' }}
                />
            </Card>

            <Modal
                title="Add Special Day / Holiday"
                open={isModalVisible}
                onCancel={() => setIsModalVisible(false)}
                onOk={handleCreate}
                okText="Add Special Day"
                okButtonProps={{ style: { background: '#7B57E4' }, loading: loading }}
                confirmLoading={loading}
            >
                <Form form={form} layout="vertical" style={{ marginTop: 20 }}>
                    <Form.Item name="date" label="Date" rules={[{ required: true, message: 'Please select a date' }]}>
                        <DatePicker style={{ width: '100%' }} disabledDate={(current) => current && current < dayjs().startOf('day')} />
                    </Form.Item>
                    <Form.Item name="name" label="Event Name" rules={[{ required: true, message: 'Please enter a name' }]}>
                        <Input placeholder="e.g. Sinhala & Tamil New Year, Poya Day..." />
                    </Form.Item>
                    <Form.Item name="description" label="Description (Optional)">
                        <Input.TextArea rows={3} placeholder="Add details parents should know..." />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default SpecialDays;
