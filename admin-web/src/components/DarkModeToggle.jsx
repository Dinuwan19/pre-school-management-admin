import React from 'react';
import { Switch } from 'antd';
import { BulbOutlined, BulbFilled } from '@ant-design/icons';
import { useTheme } from '../context/ThemeContext';

const DarkModeToggle = () => {
    const { isDarkMode, toggleTheme } = useTheme();

    return (
        <Switch
            checked={isDarkMode}
            onChange={toggleTheme}
            checkedChildren={<BulbFilled />}
            unCheckedChildren={<BulbOutlined />}
            style={{ backgroundColor: isDarkMode ? '#177ddc' : '#bfbfbf' }}
        />
    );
};

export default DarkModeToggle;
