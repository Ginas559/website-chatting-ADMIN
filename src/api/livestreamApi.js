import axiosClient from './axiosClient';

export const livestreamApi = {
    start: (payload) => axiosClient.post('admin/livestream/start', payload),
    end: (id) => axiosClient.patch(`admin/livestream/${id}/end`),
    history: (params) => axiosClient.get('admin/livestream/history', { params }),
};
