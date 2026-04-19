import React, { useState, useEffect } from 'react';
import { Card, Typography, Row, Col, Button, Table, Select, Space, message, Spin, Badge, Radio, Divider, Avatar, Input, Empty, List } from 'antd';
import { 
    BookOutlined, 
    ArrowLeftOutlined, 
    RightOutlined, 
    UserOutlined, 
    SaveOutlined,
    SearchOutlined
} from '@ant-design/icons';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const { Title, Text } = Typography;
const { Option } = Select;

const VIEWS = {
    CATEGORIES: 'CATEGORIES',
    SUB_SKILLS: 'SUB_SKILLS',
    BULK_ENTRY: 'BULK_ENTRY'
};

const Skills = () => {
    console.log('Skills Component Rendering');
    const { user } = useAuth();
    const { isDarkMode } = useTheme();
    const [view, setView] = useState(VIEWS.CATEGORIES);
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [selectedSubSkill, setSelectedSubSkill] = useState(null);
    const [students, setStudents] = useState([]);
    const [classrooms, setClassrooms] = useState([]);
    const [selectedClassroom, setSelectedClassroom] = useState(null);
    const [selectedTerm, setSelectedTerm] = useState(1);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [scores, setScores] = useState({});
    const [searchText, setSearchText] = useState('');

    const fetchCategories = async () => {
        setLoading(true);
        try {
            const res = await api.get('/students/metadata/skills');
            setCategories(res.data);
        } catch (error) {
            console.error('Error fetching categories:', error);
            message.error('Failed to load skill categories');
        } finally {
            setLoading(false);
        }
    };

    const fetchClassrooms = async () => {
        try {
            const res = await api.get('/classrooms');
            setClassrooms(res.data);
            if (res.data.length > 0) {
                setSelectedClassroom(res.data[0].id);
            }
        } catch (e) {
            console.error('Error fetching classrooms:', e);
        }
    };

    const fetchStudentsForSkill = async (subSkillId, classroomId, term) => {
        if (!subSkillId || !classroomId) return;
        setLoading(true);
        try {
            const res = await api.get(`/skills/sub-skill/${subSkillId}/students`, {
                params: { classroomId, term }
            });
            setStudents(res.data);
            const initialScores = {};
            res.data.forEach(s => {
                if (s.currentScore !== null) {
                    initialScores[s.id] = s.currentScore;
                }
            });
            setScores(initialScores);
        } catch (error) {
            console.error('Error fetching students:', error);
            message.error('Failed to load students for this skill');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCategories();
        fetchClassrooms();
    }, []);

    const handleCategoryClick = (category) => {
        setSelectedCategory(category);
        setView(VIEWS.SUB_SKILLS);
    };

    const handleSubSkillClick = (subSkill) => {
        setSelectedSubSkill(subSkill);
        setView(VIEWS.BULK_ENTRY);
        if (selectedClassroom) {
            fetchStudentsForSkill(subSkill.id, selectedClassroom, selectedTerm);
        }
    };

    const handleBack = () => {
        if (view === VIEWS.SUB_SKILLS) setView(VIEWS.CATEGORIES);
        if (view === VIEWS.BULK_ENTRY) setView(VIEWS.SUB_SKILLS);
    };

    const handleScoreChange = (studentId, score) => {
        setScores(prev => ({ ...prev, [studentId]: score }));
    };

    const handleSaveAll = async () => {
        setSaving(true);
        try {
            const updates = Object.entries(scores).map(([studentId, score]) => ({
                studentId: parseInt(studentId),
                score
            }));
            if (updates.length === 0) {
                message.warning('No scores to save');
                setSaving(false);
                return;
            }
            await api.post('/skills/bulk-update', {
                subSkillId: selectedSubSkill.id,
                term: selectedTerm,
                updates
            });
            message.success('Bulk scores updated successfully');
            fetchStudentsForSkill(selectedSubSkill.id, selectedClassroom, selectedTerm);
        } catch (error) {
            console.error('Error saving scores:', error);
            message.error('Failed to update scores');
        } finally {
            setSaving(false);
        }
    };

    const filteredStudents = students.filter(s => 
        s.fullName.toLowerCase().includes(searchText.toLowerCase()) ||
        s.studentUniqueId.toLowerCase().includes(searchText.toLowerCase())
    );

    const columns = [
        {
            title: 'Student',
            key: 'student',
            render: (_, record) => (
                <Space>
                    <Avatar icon={<UserOutlined />} />
                    <div>
                        <div style={{ fontWeight: 600 }}>{record.fullName}</div>
                        <Text type="secondary" style={{ fontSize: 11 }}>{record.studentUniqueId}</Text>
                    </div>
                </Space>
            )
        },
        {
            title: 'Assessment Level',
            key: 'score',
            width: 300,
            render: (_, record) => (
                <Radio.Group 
                    value={scores[record.id]} 
                    onChange={(e) => handleScoreChange(record.id, e.target.value)}
                    buttonStyle="solid"
                >
                    <Radio.Button value={1}>1</Radio.Button>
                    <Radio.Button value={2}>2</Radio.Button>
                    <Radio.Button value={3}>3</Radio.Button>
                    <Button 
                        type="text" 
                        size="small" 
                        onClick={() => handleScoreChange(record.id, null)}
                        style={{ marginLeft: 8, fontSize: 11 }}
                    >
                        Clear
                    </Button>
                </Radio.Group>
            )
        },
        {
            title: 'Status',
            key: 'status',
            render: (_, record) => (
                scores[record.id] ? <Badge status="success" text="Marked" /> : <Badge status="default" text="Pending" />
            )
        }
    ];

    return (
        <div style={{ paddingBottom: 40 }}>
            <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <Title level={3}>
                        {view !== VIEWS.CATEGORIES && (
                            <Button 
                                icon={<ArrowLeftOutlined />} 
                                type="text" 
                                onClick={handleBack}
                                style={{ marginRight: 12 }}
                            />
                        )}
                        Skills Assessment
                    </Title>
                    <Text type="secondary">
                        {view === VIEWS.CATEGORIES && "Select a skill category to begin bulk assessment"}
                        {view === VIEWS.SUB_SKILLS && `Category: ${selectedCategory?.name}`}
                        {view === VIEWS.BULK_ENTRY && `Bulk Entry: ${selectedSubSkill?.name}`}
                    </Text>
                </div>
                {view === VIEWS.BULK_ENTRY && (
                    <Button 
                        type="primary" 
                        icon={<SaveOutlined />} 
                        loading={saving}
                        onClick={handleSaveAll}
                        style={{ height: 40, borderRadius: 8 }}
                    >
                        Save All Changes
                    </Button>
                )}
            </div>

            {loading && !students.length ? (
                <div style={{ textAlign: 'center', padding: 100 }}><Spin size="large" /></div>
            ) : (
                <>
                    {view === VIEWS.CATEGORIES && (
                        <Row gutter={[24, 24]}>
                            {categories.map(cat => (
                                <Col xs={24} sm={12} md={8} lg={6} key={cat.id}>
                                    <Card 
                                        hoverable 
                                        onClick={() => handleCategoryClick(cat)}
                                        style={{ 
                                            borderRadius: 16, 
                                            textAlign: 'center',
                                            border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.05)' : '#f0f0f0'}`
                                        }}
                                        bodyStyle={{ padding: 40 }}
                                    >
                                        <div style={{ 
                                            width: 64, 
                                            height: 64, 
                                            background: 'rgba(123, 87, 228, 0.1)', 
                                            borderRadius: 20, 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            justifyContent: 'center',
                                            margin: '0 auto 20px',
                                            color: '#7B57E4',
                                            fontSize: 32
                                        }}>
                                            <BookOutlined />
                                        </div>
                                        <Title level={4} style={{ margin: 0 }}>{cat.name}</Title>
                                        <Text type="secondary">{(cat.skills || []).length} Sub-skills</Text>
                                    </Card>
                                </Col>
                            ))}
                        </Row>
                    )}

                    {view === VIEWS.SUB_SKILLS && (
                        <Card bordered={false} style={{ borderRadius: 16 }}>
                            <List
                                dataSource={selectedCategory?.skills || []}
                                renderItem={(skill) => (
                                    <List.Item 
                                        onClick={() => handleSubSkillClick(skill)}
                                        style={{ cursor: 'pointer', padding: '20px 24px' }}
                                    >
                                        <Space>
                                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#7B57E4' }} />
                                            <Text strong style={{ fontSize: 16 }}>{skill.name}</Text>
                                        </Space>
                                        <RightOutlined style={{ color: '#bfbfbf' }} />
                                    </List.Item>
                                )}
                            />
                        </Card>
                    )}

                    {view === VIEWS.BULK_ENTRY && (
                        <div>
                            <Card bordered={false} style={{ borderRadius: 16, marginBottom: 24 }}>
                                <Row gutter={24} align="middle">
                                    <Col span={6}>
                                        <Text strong style={{ display: 'block', marginBottom: 8 }}>Classroom</Text>
                                        <Select 
                                            style={{ width: '100%' }} 
                                            value={selectedClassroom}
                                            onChange={(val) => {
                                                setSelectedClassroom(val);
                                                fetchStudentsForSkill(selectedSubSkill.id, val, selectedTerm);
                                            }}
                                        >
                                            {classrooms.map(c => <Option key={c.id} value={c.id}>{c.name}</Option>)}
                                        </Select>
                                    </Col>
                                    <Col span={6}>
                                        <Text strong style={{ display: 'block', marginBottom: 8 }}>Term</Text>
                                        <Select 
                                            style={{ width: '100%' }} 
                                            value={selectedTerm}
                                            onChange={(val) => {
                                                setSelectedTerm(val);
                                                fetchStudentsForSkill(selectedSubSkill.id, selectedClassroom, val);
                                            }}
                                        >
                                            <Option value={1}>Term 1</Option>
                                            <Option value={2}>Term 2</Option>
                                            <Option value={3}>Term 3</Option>
                                        </Select>
                                    </Col>
                                    <Col span={12}>
                                        <Text strong style={{ display: 'block', marginBottom: 8 }}>Search Student</Text>
                                        <Input 
                                            placeholder="Search by name or ID..." 
                                            prefix={<SearchOutlined />} 
                                            onChange={e => setSearchText(e.target.value)}
                                            allowClear
                                        />
                                    </Col>
                                </Row>
                            </Card>

                            <Card bordered={false} style={{ borderRadius: 16 }}>
                                <Table 
                                    dataSource={filteredStudents}
                                    columns={columns}
                                    rowKey="id"
                                    loading={loading}
                                    pagination={{ pageSize: 20 }}
                                />
                            </Card>
                        </div>
                    )}
                </>
            )}

            <style>{`
                .ant-list-item:hover {
                    background: ${isDarkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)'};
                }
            `}</style>
        </div>
    );
};

export default Skills;
