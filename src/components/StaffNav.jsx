import { Link } from 'react-router-dom';

const StaffNav = ({ roleId }) => (
    <div className="mb-6 flex flex-wrap gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <Link className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100" to="/">Dashboard</Link>
        {(roleId === 'R1' || roleId === 'R3') && <Link className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100" to="/admin/products">Sản phẩm</Link>}
        {roleId === 'R1' && <Link className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100" to="/admin/settings">Cài đặt</Link>}
        {(roleId === 'R1' || roleId === 'R3') && <Link className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100" to="/admin/orders">Đơn hàng</Link>}
        {(roleId === 'R1' || roleId === 'R3') && <Link className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100" to={roleId === 'R3' ? '/manager/users' : '/admin/users'}>Nhân sự</Link>}
    </div>
);

export default StaffNav;
