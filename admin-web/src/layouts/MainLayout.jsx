import React, { useState } from 'react';
import { Layout, Menu, Button, theme, Typography, Breadcrumb, Avatar, Badge } from 'antd';
import {
    MenuFoldOutlined,
    MenuUnfoldOutlined,
    DashboardOutlined,
    UserOutlined,
    TeamOutlined,
    HomeOutlined,
    LogoutOutlined,
    BellOutlined,
    CalendarOutlined,
    BarChartOutlined,
    ScheduleOutlined,
    FileTextOutlined
} from '@ant-design/icons';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;

const MainLayout = () => {
    const [collapsed, setCollapsed] = useState(false);
    const {
        token: { colorBgContainer, borderRadiusLG },
    } = theme.useToken();

    const navigate = useNavigate();
    const location = useLocation();
    const { logout, user } = useAuth();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const menuItems = [
        {
            key: '/dashboard',
            icon: <DashboardOutlined />,
            label: 'Dashboard',
        },

        {
            key: 'students-sub',
            icon: <UserOutlined />,
            label: 'Students',
            children: [
                { key: '/students', label: 'All Students' }
            ]
        },
        ...(user?.role !== 'PARENT' ? [
            {
                key: 'parents-sub',
                icon: <TeamOutlined />,
                label: 'Parents',
                children: [
                    { key: '/parents', label: 'All Parents' }
                ]
            },
            {
                key: '/classrooms',
                icon: <HomeOutlined />,
                label: 'Classrooms',
            }
        ] : []),
        ...(user?.role === 'SUPER_ADMIN' ? [{
            key: '/staff',
            icon: <UserOutlined />,
            label: 'Staff',
        }] : []),
        ...(user?.role !== 'PARENT' ? [
            {
                key: '/attendance',
                icon: <CalendarOutlined />,
                label: 'Attendance',
            },
            {
                key: 'edu-comm-sub',
                icon: <BellOutlined />,
                label: 'Education & Communication',
                children: [
                    { key: '/announcements', label: 'Announcements' },
                    { key: '/homework', label: 'Homework' }
                ]
            }
        ] : [
            { key: '/announcements', label: 'Announcements', icon: <BellOutlined /> },
            { key: '/homework', label: 'Homework', icon: <BellOutlined /> }
        ]),
        // Only Admin and Super Admin can see Billing (except parents see their own student billing? 
        // User said: "role base access not working properly staff part no need to billing part also"
        // I take this as: Teacher doesn't need Billing. Admin/SuperAdmin do.
        ...((user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN') ? [{
            key: 'billing-sub',
            icon: <FileTextOutlined />,
            label: 'Billing',
            children: [
                { key: '/billing/overview', label: 'Overview' },
                { key: '/billing/students', label: 'Student Billing' },
                { key: '/billing/expenses', label: 'Expenses' }
            ]
        }] : []),
        {
            key: '/events',
            icon: <ScheduleOutlined />,
            label: 'Events',
        },
        ...((user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN') ? [{
            key: '/reports',
            icon: <BarChartOutlined />,
            label: 'Reports',
        }] : [])
    ];

    // Helper to determine breadcrumbs
    const pathSnippets = location.pathname.split('/').filter((i) => i);
    const breadcrumbItems = [
        { title: 'Home' },
        ...pathSnippets.map(curr => ({ title: curr.charAt(0).toUpperCase() + curr.slice(1) }))
    ];

    return (
        <Layout style={{ minHeight: '100vh' }}>
            <Sider trigger={null} collapsible collapsed={collapsed} theme="light" width={260} style={{ borderRight: '1px solid #f0f0f0' }}>
                <div style={{ height: 64, display: 'flex', alignItems: 'center', paddingLeft: 24, margin: '16px 0' }}>
                    <div style={{ width: 40, height: 40, background: '#7B57E4', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold', fontSize: 20 }}>M</div>
                    {!collapsed && (
                        <div style={{ marginLeft: 12, display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: 700, fontSize: 16, color: '#333', lineHeight: '1.2' }}>Malkakulu</span>
                            <span style={{ fontSize: 12, color: '#888' }}>Future Mind</span>
                        </div>
                    )}
                </div>
                <Menu
                    theme="light"
                    mode="inline"
                    defaultOpenKeys={['students-sub', 'parents-sub']}
                    selectedKeys={[location.pathname]}
                    onClick={({ key }) => {
                        if (key.includes('/add')) {
                            // If specific Add page logic needed, handle here. 
                            // For now, assume these route to the same List page but trigger modal? Or distinct page.
                            // Let's route to base and pass state, or handle in component.
                            // Simpler: Just route to the list page for now, or distinct route if we build it.
                            // User requirement: "Add Student" menu exists. Let's make it go to /students with ?action=add
                            navigate(key.replace('/add', '') + '?action=add');
                        } else {
                            navigate(key);
                        }
                    }}
                    items={menuItems}
                    style={{ borderRight: 0, paddingBottom: 80 }}
                />
                <div style={{ position: 'absolute', bottom: 20, width: '100%', padding: '0 24px' }}>
                    <Button
                        type="text"
                        danger
                        icon={<LogoutOutlined />}
                        block
                        onClick={handleLogout}
                        style={{ textAlign: 'left', paddingLeft: 0 }}
                    >
                        {!collapsed && "Logout"}
                    </Button>
                </div>
            </Sider>
            <Layout style={{ background: '#FAFBFC' }}>
                <Header style={{ padding: '0 24px', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 72, borderBottom: '1px solid #f0f0f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <Button
                            type="text"
                            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                            onClick={() => setCollapsed(!collapsed)}
                            style={{ fontSize: '18px', width: 44, height: 44, marginRight: 16 }}
                        />
                        <Breadcrumb items={breadcrumbItems} />
                    </div>

                    <div
                        style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
                        onClick={() => navigate('/dashboard')}
                    >
                        <div style={{ textAlign: 'right', lineHeight: 1.2 }}>
                            <div style={{ fontWeight: 600, color: '#333' }}>{user?.username}</div>
                            <div style={{ fontSize: 11, color: '#888' }}>{user?.role}</div>
                        </div>
                        <Avatar style={{ backgroundColor: '#F0EAFB', color: '#7B57E4' }}>
                            {user?.username?.substring(0, 2).toUpperCase() || 'AD'}
                        </Avatar>
                    </div>
                </Header>
                <Content
                    style={{
                        margin: '24px',
                        minHeight: 280,
                    }}
                >
                    <Outlet />
                </Content>
            </Layout >
        </Layout >
    );
};

export default MainLayout;
