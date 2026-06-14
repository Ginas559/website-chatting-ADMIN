import { useEffect, useMemo, useState } from 'react';
import { Card, Col, Empty, List, message, Progress, Row, Spin, Table, Tag } from 'antd';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { dashboardApi } from '../api/dashboardApi';
import StaffNav from '../components/StaffNav';

const formatVnd = (value) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(value || 0));
const formatDate = (value) => value ? new Date(value).toLocaleString('vi-VN') : '-';

const statusColor = {
    NEW: 'blue',
    CONFIRMED: 'cyan',
    PREPARING: 'purple',
    SHIPPING: 'orange',
    DELIVERED: 'green',
    CANCELLED: 'red',
    CANCEL_REQUESTED: 'volcano',
    PENDING_PAYMENT: 'gold',
};

const statMeta = [
    ['totalRevenue', 'Tổng doanh thu', formatVnd],
    ['totalOrders', 'Tổng số đơn hàng'],
    ['newOrders', 'Đơn hàng mới'],
    ['processingOrders', 'Đơn đang xử lý'],
    ['shippingOrders', 'Đơn đang giao'],
    ['completedOrders', 'Đơn hoàn thành'],
    ['cancelledOrders', 'Đơn đã hủy'],
    ['totalProducts', 'Tổng sản phẩm'],
    ['lowStockProducts', 'Sản phẩm sắp hết hàng'],
    ['totalUsers', 'Tổng user'],
];

const DashboardPage = () => {
    const { user } = useSelector((state) => state.auth);
    const roleId = user?.roleId;
    const [loading, setLoading] = useState(false);
    const [overview, setOverview] = useState({});
    const [revenue, setRevenue] = useState([]);
    const [statuses, setStatuses] = useState([]);
    const [topProducts, setTopProducts] = useState([]);
    const [recentOrders, setRecentOrders] = useState([]);

    const loadDashboard = async () => {
        setLoading(true);
        try {
            const [overviewRes, revenueRes, statusRes, topProductRes, recentOrderRes] = await Promise.all([
                dashboardApi.getOverview(),
                dashboardApi.getRevenue(),
                dashboardApi.getOrderStatus(),
                dashboardApi.getTopProducts(),
                dashboardApi.getRecentOrders(),
            ]);
            setOverview(overviewRes?.data || {});
            setRevenue(revenueRes?.data || []);
            setStatuses(statusRes?.data || []);
            setTopProducts(topProductRes?.data || []);
            setRecentOrders(recentOrderRes?.data || []);
        } catch (err) {
            message.error(err?.message || err?.errMessage || 'Không thể tải dashboard');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void loadDashboard();
    }, []);

    const maxRevenue = useMemo(() => Math.max(...revenue.map((item) => item.revenue), 1), [revenue]);
    const maxStatus = useMemo(() => Math.max(...statuses.map((item) => item.count), 1), [statuses]);

    const orderColumns = [
        { title: 'Mã đơn', dataIndex: 'orderCode' },
        { title: 'Khách hàng', dataIndex: 'customerName' },
        { title: 'Tổng tiền', dataIndex: 'totalAmount', render: formatVnd },
        { title: 'Trạng thái', dataIndex: 'status', render: (status) => <Tag color={statusColor[status] || 'default'}>{status}</Tag> },
        { title: 'Ngày tạo', dataIndex: 'createdAt', render: formatDate },
        { title: 'Chi tiết', render: () => <Link to="/admin/orders">Xem</Link> },
    ];

    return (
        <div className="min-h-screen bg-slate-50 p-6">
            <div className="mx-auto max-w-7xl">
                <StaffNav roleId={roleId} />
                <Spin spinning={loading}>
                    <Row gutter={[16, 16]}>
                        {statMeta.map(([key, label, formatter]) => (
                            <Col xs={24} sm={12} lg={6} xl={4} key={key}>
                                <Card>
                                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</div>
                                    <div className="mt-2 text-2xl font-black text-slate-900">{formatter ? formatter(overview[key]) : Number(overview[key] || 0).toLocaleString('vi-VN')}</div>
                                </Card>
                            </Col>
                        ))}
                    </Row>

                    <Row gutter={[16, 16]} className="mt-4">
                        <Col xs={24} lg={12}>
                            <Card title="Doanh thu 7 ngày gần nhất">
                                {!revenue.length ? <Empty /> : (
                                    <List
                                        dataSource={revenue}
                                        renderItem={(item) => (
                                            <List.Item>
                                                <div className="w-full">
                                                    <div className="mb-1 flex justify-between text-sm"><span>{item.date}</span><b>{formatVnd(item.revenue)}</b></div>
                                                    <Progress percent={Math.round((item.revenue / maxRevenue) * 100)} showInfo={false} />
                                                </div>
                                            </List.Item>
                                        )}
                                    />
                                )}
                            </Card>
                        </Col>
                        <Col xs={24} lg={12}>
                            <Card title="Số đơn theo trạng thái">
                                {!statuses.length ? <Empty /> : (
                                    <List
                                        dataSource={statuses}
                                        renderItem={(item) => (
                                            <List.Item>
                                                <div className="w-full">
                                                    <div className="mb-1 flex justify-between text-sm"><Tag color={statusColor[item.status] || 'default'}>{item.status}</Tag><b>{item.count}</b></div>
                                                    <Progress percent={Math.round((item.count / maxStatus) * 100)} showInfo={false} />
                                                </div>
                                            </List.Item>
                                        )}
                                    />
                                )}
                            </Card>
                        </Col>
                    </Row>

                    <Row gutter={[16, 16]} className="mt-4">
                        <Col xs={24} lg={8}>
                            <Card title="Top 5 sản phẩm bán chạy">
                                {!topProducts.length ? <Empty /> : (
                                    <List
                                        dataSource={topProducts}
                                        renderItem={(item) => (
                                            <List.Item>
                                                <List.Item.Meta
                                                    avatar={item.image ? <img src={item.image} alt="" className="h-12 w-12 rounded-lg object-cover" /> : null}
                                                    title={item.name}
                                                    description={`${item.soldQuantity} sản phẩm - ${formatVnd(item.revenue)}`}
                                                />
                                            </List.Item>
                                        )}
                                    />
                                )}
                            </Card>
                        </Col>
                        <Col xs={24} lg={16}>
                            <Card title="Đơn hàng mới nhất">
                                <Table rowKey="_id" columns={orderColumns} dataSource={recentOrders} pagination={false} locale={{ emptyText: <Empty /> }} />
                            </Card>
                        </Col>
                    </Row>
                </Spin>
            </div>
        </div>
    );
};

export default DashboardPage;
