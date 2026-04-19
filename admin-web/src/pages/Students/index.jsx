import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, DatePicker, Select, Card, Typography, message, Avatar, Tag, Row, Col, Divider, Space, Descriptions, Alert, Upload, Tabs } from 'antd';
import { PlusOutlined, SearchOutlined, FilterOutlined, CopyOutlined, DownloadOutlined, UploadOutlined, EditOutlined, UserOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/client';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;

const Students = () => {
    const { user } = useAuth();
    const [students, setStudents] = useState([]);
    const [classrooms, setClassrooms] = useState([]);
    const [parents, setParents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const [isModalVisible, setIsModalVisible] = useState(false);
    const [isEditModalVisible, setIsEditModalVisible] = useState(false);
    const [isDeactivateModalVisible, setIsDeactivateModalVisible] = useState(false);
    const [editingStudent, setEditingStudent] = useState(null);
    const [isQuickParentVisible, setIsQuickParentVisible] = useState(false);
    const [quickAddTarget, setQuickAddTarget] = useState('primary'); // 'primary' or 'secondary'
    const [successModal, setSuccessModal] = useState({ visible: false, data: null });
    const [form] = Form.useForm();
    const [parentForm] = Form.useForm();
    const [editForm] = Form.useForm();
    const [deactivateForm] = Form.useForm();

    // Filters
    const [searchText, setSearchText] = useState('');
    const [classroomFilter, setClassroomFilter] = useState(null);
    const [statusFilter, setStatusFilter] = useState('ACTIVE');

    const fetchData = async () => {
        setLoading(true);
        try {
            const params = {};
            if (statusFilter) params.status = statusFilter;

            const [stuRes, classRes, parentRes] = await Promise.all([
                api.get('/students', { params }),
                api.get('/classrooms'),
                api.get('/parents')
            ]);
            setStudents(stuRes.data);
            setClassrooms(classRes.data);
            setParents(parentRes.data);
        } catch (error) {
            message.error(error.errorMessage || 'Failed to load student data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        if (searchParams.get('action') === 'add') {
            handleAdd();
        }
    }, [searchParams, statusFilter]);

    const handleAdd = () => {
        form.resetFields();
        setIsModalVisible(true);
    };

    const handleFinish = async () => {
        try {
            const values = await form.validateFields();
            setLoading(true);

            const formData = new FormData();
            formData.append('fullName', values.fullName);
            formData.append('gender', values.gender);
            formData.append('parentId', values.parentId);
            if (values.secondParentId) formData.append('secondParentId', values.secondParentId);
            formData.append('classroomId', values.classroomId);
            formData.append('dob', values.dob ? values.dob.format('YYYY-MM-DD') : '');
            formData.append('enrollmentDate', values.enrollmentDate ? values.enrollmentDate.format('YYYY-MM-DD') : new Date().toISOString().split('T')[0]);
            formData.append('emergencyContact', values.emergencyContact);
            if (values.medicalInfo) formData.append('medicalInfo', values.medicalInfo);

            // Append Files
            const appendFileIfExist = (name, value) => {
                const fileObj = value?.file || value?.fileList?.[0] || (value instanceof File ? value : null);
                if (fileObj && (fileObj.originFileObj || fileObj instanceof File)) {
                    formData.append(name, fileObj.originFileObj || fileObj);
                }
            };

            appendFileIfExist('photo', values.photo);
            appendFileIfExist('birthCert', values.birthCert);
            appendFileIfExist('vaccineCard', values.vaccineCard);

            await api.post('/students', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            message.success('Student added successfully');
            setIsModalVisible(false);
            fetchData();
        } catch (error) {
            console.error(error);
            message.error(error.response?.data?.message || 'Failed to add student');
        } finally {
            setLoading(false);
        }
    };

    const handleQuickAddParent = async () => {
        try {
            const values = await parentForm.validateFields();
            setLoading(true);
            const payload = { ...values, fullName: values.fullName.trim() };
            const res = await api.post('/parents', payload);
            message.success('Parent added successfully');

            // Refresh parent list
            const parentRes = await api.get('/parents');
            setParents(parentRes.data);

            // Auto-select new parent
            if (quickAddTarget === 'secondary') {
                form.setFieldsValue({ secondParentId: res.data.id });
            } else {
                form.setFieldsValue({ parentId: res.data.id });
            }

            setIsQuickParentVisible(false);
            setSuccessModal({ visible: true, data: res.data });
            parentForm.resetFields();
        } catch (error) {
            message.error(error.response?.data?.message || 'Failed to create parent');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async () => {
        try {
            const values = await editForm.validateFields();
            setLoading(true);

            const formData = new FormData();
            Object.keys(values).forEach(key => {
                if (values[key] !== undefined && values[key] !== null) {
                    if (key === 'dob' || key === 'enrollmentDate') {
                        formData.append(key, values[key].format('YYYY-MM-DD'));
                    } else if (key === 'photo' || key === 'birthCert' || key === 'vaccineCard') {
                        const file = values[key]?.fileList?.[0]?.originFileObj || values[key]?.file?.originFileObj;
                        if (file) formData.append(key, file);
                    } else {
                        formData.append(key, values[key]);
                    }
                }
            });

            await api.put(`/students/${editingStudent.id}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            message.success('Student updated successfully');
            setIsEditModalVisible(false);
            fetchData();
        } catch (error) {
            message.error(error.response?.data?.message || 'Update failed');
        } finally {
            setLoading(false);
        }
    };

    const handleBatchDeactivate = async () => {
        try {
            const { studentIds } = await deactivateForm.validateFields();
            setLoading(true);
            
            await Promise.all(studentIds.map(id => 
                api.put(`/students/${id}`, { status: 'INACTIVE' })
            ));

            message.success('Students deactivated successfully');
            setIsDeactivateModalVisible(false);
            deactivateForm.resetFields();
            fetchData();
        } catch (error) {
            message.error('Failed to deactivate students');
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = (text) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        message.success('Copied to clipboard');
    };

    const downloadSlip = (data) => {
        const content = `
Malkakulu Future Mind - Parent Registration Slip
------------------------------------------------
Parent Name: ${data.fullName}
Parent ID: ${data.parentUniqueId}

Instructions:
1. Download the Malkakulu Mobile App.
2. Go to "Sign Up" and enter your NIC Number (${data.nationalId || 'N/A'}) to verify your account.
3. Once verified, you can track your child's attendance and progress.
------------------------------------------------
        `;
        const element = document.createElement("a");
        const file = new Blob([content], { type: 'text/plain' });
        element.href = URL.createObjectURL(file);
        element.download = `registration_${data.parentUniqueId}.txt`;
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    };

    // Filtering Logic
    const filteredStudents = students.filter(student => {
        const matchesSearch = student.fullName.toLowerCase().includes(searchText.toLowerCase()) ||
            (student.studentUniqueId && student.studentUniqueId.toLowerCase().includes(searchText.toLowerCase()));
        const matchesClass = classroomFilter ? student.classroomId === classroomFilter : true;
        return matchesSearch && matchesClass;
    });

    const columns = [
        {
            title: 'Student',
            key: 'student',
            render: (_, record) => (
                <Space size={12}>
                    <Avatar src={record.photoUrl} size={42} style={{ backgroundColor: '#F3EFFF', color: '#7B57E4' }}>{record.fullName?.[0] || '?'}</Avatar>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <Text strong style={{ fontSize: 14 }}>{record.fullName}</Text>
                        <Text type="secondary" style={{ fontSize: 11 }}>{record.studentUniqueId || 'ID Pending'}</Text>
                    </div>
                </Space>
            ),
        },
        {
            title: 'Age',
            key: 'age',
            render: (_, record) => record.dateOfBirth ? `${dayjs().diff(dayjs(record.dateOfBirth), 'year')}y` : '-'
        },
        {
            title: 'Classroom',
            dataIndex: ['classroom', 'name'],
            key: 'classroom',
            render: (text) => text ? (
                <Tag
                    color="purple"
                    style={{
                        borderRadius: 12,
                        padding: '0 12px',
                        fontWeight: 600,
                        border: 0,
                    }}
                >
                    {text}
                </Tag>
            ) : <Tag>Unassigned</Tag>
        },
        {
            title: 'Parent',
            dataIndex: ['parent', 'fullName'],
            key: 'parent',
        },
        {
            title: 'Enrollment',
            dataIndex: 'enrollmentDate',
            key: 'enrollmentDate',
            render: (date) => date ? dayjs(date).format('M/D/YYYY') : '-'
        },
        {
            title: 'Action',
            key: 'action',
            render: (_, record) => (
                <Space>
                    <Button
                        onClick={() => navigate(`/students/${record.id}`)}
                        style={{
                            background: 'rgba(123, 87, 228, 0.1)',
                            color: '#7B57E4',
                            border: 'none',
                            fontWeight: 600,
                            borderRadius: 8
                        }}
                        size="small"
                    >
                        View
                    </Button>
                    <Button
                        onClick={() => {
                            editForm.setFieldsValue({
                                ...record,
                                dob: record.dateOfBirth ? dayjs(record.dateOfBirth) : null,
                                enrollmentDate: record.enrollmentDate ? dayjs(record.enrollmentDate) : dayjs()
                            });
                            setEditingStudent(record);
                            setIsEditModalVisible(true);
                        }}
                        style={{
                            background: 'rgba(24, 144, 255, 0.1)',
                            color: '#1890ff',
                            border: 'none',
                            fontWeight: 600,
                            borderRadius: 8
                        }}
                        size="small"
                        icon={<EditOutlined />}
                    >
                        Edit
                    </Button>
                </Space>
            ),
        },
    ];

    return (
        <div style={{ paddingBottom: 40 }}>
            <div style={{ marginBottom: 24 }}>
                <Title level={3}>Students</Title>
            </div>

            <Tabs
                activeKey={statusFilter}
                onChange={setStatusFilter}
                className="custom-tabs"
                style={{ marginBottom: 16 }}
                items={[
                    { key: 'ACTIVE', label: 'Active Students' },
                    ...(user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' ? [{ key: 'INACTIVE', label: 'Inactive Students' }] : [])
                ]}
            />

            <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }} bodyStyle={{ padding: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 24 }}>
                    <div style={{ display: 'flex', gap: 16, flex: 1 }}>
                        <Input
                            placeholder="Search students..."
                            prefix={<SearchOutlined style={{ color: '#aaa' }} />}
                            style={{ maxWidth: 300, borderRadius: 8, height: 40 }}
                            onChange={e => setSearchText(e.target.value)}
                        />
                        <Select
                            placeholder="Filter by Class"
                            style={{ width: 200, height: 40 }}
                            allowClear
                            onChange={setClassroomFilter}
                        >
                            <Option value={null}>All Classes</Option>
                            {classrooms.map(c => <Option key={c.id} value={c.id}>{c.name}</Option>)}
                        </Select>
                    </div>

                    <div style={{ display: 'flex', gap: 12 }}>
                        {statusFilter === 'INACTIVE' && ['SUPER_ADMIN', 'ADMIN'].includes(user?.role) && (
                            <Button 
                                type="primary" 
                                danger 
                                icon={<UserOutlined />} 
                                onClick={() => setIsDeactivateModalVisible(true)}
                                style={{ borderRadius: 8, height: 40, fontWeight: 600 }}
                            >
                                Manage Deactivations
                            </Button>
                        )}
                        {['SUPER_ADMIN', 'ADMIN', 'STAFF'].includes(user?.role) && (
                            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd} style={{ borderRadius: 8, background: '#7B57E4', height: 40, fontWeight: 600 }}>
                                Add Student
                            </Button>
                        )}
                    </div>
                </div>
                <Table
                    columns={columns}
                    dataSource={filteredStudents}
                    rowKey="id"
                    loading={loading}
                    pagination={{ pageSize: 10 }}
                />
            </Card>

            <Modal
                title="Add New Student"
                open={isModalVisible}
                onCancel={() => setIsModalVisible(false)}
                onOk={handleFinish}
                width={800}
                okText="Add Student"
                okButtonProps={{ style: { background: '#7B57E4' } }}
            >
                <Form form={form} layout="vertical" style={{ marginTop: 24 }}>
                    <Row gutter={24}>
                        <Col span={12}>
                            <Form.Item
                                name="fullName"
                                label="Full Name"
                                rules={[
                                    { required: true, message: 'Full name is required' },
                                    { min: 3, message: 'Name must be at least 3 characters' }
                                ]}
                            >
                                <Input placeholder="Enter full name" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item
                                name="gender"
                                label="Gender"
                                rules={[{ required: true, message: 'Please select gender' }]}
                            >
                                <Select placeholder="Select Gender">
                                    <Option value="MALE">Male</Option>
                                    <Option value="FEMALE">Female</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={24}>
                        <Col span={12}>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <Form.Item name="parentId" label="Primary Parent (Required)" rules={[{ required: true }]} style={{ flex: 1, marginBottom: 0 }}>
                                    <Select placeholder="Assign Primary Parent" showSearch optionFilterProp="label">
                                        {parents.map(p => (
                                            <Option key={p.id} value={p.id} label={`${p.nationalId} - ${p.fullName}`}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <span>{p.fullName}</span>
                                                    <span style={{ color: '#aaa', fontSize: '12px' }}>{p.nationalId}</span>
                                                </div>
                                            </Option>
                                        ))}
                                    </Select>
                                </Form.Item>
                                <Button
                                    type="dashed"
                                    icon={<PlusOutlined />}
                                    style={{ marginTop: 30, color: '#7B57E4', borderColor: '#7B57E4' }}
                                    onClick={() => {
                                        parentForm.resetFields();
                                        setQuickAddTarget('primary');
                                        setIsQuickParentVisible(true);
                                    }}
                                >
                                    New
                                </Button>
                            </div>
                        </Col>
                        <Col span={12}>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <Form.Item name="secondParentId" label="Secondary Parent (Optional)" style={{ flex: 1, marginBottom: 0 }}>
                                    <Select placeholder="Assign Secondary Parent" showSearch optionFilterProp="label" allowClear>
                                        {parents.map(p => (
                                            <Option key={p.id} value={p.id} label={`${p.nationalId} - ${p.fullName}`}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <span>{p.fullName}</span>
                                                    <span style={{ color: '#aaa', fontSize: '12px' }}>{p.nationalId}</span>
                                                </div>
                                            </Option>
                                        ))}
                                    </Select>
                                </Form.Item>
                                <Button
                                    type="dashed"
                                    icon={<PlusOutlined />}
                                    style={{ marginTop: 30 }}
                                    onClick={() => {
                                        parentForm.resetFields();
                                        setQuickAddTarget('secondary');
                                        setIsQuickParentVisible(true);
                                    }}
                                >
                                    New
                                </Button>
                            </div>
                        </Col>
                    </Row>
                    <Row gutter={24}>
                        <Col span={12}>
                            <Form.Item name="classroomId" label="Classroom" rules={[{ required: true }]}>
                                <Select placeholder="Select Class">
                                    {classrooms.map(c => <Option key={c.id} value={c.id}>{c.name}</Option>)}
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item
                                name="dob"
                                label="Date of Birth"
                                rules={[
                                    { required: true, message: 'DOB is required' },
                                    {
                                        validator: (_, value) => {
                                            if (!value) return Promise.resolve();
                                            const age = dayjs().diff(value, 'year', true);
                                            if (age < 3 || age > 6) {
                                                return Promise.reject(new Error('Student must be between 3 and 6 years old'));
                                            }
                                            return Promise.resolve();
                                        }
                                    }
                                ]}
                            >
                                <DatePicker
                                    style={{ width: '100%' }}
                                    disabledDate={(current) => {
                                        return current && (current > dayjs().subtract(3, 'year').endOf('day') || current < dayjs().subtract(6, 'year').startOf('day'));
                                    }}
                                />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={24}>
                        <Col span={12}>
                            <Form.Item
                                name="enrollmentDate"
                                label="Enrollment Date"
                                initialValue={dayjs()}
                                rules={[{ required: true }]}
                            >
                                <DatePicker
                                    style={{ width: '100%' }}
                                    disabledDate={(current) => {
                                        return current && (current > dayjs().endOf('day') || current < dayjs().subtract(1, 'month').startOf('day'));
                                    }}
                                />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item
                                name="emergencyContact"
                                label="Emergency Contact (Name & Phone)"
                                rules={[
                                    { required: true, message: 'Emergency contact is required' },
                                    { min: 6, message: 'Contact details must be at least 6 characters' }
                                ]}
                            >
                                <Input placeholder="e.g. Aunt - 0712345678" />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={24}>
                        <Col span={12}>
                            <Form.Item name="photo" label="Student Photo">
                                <Upload maxCount={1} beforeUpload={() => false} listType="picture" accept="image/*">
                                    <Button icon={<UploadOutlined />}>Upload Photo</Button>
                                </Upload>
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="birthCert" label="Birth Certificate (PDF)">
                                <Upload maxCount={1} beforeUpload={() => false} accept=".pdf,.jpg,.jpeg,.png">
                                    <Button icon={<UploadOutlined />}>Upload Cert</Button>
                                </Upload>
                            </Form.Item>
                        </Col>
                    </Row>
                    <Divider orientation="left">Medical Information</Divider>
                    <Form.Item name="medicalInfo" label="Medical Notes & Allergies">
                        <Input.TextArea placeholder="Enter any medical conditions or allergies..." rows={2} />
                    </Form.Item>
                </Form>
            </Modal>

            {/* Quick Add Parent Modal */}
            <Modal
                title="Quick Add Parent"
                open={isQuickParentVisible}
                onCancel={() => setIsQuickParentVisible(false)}
                onOk={handleQuickAddParent}
                okText="Add & Select"
                confirmLoading={loading}
                okButtonProps={{ style: { background: '#7B57E4' } }}
            >
                <Form form={parentForm} layout="vertical" style={{ marginTop: 20 }}>
                    <Form.Item name="fullName" label="Parent Name" rules={[{ required: true, message: 'Parent name is required' }]}>
                        <Input placeholder="Enter full name" />
                    </Form.Item>

                    <Row gutter={16}>
                        <Col span={12}>
                             <Form.Item
                                name="nationalId"
                                label="NIC Number"
                                rules={[
                                    { required: true, message: 'NIC is required' },
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
                                <Input placeholder="991234567V" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="relationship" label="Relationship" rules={[{ required: true }]}>
                                <Select>
                                    <Option value="FATHER">Father</Option>
                                    <Option value="MOTHER">Mother</Option>
                                    <Option value="GUARDIAN">Guardian</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>
                     <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item
                                name="phone"
                                label="Phone Number"
                                rules={[
                                    { required: true, message: 'Phone is required' },
                                    {
                                        validator: (_, value) => {
                                            if (!value) return Promise.resolve();
                                            const cleaned = value.replace(/[^0-9]/g, '');
                                            if (!/^(07|947)[0-9]{8}$/.test(cleaned)) {
                                                return Promise.reject(new Error('Format: 07XXXXXXXX or 947XXXXXXXX'));
                                            }
                                            return Promise.resolve();
                                        }
                                    }
                                ]}
                            >
                                <Input placeholder="07XXXXXXXX" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item
                                name="email"
                                label="Email Address"
                                rules={[
                                    { required: true, message: 'Email is mandatory' },
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
                                <Input placeholder="parent@example.com" />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Form.Item name="address" label="Address" rules={[{ required: true }]}>
                        <Input.TextArea rows={2} placeholder="Home address" />
                    </Form.Item>
                </Form>
            </Modal>

            {/* Edit Student Modal */}
            <Modal
                title="Edit Student Info"
                open={isEditModalVisible}
                onCancel={() => setIsEditModalVisible(false)}
                onOk={handleUpdate}
                confirmLoading={loading}
                width={700}
                okText="Save Changes"
                okButtonProps={{ style: { background: '#7B57E4' } }}
            >
                <Form
                    form={editForm}
                    layout="vertical"
                    style={{ marginTop: 24 }}
                >
                    <Row gutter={16}>
                        <Col span={12}><Form.Item name="fullName" label="Full Name" rules={[{ required: true }]}><Input /></Form.Item></Col>
                        <Col span={12}><Form.Item name="gender" label="Gender"><Select><Option value="MALE">Male</Option><Option value="FEMALE">Female</Option></Select></Form.Item></Col>
                        <Col span={12}><Form.Item name="dob" label="Date of Birth"><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
                        <Col span={12}><Form.Item name="classroomId" label="Classroom"><Select>{classrooms.map(c => <Option key={c.id} value={c.id}>{c.name}</Option>)}</Select></Form.Item></Col>
                        <Col span={12}>
                            <Form.Item name="parentId" label="Primary Parent">
                                <Select showSearch optionFilterProp="children">{parents.map(p => <Option key={p.id} value={p.id}>{p.fullName} ({p.nationalId})</Option>)}</Select>
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="secondParentId" label="Secondary Parent">
                                <Select showSearch optionFilterProp="children" allowClear>{parents.map(p => <Option key={p.id} value={p.id}>{p.fullName} ({p.nationalId})</Option>)}</Select>
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="photo" label="Update Photo">
                                <Upload beforeUpload={() => false} maxCount={1} listType="picture" accept="image/*">
                                    <Button icon={<UploadOutlined />}>Select Image</Button>
                                </Upload>
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="birthCert" label="Update Birth Certificate (PDF/Image)">
                                <Upload beforeUpload={() => false} maxCount={1} accept=".pdf,.jpg,.jpeg,.png">
                                    <Button icon={<UploadOutlined />}>Select File</Button>
                                </Upload>
                            </Form.Item>
                        </Col>
                        <Col span={24}>
                            <Form.Item name="emergencyContact" label="Emergency Contact"><Input /></Form.Item>
                        </Col>
                        <Col span={24}>
                            <Form.Item name="medicalInfo" label="Medical Info"><Input.TextArea rows={2} /></Form.Item>
                        </Col>
                    </Row>
                </Form>
            </Modal>

            {/* Batch Deactivation Modal */}
            <Modal
                title={<span><UserOutlined style={{ color: '#ff4d4f', marginRight: 8 }} /> Manage Student Deactivations</span>}
                open={isDeactivateModalVisible}
                onCancel={() => setIsDeactivateModalVisible(false)}
                onOk={handleBatchDeactivate}
                confirmLoading={loading}
                okText="Deactivate Selected"
                okButtonProps={{ danger: true }}
                width={600}
            >
                <div style={{ marginBottom: 20 }}>
                    <Alert 
                        message="Select students to move to the Inactive list. They will no longer appear in active attendance or classroom logs."
                        type="info"
                        showIcon
                    />
                </div>
                <Form form={deactivateForm} layout="vertical">
                    <Form.Item 
                        name="studentIds" 
                        label="Select Active Students" 
                        rules={[{ required: true, message: 'Please select at least one student' }]}
                    >
                        <Select
                            mode="multiple"
                            placeholder="Search and select students..."
                            style={{ width: '100%' }}
                            showSearch
                            optionFilterProp="children"
                        >
                            {students.filter(s => s.status === 'ACTIVE').map(s => (
                                <Option key={s.id} value={s.id}>{s.fullName} ({s.studentUniqueId})</Option>
                            ))}
                        </Select>
                    </Form.Item>
                </Form>
            </Modal>

            {/* Registration Success Modal (Reused) */}
            <Modal
                title="Parent Registration Complete"
                open={successModal.visible}
                onCancel={() => setSuccessModal({ visible: false, data: null })}
                footer={[
                    <Button key="download" icon={<DownloadOutlined />} onClick={() => downloadSlip(successModal.data)}>
                        Download Slip
                    </Button>,
                    <Button key="close" type="primary" onClick={() => setSuccessModal({ visible: false, data: null })} style={{ background: '#7B57E4' }}>
                        Done
                    </Button>
                ]}
            >
                <div style={{ textAlign: 'center', padding: '16px 0' }}>
                    <div style={{ background: '#F6FFED', border: '1px solid #B7EB8F', padding: 20, borderRadius: 12, marginBottom: 24 }}>
                        <Title level={5} style={{ margin: 0, color: '#389E0D' }}>Parent Created & Selected</Title>
                        <Text type="secondary">New parent has been auto-selected for this student</Text>
                    </div>

                    <Descriptions column={1} bordered size="small">
                        <Descriptions.Item label="Parent ID">
                            <Space>
                                <Text strong>{successModal.data?.parentUniqueId}</Text>
                                <Button size="small" type="text" icon={<CopyOutlined />} onClick={() => copyToClipboard(successModal.data?.parentUniqueId)} />
                            </Space>
                        </Descriptions.Item>
                        <Descriptions.Item label="NIC Number">
                            <Text strong>{successModal.data?.nationalId}</Text>
                        </Descriptions.Item>
                    </Descriptions>
                </div>
            </Modal>
        </div>
    );
};

export default Students;
