import React, { useState, useEffect } from 'react';
import { Typography, Card, Table, Tag, Input, Space, Button, message, Tooltip, Grid } from 'antd';
import { SearchOutlined, ReloadOutlined, HistoryOutlined, UserOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../api/client';

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

const Logs = () => {
    const screens = useBreakpoint();
    const isMobile = !screens.md;
    const [loading, setLoading] = useState(false);
    const [logs, setLogs] = useState([]);
    const [pagination, setPagination] = useState({
        current: 1,
        pageSize: 50,
        total: 0
    });
    const [searchText, setSearchText] = useState('');

    const fetchLogs = async (page = 1, limit = 50, search = '') => {
        setLoading(true);
        try {
            const params = {
                page,
                limit,
                ...(search && { action: search })
            };
            const res = await api.get('/audit-logs', { params });
            setLogs(res.data.data);
            setPagination({
                ...pagination,
                current: page,
                total: res.data.pagination.total
            });
        } catch (error) {
            console.error('Failed to fetch audit logs', error);
            message.error('Failed to load system logs');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    const handleTableChange = (pag) => {
        fetchLogs(pag.current, pag.pageSize, searchText);
    };

    const handleSearch = (value) => {
        setSearchText(value);
        fetchLogs(1, pagination.pageSize, value);
    };

    const columns = [
        {
            title: 'Time',
            dataIndex: 'actionTime',
            key: 'actionTime',
            width: isMobile ? 120 : 180,
            render: (time) => (
                <Text type="secondary" style={{ fontSize: isMobile ? 11 : 13 }}>
                    {dayjs(time).format(isMobile ? 'MM-DD HH:mm' : 'YYYY-MM-DD HH:mm:ss')}
                </Text>
            ),
            sorter: (a, b) => new Date(a.actionTime) - new Date(b.actionTime),
        },
        {
            title: 'User',
            dataIndex: 'user',
            key: 'user',
            width: isMobile ? 150 : 200,
            render: (user) => (
                <Space size={isMobile ? 4 : 8}>
                    <UserOutlined style={{ color: '#7B57E4' }} />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <Text strong style={{ fontSize: isMobile ? 11 : 13 }}>{user?.fullName || 'System'}</Text>
                        <Text type="secondary" style={{ fontSize: 10 }}>@{user?.username || 'system'}</Text>
                    </div>
                </Space>
            ),
        },
        {
            title: 'Action',
            dataIndex: 'action',
            key: 'action',
            render: (action) => {
                const parts = action.split('|');
                const title = parts[0].trim();
                const details = parts[1]?.trim();

                return (
                    <div style={{ maxWidth: isMobile ? '200px' : '400px' }}>
                        <Tag 
                            color={title.startsWith('CREATE') ? 'green' : title.startsWith('DELETE') ? 'red' : 'blue'} 
                            style={{ marginBottom: 4, fontSize: isMobile ? 10 : 12 }}
                        >
                            {title}
                        </Tag>
                        {details && (
                            <div style={{ fontSize: isMobile ? 10 : 12, color: '#666', whiteSpace: 'normal', wordBreak: 'break-word' }}>
                                {details}
                            </div>
                        )}
                    </div>
                );
            },
        }
    ];

    return (
        <div style={{ padding: '0 0 40px 0' }}>
            <div style={{ 
                marginBottom: 24, 
                display: 'flex', 
                flexDirection: isMobile ? 'column' : 'row',
                justifyContent: 'space-between', 
                alignItems: isMobile ? 'flex-start' : 'center',
                gap: 16
            }}>
                <div>
                    <Title level={isMobile ? 3 : 2} style={{ margin: 0, fontWeight: 700 }}>
                        <HistoryOutlined style={{ marginRight: 12, color: '#7B57E4' }} />
                        System Logs
                    </Title>
                    <Text type="secondary" style={{ fontSize: isMobile ? 12 : 14 }}>Audit history (Super Admin only).</Text>
                </div>
                <Space style={{ width: isMobile ? '100%' : 'auto' }}>
                    <Input.Search
                        placeholder="Search..."
                        allowClear
                        onSearch={handleSearch}
                        style={{ width: isMobile ? '100%' : 250 }}
                    />
                    <Tooltip title="Reload">
                        <Button icon={<ReloadOutlined />} onClick={() => fetchLogs(pagination.current, pagination.pageSize, searchText)} />
                    </Tooltip>
                </Space>
            </div>

            <Card 
                bordered={false} 
                style={{ borderRadius: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }} 
                bodyStyle={{ padding: isMobile ? 8 : 24 }}
            >
                <Table
                    columns={columns}
                    dataSource={logs}
                    rowKey="id"
                    loading={loading}
                    pagination={{
                        ...pagination,
                        simple: isMobile,
                        showSizeChanger: !isMobile,
                        showTotal: isMobile ? null : (total) => `Total ${total} logs`
                    }}
                    onChange={handleTableChange}
                    scroll={{ x: 'max-content' }}
                    size={isMobile ? 'small' : 'middle'}
                />
            </Card>
        </div>
    );
};

export default Logs;
