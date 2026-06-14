const StatusAlert = ({ type = 'error', children }) => {
    const isSuccess = type === 'success';
    const isInfo = type === 'info';
    const className = isSuccess
        ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
        : isInfo
            ? 'bg-sky-50 text-sky-700 border-sky-100'
            : 'bg-red-50 text-red-700 border-red-100';

    const icon = isSuccess ? (
        <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
    ) : isInfo ? (
        <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10A8 8 0 112 10a8 8 0 0116 0zM9 9a1 1 0 112 0v5a1 1 0 11-2 0V9zm1-4a1.25 1.25 0 100 2.5A1.25 1.25 0 0010 5z" clipRule="evenodd" />
        </svg>
    ) : (
        <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
    );

    return (
        <div className={`mb-5 flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-medium shadow-sm ${className}`}>
            {icon}
            <span>{children}</span>
        </div>
    );
};

export default StatusAlert;
