import axiosClient from './axiosClient';

export const dashboardApi = {
    getOverview: () => axiosClient.get('admin/dashboard/overview'),
    getRevenue: (range = '7days') => axiosClient.get('admin/dashboard/revenue', { params: { range } }),
    getOrderStatus: () => axiosClient.get('admin/dashboard/order-status'),
    getTopProducts: () => axiosClient.get('admin/dashboard/top-products'),
    getRecentOrders: () => axiosClient.get('admin/dashboard/recent-orders'),
};
