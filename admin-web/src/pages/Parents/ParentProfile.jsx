import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Typography, Row, Col, Avatar, Button, Tabs, List, Tag, Spin, message, Divider, Space, Modal, Form, Input, Select, Breadcrumb } from 'antd';
import {
  UserOutlined, ArrowLeftOutlined, EditOutlined, PhoneOutlined,
  EnvironmentOutlined, MailOutlined, SafetyCertificateOutlined,
  TeamOutlined, SolutionOutlined, InfoCircleOutlined
} from '@ant-design/icons';
import { fetchParentById, updateParent } from '../../api/services';
import dayjs from 'dayjs';
import { useAuth } from '../../context/AuthContext';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

const ParentProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [parent, setParent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editForm] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const fetchParent = async () => {
    try {
      const res = await fetchParentById(id);
      setParent(res.data);
    } catch (error) {
      message.error('Failed to load parent profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParent();
  }, [id]);

  const handleEditSave = async () => {
    try {
      const values = await editForm.validateFields();
      setSaving(true);
      await updateParent(id, values);
      message.success('Parent profile updated');
      setIsEditModalVisible(false);
      fetchParent();
    } catch (error) {
      message.error('Update failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', marginTop: 100 }}><Spin size="large" /></div>;
  if (!parent) return <div>Parent not found</div>;

  return (
    <div style={{ paddingBottom: 40 }}>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24, alignItems: 'center' }}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/parents')} shape="circle" />
          <div>
            <Title level={3} style={{ margin: 0 }}>{parent.fullName}</Title>
            <Text type="secondary">{parent.parentUniqueId}</Text>
          </div>
        </Space>
        {(user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN') && (
          <Button type="primary" icon={<EditOutlined />} onClick={() => setIsEditModalVisible(true)} style={{ background: '#7B57E4' }}>Edit Profile</Button>
        )}
      </div>

      <Row gutter={[24, 24]}>
        <Col xs={24} md={8}>
          <Card style={{ borderRadius: 16 }}>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <Avatar size={100} src={parent.photoUrl} icon={<UserOutlined />} />
              <Title level={4} style={{ margin: '16px 0 0 0' }}>{parent.fullName}</Title>
              <Text type="secondary">{parent.relationship}</Text>
            </div>
            <Divider />
            <Space direction="vertical" style={{ width: '100%' }}>
              <div><MailOutlined style={{ marginRight: 8, color: '#7B57E4' }} /><Text>{parent.email}</Text></div>
              <div><PhoneOutlined style={{ marginRight: 8, color: '#7B57E4' }} /><Text>{parent.phone}</Text></div>
              <div><EnvironmentOutlined style={{ marginRight: 8, color: '#7B57E4' }} /><Text>{parent.address}</Text></div>
              <div><SolutionOutlined style={{ marginRight: 8, color: '#7B57E4' }} /><Text>{parent.occupation}</Text></div>
            </Space>
            <Divider style={{ margin: '12px 0' }} />
          </Card>
        </Col>

        <Col xs={24} md={16}>
          <Card title="Connected Students" style={{ borderRadius: 16 }}>
            <List
              dataSource={parent.students || []}
              renderItem={student => (
                <List.Item onClick={() => navigate(`/students/${student.id}`)} style={{ cursor: 'pointer' }}>
                  <List.Item.Meta
                    avatar={<Avatar src={student.photoUrl} />}
                    title={student.fullName}
                    description={student.studentUniqueId}
                  />
                  <Tag color="blue">View Profile</Tag>
                </List.Item>
              )}
              locale={{ emptyText: 'No students assigned' }}
            />
          </Card>
        </Col>
      </Row>

      <Modal
        title="Edit Parent Profile"
        open={isEditModalVisible}
        onCancel={() => setIsEditModalVisible(false)}
        onOk={handleEditSave}
        confirmLoading={saving}
      >
        <Form form={editForm} layout="vertical" initialValues={parent} style={{ marginTop: 16 }}>
          <Form.Item name="fullName" label="Full Name" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="relationship" label="Relationship">
            <Select><Option value="FATHER">Father</Option><Option value="MOTHER">Mother</Option><Option value="GUARDIAN">Guardian</Option></Select>
          </Form.Item>
          <Form.Item name="email" label="Email"><Input /></Form.Item>
          <Form.Item name="phone" label="Phone" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="address" label="Address"><Input.TextArea rows={2} /></Form.Item>
          <Form.Item name="occupation" label="Occupation"><Input /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ParentProfile;