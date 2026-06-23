import axios from '../util/axios.customize';

export const getChatContactsApi = () => {
    return axios.get('chat/contacts');
};

export const getChatHistoryApi = (senderId, receiverId, params = {}) => {
    return axios.get(`chat/history/${senderId}/${receiverId}`, { params });
};

export const sendChatMessageApi = (receiverId, content) => {
    return axios.post('chat/send', { receiverId, content });
};

export const markChatAsReadApi = (senderId) => {
    return axios.patch(`chat/read/${senderId}`);
};
