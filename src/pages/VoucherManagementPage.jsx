// Tien - Trang quản lý Voucher dành cho Admin
import { useEffect, useState } from 'react';
import { Button, Card, Empty, Input, message, Modal, Space, Table, Tag, Popconfirm, Tooltip, Progress } from 'antd';
import { useSelector } from 'react-redux';
import dayjs from 'dayjs';
import {
    getAdminVouchersApi,
    createAdminVoucherApi,
    updateAdminVoucherApi,
    deleteAdminVoucherApi,
} from '../util/api';
import StaffNav from '../components/StaffNav';
import VoucherFormModal from '../components/VoucherFormModal';

// Tien - Định dạng hiển thị tiền VND
const formatVnd = (value) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(value || 0));
};

// Tien - Định dạng hiển thị ngày giờ
const formatDate = (dateString) => {
    if (!dateString) return '-';
    return dayjs(dateString).format('DD/MM/YYYY HH:mm');
};

const VoucherManagementPage = () => {
    const { user } = useSelector((state) => state.auth);
    const roleId = user?.roleId;
    const isAdmin = roleId === 'R1';

    const [vouchers, setVouchers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
    
    // Modal states
    const [modalOpen, setModalOpen] = useState(false);
    const [editingVoucher, setEditingVoucher] = useState(null);

    // Tien - Gọi API tải danh sách mã giảm giá từ backend
    const loadVouchers = async (page = pagination.current, limit = pagination.pageSize, search = searchText) => {
        setLoading(true);
        try {
            const res = await getAdminVouchersApi({
                page,
                limit,
                search,
            });
            const data = res?.data || {};
            setVouchers(data.items || []);
            setPagination({
                current: data.pagination?.page || page,
                pageSize: data.pagination?.limit || limit,
                total: data.pagination?.total || 0,
            });
        } catch (err) {
            message.error(err?.message || err?.errMessage || 'Không thể tải danh sách mã giảm giá');
        } finally {
            setLoading(false);
        }
    };

    // Tien - Tải dữ liệu lần đầu hoặc khi đổi từ khóa tìm kiếm
    useEffect(() => {
        void loadVouchers(1, pagination.pageSize, searchText);
    }, [searchText]);

    // Tien - Xử lý khi gửi form tạo mới hoặc cập nhật voucher
    const handleFormSubmit = async (payload) => {
        setSaving(true);
        try {
            if (editingVoucher) {
                await updateAdminVoucherApi(editingVoucher._id, payload);
                message.success('Cập nhật mã giảm giá thành công');
            } else {
                await createAdminVoucherApi(payload);
                message.success('Tạo mã giảm giá mới thành công');
            }
            setModalOpen(false);
            setEditingVoucher(null);
            await loadVouchers(editingVoucher ? pagination.current : 1);
        } catch (err) {
            message.error(err?.message || err?.errMessage || 'Không thể lưu mã giảm giá');
        } finally {
            setSaving(false);
        }
    };

    // Tien - Xử lý bật/tắt nhanh trạng thái hoạt động của voucher sau khi xác nhận
    const handleToggleStatus = async (record) => {
        try {
            const nextStatus = !record.isActive;
            await updateAdminVoucherApi(record._id, { isActive: nextStatus });
            message.success(`Đã ${nextStatus ? 'kích hoạt' : 'vô hiệu hóa'} mã ${record.code}`);
            await loadVouchers();
        } catch (err) {
            message.error(err?.message || err?.errMessage || 'Không thể cập nhật trạng thái');
        }
    };

    // Tien - Xử lý xóa voucher
    const handleDeleteVoucher = async (id) => {
        try {
            await deleteAdminVoucherApi(id);
            message.success('Xóa mã giảm giá thành công');
            await loadVouchers();
        } catch (err) {
            message.error(err?.message || err?.errMessage || 'Không thể xóa mã giảm giá');
        }
    };

    // Tien - Xác định trạng thái của voucher bằng ngày tháng hiện tại
    const getVoucherStatus = (record) => {
        if (!record.isActive) return { text: 'Đang tắt', color: 'red' };
        const now = dayjs();
        const start = dayjs(record.startDate);
        const end = dayjs(record.endDate);

        if (now.isBefore(start)) {
            return { text: 'Sắp diễn ra', color: 'blue' };
        }
        if (now.isAfter(end)) {
            return { text: 'Hết hạn', color: 'default' };
        }
        return { text: 'Hoạt động', color: 'green' };
    };

    // Tien - Định nghĩa các cột cho bảng hiển thị voucher
    const columns = [
        {
            title: 'Mã voucher',
            dataIndex: 'code',
            key: 'code',
            render: (text) => <b className="text-slate-900 tracking-wider font-mono">{text}</b>,
        },
        {
            title: 'Mô tả',
            dataIndex: 'description',
            key: 'description',
            width: 200,
        },
        {
            title: 'Mức giảm giá',
            key: 'discount',
            render: (_, record) => {
                if (record.discountType === 'PERCENT') {
                    return (
                        <div>
                            <Tag color="cyan" className="font-semibold">{record.discountValue}%</Tag>
                            {record.maxDiscountAmount > 0 && (
                                <div className="text-xs text-slate-500 mt-1">
                                    Tối đa: {formatVnd(record.maxDiscountAmount)}
                                </div>
                            )}
                        </div>
                    );
                } else {
                    return <Tag color="gold" className="font-semibold">{formatVnd(record.discountValue)}</Tag>;
                }
            },
        },
        {
            title: 'Đơn tối thiểu',
            dataIndex: 'minOrderAmount',
            key: 'minOrderAmount',
            render: (amount) => amount > 0 ? formatVnd(amount) : <span className="text-slate-400">Không có</span>,
        },
        {
            title: 'Thời gian áp dụng',
            key: 'time',
            render: (_, record) => (
                <div className="text-xs space-y-1">
                    <div><span className="text-slate-400">Từ:</span> {formatDate(record.startDate)}</div>
                    <div><span className="text-slate-400">Đến:</span> {formatDate(record.endDate)}</div>
                </div>
            ),
        },
        {
            title: 'Lượt sử dụng',
            key: 'usage',
            render: (_, record) => {
                const percent = Math.min(100, Math.round((record.usedCount / record.usageLimit) * 100));
                return (
                    <div className="min-w-[120px]">
                        <div className="text-xs mb-1 flex justify-between">
                            <span>Đã dùng: <b>{record.usedCount}</b></span>
                            <span className="text-slate-400">Tối đa: {record.usageLimit}</span>
                        </div>
                        <Progress percent={percent} size="small" status={percent >= 100 ? 'exception' : 'normal'} showInfo={false} />
                    </div>
                );
            },
        },
        {
            title: 'Trạng thái',
            key: 'status',
            render: (_, record) => {
                const status = getVoucherStatus(record);
                return <Tag color={status.color}>{status.text}</Tag>;
            },
        },
        {
            title: 'Hành động',
            key: 'actions',
            render: (_, record) => (
                <Space wrap size="small">
                    <Button 
                        size="small" 
                        onClick={() => {
                            setEditingVoucher(record);
                            setModalOpen(true);
                        }}
                    >
                        Sửa
                    </Button>
                    <Popconfirm
                        title={record.isActive ? 'Tắt mã giảm giá?' : 'Bật mã giảm giá?'}
                        description={`Bạn có chắc chắn muốn ${record.isActive ? 'vô hiệu hóa' : 'kích hoạt'} mã giảm giá "${record.code}"?`}
                        onConfirm={() => handleToggleStatus(record)}
                        okText="Xác nhận"
                        cancelText="Hủy"
                        okButtonProps={record.isActive ? { danger: true } : { type: 'primary', className: 'bg-indigo-600' }}
                    >
                        <Button 
                            size="small"
                            type={record.isActive ? 'default' : 'primary'}
                            ghost={!record.isActive}
                        >
                            {record.isActive ? 'Tắt' : 'Bật'}
                        </Button>
                    </Popconfirm>
                    {isAdmin && (
                        <Popconfirm
                            title="Xóa mã giảm giá này?"
                            description="Hành động này sẽ xóa vĩnh viễn voucher khỏi hệ thống."
                            onConfirm={() => handleDeleteVoucher(record._id)}
                            okText="Xóa"
                            cancelText="Hủy"
                            okButtonProps={{ danger: true }}
                        >
                            <Button size="small" danger>Xóa</Button>
                        </Popconfirm>
                    )}
                </Space>
            ),
        },
    ];

    return (
        <div className="min-h-screen bg-[linear-gradient(180deg,#eef4ff_0%,#f7fafc_35%,#f8fafc_100%)] text-slate-800 p-6">
            <div className="mx-auto max-w-7xl">
                <StaffNav roleId={roleId} />
                
                <Card
                    className="mt-6 rounded-3xl border border-slate-200 bg-white/90 shadow-sm backdrop-blur"
                    title={
                        <div>
                            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-indigo-500">Voucher Management</p>
                            <h1 className="mt-1 text-2xl font-black text-slate-900">Quản lý mã giảm giá (Vouchers)</h1>
                        </div>
                    }
                    extra={
                        <Button 
                            type="primary" 
                            className="bg-indigo-600 hover:!bg-indigo-700 rounded-xl h-10 px-4 font-semibold"
                            onClick={() => {
                                setEditingVoucher(null);
                                setModalOpen(true);
                            }}
                        >
                            Thêm voucher mới
                        </Button>
                    }
                >
                    <div className="mb-6 max-w-md">
                        <Input.Search 
                            placeholder="Tìm kiếm theo mã voucher..." 
                            allowClear 
                            enterButton
                            size="large"
                            value={searchText} 
                            onChange={(e) => setSearchText(e.target.value)}
                            onSearch={(val) => loadVouchers(1, pagination.pageSize, val)}
                            className="rounded-xl overflow-hidden"
                        />
                    </div>

                    <Table
                        rowKey="_id"
                        loading={loading}
                        columns={columns}
                        dataSource={vouchers}
                        locale={{ emptyText: <Empty description="Chưa có mã giảm giá nào được tạo" /> }}
                        pagination={pagination}
                        onChange={(next) => loadVouchers(next.current, next.pageSize, searchText)}
                        className="border border-slate-100 rounded-2xl overflow-hidden"
                    />
                </Card>
            </div>

            <VoucherFormModal
                open={modalOpen}
                voucher={editingVoucher}
                loading={saving}
                onCancel={() => {
                    setModalOpen(false);
                    setEditingVoucher(null);
                }}
                onSubmit={handleFormSubmit}
            />
        </div>
    );
};

export default VoucherManagementPage;
