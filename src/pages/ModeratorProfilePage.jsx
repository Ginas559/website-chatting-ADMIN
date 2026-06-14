import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { fetchModeratorProfile, logoutUser } from '../redux/slices/authSlice';
import ProfileCard from '../components/common/ProfileCard';

const ModeratorProfilePage = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { user, profileLoading, profileError } = useSelector((state) => state.auth);

    useEffect(() => {
        dispatch(fetchModeratorProfile());
    }, [dispatch]);

    const handleLogout = async () => {
        await dispatch(logoutUser());
        navigate('/login');
    };

    return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#f0f4f8] px-4">
            <ProfileCard
                title="Moderator Profile"
                roleLabel="Moderator (R3)"
                roleAccentClass="bg-gradient-to-br from-emerald-500 to-teal-500"
                loading={profileLoading}
                error={profileError}
                email={user?.email}
                footerText="Khu vực dành cho kiểm duyệt và quản lý nội bộ."
                onLogout={handleLogout}
                icon={(
                    <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 2l2.39 4.84L18 7.62l-4 3.89.94 5.49L10 14.95 5.06 17l.94-5.49-4-3.89 5.61-.78L10 2z" />
                    </svg>
                )}
            />

            <Link
                to="/moderator/users"
                className="rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition-transform hover:-translate-y-0.5 hover:bg-emerald-600"
            >
                Mở trang quản lý user
            </Link>
        </div>
    );
};

export default ModeratorProfilePage;