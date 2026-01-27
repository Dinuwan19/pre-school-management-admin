import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Select, Card, Typography, message, Space, Tag, Row, Col, Divider, Descriptions, Alert } from 'antd';
import { PlusOutlined, SearchOutlined, EyeOutlined, CopyOutlined, DownloadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/client';

const { Title, Text } = Typography;
const { Option } = Select;

const Parents = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [parents, setParents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [isEditModalVisible, setIsEditModalVisible] = useState(false);
    const [editingParent, setEditingParent] = useState(null);
    const [successModal, setSuccessModal] = useState({ visible: false, data: null });
    const [form] = Form.useForm();
    const [editForm] = Form.useForm();

    const fetchParents = async () => {
        setLoading(true);
        try {
            const res = await api.get('/parents');
            setParents(res.data);
        } catch (error) {
            message.error(error.errorMessage || 'Failed to load system data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchParents();
    }, []);

    const handleAdd = async () => {
        try {
            const values = await form.validateFields();
            const payload = {
                ...values,
                fullName: values.fullName.trim()
            };
            setLoading(true);
            const res = await api.post('/parents', payload);
            message.success('Parent added successfully');
            setIsModalVisible(false);
            setSuccessModal({ visible: true, data: res.data });
            form.resetFields();
            fetchParents();
        } catch (error) {
            message.error(error.response?.data?.message || 'Failed to create parent');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (record) => {
        setEditingParent(record);
        editForm.setFieldsValue(record);
        setIsEditModalVisible(true);
    };

    const handleUpdate = async () => {
        try {
            const values = await editForm.validateFields();
            setLoading(true);
            await api.put(`/parents/${editingParent.id}`, values);
            message.success('Parent updated successfully');
            setIsEditModalVisible(false);
            fetchParents();
        } catch (error) {
            message.error(error.response?.data?.message || 'Failed to update parent');
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

    const filteredParents = parents.filter(p =>
        p.fullName.toLowerCase().includes(searchText.toLowerCase()) ||
        (p.phone && p.phone.includes(searchText)) ||
        (p.parentUniqueId && p.parentUniqueId.toLowerCase().includes(searchText.toLowerCase()))
    );

    const columns = [
        {
            title: 'Parent ID',
            dataIndex: 'parentUniqueId',
            key: 'pid',
            render: (text) => <Tag color="blue">{text || 'Pending'}</Tag>
        },
        {
            title: 'Parent Name',
            dataIndex: 'fullName',
            key: 'name',
            render: (text) => <Text strong>{text}</Text>
        },
        {
            title: 'NIC',
            dataIndex: 'nationalId',
            key: 'nic',
        },
        {
            title: 'Relationship',
            dataIndex: 'relationship',
            key: 'rel',
        },
        {
            title: 'Phone',
            dataIndex: 'phone',
            key: 'phone',
        },
        {
            title: 'Children',
            key: 'children',
            render: (_, record) => (
                <Space direction="vertical" size={0}>
                    {record.students?.map(s => <Text key={s.id} style={{ fontSize: 12 }}>{s.fullName}</Text>)}
                    {(!record.students || record.students.length === 0) && <Text type="secondary" italic>No students</Text>}
                </Space>
            )
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, record) => (
                <Space>
                    <Button
                        icon={<EyeOutlined />}
                        size="small"
                        type="primary"
                        ghost
                        onClick={() => navigate(`/parents/${record.id}`)}
                    >
                        View
                    </Button>
                    {user?.role !== 'TEACHER' && (
                        <Button
                            size="small"
                            onClick={() => handleEdit(record)}
                        >
                            Edit
                        </Button>
                    )}
                </Space>
            )
        }
    ];

    const parentFormFields = (
        <>
            <Form.Item name="fullName" label="Parent Name" rules={[{ required: true }]}>
                <Input placeholder="Enter full name" />
            </Form.Item>

            <Row gutter={16}>
                <Col span={12}>
                    <Form.Item
                        name="nationalId"
                        label="NIC Number"
                        rules={[
                            { required: true, message: 'NIC is required' },
                            { pattern: /^([0-9]{9}[x|X|v|V]|[0-9]{12})$/, message: 'Invalid NIC Format' }
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
                    <Form.Item name="occupation" label="Occupation">
                        <Input />
                    </Form.Item>
                </Col>
                <Col span={12}>
                    <Form.Item name="phone" label="Phone Number" rules={[{ required: true }]}>
                        <Input />
                    </Form.Item>
                </Col>
            </Row>
            <Row gutter={16}>
                <Col span={24}>
                    <Form.Item name="email" label="Email Address">
                        <Input />
                    </Form.Item>
                </Col>
            </Row>
            <Form.Item name="address" label="Address">
                <Input.TextArea rows={2} />
            </Form.Item>
        </>
    );

    return (
        <div style={{ paddingBottom: 40 }}>
            <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <Title level={3}>Parents</Title>
                    <Text type="secondary">Manage parent records</Text>
                </div>
                <div style={{ display: 'flex', gap: 16 }}>
                    <Input
                        placeholder="Search by name, ID or phone"
                        prefix={<SearchOutlined style={{ color: '#ccc' }} />}
                        style={{ width: 300, borderRadius: 8 }}
                        value={searchText}
                        onChange={e => setSearchText(e.target.value)}
                    />
                    {user?.role !== 'TEACHER' && (
                        <Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setIsModalVisible(true); }} size="large" style={{ background: '#7B57E4' }}>
                            Add Parent
                        </Button>
                    )}
                </div>
            </div>

            <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
                <Table
                    columns={columns}
                    dataSource={filteredParents}
                    rowKey="id"
                    loading={loading}
                />
            </Card>

            {/* Add Parent Modal */}
            <Modal
                title="Add New Parent"
                open={isModalVisible}
                onCancel={() => setIsModalVisible(false)}
                onOk={handleAdd}
                okText="Add Parent"
                confirmLoading={loading}
                okButtonProps={{ style: { background: '#7B57E4' } }}
            >
                <Form form={form} layout="vertical" style={{ marginTop: 20 }}>
                    {parentFormFields}
                </Form>
            </Modal>

            {/* Edit Parent Modal */}
            <Modal
                title="Edit Parent Details"
                open={isEditModalVisible}
                onCancel={() => setIsEditModalVisible(false)}
                onOk={handleUpdate}
                okText="Update Parent"
                confirmLoading={loading}
                okButtonProps={{ style: { background: '#7B57E4' } }}
            >
                <Form form={editForm} layout="vertical" style={{ marginTop: 20 }}>
                    {parentFormFields}
                </Form>
            </Modal>

            {/* Registration Success Modal */}
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
                        <Title level={5} style={{ margin: 0, color: '#389E0D' }}>Parent Record Created</Title>
                        <Text type="secondary">Parent can now sign up using their NIC number on the mobile app</Text>
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

                    <Alert
                        message="Login Instruction"
                        description={`Parent should use NIC: ${successModal.data?.nationalId} to sign up on the mobile app.`}
                        type="success"
                        showIcon
                        style={{ marginTop: 16, textAlign: 'left' }}
                    />
                </div>
            </Modal>
        </div>
    );
};

export default Parents;
