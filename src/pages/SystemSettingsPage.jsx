import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Empty, Form, Input, InputNumber, message, Modal, Spin, Switch } from 'antd';
import { useSelector } from 'react-redux';
import { settingApi } from '../api/settingApi';
import StaffNav from '../components/StaffNav';

const SystemSettingsPage = () => {
    const [form] = Form.useForm();
    const { user } = useSelector((state) => state.auth);
    const roleId = user?.roleId;
    const canEdit = roleId === 'R1';
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const loadSettings = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await settingApi.get();
            form.setFieldsValue(res?.data || {});
        } catch (err) {
            const msg = err?.message || err?.errMessage || 'Không thể tải cài đặt hệ thống';
            setError(msg);
            message.error(msg);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void loadSettings();
    }, []);

    const saveSettings = async (values) => {
        const doSave = async () => {
            setSaving(true);
            try {
                await settingApi.update(values);
                message.success('Lưu cài đặt hệ thống thành công');
                await loadSettings();
            } catch (err) {
                message.error(err?.message || err?.errMessage || 'Không thể lưu cài đặt');
            } finally {
                setSaving(false);
            }
        };

        if (values.maintenanceMode) {
            Modal.confirm({
                title: 'Bật chế độ bảo trì?',
                content: 'Khách hàng có thể bị gián đoạn trải nghiệm khi hệ thống bảo trì.',
                okText: 'Bật bảo trì',
                cancelText: 'Hủy',
                onOk: doSave,
            });
            return;
        }

        await doSave();
    };

    const content = useMemo(() => {
        if (loading) return <div className="grid min-h-[320px] place-items-center"><Spin /></div>;
        if (error) return <Empty description={error} />;

        return (
            <Form form={form} layout="vertical" onFinish={saveSettings} disabled={!canEdit}>
                {!canEdit && <Alert className="mb-5" type="info" showIcon message="Manager chỉ được xem cài đặt hệ thống, không được chỉnh sửa." />}
                <div className="grid gap-4 md:grid-cols-2">
                    <Form.Item name="shopName" label="Tên cửa hàng" rules={[{ required: true, message: 'Nhập tên cửa hàng' }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="supportEmail" label="Email hỗ trợ" rules={[{ required: true, type: 'email', message: 'Email không hợp lệ' }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="supportPhone" label="Số điện thoại hỗ trợ" rules={[{ required: true, message: 'Nhập số điện thoại' }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="shopAddress" label="Địa chỉ cửa hàng">
                        <Input />
                    </Form.Item>
                    <Form.Item name="defaultShippingFee" label="Phí vận chuyển mặc định" rules={[{ required: true, type: 'number', min: 0 }]}>
                        <InputNumber className="w-full" min={0} />
                    </Form.Item>
                    <Form.Item name="cancelOrderLimitMinutes" label="Số phút cho phép hủy đơn" rules={[{ required: true, type: 'number', min: 0 }]}>
                        <InputNumber className="w-full" min={0} />
                    </Form.Item>
                    <Form.Item name="lowStockThreshold" label="Ngưỡng cảnh báo tồn kho thấp" rules={[{ required: true, type: 'number', min: 0 }]}>
                        <InputNumber className="w-full" min={0} />
                    </Form.Item>
                    <Form.Item name="maintenanceMode" label="Chế độ bảo trì" valuePropName="checked">
                        <Switch />
                    </Form.Item>
                </div>
                <Form.Item name="maintenanceMessage" label="Thông báo bảo trì">
                    <Input.TextArea rows={4} />
                </Form.Item>
                {canEdit && <Button type="primary" htmlType="submit" loading={saving}>Lưu cài đặt</Button>}
            </Form>
        );
    }, [loading, error, canEdit, saving]);

    return (
        <div className="min-h-screen bg-slate-50 p-6">
            <div className="mx-auto max-w-6xl">
                <StaffNav roleId={roleId} />
                <Card title="Cài đặt hệ thống">{content}</Card>
            </div>
        </div>
    );
};

export default SystemSettingsPage;
