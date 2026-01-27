import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Typography, Row, Col, Progress, Avatar, Tag, Modal, Form, Input, InputNumber, message, Space, Empty, Divider, Descriptions, List } from 'antd';
import { PlusOutlined, UserOutlined, TeamOutlined, ScheduleOutlined, EditOutlined, SaveOutlined } from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/client';

const { Title, Text } = Typography;

const Classrooms = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [classrooms, setClassrooms] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [isViewModalVisible, setIsViewModalVisible] = useState(false);
    const [selectedClassroom, setSelectedClassroom] = useState(null);
    const [isEditingSchedule, setIsEditingSchedule] = useState(false);
    const [scheduleText, setScheduleText] = useState('');
    const [form] = Form.useForm();

    const fetchClassrooms = async () => {
        setLoading(true);
        try {
            const res = await api.get('/classrooms');
            setClassrooms(res.data);
            // Update selected classroom if modal is open
            if (selectedClassroom) {
                const updated = res.data.find(c => c.id === selectedClassroom.id);
                if (updated) {
                    setSelectedClassroom(updated);
                    setScheduleText(updated.schedule || '');
                }
            }
        } catch (error) {
            message.error('Failed to fetch classrooms');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchClassrooms();
    }, []);

    const handleAdd = async () => {
        try {
            const values = await form.validateFields();
            setLoading(true);
            await api.post('/classrooms', values);
            message.success('Classroom created');
            setIsModalVisible(false);
            fetchClassrooms();
        } catch (error) {
            message.error('Failed to create classroom');
        } finally {
            setLoading(false);
        }
    };

    const handleViewDetails = (cls) => {
        setSelectedClassroom(cls);
        setScheduleText(cls.schedule || '');
        setIsViewModalVisible(true);
        setIsEditingSchedule(false);
    };

    const handleSaveSchedule = async () => {
        try {
            setLoading(true);
            await api.put(`/classrooms/${selectedClassroom.id}`, { schedule: scheduleText });
            message.success('Schedule updated successfully');
            setIsEditingSchedule(false);
            fetchClassrooms();
        } catch (error) {
            message.error('Failed to update schedule');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ paddingBottom: 40 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
                <div>
                    <Title level={3} style={{ margin: 0 }}>Classrooms</Title>
                    <Text type="secondary">Manage groups and assigned teachers</Text>
                </div>
                {user?.role !== 'TEACHER' && (
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        size="large"
                        onClick={() => { form.resetFields(); setIsModalVisible(true); }}
                        style={{ background: '#7B57E4', borderRadius: 8, height: 44 }}
                    >
                        Add Classroom
                    </Button>
                )}
            </div>

            {loading && classrooms.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '100px 0' }}>Loading classrooms...</div>
            ) : classrooms.length === 0 ? (
                <Empty description="No classrooms found. Add one to get started!" />
            ) : (
                <Row gutter={[24, 24]}>
                    {classrooms.map(cls => {
                        const studentCount = cls.students?.length || 0;
                        const capacity = cls.capacity || 20;
                        const percentage = Math.min(100, Math.round((studentCount / capacity) * 100));
                        const leadTeacher = cls.teacherProfiles?.[0]?.user?.fullName || 'Not Assigned';

                        return (
                            <Col xs={24} sm={12} lg={8} key={cls.id}>
                                <Card
                                    hoverable
                                    bordered={false}
                                    style={{ borderRadius: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                                    bodyStyle={{ padding: 24 }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                                        <div>
                                            <Title level={4} style={{ margin: 0, color: '#333' }}>{cls.name}</Title>
                                            <Tag color="purple" style={{ borderRadius: 6, marginTop: 4 }}>{cls.ageGroup || 'All Ages'}</Tag>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <Text strong style={{ fontSize: 16 }}><TeamOutlined /> {studentCount}/{capacity}</Text>
                                        </div>
                                    </div>

                                    <div style={{ marginBottom: 20 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                            <Text type="secondary" style={{ fontSize: 12 }}>Occupancy</Text>
                                            <Text type="secondary" style={{ fontSize: 12 }}>{percentage}%</Text>
                                        </div>
                                        <Progress
                                            percent={percentage}
                                            showInfo={false}
                                            strokeColor="#7B57E4"
                                            trailColor="#F0EAFB"
                                            strokeWidth={10}
                                        />
                                    </div>

                                    <Divider style={{ margin: '16px 0' }} />

                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <Avatar icon={<UserOutlined />} style={{ background: '#F0EAFB', color: '#7B57E4' }} />
                                        <div style={{ overflow: 'hidden' }}>
                                            <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>Lead Teacher</Text>
                                            <Text strong style={{ fontSize: 14, whiteSpace: 'nowrap' }}>{leadTeacher}</Text>
                                        </div>
                                    </div>

                                    <Button
                                        block
                                        onClick={() => navigate(`/classrooms/${cls.id}`)}
                                        style={{ marginTop: 20, borderRadius: 8, height: 40, color: '#7B57E4', borderColor: '#7B57E4' }}
                                    >
                                        View Details
                                    </Button>
                                </Card>
                            </Col>
                        );
                    })}
                </Row>
            )}

            {/* Create Classroom Modal */}
            <Modal
                title="Create New Classroom"
                open={isModalVisible}
                onCancel={() => setIsModalVisible(false)}
                onOk={handleAdd}
                okText="Create Classroom"
                okButtonProps={{ style: { background: '#7B57E4' } }}
            >
                <Form form={form} layout="vertical" style={{ marginTop: 20 }}>
                    <Form.Item name="name" label="Classroom Name" rules={[{ required: true }]}>
                        <Input placeholder="e.g. Sunshine Room" />
                    </Form.Item>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="ageGroup" label="Age Group">
                                <Input placeholder="e.g. 3-4 years" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="capacity" label="Capacity" initialValue={20}>
                                <InputNumber style={{ width: '100%' }} min={1} />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Form.Item name="schedule" label="Schedule Description">
                        <Input.TextArea placeholder="Enter daily schedule details..." rows={3} />
                    </Form.Item>
                </Form>
            </Modal>

            {/* View Details Modal */}
            <Modal
                title={`Classroom: ${selectedClassroom?.name}`}
                open={isViewModalVisible}
                onCancel={() => setIsViewModalVisible(false)}
                width={800}
                footer={[
                    <Button key="close" onClick={() => setIsViewModalVisible(false)}>Close</Button>
                ]}
            >
                {selectedClassroom && (
                    <div style={{ marginTop: 16 }}>
                        <Row gutter={24}>
                            <Col span={12}>
                                <Descriptions title="General Information" column={1} bordered size="small">
                                    <Descriptions.Item label="Name">{selectedClassroom.name}</Descriptions.Item>
                                    <Descriptions.Item label="Age Group">{selectedClassroom.ageGroup || 'N/A'}</Descriptions.Item>
                                    <Descriptions.Item label="Capacity">{selectedClassroom.capacity}</Descriptions.Item>
                                    <Descriptions.Item label="Current Students">{selectedClassroom.students?.length || 0}</Descriptions.Item>
                                </Descriptions>
                            </Col>
                            <Col span={12}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                    <Title level={5} style={{ margin: 0 }}>Schedule</Title>
                                    {(user?.role !== 'TEACHER' && !isEditingSchedule) && (
                                        <Button size="small" icon={<EditOutlined />} onClick={() => setIsEditingSchedule(true)}>Edit</Button>
                                    )}
                                    {(user?.role !== 'TEACHER' && isEditingSchedule) && (
                                        <Button size="small" type="primary" icon={<SaveOutlined />} onClick={handleSaveSchedule} loading={loading}>Save</Button>
                                    )}
                                </div>
                                {isEditingSchedule ? (
                                    <Input.TextArea
                                        rows={6}
                                        value={scheduleText}
                                        onChange={e => setScheduleText(e.target.value)}
                                        placeholder="Enter daily schedule..."
                                    />
                                ) : (
                                    <Card size="small" style={{ minHeight: 140, background: '#F9F9F9' }}>
                                        <Text style={{ whiteSpace: 'pre-wrap' }}>{selectedClassroom.schedule || 'No schedule defined yet.'}</Text>
                                    </Card>
                                )}
                            </Col>
                        </Row>

                        <Divider orientation="left">Assigned Teachers (Max 3)</Divider>
                        <List
                            grid={{ gutter: 16, column: 3 }}
                            dataSource={selectedClassroom.teacherProfiles || []}
                            renderItem={item => (
                                <List.Item>
                                    <Card size="small" bordered style={{ borderRadius: 8 }}>
                                        <Space>
                                            <Avatar icon={<UserOutlined />} />
                                            <Text strong>{item.user?.fullName}</Text>
                                        </Space>
                                    </Card>
                                </List.Item>
                            )}
                            locale={{ emptyText: <Text type="secondary">No teachers assigned to this class.</Text> }}
                        />
                        {(selectedClassroom.teacherProfiles?.length || 0) < 3 && (
                            <Text type="secondary" style={{ fontSize: 12, italic: true }}>
                                * You can assign more teachers in the Staff management section.
                            </Text>
                        )}
                        {(selectedClassroom.teacherProfiles?.length || 0) >= 3 && (
                            <Tag color="warning">Maximum capacity of 3 teachers reached.</Tag>
                        )}

                        <Divider orientation="left">Student Roster</Divider>
                        <List
                            size="small"
                            dataSource={selectedClassroom.students || []}
                            renderItem={item => (
                                <List.Item>
                                    <Space>
                                        <Avatar size="small" src={item.photoUrl} />
                                        <Text>{item.fullName}</Text>
                                    </Space>
                                </List.Item>
                            )}
                            locale={{ emptyText: 'No students enrolled in this class.' }}
                        />
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default Classrooms;
