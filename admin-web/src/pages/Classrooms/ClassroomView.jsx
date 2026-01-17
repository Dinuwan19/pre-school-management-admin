import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Typography, Row, Col, Avatar, Button, List, Tag, Spin, message, Divider, Space, Table, Modal, Form, Input, InputNumber, Breadcrumb, Descriptions } from 'antd';
import {
    ArrowLeftOutlined, EditOutlined, TeamOutlined,
    SolutionOutlined, CalendarOutlined, InfoCircleOutlined,
    UserOutlined, ClockCircleOutlined, BulbOutlined
} from '@ant-design/icons';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const ClassroomView = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [classroom, setClassroom] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isEditModalVisible, setIsEditModalVisible] = useState(false);
    const [editForm] = Form.useForm();
    const [saving, setSaving] = useState(false);

    const fetchClassroom = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/classrooms/${id}`);
            if (res.data) {
                setClassroom(res.data);
                editForm.setFieldsValue({
                    name: res.data.name,
                    ageGroup: res.data.ageGroup,
                    capacity: res.data.capacity
                });
            } else {
                setClassroom(null);
            }
        } catch (error) {
            console.error('Error fetching classroom:', error);
            message.error('Failed to load classroom details');
            setClassroom(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (id) fetchClassroom();
    }, [id]);

    const handleUpdate = async () => {
        try {
            const values = await editForm.validateFields();
            setSaving(true);
            await api.put(`/classrooms/${id}`, values);
            message.success('Classroom updated successfully');
            setIsEditModalVisible(false);
            fetchClassroom();
        } catch (error) {
            message.error('Update failed');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div style={{ textAlign: 'center', marginTop: 100 }}><Spin size="large" /></div>;
    if (!classroom) return <div style={{ padding: 40 }}><Text type="danger">Classroom not found</Text></div>;

    const leadTeacher = classroom.teacherProfiles?.[0]?.user;

    const scheduleData = [
        {
            day: 'Monday', items: [
                { time: '09:00 AM', activity: 'Morning Circle' },
                { time: '10:00 AM', activity: 'Snack Time' },
                { time: '10:30 AM', activity: 'Art Activity' },
                { time: '12:00 PM', activity: 'Lunch' },
                { time: '01:00 PM', activity: 'Nap Time' },
                { time: '02:30 PM', activity: 'Outdoor Play' },
                { time: '03:30 PM', activity: 'Story Time' }
            ]
        },
        {
            day: 'Tuesday', items: [
                { time: '09:00 AM', activity: 'Morning Circle' },
                { time: '10:00 AM', activity: 'Snack Time' },
                { time: '10:30 AM', activity: 'Music and Movement' },
                { time: '12:00 PM', activity: 'Lunch' },
                { time: '01:00 PM', activity: 'Nap Time' },
                { time: '02:30 PM', activity: 'Science Activity' },
                { time: '03:30 PM', activity: 'Free Play' }
            ]
        }
    ];

    return (
        <div style={{ background: '#f5f7fb', minHeight: '100vh', padding: '0 24px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0' }}>
                <Breadcrumb
                    items={[
                        { title: <span style={{ color: '#999' }}>Classrooms</span> },
                        { title: <span style={{ fontWeight: 600 }}>C{String(classroom.id).padStart(3, '0')}</span> }
                    ]}
                />
                <Space>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ position: 'relative' }}>
                            <div style={{ width: 8, height: 8, background: '#F5222D', borderRadius: '50%', position: 'absolute', top: -2, right: -2 }}></div>
                            <Button type="text" icon={<BulbOutlined style={{ fontSize: 20 }} />} />
                        </div>
                        <Avatar style={{ background: '#7B57E4' }}>AD</Avatar>
                        <Text strong>Admin</Text>
                    </div>
                </Space>
            </div>

            <div style={{ display: 'flex', gap: 16, marginBottom: 16, alignItems: 'center' }}>
                <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/classrooms')} size="small" style={{ borderRadius: 4 }}>Back</Button>
                <Title level={4} style={{ margin: 0 }}>{classroom.name}</Title>
                <div style={{ flex: 1 }}></div>
                <Button type="primary" icon={<EditOutlined />} style={{ background: '#7B57E4', borderRadius: 6 }} onClick={() => setIsEditModalVisible(true)}>Edit Classroom</Button>
            </div>

            <Row gutter={24}>
                <Col xs={24} md={8}>
                    <Card size="small" title={<Text strong>Classroom Information</Text>} bordered={false} style={{ borderRadius: 16, height: '100%' }}>
                        <Descriptions column={1} size="small" style={{ marginTop: 16 }}>
                            <Descriptions.Item label={<Text type="secondary" style={{ fontSize: 12 }}>Name</Text>}>
                                <div style={{ fontWeight: 600 }}>{classroom.name}</div>
                            </Descriptions.Item>
                            <Descriptions.Item label={<Text type="secondary" style={{ fontSize: 12 }}>Age Group</Text>}>
                                <div style={{ fontWeight: 600 }}>{classroom.ageGroup || 'N/A'}</div>
                            </Descriptions.Item>
                            <Descriptions.Item label={<Text type="secondary" style={{ fontSize: 12 }}>Capacity</Text>}>
                                <div style={{ fontWeight: 600 }}>{classroom.students?.length || 0} / {classroom.capacity || 0}</div>
                            </Descriptions.Item>
                            <Descriptions.Item label={<Text type="secondary" style={{ fontSize: 12 }}>Lead Teacher</Text>}>
                                <div style={{ fontWeight: 600, color: '#7B57E4' }}>{leadTeacher?.fullName || 'Not Assigned'}</div>
                            </Descriptions.Item>
                        </Descriptions>
                    </Card>
                </Col>

                <Col xs={24} md={16}>
                    <Card size="small" title={<Text strong>Students</Text>} bordered={false} style={{ borderRadius: 16, marginBottom: 24 }}>
                        <Row gutter={[16, 16]} style={{ marginTop: 8 }}>
                            {classroom.students?.map(student => (
                                <Col span={12} key={student.id}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px', border: '1px solid #f0f0f0', borderRadius: 12 }}>
                                        <Avatar src={student.photoUrl} size={40} />
                                        <div>
                                            <div style={{ fontWeight: 600, fontSize: 14 }}>{student.fullName}</div>
                                            <div style={{ fontSize: 12, color: '#999' }}>{student.studentUniqueId || 'N/A'}</div>
                                        </div>
                                    </div>
                                </Col>
                            ))}
                            {(!classroom.students || classroom.students.length === 0) && (
                                <Col span={24}><div style={{ textAlign: 'center', color: '#999', padding: '24px 0' }}>No students enrolled.</div></Col>
                            )}
                        </Row>
                    </Card>

                    <Card
                        size="small"
                        title={<Text strong>Schedule</Text>}
                        bordered={false}
                        style={{ borderRadius: 16 }}
                        extra={<Button size="small" type="link" style={{ color: '#555' }} icon={<EditOutlined />}>Edit Schedule</Button>}
                    >
                        <div style={{ padding: '8px 0' }}>
                            {scheduleData.map((dayPlan, i) => (
                                <div key={i} style={{ marginBottom: i === 0 ? 24 : 0 }}>
                                    <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 12 }}>{dayPlan.day}</div>
                                    <List
                                        dataSource={dayPlan.items}
                                        renderItem={item => (
                                            <List.Item style={{ display: 'block', padding: '8px 0', border: 0 }}>
                                                <Row gutter={16} align="middle">
                                                    <Col span={6}><Text type="secondary" style={{ fontSize: 13 }}>{item.time}</Text></Col>
                                                    <Col span={18}><Text style={{ fontSize: 14 }}>{item.activity}</Text></Col>
                                                </Row>
                                            </List.Item>
                                        )}
                                    />
                                </div>
                            ))}
                        </div>
                    </Card>
                </Col>
            </Row>

            <Modal
                title="Edit Classroom Details"
                open={isEditModalVisible}
                onCancel={() => setIsEditModalVisible(false)}
                onOk={handleUpdate}
                confirmLoading={saving}
            >
                <Form form={editForm} layout="vertical">
                    <Form.Item name="name" label="Classroom Name" rules={[{ required: true }]}><Input /></Form.Item>
                    <Form.Item name="ageGroup" label="Age Group"><Input /></Form.Item>
                    <Form.Item name="capacity" label="Capacity"><InputNumber style={{ width: '100%' }} min={1} /></Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default ClassroomView;
