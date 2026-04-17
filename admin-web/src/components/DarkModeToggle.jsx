import React from 'react';
import { Switch } from 'antd';
import { SunOutlined, MoonOutlined } from '@ant-design/icons';
import { useTheme } from '../context/ThemeContext';

const DarkModeToggle = () => {
    const { isDarkMode, toggleTheme } = useTheme();

    return (
        <Switch
            checked={isDarkMode}
            onChange={toggleTheme}
            checkedChildren={<MoonOutlined style={{ color: '#fff' }} />}
            unCheckedChildren={<SunOutlined style={{ color: '#000' }} />}
            style={{ 
                backgroundColor: isDarkMode ? '#7B57E4' : '#FDCB6E',
                boxShadow: isDarkMode ? '0 0 8px rgba(123, 87, 228, 0.4)' : '0 0 8px rgba(253, 203, 110, 0.4)'
            }}
        />
    );
};

export default DarkModeToggle;
