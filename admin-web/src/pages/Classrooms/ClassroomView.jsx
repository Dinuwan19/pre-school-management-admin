import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Typography, Row, Col, Avatar, Button, List, Tag, Spin, message, Divider, Space, Table, Modal, Form, Input, InputNumber, Breadcrumb, Descriptions, Select, theme } from 'antd';
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
    const {
        token: { colorBgLayout, colorBorder, colorPrimary },
    } = theme.useToken();
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
    const [isTeamModalVisible, setIsTeamModalVisible] = useState(false);
    const [allTeachers, setAllTeachers] = useState([]);
    const [teamForm] = Form.useForm();

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

    // Parse schedule as Meal Plan or default
    let derivedMealPlan = {
        Monday: { items: ['Breakfast: Oatmeal', 'Lunch: Rice & Curry'] },
        Tuesday: { items: ['Breakfast: Bread & Jam', 'Lunch: Pasta'] },
        Wednesday: { items: ['Breakfast: Cereal', 'Lunch: Chicken Wrap'] },
        Thursday: { items: ['Breakfast: Roti', 'Lunch: Fish & Chips'] },
        Friday: { items: ['Breakfast: Milk Rice', 'Lunch: Fried Rice'] }
    };

    try {
        if (classroom.mealPlan) {
            const parsed = JSON.parse(classroom.mealPlan);
            if (parsed.Monday) derivedMealPlan = parsed;
        }
    } catch (e) {
        console.log("Legacy meal plan format or empty");
    }

    const handleSaveMealPlan = async () => {
        try {
            setSaving(true);
            const newMealPlan = { ...derivedMealPlan };
            newMealPlan[editingDay] = { items: dayMealInput.split('\n').filter(i => i.trim() !== '') };

            await api.put(`/classrooms/${id}`, {
                mealPlan: JSON.stringify(newMealPlan)
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

    const fetchAllTeachers = async () => {
        try {
            const res = await api.get('/staff');
            setAllTeachers(res.data.filter(s => s.role === 'TEACHER'));
        } catch (error) {
            console.error('Error fetching teachers:', error);
        }
    };

    const handleAssignTeacher = async () => {
        try {
            const values = await teamForm.validateFields();
            setSaving(true);
            await api.post(`/classrooms/${id}/teachers`, values);
            message.success('Team updated successfully');
            setIsTeamModalVisible(false);
            fetchClassroom();
        } catch (error) {
            message.error(error.response?.data?.message || 'Assignment failed');
        } finally {
            setSaving(false);
        }
    };

    const leadTeacherProfile = classroom.teacherProfiles?.find(tp => tp.designation === 'LEAD');
    const assistantProfiles = classroom.teacherProfiles?.filter(tp => tp.designation === 'ASSISTANT') || [];



    return (
        <div style={{ background: colorBgLayout, minHeight: '100vh', padding: '0 24px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0' }}>
                <Breadcrumb
                    items={[
                        { title: <span style={{ color: '#999' }}>Classrooms</span> },
                        { title: <span style={{ fontWeight: 600 }}>C{String(classroom.id).padStart(3, '0')}</span> }
                    ]}
                />
                <Space></Space>
            </div>

            <div style={{ display: 'flex', gap: 16, marginBottom: 16, alignItems: 'center' }}>
                <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/classrooms')} size="small" style={{ borderRadius: 4 }}>Back</Button>
                <Title level={4} style={{ margin: 0 }}>{classroom.name}</Title>
                <div style={{ flex: 1 }}></div>
                {user?.role !== 'TEACHER' && (
                    <Button type="primary" icon={<EditOutlined />} style={{ background: colorPrimary, borderRadius: 6 }} onClick={() => setIsEditModalVisible(true)}>Edit Classroom</Button>
                )}
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
                                <div style={{ fontWeight: 600, color: colorPrimary }}>{leadTeacherProfile?.user?.fullName || 'Not Assigned'}</div>
                            </Descriptions.Item>
                            <Descriptions.Item label={<Text type="secondary" style={{ fontSize: 12 }}>Assistant Teachers</Text>}>
                                <Space direction="vertical" size={0}>
                                    {assistantProfiles.length > 0 ? assistantProfiles.map(tp => (
                                        <div key={tp?.teacherId} style={{ fontWeight: 500 }}>{tp?.user?.fullName}</div>
                                    )) : 'None'}
                                </Space>
                            </Descriptions.Item>
                        </Descriptions>
                        <Divider style={{ margin: '12px 0' }} />
                        {user?.role !== 'TEACHER' && (
                            <Button type="primary" ghost size="small" icon={<TeamOutlined />} onClick={() => {
                                fetchAllTeachers();
                                setIsTeamModalVisible(true);
                            }} style={{ width: '100%', borderRadius: 6 }}>Manage Team</Button>
                        )}
                    </Card>
                </Col>

                <Col xs={24} md={16}>
                    <Card size="small" title={<Text strong>Students</Text>} bordered={false} style={{ borderRadius: 16, marginBottom: 24 }}>
                        <Row gutter={[16, 16]} style={{ marginTop: 8 }}>
                            {classroom.students?.map(student => (
                                <Col span={12} key={student.id}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px', border: `1px solid ${colorBorder}`, borderRadius: 12 }}>
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
                                            setDayMealInput(derivedMealPlan[day]?.items?.join('\n') || '');
                                            setIsEditModalVisible(false); // Close other modal if open
                                        }}>Edit</Button>
                                    </div>
                                    <List
                                        dataSource={derivedMealPlan[day]?.items || []}
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
            <Modal
                title={`Manage Classroom Team: ${classroom.name}`}
                open={isTeamModalVisible}
                onCancel={() => setIsTeamModalVisible(false)}
                onOk={handleAssignTeacher}
                confirmLoading={saving}
                destroyOnClose
            >
                <div style={{ marginBottom: 16 }}>
                    <Text type="secondary">Assign a teacher to this classroom and set their role.</Text>
                </div>
                <Form form={teamForm} layout="vertical">
                    <Form.Item name="teacherId" label="Select Teacher" rules={[{ required: true }]}>
                        <Select placeholder="Choose a teacher">
                            {allTeachers.map(t => (
                                <Select.Option key={t.id} value={t.id}>{t.fullName}</Select.Option>
                            ))}
                        </Select>
                    </Form.Item>
                    <Form.Item name="designation" label="Designation" rules={[{ required: true }]} initialValue="ASSISTANT">
                        <Select>
                            <Select.Option value="LEAD">Lead Teacher</Select.Option>
                            <Select.Option value="ASSISTANT">Assistant Teacher</Select.Option>
                        </Select>
                    </Form.Item>
                </Form>
            </Modal>
        </div >
    );
};

export default ClassroomView;
