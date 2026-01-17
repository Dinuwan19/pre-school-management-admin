import React, { useState, useEffect } from 'react';
import { Card, Typography, Row, Col, Table, Tag, Button, Tabs, message, Spin, Space, Avatar, Badge, DatePicker, Modal } from 'antd';
import {
    ScanOutlined,
    CalendarOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined,
    UserOutlined
} from '@ant-design/icons';
import api from '../../api/client';
import dayjs from 'dayjs';
// Using html5-qrcode for scanner
import { Html5QrcodeScanner } from 'html5-qrcode';

const { Title, Text } = Typography;

const Attendance = () => {
    const [attendanceData, setAttendanceData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedDate, setSelectedDate] = useState(dayjs());
    const [activeTab, setActiveTab] = useState('1');

    const fetchAttendance = async (date) => {
        setLoading(true);
        try {
            const formattedDate = date.format('YYYY-MM-DD');
            const res = await api.get(`/attendance/daily?date=${formattedDate}`);
            setAttendanceData(res.data);
        } catch (error) {
            message.error(error.errorMessage || 'Failed to fetch attendance');
        } finally {
            setLoading(false);
        }
    };

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
            const qrData = JSON.parse(decodedText);
            const studentId = qrData.id;

            // Show selection for check-in or check-out? 
            // Simplified: logic in backend or modal? 
            // Let's assume a student is checking IN if no record, and OUT otherwise? 
            // Or just prompt. 
            Modal.confirm({
                title: 'Mark Attendance',
                content: `Student: ${qrData.name} - What action would you like to take?`,
                okText: 'Check In',
                cancelText: 'Check Out',
                onOk: () => submitAttendance(studentId, 'CHECK_IN'),
                onCancel: (e) => {
                    if (e.triggerCancel) return; // ignore close
                    submitAttendance(studentId, 'CHECK_OUT');
                }
            });
        } catch (e) {
            message.error("Invalid QR Code");
        }
    };

    const submitAttendance = async (studentId, type) => {
        try {
            await api.post('/attendance/mark', { studentId, type });
            message.success(`Student ${type === 'CHECK_IN' ? 'Checked In' : 'Checked Out'} Successfully`);
        } catch (error) {
            message.error(error.response?.data?.message || 'Failed to mark attendance');
        }
    };

    const onScanFailure = (error) => {
        // quiet fail
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
        },
        {
            title: 'Check In',
            dataIndex: 'checkInTime',
            render: (time) => time ? dayjs(time).format('hh:mm A') : <Tag color="default">Pending</Tag>
        },
        {
            title: 'Check Out',
            dataIndex: 'checkOutTime',
            render: (time) => time ? dayjs(time).format('hh:mm A') : <Tag color="default">-</Tag>
        },
        {
            title: 'Status',
            key: 'status',
            render: (_, record) => (
                record.checkOutTime ? <Tag color="success">Completed</Tag> :
                    record.checkInTime ? <Tag color="processing">In School</Tag> :
                        <Tag color="error">Absent</Tag>
            )
        }
    ];

    const items = [
        {
            key: '1',
            label: <><CalendarOutlined /> Daily List</>,
            children: (
                <div style={{ marginTop: 16 }}>
                    <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <DatePicker value={selectedDate} onChange={setSelectedDate} allowClear={false} />
                        <Space>
                            <Badge status="processing" text="In School" />
                            <Badge status="success" text="Completed" />
                        </Space>
                    </div>
                    <Table
                        dataSource={attendanceData}
                        columns={columns}
                        rowKey="id"
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
                <Text type="secondary">Monitor student arrivals and departures</Text>
            </div>

            <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
                <Tabs activeKey={activeTab} onChange={setActiveTab} items={items} />
            </Card>
        </div>
    );
};

export default Attendance;
