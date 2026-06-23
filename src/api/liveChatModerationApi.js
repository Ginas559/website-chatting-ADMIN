import axios from '../util/axios.customize';

export const liveChatModerationApi = {
    getBans: (params = {}) => axios.get('admin/live-chat/moderation/bans', { params }),
    unban: (caseId, reason) => axios.patch(`admin/live-chat/moderation/bans/${caseId}/unban`, { reason }),
    getUnbanRequests: (params = {}) => axios.get('admin/live-chat/moderation/unban-requests', { params }),
    reviewUnbanRequest: (requestId, payload) => axios.patch(`admin/live-chat/moderation/unban-requests/${requestId}/review`, payload),
};
