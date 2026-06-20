import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Empty, Input, Tag, message as antMessage } from 'antd';
import { liveChatApi } from '../../api/liveChatApi';

const roleClass = {
    ADMIN: 'text-yellow-500',
    MANAGER: 'text-purple-500',
    USER: 'text-slate-100',
    SHIPPER: 'text-green-500',
};

const roleTagColor = {
    ADMIN: 'gold',
    MANAGER: 'purple',
    USER: 'blue',
    SHIPPER: 'green',
};

const formatTime = (value) => value ? new Date(value).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '';

const LiveChatBox = ({ liveId, socket, disabled = false, canModerate = false, canPin = false }) => {
    const listRef = useRef(null);
    const [messages, setMessages] = useState([]);
    const [content, setContent] = useState('');
    const [sending, setSending] = useState(false);

    const pinnedMessage = useMemo(() => messages.find((item) => item.isPinned && !item.isDeleted), [messages]);

    const shouldAutoScroll = () => {
        const el = listRef.current;
        if (!el) return true;
        return el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    };

    const scrollToBottom = () => {
        requestAnimationFrame(() => {
            const el = listRef.current;
            if (el) el.scrollTop = el.scrollHeight;
        });
    };

    const upsertMessage = (nextMessage) => {
        const autoScroll = shouldAutoScroll();
        setMessages((current) => {
            const exists = current.some((item) => item._id === nextMessage._id);
            const next = exists
                ? current.map((item) => (item._id === nextMessage._id ? nextMessage : item))
                : [...current, nextMessage];
            return next.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        });
        if (autoScroll) scrollToBottom();
    };

    useEffect(() => {
        let mounted = true;

        const loadMessages = async () => {
            if (!liveId) {
                setMessages([]);
                return;
            }

            try {
                const response = await liveChatApi.getRecentMessages(liveId);
                if (mounted) {
                    setMessages(response?.data || []);
                    scrollToBottom();
                }
            } catch (error) {
                antMessage.error(error?.message || 'Không thể tải lịch sử chat');
            }
        };

        void loadMessages();
        return () => {
            mounted = false;
        };
    }, [liveId]);

    useEffect(() => {
        if (!socket || !liveId) return undefined;

        socket.emit('join-live-chat', { liveId });
        const onReceive = ({ message }) => upsertMessage(message);
        const onDeleted = ({ message }) => upsertMessage(message);
        const onPinned = ({ message }) => {
            setMessages((current) => current.map((item) => ({ ...item, isPinned: item._id === message._id })));
            upsertMessage(message);
        };
        const onError = ({ message }) => antMessage.error(message || 'Lỗi live chat');

        socket.on('receive-live-chat-message', onReceive);
        socket.on('live-chat-message-deleted', onDeleted);
        socket.on('live-chat-message-pinned', onPinned);
        socket.on('live-chat-error', onError);

        return () => {
            socket.off('receive-live-chat-message', onReceive);
            socket.off('live-chat-message-deleted', onDeleted);
            socket.off('live-chat-message-pinned', onPinned);
            socket.off('live-chat-error', onError);
        };
    }, [socket, liveId]);

    const sendMessage = () => {
        const text = content.trim();
        if (!text || !socket || !liveId || disabled) return;

        setSending(true);
        socket.emit('send-live-chat-message', { liveId, content: text });
        setContent('');
        window.setTimeout(() => setSending(false), 250);
    };

    const deleteMessage = (messageId) => {
        socket?.emit('delete-live-chat-message', { liveId, messageId });
    };

    const pinMessage = (messageId) => {
        socket?.emit('pin-live-chat-message', { liveId, messageId });
    };

    return (
        <div className="flex h-[520px] flex-col rounded-2xl border border-slate-200 bg-slate-950 text-white">
            <div className="border-b border-slate-800 p-3">
                <div className="font-bold">Live chat</div>
                {pinnedMessage ? (
                    <div className="mt-2 rounded-xl bg-yellow-500/10 p-2 text-sm text-yellow-200">
                        <b>Đã ghim:</b> {pinnedMessage.content}
                    </div>
                ) : null}
            </div>

            <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto p-3">
                {!messages.length ? (
                    <Empty description={<span className="text-slate-400">Chưa có bình luận</span>} />
                ) : messages.map((item) => (
                    <div key={item._id} className="mb-3 rounded-xl bg-white/5 p-2">
                        <div className="mb-1 flex flex-wrap items-center gap-2 text-xs">
                            <span className="font-bold text-white">{item.displayName}</span>
                            <Tag color={roleTagColor[item.role] || 'default'}>{item.role}</Tag>
                            <span className="text-slate-500">{formatTime(item.createdAt)}</span>
                        </div>
                        <div className={`break-words text-sm ${item.isDeleted ? 'text-slate-500 italic' : roleClass[item.role] || 'text-white'}`}>
                            {item.content}
                        </div>
                        {!item.isDeleted && (canModerate || canPin) ? (
                            <div className="mt-2 flex gap-2">
                                {canModerate ? <Button size="small" danger onClick={() => deleteMessage(item._id)}>Xóa</Button> : null}
                                {canPin ? <Button size="small" onClick={() => pinMessage(item._id)}>Ghim</Button> : null}
                            </div>
                        ) : null}
                    </div>
                ))}
            </div>

            <div className="border-t border-slate-800 p-3">
                <div className="flex gap-2">
                    <Input
                        value={content}
                        maxLength={200}
                        disabled={disabled}
                        placeholder={disabled ? 'Chat đã đóng' : 'Nhập bình luận...'}
                        onChange={(event) => setContent(event.target.value)}
                        onPressEnter={sendMessage}
                    />
                    <Button type="primary" loading={sending} disabled={disabled || !content.trim()} onClick={sendMessage}>Gửi</Button>
                </div>
            </div>
        </div>
    );
};

export default LiveChatBox;
