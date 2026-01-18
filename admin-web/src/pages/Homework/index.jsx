import React, { useState, useEffect } from 'react';
import { Card, Button, Typography, Row, Col, Modal, Form, Input, DatePicker, Select, message, Space, Tag, Empty, List, Avatar, Divider } from 'antd';
import { PlusOutlined, BookOutlined, CalendarOutlined, DeleteOutlined, UserOutlined } from '@ant-design/icons';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

const Homework = () => {
    const { user } = useAuth();
    const [homework, setHomework] = useState([]);
    const [classrooms, setClassrooms] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [form] = Form.useForm();

    const fetchData = async () => {
        setLoading(true);
        try {
            const [hwRes, classRes] = await Promise.all([
                api.get('/homework'),
                api.get('/classrooms')
            ]);
            setHomework(hwRes.data);
            setClassrooms(classRes.data);
        } catch (error) {
            message.error('Failed to load homework data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleCreate = async () => {
        try {
            const values = await form.validateFields();
            setLoading(true);
            await api.post('/homework', values);
            message.success('Homework assigned successfully');
            setIsModalVisible(false);
            form.resetFields();
            fetchData();
        } catch (error) {
            message.error('Failed to assign homework');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        try {
            await api.delete(`/homework/${id}`);
            message.success('Homework deleted');
            fetchData();
        } catch (error) {
            message.error('Failed to delete');
        }
    };

    return (
        <div style={{ paddingBottom: 40 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
                <div>
                    <Title level={3} style={{ margin: 0 }}>Homework & Tasks</Title>
                    <Text type="secondary">Manage classroom assignments and due dates</Text>
                </div>
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    size="large"
                    onClick={() => setIsModalVisible(true)}
                    style={{ background: '#7B57E4', borderRadius: 8, height: 44 }}
                >
                    Assign Homework
                </Button>
            </div>

            <Row gutter={[24, 24]}>
                {homework.map((item) => (
                    <Col xs={24} md={12} lg={8} key={item.id}>
                        <Card
                            hoverable
                            style={{ borderRadius: 16, border: '1px solid #f0f0f0', position: 'relative' }}
                            bodyStyle={{ padding: 20 }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                                <Tag color="purple">{item.classroom?.name}</Tag>
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                    <CalendarOutlined /> Due: {item.dueDate ? dayjs(item.dueDate).format('MMM D') : 'No date'}
                                </Text>
                            </div>

                            <Title level={5} style={{ margin: 0, marginBottom: 8 }}>{item.title}</Title>
                            <Paragraph ellipsis={{ rows: 2 }} type="secondary" style={{ fontSize: 13, marginBottom: 16 }}>
                                {item.description}
                            </Paragraph>

                            <Divider style={{ margin: '12px 0' }} />

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <Avatar size="small" icon={<UserOutlined />} style={{ background: '#F0EAFB', color: '#7B57E4' }} />
                                    <Text style={{ fontSize: 12 }}>{item.user?.fullName}</Text>
                                </div>
                                <Button
                                    type="text"
                                    danger
                                    size="small"
                                    icon={<DeleteOutlined />}
                                    onClick={() => handleDelete(item.id)}
                                />
                            </div>
                        </Card>
                    </Col>
                ))}
            </Row>

            {homework.length === 0 && !loading && (
                <Empty description="No homework assignments found" style={{ marginTop: 60 }} />
            )}

            <Modal
                title="Assign New Homework"
                open={isModalVisible}
                onCancel={() => setIsModalVisible(false)}
                onOk={handleCreate}
                okText="Assign Task"
                confirmLoading={loading}
                okButtonProps={{ style: { background: '#7B57E4' } }}
            >
                <Form form={form} layout="vertical" style={{ marginTop: 20 }}>
                    <Form.Item name="classroomId" label="Select Classroom" rules={[{ required: true }]}>
                        <Select placeholder="Which class is this for?">
                            {classrooms.map(c => <Option key={c.id} value={c.id}>{c.name}</Option>)}
                        </Select>
                    </Form.Item>
                    <Form.Item name="title" label="Homework Title" rules={[{ required: true }]}>
                        <Input placeholder="e.g. Weekend Reading" />
                    </Form.Item>
                    <Form.Item name="description" label="Instructions">
                        <Input.TextArea rows={3} placeholder="Provide details for students and parents..." />
                    </Form.Item>
                    <Form.Item name="dueDate" label="Due Date">
                        <DatePicker style={{ width: '100%' }} />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default Homework;
