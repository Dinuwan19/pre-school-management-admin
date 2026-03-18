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
    FileTextOutlined,
    IdcardOutlined
} from '@ant-design/icons';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import DarkModeToggle from '../components/DarkModeToggle';
import { fetchDashboardStats } from '../api/services';

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;

const MainLayout = () => {
    const [collapsed, setCollapsed] = useState(false);
    const [pendingMeetings, setPendingMeetings] = useState(0);
    const {
        token: { colorBgContainer, borderRadiusLG, colorBgLayout, colorText, colorTextSecondary, colorBorder },
    } = theme.useToken();

    const navigate = useNavigate();
    const location = useLocation();
    const { logout, user } = useAuth();
    const userRole = user?.role?.toUpperCase().trim();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const fetchPendingCount = async () => {
        try {
            const res = await fetchDashboardStats();
            setPendingMeetings(res.data?.counts?.pendingMeetings || 0);
        } catch (error) {
            console.error('Failed to fetch pending meetings count', error);
        }
    };

    React.useEffect(() => {
        fetchPendingCount();
        // Refresh every 5 minutes
        const interval = setInterval(fetchPendingCount, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    const menuItems = [
        ...(userRole === 'SUPER_ADMIN' || userRole === 'ADMIN' || userRole === 'STAFF' || userRole === 'TEACHER' ? [{
            key: '/dashboard',
            icon: <DashboardOutlined />,
            label: 'Dashboard',
        }] : []),

        // STUDENTS - ACCESSIBLE BY ALL (EXCEPT PARENT)
        ...(userRole !== 'PARENT' ? [{
            key: '/students',
            icon: <UserOutlined />,
            label: 'Students',
        }] : []),

        // PARENTS & CLASSROOMS
        ...(userRole !== 'PARENT' && userRole !== 'CASHIER' ? [
            {
                key: '/parents',
                icon: <TeamOutlined />,
                label: 'Parents',
            },
            {
                key: '/classrooms',
                icon: <HomeOutlined />,
                label: 'Classrooms',
            }
        ] : []),

        // STAFF - SUPER ADMIN ONLY
        ...(userRole === 'SUPER_ADMIN' ? [{
            key: '/staff',
            icon: <IdcardOutlined />,
            label: 'Staff',
        }] : []),

        // ATTENDANCE & COMMUNICATION
        ...(userRole !== 'PARENT' && userRole !== 'CASHIER' ? [
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
                    { key: '/meetings', label: 'Meeting Requests' },
                    { key: '/homework', label: 'Homework' }
                ]
            }
        ] : userRole === 'PARENT' ? [
            { key: '/announcements', label: 'Announcements', icon: <BellOutlined /> },
            { key: '/homework', label: 'Homework', icon: <BellOutlined /> }
        ] : []),

        // BILLING - SUPER_ADMIN, ADMIN, CASHIER
        ...((userRole === 'SUPER_ADMIN' || userRole === 'ADMIN' || userRole === 'CASHIER') ? [{
            key: 'billing-sub',
            icon: <FileTextOutlined />,
            label: 'Billing',
            children: [
                { key: '/billing/overview', label: 'Overview' },
                { key: '/billing/students', label: 'Student Billing' },
                { key: '/billing/expenses', label: 'Expenses' }
            ]
        }] : []),

        // EVENTS - HIDE FROM CASHIER, TEACHER
        ...(userRole !== 'PARENT' && userRole !== 'CASHIER' && userRole !== 'TEACHER' ? [{
            key: '/events',
            icon: <ScheduleOutlined />,
            label: 'Events',
        }] : []),

        // REPORTS - ADMIN & SUPER ADMIN ONLY
        ...((userRole === 'SUPER_ADMIN' || userRole === 'ADMIN' || userRole === 'STAFF') ? [{
            key: '/reports',
            icon: <BarChartOutlined />,
            label: 'Reports',
        }] : [])
    ];

    // Helper to determine breadcrumbs
    const pathSnippets = location.pathname.split('/').filter((i) => i);
    const breadcrumbItems = [
        { title: 'Home', path: '/' },
        ...pathSnippets.map((snippet, index) => {
            const url = `/${pathSnippets.slice(0, index + 1).join('/')}`;
            return {
                title: snippet.charAt(0).toUpperCase() + snippet.slice(1),
                path: url
            };
        })
    ].map(item => ({
        title: <span style={{ cursor: 'pointer' }} onClick={() => navigate(item.path)}>{item.title}</span>
    }));

    // Logic for selected menu keys
    const getSelectedKeys = () => {
        const path = location.pathname;
        if (path === '/dashboard') return ['/dashboard'];
        if (path.startsWith('/students')) return ['/students'];
        if (path.startsWith('/parents')) return ['/parents'];
        if (path.startsWith('/staff')) return ['/staff'];
        if (path.startsWith('/classrooms')) return ['/classrooms'];
        if (path.startsWith('/attendance')) return ['/attendance'];
        if (path.startsWith('/announcements')) return ['/announcements'];
        if (path.startsWith('/meetings')) return ['/meetings'];
        if (path.startsWith('/homework')) return ['/homework'];
        if (path.startsWith('/billing')) return [path]; // Billing might need specific logic if we want to collapse it
        if (path.startsWith('/events')) return ['/events'];
        if (path.startsWith('/reports')) return ['/reports'];
        return [path];
    };

    return (
        <Layout style={{ minHeight: '100vh' }}>
            <Sider trigger={null} collapsible collapsed={collapsed} theme="light" width={260} style={{ borderRight: `1px solid ${colorBorder}`, backgroundColor: colorBgContainer }}>
                <div style={{ height: 64, display: 'flex', alignItems: 'center', paddingLeft: 24, margin: '16px 0' }}>
                    <div style={{ width: 40, height: 40, background: '#7B57E4', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold', fontSize: 20 }}>M</div>
                    {!collapsed && (
                        <div style={{ marginLeft: 12, display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: 700, fontSize: 16, color: colorText, lineHeight: '1.2' }}>Malkakulu</span>
                            <span style={{ fontSize: 12, color: colorTextSecondary }}>Future Mind</span>
                        </div>
                    )}
                </div>
                <Menu
                    theme="light"
                    mode="inline"
                    defaultOpenKeys={['billing-sub', 'edu-comm-sub']}
                    selectedKeys={getSelectedKeys()}
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
                    style={{ borderRight: 0, paddingBottom: 80, backgroundColor: colorBgContainer }}
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
            <Layout style={{ background: colorBgLayout }}>
                <Header style={{ padding: '0 24px', background: colorBgContainer, display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 72, borderBottom: `1px solid ${colorBorder}` }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <Button
                            type="text"
                            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                            onClick={() => setCollapsed(!collapsed)}
                            style={{ fontSize: '18px', width: 44, height: 44, marginRight: 16, color: colorText }}
                        />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                        <DarkModeToggle />

                        <Badge count={pendingMeetings} size="small" offset={[-2, 6]}>
                            <Button
                                type="text"
                                icon={<BellOutlined style={{ fontSize: 20, color: colorTextSecondary }} />}
                                onClick={() => navigate('/meetings')}
                                style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            />
                        </Badge>

                        <div
                            style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
                            onClick={() => navigate('/')}
                        >
                            <div style={{ textAlign: 'right', lineHeight: 1.2 }}>
                                <div style={{ fontWeight: 600, color: colorText }}>{user?.username}</div>
                                <div style={{ fontSize: 11, color: colorTextSecondary }}>{user?.role}</div>
                            </div>
                            <Avatar style={{ backgroundColor: '#F0EAFB', color: '#7B57E4' }}>
                                {user?.username?.substring(0, 2).toUpperCase() || 'AD'}
                            </Avatar>
                        </div>
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
