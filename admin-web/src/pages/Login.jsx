import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, Alert, Space, message, theme } from 'antd';
import { UserOutlined, LockOutlined, BookOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

const Login = () => {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState('role-selection'); // 'role-selection' | 'login'
    const [selectedRole, setSelectedRole] = useState(null); // 'ADMIN' | 'TEACHER'
    const [hoveredRole, setHoveredRole] = useState(null);

    const {
        token: {
            colorBgLayout,
            colorBgContainer,
            colorText,
            colorTextSecondary,
            colorPrimary,
            colorBorder,
            colorBgElevated,
            borderRadiusLG,
            boxShadow
        }
    } = theme.useToken();

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
            const result = await login(values.username, values.password, selectedRole);
            setLoading(false);

            if (result.success) {
                if (result.user.firstLogin) {
                    setStep('reset-password');
                } else {
                    navigate('/');
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
            await api.post('/auth/change-password', {
                currentPassword: values.currentPassword,
                newPassword: values.newPassword,
            });
            message.success('Password updated successfully');
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update password');
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

    const getRoleButtonStyle = (role) => {
        const isHovered = hoveredRole === role;
        const isSelected = selectedRole === role;
        return {
            width: 140, height: 140,
            background: isHovered || isSelected ? 'rgba(123, 87, 228, 0.15)' : 'rgba(255, 255, 255, 0.03)',
            border: `2px solid ${isHovered || isSelected ? primaryColor : 'rgba(255, 255, 255, 0.05)'}`,
            borderRadius: 24,
            cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            outline: 'none',
            boxShadow: isHovered || isSelected ? `0 0 20px ${primaryColor}33` : 'none',
            transform: isHovered ? 'translateY(-6px)' : 'none'
        };
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
                        background: primaryColor, borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: `0 8px 24px ${primaryColor}4D`,
                        border: `2px solid rgba(255, 255, 255, 0.1)`
                    }}>
                        <Title level={1} style={{ color: '#fff', margin: 0, fontWeight: 700 }}>M</Title>
                    </div>
                    <Title level={4} style={{ color: textColor, marginBottom: 4, letterSpacing: '-0.5px' }}>
                        Malkakulu Future Mind
                    </Title>
                    <Text style={{ fontSize: 13, color: secondaryTextColor, letterSpacing: '1px', textTransform: 'uppercase', fontWeight: 500 }}>MONTESSORI MANAGEMENT</Text>
                </div>

                {step === 'role-selection' && (
                    <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
                        <Title level={3} style={{ marginBottom: 12, color: textColor }}>Welcome!</Title>
                        <Text style={{ display: 'block', marginBottom: 32, fontSize: 15, color: secondaryTextColor }}>
                            Please select your role to continue.
                        </Text>

                        <Space size={24} style={{ width: '100%', justifyContent: 'center' }}>
                            {/* Admin Button */}
                            <button
                                onClick={() => onRoleSelect('ADMIN')}
                                onMouseEnter={() => setHoveredRole('ADMIN')}
                                onMouseLeave={() => setHoveredRole(null)}
                                style={getRoleButtonStyle('ADMIN')}
                            >
                                <div style={{
                                    background: 'rgba(123, 87, 228, 0.15)',
                                    padding: 16, borderRadius: '50%', marginBottom: 12
                                }}>
                                    <UserOutlined style={{ fontSize: 28, color: primaryColor }} />
                                </div>
                                <Text strong style={{ color: textColor, fontSize: 16 }}>Admin</Text>
                            </button>

                            {/* Teacher Button */}
                            <button
                                onClick={() => onRoleSelect('TEACHER')}
                                onMouseEnter={() => setHoveredRole('TEACHER')}
                                onMouseLeave={() => setHoveredRole(null)}
                                style={getRoleButtonStyle('TEACHER')}
                            >
                                <div style={{
                                    background: 'rgba(123, 87, 228, 0.15)',
                                    padding: 16, borderRadius: '50%', marginBottom: 12
                                }}>
                                    <BookOutlined style={{ fontSize: 28, color: primaryColor }} />
                                </div>
                                <Text strong style={{ color: textColor, fontSize: 16 }}>Teacher</Text>
                            </button>
                        </Space>
                    </div>
                )}

                {step === 'login' && (
                    <div style={{ animation: 'slideIn 0.3s ease-out', textAlign: 'left' }}>
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 32 }}>
                            <Button
                                type="text"
                                icon={<ArrowLeftOutlined style={{ fontSize: 18, color: textColor }} />}
                                onClick={onBack}
                                style={{ marginRight: 8, padding: 4 }}
                            />
                            <div>
                                <Title level={4} style={{ margin: 0, color: textColor }}>
                                    {selectedRole === 'ADMIN' ? 'Admin' : 'Teacher'} Login
                                </Title>
                                <Text style={{ fontSize: 13, color: secondaryTextColor }}>Enter your credentials</Text>
                            </div>
                        </div>

                        {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 24, borderRadius: 8, background: 'rgba(255, 77, 79, 0.1)', border: '1px solid rgba(255, 77, 79, 0.2)', color: '#ff4d4f' }} />}

                        <Form
                            name="login_form"
                            initialValues={{ remember: true }}
                            onFinish={onFinish}
                            layout="vertical"
                            size="large"
                        >
                            <Form.Item
                                label={<span style={{ color: secondaryTextColor, fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Username or NIC</span>}
                                name="username"
                                rules={[{ required: true, message: 'Please input your Username or NIC!' }]}
                                style={{ marginBottom: 20 }}
                            >
                                <Input
                                    style={{ background: inputBg, border: `1px solid ${borderColor}`, borderRadius: 12, padding: '12px 16px', color: textColor }}
                                    placeholder="Enter username or NIC"
                                />
                            </Form.Item>

                            <Form.Item
                                label={<span style={{ color: secondaryTextColor, fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Password</span>}
                                name="password"
                                rules={[{ required: true, message: 'Please input your Password!' }]}
                                style={{ marginBottom: 8 }}
                            >
                                <Input.Password
                                    style={{ background: inputBg, border: `1px solid ${borderColor}`, borderRadius: 12, padding: '12px 16px', color: textColor }}
                                    placeholder="••••••••"
                                />
                            </Form.Item>

                            <div style={{ textAlign: 'right', marginBottom: 24 }}>
                                <a onClick={() => navigate('/forgot-password')} style={{ color: primaryColor, fontSize: 13, fontWeight: 600 }}>
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
                                        boxShadow: `0 4px 14px ${primaryColor}66`
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
                            <Title level={4} style={{ margin: 0, color: textColor }}>Reset Password</Title>
                            <Text style={{ fontSize: 13, color: secondaryTextColor }}>First login detected. Please change your password.</Text>
                        </div>

                        {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 24, borderRadius: 8, background: 'rgba(255, 77, 79, 0.1)', border: '1px solid rgba(255, 77, 79, 0.2)', color: '#ff4d4f' }} />}

                        <Form
                            name="reset_form"
                            onFinish={onResetFinish}
                            layout="vertical"
                            size="large"
                        >
                            <Form.Item
                                label={<span style={{ color: secondaryTextColor, fontWeight: 600, fontSize: 12, textTransform: 'uppercase' }}>Current Temporary Password</span>}
                                name="currentPassword"
                                rules={[{ required: true }]}
                            >
                                <Input.Password placeholder="••••••••" style={{ background: inputBg, border: `1px solid ${borderColor}`, color: textColor, borderRadius: 12, padding: '12px 16px' }} />
                            </Form.Item>

                            <Form.Item
                                label={<span style={{ color: secondaryTextColor, fontWeight: 600, fontSize: 12, textTransform: 'uppercase' }}>New Password</span>}
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
                                <Input.Password placeholder="••••••••" style={{ background: inputBg, border: `1px solid ${borderColor}`, color: textColor, borderRadius: 12, padding: '12px 16px' }} />
                            </Form.Item>

                            <Form.Item
                                label={<span style={{ color: secondaryTextColor, fontWeight: 600, fontSize: 12, textTransform: 'uppercase' }}>Confirm New Password</span>}
                                name="confirmPassword"
                                rules={[{ required: true }]}
                            >
                                <Input.Password placeholder="••••••••" style={{ background: inputBg, border: `1px solid ${borderColor}`, color: textColor, borderRadius: 12, padding: '12px 16px' }} />
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
                                        borderColor: primaryColor,
                                        borderRadius: 12,
                                        fontWeight: 600,
                                        boxShadow: `0 4px 14px ${primaryColor}66`
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
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.98); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
        </div>
    );
};

export default Login;
