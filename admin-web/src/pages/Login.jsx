import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, Alert, Space, message } from 'antd';
import { UserOutlined, LockOutlined, BookOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

const Login = () => {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState('role-selection'); // 'role-selection' | 'login'
    const [selectedRole, setSelectedRole] = useState(null); // 'ADMIN' | 'TEACHER'

    const onRoleSelect = (role) => {
        setSelectedRole(role);
        setStep('login');
    };

    const onBack = () => {
        setStep('role-selection');
        setSelectedRole(null);
        setError('');
    };

    const onFinish = async (values) => {
        try {
            setLoading(true);
            setError('');
            // Attempt login
            const result = await login(values.username, values.password);
            setLoading(false);

            if (result.success) {
                if (result.user.firstLogin) {
                    setStep('reset-password');
                } else {
                    navigate('/dashboard');
                }
            } else {
                setError(result.message);
            }
        } catch (err) {
            setLoading(false);
            console.error(err);
            setError('An unexpected error occurred.');
        }
    };

    const onResetFinish = async (values) => {
        try {
            setLoading(true);
            setError('');
            if (values.newPassword !== values.confirmPassword) {
                setError('Passwords do not match');
                setLoading(false);
                return;
            }
            const token = localStorage.getItem('token');
            await axios.post('http://127.0.0.1:5000/api/auth/change-password', {
                currentPassword: values.currentPassword,
                newPassword: values.newPassword,
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            message.success('Password updated successfully');
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update password');
        } finally {
            setLoading(false);
        }
    };

    // Design tokens from Figma analysis
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

                {step === 'role-selection' && (
                    <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
                        <Title level={3} style={{ marginBottom: 12, color: '#222' }}>Welcome!</Title>
                        <Text type="secondary" style={{ display: 'block', marginBottom: 32, fontSize: 15 }}>
                            Please select your role to continue.
                        </Text>

                        <Space size={24} style={{ width: '100%', justifyContent: 'center' }}>
                            {/* Admin Button */}
                            <button
                                onClick={() => onRoleSelect('ADMIN')}
                                className="role-button" // See style tag below
                                style={{
                                    width: 140, height: 140,
                                    background: '#F0EAFB',
                                    border: '2px solid transparent',
                                    borderRadius: 20,
                                    cursor: 'pointer',
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                    transition: 'all 0.2s ease',
                                    outline: 'none'
                                }}
                            >
                                <div style={{
                                    background: 'rgba(123, 87, 228, 0.1)',
                                    padding: 12, borderRadius: '50%', marginBottom: 12
                                }}>
                                    <UserOutlined style={{ fontSize: 28, color: primaryColor }} />
                                </div>
                                <Text strong style={{ color: '#555', fontSize: 16 }}>Admin</Text>
                            </button>

                            {/* Teacher Button */}
                            <button
                                onClick={() => onRoleSelect('TEACHER')}
                                className="role-button"
                                style={{
                                    width: 140, height: 140,
                                    background: '#F0EAFB',
                                    border: '2px solid transparent',
                                    borderRadius: 20,
                                    cursor: 'pointer',
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                    transition: 'all 0.2s ease',
                                    outline: 'none'
                                }}
                            >
                                <div style={{
                                    background: 'rgba(123, 87, 228, 0.1)',
                                    padding: 12, borderRadius: '50%', marginBottom: 12
                                }}>
                                    <BookOutlined style={{ fontSize: 28, color: primaryColor }} />
                                </div>
                                <Text strong style={{ color: '#555', fontSize: 16 }}>Teacher</Text>
                            </button>
                        </Space>
                    </div>
                )}

                {step === 'login' && (
                    <div style={{ animation: 'slideIn 0.3s ease-out', textAlign: 'left' }}>
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 32 }}>
                            <Button
                                type="text"
                                icon={<ArrowLeftOutlined style={{ fontSize: 18 }} />}
                                onClick={onBack}
                                style={{ marginRight: 8, padding: 4 }}
                            />
                            <div>
                                <Title level={4} style={{ margin: 0, color: '#333' }}>
                                    {selectedRole === 'ADMIN' ? 'Admin' : 'Teacher'} Login
                                </Title>
                                <Text type="secondary" style={{ fontSize: 13 }}>Enter your credentials</Text>
                            </div>
                        </div>

                        {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 24, borderRadius: 8 }} />}

                        <Form
                            name="login_form"
                            initialValues={{ remember: true }}
                            onFinish={onFinish}
                            layout="vertical"
                            size="large"
                        >
                            <Form.Item
                                label={<span style={{ color: '#444', fontWeight: 600, fontSize: 13 }}>USERNAME</span>}
                                name="username"
                                rules={[{ required: true, message: 'Please input your Username!' }]}
                                style={{ marginBottom: 20 }}
                            >
                                <Input
                                    style={{ background: '#F8F8F8', border: '1px solid #EAEAEA', borderRadius: 10, padding: '10px 14px' }}
                                    placeholder="e.g. admin"
                                />
                            </Form.Item>

                            <Form.Item
                                label={<span style={{ color: '#444', fontWeight: 600, fontSize: 13 }}>PASSWORD</span>}
                                name="password"
                                rules={[{ required: true, message: 'Please input your Password!' }]}
                                style={{ marginBottom: 8 }}
                            >
                                <Input.Password
                                    style={{ background: '#F8F8F8', border: '1px solid #EAEAEA', borderRadius: 10, padding: '10px 14px' }}
                                    placeholder="••••••••"
                                />
                            </Form.Item>

                            <div style={{ textAlign: 'right', marginBottom: 24 }}>
                                <a onClick={() => navigate('/forgot-password')} style={{ color: primaryColor, fontSize: 13, fontWeight: 500 }}>
                                    Forgot Password?
                                </a>
                            </div>

                            <Form.Item>
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
                                        boxShadow: '0 4px 14px rgba(123, 87, 228, 0.4)'
                                    }}
                                >
                                    Sign in
                                </Button>
                            </Form.Item>
                        </Form>
                    </div>
                )}

                {step === 'reset-password' && (
                    <div style={{ animation: 'slideIn 0.3s ease-out', textAlign: 'left' }}>
                        <div style={{ marginBottom: 24 }}>
                            <Title level={4} style={{ margin: 0, color: '#333' }}>Reset Password</Title>
                            <Text type="secondary" style={{ fontSize: 13 }}>First login detected. Please change your password.</Text>
                        </div>

                        {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 24, borderRadius: 8 }} />}

                        <Form
                            name="reset_form"
                            onFinish={onResetFinish}
                            layout="vertical"
                            size="large"
                        >
                            <Form.Item
                                label="CURRENT TEMPORARY PASSWORD"
                                name="currentPassword"
                                rules={[{ required: true }]}
                            >
                                <Input.Password placeholder="••••••••" />
                            </Form.Item>

                            <Form.Item
                                label="NEW PASSWORD"
                                name="newPassword"
                                rules={[{ required: true }, { min: 6, message: 'Minimum 6 characters' }]}
                            >
                                <Input.Password placeholder="••••••••" />
                            </Form.Item>

                            <Form.Item
                                label="CONFIRM NEW PASSWORD"
                                name="confirmPassword"
                                rules={[{ required: true }]}
                            >
                                <Input.Password placeholder="••••••••" />
                            </Form.Item>

                            <Form.Item>
                                <Button
                                    type="primary"
                                    htmlType="submit"
                                    loading={loading}
                                    block
                                    style={{
                                        height: 52,
                                        background: primaryColor,
                                        borderRadius: 12,
                                    }}
                                >
                                    Update Password & Login
                                </Button>
                            </Form.Item>
                        </Form>
                    </div>
                )}
            </Card>

            <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.98); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .role-button:hover {
            border-color: ${primaryColor} !important;
            background: #fff !important;
            transform: translateY(-4px);
            box-shadow: 0 8px 20px rgba(123, 87, 228, 0.15);
        }
        .role-button:active {
            transform: translateY(-1px);
        }
      `}</style>
        </div>
    );
};

export default Login;
