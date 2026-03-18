import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Select, Card, Typography, message, Space, Tag, Row, Col, Divider, Descriptions, Alert, theme } from 'antd';
import { PlusOutlined, SearchOutlined, EyeOutlined, CopyOutlined, DownloadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { fetchParents, createParent, updateParent } from '../../api/services';

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

    const {
        token: { colorBgContainer, colorBorder, colorText, colorTextSecondary, colorPrimary, colorPrimaryBg },
    } = theme.useToken();

    const fetchParents = async () => {
        setLoading(true);
        try {
            const res = await fetchParents();
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
            const res = await createParent(payload);
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
            await updateParent(editingParent.id, values);
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

    const filteredParents = (Array.isArray(parents) ? parents : []).filter(p =>
        (p.fullName || '').toLowerCase().includes(searchText.toLowerCase()) ||
        (p.phone && p.phone.includes(searchText)) ||
        (p.parentUniqueId && p.parentUniqueId.toLowerCase().includes(searchText.toLowerCase())) ||
        (p.nationalId && p.nationalId.toLowerCase().includes(searchText.toLowerCase()))
    );

    const columns = [
        {
            title: 'Parent',
            key: 'parent',
            width: '25%',
            render: (_, record) => (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <Text strong style={{ fontSize: 15, color: colorText }}>{record.fullName}</Text>
                    <Text type="secondary" style={{ fontSize: 12, marginTop: 2 }}>{record.parentUniqueId || 'ID Pending'}</Text>
                </div>
            )
        },
        {
            title: 'Relationship',
            dataIndex: 'relationship',
            key: 'rel',
            render: (text) => (
                <Tag
                    color="cyan"
                    style={{
                        borderRadius: 6,
                        border: 'none',
                        padding: '2px 12px',
                        fontSize: 11,
                        textTransform: 'uppercase',
                        fontWeight: 600
                    }}
                >
                    {text}
                </Tag>
            )
        },
        {
            title: 'Phone',
            dataIndex: 'phone',
            key: 'phone',
            render: (text) => <Text style={{ color: colorTextSecondary }}>{text || '-'}</Text>
        },
        {
            title: 'Children',
            key: 'children',
            render: (_, record) => {
                const students = record.students || record.student_student_parentIdToparent || [];
                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {students.length > 0 ? (
                            students.map(s => (
                                <Text key={s.id} style={{ fontSize: 13, color: colorTextSecondary }}>{s?.fullName || 'Unknown Student'}</Text>
                            ))
                        ) : (
                            <Text type="secondary" italic style={{ fontSize: 12 }}>No students</Text>
                        )}
                    </div>
                );
            }
        },
        {
            title: 'Actions',
            key: 'actions',
            align: 'right',
            render: (_, record) => (
                <Button
                    onClick={() => navigate(`/parents/${record.id}`)}
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
            )
        }
    ];

    const parentFormFields = (isEdit = false) => (
        <>
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
                                        return Promise.reject(new Error('Invalid NIC Format (10 chars ending in V/X or 12 digits)'));
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
                    <Form.Item name="occupation" label="Occupation">
                        <Input />
                    </Form.Item>
                </Col>
                <Col span={12}>
                    <Form.Item
                        name="phone"
                        label="Phone Number"
                        rules={[
                            { required: true, message: 'Phone number is required' },
                            {
                                validator: (_, value) => {
                                    if (!value) return Promise.resolve();
                                    const cleaned = value.replace(/[^0-9]/g, '');
                                    const isLocal = /^07[0-9]{8}$/.test(cleaned);
                                    const isIntl = /^947[0-9]{8}$/.test(cleaned);
                                    if (!isLocal && !isIntl) {
                                        return Promise.reject(new Error('Use format 07XXXXXXXX or 947XXXXXXXX'));
                                    }
                                    return Promise.resolve();
                                }
                            }
                        ]}
                    >
                        <Input placeholder="07XXXXXXXX" />
                    </Form.Item>
                </Col>
            </Row>
            <Row gutter={16}>
                <Col span={12}>
                    <Form.Item
                        name="email"
                        label="Email Address"
                        rules={[
                            { required: true, message: 'Email is required' },
                            { type: 'email', message: 'Invalid email format' },
                            {
                                validator: (_, value) => {
                                    if (!value) return Promise.resolve();
                                    const allowedDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'icloud.com'];
                                    const domain = value.split('@')[1];
                                    if (domain && !allowedDomains.includes(domain.toLowerCase())) {
                                        return Promise.reject(new Error(`Only ${allowedDomains.join(', ')} domains are allowed`));
                                    }
                                    return Promise.resolve();
                                }
                            }
                        ]}
                    >
                        <Input placeholder="parent@gmail.com" />
                    </Form.Item>
                </Col>
            </Row>
            <Form.Item name="address" label="Address" rules={[{ required: true, message: 'Address is required' }]}>
                <Input.TextArea rows={2} placeholder="Home address" />
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
                        <Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setIsModalVisible(true); }} size="large" style={{ background: colorPrimary, height: 44, fontWeight: 600, borderRadius: 8 }}>
                            Add Parent
                        </Button>
                    )}
                </div>
            </div>

            <Card bordered={false} style={{ borderRadius: 16, boxShadow: 'none', background: colorBgContainer }} bodyStyle={{ padding: '0 24px' }}>
                <Table
                    columns={columns}
                    dataSource={filteredParents}
                    rowKey="id"
                    loading={loading}
                    pagination={{
                        pageSize: 10,
                        position: ['bottomRight'],
                        showSizeChanger: false
                    }}
                    rowClassName="parent-table-row"
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
                    {parentFormFields(false)}
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
                    {parentFormFields(true)}
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
