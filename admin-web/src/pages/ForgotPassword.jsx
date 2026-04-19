import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, Alert, Space, message, theme } from 'antd';
import { UserOutlined, ArrowLeftOutlined, MailOutlined } from '@ant-design/icons';
import api from '../api/client';
import { useNavigate } from 'react-router-dom';

const { Title, Text, Paragraph } = Typography;

const ForgotPassword = () => {
    const { token } = theme.useToken();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState('request'); // 'request' | 'verify' | 'reset'
    const [username, setUsername] = useState('');
    const [otp, setOtp] = useState('');
    const [error, setError] = useState('');

    const onFinishRequest = async (values) => {
        try {
            setLoading(true);
            setError('');
            setUsername(values.username);
            await api.post('/auth/forgot-password', { username: values.username });
            setStep('verify');
            message.success('OTP has been sent to your email');
        } catch (err) {
            setError(err.response?.data?.message || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    const onFinishVerify = async (values) => {
        try {
            setLoading(true);
            setError('');
            await api.post('/auth/validate-otp', {
                username,
                otp: values.otp
            });
            setOtp(values.otp);
            setStep('reset');
            message.success('OTP verified. Set your new password.');
        } catch (err) {
            setError(err.response?.data?.message || 'Verification failed');
        } finally {
            setLoading(false);
        }
    };

    const onFinishReset = async (values) => {
        try {
            setLoading(true);
            setError('');
            if (values.newPassword !== values.confirmPassword) {
                setError('Passwords do not match');
                return;
            }

            await api.post('/auth/verify-otp', {
                username,
                otp,
                newPassword: values.newPassword
            });

            message.success('Password reset successfully');
            navigate('/login');
        } catch (err) {
            setError(err.response?.data?.message || 'Reset failed');
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
                        width: 80, height: 80, margin: '0 auto 16px',
                        background: '#fff', borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: `0 8px 24px rgba(123, 87, 228, 0.2)`,
                        overflow: 'hidden',
                        border: `2px solid ${primaryColor}`
                    }}>
                        <img src="/logo.png" alt="Logo" style={{ width: '85%', height: '85%', objectFit: 'contain' }} />
                    </div>
                    <Title level={4} style={{ color: textColor, marginBottom: 4, letterSpacing: '-0.5px' }}>
                        Malkakulu Future Mind
                    </Title>
                    <Text style={{ fontSize: 13, color: secondaryTextColor, letterSpacing: '1px', textTransform: 'uppercase', fontWeight: 500 }}>MONTESSORI MANAGEMENT</Text>
                </div>

                {step === 'request' && (
                    <div style={{ animation: 'slideIn 0.3s ease-out', textAlign: 'left' }}>
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 32 }}>
                            <Button
                                type="text"
                                icon={<ArrowLeftOutlined style={{ fontSize: 18, color: textColor }} />}
                                onClick={() => navigate('/login')}
                                style={{ marginRight: 8, padding: 4 }}
                            />
                            <div>
                                <Title level={4} style={{ margin: 0, color: textColor }}>Forgot Password</Title>
                                <Text style={{ fontSize: 13, color: secondaryTextColor }}>Enter your username or NIC to receive an OTP</Text>
                            </div>
                        </div>

                        {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 24, borderRadius: 8, background: 'rgba(255, 77, 79, 0.1)', border: '1px solid rgba(255, 77, 79, 0.2)', color: '#ff4d4f' }} />}

                        <Form onFinish={onFinishRequest} layout="vertical" size="large">
                            <Form.Item
                                label={<span style={{ color: secondaryTextColor, fontWeight: 600, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Username or NIC</span>}
                                name="username"
                                rules={[{ required: true, message: 'Please input your Username or NIC!' }]}
                            >
                                <Input
                                    prefix={<UserOutlined style={{ color: secondaryTextColor, marginRight: 8, opacity: 0.5 }} />}
                                    style={{ background: inputBg, border: `1px solid ${borderColor}`, borderRadius: 12, padding: '12px 16px', color: textColor }}
                                    placeholder="Enter your username or NIC"
                                />
                            </Form.Item>

                            <Button
                                type="primary"
                                htmlType="submit"
                                loading={loading}
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
                                Send OTP
                            </Button>
                        </Form>
                    </div>
                )}

                {step === 'verify' && (
                    <div style={{ animation: 'slideIn 0.3s ease-out', textAlign: 'left' }}>
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 32 }}>
                            <Button
                                type="text"
                                icon={<ArrowLeftOutlined style={{ fontSize: 18, color: textColor }} />}
                                onClick={() => setStep('request')}
                                style={{ marginRight: 8, padding: 4 }}
                            />
                            <div>
                                <Title level={4} style={{ margin: 0, color: textColor }}>Verify OTP</Title>
                                <Text style={{ fontSize: 13, color: secondaryTextColor }}>Enter the code sent to your email</Text>
                            </div>
                        </div>

                        {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 24, borderRadius: 8, background: 'rgba(255, 77, 79, 0.1)', border: '1px solid rgba(255, 77, 79, 0.2)', color: '#ff4d4f' }} />}

                        <Form onFinish={onFinishVerify} layout="vertical" size="large">
                            <Form.Item
                                label={<span style={{ color: secondaryTextColor, fontWeight: 600, fontSize: 13, textTransform: 'uppercase', letterSpacing: '1px' }}>OTP Code</span>}
                                name="otp"
                                rules={[{ required: true, message: 'Please input the OTP!' }]}
                            >
                                <Input
                                    style={{ 
                                        background: inputBg, 
                                        border: `1px solid ${borderColor}`, 
                                        borderRadius: 12, 
                                        padding: '12px 16px', 
                                        letterSpacing: '8px', 
                                        textAlign: 'center', 
                                        fontWeight: '900',
                                        fontSize: '24px',
                                        color: textColor
                                    }}
                                    placeholder="000000"
                                    maxLength={6}
                                />
                            </Form.Item>

                            <Button
                                type="primary"
                                htmlType="submit"
                                loading={loading}
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
                                Verify OTP
                            </Button>
                        </Form>
                    </div>
                )}

                {step === 'reset' && (
                    <div style={{ animation: 'slideIn 0.3s ease-out', textAlign: 'left' }}>
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 32 }}>
                            <Button
                                type="text"
                                icon={<ArrowLeftOutlined style={{ fontSize: 18, color: textColor }} />}
                                onClick={() => setStep('verify')}
                                style={{ marginRight: 8, padding: 4 }}
                            />
                            <div>
                                <Title level={4} style={{ margin: 0, color: textColor }}>Reset Password</Title>
                                <Text style={{ fontSize: 13, color: secondaryTextColor }}>Set a new secure password</Text>
                            </div>
                        </div>

                        {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 24, borderRadius: 8, background: 'rgba(255, 77, 79, 0.1)', border: '1px solid rgba(255, 77, 79, 0.2)', color: '#ff4d4f' }} />}

                        <Form onFinish={onFinishReset} layout="vertical" size="large">
                            <Form.Item
                                label={<span style={{ color: secondaryTextColor, fontWeight: 600, fontSize: 13, textTransform: 'uppercase' }}>New Password</span>}
                                name="newPassword"
                                rules={[{ required: true }, { min: 6, message: 'Min 6 characters' }]}
                            >
                                <Input.Password
                                    style={{ background: inputBg, border: `1px solid ${borderColor}`, borderRadius: 12, padding: '12px 16px', color: textColor }}
                                    placeholder="••••••••"
                                />
                            </Form.Item>

                            <Form.Item
                                label={<span style={{ color: secondaryTextColor, fontWeight: 600, fontSize: 13, textTransform: 'uppercase' }}>Confirm Password</span>}
                                name="confirmPassword"
                                rules={[{ required: true }]}
                            >
                                <Input.Password
                                    style={{ background: inputBg, border: `1px solid ${borderColor}`, borderRadius: 12, padding: '12px 16px', color: textColor }}
                                    placeholder="••••••••"
                                />
                            </Form.Item>

                            <Button
                                type="primary"
                                htmlType="submit"
                                loading={loading}
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
            `}</style>
        </div>
    );
};

export default ForgotPassword;
