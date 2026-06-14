import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logoutUser } from '../redux/slices/authSlice';
import userManagementService from '../services/userManagement.service';
import StatusAlert from '../components/common/StatusAlert';
import { useNotifications } from '../hooks/useNotifications';
import NotificationBell from '../components/common/NotificationBell';
import ToastNotification from '../components/common/ToastNotification';

const getRoleIdFromToken = () => {
    const token = localStorage.getItem('accessToken');

    if (!token) return '';

    try {
        const payload = token.split('.')[1];
        if (!payload) return '';

        const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
        const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
        return JSON.parse(window.atob(padded)).roleId || '';
    } catch {
        return '';
    }
};

const normalizeError = (error, fallback) => {
    if (!error) return fallback;
    if (typeof error === 'string') return error;
    if (error?.errMessage) return error.errMessage;
    if (error?.error) return error.error;
    if (error?.message) return error.message;
    return fallback;
};

const ModeratorUsersPage = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { user } = useSelector((state) => state.auth);
    const notificationsProps = useNotifications();

    const currentRoleId = useMemo(() => user?.roleId || getRoleIdFromToken(), [user?.roleId]);

    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const timerId = window.setTimeout(() => {
            void (async () => {
                setLoading(true);
                setError('');

                try {
                    const res = await userManagementService.listUsers();
                    setUsers(res?.users || []);
                } catch (err) {
                    setError(normalizeError(err, 'Không thể tải danh sách người dùng'));
                } finally {
                    setLoading(false);
                }
            })();
        }, 0);

        return () => window.clearTimeout(timerId);
    }, []);

    const handleLogout = async () => {
        await dispatch(logoutUser());
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-[linear-gradient(180deg,#ecfdf5_0%,#f8fafc_45%,#f8fafc_100%)] text-slate-800">
            <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                <div className="mb-6 flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-emerald-600">Moderator View</p>
                        <h1 className="mt-2 text-3xl font-black text-slate-900">Danh sách người dùng</h1>
                        <p className="mt-2 text-sm text-slate-500">Tài khoản R3 chỉ xem danh sách, không được tạo/sửa/xóa.</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <Link
                            to="/moderator/profile"
                            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:border-emerald-500 hover:text-emerald-600"
                        >
                            Về profile
                        </Link>
                        {currentRoleId && <NotificationBell {...notificationsProps} />}
                        <button
                            onClick={handleLogout}
                            className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-700"
                        >
                            Đăng xuất
                        </button>
                    </div>
                </div>

                {error && <StatusAlert>{error}</StatusAlert>}

                <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="mb-4 flex items-center justify-between gap-3">
                        <div>
                            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-500">Readonly list</p>
                            <h2 className="mt-1 text-2xl font-bold text-slate-900">Full account list</h2>
                        </div>
                    </div>

                    {loading ? (
                        <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500">Đang tải dữ liệu...</div>
                    ) : users.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500">Chưa có người dùng nào.</div>
                    ) : (
                        <div className="overflow-hidden rounded-2xl border border-slate-200">
                            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                                <thead className="bg-slate-50 text-slate-600">
                                    <tr>
                                        <th className="px-4 py-3 font-semibold">Email</th>
                                        <th className="px-4 py-3 font-semibold">Họ tên</th>
                                        <th className="px-4 py-3 font-semibold">Role</th>
                                        <th className="px-4 py-3 font-semibold">Trạng thái</th>
                                        <th className="px-4 py-3 font-semibold">Cập nhật</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white">
                                    {users.map((item) => (
                                        <tr key={item.id} className="align-top">
                                            <td className="px-4 py-3 text-slate-700">{item.email}</td>
                                            <td className="px-4 py-3 text-slate-700">{item.firstName} {item.lastName}</td>
                                            <td className="px-4 py-3 font-semibold text-slate-700">{item.roleId}</td>
                                            <td className="px-4 py-3">
                                                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${item.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                                    {item.isActive ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-slate-500">{new Date(item.updatedAt).toLocaleString('vi-VN')}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>

                {user?.roleId === 'R3' && (
                    <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                        Bạn đang dùng role R3. Trang này chỉ cho phép xem danh sách.
                    </div>
                )}
            </div>
            <ToastNotification toastMessage={notificationsProps.toastMessage} setToastMessage={notificationsProps.setToastMessage} />
        </div>
    );
};

export default ModeratorUsersPage;