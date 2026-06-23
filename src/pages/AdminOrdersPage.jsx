import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { message } from 'antd';
import { logoutUser } from '../redux/slices/authSlice';
import {
    createAdminDeliveryQrApi,
    getAdminOrderDetailApi,
    getAdminDeliveryQrApi,
    getAdminOrdersApi,
    resolveAdminCancelRequestApi,
    updateAdminOrderStatusApi,
} from '../util/api';
import StatusAlert from '../components/common/StatusAlert';
import { useNotifications } from '../hooks/useNotifications';
import NotificationBell from '../components/common/NotificationBell';
import ToastNotification from '../components/common/ToastNotification';
import DeliveryQrModal from '../components/admin/DeliveryQrModal';
import ConfirmDialog from '../components/common/ConfirmDialog';
import StaffNav from '../components/StaffNav';

const getRoleIdFromToken = () => {
    const token = localStorage.getItem('accessToken');

    if (!token) return '';

    try {
        const payload = token.split('.')[1];
        if (!payload) return '';

        const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
        const padded = normalized.padEnd(
            Math.ceil(normalized.length / 4) * 4,
            '='
        );

        return JSON.parse(window.atob(padded)).roleId || '';
    } catch {
        return '';
    }
};

const STATUS_LABELS = {
    PENDING_PAYMENT: 'Chờ thanh toán',
    NEW: 'Đơn hàng mới',
    CONFIRMED: 'Đã xác nhận',
    PREPARING: 'Shop đang chuẩn bị',
    SHIPPING: 'Đang giao hàng',
    DELIVERED: 'Đã giao thành công',
    DELIVERY_FAILED: 'Giao thất bại',
    CANCELLED: 'Đã hủy',
    CANCEL_REQUESTED: 'Yêu cầu hủy',
};

const STATUS_STYLES = {
    PENDING_PAYMENT: 'bg-amber-50 text-amber-700',
    NEW: 'bg-sky-50 text-sky-700',
    CONFIRMED: 'bg-indigo-50 text-indigo-700',
    PREPARING: 'bg-orange-50 text-orange-700',
    SHIPPING: 'bg-blue-50 text-blue-700',
    DELIVERED: 'bg-emerald-50 text-emerald-700',
    DELIVERY_FAILED: 'bg-red-50 text-red-700',
    CANCELLED: 'bg-slate-100 text-slate-600',
    CANCEL_REQUESTED: 'bg-rose-50 text-rose-700',
};

const STATUS_OPTIONS = [
    { value: '', label: 'Tất cả' },
    { value: 'NEW', label: 'Đơn hàng mới' },
    { value: 'CONFIRMED', label: 'Đã xác nhận' },
    { value: 'PREPARING', label: 'Đang chuẩn bị' },
    { value: 'SHIPPING', label: 'Đang giao hàng' },
    { value: 'DELIVERED', label: 'Đã giao' },
    { value: 'DELIVERY_FAILED', label: 'Giao thất bại' },
    { value: 'CANCEL_REQUESTED', label: 'Yêu cầu hủy' },
    { value: 'CANCELLED', label: 'Đã hủy' },
];

const RISK_OPTIONS = [
    { value: '', label: 'Tất cả mức rủi ro' },
    { value: 'LOW', label: 'LOW' },
    { value: 'MEDIUM', label: 'MEDIUM' },
    { value: 'HIGH', label: 'HIGH' },
];

const RISK_STYLES = {
    LOW: 'bg-emerald-50 text-emerald-700',
    MEDIUM: 'bg-amber-50 text-amber-700',
    HIGH: 'bg-rose-50 text-rose-700',
};

const RISK_SOURCE_LABELS = {
    AI_MODEL: 'AI Model',
    FALLBACK_RULE: 'Rule-based fallback',
    FALLBACK_DEFAULT: 'Default fallback',
};

const NEXT_STATUS = {
    NEW: 'CONFIRMED',
    CONFIRMED: 'PREPARING',
    PREPARING: 'SHIPPING',
    SHIPPING: 'DELIVERED',
};

const normalizeError = (error, fallback) => {
    if (!error) return fallback;
    if (typeof error === 'string') return error;
    return error.errMessage || error.message || error.error || fallback;
};

const formatVnd = (value) => Number(value || 0).toLocaleString('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
});

const formatDateTime = (value) => {
    if (!value) return '-';
    return new Date(value).toLocaleString('vi-VN');
};

const formatPercent = (value) => `${Math.round(Number(value || 0) * 100)}%`;

const getStatusLabel = (status) => STATUS_LABELS[status] || status || '-';

const getCustomerName = (order) => {
    const user = order?.userId;
    if (user && typeof user === 'object') {
        return `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || order?.shippingInfo?.fullName || '-';
    }

    return order?.shippingInfo?.fullName || '-';
};

const getCustomerEmail = (order) => {
    const user = order?.userId;
    return user && typeof user === 'object' ? user.email || '-' : '-';
};

const getLatestStatusEntry = (order, status) => {
    const history = Array.isArray(order?.statusHistory) ? order.statusHistory : [];

    return [...history].reverse().find((entry) => entry?.status === status) || null;
};

const AdminOrdersPage = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { user } = useSelector((state) => state.auth);
    const notificationsProps = useNotifications();

    const currentRoleId = useMemo(() => user?.roleId || getRoleIdFromToken(), [user?.roleId]);

    const [orders, setOrders] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
    const [status, setStatus] = useState('');
    const [riskLevel, setRiskLevel] = useState('');
    const [onlySuspicious, setOnlySuspicious] = useState(false);
    const [riskModalOrder, setRiskModalOrder] = useState(null);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [note, setNote] = useState('');
    const [loading, setLoading] = useState(false);
    const [detailLoading, setDetailLoading] = useState(false);
    const [mutating, setMutating] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [deliveryQr, setDeliveryQr] = useState(null);
    const [qrLoading, setQrLoading] = useState(false);
    const [pendingAction, setPendingAction] = useState('');

    const currentPage = pagination.page || 1;
    const totalPages = Math.max(1, pagination.totalPages || 1);
    const queryParams = useMemo(() => ({
        page: currentPage,
        limit: 10,
        ...(status ? { status } : {}),
        ...(riskLevel ? { riskLevel } : {}),
        ...(onlySuspicious ? { isSuspicious: true } : {}),
    }), [currentPage, status, riskLevel, onlySuspicious]);

    const loadOrders = useCallback(async (params = queryParams) => {
        setLoading(true);
        setError('');

        try {
            const res = await getAdminOrdersApi(params);
            if (res?.errCode !== 0 || !res?.data) {
                throw res;
            }

            setOrders(Array.isArray(res.data.items) ? res.data.items : []);
            setPagination(res.data.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 });
        } catch (err) {
            const errorMessage = normalizeError(err, 'Không thể tải danh sách đơn hàng');
            setError(errorMessage);
            message.error(errorMessage);
        } finally {
            setLoading(false);
        }
    }, [queryParams]);

    useEffect(() => {
        const timerId = window.setTimeout(() => {
            void loadOrders();
        }, 0);

        return () => window.clearTimeout(timerId);
    }, [loadOrders]);

    const openDetail = async (orderIdOrCode) => {
        setDetailLoading(true);
        setError('');
        setSuccess('');
        setNote('');

        try {
            const res = await getAdminOrderDetailApi(orderIdOrCode);
            if (res?.errCode !== 0 || !res?.data) {
                throw res;
            }

            setSelectedOrder(res.data);
        } catch (err) {
            setError(normalizeError(err, 'Không thể tải chi tiết đơn hàng'));
        } finally {
            setDetailLoading(false);
        }
    };

    const refreshSelectedOrder = async (order) => {
        if (!order) return;
        await openDetail(order.orderCode || order.id);
    };

    const handleStatusChange = async (overrideStatus = '') => {
        const requestedStatus = overrideStatus || (selectedOrder ? NEXT_STATUS[selectedOrder.status] : '');
        if (!selectedOrder || !requestedStatus) return;

        setMutating(true);
        setError('');
        setSuccess('');

        try {
            const nextStatus = requestedStatus;
            const res = await updateAdminOrderStatusApi(selectedOrder.orderCode || selectedOrder.id, nextStatus, note);
            if (res?.errCode !== 0 || !res?.data) {
                throw res;
            }

            setSelectedOrder(res.data);
            setNote('');
            setSuccess('Cập nhật trạng thái đơn hàng thành công');
            await loadOrders(queryParams);
            await refreshSelectedOrder(res.data);
        } catch (err) {
            setError(normalizeError(err, 'Không thể cập nhật trạng thái đơn hàng'));
        } finally {
            setMutating(false);
            setPendingAction('');
        }
    };

    const handleCancelRequest = async (action) => {
        if (!selectedOrder || selectedOrder.status !== 'CANCEL_REQUESTED') return;

        setMutating(true);
        setError('');
        setSuccess('');

        try {
            const res = await resolveAdminCancelRequestApi(selectedOrder.orderCode || selectedOrder.id, action, note);
            if (res?.errCode !== 0 || !res?.data) {
                throw res;
            }

            setSelectedOrder(res.data);
            setNote('');
            setSuccess(res.errMessage || 'Xử lý yêu cầu hủy đơn thành công');
            await loadOrders(queryParams);
            await refreshSelectedOrder(res.data);
        } catch (err) {
            setError(normalizeError(err, 'Không thể xử lý yêu cầu hủy đơn'));
        } finally {
            setMutating(false);
            setPendingAction('');
        }
    };

    const openDeliveryQr = async () => {
        if (!selectedOrder || !['SHIPPING', 'DELIVERED'].includes(selectedOrder.status)) return;

        const orderKey = selectedOrder.orderCode || selectedOrder.id;
        setQrLoading(true);
        setError('');
        setSuccess('');

        try {
            const hasQr = selectedOrder.deliveryQr?.status && selectedOrder.deliveryQr.status !== 'NOT_CREATED';
            const res = hasQr
                ? await getAdminDeliveryQrApi(orderKey)
                : await createAdminDeliveryQrApi(orderKey);

            if (res?.errCode !== 0 || !res?.data?.qrContent) {
                throw res;
            }

            setSelectedOrder((current) => current ? {
                ...current,
                deliveryQr: {
                    status: 'ACTIVE',
                    generatedAt: res.data.generatedAt,
                    expiresAt: res.data.expiresAt,
                    lastVerifiedAt: null,
                    verificationCount: 0,
                },
            } : current);
            setDeliveryQr(res.data);
            if (!hasQr) {
                setSuccess('Đã tạo QR kiểm tra kiện hàng thành công.');
            }
        } catch (err) {
            setError(normalizeError(err, 'Không thể tạo QR kiểm tra kiện hàng'));
        } finally {
            setQrLoading(false);
        }
    };

    const changeStatusFilter = (nextStatus) => {
        setStatus(nextStatus);
        setSelectedOrder(null);
        setPagination((current) => ({ ...current, page: 1 }));
    };

    const changeRiskFilter = (nextRiskLevel) => {
        setRiskLevel(nextRiskLevel);
        setSelectedOrder(null);
        setPagination((current) => ({ ...current, page: 1 }));
    };

    const changeSuspiciousFilter = () => {
        setOnlySuspicious((current) => !current);
        setSelectedOrder(null);
        setPagination((current) => ({ ...current, page: 1 }));
    };

    const changePage = (nextPage) => {
        setSelectedOrder(null);
        setPagination((current) => ({ ...current, page: Math.min(Math.max(1, nextPage), totalPages) }));
    };

    const handleLogout = async () => {
        await dispatch(logoutUser());
        navigate('/login');
    };

    const nextStatus = selectedOrder ? NEXT_STATUS[selectedOrder.status] : '';
    const deliveryQrStatus = selectedOrder?.deliveryQr?.status || 'NOT_CREATED';
    const pendingActionConfig = pendingAction === 'STATUS'
        ? {
            title: nextStatus === 'DELIVERED' ? 'Xác nhận đã giao hàng?' : 'Cập nhật trạng thái đơn?',
            message: nextStatus === 'DELIVERED'
                ? 'Đơn sẽ được ghi nhận đã giao thành công và COD sẽ chuyển sang đã thanh toán.'
                : `Đơn sẽ chuyển sang trạng thái “${getStatusLabel(nextStatus)}”.`,
            confirmLabel: nextStatus === 'DELIVERED' ? 'Xác nhận đã giao' : 'Cập nhật trạng thái',
            tone: nextStatus === 'DELIVERED' ? 'warning' : 'primary',
            onConfirm: handleStatusChange,
        }
        : pendingAction === 'DELIVERY_FAILED'
            ? {
                title: 'Đánh dấu giao thất bại?',
                message: 'Đơn sẽ kết thúc ở trạng thái giao thất bại. Trạng thái thanh toán không bị đổi sang FAILED.',
                confirmLabel: 'Đánh dấu thất bại',
                tone: 'danger',
                onConfirm: () => handleStatusChange('DELIVERY_FAILED'),
            }
        : pendingAction === 'APPROVE_CANCEL'
            ? {
                title: 'Chấp nhận hủy đơn?',
                message: 'Đơn hàng sẽ kết thúc và không thể tiếp tục quy trình giao hàng.',
                confirmLabel: 'Chấp nhận hủy',
                tone: 'danger',
                onConfirm: () => handleCancelRequest('APPROVE'),
            }
            : pendingAction === 'REJECT_CANCEL'
                ? {
                    title: 'Từ chối yêu cầu hủy?',
                    message: 'Đơn sẽ quay lại trạng thái chuẩn bị hàng và tiếp tục được xử lý.',
                    confirmLabel: 'Từ chối yêu cầu',
                    tone: 'warning',
                    onConfirm: () => handleCancelRequest('REJECT'),
                }
                : null;

    return (
        <div className="min-h-screen overflow-x-hidden bg-[linear-gradient(180deg,#fff7ed_0%,#f8fafc_38%,#f8fafc_100%)] text-slate-800">
            <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                <StaffNav roleId={currentRoleId} />
                <div className="mb-6 flex min-w-0 flex-col gap-4 rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-orange-500">Order Management</p>
                        <h1 className="mt-2 text-3xl font-black text-slate-900">Quản lý đơn hàng</h1>
                        <p className="mt-2 text-sm text-slate-500">Admin R1 điều phối trạng thái và xử lý yêu cầu hủy đơn.</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <Link to="/management/users" className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:border-orange-500 hover:text-orange-600">
                            Quản lý user
                        </Link>
                        <Link to="/admin/profile" className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:border-orange-500 hover:text-orange-600">
                            Về profile
                        </Link>
                        {currentRoleId && <NotificationBell {...notificationsProps} />}
                        <button onClick={handleLogout} className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-700">
                            Đăng xuất
                        </button>
                    </div>
                </div>

                {error && <StatusAlert>{error}</StatusAlert>}
                {success && <StatusAlert type="success">{success}</StatusAlert>}

                <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
                    <section className="min-w-0 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-orange-500">Danh sách</p>
                                <h2 className="mt-1 text-2xl font-bold text-slate-900">Tất cả đơn hàng</h2>
                            </div>
                            <button onClick={() => loadOrders(queryParams)} className="w-fit rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-orange-500 hover:text-orange-600">
                                Tải lại
                            </button>
                        </div>

                        <div className="mb-4 flex flex-wrap gap-2">
                            {STATUS_OPTIONS.map((item) => (
                                <button
                                    key={item.value || 'all'}
                                    type="button"
                                    onClick={() => changeStatusFilter(item.value)}
                                    className={`rounded-xl border px-3 py-2 text-sm font-semibold transition-colors ${
                                        status === item.value
                                            ? 'border-orange-500 bg-orange-50 text-orange-700'
                                            : 'border-slate-200 bg-white text-slate-600 hover:border-orange-300'
                                    }`}
                                >
                                    {item.label}
                                </button>
                            ))}
                        </div>

                        <div className="mb-4 flex flex-wrap items-center gap-2">
                            {RISK_OPTIONS.map((item) => (
                                <button
                                    key={item.value || 'all-risk'}
                                    type="button"
                                    onClick={() => changeRiskFilter(item.value)}
                                    className={`rounded-xl border px-3 py-2 text-sm font-semibold transition-colors ${
                                        riskLevel === item.value
                                            ? 'border-rose-500 bg-rose-50 text-rose-700'
                                            : 'border-slate-200 bg-white text-slate-600 hover:border-rose-300'
                                    }`}
                                >
                                    {item.label}
                                </button>
                            ))}
                            <button
                                type="button"
                                onClick={changeSuspiciousFilter}
                                className={`rounded-xl border px-3 py-2 text-sm font-semibold transition-colors ${
                                    onlySuspicious
                                        ? 'border-rose-500 bg-rose-600 text-white'
                                        : 'border-slate-200 bg-white text-slate-600 hover:border-rose-300'
                                }`}
                            >
                                Chỉ đơn đáng ngờ
                            </button>
                        </div>

                        {loading ? (
                            <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500">Đang tải đơn hàng...</div>
                        ) : orders.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500">Chưa có đơn hàng phù hợp.</div>
                        ) : (
                            <div className="admin-orders-scroll overflow-x-auto rounded-2xl border border-slate-200">
                                <table className="min-w-[1120px] divide-y divide-slate-200 text-left text-sm">
                                    <thead className="bg-slate-50 text-slate-600">
                                        <tr>
                                            <th className="w-[220px] px-4 py-3 font-semibold">Mã đơn</th>
                                            <th className="w-[250px] px-4 py-3 font-semibold">Khách hàng</th>
                                            <th className="w-[150px] px-4 py-3 font-semibold">Tổng tiền</th>
                                            <th className="w-[160px] px-4 py-3 font-semibold">Trạng thái</th>
                                            <th className="w-[120px] px-4 py-3 font-semibold">Rủi ro</th>
                                            <th className="w-[100px] px-4 py-3 font-semibold">Điểm</th>
                                            <th className="w-[120px] px-4 py-3 font-semibold">Hành động</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 bg-white">
                                        {orders.map((order) => (
                                            <tr
                                                key={order.id || order.orderCode}
                                                onClick={() => openDetail(order.orderCode || order.id)}
                                                className={`cursor-pointer align-top transition-colors hover:bg-orange-50/40 ${order.riskLevel === 'HIGH' ? 'bg-rose-50/50' : ''}`}
                                            >
                                                <td className="px-4 py-3">
                                                    <div className="font-semibold text-slate-900">#{order.orderCode}</div>
                                                    <div className="mt-1 text-xs text-slate-500">{formatDateTime(order.createdAt)}</div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="font-medium text-slate-700">{getCustomerName(order)}</div>
                                                    <div className="mt-1 text-xs text-slate-500">{getCustomerEmail(order)}</div>
                                                </td>
                                                <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-800">{formatVnd(order.totalAmount)}</td>
                                                <td className="px-4 py-3">
                                                    <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[order.status] || 'bg-slate-100 text-slate-600'}`}>
                                                        {getStatusLabel(order.status)}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${RISK_STYLES[order.riskLevel] || RISK_STYLES.LOW}`}>
                                                        {order.riskLevel || 'LOW'}
                                                    </span>
                                                </td>
                                                <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-800">{Number(order.riskScore || 0)}/100</td>
                                                <td className="px-4 py-3">
                                                    <div className="flex flex-wrap gap-2">
                                                        <button
                                                            onClick={(event) => {
                                                                event.stopPropagation();
                                                                openDetail(order.orderCode || order.id);
                                                            }}
                                                            className="rounded-lg border border-orange-200 px-3 py-1.5 text-xs font-semibold text-orange-600 transition-colors hover:bg-orange-50"
                                                        >
                                                            Chi tiết
                                                        </button>
                                                        <button
                                                            onClick={(event) => {
                                                                event.stopPropagation();
                                                                setRiskModalOrder(order);
                                                            }}
                                                            className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-50"
                                                        >
                                                            Xem lý do
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {orders.length ? (
                            <div className="mt-4 flex items-center justify-center gap-3">
                                <button type="button" onClick={() => changePage(currentPage - 1)} disabled={currentPage <= 1 || loading} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50">
                                    Trước
                                </button>
                                <span className="text-sm font-medium text-slate-600">Trang {currentPage}/{totalPages}</span>
                                <button type="button" onClick={() => changePage(currentPage + 1)} disabled={currentPage >= totalPages || loading} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50">
                                    Sau
                                </button>
                            </div>
                        ) : null}
                    </section>

                    <section className="min-w-0 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="mb-4">
                            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-orange-500">Chi tiết</p>
                            <h2 className="mt-1 text-2xl font-bold text-slate-900">Điều phối đơn hàng</h2>
                        </div>

                        {detailLoading ? (
                            <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500">Đang tải chi tiết...</div>
                        ) : !selectedOrder ? (
                            <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500">Chọn một đơn hàng để xem chi tiết.</div>
                        ) : (
                            <div className="space-y-5">
                                {selectedOrder.status === 'CANCEL_REQUESTED' ? (
                                    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-left">
                                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                            <div>
                                                <div className="text-sm font-semibold text-rose-800">Yêu cầu hủy từ khách hàng</div>
                                                <div className="mt-1 text-xs font-medium text-rose-600">
                                                    Gửi lúc {formatDateTime(getLatestStatusEntry(selectedOrder, 'CANCEL_REQUESTED')?.changedAt)}
                                                </div>
                                            </div>
                                            <span className="w-fit rounded-full bg-white px-3 py-1 text-xs font-semibold text-rose-700">
                                                Cần admin xử lý
                                            </span>
                                        </div>
                                        <div className="mt-3 rounded-xl bg-white px-4 py-3 text-sm leading-6 text-slate-800">
                                            <span className="font-semibold text-slate-600">Lý do khách hàng: </span>
                                            <span className="break-words">
                                                {getLatestStatusEntry(selectedOrder, 'CANCEL_REQUESTED')?.note || 'Khách hàng không nhập lý do.'}
                                            </span>
                                        </div>
                                    </div>
                                ) : null}

                                <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                    <div className="min-w-0">
                                        <div className="text-sm text-slate-500">Đơn hàng</div>
                                        <div className="break-all text-lg font-bold text-slate-900">#{selectedOrder.orderCode}</div>
                                    </div>
                                    <span className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold ${STATUS_STYLES[selectedOrder.status] || 'bg-slate-100 text-slate-600'}`}>
                                        {getStatusLabel(selectedOrder.status)}
                                    </span>
                                </div>

                                <div className={`rounded-2xl border p-4 text-left ${selectedOrder.riskLevel === 'HIGH' ? 'border-rose-200 bg-rose-50' : 'border-slate-200 bg-white'}`}>
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                        <div>
                                            <div className="text-sm font-semibold text-slate-900">Rủi ro đơn hàng</div>
                                            <div className="mt-1 text-xs font-medium text-slate-500">Cảnh báo chỉ hỗ trợ kiểm duyệt, không chặn xử lý đơn.</div>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className={`rounded-full px-3 py-1 text-xs font-bold ${RISK_STYLES[selectedOrder.riskLevel] || RISK_STYLES.LOW}`}>
                                                {selectedOrder.riskLevel || 'LOW'}
                                            </span>
                                            <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-700">
                                                {Number(selectedOrder.riskScore || 0)}/100
                                            </span>
                                            <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-700">
                                                {RISK_SOURCE_LABELS[selectedOrder.riskSource] || selectedOrder.riskSource || 'Default fallback'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="mt-3 grid gap-2 text-xs font-semibold text-slate-600 sm:grid-cols-2">
                                        <div className="rounded-xl bg-white px-4 py-3">
                                            Fraud probability: {formatPercent(selectedOrder.fraudProbability)}
                                        </div>
                                        <div className="rounded-xl bg-white px-4 py-3">
                                            Risk source: {selectedOrder.riskSource || 'FALLBACK_DEFAULT'}
                                        </div>
                                    </div>
                                    <div className="mt-3 rounded-xl bg-white px-4 py-3 text-sm leading-6 text-slate-700">
                                        {Array.isArray(selectedOrder.riskReasons) && selectedOrder.riskReasons.length
                                            ? selectedOrder.riskReasons.join('; ')
                                            : 'Không có cảnh báo'}
                                    </div>
                                </div>

                                {selectedOrder.status === 'CANCELLED' ? (
                                    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-left">
                                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                            <div>
                                                <div className="text-sm font-semibold text-rose-900">Đơn hàng đã hủy</div>
                                                <div className="mt-1 text-xs font-medium text-rose-700">
                                                    Cập nhật lúc {formatDateTime(getLatestStatusEntry(selectedOrder, 'CANCELLED')?.changedAt)}
                                                </div>
                                            </div>
                                            <span className="w-fit rounded-full bg-white px-3 py-1 text-xs font-semibold text-rose-700">
                                                Đã kết thúc
                                            </span>
                                        </div>
                                        <div className="mt-3 rounded-xl bg-white px-4 py-3 text-sm leading-6 text-slate-800">
                                            <span className="font-semibold text-slate-600">Lý do hủy: </span>
                                            <span className="break-words">
                                                {getLatestStatusEntry(selectedOrder, 'CANCELLED')?.note || 'Không rõ lý do'}
                                            </span>
                                        </div>
                                    </div>
                                ) : null}

                                {selectedOrder.status === 'DELIVERY_FAILED' ? (
                                    <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-left">
                                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                            <div>
                                                <div className="text-sm font-semibold text-red-900">Đơn hàng giao thất bại</div>
                                                <div className="mt-1 text-xs font-medium text-red-700">
                                                    Cập nhật lúc {formatDateTime(getLatestStatusEntry(selectedOrder, 'DELIVERY_FAILED')?.changedAt)}
                                                </div>
                                            </div>
                                            <span className="w-fit rounded-full bg-white px-3 py-1 text-xs font-semibold text-red-700">
                                                Đã kết thúc
                                            </span>
                                        </div>
                                        <div className="mt-3 rounded-xl bg-white px-4 py-3 text-sm leading-6 text-slate-800">
                                            <span className="font-semibold text-slate-600">Lý do giao thất bại: </span>
                                            <span className="break-words">
                                                {getLatestStatusEntry(selectedOrder, 'DELIVERY_FAILED')?.note || 'Không rõ lý do'}
                                            </span>
                                        </div>
                                    </div>
                                ) : null}

                                <div className="grid gap-3">
                                    <div className="rounded-2xl border border-slate-200 p-4">
                                        <div className="text-sm font-semibold text-slate-900">Khách hàng</div>
                                        <div className="mt-3 divide-y divide-slate-100 text-sm">
                                            <div className="grid gap-1 py-2 text-left sm:grid-cols-[130px_minmax(0,1fr)]">
                                                <span className="text-left font-medium text-slate-500">Họ tên</span>
                                                <span className="break-words font-semibold text-slate-800">{selectedOrder.shippingInfo?.fullName || '-'}</span>
                                            </div>
                                            <div className="grid gap-1 py-2 text-left sm:grid-cols-[130px_minmax(0,1fr)]">
                                                <span className="text-left font-medium text-slate-500">Số điện thoại</span>
                                                <span className="font-semibold text-slate-800">{selectedOrder.shippingInfo?.phone || '-'}</span>
                                            </div>
                                            <div className="grid gap-1 py-2 text-left sm:grid-cols-[130px_minmax(0,1fr)]">
                                                <span className="text-left font-medium text-slate-500">Địa chỉ</span>
                                                <span className="break-words font-semibold text-slate-800">{selectedOrder.shippingInfo?.address || '-'}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="rounded-2xl border border-slate-200 p-4">
                                        <div className="text-sm font-semibold text-slate-900">Thanh toán</div>
                                        <div className="mt-3 divide-y divide-slate-100 text-sm">
                                            <div className="grid gap-1 py-2 text-left sm:grid-cols-[130px_minmax(0,1fr)]">
                                                <span className="text-left font-medium text-slate-500">Phương thức</span>
                                                <span className="font-semibold text-slate-800">{selectedOrder.paymentMethod}</span>
                                            </div>
                                            <div className="grid gap-1 py-2 text-left sm:grid-cols-[130px_minmax(0,1fr)]">
                                                <span className="text-left font-medium text-slate-500">Trạng thái</span>
                                                <span className="font-semibold text-slate-800">{selectedOrder.paymentStatus}</span>
                                            </div>
                                            <div className="grid gap-1 py-2 text-left sm:grid-cols-[130px_minmax(0,1fr)]">
                                                <span className="text-left font-medium text-slate-500">Tổng tiền</span>
                                                <span className="font-semibold text-orange-600">{formatVnd(selectedOrder.totalAmount)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="rounded-2xl border border-slate-200 p-4 text-left">
                                    <div className="mb-3 text-sm font-semibold text-slate-900">Sản phẩm</div>
                                    <div className="space-y-3">
                                        {(selectedOrder.items || []).map((item) => (
                                            <div key={`${selectedOrder.orderCode}-${item.product}`} className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                                                <div className="flex min-w-0 items-center gap-3">
                                                    <img src={item.snapshot?.image} alt={item.snapshot?.name} className="h-12 w-12 shrink-0 rounded-lg object-contain" />
                                                    <div className="min-w-0 text-left">
                                                        <div className="truncate text-sm font-semibold text-slate-800">{item.snapshot?.name}</div>
                                                        <div className="text-xs text-slate-500">SL: {item.quantity}</div>
                                                    </div>
                                                </div>
                                                <div className="shrink-0 text-right text-sm font-semibold text-slate-800">{formatVnd(item.lineTotal)}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {['SHIPPING', 'DELIVERED'].includes(selectedOrder.status) ? (
                                    <div className={`rounded-2xl border p-4 text-left ${deliveryQrStatus === 'EXPIRED' ? 'border-amber-200 bg-amber-50' : 'border-blue-200 bg-blue-50'}`}>
                                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                            <div className="min-w-0 text-left">
                                                <div className={deliveryQrStatus === 'EXPIRED' ? 'font-bold text-amber-950' : 'font-bold text-blue-950'}>QR kiểm tra kiện hàng</div>
                                                <p className={`mt-1 text-sm leading-6 ${deliveryQrStatus === 'EXPIRED' ? 'text-amber-800' : 'text-blue-800'}`}>
                                                    QR được dán lên kiện hàng để khách hàng quét khi nhận.
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => void openDeliveryQr()}
                                                disabled={qrLoading || mutating || deliveryQrStatus === 'LEGACY'}
                                                className="h-11 shrink-0 rounded-xl bg-blue-700 px-5 text-sm font-bold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                {qrLoading
                                                    ? 'Đang tải QR...'
                                                    : deliveryQrStatus === 'NOT_CREATED'
                                                        ? 'Tạo QR'
                                                        : deliveryQrStatus === 'LEGACY'
                                                            ? 'QR phiên bản cũ'
                                                        : deliveryQrStatus === 'EXPIRED'
                                                            ? 'Xem QR hết hạn'
                                                            : 'Xem QR'}
                                            </button>
                                        </div>
                                        {deliveryQrStatus === 'ACTIVE' ? (
                                            <p className="mt-3 text-xs font-medium leading-5 text-blue-700">
                                                QR hiện tại còn hiệu lực đến {formatDateTime(selectedOrder.deliveryQr?.expiresAt)}.
                                            </p>
                                        ) : deliveryQrStatus === 'EXPIRED' ? (
                                            <p className="mt-3 text-xs font-semibold leading-5 text-amber-800">
                                                QR đã hết hạn lúc {formatDateTime(selectedOrder.deliveryQr?.expiresAt)} và chỉ còn dùng để đối chiếu lịch sử.
                                            </p>
                                        ) : deliveryQrStatus === 'LEGACY' ? (
                                            <p className="mt-3 text-xs font-semibold leading-5 text-amber-800">
                                                QR này được tạo trước phiên bản lưu trữ mã hóa nên không thể xem lại. Không thay mã nếu tem đã được gửi đi.
                                            </p>
                                        ) : (
                                            <p className="mt-3 text-xs font-medium leading-5 text-blue-700">
                                                QR chỉ được tạo một lần và gắn cố định với kiện hàng.
                                            </p>
                                        )}
                                    </div>
                                ) : null}

                                <div className="rounded-2xl border border-slate-200 p-4 text-left">
                                    <label className="block text-left text-sm font-semibold text-slate-700">
                                        Ghi chú xử lý
                                        <textarea
                                            value={note}
                                            onChange={(event) => setNote(event.target.value)}
                                            rows={3}
                                            className="mt-2 w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-left text-sm outline-none focus:border-orange-500"
                                            placeholder={selectedOrder.status === 'CANCEL_REQUESTED' ? 'Ghi chú phản hồi cho yêu cầu hủy, tối đa 300 ký tự' : 'Không bắt buộc, tối đa 300 ký tự'}
                                        />
                                    </label>

                                    {selectedOrder.status === 'CANCEL_REQUESTED' ? (
                                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                            <button type="button" onClick={() => setPendingAction('APPROVE_CANCEL')} disabled={mutating} className="h-11 rounded-xl bg-red-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60">
                                                Chấp nhận hủy
                                            </button>
                                            <button type="button" onClick={() => setPendingAction('REJECT_CANCEL')} disabled={mutating} className="h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition-colors hover:border-orange-400 disabled:cursor-not-allowed disabled:opacity-60">
                                                Từ chối yêu cầu
                                            </button>
                                        </div>
                                    ) : NEXT_STATUS[selectedOrder.status] ? (
                                        <div className="mt-4 grid gap-3">
                                            <button type="button" onClick={() => setPendingAction('STATUS')} disabled={mutating} className="h-11 w-full rounded-xl bg-orange-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60">
                                                Chuyển sang: {getStatusLabel(NEXT_STATUS[selectedOrder.status])}
                                            </button>
                                            {selectedOrder.status === 'SHIPPING' ? (
                                                <button type="button" onClick={() => setPendingAction('DELIVERY_FAILED')} disabled={mutating} className="h-11 w-full rounded-xl border border-red-200 bg-white px-4 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60">
                                                    Đánh dấu giao thất bại
                                                </button>
                                            ) : null}
                                        </div>
                                    ) : (
                                        <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm font-medium text-slate-500">
                                            Đơn hàng không còn hành động xử lý tiếp theo.
                                        </div>
                                    )}
                                </div>

                                <div className="rounded-2xl border border-slate-200 p-4">
                                    <div className="mb-4 text-left text-sm font-semibold text-slate-900">Lịch sử trạng thái</div>
                                    <div className="relative space-y-0 pl-7 text-left">
                                        <div className="absolute bottom-3 left-[5px] top-3 w-px bg-slate-200" />
                                        {(selectedOrder.statusHistory || []).map((entry, index) => (
                                            <div key={`${entry.status}-${entry.changedAt}-${index}`} className="relative pb-5 last:pb-0">
                                                <div className="absolute -left-7 top-1.5 h-3 w-3 rounded-full border-2 border-white bg-orange-500 shadow-sm shadow-orange-200" />
                                                <div className="min-w-0 rounded-xl bg-slate-50 px-4 py-3">
                                                    <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                                                        <div className="font-semibold text-slate-900">{getStatusLabel(entry.status)}</div>
                                                        <div className="shrink-0 text-xs font-medium text-slate-500">{formatDateTime(entry.changedAt)}</div>
                                                    </div>
                                                    {entry.note ? <div className="mt-2 break-words text-sm leading-6 text-slate-600">{entry.note}</div> : null}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </section>
                </div>
            </div>
<ToastNotification
    toastMessage={notificationsProps.toastMessage}
    setToastMessage={notificationsProps.setToastMessage}
/>

<DeliveryQrModal
    data={deliveryQr}
    loading={qrLoading}
    onClose={() => setDeliveryQr(null)}
/>

<ConfirmDialog
    open={Boolean(pendingActionConfig)}
    title={pendingActionConfig?.title}
    message={pendingActionConfig?.message}
    confirmLabel={pendingActionConfig?.confirmLabel}
    tone={pendingActionConfig?.tone}
    loading={mutating}
    onCancel={() => setPendingAction('')}
    onConfirm={pendingActionConfig?.onConfirm}
/>
{riskModalOrder ? (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 px-4">
        <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <div className="text-lg font-bold text-slate-900">Lý do cảnh báo</div>
                    <div className="mt-1 text-sm text-slate-500">#{riskModalOrder.orderCode}</div>
                </div>
                <button
                    type="button"
                    onClick={() => setRiskModalOrder(null)}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                    Đóng
                </button>
            </div>
            <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
                {Array.isArray(riskModalOrder.riskReasons) && riskModalOrder.riskReasons.length ? (
                    <ul className="space-y-2 text-left text-sm font-medium text-slate-700">
                        {riskModalOrder.riskReasons.map((reason) => (
                            <li key={reason} className="rounded-lg bg-white px-3 py-2">{reason}</li>
                        ))}
                    </ul>
                ) : (
                    <div className="text-center text-sm font-medium text-slate-500">Không có cảnh báo</div>
                )}
            </div>
        </div>
    </div>
) : null}
        </div>
    );
};

export default AdminOrdersPage;
