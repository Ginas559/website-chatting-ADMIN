const ProfileCard = ({ title, roleLabel, roleAccentClass, icon, loading, error, email, footerText, onLogout }) => {
    const roleTextClass = roleAccentClass.includes('amber') ? 'text-amber-500' : 'text-indigo-500';

    return (
        <div className="min-h-screen bg-[#f0f4f8] flex items-center justify-center font-[Inter,sans-serif]">
            <div className="bg-white rounded-3xl p-10 shadow-lg border border-slate-100 max-w-md w-full mx-4 text-center">
                <div className={`w-16 h-16 rounded-full inline-flex items-center justify-center mb-4 ${roleAccentClass}`}>
                    {icon}
                </div>
                <h1 className="text-2xl font-bold text-slate-800 mb-2">{title}</h1>
                <p className="text-slate-500 mb-1">Role: <span className={`font-semibold ${roleTextClass}`}>{roleLabel}</span></p>
                {loading && <p className="text-slate-500 mb-6">Đang tải hồ sơ...</p>}
                {error && <p className="text-red-500 mb-6">{error}</p>}
                {email && <p className="text-slate-500 mb-6">{email}</p>}
                <p className="text-slate-400 text-sm mb-6">{footerText}</p>
                <button
                    onClick={onLogout}
                    className="px-6 py-2.5 rounded-xl bg-red-50 text-red-500 font-semibold text-sm border border-red-200 hover:bg-red-100 transition-colors cursor-pointer"
                >
                    Đăng xuất
                </button>
            </div>
        </div>
    );
};

export default ProfileCard;