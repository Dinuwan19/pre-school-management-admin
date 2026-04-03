import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Typography, Row, Col, Avatar, Button, Tag, Spin, message, Divider, Space, List, Modal, Form, Input, Select, DatePicker, Upload, Breadcrumb, Descriptions, theme } from 'antd';
import {
    UserOutlined, ArrowLeftOutlined, EditOutlined, MailOutlined,
    PhoneOutlined, EnvironmentOutlined, DownloadOutlined,
    SafetyCertificateOutlined, HomeOutlined, EyeOutlined, UploadOutlined, FilePdfOutlined, CalendarOutlined, BulbOutlined, DeleteOutlined
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

    const {
        token: { colorBgContainer, colorBgLayout, colorPrimary, colorTextSecondary, colorBorder, colorPrimaryBg },
    } = theme.useToken();

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
                    if (key === 'qualifications') {
                        // Skip qualifications as we handle it explicitly below
                        return;
                    }

                    if (key === 'qualificationPdf') {
                        const fileObj = values[key]?.file || values[key]?.fileList?.[0] || (values[key] instanceof File ? values[key] : null);
                        if (fileObj && (fileObj.originFileObj || fileObj instanceof File)) {
                            formData.append(key, fileObj.originFileObj || fileObj);
                        }
                    } else if (key === 'joiningDate') {
                        formData.append(key, values[key].format('YYYY-MM-DD'));
                    } else if (key === 'classroomIds' && Array.isArray(values[key])) {
                        // Append each ID individually or as a JSON string - usually individual is safer for multer
                        values[key].forEach(id => formData.append('classroomIds', id));
                    } else {
                        formData.append(key, values[key]);
                    }
                }
            });

            if (values.qualifications) {
                // Ensure the items are mapped to strings or simple objects if they came from the Form.List
                const cleanQualifications = values.qualifications.map(q => typeof q === 'string' ? q : (q.title || ''));
                formData.append('qualifications', JSON.stringify(cleanQualifications));
            }

            await api.put(`/staff/${id}`, formData);
            message.success('Staff updated successfully');
            setIsEditModalVisible(false);
            fetchStaffData();
        } catch (error) {
            const errorMsg = error.response?.data?.message || error.message || 'Update failed';
            message.error(errorMsg);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div style={{ textAlign: 'center', marginTop: 100 }}><Spin size="large" /></div>;
    if (!staff) return <div style={{ padding: 40 }}><Text type="danger">Staff not found</Text></div>;

    const assignedClassrooms = staff.teacherprofile?.classrooms || [];

    return (
        <div style={{ background: colorBgLayout, minHeight: '100vh', padding: '0 24px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0' }}>
                <div style={{ flex: 1 }}></div>
                <Space></Space>
            </div>

            <div style={{ display: 'flex', gap: 16, marginBottom: 16, alignItems: 'center' }}>
                <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/staff')} size="small" style={{ borderRadius: 4 }}>Back</Button>
                <Title level={4} style={{ margin: 0 }}>{staff.fullName}</Title>
                <div style={{ flex: 1 }}></div>
                {user?.role === 'SUPER_ADMIN' && (
                    <Button type="primary" icon={<EditOutlined />} style={{ background: colorPrimary, borderRadius: 6 }} onClick={() => setIsEditModalVisible(true)}>Edit Profile</Button>
                )}
            </div>

            <Row gutter={24}>
                <Col xs={24} md={6}>
                    <Card bordered={false} style={{ borderRadius: 16, textAlign: 'center', height: '100%' }}>
                        <div style={{ padding: '24px 0' }}>
                            <Avatar size={120} src={staff.photoUrl} icon={<UserOutlined />} style={{ background: colorBgLayout }} />
                            <Title level={4} style={{ marginTop: 16, marginBottom: 4 }}>{staff.fullName}</Title>
                            <Text type="secondary">{staff.employeeId}</Text>
                            <div style={{ marginTop: 4, color: colorPrimary, fontWeight: 500 }}>
                                {staff.role === 'TEACHER' ? (staff.teacherprofile?.designation === 'LEAD' ? 'Lead Teacher' : 'Assistant Teacher') : staff.role}
                            </div>
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
                                    <SafetyCertificateOutlined style={{ color: '#999' }} />
                                    <span>NIC: {staff.nationalId || 'N/A'}</span>
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
                        {staff.teacherprofile?.qualifications && staff.teacherprofile.qualifications.length > 0 ? (
                            <List
                                dataSource={staff.teacherprofile.qualifications}
                                renderItem={item => (
                                    <List.Item style={{ border: 'none', padding: '8px 0' }}>
                                        <Space align="start">
                                            <div style={{ width: 32, height: 32, background: colorPrimaryBg, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <SafetyCertificateOutlined style={{ color: colorPrimary }} />
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 600 }}>{item.title}</div>
                                                <Text type="secondary" style={{ fontSize: 12 }}>Verified Qualification</Text>
                                            </div>
                                        </Space>
                                    </List.Item>
                                )}
                            />
                        ) : staff.teacherprofile?.qualification ? (
                            <div style={{ padding: '16px 0' }}>
                                <Space align="start">
                                    <div style={{ width: 32, height: 32, background: colorPrimaryBg, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <SafetyCertificateOutlined style={{ color: colorPrimary }} />
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 600 }}>Staff Qualifications</div>
                                        <Text type="secondary">{staff.teacherprofile.qualification}</Text>
                                    </div>
                                </Space>
                            </div>
                        ) : (
                            <div style={{ padding: '24px 0', textAlign: 'center' }}><Text type="secondary">No qualifications listed</Text></div>
                        )}
                        {staff.teacherprofile?.qualificationPdf && (
                            <div style={{ marginTop: 16 }}>
                                <Button icon={<FilePdfOutlined />} size="small" onClick={() => window.open(`${api.defaults.baseURL.replace('/api', '')}/${staff.teacherprofile.qualificationPdf.replace(/^\//, '')}`, '_blank')}>
                                    View Secondary Certificate PDF
                                </Button>
                            </div>
                        )}
                    </Card>

                    <Card size="small" title={<Text strong>Assigned Classrooms</Text>} bordered={false} style={{ borderRadius: 16 }}>
                        {assignedClassrooms.length > 0 ? (
                            assignedClassrooms.map(classroom => (
                                <div key={classroom.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${colorBorder}` }}>
                                    <div>
                                        <div style={{ fontWeight: 600 }}>{classroom.name}</div>
                                        <Text type="secondary">{classroom.ageGroup}</Text>
                                        <div style={{ color: '#999', fontSize: 13 }}>{classroom.capacity} students</div>
                                    </div>
                                    <Button size="small" onClick={() => navigate(`/classrooms/${classroom.id}`)}>View</Button>
                                </div>
                            ))
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
                <Form form={editForm} layout="vertical" initialValues={{
                    ...staff,
                    joiningDate: dayjs(staff.joiningDate),
                    qualification: staff.teacherprofile?.qualification,
                    qualifications: staff.teacherprofile?.qualifications?.map(q => ({ title: q.title })) || [],
                    classroomIds: staff.teacherprofile?.classrooms?.map(c => c.id) || [],
                    designation: staff.teacherprofile?.designation || 'ASSISTANT'
                }}>
                    <Row gutter={16}>
                        <Col span={12}><Form.Item name="fullName" label="Full Name" rules={[{ required: true }]}><Input /></Form.Item></Col>
                        <Col span={12}>
                            <Form.Item
                                name="email"
                                label="Email Address"
                                rules={[
                                    { required: true, message: 'Email is required' },
                                    { type: 'email', message: 'Invalid format' },
                                    {
                                        validator: (_, value) => {
                                            if (!value) return Promise.resolve();
                                            const allowedDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'icloud.com'];
                                            const domain = value.split('@')[1];
                                            if (domain && !allowedDomains.includes(domain.toLowerCase())) {
                                                return Promise.reject(new Error('Providers: Gmail, Yahoo, Outlook, iCloud'));
                                            }
                                            return Promise.resolve();
                                        }
                                    }
                                ]}
                            >
                                <Input />
                            </Form.Item>
                        </Col>
                        <Col span={12}><Form.Item name="phone" label="Phone" rules={[{ required: true }]}><Input /></Form.Item></Col>
                        <Col span={12}>
                            <Form.Item
                                name="nationalId"
                                label="National ID (NIC)"
                                rules={[
                                    { required: true, message: 'NIC is mandatory' },
                                    {
                                        validator: (_, value) => {
                                            if (!value) return Promise.resolve();
                                            const val = value.toUpperCase();
                                            const isOld = /^[0-9]{9}[V|X]$/.test(val);
                                            const isNew = /^[0-9]{12}$/.test(val);
                                            if (!isOld && !isNew) {
                                                return Promise.reject(new Error('Format: 9 digits + V/X OR 12 digits'));
                                            }
                                            if (isNew && !(val.startsWith('19') || val.startsWith('20'))) {
                                                return Promise.reject(new Error('12-digit NIC must start with 19 or 20'));
                                            }
                                            return Promise.resolve();
                                        }
                                    }
                                ]}
                            >
                                <Input />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="joiningDate" label="Joining Date" rules={[{ required: true }]}>
                                <DatePicker
                                    style={{ width: '100%' }}
                                    disabledDate={(current) => {
                                        return current && (current > dayjs().endOf('day') || current < dayjs().subtract(1, 'month').startOf('day'));
                                    }}
                                />
                            </Form.Item>
                        </Col>
                        <Col span={12}><Form.Item name="role" label="Role"><Select><Option value="ADMIN">Admin</Option><Option value="TEACHER">Teacher</Option></Select></Form.Item></Col>
                        {staff.role === 'TEACHER' && (
                            <Col span={24}>
                                <div style={{ marginBottom: 8, fontWeight: 500 }}>Teacher Qualifications</div>
                                <Form.List name="qualifications">
                                    {(fields, { add, remove }) => (
                                        <>
                                            {fields.map(({ key, name, ...restField }) => (
                                                <Row gutter={8} key={key} style={{ marginBottom: 8 }} align="middle">
                                                    <Col flex="auto">
                                                        <Form.Item
                                                            {...restField}
                                                            name={[name, 'title']}
                                                            noStyle
                                                            rules={[{ required: true, message: 'Missing qualification title' }]}
                                                        >
                                                            <Input placeholder="Qualification Title (e.g. Diploma in Montessori)" />
                                                        </Form.Item>
                                                    </Col>
                                                    <Col flex="40px">
                                                        <Button type="text" danger onClick={() => remove(name)} icon={<DeleteOutlined />} />
                                                    </Col>
                                                </Row>
                                            ))}
                                            <Form.Item>
                                                <Button type="dashed" onClick={() => add()} block icon={<UploadOutlined />}>
                                                    Add Qualification
                                                </Button>
                                            </Form.Item>
                                        </>
                                    )}
                                </Form.List>
                            </Col>
                        )}
                        <Col span={24}><Form.Item name="qualification" label="Note (Legacy Qualification Field)"><Input.TextArea placeholder="Enter degrees, certificates, etc." rows={1} /></Form.Item></Col>
                        <Col span={24}>
                            <Form.Item name="qualificationPdf" label="Qualification PDF">
                                <Upload beforeUpload={() => false} maxCount={1} accept=".pdf">
                                    <Button icon={<UploadOutlined />}>Select PDF</Button>
                                </Upload>
                                {staff.teacherprofile?.qualificationPdf && (
                                    <div style={{ fontSize: 10, color: '#999', marginTop: 4 }}>
                                        Current: {staff.teacherprofile.qualificationPdf.split('/').pop()}
                                    </div>
                                )}
                            </Form.Item>
                        </Col>
                    </Row>
                </Form>
            </Modal>
        </div>
    );
};

export default StaffProfile;
