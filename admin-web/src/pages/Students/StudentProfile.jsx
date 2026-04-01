import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Typography, Row, Col, Avatar, Button, Tabs, Progress, List, Tag, Spin, message, Form, Divider, Statistic, Alert, Modal, Input, Select, DatePicker, Upload, Descriptions, Breadcrumb, Space, Empty, Image, theme } from 'antd';
import {
    UserOutlined, ArrowLeftOutlined, EditOutlined, PhoneOutlined,
    EnvironmentOutlined, CalendarOutlined,
    DownloadOutlined, HeartOutlined, UploadOutlined,
    CheckCircleOutlined, InfoCircleOutlined, BookOutlined, BulbOutlined, MedicineBoxOutlined, HomeOutlined, PlusOutlined
} from '@ant-design/icons';
import api, { getMediaUrl } from '../../api/client';
import dayjs from 'dayjs';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

const StudentProfile = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { isDarkMode } = useTheme();
    const [student, setStudent] = useState(null);
    const [attendanceSummary, setAttendanceSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isEditingProgress, setIsEditingProgress] = useState(false);
    const [progressForm] = Form.useForm();
    const [editForm] = Form.useForm();
    const [submittingProgress, setSubmittingProgress] = useState(false);
    const [isEditModalVisible, setIsEditModalVisible] = useState(false);
    const [parents, setParents] = useState([]);
    const [classrooms, setClassrooms] = useState([]);
    const [saving, setSaving] = useState(false);
    const [markingAttendance, setMarkingAttendance] = useState(false);
    const [skillMetadata, setSkillMetadata] = useState([]);
    const [selectedTerm, setSelectedTerm] = useState(1);
    const [assessmentScores, setAssessmentScores] = useState({});
    const [viewMode, setViewMode] = useState('summary'); // 'summary' or 'history'
    const [activeCategoryId, setActiveCategoryId] = useState(null);
    const [focusedSkillIndex, setFocusedSkillIndex] = useState(0);
    const [isReviewModalVisible, setIsReviewModalVisible] = useState(false);
    const [reviewCategory, setReviewCategory] = useState(null);
    const [isAddSubSkillModalVisible, setIsAddSubSkillModalVisible] = useState(false);
    const [newSubSkillName, setNewSubSkillName] = useState('');
    const [addingSubSkill, setAddingSubSkill] = useState(false);

    const {
        token: { colorBgContainer, colorBorder, colorText, colorTextSecondary, colorBgLayout, colorPrimary, colorPrimaryBg, colorFillAlter },
    } = theme.useToken();

    useEffect(() => {
        const handleKeyPress = (e) => {
            if (!isEditingProgress) return;
            if (['1', '2', '3'].includes(e.key)) {
                const val = parseInt(e.key);
                const currentCat = skillMetadata.find(c => c.id.toString() === activeCategoryId);
                if (currentCat && currentCat.skills[focusedSkillIndex]) {
                    const skillId = currentCat.skills[focusedSkillIndex].id;
                    const currentScore = assessmentScores[skillId];

                    if (currentScore === val) {
                        // Toggle OFF if same score pressed
                        setAssessmentScores(prev => {
                            const next = { ...prev };
                            delete next[skillId];
                            return next;
                        });
                    } else {
                        // Mark score
                        setAssessmentScores(prev => ({ ...prev, [skillId]: val }));
                        // Move to next skill automatically
                        if (focusedSkillIndex < currentCat.skills.length - 1) {
                            setFocusedSkillIndex(prev => prev + 1);
                        }
                    }
                }
            }
        };
        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [isEditingProgress, activeCategoryId, focusedSkillIndex, skillMetadata, assessmentScores]);

    const calculateAge = (dob) => {
        if (!dob) return 'N/A';
        const birth = dayjs(dob);
        const now = dayjs();
        const years = now.diff(birth, 'year');
        const months = now.diff(birth.add(years, 'year'), 'month');
        if (years === 0) return `${months}m`;
        return `${years}y`;
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const [studentRes, metaRes, attendRes] = await Promise.all([
                api.get(`/students/${id}`),
                api.get('/students/metadata/skills'),
                api.get(`/attendance/student/${id}`)
            ]);
            setStudent(studentRes.data);
            setSkillMetadata(metaRes.data);
            setAttendanceSummary(attendRes.data);
            if (metaRes.data.length > 0) setActiveCategoryId(metaRes.data[0].id.toString());

            // Fetch secondary data
            if (user?.role !== 'TEACHER' && user?.role !== 'PARENT') {
                const [pRes, cRes] = await Promise.all([
                    api.get('/parents').catch(() => ({ data: [] })),
                    api.get('/classrooms').catch(() => ({ data: [] }))
                ]);
                setParents(pRes.data);
                setClassrooms(cRes.data);
            }

        } catch (error) {
            console.error('Error fetching student data:', error);
            message.error('Failed to load student profile');
            setStudent(null);
        } finally {
            setLoading(false);
        }
    };

    const fetchSkillMetadata = async () => {
        try {
            const res = await api.get('/students/metadata/skills');
            setSkillMetadata(res.data);
        } catch (error) {
            console.error('Error fetching skill metadata:', error);
        }
    };

    useEffect(() => {
        fetchData();
        fetchSkillMetadata();
    }, [id]);

    useEffect(() => {
        if (student && !loading) {
            const p = student.progress || {};
            progressForm.setFieldsValue({
                reading: p.reading || 0,
                writing: p.writing || 0,
                speaking: p.speaking || 0,
                listening: p.listening || 0,
                mathematics: p.mathematics || 0,
                social: p.social || 0,
                remarks: p.remarks || ''
            });
        }
    }, [student, loading, progressForm]);

    const handleEditSave = async () => {
        try {
            const values = await editForm.validateFields();
            setSaving(true);

            const formData = new FormData();
            Object.keys(values).forEach(key => {
                if (values[key] !== undefined && values[key] !== null) {
                    if (key === 'dob' || key === 'enrollmentDate') {
                        formData.append(key, values[key].format('YYYY-MM-DD'));
                    } else if (key === 'photo' || key === 'birthCert') {
                        // Handle Ant Design Upload structure
                        const fileObj = values[key]?.file || values[key]?.fileList?.[0] || (values[key] instanceof File ? values[key] : null);
                        if (fileObj && (fileObj.originFileObj || fileObj instanceof File)) {
                            formData.append(key, fileObj.originFileObj || fileObj);
                        }
                    } else {
                        formData.append(key, values[key]);
                    }
                }
            });

            console.log('Form Values:', values);
            console.log('FormData Content:');
            for (let pair of formData.entries()) {
                console.log(pair[0] + ': ', pair[1]);
            }

            await api.put(`/students/${id}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            message.success('Student updated successfully');
            setIsEditModalVisible(false);
            fetchData();
        } catch (error) {
            message.error(error.response?.data?.message || 'Update failed');
        } finally {
            setSaving(false);
        }
    };

    const handleSaveProgress = async () => {
        try {
            setSubmittingProgress(true);
            const scorePayload = Object.entries(assessmentScores).map(([subSkillId, score]) => ({
                subSkillId: parseInt(subSkillId),
                score
            }));

            await api.put(`/students/${id}/progress`, {
                term: selectedTerm,
                remarks: progressForm.getFieldValue('remarks'),
                scores: scorePayload
            });

            message.success('Assessment saved');
            setIsEditingProgress(false);
            fetchData();
        } catch (error) {
            message.error('Failed to save assessment');
        } finally {
            setSubmittingProgress(false);
        }
    };

    const handleAddSubSkill = async () => {
        if (!newSubSkillName.trim()) return;
        setAddingSubSkill(true);
        try {
            const res = await api.post(`/students/metadata/skills/${activeCategoryId}/subskills`, { name: newSubSkillName });
            message.success('Skill added to category');
            setNewSubSkillName('');
            setIsAddSubSkillModalVisible(false);
            // Refresh metadata
            const metaRes = await api.get('/students/metadata/skills');
            setSkillMetadata(metaRes.data);
        } catch (error) {
            message.error('Failed to add skill');
        } finally {
            setAddingSubSkill(false);
        }
    };

    const handleMarkAttendance = async () => {
        setMarkingAttendance(true);
        try {
            await api.post('/attendance/scan', {
                studentId: parseInt(id)
            });
            message.success('Attendance processed');
            fetchData();
        } catch (error) {
            message.error(error.response?.data?.message || 'Failed to mark attendance');
        } finally {
            setMarkingAttendance(false);
        }
    };

    const getStatusTag = (status) => {
        if (status === 'COMPLETED') return <Tag color="success">COMPLETED</Tag>;
        if (status === 'PRESENT') return <Tag color="processing">IN SCHOOL</Tag>;
        if (status === 'ABSENT') return <Tag color="error">ABSENT</Tag>;
        if (status === 'LATE') return <Tag color="warning">LATE</Tag>;
        return <Tag color="default">NOT MARKED</Tag>;
    };

    if (loading) return <div style={{ textAlign: 'center', marginTop: 100 }}><Spin size="large" /></div>;
    if (!student) return <div style={{ padding: 40 }}><Alert message="Student not found" type="error" showIcon action={<Button onClick={() => navigate('/students')}>Back to Students</Button>} /></div>;


    const tabItems = [
        {
            key: 'profile',
            label: <span><UserOutlined />Profile</span>,
            children: (
                <div style={{ paddingTop: 16 }}>
                    <Card size="small" title={<Text strong>Personal Information</Text>} bordered={false} style={{ marginBottom: 16, background: colorBgContainer }}>
                        <Row gutter={[16, 24]}>
                            <Col span={12}>
                                <Text type="secondary" style={{ fontSize: 12 }}>Full Name</Text>
                                <div style={{ fontWeight: 500 }}>{student.fullName}</div>
                            </Col>
                            <Col span={12}>
                                <Text type="secondary" style={{ fontSize: 12 }}>Student ID</Text>
                                <div style={{ fontWeight: 500 }}>{student.studentUniqueId}</div>
                            </Col>
                            <Col span={12}>
                                <Text type="secondary" style={{ fontSize: 12 }}>Date of Birth</Text>
                                <div style={{ fontWeight: 500 }}>{student.dateOfBirth ? dayjs(student.dateOfBirth).format('M/D/YYYY') : 'N/A'}</div>
                            </Col>
                            <Col span={12}>
                                <Text type="secondary" style={{ fontSize: 12 }}>Age</Text>
                                <div style={{ fontWeight: 500 }}>{calculateAge(student.dateOfBirth)}</div>
                            </Col>
                            <Col span={12}>
                                <Text type="secondary" style={{ fontSize: 12 }}>Gender</Text>
                                <div style={{ fontWeight: 500 }}>{student.gender || 'N/A'}</div>
                            </Col>
                            <Col span={12}>
                                <Text type="secondary" style={{ fontSize: 12 }}>Enrollment Date</Text>
                                <div style={{ fontWeight: 500 }}>{student.enrollmentDate ? dayjs(student.enrollmentDate).format('M/D/YYYY') : 'N/A'}</div>
                            </Col>
                            <Col span={24}>
                                <Text type="secondary" style={{ fontSize: 12 }}>Address</Text>
                                <div style={{ fontWeight: 500 }}>{student.address || 'N/A'}</div>
                            </Col>
                        </Row>
                        <Button
                            block
                            style={{ marginTop: 24, borderRadius: 8 }}
                            icon={<DownloadOutlined />}
                            onClick={() => {
                                if (student.birthCertPdf) {
                                    window.open(getMediaUrl(student.birthCertPdf), '_blank');
                                } else {
                                    message.info('No birth certificate uploaded yet');
                                }
                            }}
                        >
                            Birth Certificate
                        </Button>
                    </Card>

                    <Card size="small" title={<Text strong>Contact Information</Text>} bordered={false} style={{ marginBottom: 16, background: colorBgContainer }}>
                        <Descriptions column={1} size="small">
                            <Descriptions.Item label="Primary Contact">{student.parent_student_parentIdToparent?.phone || 'N/A'}</Descriptions.Item>


                            <Descriptions.Item label={<span style={{ color: '#ff4d4f', fontWeight: 'bold' }}>Emergency Contact</span>}>
                                <Tag
                                    color="error"
                                    style={{
                                        borderRadius: 6,
                                        padding: '4px 12px',
                                        fontWeight: 600,
                                        fontSize: 13,
                                        border: isDarkMode ? '1px solid rgba(255, 77, 79, 0.2)' : '1px solid #ffccc7'
                                    }}
                                >
                                    {student.emergencyContact || 'N/A'}
                                </Tag>
                            </Descriptions.Item>
                        </Descriptions>
                        <Divider style={{ margin: '12px 0' }} />
                        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>Parent/Guardian</Text>
                        <List
                            dataSource={[student.parent_student_parentIdToparent, student.parent_student_secondParentIdToparent].filter(Boolean)}
                            renderItem={(p, idx) => (
                                <List.Item style={{ padding: '8px 0', border: 0 }}>
                                    <Space size={12}>
                                        <Avatar src={getMediaUrl(p.photoUrl)}>{p.fullName[0]}</Avatar>
                                        <div>
                                            <div style={{ fontWeight: 500 }}>{p.fullName}</div>
                                            <Text type="secondary" style={{ fontSize: 12 }}>{idx === 0 ? 'father' : 'mother'}</Text>
                                        </div>
                                    </Space>
                                    <div style={{ textAlign: 'right', fontSize: 12 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end', color: '#555' }}>
                                            <PhoneOutlined /> {p.phone || 'N/A'}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end', color: '#888', marginTop: 2 }}>
                                            <EnvironmentOutlined /> {p.address || 'N/A'}
                                        </div>
                                    </div>
                                </List.Item>
                            )}
                        />
                        <Divider style={{ margin: '12px 0' }} />
                        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>Classroom</Text>
                        <Tag color="purple" style={{ borderRadius: 12, padding: '2px 12px' }}>{student.classroom?.name || 'No Classroom'}</Tag>
                    </Card>

                    <Card size="small" title={<Text strong>Medical Information</Text>} bordered={false} style={{ marginBottom: 16, background: colorBgContainer }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>Medical Notes</Text>
                        <div style={{ marginTop: 4 }}>{student.medicalInfo || 'No allergies'}</div>
                    </Card>

                    <Card size="small" title={<Text strong>Additional Notes</Text>} bordered={false} style={{ background: colorBgContainer }}>
                        <div style={{ marginTop: 4 }}>{student.additionalNotes || 'Enjoys group activities'}</div>
                    </Card>
                </div>
            )
        },
        {
            key: 'progress',
            label: <span><BookOutlined />Progress</span>,
            children: (
                <div style={{ paddingTop: 16 }}>
                    <style>{`
                        .marking-sidebar .ant-menu-item { height: auto !important; line-height: 1.4 !important; padding: 12px 16px !important; margin: 4px 0 !important; border-radius: 8px !important; }
                        .marking-sidebar .ant-menu-item-selected { background: transparent !important; color: #7b57e4 !important; }
                        .skill-card { transition: all 0.2s; border: none; margin-bottom: 12px; border-radius: 12px; background: ${isDarkMode ? 'rgba(255,255,255,0.02)' : '#fff'} }
                        .skill-card:hover { border-color: #7b57e4; box-shadow: 0 4px 12px rgba(123, 87, 228, 0.08); }
                        .skill-card.focused { border-color: #7b57e4; border-width: 2px; }
                        .score-btn { width: 44px; height: 32px; border-radius: 6px; font-weight: 700; font-size: 11px; }
                        .progress-pill { font-size: 10px; background: ${isDarkMode ? 'rgba(255,255,255,0.05)' : '#eee'}; padding: 2px 8px; border-radius: 10px; color: ${isDarkMode ? '#94a3b8' : '#666'}; font-weight: 600; margin-top: 4px; display: inline-block; }
                        .progress-pill.complete { background: ${isDarkMode ? 'rgba(82, 196, 26, 0.1)' : '#e6ffed'}; color: #52c41a; }
                    `}</style>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                        <div>
                            <Title level={5} style={{ margin: 0 }}>Progress Management</Title>
                            <Text type="secondary" style={{ fontSize: 13 }}>Mark student development for the current term</Text>
                        </div>
                        <Space>
                            <Select value={selectedTerm} onChange={setSelectedTerm} style={{ width: 100 }}>
                                <Option value={1}>Term 1</Option>
                                <Option value={2}>Term 2</Option>
                                <Option value={3}>Term 3</Option>
                            </Select>
                            {(user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' || user?.role === 'TEACHER') && !isEditingProgress && (
                                <Button
                                    type="primary"
                                    icon={<EditOutlined />}
                                    style={{ background: '#7b57e4', borderRadius: 8 }}
                                    onClick={() => {
                                        const assessment = student.assessments?.find(a => a.term === selectedTerm);
                                        if (assessment) {
                                            const scoresMap = {};
                                            (assessment.scores || []).forEach(s => {
                                                scoresMap[s.subSkillId] = s.score;
                                            });
                                            setAssessmentScores(scoresMap);
                                            progressForm.setFieldsValue({ remarks: assessment.remarks });
                                        } else {
                                            setAssessmentScores({});
                                            progressForm.setFieldsValue({ remarks: '' });
                                        }
                                        setIsEditingProgress(true);
                                    }}
                                >
                                    {student.assessments?.find(a => a.term === selectedTerm) ? 'Edit Assessment' : 'New Assessment'}
                                </Button>
                            )}
                        </Space>
                    </div>

                    {isEditingProgress ? (
                        <div style={{ display: 'flex', gap: 24 }}>
                            {/* Sidebar */}
                            <div style={{ width: 200 }}>
                                <div style={{ marginBottom: 16, padding: '0 8px' }}>
                                    <Text strong style={{ fontSize: 12, textTransform: 'uppercase', color: '#999' }}>Categories</Text>
                                </div>
                                <div className="marking-sidebar">
                                    {skillMetadata.map(cat => {
                                        const markedCount = cat.skills.filter(s => assessmentScores[s.id]).length;
                                        const isComplete = markedCount === cat.skills.length;
                                        return (
                                            <div
                                                key={cat.id}
                                                onClick={() => { setActiveCategoryId(cat.id.toString()); setFocusedSkillIndex(0); }}
                                                style={{
                                                    padding: '12px 16px',
                                                    borderRadius: 12,
                                                    cursor: 'pointer',
                                                    marginBottom: 8,
                                                    background: activeCategoryId === cat.id.toString() ? 'rgba(123, 87, 228, 0.15)' : 'transparent', // Keeping light purple for active state for now or use colorBgLayout? Let's keep it specific but maybe use a token if possible. actually F3EFFF is static. Let's make it dynamic if we can, or leave it if it works in dark mode. Wait, F3EFFF is very light. In dark mode this might be blinding. 
                                                    // Let's use colorBgContainer for inactive, and a primary-tinted bg for active.
                                                    background: activeCategoryId === cat.id.toString() ? colorPrimaryBg : 'transparent',
                                                    border: activeCategoryId === cat.id.toString() ? `1px solid ${colorPrimary}` : '1px solid transparent'
                                                }}
                                            >
                                                <Text strong style={{ color: activeCategoryId === cat.id.toString() ? '#7B57E4' : colorText, display: 'block' }}>{cat.name}</Text>
                                                <div className={`progress-pill ${isComplete ? 'complete' : ''}`}>
                                                    {markedCount}/{cat.skills.length} Marked
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Main Assessment Sheet */}
                            <div style={{ flex: 1 }}>
                                {(() => {
                                    const currentCat = skillMetadata.find(c => c.id.toString() === activeCategoryId);
                                    if (!currentCat) return null;
                                    return (
                                        <>
                                            <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                                                <div>
                                                    <Tag color="blue">{currentCat?.skills.length} Skills</Tag>
                                                    <Title level={4} style={{ margin: '4px 0 0 0' }}>{currentCat?.name}</Title>
                                                </div>
                                                <Button
                                                    type="dashed"
                                                    icon={<PlusOutlined />}
                                                    onClick={() => setIsAddSubSkillModalVisible(true)}
                                                    style={{ borderRadius: 8, color: '#666', fontWeight: 600 }}
                                                >
                                                    Add Skill to {currentCat?.name}
                                                </Button>
                                            </div>

                                            <div style={{ maxHeight: '600px', overflowY: 'auto', paddingRight: 8, margin: '0 -8px' }}>
                                                {currentCat?.skills.map((skill, index) => {
                                                    const score = assessmentScores[skill.id];
                                                    const isFocused = index === focusedSkillIndex;
                                                    return (
                                                        <Card
                                                            key={skill.id}
                                                            size="small"
                                                            className={`skill-card ${isFocused ? 'focused' : ''}`}
                                                            style={{
                                                                borderColor: score === 1 ? '#ff4d4f' : score === 2 ? '#faad14' : score === 3 ? '#52c41a' : (isFocused ? '#7b57e4' : '#f0f0f0'),
                                                                background: isFocused ? colorPrimaryBg : colorBgContainer
                                                            }}
                                                            onClick={() => setFocusedSkillIndex(index)}
                                                        >
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                <div style={{ flex: 1 }}>
                                                                    <Text strong style={{ fontSize: 15, display: 'block', marginBottom: 2 }}>
                                                                        {index + 1}. {skill.name}
                                                                    </Text>
                                                                    <Text type="secondary" style={{ fontSize: 12 }}>Press keyboard 1, 2 or 3</Text>
                                                                </div>
                                                                <Space>
                                                                    {[
                                                                        { val: 1, label: 'NS', color: '#ff4d4f' },
                                                                        { val: 2, label: 'AP', color: '#faad14' },
                                                                        { val: 3, label: 'AC', color: '#52c41a' }
                                                                    ].map(opt => (
                                                                        <Button
                                                                            key={opt.val}
                                                                            className="score-btn"
                                                                            style={{
                                                                                borderColor: opt.color,
                                                                                color: assessmentScores[skill.id] === opt.val ? '#fff' : opt.color,
                                                                                background: assessmentScores[skill.id] === opt.val ? opt.color : '#fff',
                                                                                boxShadow: assessmentScores[skill.id] === opt.val ? `0 2px 8px ${opt.color}44` : 'none'
                                                                            }}
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                const currentScore = assessmentScores[skill.id];
                                                                                if (currentScore === opt.val) {
                                                                                    setAssessmentScores(prev => {
                                                                                        const next = { ...prev };
                                                                                        delete next[skill.id];
                                                                                        return next;
                                                                                    });
                                                                                } else {
                                                                                    setAssessmentScores(prev => ({ ...prev, [skill.id]: opt.val }));
                                                                                    if (index < currentCat.skills.length - 1) setFocusedSkillIndex(index + 1);
                                                                                }
                                                                            }}
                                                                        >{opt.label}</Button>
                                                                    ))}
                                                                </Space>
                                                            </div>
                                                        </Card>
                                                    );
                                                })}
                                            </div>

                                            <div style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid #f0f0f0' }}>
                                                <Form form={progressForm} layout="vertical">
                                                    <Form.Item name="remarks" label={<Text strong>Notes for {currentCat.name}</Text>}>
                                                        <Input.TextArea rows={3} placeholder="Add specific observation for this category..." />
                                                    </Form.Item>
                                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, alignItems: 'center', width: '100%' }}>
                                                        <Button size="large" onClick={() => setIsEditingProgress(false)} style={{ borderRadius: 12 }}>Discard</Button>
                                                        <Button type="primary" size="large" style={{ background: '#7B57E4', borderRadius: 12 }} onClick={handleSaveProgress} loading={submittingProgress}>
                                                            Complete Term {selectedTerm} Assessment
                                                        </Button>
                                                    </div>
                                                </Form>
                                            </div>

                                            <Modal
                                                title={<Text strong>Add New Assessment Skill</Text>}
                                                open={isAddSubSkillModalVisible}
                                                onOk={handleAddSubSkill}
                                                onCancel={() => setIsAddSubSkillModalVisible(false)}
                                                confirmLoading={addingSubSkill}
                                                okText="Add Skill"
                                                okButtonProps={{ style: { background: '#7b57e4' } }}
                                            >
                                                <div style={{ padding: '8px 0' }}>
                                                    <Text type="secondary" style={{ fontSize: 13, display: 'block', marginBottom: 12 }}>
                                                        This will add a new sub-skill to <b>{currentCat.name}</b> for all students.
                                                    </Text>
                                                    <Input
                                                        placeholder="e.g. Can count from 1 to 50"
                                                        value={newSubSkillName}
                                                        onChange={(e) => setNewSubSkillName(e.target.value)}
                                                        onPressEnter={handleAddSubSkill}
                                                        autoFocus
                                                    />
                                                </div>
                                            </Modal>
                                        </>
                                    );
                                })()}
                            </div>
                        </div>
                    ) : (
                        <div>
                            {student.assessments?.find(a => a.term === selectedTerm) ? (
                                (() => {
                                    const assessment = student.assessments.find(a => a.term === selectedTerm);
                                    return (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                                            <div style={{ background: colorBgContainer, borderRadius: 12, padding: '16px 24px', border: 'none', marginBottom: 4, boxShadow: 'none' }}>
                                                <Row align="middle">
                                                    <Col span={16}>
                                                        <Text style={{ color: colorTextSecondary, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>Term Performance</Text>
                                                        <Title level={4} style={{ color: colorText, margin: '2px 0 0' }}>Term {selectedTerm} Progress</Title>
                                                    </Col>
                                                    <Col span={8} style={{ textAlign: 'right' }}>
                                                        <div style={{ display: 'inline-block', textAlign: 'right' }}>
                                                            <div style={{ fontSize: 32, fontWeight: 800, lineHeight: 1, color: '#7b57e4' }}>
                                                                {(() => {
                                                                    const markedScores = assessment.scores || [];
                                                                    const totalMarkedWeight = markedScores.length * 3;
                                                                    const actualMarkedWeight = markedScores.reduce((sum, s) => sum + s.score, 0);
                                                                    return totalMarkedWeight > 0 ? Math.round((actualMarkedWeight / totalMarkedWeight) * 100) : 0;
                                                                })()}%
                                                            </div>
                                                            <div style={{ color: colorTextSecondary, fontSize: 9, fontWeight: 700, marginTop: 4 }}>CUMULATIVE RELATIVE</div>
                                                        </div>
                                                    </Col>
                                                </Row>
                                            </div>

                                            <Row gutter={[20, 20]}>
                                                {skillMetadata.map(cat => {
                                                    const catScores = (assessment.scores || []).filter(s => s.subSkill?.categoryId === cat.id);
                                                    const totalSkills = cat.skills.length;
                                                    const markedSkills = catScores.length;

                                                    let label, color, percentage, percentageDisplay;

                                                    if (markedSkills === 0) {
                                                        label = 'Not Assessed';
                                                        color = '#94a3b8'; // Grey
                                                        percentage = 0;
                                                        percentageDisplay = '--';
                                                    } else {
                                                        const maxMarkedPossible = markedSkills * 3;
                                                        const actual = catScores.reduce((sum, s) => sum + s.score, 0);
                                                        percentage = Math.round((actual / maxMarkedPossible) * 100);
                                                        percentageDisplay = `${percentage}%`;

                                                        if (markedSkills < totalSkills) {
                                                            label = 'Assessing...';
                                                            color = '#7b57e4'; // Theme Purple
                                                        } else {
                                                            if (percentage >= 85) { label = 'Mastered'; color = '#52c41a'; } // Green
                                                            else if (percentage >= 45) { label = 'Progressing'; color = '#1890ff'; } // Blue
                                                            else { label = 'Needs Support'; color = '#ff4d4f'; } // Light Red
                                                        }
                                                    }

                                                    const CATEGORY_COLORS = {
                                                        'Language Development Skills': '#1890ff', // Blue
                                                        'Logical & Mathematical Skills': '#ff4d4f', // Red
                                                        'Physical Development Skills': '#52c41a', // Green
                                                        'Aesthetic & Creative Skills': '#faad14', // Orange
                                                        'Living & Non-Living World': '#7b57e4', // Purple
                                                        'Healthy Living Habits': '#2dd4bf', // Teal (Changed from Deep Purple)
                                                        'Cultural Heritage & Values': '#eb2f96' // Magenta
                                                    };
                                                    const barColor = CATEGORY_COLORS[cat.name] || '#7b57e4';

                                                    return (
                                                        <Col span={12} key={cat.id}>
                                                            <Card
                                                                size="small"
                                                                bordered={false}
                                                                style={{
                                                                    borderRadius: 16,
                                                                    boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                                                                    minHeight: 180,
                                                                    display: 'flex',
                                                                    flexDirection: 'column',
                                                                    border: 'none',
                                                                    opacity: markedSkills === 0 ? 0.7 : 1
                                                                }}
                                                                bodyStyle={{ padding: 20, flex: 1, display: 'flex', flexDirection: 'column' }}
                                                            >
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 4px' }}>
                                                                    <div style={{ flex: 1 }}>
                                                                        <Text strong style={{ fontSize: 14, color: markedSkills === 0 ? colorTextSecondary : colorText, display: 'block', marginBottom: 6 }}>{cat.name}</Text>
                                                                        <Tag color={color} style={{ borderRadius: 6, border: 'none', fontWeight: 600, fontSize: 10 }}>{label.toUpperCase()}</Tag>
                                                                    </div>
                                                                    <div style={{ textAlign: 'right' }}>
                                                                        <div style={{ fontSize: 24, fontWeight: 700, color: barColor }}>{percentageDisplay}</div>
                                                                        {markedSkills > 0 && markedSkills < totalSkills && (
                                                                            <div style={{ fontSize: 9, color: '#999', fontWeight: 600 }}>{markedSkills}/{totalSkills} SKILLS</div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <Progress
                                                                    percent={percentage}
                                                                    showInfo={false}
                                                                    strokeColor={barColor}
                                                                    trailColor="#f5f5f5"
                                                                    strokeWidth={6}
                                                                    style={{ marginTop: 12, opacity: markedSkills === 0 ? 0.3 : 1 }}
                                                                />
                                                                {markedSkills > 0 && (
                                                                    <Button
                                                                        type="link"
                                                                        size="small"
                                                                        onClick={() => { setReviewCategory(cat); setIsReviewModalVisible(true); }}
                                                                        style={{ padding: 0, marginTop: 8, fontSize: 11, height: 'auto', color: '#7b57e4' }}
                                                                    >
                                                                        Review {markedSkills} Results →
                                                                    </Button>
                                                                )}
                                                            </Card>
                                                        </Col>
                                                    );
                                                })}
                                            </Row>
                                            <Card
                                                size="small"
                                                title={<Text strong style={{ color: '#7b57e4' }}><BulbOutlined /> Teacher's Insights</Text>}
                                                bordered={false}
                                                style={{ borderRadius: 16, background: colorBgContainer, border: `1px solid ${colorBorder}` }}
                                            >
                                                <Paragraph style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: colorText }}>
                                                    {assessment.remarks || 'No remarks added for this term.'}
                                                </Paragraph>
                                                <div style={{ marginTop: 16, borderTop: `1px solid ${colorBorder}`, paddingTop: 12, display: 'flex', justifyContent: 'space-between' }}>
                                                    <Text type="secondary" style={{ fontSize: 11 }}>Signed by {assessment.user?.fullName}</Text>
                                                    <Text type="secondary" style={{ fontSize: 11 }}>{dayjs(assessment.updatedAt).format('MMMM DD, YYYY')}</Text>
                                                </div>
                                            </Card>

                                            <Modal
                                                title={<Text strong style={{ fontSize: 16 }}>Assessment Details: {reviewCategory?.name}</Text>}
                                                open={isReviewModalVisible}
                                                onCancel={() => setIsReviewModalVisible(false)}
                                                footer={[
                                                    <Button key="close" onClick={() => setIsReviewModalVisible(false)}>Close</Button>
                                                ]}
                                                width={600}
                                                centered
                                                bodyStyle={{ padding: '12px 24px 24px' }}
                                            >
                                                <div style={{ marginBottom: 20 }}>
                                                    <Text type="secondary">Showing results for <b>Term {selectedTerm}</b>. Only assessed skills are listed below.</Text>
                                                </div>
                                                <List
                                                    className="review-list"
                                                    dataSource={(assessment.scores || []).filter(s => s.subSkill?.categoryId === reviewCategory?.id)}
                                                    renderItem={(item) => (
                                                        <List.Item style={{ padding: '16px 0', borderBottom: '1px solid #f0f2f5' }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                                    <Text strong style={{ fontSize: 13, color: colorText }}>{item.subSkill?.name}</Text>
                                                                    <Text type="secondary" style={{ fontSize: 11 }}>Progressing well</Text>
                                                                </div>
                                                                <Tag
                                                                    color={item.score === 3 ? 'success' : item.score === 2 ? 'blue' : 'orange'}
                                                                    style={{ borderRadius: 6, fontWeight: 700, fontSize: 10, padding: '2px 10px', textTransform: 'uppercase' }}
                                                                >
                                                                    {item.score === 3 ? 'Achieved' : item.score === 2 ? 'Approaching' : 'Learning'}
                                                                </Tag>
                                                            </div>
                                                        </List.Item>
                                                    )}
                                                    locale={{ emptyText: <Empty description="No assessments recorded for this category." /> }}
                                                />
                                            </Modal>
                                        </div>
                                    );
                                })()
                            ) : (
                                <Empty description={`No assessment found for Term ${selectedTerm}`} image={Empty.PRESENTED_IMAGE_SIMPLE} />
                            )}
                        </div>
                    )}
                </div>
            )
        },
        {
            key: 'attendance',
            label: <span><CalendarOutlined />Attendance</span>,
            children: (
                <div style={{ paddingTop: 16 }}>
                    <Card size="small" title={<Text strong>Attendance Overview</Text>} bordered={false} style={{ marginBottom: 16 }}>
                        <Row gutter={16}>
                            <Col span={8}>
                                <Statistic title="Attendance Rate" value={attendanceSummary?.attendanceRate} suffix="%" />
                            </Col>
                            <Col span={8}>
                                <Statistic title="Present Days" value={attendanceSummary?.presentDays} />
                            </Col>
                            <Col span={8}>
                                <Statistic title="Total Days Tracked" value={attendanceSummary?.totalDays} />
                            </Col>
                        </Row>
                        <Divider />
                        <Button
                            type="primary"
                            style={{ borderRadius: 6, height: 40, width: '100%' }}
                            onClick={handleMarkAttendance}
                            loading={markingAttendance}
                            icon={<CheckCircleOutlined />}
                        >
                            Fast Check-In / Out (Auto Logic)
                        </Button>
                    </Card>

                    <Card size="small" title={<Text strong>Attendance History</Text>} bordered={false}>
                        <List
                            dataSource={attendanceSummary?.history || []}
                            renderItem={(item) => (
                                <List.Item>
                                    <List.Item.Meta
                                        title={dayjs(item.attendanceDate).format('MMMM D, YYYY')}
                                        description={
                                            <Space split={<Divider type="vertical" />}>
                                                <span>Check-In: {item.checkInTime ? dayjs(item.checkInTime).format('hh:mm A') : '-'}</span>
                                                <span>Check-Out: {item.checkOutTime ? dayjs(item.checkOutTime).format('hh:mm A') : '-'}</span>
                                            </Space>
                                        }
                                    />
                                    <div>
                                        {getStatusTag(item.status)}
                                    </div>
                                </List.Item>
                            )}
                            locale={{ emptyText: <Empty description="No attendance history yet" /> }}
                        />
                    </Card>
                </div>
            )
        },
        {
            key: 'payments',
            label: <span><MedicineBoxOutlined />Payments</span>,
            children: (
                <div style={{ paddingTop: 16 }}>
                    <Card size="small" title={<Text strong>12-Month Payment Overview ({dayjs().year()})</Text>} bordered={false} style={{ marginBottom: 16 }}>
                        <div style={{ 
                            display: 'grid', 
                            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', 
                            gap: 12,
                            padding: '16px 0'
                        }}>
                            {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(month => {
                                // Find billing for this month (Monthly Fee only - categoryId is null)
                                const monthBill = (student.billing || []).find(b => {
                                    if (b.categoryId !== null) return false;
                                    
                                    const months = b.billingMonth.split(',').map(m => m.trim().toLowerCase());
                                    return months.some(m => {
                                        // Match direct names like "January"
                                        if (m === month.toLowerCase()) return true;
                                        // Match date formats like "2026-01"
                                        if (m.includes('-')) {
                                            const d = dayjs(m);
                                            return d.isValid() && d.format('MMMM').toLowerCase() === month.toLowerCase() && d.year() === dayjs().year();
                                        }
                                        return false;
                                    });
                                });

                                let statusColor = colorBgLayout;
                                let statusText = 'Not Billed';
                                let textColor = colorTextSecondary;
                                let borderColor = colorBorder;

                                // Check if the month is before enrollment
                                const currentYear = dayjs().year();
                                const monthIndex = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'].indexOf(month.toLowerCase());
                                const gridDate = dayjs().year(currentYear).month(monthIndex).startOf('month');
                                const enrollmentDate = student.enrollmentDate ? dayjs(student.enrollmentDate).startOf('month') : null;

                                const isBeforeEnrollment = enrollmentDate && gridDate.isBefore(enrollmentDate);

                                if (isBeforeEnrollment) {
                                    statusColor = 'transparent';
                                    statusText = 'N/A';
                                    textColor = colorTextSecondary;
                                    borderColor = colorBorder;
                                } else if (monthBill) {
                                    const status = monthBill.status;
                                    if (status === 'PAID' || status === 'APPROVED') {
                                        statusColor = 'rgba(82, 196, 26, 0.1)';
                                        statusText = 'Paid';
                                        textColor = '#52c41a';
                                        borderColor = '#52c41a';
                                    } else if (status === 'PENDING') {
                                        statusColor = 'rgba(250, 173, 20, 0.1)';
                                        statusText = 'Pending';
                                        textColor = '#faad14';
                                        borderColor = '#faad14';
                                    } else if (status === 'OVERDUE') {
                                        statusColor = 'rgba(255, 77, 79, 0.1)';
                                        statusText = 'Overdue';
                                        textColor = '#ff4d4f';
                                        borderColor = '#ff4d4f';
                                    } else {
                                        statusColor = 'rgba(255, 77, 79, 0.05)';
                                        statusText = 'Unpaid';
                                        textColor = '#ff4d4f';
                                        borderColor = colorBorder;
                                    }
                                }

                                return (
                                    <div key={month} style={{
                                        background: statusColor,
                                        border: isBeforeEnrollment ? `1px dashed ${borderColor}` : `1px solid ${borderColor}`,
                                        opacity: isBeforeEnrollment ? 0.5 : 1,
                                        borderRadius: 12,
                                        padding: '16px 12px',
                                        textAlign: 'center',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'center',
                                        transition: 'all 0.3s ease'
                                    }}>
                                        <div style={{ fontWeight: 700, fontSize: 13, color: colorText, marginBottom: 4 }}>{month}</div>
                                        <div style={{ 
                                            fontSize: 10, 
                                            fontWeight: 800, 
                                            textTransform: 'uppercase',
                                            color: textColor,
                                            letterSpacing: 0.5
                                        }}>
                                            {statusText}
                                        </div>
                                        {monthBill && (
                                            <div style={{ fontSize: 11, marginTop: 4, opacity: 0.8 }}>
                                                LKR {parseFloat(monthBill.amount).toLocaleString()}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </Card>

                    <Card size="small" title={<Text strong>Other Payments (Uniforms, Books, etc.)</Text>} bordered={false}>
                        <List
                            dataSource={(student.billing || []).filter(b => b.categoryId !== null)}
                            renderItem={(item) => (
                                <List.Item style={{ padding: '12px 16px' }}>
                                    <List.Item.Meta
                                        title={<Text strong>{item.billingCategory?.name || item.billingMonth}</Text>}
                                        description={dayjs(item.createdAt).format('MMM DD, YYYY')}
                                    />
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontWeight: 600 }}>LKR {parseFloat(item.amount).toLocaleString()}</div>
                                        <Tag color={
                                            item.status === 'PAID' || item.status === 'APPROVED' ? 'green' : 
                                            item.status === 'OVERDUE' ? 'error' : 
                                            item.status === 'PENDING' ? 'gold' : 'red'
                                        }>
                                            {item.status}
                                        </Tag>
                                    </div>
                                </List.Item>
                            )}
                            locale={{ emptyText: <Empty description="No transaction history" /> }}
                        />
                    </Card>
                </div>
            )
        }
    ];


    return (
        <div style={{ background: colorBgLayout, minHeight: '100vh', padding: '0 24px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0' }}>
                <div style={{ flex: 1 }}></div>
                <Space></Space>
            </div>

            <div style={{ display: 'flex', gap: 16, marginBottom: 16, alignItems: 'center' }}>
                <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/students')} size="small" style={{ borderRadius: 4 }}>Back</Button>
                <Title level={4} style={{ margin: 0 }}>{student.fullName}</Title>
                <div style={{ flex: 1 }}></div>
                {(user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN') && (
                    <Button type="primary" icon={<EditOutlined />} style={{ background: '#7B57E4', borderRadius: 6 }} onClick={() => setIsEditModalVisible(true)}>Edit Profile</Button>
                )}
            </div>

            <Row gutter={24}>
                <Col xs={24} md={6}>
                    <Card bordered={false} style={{ borderRadius: 16, textAlign: 'center', height: '100%', background: colorBgContainer }}>
                        <div style={{ padding: '24px 0' }}>
                            <div style={{
                                display: 'inline-block',
                                padding: '6px',
                                background: isDarkMode ? 'rgba(255,255,255,0.05)' : '#fff',
                                borderRadius: '50%',
                                boxShadow: '0 8px 24px rgba(123, 87, 228, 0.2)',
                                border: '2px solid #7B57E4'
                            }}>
                                <Avatar size={120} src={getMediaUrl(student.photoUrl)} icon={<UserOutlined />} style={{ background: colorBgLayout }} />
                            </div>                            <Title level={4} style={{ marginTop: 16, marginBottom: 4 }}>{student.fullName}</Title>
                            <Text type="secondary">{student.studentUniqueId}</Text>
                        </div>
                        <div style={{ textAlign: 'left', marginTop: 24 }}>
                            <Space direction="vertical" style={{ width: '100%' }} size={16}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <CalendarOutlined style={{ color: '#999' }} />
                                    <span>{student.dateOfBirth ? dayjs(student.dateOfBirth).format('M/D/YYYY') : 'N/A'}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <InfoCircleOutlined style={{ color: '#999' }} />
                                    <span>{calculateAge(student.dateOfBirth)}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <PhoneOutlined style={{ color: '#999' }} />
                                    <span>{student.parent_student_parentIdToparent?.phone || 'N/A'}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                                    <EnvironmentOutlined style={{ color: '#999', marginTop: 4 }} />
                                    <span>{student.address || 'N/A'}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <HomeOutlined style={{ color: '#999' }} />
                                    <span>{student.classroom?.name || 'No Classroom'}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <MedicineBoxOutlined style={{ color: '#999' }} />
                                    <span>{student.medicalInfo || 'No allergies'}</span>
                                </div>
                            </Space>
                        </div>
                        <div style={{ marginTop: 24, padding: 16, background: colorBgLayout, borderRadius: 12, border: `1px dashed ${colorBorder}` }}>
                            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>Student QR Code</Text>
                            {student.qrCode ? (
                                <div style={{ textAlign: 'center' }}>
                                    <Image
                                        src={getMediaUrl(student.qrCode)}
                                        width={140}
                                        style={{ borderRadius: 8 }}
                                        placeholder={<Spin />}
                                    />
                                    <Button
                                        block
                                        type="primary"
                                        ghost
                                        style={{ marginTop: 16, borderRadius: 8 }}
                                        icon={<DownloadOutlined />}
                                        onClick={async () => {
                                            try {
                                                const url = getMediaUrl(student.qrCode);
                                                const response = await fetch(url);
                                                const blob = await response.blob();
                                                const blobUrl = window.URL.createObjectURL(blob);
                                                const link = document.createElement('a');
                                                link.href = blobUrl;
                                                link.download = `${student.fullName}_QR.png`;
                                                document.body.appendChild(link);
                                                link.click();
                                                document.body.removeChild(link);
                                                window.URL.revokeObjectURL(blobUrl);
                                            } catch (error) {
                                                console.error('Download failed', error);
                                                message.error('Failed to download QR code. Please try right-clicking the image and saving it.');
                                            }
                                        }}
                                    >
                                        Download QR
                                    </Button>
                                </div>
                            ) : (
                                <Text type="danger">No QR code generated</Text>
                            )}
                        </div>
                    </Card>
                </Col>

                <Col xs={24} md={18}>
                    <Card bordered={false} style={{ borderRadius: 16, minHeight: '600px' }} bodyStyle={{ padding: '0 24px' }}>
                        <Tabs defaultActiveKey="profile" items={tabItems} size="large" />
                    </Card>
                </Col>
            </Row>

            <Modal
                title="Edit Student Info"
                open={isEditModalVisible}
                onCancel={() => setIsEditModalVisible(false)}
                onOk={handleEditSave}
                confirmLoading={saving}
                width={700}
            >
                <Form
                    form={editForm}
                    layout="vertical"
                    initialValues={{
                        ...student,
                        dob: student.dateOfBirth ? dayjs(student.dateOfBirth) : null,
                        enrollmentDate: student.enrollmentDate ? dayjs(student.enrollmentDate) : dayjs()
                    }}
                >
                    <Row gutter={16}>
                        <Col span={12}><Form.Item name="fullName" label="Full Name" rules={[{ required: true }]}><Input /></Form.Item></Col>
                        <Col span={12}><Form.Item name="gender" label="Gender"><Select><Option value="MALE">Male</Option><Option value="FEMALE">Female</Option></Select></Form.Item></Col>
                        <Col span={12}><Form.Item name="dob" label="Date of Birth"><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
                        <Col span={12}><Form.Item name="classroomId" label="Classroom"><Select>{classrooms.map(c => <Option key={c.id} value={c.id}>{c.name}</Option>)}</Select></Form.Item></Col>
                        <Col span={12}>
                            <Form.Item name="parentId" label="Primary Parent">
                                <Select>{parents.map(p => <Option key={p.id} value={p.id}>{p.fullName}</Option>)}</Select>
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="secondParentId" label="Secondary Parent">
                                <Select allowClear>{parents.map(p => <Option key={p.id} value={p.id}>{p.fullName}</Option>)}</Select>
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="photo" label="Update Photo">
                                <Upload beforeUpload={() => false} maxCount={1} listType="picture" accept="image/*">
                                    <Button icon={<UploadOutlined />}>Select Image</Button>
                                </Upload>
                                {student.photoUrl && <div style={{ fontSize: 10, color: '#999', marginTop: 4 }}>Current: {student.photoUrl.split('/').pop()}</div>}
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="birthCert" label="Birth Certificate (PDF)">
                                <Upload beforeUpload={() => false} maxCount={1} accept=".pdf">
                                    <Button icon={<UploadOutlined />}>Select PDF</Button>
                                </Upload>
                                {student.birthCertPdf && <div style={{ fontSize: 10, color: '#999', marginTop: 4 }}>Current: {student.birthCertPdf.split('/').pop()}</div>}
                            </Form.Item>
                        </Col>
                    </Row>
                </Form>
            </Modal>
        </div>
    );
};

export default StudentProfile;
