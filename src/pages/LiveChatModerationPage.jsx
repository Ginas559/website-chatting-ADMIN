import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Descriptions, Empty, Form, Input, Modal, Select, Spin, Table, Tag, message } from 'antd';
import { useSelector } from 'react-redux';
import StaffNav from '../components/StaffNav';
import { liveChatModerationApi } from '../api/liveChatModerationApi';

const statusColor = {
    ACTIVE: 'red',
    UNBANNED: 'green',
    EXPIRED: 'default',
    PENDING: 'gold',
    APPROVED: 'green',
    REJECTED: 'red',
};

const violationText = {
    LEVEL_2_SINGLE: 'Mức 2 nghiêm trọng',
    THREE_LEVEL_1_IN_LIVE: '3 lần mức 1',
};

const formatDateTime = (value) => value ? new Date(value).toLocaleString('vi-VN') : '-';

const LiveChatModerationPage = () => {
    const { user } = useSelector((state) => state.auth);
    const [bans, setBans] = useState([]);
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('');

    const loadData = async () => {
        setLoading(true);
        try {
            const [banResponse, requestResponse] = await Promise.all([
                liveChatModerationApi.getBans(status ? { status } : {}),
                liveChatModerationApi.getUnbanRequests(),
            ]);
            setBans(banResponse?.data || []);
            setRequests(requestResponse?.data || []);
        } catch (error) {
            message.error(error?.message || 'Không thể tải dữ liệu kiểm duyệt');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void loadData();
    }, [status]);

    const activeCount = useMemo(() => bans.filter((item) => item.status === 'ACTIVE').length, [bans]);

    const handleUnban = (record) => {
        let reason = '';
        Modal.confirm({
            title: 'Gỡ khóa chat?',
            content: (
                <Input.TextArea
                    rows={3}
                    placeholder="Lý do gỡ ban"
                    onChange={(event) => {
                        reason = event.target.value;
                    }}
                />
            ),
            okText: 'Gỡ ban',
            cancelText: 'Hủy',
            onOk: async () => {
                await liveChatModerationApi.unban(record._id, reason || 'Admin/Manager gỡ ban sau khi kiểm tra');
                message.success('Đã gỡ ban chat');
                await loadData();
            },
        });
    };

    const handleReview = async (requestId, nextStatus) => {
        try {
            await liveChatModerationApi.reviewUnbanRequest(requestId, {
                status: nextStatus,
                adminReply: nextStatus === 'APPROVED' ? 'Yêu cầu gỡ ban đã được duyệt' : 'Yêu cầu gỡ ban chưa được duyệt',
            });
            message.success('Đã xử lý yêu cầu');
            await loadData();
        } catch (error) {
            message.error(error?.message || 'Không thể xử lý yêu cầu');
        }
    };

    const banColumns = [
        {
            title: 'Người dùng',
            dataIndex: 'displayName',
            render: (text, record) => (
                <div>
                    <div className="font-semibold text-slate-900">{text}</div>
                    <Tag color={record.role === 'SHIPPER' ? 'green' : 'blue'}>{record.role}</Tag>
                </div>
            ),
        },
        {
            title: 'Vi phạm',
            dataIndex: 'violationType',
            render: (value) => violationText[value] || value,
        },
        {
            title: 'Thời hạn',
            render: (_, record) => (
                <div>
                    <div>{record.banDays} ngày</div>
                    <div className="text-xs text-slate-500">Đến {formatDateTime(record.bannedUntil)}</div>
                </div>
            ),
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            render: (value) => <Tag color={statusColor[value]}>{value}</Tag>,
        },
        {
            title: 'Thao tác',
            render: (_, record) => (
                <Button disabled={record.status !== 'ACTIVE'} onClick={() => handleUnban(record)}>
                    Gỡ ban
                </Button>
            ),
        },
    ];

    const requestColumns = [
        {
            title: 'Người gửi',
            render: (_, record) => record.moderationCase?.displayName || record.userId,
        },
        {
            title: 'Lý do',
            dataIndex: 'reason',
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            render: (value) => <Tag color={statusColor[value]}>{value}</Tag>,
        },
        {
            title: 'Thao tác',
            render: (_, record) => record.status === 'PENDING' ? (
                <div className="flex gap-2">
                    <Button type="primary" onClick={() => handleReview(record._id, 'APPROVED')}>Duyệt</Button>
                    <Button danger onClick={() => handleReview(record._id, 'REJECTED')}>Từ chối</Button>
                </div>
            ) : null,
        },
    ];

    return (
        <div className="min-h-screen bg-slate-50 p-6">
            <div className="mx-auto max-w-7xl">
                <StaffNav roleId={user?.roleId} />
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-slate-900">Kiểm duyệt live chat</h1>
                    <p className="mt-2 text-slate-600">Theo dõi án phạt AI Bot, comment vi phạm và yêu cầu gỡ ban.</p>
                </div>

                <Alert
                    className="mb-4"
                    type="info"
                    showIcon
                    message={`Đang có ${activeCount} án phạt còn hiệu lực.`}
                />

                <Spin spinning={loading}>
                    <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <Form layout="inline">
                            <Form.Item label="Trạng thái">
                                <Select
                                    className="w-48"
                                    value={status}
                                    onChange={setStatus}
                                    options={[
                                        { value: '', label: 'Tất cả' },
                                        { value: 'ACTIVE', label: 'Đang khóa' },
                                        { value: 'UNBANNED', label: 'Đã gỡ' },
                                        { value: 'EXPIRED', label: 'Hết hạn' },
                                    ]}
                                />
                            </Form.Item>
                        </Form>
                    </div>

                    <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <h2 className="mb-4 text-xl font-bold text-slate-900">Danh sách án phạt</h2>
                        <Table
                            rowKey="_id"
                            columns={banColumns}
                            dataSource={bans}
                            locale={{ emptyText: <Empty description="Chưa có án phạt" /> }}
                            expandable={{
                                expandedRowRender: (record) => (
                                    <Descriptions column={1} size="small" bordered>
                                        {(record.comments || []).map((comment, index) => (
                                            <Descriptions.Item key={`${record._id}-${index}`} label={`Comment ${index + 1}`}>
                                                <div className="font-medium">{comment.content}</div>
                                                <div className="text-xs text-slate-500">
                                                    Label {comment.predictedLabel} - {comment.labelName} - confidence {Number(comment.confidence || 0).toFixed(2)}
                                                </div>
                                            </Descriptions.Item>
                                        ))}
                                    </Descriptions>
                                ),
                            }}
                        />
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <h2 className="mb-4 text-xl font-bold text-slate-900">Yêu cầu gỡ ban</h2>
                        <Table
                            rowKey="_id"
                            columns={requestColumns}
                            dataSource={requests}
                            locale={{ emptyText: <Empty description="Chưa có yêu cầu gỡ ban" /> }}
                        />
                    </div>
                </Spin>
            </div>
        </div>
    );
};

export default LiveChatModerationPage;
