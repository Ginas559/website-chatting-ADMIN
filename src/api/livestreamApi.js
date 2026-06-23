import axiosClient from './axiosClient';

export const livestreamApi = {
    getCurrent: () => axiosClient.get('livestream/current'),
    start: (payload) => axiosClient.post('admin/livestream/start', payload),
    end: (id) => axiosClient.patch(`admin/livestream/${id}/end`),
    history: (params) => axiosClient.get('admin/livestream/history', { params }),
};
