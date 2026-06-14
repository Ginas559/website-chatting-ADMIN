import { useEffect, useState } from 'react';
import { Button, Card, Empty, Input, message, Modal, Select, Space, Table, Tag } from 'antd';
import { useSelector } from 'react-redux';
import { productApi } from '../api/productApi';
import ProductFormModal from '../components/ProductFormModal';
import StaffNav from '../components/StaffNav';

const formatVnd = (value) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(value || 0));
const statusColor = { ACTIVE: 'green', INACTIVE: 'default' };

const ProductManagementPage = () => {
    const { user } = useSelector((state) => state.auth);
    const roleId = user?.roleId;
    const isAdmin = roleId === 'R1';
    const [items, setItems] = useState([]);
    const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
    const [filters, setFilters] = useState({ keyword: '', category: '', status: '', lowStock: 'false' });
    const [loading, setLoading] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [categories, setCategories] = useState([]);
    const [saving, setSaving] = useState(false);

    const loadProducts = async (page = pagination.current, limit = pagination.pageSize) => {
        setLoading(true);
        try {
            const res = await productApi.list({ page, limit, ...filters });
            const data = res?.data || {};
            setItems(data.items || []);
            setPagination({
                current: data.pagination?.page || page,
                pageSize: data.pagination?.limit || limit,
                total: data.pagination?.totalItems || 0,
            });
        } catch (err) {
            message.error(err?.message || err?.errMessage || 'Không thể tải sản phẩm');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void loadProducts(1, pagination.pageSize);
    }, [filters]);

    const loadCategories = async () => {
        try {
            const res = await productApi.getCategories();
            setCategories(Array.isArray(res?.data) ? res.data : []);
        } catch {
            setCategories([]);
        }
    };

    useEffect(() => {
        void loadCategories();
    }, []);

    const submitProduct = async (payload) => {
        setSaving(true);
        try {
            if (editingProduct) await productApi.update(editingProduct._id, payload);
            else await productApi.create(payload);
            message.success(editingProduct ? 'Cập nhật sản phẩm thành công' : 'Tạo sản phẩm thành công');
            setModalOpen(false);
            setEditingProduct(null);
            await loadProducts();
            await loadCategories();
        } catch (err) {
            message.error(err?.message || err?.errMessage || 'Không thể lưu sản phẩm');
        } finally {
            setSaving(false);
        }
    };

    const changeStatus = (record) => {
        const nextStatus = record.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
        Modal.confirm({
            title: `${nextStatus === 'ACTIVE' ? 'Hiện' : 'Ẩn'} sản phẩm?`,
            content: record.name,
            okText: 'Xác nhận',
            cancelText: 'Hủy',
            onOk: async () => {
                await productApi.updateStatus(record._id, nextStatus);
                message.success('Cập nhật trạng thái thành công');
                await loadProducts();
            },
        });
    };

    const deleteProduct = (record) => {
        Modal.confirm({
            title: 'Xóa mềm sản phẩm?',
            content: `${record.name} sẽ bị ẩn khỏi hệ thống bán hàng.`,
            okText: 'Xóa',
            okButtonProps: { danger: true },
            cancelText: 'Hủy',
            onOk: async () => {
                await productApi.remove(record._id);
                message.success('Xóa mềm sản phẩm thành công');
                await loadProducts();
            },
        });
    };

    const columns = [
        { title: 'Ảnh', dataIndex: 'image', width: 72, render: (src) => src ? <img src={src} alt="" className="h-12 w-12 rounded-lg object-cover" /> : '-' },
        { title: 'Tên', dataIndex: 'name', render: (text, record) => <div><b>{text}</b><div className="text-xs text-slate-400">{record.brand}</div></div> },
        { title: 'Danh mục', dataIndex: 'category' },
        { title: 'Giá', render: (_, record) => <div>{formatVnd(record.salePrice)}<div className="text-xs text-slate-400 line-through">{formatVnd(record.price)}</div></div> },
        { title: 'Kho', dataIndex: 'stock', render: (stock) => <Space>{stock}{stock <= 5 && <Tag color="orange">Sắp hết hàng</Tag>}</Space> },
        { title: 'Trạng thái', dataIndex: 'status', render: (status) => <Tag color={statusColor[status]}>{status}</Tag> },
        {
            title: 'Hành động',
            render: (_, record) => (
                <Space wrap>
                    <Button size="small" onClick={() => { setEditingProduct(record); setModalOpen(true); }}>Sửa</Button>
                    <Button size="small" onClick={() => changeStatus(record)}>{record.status === 'ACTIVE' ? 'Ẩn' : 'Hiện'}</Button>
                    {isAdmin && <Button size="small" danger onClick={() => deleteProduct(record)}>Xóa</Button>}
                </Space>
            ),
        },
    ];

    return (
        <div className="min-h-screen bg-slate-50 p-6">
            <div className="mx-auto max-w-7xl">
                <StaffNav roleId={roleId} />
                <Card
                    title="Quản lý sản phẩm"
                    extra={<Button type="primary" onClick={() => { setEditingProduct(null); setModalOpen(true); }}>Thêm sản phẩm</Button>}
                >
                    <div className="mb-4 grid gap-3 md:grid-cols-4">
                        <Input.Search placeholder="Tìm theo tên/thương hiệu" allowClear value={filters.keyword} onChange={(e) => setFilters((p) => ({ ...p, keyword: e.target.value }))} />
                        <Select allowClear placeholder="Danh mục" value={filters.category || undefined} onChange={(value) => setFilters((p) => ({ ...p, category: value || '' }))} options={categories.map((category) => ({ value: category, label: category }))} />
                        <Select allowClear placeholder="Trạng thái" value={filters.status || undefined} onChange={(value) => setFilters((p) => ({ ...p, status: value || '' }))} options={[{ value: 'ACTIVE', label: 'ACTIVE' }, { value: 'INACTIVE', label: 'INACTIVE' }]} />
                        <Select value={filters.lowStock} onChange={(value) => setFilters((p) => ({ ...p, lowStock: value }))} options={[{ value: 'false', label: 'Tất cả tồn kho' }, { value: 'true', label: 'Sắp hết hàng' }]} />
                    </div>
                    <Table
                        rowKey="_id"
                        loading={loading}
                        columns={columns}
                        dataSource={items}
                        locale={{ emptyText: <Empty description="Chưa có sản phẩm" /> }}
                        pagination={pagination}
                        onChange={(next) => loadProducts(next.current, next.pageSize)}
                    />
                </Card>
            </div>
            <ProductFormModal open={modalOpen} product={editingProduct} categories={categories} loading={saving} onCancel={() => setModalOpen(false)} onSubmit={submitProduct} />
        </div>
    );
};

export default ProductManagementPage;
