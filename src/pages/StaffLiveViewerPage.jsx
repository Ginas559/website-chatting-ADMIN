import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Empty, message, Spin, Tag } from 'antd';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { livestreamApi } from '../api/livestreamApi';
import { createLivestreamSocket } from '../sockets/livestreamSocket';
import LiveChatBox from '../components/livestream/LiveChatBox';

const ICE_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }];
const PEER_CONNECT_TIMEOUT_MS = 30000;
const rtcConfig = { iceServers: ICE_SERVERS };

const StaffLiveViewerPage = () => {
    const { user } = useSelector((state) => state.auth);
    const videoRef = useRef(null);
    const socketRef = useRef(null);
    const peerRef = useRef(null);
    const peerTimeoutRef = useRef(null);
    const adminSocketIdRef = useRef('');
    const remoteStreamRef = useRef(new MediaStream());

    const [livestream, setLivestream] = useState(null);
    const [liveSocket, setLiveSocket] = useState(null);
    const [loading, setLoading] = useState(true);
    const [watching, setWatching] = useState(false);
    const [ended, setEnded] = useState(false);

    const closeConnection = () => {
        window.clearTimeout(peerTimeoutRef.current);
        peerTimeoutRef.current = null;
        peerRef.current?.close();
        peerRef.current = null;
        adminSocketIdRef.current = '';
        remoteStreamRef.current = new MediaStream();

        if (videoRef.current) videoRef.current.srcObject = null;

        socketRef.current?.emit('user-disconnect', { liveId: livestream?._id });
        socketRef.current?.disconnect();
        socketRef.current = null;
        setLiveSocket(null);
        setWatching(false);
    };

    const loadCurrentLive = async () => {
        setLoading(true);
        try {
            const response = await livestreamApi.getCurrent();
            const current = response?.data || {};
            setLivestream(current.hasLive && current.hasActiveAdminSocket ? current.live : null);
            setEnded(false);
        } catch (error) {
            message.error(error?.message || error?.errMessage || 'Không thể kiểm tra livestream');
        } finally {
            setLoading(false);
        }
    };

    const createPeerConnection = () => {
        const peer = new RTCPeerConnection(rtcConfig);
        peerRef.current = peer;

        peer.ontrack = (event) => {
            event.streams[0]?.getTracks().forEach((track) => remoteStreamRef.current.addTrack(track));
            if (videoRef.current) videoRef.current.srcObject = remoteStreamRef.current;
        };

        peer.onicecandidate = (event) => {
            if (event.candidate && adminSocketIdRef.current) {
                socketRef.current?.emit('ice-candidate', {
                    liveId: livestream?._id,
                    targetSocketId: adminSocketIdRef.current,
                    candidate: event.candidate,
                });
            }
        };

        peer.onconnectionstatechange = () => {
            if (['connected', 'completed'].includes(peer.connectionState)) {
                window.clearTimeout(peerTimeoutRef.current);
                peerTimeoutRef.current = null;
            }
            if (['closed', 'failed', 'disconnected'].includes(peer.connectionState)) {
                closeConnection();
            }
        };

        peerTimeoutRef.current = window.setTimeout(() => {
            if (peerRef.current && !['connected', 'completed'].includes(peerRef.current.connectionState)) {
                message.error('Kết nối livestream quá thời gian chờ');
                closeConnection();
            }
        }, PEER_CONNECT_TIMEOUT_MS);

        return peer;
    };

    const startWatching = () => {
        if (!livestream?._id || watching) return;

        const socket = createLivestreamSocket();
        socketRef.current = socket;
        setLiveSocket(socket);
        setWatching(true);
        setEnded(false);

        socket.on('connect', () => {
            socket.emit('user-join-live', { liveId: livestream._id });
        });

        socket.on('offer', async ({ liveId, fromSocketId, offer }) => {
            if (String(liveId) !== String(livestream._id)) return;
            try {
                adminSocketIdRef.current = fromSocketId;
                const peer = peerRef.current || createPeerConnection();
                await peer.setRemoteDescription(new RTCSessionDescription(offer));
                const answer = await peer.createAnswer();
                await peer.setLocalDescription(answer);
                socket.emit('answer', { liveId, targetSocketId: fromSocketId, answer });
            } catch (error) {
                message.error(error?.message || 'Không thể nhận livestream');
                closeConnection();
            }
        });

        socket.on('ice-candidate', async ({ liveId, candidate }) => {
            if (String(liveId) !== String(livestream._id)) return;
            if (!peerRef.current || !candidate) return;
            await peerRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        });

        socket.on('admin-end-live', ({ liveId }) => {
            if (String(liveId) !== String(livestream._id)) return;
            closeConnection();
            setLivestream(null);
            setEnded(true);
        });

        socket.on('livestream-error', ({ message: errorMessage }) => {
            message.error(errorMessage || 'Không thể xem livestream');
            closeConnection();
        });
    };

    useEffect(() => {
        void loadCurrentLive();
        return () => closeConnection();
    }, []);

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900">
            <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-6 py-3 backdrop-blur">
                <div className="mx-auto flex max-w-[1800px] items-center gap-4">
                    <div className="text-xl font-black">SmartZone Live</div>
                    <Link className="ml-auto rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700" to={user?.roleId === 'R4' ? '/shipper/delivery' : '/manager/dashboard'}>
                        Trang chủ
                    </Link>
                </div>
            </header>

            <main className="mx-auto max-w-[1800px] px-6 py-6">

                {loading ? (
                    <div className="grid min-h-[60vh] place-items-center"><Spin /></div>
                ) : ended ? (
                    <Alert type="info" showIcon message="Livestream đã kết thúc" />
                ) : !livestream ? (
                    <div className="grid min-h-[60vh] place-items-center rounded-2xl border border-slate-200 bg-white">
                        <Empty description="Hiện chưa có livestream" />
                    </div>
                ) : (
                    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
                        <section>
                            <div className="overflow-hidden rounded-2xl bg-black">
                                <video ref={videoRef} autoPlay playsInline controls className="aspect-video w-full bg-black object-contain" />
                            </div>
                            <div className="mt-4">
                                <h1 className="text-2xl font-bold leading-tight text-slate-950">{livestream.title}</h1>
                                <div className="mt-3 flex flex-wrap items-center gap-3">
                                <Tag color="red">LIVE</Tag>
                                <span className="text-sm text-slate-500">{livestream.description || 'Không có mô tả'}</span>
                                <Button className="ml-auto rounded-full" type="primary" onClick={startWatching} disabled={watching}>
                                    {watching ? 'Đang xem livestream' : 'Xem livestream'}
                                </Button>
                                </div>
                            </div>
                        </section>
                        <LiveChatBox
                            liveId={livestream?._id}
                            socket={liveSocket}
                            disabled={!watching || ended}
                            canModerate={user?.roleId === 'R3'}
                            canPin={false}
                        />
                    </div>
                )}
            </main>
        </div>
    );
};

export default StaffLiveViewerPage;
