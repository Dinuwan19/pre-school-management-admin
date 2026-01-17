import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, DatePicker, Select, Card, Typography, message, Avatar, Tag, Row, Col, Divider, Space } from 'antd';
import { PlusOutlined, SearchOutlined, FilterOutlined } from '@ant-design/icons';
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
    const [form] = Form.useForm();

    // Filters
    const [searchText, setSearchText] = useState('');
    const [classroomFilter, setClassroomFilter] = useState(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [stuRes, classRes, parentRes] = await Promise.all([
                api.get('/students'),
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
    }, [searchParams]);

    const handleAdd = () => {
        form.resetFields();
        setIsModalVisible(true);
    };

    const handleFinish = async () => {
        try {
            const values = await form.validateFields();
            setLoading(true);

            const payload = {
                ...values,
                dob: values.dob ? values.dob.format('YYYY-MM-DD') : null,
                enrollmentDate: values.enrollmentDate ? values.enrollmentDate.format('YYYY-MM-DD') : new Date(),
            };

            await api.post('/students', payload);
            message.success('Student added successfully');
            setIsModalVisible(false);
            fetchData();
        } catch (error) {
            message.error(error.response?.data?.message || 'Failed to add student');
        } finally {
            setLoading(false);
        }
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
                    <Avatar src={record.photoUrl} size={40} style={{ backgroundColor: '#7B57E4' }}>{record.fullName[0]}</Avatar>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <Text strong>{record.fullName}</Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>{record.gender}</Text>
                    </div>
                </Space>
            ),
        },
        {
            title: 'ID',
            dataIndex: 'studentUniqueId',
            key: 'id',
            render: (text) => <Text strong style={{ color: '#555' }}>{text || 'Pending'}</Text>
        },
        {
            title: 'Age',
            key: 'age',
            render: (_, record) => record.dob ? dayjs().diff(dayjs(record.dob), 'year') : '-'
        },
        {
            title: 'Classroom',
            dataIndex: ['classroom', 'name'],
            key: 'classroom',
            render: (text) => text ? <Tag color="purple" style={{ borderRadius: 12, padding: '0 10px', background: '#F0EAFB', color: '#7B57E4', border: 0 }}>{text}</Tag> : <Tag>Unassigned</Tag>
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
                <a onClick={() => navigate(`/students/${record.id}`)} style={{ color: '#7B57E4', fontWeight: 500 }}>View Profile</a>
            ),
        },
    ];

    return (
        <div style={{ paddingBottom: 40 }}>
            <div style={{ marginBottom: 24 }}>
                <Title level={3}>Students</Title>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
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

                    {user?.role !== 'TEACHER' && (
                        <Button type="primary" icon={<PlusOutlined />} size="large" onClick={handleAdd} style={{ borderRadius: 8, background: '#7B57E4' }}>
                            Add Student
                        </Button>
                    )}
                </div>
            </div>

            <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }} bodyStyle={{ padding: 0 }}>
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
                            <Form.Item name="fullName" label="Full Name" rules={[{ required: true }]}>
                                <Input placeholder="Enter full name" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="gender" label="Gender">
                                <Select>
                                    <Option value="MALE">Male</Option>
                                    <Option value="FEMALE">Female</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={24}>
                        <Col span={12}>
                            <Form.Item name="parentId" label="Primary Parent (Required)" rules={[{ required: true }]}>
                                <Select placeholder="Assign Primary Parent" showSearch optionFilterProp="children">
                                    {parents.map(p => <Option key={p.id} value={p.id}>{p.fullName} ({p.relationship})</Option>)}
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="secondParentId" label="Secondary Parent (Optional)">
                                <Select placeholder="Assign Secondary Parent" showSearch optionFilterProp="children" allowClear>
                                    {parents.map(p => <Option key={p.id} value={p.id}>{p.fullName} ({p.relationship})</Option>)}
                                </Select>
                            </Form.Item>
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
                            <Form.Item name="dob" label="Date of Birth">
                                <DatePicker style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={24}>
                        <Col span={12}>
                            <Form.Item name="enrollmentDate" label="Enrollment Date" initialValue={dayjs()}>
                                <DatePicker style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="emergencyContact" label="Emergency Contact (Name & Phone)" rules={[{ required: true }]}>
                                <Input placeholder="e.g. Aunt - 0712345678" />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Divider orientation="left">Medical Information</Divider>
                    <Form.Item name="medicalInfo" label="Medical Notes & Allergies">
                        <Input.TextArea placeholder="Enter any medical conditions or allergies..." rows={2} />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default Students;
