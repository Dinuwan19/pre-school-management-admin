import React, { useState, useEffect } from 'react';
import { Card, Typography, Row, Col, Table, Tag, Button, Tabs, message, Spin, Space, Avatar, Badge, DatePicker, Modal, Form, Select, TimePicker } from 'antd';
import {
    ScanOutlined,
    CalendarOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined,
    UserOutlined,
    EditOutlined
} from '@ant-design/icons';
import api from '../../api/client';
import dayjs from 'dayjs';
// Using html5-qrcode for scanner
import { Html5QrcodeScanner } from 'html5-qrcode';

const { Title, Text } = Typography;
const { Option } = Select;

const Attendance = () => {
    const [attendanceData, setAttendanceData] = useState([]);
    const [classrooms, setClassrooms] = useState([]);
    const [selectedClassroom, setSelectedClassroom] = useState(null);
    const [loading, setLoading] = useState(false);
    const [selectedDate, setSelectedDate] = useState(dayjs());
    const [activeTab, setActiveTab] = useState('1');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState(null);
    const [form] = Form.useForm();
    const [bulkLoading, setBulkLoading] = useState(false);

    const fetchClassrooms = async () => {
        try {
            const res = await api.get('/classrooms');
            setClassrooms(res.data);
            if (res.data.length > 0) setSelectedClassroom(res.data[0].id);
        } catch (e) {
            console.error(e);
        }
    };

    const fetchAttendance = async (date) => {
        setLoading(true);
        try {
            const formattedDate = date.format('YYYY-MM-DD');
            const res = await api.get(`/attendance/daily?date=${formattedDate}`);
            setAttendanceData(res.data);
        } catch (error) {
            message.error('Failed to fetch attendance');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchClassrooms();
    }, []);

    useEffect(() => {
        if (activeTab === '1') {
            fetchAttendance(selectedDate);
        }
    }, [selectedDate, activeTab]);

    useEffect(() => {
        if (activeTab === '2') {
            const scanner = new Html5QrcodeScanner("reader", {
                fps: 10,
                qrbox: { width: 250, height: 250 }
            });

            scanner.render(onScanSuccess, onScanFailure);

            return () => {
                scanner.clear().catch(error => console.error("Failed to clear scanner", error));
            };
        }
    }, [activeTab]);

    const onScanSuccess = async (decodedText) => {
        try {
            let studentId;
            try {
                const qrData = JSON.parse(decodedText);
                studentId = qrData.id;
            } catch (e) {
                studentId = decodedText;
            }

            const res = await api.post('/attendance/scan', { studentId });
            message.success(res.data.message);
            fetchAttendance(selectedDate);
        } catch (e) {
            message.error(e.response?.data?.message || "Invalid QR Code");
        }
    };

    const handleBulkMark = async (status) => {
        if (!selectedClassroom) return;
        setBulkLoading(true);
        try {
            await api.post('/attendance/bulk', {
                classroomId: selectedClassroom,
                status,
                date: selectedDate.format('YYYY-MM-DD')
            });
            message.success(`Bulk marked classroom as ${status}`);
            fetchAttendance(selectedDate);
        } catch (error) {
            message.error('Bulk marking failed');
        } finally {
            setBulkLoading(false);
        }
    };

    const handleManualMark = (record) => {
        setSelectedRecord(record);

        // Smart Defaulting
        let defaultStatus = record.status;
        if (record.status === 'NOT_MARKED') {
            defaultStatus = 'PRESENT';
        } else if (record.status === 'PRESENT' && record.checkInTime) {
            // If already in school, assume they want to check out
            defaultStatus = 'COMPLETED';
        }

        form.setFieldsValue({
            status: defaultStatus,
            checkInTime: record.checkInTime ? dayjs(record.checkInTime) : (defaultStatus === 'PRESENT' ? dayjs() : null),
            checkOutTime: record.checkOutTime ? dayjs(record.checkOutTime) : (defaultStatus === 'COMPLETED' ? dayjs() : null),
            reason: ''
        });
        setIsModalOpen(true);
    };

    const onFormSubmit = async (values) => {
        try {
            let finalStatus = values.status;

            // Auto-Late Logic: If marked as PRESENT but time is after 8:30 AM
            if (values.status === 'PRESENT' && values.checkInTime) {
                const checkInTime = dayjs(values.checkInTime);
                const lateThreshold = dayjs(values.checkInTime).hour(8).minute(30);
                if (checkInTime.isAfter(lateThreshold)) {
                    finalStatus = 'LATE';
                }
            }

            const payload = {
                studentId: selectedRecord.studentId,
                status: finalStatus,
                date: selectedDate.format('YYYY-MM-DD'),
                // Only send times if not ABSENT
                checkInTime: values.status !== 'ABSENT' && values.checkInTime ? values.checkInTime.toISOString() : null,
                checkOutTime: (values.status === 'COMPLETED' || values.status === 'EXCUSED') && values.checkOutTime ? values.checkOutTime.toISOString() : null,
                reason: values.reason
            };
            await api.post('/attendance/manual', payload);
            message.success(finalStatus === 'LATE' ? 'Attendance updated (Marked LATE)' : 'Attendance updated');
            setIsModalOpen(false);
            fetchAttendance(selectedDate);
        } catch (error) {
            message.error(error.response?.data?.message || 'Update failed');
        }
    };

    const columns = [
        {
            title: 'Student',
            key: 'student',
            render: (_, record) => (
                <Space>
                    <Avatar src={record.student?.photoUrl} icon={<UserOutlined />} />
                    <div>
                        <Text strong>{record.student?.fullName}</Text>
                        <Text type="secondary" style={{ display: 'block', fontSize: 11 }}>{record.student?.studentUniqueId}</Text>
                    </div>
                </Space>
            )
        },
        {
            title: 'Classroom',
            dataIndex: ['student', 'classroom', 'name'],
            key: 'class',
            filters: classrooms.map(c => ({ text: c.name, value: c.name })),
            onFilter: (value, record) => record.student?.classroom?.name === value,
        },
        {
            title: 'Check In',
            dataIndex: 'checkInTime',
            render: (time) => time ? dayjs(time).format('hh:mm A') : <Text type="secondary">-</Text>
        },
        {
            title: 'Check Out',
            dataIndex: 'checkOutTime',
            render: (time) => time ? dayjs(time).format('hh:mm A') : <Text type="secondary">-</Text>
        },
        {
            title: 'Status',
            key: 'status',
            render: (_, record) => {
                const status = record.status;
                if (status === 'COMPLETED') return <Tag color="success">COMPLETED</Tag>;
                if (status === 'PRESENT') return <Tag color="processing">IN SCHOOL</Tag>;
                if (status === 'ABSENT') return <Tag color="error">ABSENT</Tag>;
                if (status === 'LATE') return <Tag color="warning">LATE</Tag>;
                return <Tag color="default">NOT MARKED</Tag>;
            }
        },
        {
            title: 'Action',
            key: 'action',
            render: (_, record) => (
                <Button
                    type="link"
                    icon={<EditOutlined />}
                    onClick={() => handleManualMark(record)}
                >
                    Manual
                </Button>
            )
        }
    ];

    const items = [
        {
            key: '1',
            label: <><CalendarOutlined /> Daily List</>,
            children: (
                <div style={{ marginTop: 16 }}>
                    <Row gutter={16} align="middle" style={{ marginBottom: 20 }}>
                        <Col span={6}>
                            <DatePicker value={selectedDate} onChange={setSelectedDate} allowClear={false} style={{ width: '100%' }} />
                        </Col>
                        <Col span={10}>
                            <Space>
                                <Select
                                    placeholder="Select Class"
                                    style={{ width: 180 }}
                                    value={selectedClassroom}
                                    onChange={setSelectedClassroom}
                                >
                                    {classrooms.map(c => <Option key={c.id} value={c.id}>{c.name}</Option>)}
                                </Select>
                                <Button
                                    type="primary"
                                    ghost
                                    loading={bulkLoading}
                                    onClick={() => handleBulkMark('PRESENT')}
                                >
                                    Mark All Present
                                </Button>
                                <Button
                                    danger
                                    ghost
                                    loading={bulkLoading}
                                    onClick={() => handleBulkMark('ABSENT')}
                                >
                                    Mark All Absent
                                </Button>
                            </Space>
                        </Col>
                        <Col span={8} style={{ textAlign: 'right' }}>
                            <Space>
                                <Badge status="default" text="Not Marked" />
                                <Badge status="processing" text="In School" />
                                <Badge status="success" text="Completed" />
                                <Badge status="error" text="Absent" />
                            </Space>
                        </Col>
                    </Row>

                    <Table
                        dataSource={attendanceData}
                        columns={columns}
                        rowKey="studentId"
                        loading={loading}
                        pagination={{ pageSize: 15 }}
                    />
                </div>
            )
        },
        {
            key: '2',
            label: <><ScanOutlined /> QR Scanner</>,
            children: (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                    <Card style={{ maxWidth: 600, margin: '0 auto', borderRadius: 16 }}>
                        <Title level={4}>Scan Student QR Code</Title>
                        <Text type="secondary" style={{ display: 'block', marginBottom: 20 }}>
                            Use the camera to scan the student's ID badge for check-in or check-out.
                        </Text>
                        <div id="reader" style={{ width: '100%', borderRadius: 12, overflow: 'hidden' }}></div>
                    </Card>
                </div>
            )
        }
    ];

    return (
        <div style={{ paddingBottom: 40 }}>
            <div style={{ marginBottom: 24 }}>
                <Title level={3}>Attendance Tracking</Title>
                <Text type="secondary">Monitor and manually override student attendance</Text>
            </div>

            <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
                <Tabs activeKey={activeTab} onChange={setActiveTab} items={items} />
            </Card>

            <Modal
                title={`Manual Attendance: ${selectedRecord?.student?.fullName}`}
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                onOk={() => form.submit()}
                destroyOnClose
            >
                <Form form={form} layout="vertical" onFinish={onFormSubmit} style={{ marginTop: 20 }}>
                    <Form.Item name="status" label="Attendance Status" rules={[{ required: true }]}>
                        <Select onChange={(val) => {
                            if (val === 'ABSENT') {
                                form.setFieldsValue({ checkInTime: null, checkOutTime: null });
                            }
                        }}>
                            <Option value="PRESENT">PRESENT (IN SCHOOL)</Option>
                            <Option value="ABSENT">ABSENT</Option>
                            <Option value="LATE">LATE</Option>
                            <Option value="COMPLETED">COMPLETED (CHECKED OUT)</Option>
                            <Option value="EXCUSED">EXCUSED</Option>
                        </Select>
                    </Form.Item>

                    <Form.Item noStyle shouldUpdate={(prev, curr) => prev.status !== curr.status}>
                        {({ getFieldValue }) => {
                            const status = getFieldValue('status');
                            const showCheckIn = status !== 'ABSENT';
                            const showCheckOut = status === 'COMPLETED' || status === 'EXCUSED';

                            return (
                                showCheckIn && (
                                    <Row gutter={16}>
                                        <Col span={showCheckOut ? 12 : 24}>
                                            <Form.Item name="checkInTime" label="Check-In Time">
                                                <TimePicker format="hh:mm A" style={{ width: '100%' }} />
                                            </Form.Item>
                                        </Col>
                                        {showCheckOut && (
                                            <Col span={12}>
                                                <Form.Item name="checkOutTime" label="Check-Out Time">
                                                    <TimePicker format="hh:mm A" style={{ width: '100%' }} />
                                                </Form.Item>
                                            </Col>
                                        )}
                                    </Row>
                                )
                            );
                        }}
                    </Form.Item>

                    <Form.Item name="reason" label="Reason for Override" rules={[{ required: true, message: 'Please provide a reason for manual change' }]}>
                        <Select placeholder="Select a reason" showSearch>
                            <Option value="Forgot ID Card">Forgot ID Card</Option>
                            <Option value="Damaged QR Code">Damaged QR Code</Option>
                            <Option value="System Lag">System Lag</Option>
                            <Option value="Teacher Request">Teacher Request</Option>
                            <Option value="Bulk Marking">Bulk Marking</Option>
                            <Option value="Other">Other</Option>
                        </Select>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default Attendance;
