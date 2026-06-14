import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { BellOutlined, CheckOutlined, LoadingOutlined } from '@ant-design/icons';

export const NotificationBell = ({
    notifications = [],
    unreadCount = 0,
    loading = false,
    markAsRead,
    markAllAsRead,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);
    const navigate = useNavigate();

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleNotificationClick = async (notif) => {
        if (!notif.isRead) {
            await markAsRead(notif._id);
        }
        setIsOpen(false);
        if (notif.link) {
            navigate(notif.link);
        }
    };

    return (
        <div className="relative inline-block text-left" ref={dropdownRef}>
            {/* Bell Button */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="relative grid h-10 w-10 place-items-center rounded-2xl border border-orange-100 bg-orange-50 text-xl text-orange-600 transition hover:bg-orange-100"
                aria-label="Thông báo"
            >
                <BellOutlined />
                {unreadCount > 0 ? (
                    <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                ) : null}
            </button>

            {/* Dropdown Panel */}
            {isOpen && (
                <div className="absolute right-0 mt-3 w-80 sm:w-96 origin-top-right rounded-3xl border border-slate-200 bg-white shadow-2xl ring-1 ring-black/5 z-50 overflow-hidden transition-all duration-200">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                        <span className="text-base font-black text-slate-900">Thông báo</span>
                        {unreadCount > 0 ? (
                            <button
                                type="button"
                                onClick={markAllAsRead}
                                className="inline-flex items-center gap-1 text-xs font-semibold text-orange-600 hover:text-orange-700 transition"
                            >
                                <CheckOutlined />
                                <span>Đọc tất cả</span>
                            </button>
                        ) : null}
                    </div>

                    {/* Content List */}
                    <div className="max-h-[350px] overflow-y-auto divide-y divide-slate-50">
                        {loading && notifications.length === 0 ? (
                            <div className="flex items-center justify-center py-10 text-sm text-slate-400">
                                <LoadingOutlined className="mr-2 animate-spin text-orange-500" />
                                <span>Đang tải thông báo...</span>
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                                <div className="text-4xl text-slate-300 mb-2">🔔</div>
                                <p className="text-sm font-medium text-slate-500">Không có thông báo nào</p>
                                <p className="text-xs text-slate-400 mt-1">Hệ thống sẽ cập nhật khi có hoạt động mới.</p>
                            </div>
                        ) : (
                            notifications.map((notif) => (
                                <button
                                    key={notif._id}
                                    onClick={() => handleNotificationClick(notif)}
                                    type="button"
                                    className={`w-full flex gap-3 px-5 py-4 text-left transition hover:bg-slate-50 relative ${
                                        !notif.isRead ? 'bg-orange-50/40 hover:bg-orange-50/70' : ''
                                    }`}
                                >
                                    {/* Unread indicator */}
                                    {!notif.isRead && (
                                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-orange-500" />
                                    )}

                                    {/* Icon / Avatar based on type */}
                                    <div className="flex-shrink-0 grid h-10 w-10 place-items-center rounded-2xl bg-white shadow-sm border border-slate-100 text-lg">
                                        {notif.type === 'NEW_ORDER' ? '🛒' :
                                         notif.type === 'ORDER_STATUS_UPDATE' ? '📦' :
                                         notif.type === 'NEW_REVIEW' ? '⭐' :
                                         notif.type === 'NEW_ARTICLE' ? '📰' :
                                         notif.type === 'NEW_EVENT' ? '🎉' : '🔔'}
                                    </div>

                                    {/* Description */}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-slate-900 truncate">{notif.title}</p>
                                        <p className="text-xs text-slate-600 mt-1 leading-relaxed line-clamp-2">
                                            {notif.content}
                                        </p>
                                        <span className="text-[10px] text-slate-400 font-medium mt-2 block">
                                            {new Date(notif.createdAt).toLocaleDateString('vi-VN', {
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })}
                                        </span>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationBell;
