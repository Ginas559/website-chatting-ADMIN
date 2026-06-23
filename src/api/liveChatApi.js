import axiosClient from './axiosClient';

export const liveChatApi = {
    getRecentMessages: (liveId) => axiosClient.get(`livestream/${liveId}/chat/messages`),
};
