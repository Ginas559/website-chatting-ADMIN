import { io } from 'socket.io-client';

const getSocketUrl = () => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8088/api';
    try {
        const url = new URL(backendUrl);
        return url.origin;
    } catch {
        return 'http://localhost:8088';
    }
};

let socket = null;

export const initiateSocketConnection = (userId, roleId) => {
    if (socket) return socket;

    socket = io(getSocketUrl(), {
        transports: ['websocket'],
        credentials: true,
    });

    console.log('[Socket] Connecting...');

    socket.on('connect', () => {
        console.log('[Socket] Connected successfully:', socket.id);
        
        // Join appropriate rooms
        socket.emit('join', { userId, roleId });
    });

    socket.on('disconnect', () => {
        console.log('[Socket] Disconnected from server');
    });

    return socket;
};

export const disconnectSocket = () => {
    if (socket) {
        console.log('[Socket] Disconnecting...');
        socket.disconnect();
        socket = null;
    }
};

export const getSocket = () => {
    return socket;
};
