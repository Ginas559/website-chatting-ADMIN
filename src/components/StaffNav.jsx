import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { logoutUser } from '../redux/slices/authSlice';

const StaffNav = ({ roleId }) => {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await dispatch(logoutUser());
        navigate('/login', { replace: true });
    };

    return (
        <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <Link className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100" to="/">Dashboard</Link>
            {(roleId === 'R1' || roleId === 'R3') && <Link className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100" to="/admin/products">Sản phẩm</Link>}
            {roleId === 'R1' && <Link className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100" to="/admin/settings">Cài đặt</Link>}
            {roleId === 'R1' && <Link className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100" to="/admin/vouchers">Vouchers</Link>}
            {roleId === 'R1' && <Link className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100" to="/admin/livestream">Livestream</Link>}
            {(roleId === 'R1' || roleId === 'R3') && <Link className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100" to="/admin/orders">Đơn hàng</Link>}
            {(roleId === 'R1' || roleId === 'R3') && <Link className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100" to={roleId === 'R3' ? '/manager/users' : '/admin/users'}>Nhân sự</Link>}
            <button
                type="button"
                onClick={handleLogout}
                className="ml-auto rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100"
            >
                Đăng xuất
            </button>
        </div>
    );
};

export default StaffNav;
