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
    const backgroundColor = '#0A0C1B'; // Deep Navy
    const cardBg = '#161931'; // Navy/Charcoal
    const inputBg = 'rgba(255, 255, 255, 0.05)';
    const borderColor = 'rgba(255, 255, 255, 0.1)';
    const textColor = '#FFFFFF';
    const secondaryTextColor = 'rgba(255, 255, 255, 0.7)';

    const cardStyle = {
        width: 440,
        borderRadius: 24,
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
        padding: 40,
        border: '1px solid rgba(255, 255, 255, 0.05)',
        textAlign: 'center',
        background: cardBg
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
                        color: 'white', fontSize: 28, fontWeight: 'bold',
                        boxShadow: `0 0 20px ${primaryColor}44`
                    }}>
                        M
                    </div>
                    <Title level={4} style={{ color: textColor, marginBottom: 4, letterSpacing: '-0.5px' }}>
                        Malkakulu Future Mind
                    </Title>
                    <Text style={{ fontSize: 13, color: secondaryTextColor, letterSpacing: '1px', textTransform: 'uppercase', fontWeight: 500 }}>MONTESSORI MANAGEMENT</Text>
                </div>

                {!success ? (
                    <div style={{ animation: 'slideIn 0.3s ease-out', textAlign: 'left' }}>
                        <div style={{ marginBottom: 32 }}>
                            <Title level={4} style={{ margin: 0, color: textColor }}>Reset Password</Title>
                            <Text style={{ fontSize: 13, color: secondaryTextColor }}>Set a new secure password</Text>
                        </div>

                        {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 24, borderRadius: 8, background: 'rgba(255, 77, 79, 0.1)', border: '1px solid rgba(255, 77, 79, 0.2)', color: '#ff4d4f' }} />}
                        {!token && <Alert message="Missing reset token in URL" type="warning" showIcon style={{ marginBottom: 24, borderRadius: 8 }} />}

                        <Form onFinish={onFinish} layout="vertical" size="large">
                            <Form.Item
                                label={<span style={{ color: secondaryTextColor, fontWeight: 600, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.5px' }}>New Password</span>}
                                name="newPassword"
                                rules={[
                                    { required: true, message: 'New password is required' },
                                    {
                                        validator: (_, value) => {
                                            if (!value) return Promise.resolve();
                                            const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
                                            if (!regex.test(value)) {
                                                return Promise.reject(new Error('Min 8 chars, 1 Uppercase, 1 Lowercase, 1 Number & 1 Special Char'));
                                            }
                                            return Promise.resolve();
                                        }
                                    }
                                ]}
                            >
                                <Input.Password
                                    prefix={<LockOutlined style={{ color: secondaryTextColor, marginRight: 8, opacity: 0.5 }} />}
                                    style={{ 
                                        background: inputBg, 
                                        border: `1px solid ${borderColor}`, 
                                        borderRadius: 12, 
                                        padding: '12px 16px',
                                        color: textColor
                                    }}
                                    placeholder="••••••••"
                                />
                            </Form.Item>

                            <Form.Item
                                label={<span style={{ color: secondaryTextColor, fontWeight: 600, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Confirm Password</span>}
                                name="confirmPassword"
                                rules={[{ required: true, message: 'Please confirm your password' }]}
                            >
                                <Input.Password
                                    prefix={<LockOutlined style={{ color: secondaryTextColor, marginRight: 8, opacity: 0.5 }} />}
                                    style={{ 
                                        background: inputBg, 
                                        border: `1px solid ${borderColor}`, 
                                        borderRadius: 12, 
                                        padding: '12px 16px',
                                        color: textColor
                                    }}
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
                                    borderColor: primaryColor,
                                    borderRadius: 12,
                                    marginTop: 16,
                                    boxShadow: `0 4px 14px ${primaryColor}66`
                                }}
                            >
                                Reset Password
                            </Button>
                        </Form>
                    </div>
                ) : (
                    <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
                        <div style={{
                            width: 64, height: 64, background: 'rgba(82, 196, 26, 0.1)',
                            borderRadius: '50%', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', margin: '0 auto 24px',
                            border: '1px solid rgba(82, 196, 26, 0.2)'
                        }}>
                            <CheckCircleOutlined style={{ fontSize: 32, color: '#52C41A' }} />
                        </div>
                        <Title level={3} style={{ marginBottom: 12, color: textColor }}>Success!</Title>
                        <Paragraph style={{ color: secondaryTextColor, marginBottom: 32 }}>
                            Your password has been successfully reset. You can now log in with your new credentials.
                        </Paragraph>
                        <Button
                            type="primary"
                            block
                            onClick={() => navigate('/login')}
                            style={{ 
                                height: 52, 
                                background: primaryColor, 
                                borderColor: primaryColor, 
                                borderRadius: 12,
                                fontWeight: 600 
                            }}
                        >
                            Back to Login
                        </Button>
                    </div>
                )}
            </Card>

            <style>{`
                input, .ant-input-password input {
                    color: white !important;
                }
                input::placeholder {
                    color: rgba(255, 255, 255, 0.2) !important;
                }
                .ant-input-password {
                    color: white !important;
                }
                .ant-form-item-label > label {
                    color: rgba(255, 255, 255, 0.7) !important;
                }
                @keyframes slideIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
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
