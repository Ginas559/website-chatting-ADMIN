import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

const formatDateTime = (value) => {
    if (!value) return '-';
    return new Date(value).toLocaleString('vi-VN');
};

const DeliveryQrModal = ({ data, loading, onClose }) => {
    const [qrImage, setQrImage] = useState('');
    const [renderError, setRenderError] = useState('');

    useEffect(() => {
        let isMounted = true;

        const renderQr = async () => {
            setQrImage('');
            setRenderError('');

            if (!data?.qrContent) return;

            try {
                const image = await QRCode.toDataURL(data.qrContent, {
                    width: 640,
                    margin: 4,
                    errorCorrectionLevel: 'H',
                    color: {
                        dark: '#000000',
                        light: '#ffffff',
                    },
                });

                if (isMounted) {
                    setQrImage(image);
                }
            } catch {
                if (isMounted) {
                    setRenderError('Không thể tạo hình QR. Vui lòng cấp lại mã.');
                }
            }
        };

        void renderQr();

        return () => {
            isMounted = false;
        };
    }, [data?.qrContent]);

    if (!data) return null;

    const downloadQr = () => {
        if (!qrImage) return;

        const link = document.createElement('a');
        link.href = qrImage;
        link.download = `smartzone-delivery-${data.orderCode}.png`;
        link.click();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm">
            <div role="dialog" aria-modal="true" aria-labelledby="delivery-qr-title" className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-white/20 bg-white shadow-2xl">
                <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.24em] text-orange-500">SmartZone Delivery</p>
                        <h2 id="delivery-qr-title" className="mt-1 text-2xl font-black text-slate-900">QR kiểm tra kiện hàng</h2>
                        <p className="mt-1 text-sm text-slate-500">Đơn hàng #{data.orderCode}</p>
                    </div>
                    <button type="button" onClick={onClose} disabled={loading} aria-label="Đóng" className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-slate-200 text-xl text-slate-500 transition hover:bg-slate-100 disabled:opacity-50">
                        ×
                    </button>
                </div>

                <div className="space-y-5 p-6">
                    <div className="rounded-3xl bg-[radial-gradient(circle_at_top,#fff7ed,#ffffff_68%)] p-5 text-center ring-1 ring-orange-100">
                        {renderError ? (
                            <div className="rounded-2xl bg-rose-50 px-4 py-8 text-sm font-semibold text-rose-700">{renderError}</div>
                        ) : qrImage ? (
                            <img src={qrImage} alt={`QR kiểm tra kiện hàng ${data.orderCode}`} className="mx-auto w-full max-w-[360px] rounded-2xl bg-white p-2 shadow-lg shadow-orange-100" />
                        ) : (
                            <div className="grid min-h-72 place-items-center text-sm font-semibold text-slate-500">Đang tạo hình QR...</div>
                        )}
                        <div className="mt-4 inline-flex rounded-full bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700">
                            Chỉ dùng cho đơn #{data.orderCode}
                        </div>
                    </div>

                    <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm sm:grid-cols-2">
                        <div>
                            <div className="font-medium text-slate-500">Ngày cấp</div>
                            <div className="mt-1 font-bold text-slate-800">{formatDateTime(data.generatedAt)}</div>
                        </div>
                        <div>
                            <div className="font-medium text-slate-500">Hết hạn</div>
                            <div className="mt-1 font-bold text-slate-800">{formatDateTime(data.expiresAt)}</div>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                        <div className="font-bold">Phạm vi xác minh</div>
                        <p className="mt-1">{data.notice}</p>
                    </div>

                    <div>
                        <button type="button" onClick={downloadQr} disabled={!qrImage || loading} className="h-12 w-full rounded-xl bg-slate-900 px-4 text-sm font-bold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50">
                            Tải QR xuống
                        </button>
                    </div>

                    <p className="text-center text-xs leading-5 text-slate-500">
                        QR này gắn cố định với kiện hàng và có thể xem hoặc tải lại sau khi khởi động lại hệ thống.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default DeliveryQrModal;
