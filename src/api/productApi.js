import axiosClient from './axiosClient';

export const productApi = {
    list: (params) => axiosClient.get('admin/products', { params }),
    create: (payload) => axiosClient.post('admin/products', payload),
    update: (id, payload) => axiosClient.patch(`admin/products/${id}`, payload),
    updateStatus: (id, status) => axiosClient.patch(`admin/products/${id}/status`, { status }),
    remove: (id) => axiosClient.delete(`admin/products/${id}`),
};
