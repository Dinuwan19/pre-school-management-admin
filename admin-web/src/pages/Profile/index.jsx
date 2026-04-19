import React, { useState, useEffect } from 'react';
import { Card, Typography, Row, Col, Avatar, Button, Upload, message, Divider, Space, theme, Spin, Tag, Empty } from 'antd';
import {
    UserOutlined, MailOutlined, PhoneOutlined, SafetyCertificateOutlined,
    EnvironmentOutlined, UploadOutlined, SyncOutlined
} from '@ant-design/icons';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const { Title, Text } = Typography;

const Profile = () => {
    const { user: authUser } = useAuth();
    const { isDarkMode } = useTheme();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);

    const {
        token: { colorBgContainer, colorBgLayout, colorPrimary, colorTextSecondary, colorBorder, colorPrimaryBg },
    } = theme.useToken();

    const fetchProfile = async () => {
        try {
            // Since we don't have a /me endpoint that returns full details, we'll try to get it from /staff/:id
            // or we could add a /me endpoint. Let's try to fetch by current user ID.
            const res = await api.get(`/staff/${authUser.id}`);
            setProfile(res.data);
        } catch (error) {
            console.error('Failed to load profile', error);
            // Fallback if /staff/:id is restricted (e.g. for non-admins)
            // But Cashiers usually have access to staff profile for themselves?
            // If it fails, we use the authUser data
            setProfile(authUser);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (authUser?.id) {
            fetchProfile();
        }
    }, [authUser]);

    const handleSignatureUpload = async (info) => {
        const { file } = info;
        if (file.status === 'uploading') {
            setUploading(true);
            return;
        }

        try {
            const formData = new FormData();
            formData.append('signature', file.originFileObj);

            const res = await api.post('/auth/upload-signature', formData);
            message.success('Signature uploaded successfully');
            setProfile(prev => ({ ...prev, signatureUrl: res.data.signatureUrl }));
        } catch (error) {
            message.error(error.response?.data?.message || 'Upload failed');
        } finally {
            setUploading(false);
        }
    };

    const getMediaUrl = (url) => {
        if (!url) return null;
        if (url.startsWith('http')) return url;
        const base = api.defaults.baseURL.replace('/api', '');
        return `${base}${url.startsWith('/') ? '' : '/'}${url}`;
    };

    if (loading) return <div style={{ textAlign: 'center', marginTop: 100 }}><Spin size="large" tip="Loading Profile..." /></div>;

    return (
        <div style={{ padding: '24px' }}>
            <Title level={2}>My Profile</Title>
            <Row gutter={24}>
                <Col xs={24} md={8}>
                    <Card bordered={false} style={{ borderRadius: 16, textAlign: 'center', marginBottom: 24 }}>
                        <div style={{ padding: '24px 0' }}>
                            <Avatar 
                                size={120} 
                                src={getMediaUrl(profile?.photoUrl)} 
                                icon={<UserOutlined />} 
                                style={{ background: colorBgLayout, border: `4px solid ${colorBorder}` }} 
                            />
                            <Title level={4} style={{ marginTop: 16, marginBottom: 4 }}>{profile?.fullName}</Title>
                            <Text type="secondary">{profile?.employeeId || profile?.username}</Text>
                            <div style={{ marginTop: 8 }}>
                                <Tag color="purple" style={{ borderRadius: 4 }}>{profile?.role}</Tag>
                            </div>
                        </div>

                        <Divider />

                        <div style={{ textAlign: 'left' }}>
                            <Space direction="vertical" style={{ width: '100%' }} size={16}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <MailOutlined style={{ color: colorPrimary }} />
                                    <span>{profile?.email || 'N/A'}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <PhoneOutlined style={{ color: colorPrimary }} />
                                    <span>{profile?.phone || 'N/A'}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                                    <EnvironmentOutlined style={{ color: colorPrimary, marginTop: 4 }} />
                                    <span>{profile?.address || 'N/A'}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <SafetyCertificateOutlined style={{ color: colorPrimary }} />
                                    <span>NIC: {profile?.nationalId || 'N/A'}</span>
                                </div>
                            </Space>
                        </div>
                    </Card>
                </Col>

                <Col xs={24} md={16}>
                    <Card 
                        title="Electronic Signature" 
                        bordered={false} 
                        style={{ borderRadius: 16 }}
                        extra={
                            <Upload
                                showUploadList={false}
                                beforeUpload={(file) => {
                                    const isImage = file.type.startsWith('image/');
                                    if (!isImage) {
                                        message.error('You can only upload image files!');
                                    }
                                    return isImage || Upload.LIST_IGNORE;
                                }}
                                onChange={handleSignatureUpload}
                                customRequest={({ onSuccess }) => setTimeout(() => onSuccess("ok"), 0)}
                            >
                                <Button 
                                    icon={uploading ? <SyncOutlined spin /> : <UploadOutlined />} 
                                    loading={uploading}
                                    type="primary"
                                    style={{ borderRadius: 6 }}
                                >
                                    Upload Signature
                                </Button>
                            </Upload>
                        }
                    >
                        <div style={{ 
                            minHeight: 150, 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            border: `2px dashed ${colorBorder}`,
                            borderRadius: 12,
                            background: isDarkMode ? 'rgba(255,255,255,0.02)' : '#fafafa',
                            padding: 24
                        }}>
                            {profile?.signatureUrl ? (
                                <div style={{ textAlign: 'center' }}>
                                    <img 
                                        src={getMediaUrl(profile.signatureUrl)} 
                                        alt="Signature" 
                                        style={{ maxWidth: '100%', maxHeight: 100, objectFit: 'contain' }} 
                                    />
                                    <div style={{ marginTop: 12 }}>
                                        <Text type="secondary" italic>This signature will be used on receipts and invoices generated by you.</Text>
                                    </div>
                                </div>
                            ) : (
                                <Empty description="No e-signature uploaded yet" />
                            )}
                        </div>
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export default Profile;
