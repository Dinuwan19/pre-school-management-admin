import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Typography, Row, Col, Avatar, Button, Tag, Spin, message, Divider, Space, List, Modal, Form, Input, Select, DatePicker, Upload, Breadcrumb, Descriptions } from 'antd';
import {
    UserOutlined, ArrowLeftOutlined, EditOutlined, MailOutlined,
    PhoneOutlined, EnvironmentOutlined, DownloadOutlined,
    SafetyCertificateOutlined, HomeOutlined, EyeOutlined, UploadOutlined, FilePdfOutlined, CalendarOutlined, BulbOutlined
} from '@ant-design/icons';
import api from '../../api/client';
import dayjs from 'dayjs';
import { useAuth } from '../../context/AuthContext';

const { Title, Text } = Typography;
const { Option } = Select;

const StaffProfile = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [staff, setStaff] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isEditModalVisible, setIsEditModalVisible] = useState(false);
    const [editForm] = Form.useForm();
    const [saving, setSaving] = useState(false);
    const [classrooms, setClassrooms] = useState([]);

    const fetchStaffData = async () => {
        try {
            const res = await api.get(`/staff/${id}`);
            setStaff(res.data);
        } catch (error) {
            message.error('Failed to load staff profile');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStaffData();
        if (user?.role === 'SUPER_ADMIN') {
            api.get('/classrooms').then(res => setClassrooms(res.data));
        }
    }, [id]);

    const handleEditSave = async () => {
        try {
            const values = await editForm.validateFields();
            setSaving(true);
            const formData = new FormData();

            Object.keys(values).forEach(key => {
                if (values[key] !== undefined && values[key] !== null) {
                    if (key === 'photo' || key === 'qualificationPdf') {
                        if (values[key].file) formData.append(key, values[key].file.originFileObj);
                    } else if (key === 'joiningDate') {
                        formData.append(key, values[key].format('YYYY-MM-DD'));
                    } else {
                        formData.append(key, values[key]);
                    }
                }
            });

            await api.put(`/staff/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            message.success('Staff updated successfully');
            setIsEditModalVisible(false);
            fetchStaffData();
        } catch (error) {
            message.error('Update failed');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div style={{ textAlign: 'center', marginTop: 100 }}><Spin size="large" /></div>;
    if (!staff) return <div style={{ padding: 40 }}><Text type="danger">Staff not found</Text></div>;

    const classroom = staff.teacherprofile?.classroom;

    return (
        <div style={{ background: '#f5f7fb', minHeight: '100vh', padding: '0 24px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0' }}>
                <Breadcrumb
                    items={[
                        { title: <span style={{ color: '#999' }}>Staff</span> },
                        { title: <span style={{ fontWeight: 600 }}>{staff.employeeId}</span> }
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
                <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/staff')} size="small" style={{ borderRadius: 4 }}>Back</Button>
                <Title level={4} style={{ margin: 0 }}>{staff.fullName}</Title>
                <div style={{ flex: 1 }}></div>
                <Button type="primary" icon={<EditOutlined />} style={{ background: '#7B57E4', borderRadius: 6 }} onClick={() => setIsEditModalVisible(true)}>Edit Profile</Button>
            </div>

            <Row gutter={24}>
                <Col xs={24} md={6}>
                    <Card bordered={false} style={{ borderRadius: 16, textAlign: 'center', height: '100%' }}>
                        <div style={{ padding: '24px 0' }}>
                            <Avatar size={120} src={staff.photoUrl} icon={<UserOutlined />} style={{ background: '#f0f0f0' }} />
                            <Title level={4} style={{ marginTop: 16, marginBottom: 4 }}>{staff.fullName}</Title>
                            <Text type="secondary">{staff.employeeId}</Text>
                            <div style={{ marginTop: 4, color: '#7B57E4', fontWeight: 500 }}>{staff.role === 'TEACHER' ? 'Lead Teacher' : staff.role}</div>
                        </div>
                        <div style={{ textAlign: 'left', marginTop: 24 }}>
                            <Space direction="vertical" style={{ width: '100%' }} size={16}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <MailOutlined style={{ color: '#999' }} />
                                    <span>{staff.email}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <PhoneOutlined style={{ color: '#999' }} />
                                    <span>{staff.phone}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                                    <EnvironmentOutlined style={{ color: '#999', marginTop: 4 }} />
                                    <span>{staff.address || 'N/A'}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <CalendarOutlined style={{ color: '#999' }} />
                                    <span>Joined: {dayjs(staff.joiningDate).format('M/D/YYYY')}</span>
                                </div>
                            </Space>
                        </div>
                        {/* QR Download removed */}
                    </Card>
                </Col>

                <Col xs={24} md={18}>
                    <Card size="small" title={<Text strong>Qualifications</Text>} bordered={false} style={{ borderRadius: 16, marginBottom: 24 }}>
                        <List
                            dataSource={[
                                { title: 'Bachelor of Education', subt: 'University of Colombo', year: '2018' },
                                { title: 'Early Childhood Education Certificate', subt: 'National Institute of Education', year: '2019' }
                            ]}
                            renderItem={item => (
                                <List.Item style={{ display: 'block', padding: '16px 0', borderBottom: '1px solid #f0f0f0' }}>
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                                        <div style={{ marginTop: 4, width: 32, height: 32, background: '#f0eafb', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyCenter: 'center' }}>
                                            <SafetyCertificateOutlined style={{ color: '#7B57E4' }} />
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 600 }}>{item.title}</div>
                                            <Text type="secondary" style={{ fontSize: 13 }}>{item.subt}</Text>
                                            <div style={{ fontSize: 13, color: '#999' }}>{item.year}</div>
                                        </div>
                                    </div>
                                </List.Item>
                            )}
                        />
                    </Card>

                    <Card size="small" title={<Text strong>Assigned Classroom</Text>} bordered={false} style={{ borderRadius: 16 }}>
                        {classroom ? (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
                                <div>
                                    <div style={{ fontWeight: 600 }}>{classroom.name}</div>
                                    <Text type="secondary">{classroom.ageGroup}</Text>
                                    <div style={{ color: '#999', fontSize: 13 }}>{classroom.capacity} students</div>
                                </div>
                                <Button size="small" onClick={() => navigate(`/classrooms/${classroom.id}`)}>View Classroom</Button>
                            </div>
                        ) : (
                            <div style={{ padding: '24px 0', textAlign: 'center' }}><Text type="secondary">Not assigned to any classroom</Text></div>
                        )}
                    </Card>
                </Col>
            </Row>

            <Modal
                title="Edit Staff Profile"
                open={isEditModalVisible}
                onCancel={() => setIsEditModalVisible(false)}
                onOk={handleEditSave}
                confirmLoading={saving}
                width={700}
            >
                <Form form={editForm} layout="vertical" initialValues={{ ...staff, joiningDate: dayjs(staff.joiningDate), qualification: staff.teacherprofile?.qualification, assignedClassroomId: staff.teacherprofile?.assignedClassroomId }}>
                    <Row gutter={16}>
                        <Col span={12}><Form.Item name="fullName" label="Full Name" rules={[{ required: true }]}><Input /></Form.Item></Col>
                        <Col span={12}><Form.Item name="email" label="Email"><Input /></Form.Item></Col>
                        <Col span={12}><Form.Item name="phone" label="Phone" rules={[{ required: true }]}><Input /></Form.Item></Col>
                        <Col span={12}><Form.Item name="joiningDate" label="Joining Date"><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
                        <Col span={12}><Form.Item name="role" label="Role"><Select><Option value="ADMIN">Admin</Option><Option value="TEACHER">Teacher</Option></Select></Form.Item></Col>
                        {staff.role === 'TEACHER' && (
                            <Col span={12}><Form.Item name="assignedClassroomId" label="Classroom"><Select>{classrooms.map(c => <Option key={c.id} value={c.id}>{c.name}</Option>)}</Select></Form.Item></Col>
                        )}
                        <Col span={24}><Form.Item name="qualification" label="Qualification"><Input /></Form.Item></Col>
                        <Col span={12}><Form.Item name="photo" label="Update Photo"><Upload beforeUpload={() => false} maxCount={1}><Button icon={<UploadOutlined />}>Select Image</Button></Upload></Form.Item></Col>
                        <Col span={12}><Form.Item name="qualificationPdf" label="Qualification PDF"><Upload beforeUpload={() => false} maxCount={1} accept=".pdf"><Button icon={<UploadOutlined />}>Select PDF</Button></Upload></Form.Item></Col>
                    </Row>
                </Form>
            </Modal>
        </div>
    );
};

export default StaffProfile;
