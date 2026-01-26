import React, { useState, useEffect } from 'react';
import { Card, Button, Table, Tag, Modal, Form, Input, DatePicker, TimePicker, Select, Typography, message, Space, Tabs, Row, Col } from 'antd';
import { CalendarOutlined, PlusOutlined, EnvironmentOutlined, UserOutlined } from '@ant-design/icons';
import mockApi from '../api/client';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { TabPane } = Tabs;

const Events = () => {
    const [events, setEvents] = useState([]);
    const [waitingList, setWaitingList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [form] = Form.useForm();
    const [submitting, setSubmitting] = useState(false);

    const fetchEvents = async () => {
        setLoading(true);
        try {
            const response = await mockApi.get('/events?status=All Events');
            setEvents(response.data);
        } catch (error) {
            message.error('Failed to fetch events');
        } finally {
            setLoading(false);
        }
    };

    const fetchWaitingList = async () => {
        try {
            const response = await mockApi.get('/events/waiting-list/all');
            setWaitingList(response.data);
        } catch (error) {
            console.error('Failed to fetch waiting list');
        }
    };

    useEffect(() => {
        fetchEvents();
        fetchWaitingList();
    }, []);

    const handleCreateEvent = async (values) => {
        setSubmitting(true);
        try {
            const payload = {
                ...values,
                eventDate: values.eventDate.format('YYYY-MM-DD'),
                startTime: values.startTime.format('HH:mm'),
                endTime: values.endTime.format('HH:mm'),
            };
            await mockApi.post('/events', payload);
            message.success('Event created successfully');
            setIsModalVisible(false);
            form.resetFields();
            fetchEvents();
        } catch (error) {
            message.error('Failed to create event');
        } finally {
            setSubmitting(false);
        }
    };

    const handleApprovePayload = async (id) => {
        try {
            await mockApi.put(`/events/waiting-list/${id}/approve`);
            message.success('Request approved');
            fetchWaitingList();
            fetchEvents(); // Update event counts
        } catch (error) {
            message.error('Failed to approve request');
        }
    };

    const eventColumns = [
        {
            title: 'Event',
            dataIndex: 'title',
            key: 'title',
            render: (text) => <Text strong>{text}</Text>,
        },
        {
            title: 'Date',
            dataIndex: 'eventDate',
            key: 'eventDate',
            render: (date) => dayjs(date).format('MMM D, YYYY'),
            sorter: (a, b) => new Date(a.eventDate) - new Date(b.eventDate),
        },
        {
            title: 'Time',
            key: 'time',
            render: (_, record) => `${record.startTime} - ${record.endTime}`,
        },
        {
            title: 'Location',
            dataIndex: 'location',
            key: 'location',
            render: (text) => <Space><EnvironmentOutlined /> {text}</Space>,
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status) => {
                let color = 'default';
                if (status === 'UPCOMING') color = 'blue';
                if (status === 'COMPLETED') color = 'green';
                if (status === 'CANCELLED') color = 'red';
                return <Tag color={color}>{status}</Tag>;
            },
        },
        {
            title: 'Attendees',
            dataIndex: 'attendees',
            key: 'attendees',
            render: (count) => <Space><UserOutlined /> {count || 0}</Space>,
        },
    ];

    const waitingListColumns = [
        {
            title: 'Student',
            dataIndex: ['student', 'fullName'],
            key: 'student',
        },
        {
            title: 'Event',
            dataIndex: ['event', 'title'],
            key: 'event',
        },
        {
            title: 'Requested At',
            dataIndex: 'requestedAt',
            key: 'requestedAt',
            render: (date) => dayjs(date).format('YYYY-MM-DD HH:mm'),
        },
        {
            title: 'Action',
            key: 'action',
            render: (_, record) => (
                <Button type="primary" size="small" onClick={() => handleApprovePayload(record.id)} style={{ background: '#7B57E4', borderColor: '#7B57E4' }}>
                    Approve
                </Button>
            ),
        },
    ];

    return (
        <div style={{ padding: 24 }}>
            <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <Title level={2} style={{ margin: 0 }}>Events</Title>
                    <Text type="secondary">Manage school events and waiting lists</Text>
                </div>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalVisible(true)} style={{ background: '#7B57E4', borderColor: '#7B57E4', borderRadius: 8, height: 44 }}>
                    Create Event
                </Button>
            </div>

            <Tabs defaultActiveKey="1">
                <TabPane tab="All Events" key="1">
                    <Card bordered={false}>
                        <Table
                            dataSource={events}
                            columns={eventColumns}
                            rowKey="id"
                            loading={loading}
                        />
                    </Card>
                </TabPane>
                <TabPane tab={`Waiting List (${waitingList.length})`} key="2">
                    <Card bordered={false}>
                        <Table
                            dataSource={waitingList}
                            columns={waitingListColumns}
                            rowKey="id"
                        />
                    </Card>
                </TabPane>
            </Tabs>

            <Modal
                title="Create New Event"
                open={isModalVisible}
                onCancel={() => setIsModalVisible(false)}
                footer={null}
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleCreateEvent}
                >
                    <Form.Item name="title" label="Event Title" rules={[{ required: true }]}>
                        <Input placeholder="Ex: Sports Day" />
                    </Form.Item>
                    <Form.Item name="description" label="Description">
                        <TextArea rows={3} />
                    </Form.Item>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="eventDate" label="Date" rules={[{ required: true }]}>
                                <DatePicker style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="location" label="Location">
                                <Input prefix={<EnvironmentOutlined />} />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="startTime" label="Start Time" rules={[{ required: true }]}>
                                <TimePicker format="HH:mm" style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="endTime" label="End Time" rules={[{ required: true }]}>
                                <TimePicker format="HH:mm" style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Button type="primary" htmlType="submit" loading={submitting} block style={{ background: '#7B57E4', borderColor: '#7B57E4', height: 40, borderRadius: 8 }}>
                        Create Event
                    </Button>
                </Form>
            </Modal>
        </div>
    );
};

export default Events;
