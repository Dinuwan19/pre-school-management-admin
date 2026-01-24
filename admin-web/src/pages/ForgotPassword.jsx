import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, Alert, Space, message } from 'antd';
import { UserOutlined, ArrowLeftOutlined, MailOutlined } from '@ant-design/icons';
import api from '../api/client';
import { useNavigate } from 'react-router-dom';

const { Title, Text, Paragraph } = Typography;

const ForgotPassword = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');
    const [devLink, setDevLink] = useState(null); // To store the dev link for user testing

    const onFinish = async (values) => {
        try {
            setLoading(true);
            setError('');
            const response = await api.post('/auth/forgot-password', { username: values.username });
            if (response.data._dev_token) {
                setDevLink(`http://localhost:5173/reset-password?token=${response.data._dev_token}`);
            }
            setSubmitted(true);
            message.success('Reset link requested');
        } catch (err) {
            setError(err.response?.data?.message || 'Something went wrong');
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

                {!submitted ? (
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
                                <Text type="secondary" style={{ fontSize: 13 }}>We'll send you a link to reset your password</Text>
                            </div>
                        </div>

                        {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 24, borderRadius: 8 }} />}

                        <Form onFinish={onFinish} layout="vertical" size="large">
                            <Form.Item
                                label={<span style={{ color: '#444', fontWeight: 600, fontSize: 13 }}>USERNAME</span>}
                                name="username"
                                rules={[{ required: true, message: 'Please input your Username!' }]}
                            >
                                <Input
                                    prefix={<UserOutlined style={{ color: '#aaa', marginRight: 8 }} />}
                                    style={{ background: '#F8F8F8', border: '1px solid #EAEAEA', borderRadius: 10, padding: '10px 14px' }}
                                    placeholder="Enter your username"
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
                                Send Reset Link
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
                            <MailOutlined style={{ fontSize: 32, color: '#52C41A' }} />
                        </div>
                        <Title level={3} style={{ marginBottom: 12 }}>Check your console!</Title>
                        <Paragraph style={{ color: '#666', marginBottom: 24 }}>
                            Since we don't have an email server, the reset link is logged to the backend console.
                        </Paragraph>

                        {devLink && (
                            <div style={{ background: '#fff1f0', padding: 16, borderRadius: 8, marginBottom: 24, border: '1px solid #ffa39e' }}>
                                <Text strong style={{ color: '#cf1322', display: 'block', marginBottom: 8 }}>DEVELOPER MODE:</Text>
                                <Text style={{ fontSize: 13 }}>Click below to simulate "clicking the email link":</Text>
                                <div style={{ marginTop: 8 }}>
                                    <a href={devLink} style={{ wordBreak: 'break-all', color: primaryColor, fontWeight: 500 }}>
                                        {devLink}
                                    </a>
                                </div>
                            </div>
                        )}
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

export default ForgotPassword;
