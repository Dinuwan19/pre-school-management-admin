import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Typography, Row, Col, Avatar, Button, Tabs, Progress, List, Tag, Spin, message, Form, Slider, Divider, Statistic, Alert, Modal, Input, Select, DatePicker, Upload, Descriptions, Breadcrumb, Space, Empty } from 'antd';
import {
    UserOutlined, ArrowLeftOutlined, EditOutlined, PhoneOutlined,
    EnvironmentOutlined, CalendarOutlined, SafetyCertificateOutlined,
    DownloadOutlined, SaveOutlined, CloseOutlined, TeamOutlined, HeartOutlined, UploadOutlined, FilePdfOutlined,
    CheckCircleOutlined, InfoCircleOutlined, BookOutlined, BulbOutlined, MedicineBoxOutlined, HomeOutlined, StarOutlined
} from '@ant-design/icons';
import api from '../../api/client';
import dayjs from 'dayjs';
import { useAuth } from '../../context/AuthContext';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

const StudentProfile = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [student, setStudent] = useState(null);
    const [attendanceSummary, setAttendanceSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isEditingProgress, setIsEditingProgress] = useState(false);
    const [progressForm] = Form.useForm();
    const [editForm] = Form.useForm();
    const [submittingProgress, setSubmittingProgress] = useState(false);
    const [isEditModalVisible, setIsEditModalVisible] = useState(false);
    const [parents, setParents] = useState([]);
    const [classrooms, setClassrooms] = useState([]);
    const [saving, setSaving] = useState(false);
    const [markingAttendance, setMarkingAttendance] = useState(false);

    const calculateAge = (dob) => {
        if (!dob) return 'N/A';
        const birth = dayjs(dob);
        const now = dayjs();
        const years = now.diff(birth, 'year');
        const months = now.diff(birth.add(years, 'year'), 'month');
        if (years === 0) return `${months}m`;
        return `${years}y`;
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const studentRes = await api.get(`/students/${id}`);
            const sData = studentRes.data;
            setStudent(sData);

            // Fetch secondary data
            if (user?.role !== 'TEACHER' && user?.role !== 'PARENT') {
                const [pRes, cRes] = await Promise.all([
                    api.get('/parents').catch(() => ({ data: [] })),
                    api.get('/classrooms').catch(() => ({ data: [] }))
                ]);
                setParents(pRes.data);
                setClassrooms(cRes.data);
            }

            // Attendance
            const attendanceRes = await api.get(`/attendance/student/${id}`).catch(() => ({ data: { attendanceRate: 0, presentDays: 0, totalDays: 0, history: [] } }));
            setAttendanceSummary(attendanceRes.data);

        } catch (error) {
            console.error('Error fetching student data:', error);
            message.error('Failed to load student profile');
            setStudent(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [id]);

    useEffect(() => {
        if (student && !loading) {
            const p = student.studentprogress?.[0] || {};
            progressForm.setFieldsValue({
                reading: p.reading || 0,
                writing: p.writing || 0,
                speaking: p.speaking || 0,
                listening: p.listening || 0,
                mathematics: p.mathematics || 0,
                social: p.social || 0,
                remarks: p.remarks || ''
            });
        }
    }, [student, loading, progressForm]);

    const handleEditSave = async () => {
        try {
            const values = await editForm.validateFields();
            setSaving(true);

            const formData = new FormData();
            Object.keys(values).forEach(key => {
                if (values[key] !== undefined && values[key] !== null) {
                    if (key === 'dob' || key === 'enrollmentDate') {
                        formData.append(key, values[key].format('YYYY-MM-DD'));
                    } else if (key === 'photo' || key === 'birthCert') {
                        if (values[key]?.file) {
                            formData.append(key, values[key].file.originFileObj);
                        }
                    } else {
                        formData.append(key, values[key]);
                    }
                }
            });

            await api.put(`/students/${id}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            message.success('Student updated successfully');
            setIsEditModalVisible(false);
            fetchData();
        } catch (error) {
            message.error(error.response?.data?.message || 'Update failed');
        } finally {
            setSaving(false);
        }
    };

    const handleSaveProgress = async () => {
        try {
            const values = await progressForm.validateFields();
            setSubmittingProgress(true);
            await api.put(`/students/${id}/progress`, values);
            message.success('Progress updated');
            setIsEditingProgress(false);
            fetchData();
        } catch (error) {
            message.error('Progress update failed');
        } finally {
            setSubmittingProgress(false);
        }
    };

    const handleMarkAttendance = async () => {
        setMarkingAttendance(true);
        try {
            await api.post('/attendance/mark', {
                studentId: parseInt(id),
                attendanceDate: dayjs().format('YYYY-MM-DD'),
                type: 'CHECK_IN'
            });
            message.success('Attendance marked successfully');
            fetchData();
        } catch (error) {
            message.error(error.response?.data?.message || 'Failed to mark attendance');
        } finally {
            setMarkingAttendance(false);
        }
    };

    if (loading) return <div style={{ textAlign: 'center', marginTop: 100 }}><Spin size="large" /></div>;
    if (!student) return <div style={{ padding: 40 }}><Alert message="Student not found" type="error" showIcon action={<Button onClick={() => navigate('/students')}>Back to Students</Button>} /></div>;

    const currentProgress = student.studentprogress?.[0] || {};

    const renderProgressBar = (label, value, color, fieldName) => (
        <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text strong>{label}</Text>
                <Text type="secondary">{value || 0}%</Text>
            </div>
            {isEditingProgress ? (
                <Form.Item name={fieldName} noStyle>
                    <Slider marks={{ 0: '0', 50: '50', 100: '100' }} />
                </Form.Item>
            ) : (
                <Progress percent={value || 0} showInfo={false} strokeColor={color} strokeWidth={8} style={{ margin: 0 }} />
            )}
        </div>
    );

    const tabItems = [
        {
            key: 'profile',
            label: <span><UserOutlined />Profile</span>,
            children: (
                <div style={{ paddingTop: 16 }}>
                    <Card size="small" title={<Text strong>Personal Information</Text>} bordered={false} style={{ marginBottom: 16, background: '#fff' }}>
                        <Row gutter={[16, 24]}>
                            <Col span={12}>
                                <Text type="secondary" style={{ fontSize: 12 }}>Full Name</Text>
                                <div style={{ fontWeight: 500 }}>{student.fullName}</div>
                            </Col>
                            <Col span={12}>
                                <Text type="secondary" style={{ fontSize: 12 }}>Student ID</Text>
                                <div style={{ fontWeight: 500 }}>{student.studentUniqueId}</div>
                            </Col>
                            <Col span={12}>
                                <Text type="secondary" style={{ fontSize: 12 }}>Date of Birth</Text>
                                <div style={{ fontWeight: 500 }}>{student.dateOfBirth ? dayjs(student.dateOfBirth).format('M/D/YYYY') : 'N/A'}</div>
                            </Col>
                            <Col span={12}>
                                <Text type="secondary" style={{ fontSize: 12 }}>Age</Text>
                                <div style={{ fontWeight: 500 }}>{calculateAge(student.dateOfBirth)}</div>
                            </Col>
                            <Col span={12}>
                                <Text type="secondary" style={{ fontSize: 12 }}>Gender</Text>
                                <div style={{ fontWeight: 500 }}>{student.gender || 'N/A'}</div>
                            </Col>
                            <Col span={12}>
                                <Text type="secondary" style={{ fontSize: 12 }}>Enrollment Date</Text>
                                <div style={{ fontWeight: 500 }}>{student.enrollmentDate ? dayjs(student.enrollmentDate).format('M/D/YYYY') : 'N/A'}</div>
                            </Col>
                            <Col span={24}>
                                <Text type="secondary" style={{ fontSize: 12 }}>Address</Text>
                                <div style={{ fontWeight: 500 }}>{student.address || 'N/A'}</div>
                            </Col>
                        </Row>
                        <Button block style={{ marginTop: 24, borderRadius: 8 }} icon={<DownloadOutlined />}>Birth Certificate & Vaccine Card</Button>
                    </Card>

                    <Card size="small" title={<Text strong>Contact Information</Text>} bordered={false} style={{ marginBottom: 16, background: '#fff' }}>
                        <Descriptions column={1} size="small">
                            <Descriptions.Item label="Primary Contact">{student.parent_student_parentIdToparent?.phone || 'N/A'}</Descriptions.Item>
                            <Descriptions.Item label={<span style={{ color: '#ff4d4f', fontWeight: 'bold' }}>Emergency Contact</span>}>
                                <div style={{
                                    border: '1px solid #ff4d4f',
                                    background: '#fff1f0',
                                    padding: '4px 8px',
                                    borderRadius: 4,
                                    color: '#cf1322',
                                    fontWeight: 600,
                                    display: 'inline-block'
                                }}>
                                    {student.emergencyContact || 'N/A'}
                                </div>
                            </Descriptions.Item>
                        </Descriptions>
                        <Divider style={{ margin: '12px 0' }} />
                        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>Parent/Guardian</Text>
                        <List
                            dataSource={[student.parent_student_parentIdToparent, student.parent_student_secondParentIdToparent].filter(Boolean)}
                            renderItem={(p, idx) => (
                                <List.Item style={{ padding: '8px 0', border: 0 }}>
                                    <Space size={12}>
                                        <Avatar src={p.photoUrl}>{p.fullName[0]}</Avatar>
                                        <div>
                                            <div style={{ fontWeight: 500 }}>{p.fullName}</div>
                                            <Text type="secondary" style={{ fontSize: 12 }}>{idx === 0 ? 'father' : 'mother'}</Text>
                                        </div>
                                    </Space>
                                </List.Item>
                            )}
                        />
                        <Divider style={{ margin: '12px 0' }} />
                        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>Classroom</Text>
                        <Tag color="purple" style={{ borderRadius: 12, padding: '2px 12px' }}>{student.classroom?.name || 'No Classroom'}</Tag>
                    </Card>

                    <Card size="small" title={<Text strong>Medical Information</Text>} bordered={false} style={{ marginBottom: 16, background: '#fff' }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>Medical Notes</Text>
                        <div style={{ marginTop: 4 }}>{student.medicalInfo || 'No allergies'}</div>
                    </Card>

                    <Card size="small" title={<Text strong>Additional Notes</Text>} bordered={false} style={{ background: '#fff' }}>
                        <div style={{ marginTop: 4 }}>{student.additionalNotes || 'Enjoys group activities'}</div>
                    </Card>
                </div>
            )
        },
        {
            key: 'progress',
            label: <span><BookOutlined />Progress</span>,
            children: (
                <div style={{ paddingTop: 16 }}>
                    <Card size="small" title={<Text strong>Skills Development</Text>} bordered={false} style={{ marginBottom: 24 }}>
                        <Form form={progressForm}>
                            <Row gutter={[48, 0]}>
                                <Col span={12}>
                                    {renderProgressBar('Reading', currentProgress.reading, '#7B57E4', 'reading')}
                                    {renderProgressBar('Writing', currentProgress.writing, '#1890FF', 'writing')}
                                    {renderProgressBar('Listening', currentProgress.listening, '#52C41A', 'listening')}
                                </Col>
                                <Col span={12}>
                                    {renderProgressBar('Speaking', currentProgress.speaking, '#FAAD14', 'speaking')}
                                    {renderProgressBar('Math', currentProgress.mathematics, '#FF4D4F', 'mathematics')}
                                    {renderProgressBar('Social', currentProgress.social, '#722ED1', 'social')}
                                </Col>
                            </Row>
                        </Form>
                        {isEditingProgress ? (
                            <Form.Item name="remarks" label="Teacher Note">
                                <Input.TextArea rows={4} placeholder="Add a note about the student's progress..." />
                            </Form.Item>
                        ) : (
                            <div>
                                <Text strong style={{ display: 'block', marginBottom: 8 }}>Teacher Note</Text>
                                <div style={{ background: '#f0f2f5', padding: 12, borderRadius: 6, minHeight: 60 }}>
                                    {currentProgress.remarks || <Text type="secondary">No notes added.</Text>}
                                </div>
                            </div>
                        )}
                        {user?.role !== 'PARENT' && (
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                                {!isEditingProgress ?
                                    <Button type="primary" size="small" ghost icon={<EditOutlined />} onClick={() => setIsEditingProgress(true)}>Edit Notes & Progress</Button> :
                                    <Space>
                                        <Button size="small" onClick={() => setIsEditingProgress(false)}>Cancel</Button>
                                        <Button size="small" type="primary" onClick={handleSaveProgress} loading={submittingProgress}>Save</Button>
                                    </Space>
                                }
                            </div>
                        )}
                    </Card>
                </div>
            )
        },
        {
            key: 'attendance',
            label: <span><CalendarOutlined />Attendance</span>,
            children: (
                <div style={{ paddingTop: 16 }}>
                    <Card size="small" title={<Text strong>Attendance Records</Text>} bordered={false}>
                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
                            {attendanceSummary?.history?.slice(0, 10).map((item, i) => (
                                <div key={i} style={{
                                    width: 70,
                                    height: 70,
                                    background: item.status === 'PRESENT' ? '#F6FFED' : '#FFF1F0',
                                    border: `1px solid ${item.status === 'PRESENT' ? '#B7EB8F' : '#FFCCC7'}`,
                                    borderRadius: 6,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: 10
                                }}>
                                    <div style={{ color: '#999' }}>{dayjs(item.attendanceDate).format('M/D/YYYY')}</div>
                                    <div style={{ fontWeight: 600, color: item.status === 'PRESENT' ? '#52C41A' : '#F5222D', marginTop: 2 }}>
                                        {item.status === 'PRESENT' ? 'Present' : 'Absent'}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <Button
                                type="primary"
                                ghost
                                style={{ borderRadius: 6, padding: '4px 24px', height: 40 }}
                                onClick={handleMarkAttendance}
                                loading={markingAttendance}
                            >
                                Mark Today's Attendance
                            </Button>
                        </div>
                    </Card>
                </div>
            )
        }
    ];

    return (
        <div style={{ background: '#f5f7fb', minHeight: '100vh', padding: '0 24px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0' }}>
                <Breadcrumb
                    items={[
                        { title: <span style={{ color: '#999' }}>Students</span> },
                        { title: <span style={{ fontWeight: 600 }}>{student.studentUniqueId}</span> }
                    ]}
                />
                <Space>
                    {/* Admin logo removed */}
                </Space>
            </div>

            <div style={{ display: 'flex', gap: 16, marginBottom: 16, alignItems: 'center' }}>
                <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/students')} size="small" style={{ borderRadius: 4 }}>Back</Button>
                <Title level={4} style={{ margin: 0 }}>{student.fullName}</Title>
                <div style={{ flex: 1 }}></div>
                <Button type="primary" icon={<EditOutlined />} style={{ background: '#7B57E4', borderRadius: 6 }} onClick={() => setIsEditModalVisible(true)}>Edit Profile</Button>
            </div>

            <Row gutter={24}>
                <Col xs={24} md={6}>
                    <Card bordered={false} style={{ borderRadius: 16, textAlign: 'center', height: '100%' }}>
                        <div style={{ padding: '24px 0' }}>
                            <Avatar size={120} src={student.photoUrl} icon={<UserOutlined />} style={{ background: '#f0f0f0' }} />
                            <Title level={4} style={{ marginTop: 16, marginBottom: 4 }}>{student.fullName}</Title>
                            <Text type="secondary">{student.studentUniqueId}</Text>
                        </div>
                        <div style={{ textAlign: 'left', marginTop: 24 }}>
                            <Space direction="vertical" style={{ width: '100%' }} size={16}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <CalendarOutlined style={{ color: '#999' }} />
                                    <span>{student.dateOfBirth ? dayjs(student.dateOfBirth).format('M/D/YYYY') : 'N/A'}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <InfoCircleOutlined style={{ color: '#999' }} />
                                    <span>{calculateAge(student.dateOfBirth)}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <PhoneOutlined style={{ color: '#999' }} />
                                    <span>{student.parent_student_parentIdToparent?.phone || 'N/A'}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                                    <EnvironmentOutlined style={{ color: '#999', marginTop: 4 }} />
                                    <span>{student.address || 'N/A'}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <HomeOutlined style={{ color: '#999' }} />
                                    <span>{student.classroom?.name || 'No Classroom'}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <MedicineBoxOutlined style={{ color: '#999' }} />
                                    <span>{student.medicalInfo || 'No allergies'}</span>
                                </div>
                            </Space>
                        </div>
                        <Button block style={{ marginTop: 40, borderRadius: 8, height: 40 }} icon={<DownloadOutlined />} onClick={() => {
                            if (student.qrCode) {
                                const link = document.createElement('a');
                                link.href = student.qrCode;
                                link.download = `${student.fullName}_QR.png`;
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                            } else {
                                message.error('No QR code available');
                            }
                        }}>Download QR Code</Button>
                    </Card>
                </Col>

                <Col xs={24} md={18}>
                    <Card bordered={false} style={{ borderRadius: 16, minHeight: '600px' }} bodyStyle={{ padding: '0 24px' }}>
                        <Tabs defaultActiveKey="profile" items={tabItems} size="large" />
                    </Card>
                </Col>
            </Row >

            <Modal
                title="Edit Student Info"
                open={isEditModalVisible}
                onCancel={() => setIsEditModalVisible(false)}
                onOk={handleEditSave}
                confirmLoading={saving}
                width={700}
            >
                <Form
                    form={editForm}
                    layout="vertical"
                    initialValues={{
                        ...student,
                        dob: student.dateOfBirth ? dayjs(student.dateOfBirth) : null,
                        enrollmentDate: student.enrollmentDate ? dayjs(student.enrollmentDate) : dayjs()
                    }}
                >
                    <Row gutter={16}>
                        <Col span={12}><Form.Item name="fullName" label="Full Name" rules={[{ required: true }]}><Input /></Form.Item></Col>
                        <Col span={12}><Form.Item name="gender" label="Gender"><Select><Option value="MALE">Male</Option><Option value="FEMALE">Female</Option></Select></Form.Item></Col>
                        <Col span={12}><Form.Item name="dob" label="Date of Birth"><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
                        <Col span={12}><Form.Item name="classroomId" label="Classroom"><Select>{classrooms.map(c => <Option key={c.id} value={c.id}>{c.name}</Option>)}</Select></Form.Item></Col>
                        <Col span={12}><Form.Item name="parentId" label="Primary Parent"><Select>{parents.map(p => <Option key={p.id} value={p.id}>{p.fullName}</Option>)}</Select></Form.Item></Col>
                        <Col span={12}><Form.Item name="secondParentId" label="Secondary Parent"><Select allowClear>{parents.map(p => <Option key={p.id} value={p.id}>{p.fullName}</Option>)}</Select></Form.Item></Col>
                        <Col span={12}><Form.Item name="photo" label="Update Photo"><Upload beforeUpload={() => false} maxCount={1}><Button icon={<UploadOutlined />}>Select Image</Button></Upload></Form.Item></Col>
                        <Col span={12}><Form.Item name="birthCert" label="Update Birth Certificate (PDF)"><Upload beforeUpload={() => false} maxCount={1} accept=".pdf"><Button icon={<UploadOutlined />}>Select PDF</Button></Upload></Form.Item></Col>
                    </Row>
                </Form>
            </Modal>
        </div >
    );
};

export default StudentProfile;
