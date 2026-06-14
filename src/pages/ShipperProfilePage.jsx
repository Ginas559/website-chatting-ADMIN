import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logoutUser, setAuthUser } from '../redux/slices/authSlice';
import { getShipperProfileApi } from '../util/api';
import ProfileCard from '../components/common/ProfileCard';
import ChangePasswordPanel from '../components/common/ChangePasswordPanel';

const ShipperProfilePage = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { user } = useSelector((state) => state.auth);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const loadProfile = async () => {
            setLoading(true);
            setError('');
            try {
                const res = await getShipperProfileApi();
                if (res?.user) {
                    dispatch(setAuthUser(res.user));
                }
            } catch (err) {
                setError(err?.errMessage || err?.message || 'Không thể tải hồ sơ Shipper');
            } finally {
                setLoading(false);
            }
        };

        void loadProfile();
    }, [dispatch]);

    const handleLogout = async () => {
        await dispatch(logoutUser());
        navigate('/login');
    };

    return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#f0f4f8] px-4 py-8">
            <ProfileCard
                title="Shipper Profile"
                roleLabel="Shipper (R4)"
                roleAccentClass="bg-gradient-to-br from-sky-500 to-cyan-500"
                loading={loading}
                error={error}
                email={user?.email}
                footerText="Khu vực dành cho tài khoản giao hàng."
                onLogout={handleLogout}
                icon={(
                    <svg className="h-8 w-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M8 16.5A1.5 1.5 0 116.5 15 1.5 1.5 0 018 16.5zm7 0a1.5 1.5 0 111.5-1.5A1.5 1.5 0 0115 16.5z" />
                        <path d="M3 4a1 1 0 00-1 1v8h2.05a2.5 2.5 0 014.9 0h3.1a2.5 2.5 0 014.9 0H18v-3.2a1 1 0 00-.22-.63l-2.2-2.8A1 1 0 0014.8 6H13V5a1 1 0 00-1-1H3zm10 3.5h1.32L16 9.64V10h-3V7.5z" />
                    </svg>
                )}
            />
            <Link
                to="/shipper/delivery"
                className="rounded-xl bg-sky-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-500/20 transition-transform hover:-translate-y-0.5 hover:bg-sky-600"
            >
                Mở trang xác minh giao hàng
            </Link>
            <ChangePasswordPanel />
        </div>
    );
};

export default ShipperProfilePage;
