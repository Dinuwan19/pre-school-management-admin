import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Spin } from 'antd';

const ProtectedRoute = ({ children, allowedRoles }) => {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><Spin size="large" /></div>;
    }

    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (allowedRoles) {
        const userRole = user.role?.toUpperCase().trim();
        const roles = allowedRoles.map(r => r.toUpperCase().trim());
        if (!roles.includes(userRole)) {
            return (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
                    <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.02)', padding: '40px 60px', borderRadius: 24, border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ fontSize: 64, marginBottom: 16 }}>🚫</div>
                        <h2 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 8px 0' }}>Access Denied</h2>
                        <p style={{ color: '#94a3b8', fontSize: 16, marginBottom: 24 }}>You do not have permission to view this page.</p>
                        <Navigate to="/" />
                    </div>
                </div>
            );
        }
    }

    return children;
};

export default ProtectedRoute;
