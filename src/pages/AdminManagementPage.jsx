import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logoutUser } from '../redux/slices/authSlice';
import userManagementService from '../services/userManagement.service';
import StatusAlert from '../components/common/StatusAlert';
import FormInput from '../components/common/FormInput';
import SubmitButton from '../components/common/SubmitButton';
import { useNotifications } from '../hooks/useNotifications';
import NotificationBell from '../components/common/NotificationBell';
import ToastNotification from '../components/common/ToastNotification';
import ConfirmDialog from '../components/common/ConfirmDialog';

const emptyForm = {
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    address: '',
    phoneNumber: '',
    image: '',
    roleId: 'R3',
    positionId: '',
    gender: 'false',
    isActive: 'true'
};

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
    if (error?.errors?.length) return error.errors[0].msg;
    return fallback;
};

const formatDate = (value) => {
    if (!value) return '-';
    return new Date(value).toLocaleString('vi-VN');
};

const AdminManagementPage = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { user } = useSelector((state) => state.auth);
    const notificationsProps = useNotifications();

    const currentRoleId = useMemo(() => user?.roleId || getRoleIdFromToken(), [user?.roleId]);
    const isAdmin = currentRoleId === 'R1';

    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [editingId, setEditingId] = useState('');
    const [form, setForm] = useState(emptyForm);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const isModeratorDraft = !editingId && form.roleId === 'R3';

    const loadUsers = async () => {
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
    };

    useEffect(() => {
        const timerId = window.setTimeout(() => {
            void loadUsers();
        }, 0);

        return () => window.clearTimeout(timerId);
    }, []);

    const handleLogout = async () => {
        await dispatch(logoutUser());
        navigate('/login');
    };

    const resetForm = () => {
        setForm(emptyForm);
        setEditingId('');
    };

    const handleCreateModerator = () => {
        setSuccess('');
        setError('');
        setEditingId('');
        setForm({
            ...emptyForm,
            roleId: 'R3'
        });
    };

    const handleChange = (field) => (event) => {
        const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
        setForm((previous) => ({ ...previous, [field]: value }));
    };

    const handleEdit = (item) => {
        if (!isAdmin) return;
        setEditingId(item.id);
        setSuccess('');
        setError('');
        setForm({
            email: item.email || '',
            password: '',
            firstName: item.firstName || '',
            lastName: item.lastName || '',
            address: item.address || '',
            phoneNumber: item.phoneNumber || '',
            image: item.image || '',
            roleId: item.roleId || 'R2',
            positionId: item.positionId || '',
            gender: String(Boolean(item.gender)),
            isActive: String(Boolean(item.isActive))
        });
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!isAdmin) {
            setError('Chỉ Admin mới được tạo hoặc sửa tài khoản');
            return;
        }

        setSaving(true);
        setError('');
        setSuccess('');

        const payload = {
            ...form,
            gender: form.gender === 'true',
            isActive: form.isActive === 'true'
        };

        if (!editingId && !payload.password.trim()) {
            setSaving(false);
            setError('Mật khẩu là bắt buộc khi tạo mới');
            return;
        }

        if (!payload.password.trim()) {
            delete payload.password;
        }

        try {
            if (editingId) {
                await userManagementService.updateUser(editingId, payload);
                setSuccess('Cập nhật người dùng thành công');
            } else {
                await userManagementService.createUser(payload);
                setSuccess('Tạo người dùng thành công');
            }

            resetForm();
            await loadUsers();
        } catch (err) {
            setError(normalizeError(err, 'Không thể lưu người dùng'));
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!isAdmin || !deleteTarget) return;

        setDeleting(true);
        setError('');
        setSuccess('');

        try {
            await userManagementService.deleteUser(deleteTarget.id);
            setSuccess('Xóa người dùng thành công');
            setDeleteTarget(null);
            await loadUsers();
        } catch (err) {
            setError(normalizeError(err, 'Không thể xóa người dùng'));
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="min-h-screen bg-[linear-gradient(180deg,#eef4ff_0%,#f7fafc_35%,#f8fafc_100%)] text-slate-800">
            <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                <div className="mb-6 flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-indigo-500">Internal Management</p>
                        <h1 className="mt-2 text-3xl font-black text-slate-900">Quản lý người dùng nội bộ</h1>
                        <p className="mt-2 text-sm text-slate-500">Dùng cho Admin để tạo, cập nhật và theo dõi tài khoản.</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            onClick={handleCreateModerator}
                            className="rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-600"
                        >
                            Tạo Moderator
                        </button>
                        <Link
                            to={currentRoleId === 'R3' ? '/moderator/users' : '/admin/profile'}
                            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:border-indigo-500 hover:text-indigo-500"
                        >
                            Về profile
                        </Link>
                        {isAdmin && (
                            <Link
                                to="/admin/orders"
                                className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:border-indigo-500 hover:text-indigo-500"
                            >
                                Quản lý đơn
                            </Link>
                        )}
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
                {success && <StatusAlert type="success">{success}</StatusAlert>}

                <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
                    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="mb-5">
                            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-indigo-500">
                                {editingId ? 'Cập nhật tài khoản' : isModeratorDraft ? 'Tạo Moderator' : 'Tạo tài khoản'}
                            </p>
                            <h2 className="mt-1 text-2xl font-bold text-slate-900">
                                {editingId ? 'Sửa người dùng' : isModeratorDraft ? 'Thêm moderator mới' : 'Thêm người dùng mới'}
                            </h2>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <FormInput label="Email" type="email" value={form.email} onChange={handleChange('email')} placeholder="name@example.com" />
                            <FormInput label={editingId ? 'Mật khẩu mới' : 'Mật khẩu'} type="password" value={form.password} onChange={handleChange('password')} placeholder={editingId ? 'Để trống nếu không đổi' : 'Ít nhất 6 ký tự'} />
                            <div className="grid gap-4 sm:grid-cols-2">
                                <FormInput label="Họ" value={form.firstName} onChange={handleChange('firstName')} />
                                <FormInput label="Tên" value={form.lastName} onChange={handleChange('lastName')} />
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <FormInput label="Số điện thoại" value={form.phoneNumber} onChange={handleChange('phoneNumber')} />
                                <FormInput label="Vị trí" value={form.positionId} onChange={handleChange('positionId')} placeholder="P0, P1..." />
                            </div>
                            <FormInput label="Hình ảnh" value={form.image} onChange={handleChange('image')} placeholder="https://..." />
                            <div className="grid gap-4 sm:grid-cols-2">
                                <label className="flex flex-col gap-1 text-left text-sm font-semibold text-gray-600">
                                    Giới tính
                                    <select value={form.gender} onChange={handleChange('gender')} className="rounded-lg border border-gray-300 px-4 py-2 outline-none focus:border-blue-500">
                                        <option value="false">Nữ</option>
                                        <option value="true">Nam</option>
                                    </select>
                                </label>

                                <label className="flex flex-col gap-1 text-left text-sm font-semibold text-gray-600">
                                    Kích hoạt
                                    <select value={form.isActive} onChange={handleChange('isActive')} className="rounded-lg border border-gray-300 px-4 py-2 outline-none focus:border-blue-500">
                                        <option value="true">Đã kích hoạt</option>
                                        <option value="false">Chưa kích hoạt</option>
                                    </select>
                                </label>
                            </div>

                            <label className="flex flex-col gap-1 text-left text-sm font-semibold text-gray-600">
                                Địa chỉ
                                <textarea value={form.address} onChange={handleChange('address')} rows="3" className="rounded-lg border border-gray-300 px-4 py-2 outline-none focus:border-blue-500" placeholder="Địa chỉ liên hệ" />
                            </label>

                            <label className="flex flex-col gap-1 text-left text-sm font-semibold text-gray-600">
                                Role
                                <select value={form.roleId} onChange={handleChange('roleId')} className="rounded-lg border border-gray-300 px-4 py-2 outline-none focus:border-blue-500">
                                    {isAdmin && <option value="R1">R1 - Admin</option>}
                                    <option value="R3">R3 - Moderator</option>
                                    <option value="R2">R2 - User</option>
                                </select>
                            </label>

                            <div className="flex gap-3 pt-2">
                                <SubmitButton loading={saving} type="primary" htmlType="submit" className="bg-indigo-600 hover:!bg-indigo-700" disabled={!isAdmin}>
                                    {editingId ? 'Lưu thay đổi' : isModeratorDraft ? 'Tạo Moderator' : 'Tạo mới'}
                                </SubmitButton>
                                {editingId && isAdmin && (
                                    <button
                                        type="button"
                                        onClick={resetForm}
                                        className="h-11 flex-1 rounded-lg border border-slate-300 bg-white text-sm font-semibold text-slate-700 transition-colors hover:border-slate-400"
                                    >
                                        Hủy chỉnh sửa
                                    </button>
                                )}
                            </div>
                        </form>
                    </section>

                    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="mb-4 flex items-center justify-between gap-3">
                            <div>
                                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-500">Danh sách</p>
                                <h2 className="mt-1 text-2xl font-bold text-slate-900">Người dùng trong hệ thống</h2>
                            </div>
                            <button
                                onClick={loadUsers}
                                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-emerald-500 hover:text-emerald-600"
                            >
                                Tải lại
                            </button>
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
                                            <th className="px-4 py-3 font-semibold">Hành động</th>
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
                                                <td className="px-4 py-3 text-slate-500">{formatDate(item.updatedAt)}</td>
                                                <td className="px-4 py-3">
                                                    <div className="flex flex-wrap gap-2">
                                                        {isAdmin && (
                                                            <button
                                                                onClick={() => handleEdit(item)}
                                                                className="rounded-lg border border-indigo-200 px-3 py-1.5 text-xs font-semibold text-indigo-600 transition-colors hover:bg-indigo-50"
                                                            >
                                                                Sửa
                                                            </button>
                                                        )}
                                                        {isAdmin && (
                                                            <button
                                                                onClick={() => setDeleteTarget(item)}
                                                                className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50"
                                                            >
                                                                Xóa
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>
                </div>
            </div>
<ToastNotification
    toastMessage={notificationsProps.toastMessage}
    setToastMessage={notificationsProps.setToastMessage}
/>

<ConfirmDialog
    open={Boolean(deleteTarget)}
    title="Xóa người dùng?"
    message={`Tài khoản ${deleteTarget?.email || ''} sẽ bị xóa khỏi hệ thống. Hành động này không thể hoàn tác.`}
    confirmLabel="Xóa người dùng"
    tone="danger"
    loading={deleting}
    onCancel={() => setDeleteTarget(null)}
    onConfirm={handleDelete}
/>
        </div>
    );
};

export default AdminManagementPage;
