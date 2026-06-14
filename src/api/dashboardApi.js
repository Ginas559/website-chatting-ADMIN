import axiosClient from './axiosClient';

export const dashboardApi = {
    getOverview: (params) => axiosClient.get('admin/dashboard/overview', { params }),
    getRevenue: (params) => axiosClient.get('admin/dashboard/revenue', { params }),
    getOrderStatus: (params) => axiosClient.get('admin/dashboard/order-status', { params }),
    getTopProducts: (params) => axiosClient.get('admin/dashboard/top-products', { params }),
    getRecentOrders: (params) => axiosClient.get('admin/dashboard/recent-orders', { params }),
    getNewCustomers: (params) => axiosClient.get('admin/dashboard/new-customers', { params }),
    getCashflow: (params) => axiosClient.get('admin/dashboard/cashflow', { params }),
};
