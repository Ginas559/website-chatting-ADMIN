import { useState } from 'react';
import { changePasswordApi } from '../../util/api';
import FormInput from './FormInput';
import StatusAlert from './StatusAlert';

const normalizeError = (error, fallback = 'Không thể đổi mật khẩu') => {
    if (!error) return fallback;
    if (typeof error === 'string') return error;
    if (error?.errors?.length) return error.errors[0].msg;
    if (error?.errMessage) return error.errMessage;
    if (error?.error) return error.error;
    if (error?.message) return error.message;
    return fallback;
};

const ChangePasswordPanel = () => {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError('');
        setSuccess('');

        if (newPassword !== confirmPassword) {
            setError('Xác nhận mật khẩu không khớp');
            return;
        }

        setLoading(true);
        try {
            const res = await changePasswordApi({ currentPassword, newPassword });
            setSuccess(res?.errMessage || 'Đổi mật khẩu thành công');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err) {
            setError(normalizeError(err));
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="w-full max-w-md rounded-3xl border border-slate-100 bg-white p-6 shadow-lg">
            <h2 className="text-lg font-black text-slate-900">Đổi mật khẩu</h2>
            <p className="mt-1 text-sm text-slate-500">Áp dụng cho tài khoản đang đăng nhập.</p>
            <div className="mt-5 space-y-4">
                {error && <StatusAlert>{error}</StatusAlert>}
                {success && <StatusAlert type="success">{success}</StatusAlert>}
                <FormInput label="Mật khẩu hiện tại" type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required />
                <FormInput label="Mật khẩu mới" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required />
                <FormInput label="Nhập lại mật khẩu mới" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required />
                <button
                    type="submit"
                    disabled={loading}
                    className="h-11 w-full rounded-xl bg-slate-900 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60"
                >
                    {loading ? 'Đang đổi...' : 'Đổi mật khẩu'}
                </button>
            </div>
        </form>
    );
};

export default ChangePasswordPanel;
