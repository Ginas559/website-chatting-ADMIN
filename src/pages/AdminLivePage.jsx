import { useEffect, useRef, useState } from 'react';
import { Button, Card, Empty, Form, Input, List, message, Spin, Tag } from 'antd';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { livestreamApi } from '../api/livestreamApi';
import { createLivestreamSocket } from '../sockets/livestreamSocket';
import LiveChatBox from '../components/livestream/LiveChatBox';

const ICE_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }];
const PEER_CONNECT_TIMEOUT_MS = 30000;
const rtcConfig = { iceServers: ICE_SERVERS };

const AdminLivePage = () => {
    const { user } = useSelector((state) => state.auth);
    const [form] = Form.useForm();
    const localVideoRef = useRef(null);
    const localStreamRef = useRef(null);
    const socketRef = useRef(null);
    const peersRef = useRef(new Map());
    const peerTimeoutsRef = useRef(new Map());
    const livestreamRef = useRef(null);

    const [livestream, setLivestream] = useState(null);
    const [liveSocket, setLiveSocket] = useState(null);
    const [viewerIds, setViewerIds] = useState([]);
    const [viewerCount, setViewerCount] = useState(0);
    const [starting, setStarting] = useState(false);
    const [ending, setEnding] = useState(false);

    useEffect(() => {
        livestreamRef.current = livestream;
    }, [livestream]);

    const closePeer = (userSocketId) => {
        const peer = peersRef.current.get(userSocketId);
        if (peer) {
            peer.close();
            peersRef.current.delete(userSocketId);
        }
        window.clearTimeout(peerTimeoutsRef.current.get(userSocketId));
        peerTimeoutsRef.current.delete(userSocketId);
        setViewerIds((prev) => prev.filter((id) => id !== userSocketId));
    };

    const cleanupLive = ({ notifyUsers = false } = {}) => {
        if (notifyUsers) {
            socketRef.current?.emit('admin-end-live', { liveId: livestreamRef.current?._id });
        }

        peerTimeoutsRef.current.forEach((timer) => window.clearTimeout(timer));
        peerTimeoutsRef.current.clear();
        peersRef.current.forEach((peer) => peer.close());
        peersRef.current.clear();
        setViewerIds([]);
        setViewerCount(0);

        localStreamRef.current?.getTracks().forEach((track) => track.stop());
        localStreamRef.current = null;

        if (localVideoRef.current) {
            localVideoRef.current.srcObject = null;
        }

        socketRef.current?.disconnect();
        socketRef.current = null;
        setLiveSocket(null);
    };

    const createPeerForUser = async (userSocketId) => {
        if (!localStreamRef.current || peersRef.current.has(userSocketId)) return;

        const peer = new RTCPeerConnection(rtcConfig);
        peersRef.current.set(userSocketId, peer);
        setViewerIds((prev) => (prev.includes(userSocketId) ? prev : [...prev, userSocketId]));
        const liveId = livestreamRef.current?._id;

        // Admin add local camera/micro tracks vao connection rieng cua tung user.
        localStreamRef.current.getTracks().forEach((track) => {
            peer.addTrack(track, localStreamRef.current);
        });

        peer.onicecandidate = (event) => {
            if (event.candidate) {
                socketRef.current?.emit('ice-candidate', {
                    liveId,
                    targetSocketId: userSocketId,
                    candidate: event.candidate,
                });
            }
        };

        peer.onconnectionstatechange = () => {
            if (['connected', 'completed'].includes(peer.connectionState)) {
                window.clearTimeout(peerTimeoutsRef.current.get(userSocketId));
                peerTimeoutsRef.current.delete(userSocketId);
            }
            if (['closed', 'failed', 'disconnected'].includes(peer.connectionState)) {
                closePeer(userSocketId);
            }
        };

        const timeout = window.setTimeout(() => {
            const currentPeer = peersRef.current.get(userSocketId);
            if (currentPeer && !['connected', 'completed'].includes(currentPeer.connectionState)) {
                closePeer(userSocketId);
                socketRef.current?.emit('user-disconnect', { liveId, userSocketId });
            }
        }, PEER_CONNECT_TIMEOUT_MS);
        peerTimeoutsRef.current.set(userSocketId, timeout);

        // Offer la mo ta ket noi do Admin tao va gui qua Socket.IO.
        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);
        socketRef.current?.emit('offer', { liveId, targetSocketId: userSocketId, offer });
    };

    const bindSocketEvents = (socket, liveData) => {
        socket.on('connect', () => {
            socket.emit('admin-start-live', {
                liveId: liveData?._id,
                title: liveData?.title,
                description: liveData?.description,
            });
        });

        socket.on('user-joined', ({ liveId, userSocketId }) => {
            if (String(liveId) !== String(liveData?._id)) return;
            createPeerForUser(userSocketId).catch((error) => {
                message.error(error?.message || 'Không thể tạo kết nối với người xem');
                closePeer(userSocketId);
            });
        });

        socket.on('answer', async ({ liveId, fromSocketId, answer }) => {
            if (String(liveId) !== String(liveData?._id)) return;
            const peer = peersRef.current.get(fromSocketId);
            if (!peer || !answer) return;

            // Answer la phan hoi ket noi do User tao sau khi nhan offer.
            await peer.setRemoteDescription(new RTCSessionDescription(answer));
        });

        socket.on('ice-candidate', async ({ liveId, fromSocketId, candidate }) => {
            if (String(liveId) !== String(liveData?._id)) return;
            const peer = peersRef.current.get(fromSocketId);
            if (!peer || !candidate) return;

            // ICE Candidate la thong tin duong mang de hai trinh duyet tim cach ket noi truc tiep.
            await peer.addIceCandidate(new RTCIceCandidate(candidate));
        });

        socket.on('user-disconnect', ({ liveId, userSocketId }) => {
            if (String(liveId) !== String(liveData?._id)) return;
            closePeer(userSocketId);
        });

        socket.on('viewer-count-updated', ({ liveId, viewerCount: nextCount }) => {
            if (String(liveId) !== String(liveData?._id)) return;
            setViewerCount(Number(nextCount || 0));
        });

        socket.on('livestream-error', ({ message: errorMessage }) => {
            message.error(errorMessage || 'Socket livestream bị từ chối');
        });
    };

    const startLive = async (values) => {
        setStarting(true);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            localStreamRef.current = stream;

            if (localVideoRef.current) {
                localVideoRef.current.srcObject = stream;
                await localVideoRef.current.play().catch(() => null);
            }

            const response = await livestreamApi.start(values);
            const liveData = response?.data;
            setLivestream(liveData);

            const socket = createLivestreamSocket();
            socketRef.current = socket;
            setLiveSocket(socket);
            bindSocketEvents(socket, liveData);

            message.success('Đã bắt đầu livestream');
        } catch (error) {
            cleanupLive();
            message.error(error?.message || error?.errMessage || 'Không thể bắt đầu livestream');
        } finally {
            setStarting(false);
        }
    };

    const endLive = async () => {
        if (!livestream?._id) return;

        setEnding(true);
        try {
            await livestreamApi.end(livestream._id);
            cleanupLive({ notifyUsers: true });
            setLivestream(null);
            message.success('Đã kết thúc livestream');
        } catch (error) {
            message.error(error?.message || error?.errMessage || 'Không thể kết thúc livestream');
        } finally {
            setEnding(false);
        }
    };

    useEffect(() => {
        return () => cleanupLive();
    }, []);

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900">
            <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-6 py-3 backdrop-blur">
                <div className="mx-auto flex max-w-[1800px] items-center gap-4">
                    <div className="text-xl font-black">SmartZone Live Studio</div>
                    <Link className="ml-auto rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700" to="/admin/dashboard">Dashboard</Link>
                    <Link className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100" to="/admin/orders">Đơn hàng</Link>
                </div>
            </div>

            <main className="mx-auto max-w-[1800px] px-6 py-6">
                {!livestream ? (
                    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
                        <Card title="Thiết lập phiên livestream">
                            <Form form={form} layout="vertical" onFinish={startLive}>
                                <Form.Item name="title" label="Tiêu đề" rules={[{ required: true, min: 2, message: 'Nhập tiêu đề tối thiểu 2 ký tự' }]}>
                                    <Input placeholder="Livestream giới thiệu sản phẩm" />
                                </Form.Item>
                                <Form.Item name="description" label="Mô tả">
                                    <Input.TextArea rows={3} placeholder="Sale hôm nay" />
                                </Form.Item>
                                <Button type="primary" htmlType="submit" loading={starting}>
                                    Bắt đầu live
                                </Button>
                            </Form>
                        </Card>
                        <Card title="Người xem">
                            <Empty description="Chưa có user xem live" />
                        </Card>
                    </div>
                ) : null}

                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
                    <section>
                        <div className="overflow-hidden rounded-2xl bg-black">
                            {starting ? <Spin /> : null}
                            <video
                                ref={localVideoRef}
                                autoPlay
                                muted
                                playsInline
                                className="aspect-video w-full bg-black object-cover"
                            />
                        </div>

                        <div className="mt-4">
                            <h1 className="text-2xl font-bold leading-tight text-slate-950">{livestream?.title || 'Camera preview'}</h1>
                            <div className="mt-3 flex flex-wrap items-center gap-3">
                                {livestream ? <Tag color="red">LIVE</Tag> : <Tag>OFFLINE</Tag>}
                                <span className="rounded-full bg-white px-3 py-1 text-sm text-slate-600 shadow-sm">{viewerCount} người xem</span>
                                <span className="text-sm text-slate-500">{livestream?.description || 'Thiết lập livestream trước khi phát.'}</span>
                                {livestream ? (
                                    <Button className="ml-auto rounded-full" danger type="primary" onClick={endLive} loading={ending}>
                                        Kết thúc live
                                    </Button>
                                ) : null}
                            </div>

                            {viewerIds.length ? (
                                <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                                    <div className="mb-2 text-sm font-semibold text-slate-600">Socket người xem</div>
                                    <List
                                        dataSource={viewerIds}
                                        renderItem={(id) => <List.Item><span className="text-sm text-slate-500">{id}</span></List.Item>}
                                    />
                                </div>
                            ) : null}
                        </div>
                    </section>

                    <LiveChatBox
                        liveId={livestream?._id}
                        socket={liveSocket}
                        disabled={!livestream}
                        canModerate
                        canPin
                    />
                </div>
            </main>
        </div>
    );
};

export default AdminLivePage;
