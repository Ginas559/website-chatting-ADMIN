import { io } from 'socket.io-client';

const getSocketUrl = () => {
    if (import.meta.env.VITE_SOCKET_URL) return import.meta.env.VITE_SOCKET_URL;
    if (import.meta.env.VITE_BACKEND_URL) return import.meta.env.VITE_BACKEND_URL.replace(/\/api\/?$/, '');
    return 'http://localhost:8088';
};

export const createLivestreamSocket = () => {
    return io(getSocketUrl(), {
        transports: ['websocket'],
        auth: {
            token: localStorage.getItem('accessToken'),
        },
    });
};
