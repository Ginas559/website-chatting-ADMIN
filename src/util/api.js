import axios from './axios.customize';

const PROFILE_API_BASE_URL = import.meta.env.VITE_PROFILE_API_URL || 'http://localhost:3000/api';

export const loginApi = (email, password) => {
    return axios.post('login', { email, password });
};

export const refreshTokenApi = (refreshToken) => {
    return axios.post('refresh-token', { refreshToken });
};

export const logoutApi = (refreshToken) => {
    return axios.post('logout', { refreshToken });
};

export const changePasswordApi = ({ currentPassword, newPassword }) => {
    return axios.patch('me/password', { currentPassword, newPassword });
};

export const verifyDeliveryQrApi = (qrContent) => {
    return axios.post('orders/delivery/verify', { qrContent });
};

export const getAdminOrdersApi = (params = {}) => {
    return axios.get('admin/orders', { params });
};

export const getAdminOrderDetailApi = (orderIdOrCode) => {
    return axios.get(`admin/orders/${orderIdOrCode}`);
};

export const updateAdminOrderStatusApi = (orderIdOrCode, status, note = '') => {
    return axios.patch(`admin/orders/${orderIdOrCode}/status`, { status, note });
};

export const resolveAdminCancelRequestApi = (orderIdOrCode, action, note = '') => {
    return axios.patch(`admin/orders/${orderIdOrCode}/cancel-request`, { action, note });
};

export const createAdminDeliveryQrApi = (orderIdOrCode) => {
    return axios.post(`admin/orders/${orderIdOrCode}/delivery-qr`);
};

export const getAdminDeliveryQrApi = (orderIdOrCode) => {
    return axios.get(`admin/orders/${orderIdOrCode}/delivery-qr`);
};

export const getHomeArticlesApi = (limit = 6) => {
    return axios.get(`articles/home?limit=${limit}`);
};

export const getArticleDetailApi = (slug) => {
    return axios.get(`articles/${slug}`);
};

export const getAdminProfileApi = () => {
    return axios.get('/admin/profile', { baseURL: '' });
};

export const getManagerProfileApi = () => {
    return axios.get('/manager/profile', { baseURL: '' });
};

export const getShipperProfileApi = () => {
    return axios.get('/shipper/profile', { baseURL: '' });
};

export const getProfileByIdApi = (userId) => {
    return axios.get(`/users/${userId}`, {
        baseURL: PROFILE_API_BASE_URL,
    });
};

export const updateProfileApi = (userId, data, method = 'patch') => {
    const requestMethod = method.toLowerCase() === 'put' ? 'put' : 'patch';

    return axios[requestMethod](`/users/${userId}/profile`, data, {
        baseURL: PROFILE_API_BASE_URL,
    });
};

export const getMyNotificationsApi = () => {
    return axios.get('notifications');
};

export const markAllNotificationsAsReadApi = () => {
    return axios.patch('notifications/read-all');
};

export const markNotificationAsReadApi = (id) => {
    return axios.patch(`notifications/${id}/read`);
};

export const createAdminArticleApi = (payload) => {
    return axios.post('admin/articles', payload);
};
