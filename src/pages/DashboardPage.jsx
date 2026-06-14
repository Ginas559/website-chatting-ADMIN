import { useEffect, useMemo, useState } from 'react';
import { Button, Card, Col, Empty, Input, List, message, Progress, Row, Select, Space, Spin, Table, Tag } from 'antd';
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
    ['newCustomers', 'Khách hàng mới'],
];

const rangeOptions = [
    { value: '7days', label: '7 ngày gần nhất' },
    { value: '30days', label: '30 ngày gần nhất' },
    { value: 'thisMonth', label: 'Tháng này' },
    { value: 'custom', label: 'Tùy chọn' },
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
    const [newCustomers, setNewCustomers] = useState([]);
    const [cashflow, setCashflow] = useState({});
    const [filters, setFilters] = useState({ range: '7days', startDate: '', endDate: '' });

    const dashboardParams = useMemo(() => {
        if (filters.range !== 'custom') {
            return { range: filters.range };
        }

        return {
            range: 'custom',
            startDate: filters.startDate,
            endDate: filters.endDate,
        };
    }, [filters]);

    const loadDashboard = async () => {
        if (filters.range === 'custom' && (!filters.startDate || !filters.endDate)) {
            message.warning('Chọn ngày bắt đầu và ngày kết thúc');
            return;
        }

        setLoading(true);
        try {
            const [overviewRes, revenueRes, statusRes, topProductRes, recentOrderRes, customerRes, cashflowRes] = await Promise.all([
                dashboardApi.getOverview(dashboardParams),
                dashboardApi.getRevenue(dashboardParams),
                dashboardApi.getOrderStatus(dashboardParams),
                dashboardApi.getTopProducts(dashboardParams),
                dashboardApi.getRecentOrders(dashboardParams),
                dashboardApi.getNewCustomers(dashboardParams),
                dashboardApi.getCashflow(dashboardParams),
            ]);
            setOverview(overviewRes?.data || {});
            setRevenue(revenueRes?.data || []);
            setStatuses(statusRes?.data || []);
            setTopProducts(topProductRes?.data || []);
            setRecentOrders(recentOrderRes?.data || []);
            setNewCustomers(customerRes?.data || []);
            setCashflow(cashflowRes?.data || {});
        } catch (err) {
            message.error(err?.message || err?.errMessage || 'Không thể tải dashboard');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void loadDashboard();
    }, [dashboardParams]);

    const maxRevenue = useMemo(() => Math.max(...revenue.map((item) => item.revenue), 1), [revenue]);
    const maxStatus = useMemo(() => Math.max(...statuses.map((item) => item.count), 1), [statuses]);
    const maxCustomers = useMemo(() => Math.max(...newCustomers.map((item) => item.customers), 1), [newCustomers]);

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
                <Card className="mb-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <Space wrap>
                            <Select
                                className="min-w-44"
                                value={filters.range}
                                options={rangeOptions}
                                onChange={(range) => setFilters((prev) => ({ ...prev, range }))}
                            />
                            {filters.range === 'custom' ? (
                                <>
                                    <Input type="date" value={filters.startDate} onChange={(event) => setFilters((prev) => ({ ...prev, startDate: event.target.value }))} />
                                    <Input type="date" value={filters.endDate} onChange={(event) => setFilters((prev) => ({ ...prev, endDate: event.target.value }))} />
                                </>
                            ) : null}
                        </Space>
                        <Button onClick={loadDashboard}>Tải lại thống kê</Button>
                    </div>
                </Card>
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
                        <Col xs={24} md={8}>
                            <Card>
                                <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Tiền đang giao</div>
                                <div className="mt-2 text-2xl font-black text-orange-600">{formatVnd(cashflow.shippingAmount)}</div>
                                <div className="mt-1 text-sm text-slate-500">{Number(cashflow.shippingOrders || 0).toLocaleString('vi-VN')} đơn đang giao</div>
                            </Card>
                        </Col>
                        <Col xs={24} md={8}>
                            <Card>
                                <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Tiền đơn đã giao</div>
                                <div className="mt-2 text-2xl font-black text-emerald-600">{formatVnd(cashflow.deliveredAmount)}</div>
                                <div className="mt-1 text-sm text-slate-500">{Number(cashflow.deliveredOrders || 0).toLocaleString('vi-VN')} đơn đã giao</div>
                            </Card>
                        </Col>
                        <Col xs={24} md={8}>
                            <Card>
                                <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Ví hệ thống</div>
                                <div className="mt-2 text-2xl font-black text-blue-600">{formatVnd(cashflow.walletBalance)}</div>
                                <div className="mt-1 text-sm text-slate-500">{Number(cashflow.walletTransactions || 0).toLocaleString('vi-VN')} giao dịch ví</div>
                            </Card>
                        </Col>
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
                        <Col xs={24} lg={12}>
                            <Card title="Khách hàng mới theo thời gian">
                                {!newCustomers.length ? <Empty /> : (
                                    <List
                                        dataSource={newCustomers}
                                        renderItem={(item) => (
                                            <List.Item>
                                                <div className="w-full">
                                                    <div className="mb-1 flex justify-between text-sm"><span>{item.date}</span><b>{item.customers}</b></div>
                                                    <Progress percent={Math.round((item.customers / maxCustomers) * 100)} showInfo={false} />
                                                </div>
                                            </List.Item>
                                        )}
                                    />
                                )}
                            </Card>
                        </Col>
                        <Col xs={24} lg={12}>
                            <Card title="Dòng tiền vào ví gần nhất">
                                {!cashflow.recentTransactions?.length ? <Empty /> : (
                                    <List
                                        dataSource={cashflow.recentTransactions}
                                        renderItem={(item) => (
                                            <List.Item>
                                                <List.Item.Meta
                                                    title={`Đơn ${item.orderCode}`}
                                                    description={`${formatDate(item.createdAt)} - ${item.note || item.status}`}
                                                />
                                                <b className="text-emerald-600">{formatVnd(item.amount)}</b>
                                            </List.Item>
                                        )}
                                    />
                                )}
                            </Card>
                        </Col>
                    </Row>

                    <Row gutter={[16, 16]} className="mt-4">
                        <Col xs={24} lg={8}>
                            <Card title="Top 10 sản phẩm bán chạy">
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
