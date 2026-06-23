import { useEffect, useState, useRef } from 'react';
import { useSelector } from 'react-redux';
import { Spin, message } from 'antd';
import StaffNav from '../components/StaffNav';
import { initiateSocketConnection, getSocket } from '../services/socket';
import { getChatContactsApi, getChatHistoryApi, sendChatMessageApi, markChatAsReadApi } from '../api/chatApi';

const displayRole = (role) => {
    switch (role) {
        case 'R1': return 'Admin';
        case 'R3': return 'Manager';
        case 'R4': return 'Shipper';
        default: return 'Khách';
    }
};

const ChatManagementPage = () => {
    const { user } = useSelector((state) => state.auth);
    const myUserId = user?.id || user?._id;
    const roleId = user?.roleId;

    const [loadingContacts, setLoadingContacts] = useState(false);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [contacts, setContacts] = useState([]);
    const [activeContact, setActiveContact] = useState(null);
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const messagesEndRef = useRef(null);
    const [hasMoreMessages, setHasMoreMessages] = useState(true);
    const [loadingMoreHistory, setLoadingMoreHistory] = useState(false);
    const messagesContainerRef = useRef(null);
    const prevMessagesRef = useRef([]);

    // 1. Fetch initial chat contacts
    const fetchContacts = async () => {
        setLoadingContacts(true);
        try {
            const res = await getChatContactsApi();
            if (res?.success) {
                setContacts(res.data || []);
            }
        } catch (err) {
            console.error('Failed to load contacts:', err);
            message.error('Không thể tải danh sách cuộc trò chuyện');
        } finally {
            setLoadingContacts(false);
        }
    };

    useEffect(() => {
        if (myUserId) {
            fetchContacts();
        }
    }, [myUserId]);

    // 2. Fetch history when active contact changes
    useEffect(() => {
        if (!myUserId || !activeContact) return;

        const fetchHistory = async () => {
            setLoadingHistory(true);
            setHasMoreMessages(true);
            try {
                const res = await getChatHistoryApi(myUserId, activeContact._id, { limit: 20 });
                if (res?.success) {
                    setMessages(res.data || []);
                    setHasMoreMessages(res.hasMore ?? (res.data?.length === 20));
                    
                    // Call API to mark as read
                    await markChatAsReadApi(activeContact._id);
                    
                    // Reset unread count locally
                    setContacts(prev => prev.map(c => 
                        c._id === activeContact._id ? { ...c, unreadCount: 0 } : c
                    ));

                    // Scroll to bottom initially
                    setTimeout(() => {
                        if (messagesContainerRef.current) {
                            messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
                        }
                    }, 50);
                }
            } catch (err) {
                console.error('Failed to load chat history:', err);
            } finally {
                setLoadingHistory(false);
            }
        };

        fetchHistory();
    }, [myUserId, activeContact]);

    // 3. Socket real-time message listener
    useEffect(() => {
        if (!myUserId) return;

        // Ensure socket is connected
        const socket = initiateSocketConnection(myUserId, roleId);
        if (!socket) return;

        // Join chat room
        socket.emit('join_chat', { userId: myUserId });

        const handleIncomingChatMessage = (msg) => {
            console.log('[Socket Admin] Received message:', msg);
            
            // Check if message is from/to the active contact
            if (activeContact && (msg.senderId === activeContact._id || msg.receiverId === activeContact._id)) {
                setMessages((prev) => [...prev, msg]); // Append to end because backend list is now sorted ascending
                // Mark received message as read
                if (msg.senderId === activeContact._id) {
                    markChatAsReadApi(activeContact._id).catch(() => {});
                }
            } else {
                // If it is from another user, increment unread count or reload contacts
                setContacts(prev => {
                    const existing = prev.some(c => c._id === msg.senderId);
                    if (existing) {
                        return prev.map(c => c._id === msg.senderId ? { ...c, unreadCount: c.unreadCount + 1 } : c);
                    } else {
                        // Reload contacts to fetch details
                        fetchContacts();
                        return prev;
                    }
                });
            }
        };

        socket.on('chat_message', handleIncomingChatMessage);

        return () => {
            socket.off('chat_message', handleIncomingChatMessage);
        };
    }, [myUserId, activeContact, roleId]);

    const handleScroll = async () => {
        const container = messagesContainerRef.current;
        if (!container) return;

        if (container.scrollTop === 0 && hasMoreMessages && !loadingMoreHistory && !loadingHistory && messages.length > 0) {
            setLoadingMoreHistory(true);
            const oldestMessage = messages[0];
            const beforeTimestamp = oldestMessage.createdAt;
            const scrollHeightBefore = container.scrollHeight;

            try {
                const res = await getChatHistoryApi(myUserId, activeContact._id, {
                    before: beforeTimestamp,
                    limit: 20
                });
                if (res?.success && res.data?.length > 0) {
                    const newMessages = res.data;
                    setMessages(prev => [...newMessages, ...prev]);
                    setHasMoreMessages(res.hasMore ?? (newMessages.length === 20));

                    // Restore scroll position so it doesn't jump
                    setTimeout(() => {
                        container.scrollTop = container.scrollHeight - scrollHeightBefore;
                    }, 0);
                } else {
                    setHasMoreMessages(false);
                }
            } catch (err) {
                console.error('Failed to load older messages:', err);
            } finally {
                setLoadingMoreHistory(false);
            }
        }
    };

    // Scroll to bottom helper - only trigger for initial loads and appended new messages
    useEffect(() => {
        const prev = prevMessagesRef.current;
        const current = messages;
        
        const hasNewAppended = current.length > 0 && (
            prev.length === 0 || 
            current[current.length - 1]?._id !== prev[prev.length - 1]?._id ||
            current[current.length - 1]?.createdAt !== prev[prev.length - 1]?.createdAt
        );

        if (hasNewAppended) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
        
        prevMessagesRef.current = messages;
    }, [messages]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        
        // Bug 1: Allow sending whitespace-only messages if input is not completely empty
        if (!inputText) return;
        if (!activeContact) return;

        try {
            const res = await sendChatMessageApi(activeContact._id, inputText);
            if (res?.success && res.message) {
                setMessages((prev) => [...prev, res.message]);
                setInputText('');

                // Push contact to top of list if not already there
                setContacts(prev => {
                    const withoutCurrent = prev.filter(c => c._id !== activeContact._id);
                    return [activeContact, ...withoutCurrent];
                });
            }
        } catch (err) {
            console.error('Failed to send message:', err);
            message.error('Không thể gửi tin nhắn');
        }
    };

    return (
        <div className="h-screen bg-slate-50 p-6 flex flex-col overflow-hidden">
            <div className="mx-auto w-full max-w-7xl flex flex-col flex-1 overflow-hidden min-h-0">
                <StaffNav roleId={roleId} />

                {/* Chat Panel Box */}
                <div className="flex-1 grid grid-cols-1 md:grid-cols-12 rounded-3xl border border-slate-200 bg-white shadow-xl overflow-hidden min-h-0">
                    
                    {/* Left Panel: Contact List */}
                    <div className="md:col-span-4 border-r border-slate-100 flex flex-col bg-white h-full min-h-0">
                        <div className="p-4 border-b border-slate-50 bg-slate-50/50">
                            <h2 className="text-lg font-black text-slate-800 text-left">Hỗ trợ khách hàng</h2>
                            <p className="text-xs text-slate-400 text-left mt-0.5">Danh sách liên hệ gần đây</p>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto chat-scrollbar">
                            <Spin spinning={loadingContacts}>
                                {contacts.length === 0 ? (
                                    <div className="p-8 text-center text-slate-400 text-sm">
                                        Không có cuộc trò chuyện nào
                                    </div>
                                ) : (
                                    contacts.map((contact) => {
                                        const isSelected = activeContact?._id === contact._id;
                                        return (
                                            <button
                                                key={contact._id}
                                                onClick={() => setActiveContact(contact)}
                                                className={`w-full flex items-center gap-3 px-4 py-4 text-left border-b border-slate-50 transition ${
                                                    isSelected ? 'bg-orange-50/70 border-l-4 border-l-orange-500' : 'hover:bg-slate-50'
                                                }`}
                                            >
                                                {/* Profile Avatar */}
                                                <div className="relative">
                                                    {contact.image ? (
                                                        <img src={contact.image} alt="" className="h-11 w-11 rounded-full object-cover border border-slate-200" />
                                                    ) : (
                                                        <div className="grid h-11 w-11 place-items-center rounded-full bg-slate-100 text-slate-500 font-bold text-sm">
                                                            {contact.firstName?.charAt(0) || 'U'}
                                                        </div>
                                                    )}
                                                    {contact.unreadCount > 0 && (
                                                        <span className="absolute -top-1 -right-1 grid h-5 w-5 place-items-center rounded-full bg-rose-500 text-[10px] font-bold text-white">
                                                            {contact.unreadCount}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Details */}
                                                <div className="flex-1 overflow-hidden">
                                                    <div className="flex justify-between items-baseline">
                                                        <h4 className="text-sm font-bold text-slate-800 truncate">
                                                            {contact.firstName} {contact.lastName}
                                                        </h4>
                                                        <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded-full text-slate-500 uppercase tracking-wider font-semibold">
                                                            {displayRole(contact.roleId)}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-slate-400 truncate mt-0.5">{contact.email}</p>
                                                </div>
                                            </button>
                                        );
                                    })
                                )}
                            </Spin>
                        </div>
                    </div>

                    {/* Right Panel: Active Chat */}
                    <div className="md:col-span-8 flex flex-col bg-slate-50/50 h-full min-h-0">
                        {activeContact ? (
                            <div className="flex flex-col flex-1 h-full overflow-hidden">
                                {/* Chat Header */}
                                <div className="flex items-center gap-3 bg-white border-b border-slate-100 px-6 py-4 shadow-sm">
                                    {activeContact.image ? (
                                        <img src={activeContact.image} alt="" className="h-10 w-10 rounded-full object-cover border border-slate-100" />
                                    ) : (
                                        <div className="grid h-10 w-10 place-items-center rounded-full bg-orange-100 text-orange-600 font-bold">
                                            {activeContact.firstName?.charAt(0) || 'C'}
                                        </div>
                                    )}
                                    <div className="text-left flex-1">
                                        <h3 className="text-sm font-bold text-slate-800 leading-tight">
                                            {activeContact.firstName} {activeContact.lastName}
                                        </h3>
                                        <p className="text-[11px] text-slate-400 mt-0.5">{activeContact.email}</p>
                                    </div>
                                </div>

                                {/* Messages View */}
                                <div 
                                    ref={messagesContainerRef}
                                    onScroll={handleScroll}
                                    className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 bg-slate-50 chat-scrollbar"
                                >
                                    {loadingMoreHistory && (
                                        <div className="text-center py-2 shrink-0">
                                            <Spin size="small" />
                                        </div>
                                    )}

                                    <Spin spinning={loadingHistory && messages.length === 0}>
                                        {messages.length === 0 && !loadingHistory ? (
                                            <div className="my-auto text-center text-slate-400 p-8">
                                                Chưa có tin nhắn nào. Bắt đầu cuộc trò chuyện hỗ trợ.
                                            </div>
                                        ) : (
                                            messages.map((msg) => {
                                                const isMe = msg.senderId === myUserId;
                                                return (
                                                    <div key={msg._id || Math.random()} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                        <div className={`max-w-[70%] rounded-2xl px-4 py-2 text-sm shadow-sm text-left ${
                                                            isMe 
                                                                ? 'bg-gradient-to-br from-orange-500 to-red-500 text-white rounded-br-none shadow-md shadow-orange-500/10' 
                                                                : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none'
                                                        }`}>
                                                            {/* Fix Bug 7: Render safely as text node to prevent Stored XSS */}
                                                            <div>{msg.content}</div>
                                                            
                                                            <span className={`block text-[10px] mt-1 text-right ${isMe ? 'text-white/60' : 'text-slate-400'}`}>
                                                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </Spin>
                                    <div ref={messagesEndRef} />
                                </div>

                                {/* Send Input Form */}
                                <form onSubmit={handleSendMessage} className="flex items-center gap-3 bg-white border-t border-slate-100 p-4">
                                    <input
                                        type="text"
                                        value={inputText}
                                        onChange={(e) => setInputText(e.target.value)}
                                        placeholder={`Nhập phản hồi gửi đến ${activeContact.firstName}...`}
                                        className="flex-1 rounded-full border border-slate-200 bg-slate-50 px-5 py-3 text-sm text-slate-800 outline-none focus:border-orange-500 focus:bg-white"
                                    />
                                    <button
                                        type="submit"
                                        className="inline-flex h-11 items-center gap-2 rounded-full bg-slate-900 hover:bg-slate-800 px-6 text-sm font-bold text-white transition active:scale-95"
                                    >
                                        Gửi phản hồi
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 transform rotate-90" viewBox="0 0 20 20" fill="currentColor">
                                            <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                                        </svg>
                                    </button>
                                </form>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-slate-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                                <h3 className="text-lg font-black text-slate-700">Chọn cuộc hội thoại</h3>
                                <p className="text-sm mt-1">Chọn một khách hàng ở bảng điều khiển bên trái để bắt đầu chat hỗ trợ.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChatManagementPage;
