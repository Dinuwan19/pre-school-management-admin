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
    const [editingDay, setEditingDay] = useState(null);
    const [dayMealInput, setDayMealInput] = useState('');

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

    const handleSaveMealPlan = async () => {
        try {
            setSaving(true);
            const newMealPlan = { ...mealPlan };
            newMealPlan[editingDay] = { items: dayMealInput.split('\n').filter(i => i.trim() !== '') };

            await api.put(`/classrooms/${id}`, {
                schedule: JSON.stringify(newMealPlan)
            });
            message.success('Meal plan updated');
            setEditingDay(null);
            fetchClassroom();
        } catch (error) {
            message.error('Failed to save meal plan');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div style={{ textAlign: 'center', marginTop: 100 }}><Spin size="large" /></div>;
    if (!classroom) return <div style={{ padding: 40 }}><Text type="danger">Classroom not found</Text></div>;

    const leadTeacherProfile = classroom.teacherProfiles?.[0];
    const assistantProfiles = classroom.teacherProfiles?.slice(1) || [];

    // Parse schedule as Meal Plan or default
    let mealPlan = {
        Monday: { items: ['Breakfast: Oatmeal', 'Lunch: Rice & Curry'] },
        Tuesday: { items: ['Breakfast: Bread & Jam', 'Lunch: Pasta'] },
        Wednesday: { items: ['Breakfast: Cereal', 'Lunch: Chicken Wrap'] },
        Thursday: { items: ['Breakfast: Roti', 'Lunch: Fish & Chips'] },
        Friday: { items: ['Breakfast: Milk Rice', 'Lunch: Fried Rice'] }
    };

    try {
        if (classroom.schedule) {
            const parsed = JSON.parse(classroom.schedule);
            if (parsed.Monday) mealPlan = parsed;
        }
    } catch (e) {
        // If legacy text, maybe put it in Monday or ignore
        console.log("Legacy schedule format or empty");
    }



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
                                <div style={{ fontWeight: 600, color: '#7B57E4' }}>{leadTeacherProfile?.user?.fullName || 'Not Assigned'}</div>
                            </Descriptions.Item>
                            <Descriptions.Item label={<Text type="secondary" style={{ fontSize: 12 }}>Assistant Teachers</Text>}>
                                <Space direction="vertical" size={0}>
                                    {assistantProfiles.length > 0 ? assistantProfiles.map(tp => (
                                        <div key={tp?.id} style={{ fontWeight: 500 }}>{tp?.user?.fullName}</div>
                                    )) : 'None'}
                                </Space>
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
                        title={<Text strong>Meal Plan (Mon-Fri)</Text>}
                        bordered={false}
                        style={{ borderRadius: 16 }}
                    >
                        <div style={{ padding: '8px 0' }}>
                            {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map((day) => (
                                <div key={day} style={{ marginBottom: 24 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                        <div style={{ fontWeight: 600, fontSize: 15 }}>{day}</div>
                                        <Button size="small" type="link" onClick={() => {
                                            setEditingDay(day);
                                            setDayMealInput(mealPlan[day]?.items?.join('\n') || '');
                                            setIsEditModalVisible(false); // Close other modal if open
                                            // We need a separate modal for meal plan, reusing state or new one
                                            // I'll reuse a new state: isMealModalVisible
                                        }}>Edit</Button>
                                    </div>
                                    <List
                                        dataSource={mealPlan[day]?.items || []}
                                        renderItem={item => (
                                            <List.Item style={{ padding: '4px 0', border: 0 }}>
                                                <Space><div style={{ width: 6, height: 6, borderRadius: '50%', background: '#52C41A' }} /> {item}</Space>
                                            </List.Item>
                                        )}
                                        locale={{ emptyText: <Text type="secondary" style={{ fontSize: 12 }}>No meals planned</Text> }}
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

            <Modal
                title={`Edit Meal Plan: ${editingDay}`}
                open={!!editingDay}
                onCancel={() => setEditingDay(null)}
                onOk={handleSaveMealPlan}
                confirmLoading={saving}
            >
                <div style={{ marginBottom: 12 }}>Enter meals for {editingDay}, one per line:</div>
                <Input.TextArea
                    rows={6}
                    value={dayMealInput}
                    onChange={e => setDayMealInput(e.target.value)}
                    placeholder="Example:
Breakfast: Oatmeal
Lunch: Rice & Curry"
                />
            </Modal>
        </div >
    );
};

export default ClassroomView;
