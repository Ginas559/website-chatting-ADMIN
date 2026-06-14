import axiosClient from './axiosClient';

export const settingApi = {
    get: () => axiosClient.get('admin/settings'),
    update: (payload) => axiosClient.patch('admin/settings', payload),
};
