import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, Alert, message } from 'antd';
import { LockOutlined, ArrowLeftOutlined, CheckCircleOutlined } from '@ant-design/icons';
import api from '../api/client';
import { useNavigate, useSearchParams } from 'react-router-dom';

const { Title, Text, Paragraph } = Typography;

const ResetPassword = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');

    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    const onFinish = async (values) => {
        try {
            if (!token) {
                setError('Missing reset token. Please request a new link.');
                return;
            }
            if (values.newPassword !== values.confirmPassword) {
                setError('Passwords do not match');
                return;
            }

            setLoading(true);
            setError('');
            await api.post('/auth/reset-password', {
                token,
                newPassword: values.newPassword
            });
            setSuccess(true);
            message.success('Password reset successfully');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to reset password');
        } finally {
            setLoading(false);
        }
    };

    const primaryColor = '#7B57E4';
    const backgroundColor = '#F3F1FB';
    const cardStyle = {
        width: 440,
        borderRadius: 24,
        boxShadow: '0 4px 20px rgba(123, 87, 228, 0.08)',
        padding: 32,
        border: 'none',
        textAlign: 'center'
    };

    return (
        <div style={{
            minHeight: '100vh',
            width: '100vw',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            background: backgroundColor,
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
        }}>
            <Card style={cardStyle} bodyStyle={{ padding: 0 }}>
                {/* LOGO AREA */}
                <div style={{ marginBottom: 40 }}>
                    <div style={{
                        width: 72, height: 72, margin: '0 auto 16px',
                        background: primaryColor, borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'white', fontSize: 28, fontWeight: 'bold'
                    }}>
                        M
                    </div>
                    <Title level={4} style={{ color: '#000000', marginBottom: 4 }}>
                        Malkakulu Future Mind
                    </Title>
                    <Text style={{ fontSize: 13, color: '#888888', letterSpacing: '0.5px' }}>MONTESSORI MANAGEMENT</Text>
                </div>

                {!success ? (
                    <div style={{ animation: 'slideIn 0.3s ease-out', textAlign: 'left' }}>
                        <div style={{ marginBottom: 32 }}>
                            <Title level={4} style={{ margin: 0, color: '#333' }}>Set New Password</Title>
                            <Text type="secondary" style={{ fontSize: 13 }}>Enter your new secure password below</Text>
                        </div>

                        {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 24, borderRadius: 8 }} />}
                        {!token && <Alert message="Missing reset token in URL" type="warning" showIcon style={{ marginBottom: 24, borderRadius: 8 }} />}

                        <Form onFinish={onFinish} layout="vertical" size="large">
                            <Form.Item
                                label={<span style={{ color: '#444', fontWeight: 600, fontSize: 13 }}>NEW PASSWORD</span>}
                                name="newPassword"
                                rules={[{ required: true }, { min: 6, message: 'Password must be at least 6 characters' }]}
                            >
                                <Input.Password
                                    prefix={<LockOutlined style={{ color: '#aaa', marginRight: 8 }} />}
                                    style={{ background: '#F8F8F8', border: '1px solid #EAEAEA', borderRadius: 10, padding: '10px 14px' }}
                                    placeholder="••••••••"
                                />
                            </Form.Item>

                            <Form.Item
                                label={<span style={{ color: '#444', fontWeight: 600, fontSize: 13 }}>CONFIRM NEW PASSWORD</span>}
                                name="confirmPassword"
                                rules={[{ required: true }]}
                            >
                                <Input.Password
                                    prefix={<LockOutlined style={{ color: '#aaa', marginRight: 8 }} />}
                                    style={{ background: '#F8F8F8', border: '1px solid #EAEAEA', borderRadius: 10, padding: '10px 14px' }}
                                    placeholder="••••••••"
                                />
                            </Form.Item>

                            <Button
                                type="primary"
                                htmlType="submit"
                                loading={loading}
                                disabled={!token}
                                block
                                style={{
                                    height: 52,
                                    fontSize: 16,
                                    fontWeight: 600,
                                    background: primaryColor,
                                    borderRadius: 12,
                                    marginTop: 16,
                                    boxShadow: '0 4px 14px rgba(123, 87, 228, 0.4)'
                                }}
                            >
                                Reset Password
                            </Button>
                        </Form>
                    </div>
                ) : (
                    <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
                        <div style={{
                            width: 64, height: 64, background: '#F6FFED',
                            borderRadius: '50%', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', margin: '0 auto 24px'
                        }}>
                            <CheckCircleOutlined style={{ fontSize: 32, color: '#52C41A' }} />
                        </div>
                        <Title level={3} style={{ marginBottom: 12 }}>Success!</Title>
                        <Paragraph style={{ color: '#666', marginBottom: 32 }}>
                            Your password has been successfully reset. You can now log in with your new credentials.
                        </Paragraph>
                        <Button
                            type="primary"
                            block
                            onClick={() => navigate('/login')}
                            style={{ height: 52, background: primaryColor, borderRadius: 12 }}
                        >
                            Back to Login
                        </Button>
                    </div>
                )}
            </Card>

            <style>{`
                @keyframes slideIn {
                    from { opacity: 0; transform: translateX(20px); }
                    to { opacity: 1; transform: translateX(0); }
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }
            `}</style>
        </div>
    );
};

export default ResetPassword;
