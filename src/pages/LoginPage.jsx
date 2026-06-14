import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { loginUser, clearError, logoutUser } from '../redux/slices/authSlice';
import AuthShell from '../components/common/AuthShell';
import FormInput from '../components/common/FormInput';
import SubmitButton from '../components/common/SubmitButton';
import StatusAlert from '../components/common/StatusAlert';
const LoginPage = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { loading, error, user } = useSelector((state) => state.auth);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    const [accessDeniedMsg, setAccessDeniedMsg] = useState('');

    useEffect(() => {
        dispatch(clearError());
    }, [dispatch]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        dispatch(clearError());
        setSuccessMsg('');
        setAccessDeniedMsg('');

        const result = await dispatch(loginUser({ email, password }));

        if (loginUser.fulfilled.match(result)) {
            const roleId = (result.payload?.user || user)?.roleId;

            if (!['R1', 'R3', 'R4'].includes(roleId)) {
                dispatch(logoutUser());
                setAccessDeniedMsg('Tài khoản này không có quyền truy cập Staff Portal.');
                return;
            }

            setSuccessMsg('Đăng nhập thành công! Đang chuyển hướng...');
            setTimeout(() => {
                if (roleId === 'R1') {
                    navigate('/admin/dashboard');
                } else if (roleId === 'R3') {
                    navigate('/manager/dashboard');
                } else if (roleId === 'R4') {
                    navigate('/shipper/delivery');
                }
            }, 800);
        }
    };

    return (
        <AuthShell
            title="Staff Portal"
            subtitle="Đăng nhập bằng tài khoản quản trị, quản lý hoặc giao hàng"
            icon={(
                <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z" />
                </svg>
            )}
            footer={null}
        >
            {error && <StatusAlert>{error}</StatusAlert>}
            {accessDeniedMsg && <StatusAlert>{accessDeniedMsg}</StatusAlert>}
            {!error && !accessDeniedMsg && !successMsg && <StatusAlert type="info">Chỉ tài khoản Admin, Manager hoặc Shipper được truy cập khu vực này.</StatusAlert>}
            {successMsg && <StatusAlert type="success">{successMsg}</StatusAlert>}

            <form onSubmit={handleSubmit} autoComplete="on" className="space-y-5">
                <FormInput
                    label="Email"
                    name="login-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    required
                    autoComplete="email"
                    leftElement={(
                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                            <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                        </svg>
                    )}
                />

                <FormInput
                    label="Mật khẩu"
                    name="login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                    leftElement={(
                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                        </svg>
                    )}
                    rightElement={(
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="text-slate-400 transition hover:text-indigo-600"
                        >
                            {showPassword ? (
                                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" /><path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" /></svg>
                            ) : (
                                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z" /><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" /></svg>
                            )}
                        </button>
                    )}
                />

                <div className="flex justify-end">
                    <Link to="/forgot-password" className="text-sm font-medium text-slate-500 transition hover:text-indigo-700 hover:underline">
                        Quên mật khẩu?
                    </Link>
                </div>

                <SubmitButton htmlType="submit" loading={loading}>
                    Đăng nhập
                </SubmitButton>
            </form>
        </AuthShell>
    );
};

export default LoginPage;
