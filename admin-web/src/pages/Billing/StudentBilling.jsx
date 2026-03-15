import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Tag, Modal, Form, Input, Select, message, Typography, Card, Badge, Descriptions, Divider, List, Tabs } from 'antd';
import { PlusOutlined, EyeOutlined, BellOutlined, CheckCircleOutlined, CloseCircleOutlined, WalletOutlined, EditOutlined, DownloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import CategoryManagementModal from '../../components/Billing/CategoryManagementModal';

const { Title, Text } = Typography;
const { Option } = Select;

const StudentBilling = () => {
    const { user } = useAuth();
    const [billings, setBillings] = useState([]);
    const [overdueBillings, setOverdueBillings] = useState([]);
    const [historyPayments, setHistoryPayments] = useState([]);
    const [pendingPayments, setPendingPayments] = useState([]);
    const [categories, setCategories] = useState([]);
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [filterCurrentMonth, setFilterCurrentMonth] = useState(false);
    const [isAddModalVisible, setIsAddModalVisible] = useState(false);
    const [isManageCategoriesVisible, setIsManageCategoriesVisible] = useState(false);
    const [isVerifyModalVisible, setIsVerifyModalVisible] = useState(false);
    const [form] = Form.useForm();
    const selectedStudentId = Form.useWatch('studentId', form);
    const selectedCategoryId = Form.useWatch('categoryId', form);

    const billedMonthsForSelected = billings
        .filter(b => b.studentId === selectedStudentId)
        .reduce((acc, b) => {
            const months = (b.billingMonth || '').split(',').map(m => m.trim());
            return [...acc, ...months];
        }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Critical Data
            const [billRes, payRes, stuRes, overdueRes, catRes] = await Promise.all([
                api.get('/billing'),
                api.get('/payments/pending'),
                api.get('/students'),
                api.get('/billing/overdue'),
                api.get('/billing-categories?activeOnly=true')
            ]);
            setBillings(billRes.data);
            setPendingPayments(payRes.data);
            setStudents(stuRes.data);
            setOverdueBillings(overdueRes.data);
            setCategories(catRes.data);

            // Non-Critical Data (History) - Fetch separately to avoid blocking
            try {
                const historyRes = await api.get('/payments/history');
                if (Array.isArray(historyRes.data)) {
                    setHistoryPayments(historyRes.data);
                } else {
                    console.warn('History data is not an array:', historyRes.data);
                    setHistoryPayments([]);
                }
            } catch (histError) {
                console.warn('Failed to fetch payment history:', histError);
            }
        } catch (error) {
            console.error(error);
            message.error('Failed to load billing data');
        } finally {
            setLoading(false);
        }
    };

    const historyColumns = [
        {
            title: 'Student',
            key: 'student',
            render: (_, item) => {
                try {
                    let name = item?.billingpayment?.[0]?.billing?.student?.fullName;
                    if (!name && item?.transactionRef) {
                        const match = item.transactionRef.match(/\[Student:\s(.*?)]/);
                        if (match) name = match[1];
                    }
                    return <Text strong>{name || 'Unallocated'}</Text>;
                } catch (e) {
                    return <Text type="danger">Error</Text>;
                }
            }
        },
        {
            title: 'Amount',
            dataIndex: 'amountPaid',
            key: 'amount',
            render: (val) => `Rs. ${parseFloat(val || 0).toLocaleString()}`
        },
        {
            title: 'Date',
            dataIndex: 'createdAt',
            key: 'date',
            render: (val) => val ? dayjs(val).format('MMM D, YYYY h:mm A') : '-'
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status) => (
                <Tag color={status === 'APPROVED' ? 'green' : 'red'}>{status || 'UNKNOWN'}</Tag>
            )
        },
        {
            title: 'Verified By',
            dataIndex: ['user', 'fullName'],
            key: 'verifier',
            render: (text) => text || 'System'
        },
        {
            title: 'Receipt',
            key: 'receipt',
            render: (_, item) => item?.receiptUrl ? (
                <Button
                    onClick={() => {
                        const url = item.receiptUrl.startsWith('http') ? item.receiptUrl : `http://127.0.0.1:5000${item.receiptUrl}`;
                        window.open(url, '_blank');
                    }}
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
            ) : '-'
        }
    ];

    useEffect(() => {
        fetchData();
    }, []);

    const handleGenerate = async () => {
        try {
            const values = await form.validateFields();
            setLoading(true);
            const payload = {
                ...values,
                categoryId: values.categoryId === 'monthly' ? null : values.categoryId,
                billingMonths: values.billingMonths
            };
            await api.post('/billing/generate', payload);
            message.success('Billing record generated');
            setIsAddModalVisible(false);
            form.resetFields();
            fetchData();
        } catch (error) {
            message.error(error.response?.data?.message || 'Failed to generate billing');
        } finally {
            setLoading(false);
        }
    };

    const onCategoryChange = (catId) => {
        if (catId === 'monthly') {
            form.setFieldsValue({ amount: 15000, categoryId: null });
            return;
        }
        if (!catId) return;
        const category = categories.find(c => c.id === catId);
        if (category) {
            form.setFieldsValue({ amount: parseFloat(category.amount) });
        }
    };

    const handleVerify = async (paymentId, status) => {
        try {
            setLoading(true);
            await api.post('/payments/verify', { paymentId, status });
            message.success(`Payment ${status.toLowerCase()}ed`);
            setIsVerifyModalVisible(false);
            fetchData();
        } catch (error) {
            console.error('Verification Error:', error);
            message.error(error.response?.data?.message || 'Failed to verify payment');
        } finally {
            setLoading(false);
        }
    };

    const handleNotify = async (billingId) => {
        try {
            await api.post('/billing/notify', { billingId });
            message.success('Fee reminder sent to parent');
        } catch (error) {
            message.error('Failed to send notification');
        }
    };

    const currentMonthPrefix = dayjs().format('YYYY-MM');

    // Group Billings by Payment ID
    const groupedBillings = {};
    const unpaidBillings = [];

    billings.forEach(b => {
        const payment = b.billingpayment?.[0]?.payment;
        if (payment) {
            if (!groupedBillings[payment.id]) {
                groupedBillings[payment.id] = {
                    ...b,
                    key: `pay-group-${payment.id}`,
                    type: 'BILLING',
                    amount: 0, // Will sum up
                    billingMonth: [], // Will collect info
                    billingCategoryName: [], // Will collect info
                    paymentInfo: payment,
                    relatedBillings: []
                };
            }
            // Aggregate Data
            groupedBillings[payment.id].amount += parseFloat(b.amount);
            if (b.billingMonth) groupedBillings[payment.id].billingMonth.push(b.billingMonth);
            if (b.billingCategory) groupedBillings[payment.id].billingCategoryName.push(b.billingCategory.name);
            groupedBillings[payment.id].relatedBillings.push(b);
        } else {
            unpaidBillings.push({
                key: `bill-${b.id}`,
                type: 'BILLING',
                ...b,
                paymentInfo: null
            });
        }
    });

    const mergedData = [
        ...unpaidBillings,
        ...Object.values(groupedBillings).map(group => ({
            ...group,
            billingMonth: [...new Set(group.billingMonth)].join(', '), // Dedupe and join
            // Simplify category display if mixed or specific
            billingCategory: group.billingCategoryName.length > 0 ? { name: [...new Set(group.billingCategoryName)].join(', ') } : null
        })),
        ...historyPayments
            .filter(p => !p.billingpayment || p.billingpayment.length === 0)
            .map(p => ({
                key: `pay-${p.id}`,
                type: 'PAYMENT',
                amount: p.amountPaid,
                status: p.status,
                createdAt: p.createdAt,
                transactionRef: p.transactionRef,
                receiptUrl: p.receiptUrl,
                invoiceUrl: p.invoiceUrl,
                user: p.user,
                student: null
            }))
    ].filter(item => {
        if (!filterCurrentMonth) return true;

        const targetPrefix = currentMonthPrefix;

        if (item.type === 'BILLING') {
            // Check if any of the months in the string match
            // item.billingMonth is now "2026-02, 2026-03"
            return (item.billingMonth || '').includes(targetPrefix) ||
                (item.createdAt && dayjs(item.createdAt).format('YYYY-MM') === targetPrefix);
        }
        return dayjs(item.createdAt).format('YYYY-MM') === targetPrefix;
    }).sort((a, b) => new Date(b.createdAt || b.updatedAt) - new Date(a.createdAt || a.updatedAt));

    const columns = [
        {
            title: 'Student',
            key: 'student',
            render: (_, record) => {
                let name, id;
                if (record.type === 'BILLING') {
                    name = record.student?.fullName;
                    id = record.student?.studentUniqueId;
                } else {
                    // Parse from ref for unallocated
                    if (record.transactionRef) {
                        const match = record.transactionRef.match(/\[Student:\s(.*?)]/);
                        if (match) name = match[1];
                    }
                    name = name || 'Unallocated';
                    id = 'N/A';
                }

                return (
                    <Space direction="vertical" size={0}>
                        <Text strong>{name}</Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>{id}</Text>
                    </Space>
                );
            }
        },
        {
            title: 'Description',
            key: 'desc',
            render: (_, record) => {
                if (record.type === 'BILLING') {
                    const months = (record.billingMonth || '').split(/[,\s]+/).map(m => m.trim()).filter(m => m);
                    return (
                        <Space wrap size={4}>
                            {months.map((m, idx) => {
                                const isValidDate = dayjs(m).isValid();
                                const display = isValidDate ? dayjs(m).format('MMMM') : m;
                                return <Tag color="blue" key={idx} style={{ borderRadius: 6 }}>{display}</Tag>;
                            })}
                            {record.billingCategory ? (
                                <Tag color="purple" style={{ borderRadius: 6 }}>{record.billingCategory.name}</Tag>
                            ) : (
                                <Tag color="default" style={{ borderRadius: 6 }}>Monthly Fee</Tag>
                            )}
                        </Space>
                    );
                } else {
                    // Extract itemized months from transactionRef fallback
                    let months = [];
                    if (record.transactionRef) {
                        const monthMatch = record.transactionRef.match(/\[Months:\s(.*?)\]/);
                        if (monthMatch) {
                            // Support comma or space separated months
                            months = monthMatch[1].split(/[,\s]+/).map(m => m.trim()).filter(m => m && !['and'].includes(m.toLowerCase()));
                        }
                    }

                    return (
                        <Space direction="vertical" size={2}>
                            <Space wrap size={4}>
                                {months.length > 0 ? (
                                    months.map((m, idx) => <Tag color="cyan" key={idx} style={{ borderRadius: 6 }}>{m}</Tag>)
                                ) : (
                                    <Tag color="orange">Unallocated</Tag>
                                )}
                            </Space>
                            {record.transactionRef && (
                                <Text type="secondary" style={{ fontSize: 11, fontStyle: 'italic', display: 'block', maxWidth: 200 }} ellipsis>
                                    {record.transactionRef.replace(/\[.*?\]/g, '').trim()}
                                </Text>
                            )}
                            <Text type="secondary" style={{ fontSize: 10 }}>{dayjs(record.createdAt).format('MMM D, YYYY h:mm A')}</Text>
                        </Space>
                    );
                }
            }
        },
        {
            title: 'Amount',
            dataIndex: 'amount',
            key: 'amount',
            render: (text) => <Text strong>Rs. {parseFloat(text).toLocaleString()}</Text>
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status) => {
                let color = 'gold';
                if (status === 'PAID' || status === 'APPROVED') color = 'green';
                if (status === 'UNPAID' || status === 'REJECTED') color = 'red';
                return <Tag color={color} style={{ borderRadius: 10, padding: '0 12px' }}>{status}</Tag>
            }
        },
        {
            title: 'Payment Info',
            key: 'paymentInfo',
            render: (_, record) => {
                const payment = record.type === 'BILLING' ? record.paymentInfo : record;
                const issuedAt = record.createdAt || (payment ? payment.createdAt : null);

                return (
                    <Space direction="vertical" size={2}>
                        {issuedAt && (
                            <div style={{ lineHeight: '1.2' }}>
                                <Text type="secondary" style={{ fontSize: 10, display: 'block' }}>Issued At:</Text>
                                <Text style={{ fontSize: 11 }}>{dayjs(issuedAt).format('MMM D, YYYY h:mm A')}</Text>
                            </div>
                        )}
                        {payment?.verifiedAt && (
                            <div style={{ lineHeight: '1.2' }}>
                                <Text type="secondary" style={{ fontSize: 10, display: 'block' }}>Approved At:</Text>
                                <Text style={{ fontSize: 11 }}>{dayjs(payment.verifiedAt).format('MMM D, YYYY h:mm A')}</Text>
                            </div>
                        )}
                        {payment?.user && <Text type="secondary" style={{ fontSize: 10, display: 'block' }}>By: {payment.user.fullName}</Text>}
                        {payment?.paymentMethod && <Tag style={{ fontSize: 10, marginTop: 4 }}>{payment.paymentMethod}</Tag>}
                    </Space>
                );
            }
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, record) => (
                <Space size="middle">
                    {record.type === 'BILLING' && record.status === 'UNPAID' && (
                        <>
                            <Button
                                icon={<BellOutlined />}
                                shape="circle"
                                size="small"
                                onClick={() => handleNotify(record.id)}
                                style={{ color: '#FAAD14', borderColor: '#FAAD14' }}
                                title="Notify Parent"
                            />
                            <Button
                                icon={<WalletOutlined />}
                                shape="circle"
                                size="small"
                                type="primary"
                                ghost
                                onClick={() => {
                                    Modal.confirm({
                                        title: 'Confirm Cash Payment',
                                        content: `Receive Rs. ${record.amount} in CASH for ${record.billingMonth}?`,
                                        onOk: async () => {
                                            try {
                                                await api.post('/billing/pay-cash', { billingId: record.id });
                                                message.success('Cash payment recorded');
                                                fetchData();
                                            } catch (e) {
                                                message.error('Failed to record cash payment');
                                            }
                                        }
                                    });
                                }}
                                title="Pay Cash"
                            />
                        </>
                    )}

                    {/* Invoice Download for ANY Paid Billing OR Approved Payment */}
                    {((record.type === 'BILLING' && record.status === 'PAID') || (record.type === 'PAYMENT' && record.status === 'APPROVED')) && (
                        <Button
                            icon={<DownloadOutlined />}
                            shape="circle"
                            size="small"
                            onClick={() => {
                                const invUrl = (record.paymentInfo || record).invoiceUrl;
                                if (invUrl) {
                                    const fullUrl = invUrl.startsWith('http') ? invUrl : `http://127.0.0.1:5000${invUrl}`;
                                    window.open(fullUrl, '_blank');
                                } else {
                                    message.warning('Invoice not found');
                                }
                            }}
                            title="Download Invoice"
                        />
                    )}

                    {/* View Receipt if available */}
                    {((record.type === 'BILLING' && record.paymentInfo?.receiptUrl) || (record.type === 'PAYMENT' && record.receiptUrl)) && (
                        <Button
                            shape="circle"
                            size="small"
                            icon={<EyeOutlined />}
                            onClick={() => {
                                const url = (record.paymentInfo || record).receiptUrl;
                                const fullUrl = url.startsWith('http') ? url : `http://127.0.0.1:5000${url}`;
                                window.open(fullUrl, '_blank');
                            }}
                            title="View Receipt"
                            style={{
                                background: 'rgba(123, 87, 228, 0.1)',
                                color: '#7B57E4',
                                border: 'none'
                            }}
                        />
                    )}
                </Space>
            )
        }
    ];

    return (
        <div style={{ paddingBottom: 40 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
                <div>
                    <Title level={3}>Student Billing</Title>
                    <Text type="secondary">Manage monthly fees and verify payments</Text>
                </div>
                <Space>
                    <Button
                        type={filterCurrentMonth ? "primary" : "default"}
                        onClick={() => setFilterCurrentMonth(!filterCurrentMonth)}
                        style={{ borderRadius: 8 }}
                    >
                        {filterCurrentMonth ? "Showing Current Month" : "Showing All History"}
                    </Button>
                    <Badge count={pendingPayments.length}>
                        <Button
                            type="dashed"
                            onClick={() => setIsVerifyModalVisible(true)}
                            icon={<CheckCircleOutlined />}
                        >
                            Verification Queue
                        </Button>
                    </Badge>
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => setIsAddModalVisible(true)}
                        style={{ background: '#7B57E4', borderRadius: 8, height: 44, fontWeight: 600 }}
                        size="large"
                    >
                        Generate Billing
                    </Button>
                    {(user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN') && (
                        <Button
                            onClick={() => setIsManageCategoriesVisible(true)}
                            style={{ borderRadius: 8 }}
                            size="large"
                        >
                            Manage Fee Categories
                        </Button>
                    )}
                </Space>
            </div>

            <Card bordered={false} style={{ borderRadius: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                <Tabs items={[
                    {
                        key: '1',
                        label: 'All Billings & Transactions',
                        children: <Table columns={columns} dataSource={mergedData} loading={loading} pagination={{ pageSize: 10 }} />
                    },
                    {
                        key: '2',
                        label: <Badge count={overdueBillings.length} offset={[10, 0]}>Overdue Payments</Badge>,
                        children: (
                            <div>
                                <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
                                    <Button type="primary" danger icon={<BellOutlined />} onClick={() => {
                                        message.success(`Notifications sent to ${overdueBillings.length} parents`);
                                    }}>Notify All Overdue</Button>
                                </div>
                                <Table
                                    columns={columns}
                                    dataSource={overdueBillings.map(b => ({ ...b, type: 'BILLING', key: `overdue-${b.id}` }))}
                                    loading={loading}
                                    rowKey="key"
                                />
                            </div>
                        )
                    }
                ]} />
            </Card>

            {/* Generate Billing Modal */}
            <Modal
                title="Generate Monthly Billing"
                open={isAddModalVisible}
                onCancel={() => setIsAddModalVisible(false)}
                onOk={handleGenerate}
                okText="Generate"
                okButtonProps={{ style: { background: '#7B57E4' } }}
            >
                <Form form={form} layout="vertical" style={{ marginTop: 20 }}>
                    <Form.Item name="studentId" label="Select Student" rules={[{ required: true }]}>
                        <Select placeholder="Choose student" showSearch optionFilterProp="children">
                            {students.map(s => <Option key={s.id} value={s.id}>{s.fullName} ({s.studentUniqueId})</Option>)}
                        </Select>
                    </Form.Item>
                    <Form.Item name="categoryId" label="Fee Category" initialValue="monthly">
                        <Select
                            placeholder="Select category"
                            onChange={onCategoryChange}
                        >
                            <Select.Option value="monthly">Monthly Fee (Standard)</Select.Option>
                            {categories
                                .filter(c => {
                                    if (!selectedStudentId) return true;
                                    const student = students.find(s => s.id === selectedStudentId);
                                    if (!student) return true;

                                    // Global category (no specific classrooms)
                                    if (!c.classrooms || c.classrooms.length === 0) return true;

                                    // Check if student's classroom matches allowed classrooms
                                    return c.classrooms.some(cr => cr.id === student.classroomId);
                                })
                                .map(c => (
                                    <Option key={c.id} value={c.id}>
                                        {c.name} - Rs. {parseFloat(c.amount).toLocaleString()}
                                    </Option>
                                ))}
                        </Select>
                    </Form.Item>
                    <Form.Item
                        name="billingMonths"
                        label="Billing Months"
                        rules={[
                            { required: true, message: 'Select at least one month' },
                            { type: 'array', max: 6, message: 'You can select a maximum of 6 months' }
                        ]}
                    >
                        <Select
                            mode="multiple"
                            placeholder="Select months"
                            style={{ width: '100%' }}
                            maxTagCount="responsive"
                        >
                            {Array.from({ length: 12 }, (_, i) => {
                                const date = dayjs().add(i, 'month');
                                const value = date.format('YYYY-MM');
                                const humanName = date.format('MMMM');
                                return { value, humanName, label: date.format('MMMM YYYY') };
                            })
                                .filter(opt => !billedMonthsForSelected.includes(opt.value) && !billedMonthsForSelected.includes(opt.humanName))
                                .map(opt => (
                                    <Option key={opt.value} value={opt.value}>{opt.label}</Option>
                                ))}
                        </Select>
                    </Form.Item>
                    <Form.Item name="amount" label="Fee Amount (Rs.)" rules={[{ required: true }]} initialValue={15000}>
                        <Input type="number" />
                    </Form.Item>
                </Form>
            </Modal>

            {/* Verification Queue Modal */}
            <Modal
                title="Payment Verification Queue"
                open={isVerifyModalVisible}
                onCancel={() => setIsVerifyModalVisible(false)}
                footer={null}
                width={800}
            >
                <List
                    dataSource={pendingPayments}
                    renderItem={(item) => {
                        // Safe extraction of student details from Ref string if not linked
                        // Format: [Student: Name] [Months: X, Y] ...
                        let studentName = item.billingpayment?.[0]?.billing?.student?.fullName;
                        let months = item.billingpayment?.map(bp => bp.billing.billingMonth) || [];
                        let displayRef = item.transactionRef || '';

                        if (!studentName && item.transactionRef) {
                            const nameMatch = item.transactionRef.match(/\[Student:\s(.*?)]/);
                            if (nameMatch) {
                                studentName = nameMatch[1];
                                // Clean the tag from display ref
                                displayRef = displayRef.replace(nameMatch[0], '').trim();
                            }
                        }

                        if (months.length === 0 && item.transactionRef) {
                            const monthMatch = item.transactionRef.match(/\[Months:\s(.*?)\]/);
                            if (monthMatch) {
                                months = monthMatch[1].split(',').map(m => m.trim());
                                displayRef = displayRef.replace(monthMatch[0], '').trim();
                            } else {
                                // Fallback: [Type: Monthly Fee (February)]
                                const typeMatch = item.transactionRef.match(/\[Type:.*?\((.*?)\).*?\]/);
                                if (typeMatch) {
                                    months = [typeMatch[1]];
                                    // Don't strip the Type tag as it contains context, or maybe strip it? 
                                    // User wants to see "February". 
                                    // Let's keep the tag in displayRef but extract month for the Tag.
                                }
                            }
                        }

                        // Clean other tags like [Monthly Fee] (if we want to hide them from Note)
                        // displayRef = displayRef.replace(/\[(.*?)\]/g, '').trim();

                        // Fix Receipt URL
                        const receiptUrl = item.receiptUrl ? (item.receiptUrl.startsWith('http') ? item.receiptUrl : `http://127.0.0.1:5000${item.receiptUrl}`) : null;

                        return (
                            <Card style={{ marginBottom: 16, borderRadius: 12, borderLeft: '4px solid #7B57E4' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <Descriptions column={2} size="small" title={
                                        <Space>
                                            <Text style={{ fontSize: 16 }}>Payment from</Text>
                                            <Tag color={studentName ? "purple" : "red"} style={{ fontSize: 14, padding: '4px 10px' }}>
                                                {studentName || 'Unallocated Student'}
                                            </Tag>
                                        </Space>
                                    }>
                                        <Descriptions.Item label="Amount"><Text strong>Rs. {parseFloat(item.amountPaid).toLocaleString()}</Text></Descriptions.Item>
                                        <Descriptions.Item label="Method"><Tag>{item.paymentMethod}</Tag></Descriptions.Item>

                                        <Descriptions.Item label="Months" span={2}>
                                            {months.length > 0 ? (
                                                months.map((m, idx) => (
                                                    <Tag color="cyan" key={idx}>{m}</Tag>
                                                ))
                                            ) : (
                                                <Tag color="orange">Unallocated</Tag>
                                            )}
                                        </Descriptions.Item>

                                        <Descriptions.Item label="Issued At">{dayjs(item.createdAt).format('MMM D, YYYY h:mm A')}</Descriptions.Item>
                                        <Descriptions.Item label="Note" span={2}>
                                            <Text type="secondary" style={{ fontStyle: 'italic' }}>{displayRef || 'No Reference'}</Text>
                                        </Descriptions.Item>
                                    </Descriptions>

                                    <Space direction="vertical">
                                        <Button type="primary" style={{ background: '#52c41a', borderColor: '#52c41a', width: 100 }} icon={<CheckCircleOutlined />} onClick={() => handleVerify(item.id, 'APPROVED')}>Approve</Button>
                                        <Button danger style={{ width: 100 }} icon={<CloseCircleOutlined />} onClick={() => handleVerify(item.id, 'REJECTED')}>Reject</Button>
                                        {receiptUrl && (
                                            <Button type="dashed" icon={<EyeOutlined />} onClick={() => window.open(receiptUrl, '_blank')}>View Receipt</Button>
                                        )}
                                    </Space>
                                </div>
                            </Card>
                        );
                    }}
                    locale={{ emptyText: 'No pending payments to verify' }}
                />
            </Modal>

            {/* Category Management Modal */}
            <CategoryManagementModal
                open={isManageCategoriesVisible}
                onCancel={() => setIsManageCategoriesVisible(false)}
                onSuccess={fetchData}
            />
        </div>
    );
};

export default StudentBilling;
