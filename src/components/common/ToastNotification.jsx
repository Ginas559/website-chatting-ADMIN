import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CloseOutlined } from '@ant-design/icons';

export const ToastNotification = ({ toastMessage = null, setToastMessage }) => {
    const [isVisible, setIsVisible] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        if (!toastMessage) {
            setIsVisible(false);
            return;
        }

        // Show toast
        setIsVisible(true);

        // Auto close after 6 seconds
        const timer = setTimeout(() => {
            handleClose();
        }, 6000);

        return () => clearTimeout(timer);
    }, [toastMessage]);

    const handleClose = () => {
        setIsVisible(false);
        // Delay clearing the message to allow closing animation to complete
        setTimeout(() => {
            setToastMessage(null);
        }, 3000);
    };

    const handleToastClick = () => {
        if (toastMessage?.link) {
            navigate(toastMessage.link);
        }
        handleClose();
    };

    if (!toastMessage || !isVisible) return null;

    return (
        <div className="fixed bottom-5 right-5 z-50 animate-bounce-short max-w-sm w-full bg-white/90 backdrop-blur-md rounded-2xl border border-orange-100 shadow-2xl p-4 flex items-start gap-3 ring-1 ring-black/5 hover:-translate-y-0.5 transition duration-300">
            {/* Type Icon */}
            <div className="flex-shrink-0 grid h-10 w-10 place-items-center rounded-xl bg-orange-50 text-xl border border-orange-100 shadow-sm">
                {toastMessage.type === 'NEW_ORDER' ? '🛒' :
                 toastMessage.type === 'ORDER_STATUS_UPDATE' ? '📦' :
                 toastMessage.type === 'NEW_REVIEW' ? '⭐' :
                 toastMessage.type === 'NEW_ARTICLE' ? '📰' :
                 toastMessage.type === 'NEW_EVENT' ? '🎉' : '🔔'}
            </div>

            {/* Message Body */}
            <button
                type="button"
                onClick={handleToastClick}
                className="flex-1 text-left min-w-0"
            >
                <p className="text-xs font-black uppercase tracking-wider text-orange-600">Thông báo mới</p>
                <h4 className="text-sm font-bold text-slate-900 mt-0.5 truncate">{toastMessage.title}</h4>
                <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">{toastMessage.content}</p>
                <span className="text-[10px] text-slate-400 mt-2 block font-semibold hover:underline">
                    Bấm để xem ngay &rarr;
                </span>
            </button>

            {/* Close Button */}
            <button
                type="button"
                onClick={handleClose}
                className="flex-shrink-0 text-slate-400 hover:text-slate-600 text-xs transition p-1"
                aria-label="Đóng"
            >
                <CloseOutlined />
            </button>
        </div>
    );
};

export default ToastNotification;
