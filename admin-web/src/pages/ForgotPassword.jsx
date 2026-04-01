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
    const backgroundColor = token.colorBgLayout;
    const cardStyle = {
        width: 440,
        borderRadius: 24,
        boxShadow: '0 4px 20px rgba(123, 87, 228, 0.08)',
        padding: 32,
        border: 'none',
        textAlign: 'center',
        background: token.colorBgContainer
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
                    <Title level={4} style={{ color: token.colorText, marginBottom: 4 }}>
                        Malkakulu Future Mind
                    </Title>
                    <Text style={{ fontSize: 13, color: '#888888', letterSpacing: '0.5px' }}>MONTESSORI MANAGEMENT</Text>
                </div>

                {step === 'request' && (
                    <div style={{ animation: 'slideIn 0.3s ease-out', textAlign: 'left' }}>
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 32 }}>
                            <Button
                                type="text"
                                icon={<ArrowLeftOutlined style={{ fontSize: 18 }} />}
                                onClick={() => navigate('/login')}
                                style={{ marginRight: 8, padding: 4 }}
                            />
                            <div>
                                <Title level={4} style={{ margin: 0, color: '#333' }}>Forgot Password</Title>
                                <Text type="secondary" style={{ fontSize: 13 }}>Enter your username or NIC to receive an OTP</Text>
                            </div>
                        </div>

                        {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 24, borderRadius: 8 }} />}

                        <Form onFinish={onFinishRequest} layout="vertical" size="large">
                            <Form.Item
                                label={<span style={{ color: '#444', fontWeight: 600, fontSize: 13 }}>USERNAME OR NIC</span>}
                                name="username"
                                rules={[{ required: true, message: 'Please input your Username or NIC!' }]}
                            >
                                <Input
                                    prefix={<UserOutlined style={{ color: '#aaa', marginRight: 8 }} />}
                                    style={{ background: '#F8F8F8', border: '1px solid #EAEAEA', borderRadius: 10, padding: '10px 14px' }}
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
                                    borderRadius: 12,
                                    marginTop: 16,
                                    boxShadow: '0 4px 14px rgba(123, 87, 228, 0.4)'
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
                                icon={<ArrowLeftOutlined style={{ fontSize: 18 }} />}
                                onClick={() => setStep('request')}
                                style={{ marginRight: 8, padding: 4 }}
                            />
                            <div>
                                <Title level={4} style={{ margin: 0, color: '#333' }}>Verify OTP</Title>
                                <Text type="secondary" style={{ fontSize: 13 }}>Enter the code sent to your email</Text>
                            </div>
                        </div>

                        {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 24, borderRadius: 8 }} />}

                        <Form onFinish={onFinishVerify} layout="vertical" size="large">
                            <Form.Item
                                label={<span style={{ color: '#444', fontWeight: 600, fontSize: 13 }}>OTP CODE</span>}
                                name="otp"
                                rules={[{ required: true, message: 'Please input the OTP!' }]}
                            >
                                <Input
                                    style={{ background: '#F8F8F8', border: '1px solid #EAEAEA', borderRadius: 10, padding: '10px 14px', letterSpacing: '4px', textAlign: 'center', fontWeight: 'bold' }}
                                    placeholder="123456"
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
                                    borderRadius: 12,
                                    marginTop: 16,
                                    boxShadow: '0 4px 14px rgba(123, 87, 228, 0.4)'
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
                                icon={<ArrowLeftOutlined style={{ fontSize: 18 }} />}
                                onClick={() => setStep('verify')}
                                style={{ marginRight: 8, padding: 4 }}
                            />
                            <div>
                                <Title level={4} style={{ margin: 0, color: '#333' }}>Reset Password</Title>
                                <Text type="secondary" style={{ fontSize: 13 }}>Set a new secure password</Text>
                            </div>
                        </div>

                        {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 24, borderRadius: 8 }} />}

                        <Form onFinish={onFinishReset} layout="vertical" size="large">
                            <Form.Item
                                label={<span style={{ color: '#444', fontWeight: 600, fontSize: 13 }}>NEW PASSWORD</span>}
                                name="newPassword"
                                rules={[{ required: true }, { min: 6, message: 'Min 6 characters' }]}
                            >
                                <Input.Password
                                    style={{ background: '#F8F8F8', border: '1px solid #EAEAEA', borderRadius: 10, padding: '10px 14px' }}
                                    placeholder="••••••••"
                                />
                            </Form.Item>

                            <Form.Item
                                label={<span style={{ color: '#444', fontWeight: 600, fontSize: 13 }}>CONFIRM PASSWORD</span>}
                                name="confirmPassword"
                                rules={[{ required: true }]}
                            >
                                <Input.Password
                                    style={{ background: '#F8F8F8', border: '1px solid #EAEAEA', borderRadius: 10, padding: '10px 14px' }}
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
                                    borderRadius: 12,
                                    marginTop: 16,
                                    boxShadow: '0 4px 14px rgba(123, 87, 228, 0.4)'
                                }}
                            >
                                Reset Password
                            </Button>
                        </Form>
                    </div>
                )}
            </Card>

            <style>{`
                @keyframes slideIn {
                    from { opacity: 0; transform: translateX(20px); }
                    to { opacity: 1; transform: translateX(0); }
                }
            `}</style>
        </div>
    );
};

export default ForgotPassword;
