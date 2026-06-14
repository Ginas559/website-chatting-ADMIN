import { useEffect, useState, useRef } from 'react';
import { useSelector } from 'react-redux';
import { initiateSocketConnection, disconnectSocket, getSocket } from '../services/socket';
import { getMyNotificationsApi, markAllNotificationsAsReadApi, markNotificationAsReadApi } from '../util/api';

export const useNotifications = () => {
    const { isAuthenticated, user } = useSelector((state) => state.auth);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [toastMessage, setToastMessage] = useState(null);
    const socketRef = useRef(null);

    const userId = user?.id || user?._id || null;
    const roleId = user?.roleId || 'R2';

    // 1. Fetch notifications from server
    const fetchNotifications = async () => {
        if (!isAuthenticated || !userId) return;
        setLoading(true);
        try {
            const response = await getMyNotificationsApi();
            if (response?.success && response?.data) {
                setNotifications(response.data.notifications || []);
                setUnreadCount(response.data.unreadCount || 0);
            }
        } catch (error) {
            console.error('[Notification Hook Error] Fetch failed:', error);
        } finally {
            setLoading(false);
        }
    };

    // 2. Mark specific notification as read
    const markAsRead = async (id) => {
        try {
            const response = await markNotificationAsReadApi(id);
            if (response?.success) {
                setNotifications((prev) =>
                    prev.map((notif) => (notif._id === id ? { ...notif, isRead: true } : notif))
                );
                setUnreadCount((prev) => Math.max(0, prev - 1));
            }
        } catch (error) {
            console.error('[Notification Hook Error] Mark as read failed:', error);
        }
    };

    // 3. Mark all as read
    const markAllAsRead = async () => {
        try {
            const response = await markAllNotificationsAsReadApi();
            if (response?.success) {
                setNotifications((prev) => prev.map((notif) => ({ ...notif, isRead: true })));
                setUnreadCount(0);
            }
        } catch (error) {
            console.error('[Notification Hook Error] Mark all as read failed:', error);
        }
    };

    // 4. Manage socket connection and real-time events
    useEffect(() => {
        if (!isAuthenticated || !userId) {
            setNotifications([]);
            setUnreadCount(0);
            disconnectSocket();
            return;
        }

        // Fetch initial list
        fetchNotifications();

        // Connect to Socket.io
        const socketInstance = initiateSocketConnection(userId, roleId);
        socketRef.current = socketInstance;

        // Listen for new notifications
        const handleNewNotification = (notification) => {
            console.log('[Socket] New notification received:', notification);
            
            // Check if notification is already in the list
            setNotifications((prev) => {
                const exists = prev.some((n) => n._id === notification._id);
                if (exists) return prev;
                return [notification, ...prev];
            });

            setUnreadCount((prev) => prev + 1);

            // Set toast message for UI popup
            setToastMessage(notification);
        };

        socketInstance.on('notification', handleNewNotification);

        return () => {
            if (socketInstance) {
                socketInstance.off('notification', handleNewNotification);
            }
        };
    }, [isAuthenticated, userId, roleId]);

    return {
        notifications,
        unreadCount,
        loading,
        toastMessage,
        setToastMessage,
        markAsRead,
        markAllAsRead,
        refresh: fetchNotifications,
    };
};
export default useNotifications;
