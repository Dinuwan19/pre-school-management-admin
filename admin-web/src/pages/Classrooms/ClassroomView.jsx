import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';

const ClassroomView = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    return (
        <div style={{ padding: 20 }}>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/classrooms')}>Back</Button>
            <h2>Classroom View - Safe Mode</h2>
            <p>Viewing Classroom ID: {id}</p>
        </div>
    );
};

export default ClassroomView;
