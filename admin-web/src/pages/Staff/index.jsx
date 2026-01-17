import React, { useState, useEffect } from 'react';
import {
    Card, Table, Button, Typography, Row, Col, Input, Tag,
    Avatar, Space, Modal, Form, Select, DatePicker, Upload,
    message, Descriptions, Divider
} from 'antd';
import {
    PlusOutlined, SearchOutlined, UserOutlined,
    TeamOutlined, MailOutlined, PhoneOutlined,
    EnvironmentOutlined, IdcardOutlined, CopyOutlined,
    ArrowLeftOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;

const Staff = () => {
    const [staffList, setStaffList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [view, setView] = useState('list'); // 'list' or 'add'
    const [searchText, setSearchText] = useState('');
    const [classrooms, setClassrooms] = useState([]);
    const [form] = Form.useForm();
    const navigate = useNavigate();
    const [credentialsModal, setCredentialsModal] = useState({ visible: false, data: null, staffName: '' });

    const fetchStaff = async () => {
        setLoading(true);
        try {
            const res = await api.get('/staff');
            setStaffList(res.data);
        } catch (error) {
            message.error(error.errorMessage || 'Failed to fetch staff');
        } finally {
            setLoading(false);
        }
    };

    const fetchClassrooms = async () => {
        try {
            const res = await api.get('/classrooms');
            setClassrooms(res.data);
        } catch (error) { }
    };

    useEffect(() => {
        fetchStaff();
        fetchClassrooms();
    }, []);

    const handleAddStaff = async () => {
        try {
            const values = await form.validateFields();
            setLoading(true);
            const res = await api.post('/staff', values);
            message.success('Staff member added successfully');
            setCredentialsModal({
                visible: true,
                data: res.data.credentials,
                staffName: values.fullName
            });
            setView('list');
            form.resetFields();
            fetchStaff();
        } catch (error) {
            message.error(error.response?.data?.message || 'Failed to add staff');
        } finally {
            setLoading(false);
        }
    };

    const downloadCredentials = (data) => {
        const content = `
Malkakulu Future Mind - Staff Account Credentials
------------------------------------------------
Full Name: ${credentialsModal.staffName}
Username: ${data.username}
Temporary Password: ${data.tempPassword}

Instructions:
1. Go to the login page.
2. Enter the username and temporary password provided above.
3. You will be prompted to set a new password on your first login.
------------------------------------------------
        `;
        const element = document.createElement("a");
        const file = new Blob([content], { type: 'text/plain' });
        element.href = URL.createObjectURL(file);
        element.download = `credentials_${data.username}.txt`;
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        message.success('Copied to clipboard');
    };

    const columns = [
        {
            title: 'Staff Member',
            key: 'member',
            render: (_, record) => (
                <Space>
                    <Avatar src={record.photoUrl} icon={<UserOutlined />} style={{ background: '#F0EAFB', color: '#7B57E4' }} />
                    <Text strong>{record.fullName}</Text>
                </Space>
            )
        },
        {
            title: 'ID',
            dataIndex: 'employeeId',
            key: 'id',
            render: (id) => <Tag color="blue">{id || 'N/A'}</Tag>
        },
        {
            title: 'Role',
            dataIndex: 'role',
            key: 'role',
            render: (role) => (
                <Tag color={role === 'ADMIN' ? 'purple' : 'cyan'}>
                    {role === 'ADMIN' ? 'Administrative Staff' : 'Teacher'}
                </Tag>
            )
        },
        {
            title: 'Classroom',
            key: 'classroom',
            render: (_, record) => (
                record.role === 'TEACHER' ?
                    <Text>{record.teacherProfile?.classroom?.name || 'Not assigned'}</Text> :
                    <Text type="secondary">-</Text>
            )
        },
        {
            title: 'Contact',
            key: 'contact',
            render: (_, record) => (
                <div style={{ fontSize: 13 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <PhoneOutlined style={{ color: '#888' }} /> {record.phone || 'N/A'}
                    </div>
                </div>
            )
        },
        {
            title: 'Action',
            key: 'action',
            render: (_, record) => <Button type="link" onClick={() => navigate(`/staff/${record.id}`)}>View</Button>
        }
    ];

    const filteredStaff = staffList.filter(s =>
        s.fullName.toLowerCase().includes(searchText.toLowerCase()) ||
        s.employeeId?.toLowerCase().includes(searchText.toLowerCase())
    );

    if (view === 'add') {
        return (
            <div style={{ paddingBottom: 40 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
                    <Button icon={<ArrowLeftOutlined />} onClick={() => setView('list')} style={{ border: 0, background: 'transparent' }} />
                    <Title level={3} style={{ margin: 0 }}>Add New Staff</Title>
                </div>

                <Card bordered={false} style={{ borderRadius: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
                    <Form form={form} layout="vertical" onFinish={handleAddStaff} initialValues={{ role: 'TEACHER', joiningDate: dayjs() }}>
                        <Divider orientation="left">Personal Information</Divider>
                        <Row gutter={24}>
                            <Col xs={24} md={12}>
                                <Form.Item name="fullName" label="Full Name" rules={[{ required: true }]}>
                                    <Input placeholder="Enter full name" />
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={12}>
                                <Form.Item name="role" label="Role" rules={[{ required: true }]}>
                                    <Select placeholder="Select role">
                                        <Option value="ADMIN">Administrative Staff</Option>
                                        <Option value="TEACHER">Teacher</Option>
                                    </Select>
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={12}>
                                <Form.Item name="email" label="Email Address">
                                    <Input prefix={<MailOutlined />} placeholder="email@example.com" />
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={12}>
                                <Form.Item name="phone" label="Phone Number" rules={[{ required: true }]}>
                                    <Input prefix={<PhoneOutlined />} placeholder="(+94) 77 1234567" />
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={24}>
                                <Form.Item name="address" label="Home Address">
                                    <Input.TextArea rows={2} placeholder="Enter permanent address" />
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={8}>
                                <Form.Item name="nationalId" label="National ID (NIC)">
                                    <Input prefix={<IdcardOutlined />} placeholder="NIC Number" />
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={8}>
                                <Form.Item name="joiningDate" label="Joining Date">
                                    <DatePicker style={{ width: '100%' }} />
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={8}>
                                <Form.Item name="photoUrl" label="Photo URL">
                                    <Input placeholder="Paste image link" />
                                </Form.Item>
                            </Col>
                        </Row>

                        <Form.Item noStyle shouldUpdate={(prev, curr) => prev.role !== curr.role}>
                            {({ getFieldValue }) => getFieldValue('role') === 'TEACHER' && (
                                <>
                                    <Divider orientation="left">Teacher Details</Divider>
                                    <Row gutter={24}>
                                        <Col xs={24} md={12}>
                                            <Form.Item name="classroomId" label="Assigned Classroom">
                                                <Select placeholder="Select a classroom">
                                                    {classrooms.map(c => <Option key={c.id} value={c.id}>{c.name}</Option>)}
                                                </Select>
                                            </Form.Item>
                                        </Col>
                                        <Col xs={24} md={12}>
                                            <Form.Item name="qualification" label="Qualifications">
                                                <Input placeholder="e.g. B.Ed in Early Childhood Education" />
                                            </Form.Item>
                                        </Col>
                                    </Row>
                                </>
                            )}
                        </Form.Item>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
                            <Button onClick={() => setView('list')}>Cancel</Button>
                            <Button type="primary" htmlType="submit" loading={loading} style={{ background: '#7B57E4' }}>Add Staff Member</Button>
                        </div>
                    </Form>
                </Card>
            </div>
        );
    }

    return (
        <div style={{ paddingBottom: 40 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
                <div>
                    <Title level={3} style={{ margin: 0 }}>Staff & Teachers</Title>
                    <Text type="secondary">Manage your school team and assignments</Text>
                </div>
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    size="large"
                    onClick={() => setView('add')}
                    style={{ background: '#7B57E4', borderRadius: 8, height: 44 }}
                >
                    Add Staff
                </Button>
            </div>

            <Card bordered={false} style={{ borderRadius: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
                <div style={{ marginBottom: 24 }}>
                    <Input
                        prefix={<SearchOutlined style={{ color: '#888' }} />}
                        placeholder="Search by name or employee ID..."
                        size="large"
                        value={searchText}
                        onChange={e => setSearchText(e.target.value)}
                        style={{ borderRadius: 8 }}
                    />
                </div>

                <Table
                    columns={columns}
                    dataSource={filteredStaff}
                    rowKey="id"
                    loading={loading}
                    pagination={{ pageSize: 10 }}
                />
            </Card>

            {/* Credentials Modal */}
            <Modal
                title="Staff Account Created"
                open={credentialsModal.visible}
                onCancel={() => setCredentialsModal({ visible: false, data: null, staffName: '' })}
                footer={[
                    <Button key="download" onClick={() => downloadCredentials(credentialsModal.data)}>
                        Download Sheet
                    </Button>,
                    <Button key="close" type="primary" onClick={() => setCredentialsModal({ visible: false, data: null, staffName: '' })} style={{ background: '#7B57E4' }}>
                        Done
                    </Button>
                ]}
            >
                <div style={{ textAlign: 'center', padding: '16px 0' }}>
                    <div style={{ background: '#F6FFED', border: '1px solid #B7EB8F', padding: 20, borderRadius: 12, marginBottom: 24 }}>
                        <Title level={5} style={{ margin: 0, color: '#389E0D' }}>Account Initialized Successfully</Title>
                        <Text type="secondary">Share these temporary credentials with the staff member</Text>
                    </div>

                    <Descriptions column={1} bordered size="small">
                        <Descriptions.Item label="Username">
                            <Space>
                                <Text strong>{credentialsModal.data?.username}</Text>
                                <Button size="small" type="text" icon={<CopyOutlined />} onClick={() => copyToClipboard(credentialsModal.data?.username)} />
                            </Space>
                        </Descriptions.Item>
                        <Descriptions.Item label="Temp Password">
                            <Space>
                                <Text strong style={{ color: '#CF1322' }}>{credentialsModal.data?.tempPassword}</Text>
                                <Button size="small" type="text" icon={<CopyOutlined />} onClick={() => copyToClipboard(credentialsModal.data?.tempPassword)} />
                            </Space>
                        </Descriptions.Item>
                    </Descriptions>

                    <Text type="warning" style={{ fontSize: 12, marginTop: 16, display: 'block' }}>
                        * The user will be prompted to change this password on their first login.
                    </Text>
                </div>
            </Modal>
        </div>
    );
};

export default Staff;
