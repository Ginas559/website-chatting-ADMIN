import { useState } from 'react';
import { ScanOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import DeliveryQrScanner from '../components/order/DeliveryQrScanner';
import { verifyDeliveryQrApi } from '../util/api';

const RESULT_STYLES = {
    VERIFIED: {
        shell: 'border-emerald-200 bg-emerald-50',
        badge: 'bg-emerald-600 text-white',
        title: 'Kiện hàng hợp lệ',
        icon: '✓',
    },
    REVIEW: {
        shell: 'border-amber-200 bg-amber-50',
        badge: 'bg-amber-500 text-white',
        title: 'Trạng thái cần lưu ý',
        icon: '!',
    },
    REJECTED: {
        shell: 'border-rose-200 bg-rose-50',
        badge: 'bg-rose-600 text-white',
        title: 'Không thể xác minh kiện hàng',
        icon: '×',
    },
};

const REVIEW_ERROR_CODES = new Set([
    'DELIVERY_ORDER_STATUS_MISMATCH',
]);

const formatVnd = (value) => Number(value || 0).toLocaleString('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
});

const getErrorMessage = (error) => {
    return error?.errMessage || error?.message || 'Không thể xác minh QR. Vui lòng thử lại.';
};

const getRejectedResult = (error) => ({
    verificationLevel: REVIEW_ERROR_CODES.has(error?.errorCode) ? 'REVIEW' : 'REJECTED',
    message: getErrorMessage(error),
    errorCode: error?.errorCode || '',
    order: null,
    notice: REVIEW_ERROR_CODES.has(error?.errorCode)
        ? 'Không nên nhận hoặc thanh toán kiện hàng cho đến khi đã liên hệ SmartZone để kiểm tra.'
        : 'QR có thể không do SmartZone phát hành, đã bị thay đổi hoặc không thuộc tài khoản này. Không nên thanh toán hay nhận kiện.',
});

const DeliveryVerificationPage = () => {
    const [verifying, setVerifying] = useState(false);
    const [result, setResult] = useState(null);

    const verifyQr = async (qrContent) => {
        if (verifying) return;

        setVerifying(true);
        setResult(null);

        try {
            const response = await verifyDeliveryQrApi(qrContent);
            if (response?.errCode !== 0 || !response?.data) {
                throw response;
            }

            setResult(response.data);
            window.navigator.vibrate?.(120);
        } catch (error) {
            setResult(getRejectedResult(error));
            window.navigator.vibrate?.([100, 80, 100]);
        } finally {
            setVerifying(false);
        }
    };

    const resetScanner = () => {
        setResult(null);
    };

    const order = result?.order;
    const baseTone = RESULT_STYLES[result?.verificationLevel] || RESULT_STYLES.REJECTED;
    const tone = order?.status === 'DELIVERED'
        ? {
            ...RESULT_STYLES.VERIFIED,
            title: 'QR hợp lệ · Đơn đã giao',
        }
        : baseTone;

    return (
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,#fff7ed_0%,#f8fafc_45%,#eef2ff_100%)] text-slate-900">
            <header className="border-b border-orange-100 bg-white/90 backdrop-blur">
                <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
                    <Link to="/" className="flex items-center gap-3 text-left">
                        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 text-xl font-black text-white">S</span>
                        <div>
                            <div className="font-black">SmartZone Store</div>
                            <div className="text-xs font-bold uppercase tracking-[0.18em] text-orange-600">Delivery Verify</div>
                        </div>
                    </Link>
                    <div className="flex gap-2">
                        <Link to="/orders" className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:border-orange-400">
                            Đơn hàng
                        </Link>
                        <Link to="/" className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-700">
                            Trang chủ
                        </Link>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
                <div className="mb-7 text-left">
                    <p className="text-sm font-black uppercase tracking-[0.24em] text-orange-500">Kiểm tra trước khi nhận</p>
                    <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Quét QR kiểm tra kiện hàng</h1>
                    <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
                        Quét QR trên kiện hàng để kiểm tra mã có do SmartZone phát hành và có khớp với đơn của tài khoản bạn hay không.
                    </p>
                </div>

                <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
                    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/50 sm:p-6">
                        <div className="mb-5 text-left">
                            <div className="text-lg font-black text-slate-950">Web scanner</div>
                            <p className="mt-1 text-sm leading-6 text-slate-500">
                                Camera hoạt động trên localhost hoặc HTTPS. Bạn cũng có thể chọn ảnh QR để demo trên một thiết bị.
                            </p>
                        </div>

                        {!result ? (
                            <DeliveryQrScanner disabled={verifying} onDetected={verifyQr} />
                        ) : (
                            <div className="grid min-h-80 place-items-center rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
                                <div>
                                    <div className={`mx-auto grid h-20 w-20 place-items-center rounded-full text-4xl font-black ${tone.badge}`}>{tone.icon}</div>
                                    <div className="mt-4 text-xl font-black text-slate-900">Đã đọc QR</div>
                                    <p className="mt-2 text-sm leading-6 text-slate-500">Xem kết quả đối chiếu ở bên cạnh hoặc quét một kiện khác.</p>
                                    <button type="button" onClick={resetScanner} className="mt-5 h-11 rounded-xl bg-slate-900 px-5 text-sm font-bold text-white hover:bg-slate-700">
                                        Quét mã khác
                                    </button>
                                </div>
                            </div>
                        )}

                        {verifying ? (
                            <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-700">
                                Đã đọc QR, đang xác minh với SmartZone...
                            </div>
                        ) : null}
                    </section>

                    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/50 sm:p-6">
                        {!result ? (
                            <div className="grid min-h-[460px] place-items-center rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                                <div className="max-w-md">
                                    <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-orange-100 text-3xl text-orange-700">
                                        <ScanOutlined />
                                    </div>
                                    <h2 className="mt-4 text-2xl font-black text-slate-900">Kết quả sẽ hiện tại đây</h2>
                                    <p className="mt-3 text-sm leading-7 text-slate-600">
                                        Hệ thống kiểm tra chữ ký token, chủ sở hữu đơn và trạng thái giao hàng trước khi hiển thị sản phẩm.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-5 text-left">
                                <div className={`rounded-3xl border p-5 ${tone.shell}`}>
                                    <div className="flex items-start gap-4">
                                        <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-full text-2xl font-black ${tone.badge}`}>{tone.icon}</div>
                                        <div>
                                            <h2 className="text-2xl font-black text-slate-950">{tone.title}</h2>
                                            <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">{result.message}</p>
                                        </div>
                                    </div>
                                </div>

                                {order ? (
                                    <>
                                        <div className="rounded-2xl border border-slate-200 p-4">
                                            <div className="flex flex-wrap items-center justify-between gap-3">
                                                <div>
                                                    <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Đơn hàng khớp</div>
                                                    <div className="mt-1 text-lg font-black text-slate-900">#{order.orderCode}</div>
                                                </div>
                                                <div className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700">
                                                    {order.status === 'SHIPPING' ? 'Đang giao hàng' : 'Đã giao'}
                                                </div>
                                            </div>
                                            <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 text-sm sm:grid-cols-2">
                                                <div>
                                                    <span className="text-slate-500">Người nhận: </span>
                                                    <span className="font-bold">{order.shippingInfo?.fullName || '-'}</span>
                                                </div>
                                                <div>
                                                    <span className="text-slate-500">Điện thoại: </span>
                                                    <span className="font-bold">{order.shippingInfo?.maskedPhone || '-'}</span>
                                                </div>
                                                <div>
                                                    <span className="text-slate-500">Khu vực: </span>
                                                    <span className="font-bold">{order.shippingInfo?.city || '-'}</span>
                                                </div>
                                                <div>
                                                    <span className="text-slate-500">Thanh toán: </span>
                                                    <span className="font-bold">{order.paymentMethod}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="rounded-2xl border border-slate-200 p-4">
                                            <div className="mb-3 flex items-center justify-between gap-3">
                                                <div className="font-black text-slate-900">Sản phẩm trong đơn</div>
                                                <div className="text-sm font-black text-orange-600">{formatVnd(order.totalAmount)}</div>
                                            </div>
                                            <div className="divide-y divide-slate-100">
                                                {(order.items || []).map((item) => (
                                                    <div key={`${order.orderCode}-${item.product}`} className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 py-3 first:pt-0 last:pb-0 sm:grid-cols-[auto_minmax(0,1fr)_auto]">
                                                        <img src={item.snapshot?.image} alt={item.snapshot?.name} className="h-14 w-14 shrink-0 rounded-xl border border-slate-100 object-contain" />
                                                        <div className="min-w-0 flex-1">
                                                            <div className="break-words text-sm font-bold leading-6 text-slate-900">{item.snapshot?.name}</div>
                                                            <div className="mt-1 text-xs text-slate-500">{item.snapshot?.brand} · Số lượng: {item.quantity}</div>
                                                        </div>
                                                        <div className="col-start-2 text-sm font-bold text-slate-700 sm:col-start-auto sm:whitespace-nowrap sm:text-right">{formatVnd(item.lineTotal)}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                ) : null}

                                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
                                    <div className="font-black">Lưu ý an toàn</div>
                                    <p className="mt-1">{result.notice}</p>
                                </div>
                            </div>
                        )}
                    </section>
                </div>
            </main>
        </div>
    );
};

export default DeliveryVerificationPage;
