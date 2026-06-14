import { useEffect, useId, useRef, useState } from 'react';
import { CameraOutlined, FileImageOutlined, ScanOutlined } from '@ant-design/icons';
import { Html5Qrcode } from 'html5-qrcode';

const CAMERA_CONFIG = {
    fps: 10,
    qrbox: (viewfinderWidth, viewfinderHeight) => {
        const edge = Math.floor(Math.min(viewfinderWidth, viewfinderHeight) * 0.72);
        return { width: edge, height: edge };
    },
    aspectRatio: 4 / 3,
};

const canvasToFile = (canvas, name) => {
    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (!blob) {
                reject(new Error('Cannot process image'));
                return;
            }

            resolve(new File([blob], name, { type: 'image/png' }));
        }, 'image/png');
    });
};

const createEnhancedQrFiles = async (file) => {
    const bitmap = await createImageBitmap(file);
    const minEdge = Math.min(bitmap.width, bitmap.height);
    const scale = Math.min(4, Math.max(1.5, 1400 / Math.max(1, minEdge)));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);

    const context = canvas.getContext('2d', { willReadFrequently: true });
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.imageSmoothingEnabled = false;
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    const enlargedFile = await canvasToFile(canvas, 'qr-enlarged.png');
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

    for (let index = 0; index < imageData.data.length; index += 4) {
        const luminance = (
            imageData.data[index] * 0.299
            + imageData.data[index + 1] * 0.587
            + imageData.data[index + 2] * 0.114
        );
        const value = luminance < 165 ? 0 : 255;

        imageData.data[index] = value;
        imageData.data[index + 1] = value;
        imageData.data[index + 2] = value;
        imageData.data[index + 3] = 255;
    }

    context.putImageData(imageData, 0, 0);
    const highContrastFile = await canvasToFile(canvas, 'qr-high-contrast.png');

    return [enlargedFile, highContrastFile];
};

const DeliveryQrScanner = ({ disabled, onDetected }) => {
    const reactId = useId();
    const readerId = `delivery-qr-reader-${reactId.replace(/:/g, '')}`;
    const scannerRef = useRef(null);
    const detectionLockedRef = useRef(false);
    const [cameraActive, setCameraActive] = useState(false);
    const [cameraLoading, setCameraLoading] = useState(false);
    const [imageLoading, setImageLoading] = useState(false);
    const [scannerError, setScannerError] = useState('');

    const stopCamera = async () => {
        const scanner = scannerRef.current;
        if (!scanner) return;

        try {
            if (scanner.isScanning) {
                await scanner.stop();
            }
        } catch {
            // The camera may already have been released by the browser.
        } finally {
            setCameraActive(false);
        }
    };

    const deliverResult = async (decodedText) => {
        if (detectionLockedRef.current || disabled) return;

        detectionLockedRef.current = true;
        await stopCamera();
        onDetected(decodedText);
    };

    const startCamera = async () => {
        if (disabled || cameraLoading) return;

        setCameraLoading(true);
        setScannerError('');
        detectionLockedRef.current = false;

        try {
            if (!scannerRef.current) {
                scannerRef.current = new Html5Qrcode(readerId);
            }

            await scannerRef.current.start(
                { facingMode: 'environment' },
                CAMERA_CONFIG,
                (decodedText) => {
                    void deliverResult(decodedText);
                },
                () => {}
            );
            setCameraActive(true);
        } catch (error) {
            const message = String(error?.message || error || '');
            const isPermissionError = /permission|notallowed|denied/i.test(message);

            setScannerError(
                isPermissionError
                    ? 'Trình duyệt chưa được cấp quyền camera. Hãy cấp quyền hoặc chọn ảnh QR từ thiết bị.'
                    : 'Không thể mở camera. Hãy kiểm tra camera, HTTPS hoặc dùng chức năng chọn ảnh QR.'
            );
        } finally {
            setCameraLoading(false);
        }
    };

    const scanImage = async (event) => {
        const file = event.target.files?.[0];
        event.target.value = '';

        if (!file || disabled) return;

        setScannerError('');
        detectionLockedRef.current = false;
        setImageLoading(true);

        try {
            await stopCamera();

            if (!scannerRef.current) {
                scannerRef.current = new Html5Qrcode(readerId);
            }

            const candidates = [file, ...await createEnhancedQrFiles(file)];
            let decodedText = '';

            for (const candidate of candidates) {
                try {
                    decodedText = await scannerRef.current.scanFile(candidate, true);
                    break;
                } catch {
                    // Try the next enhanced image variant.
                }
            }

            if (!decodedText) {
                throw new Error('QR not found');
            }

            await deliverResult(decodedText);
        } catch {
            setScannerError('Không đọc được QR trong ảnh. Hãy kiểm tra định dạng, độ rõ của ảnh hoặc tải lại QR gốc.');
        } finally {
            setImageLoading(false);
        }
    };

    useEffect(() => {
        return () => {
            const scanner = scannerRef.current;
            if (!scanner) return;

            if (scanner.isScanning) {
                void scanner.stop().catch(() => {});
            }
        };
    }, []);

    return (
        <div className="space-y-4">
            <div className="relative overflow-hidden rounded-3xl border border-slate-700 bg-slate-950 p-3 shadow-2xl shadow-slate-900/20">
                <div id={readerId} className="min-h-[380px] overflow-hidden rounded-2xl bg-slate-900 sm:min-h-[440px]" />
                {!cameraActive ? (
                    <div className="pointer-events-none absolute inset-3 grid place-items-center rounded-2xl bg-[radial-gradient(circle_at_center,#1e293b_0%,#020617_72%)]">
                        <div className="text-center text-white">
                            <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-white/20 bg-white/10 text-3xl">
                                <ScanOutlined />
                            </div>
                            <div className="mt-4 font-bold">Camera chưa được mở</div>
                            <div className="mt-1 text-sm text-slate-400">Đưa QR trên kiện hàng vào giữa khung hình</div>
                        </div>
                    </div>
                ) : null}
            </div>

            {scannerError ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold leading-6 text-rose-700">
                    {scannerError}
                </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
                <button type="button" onClick={cameraActive ? stopCamera : startCamera} disabled={disabled || cameraLoading} className="h-12 rounded-xl bg-slate-900 px-4 text-sm font-bold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50">
                    <CameraOutlined className="mr-2" />
                    {cameraLoading ? 'Đang mở camera...' : cameraActive ? 'Tắt camera' : 'Mở camera quét QR'}
                </button>
                <label className={`inline-flex h-12 cursor-pointer items-center justify-center rounded-xl border border-orange-300 bg-white px-4 text-sm font-bold text-orange-700 transition hover:bg-orange-50 ${(disabled || imageLoading) ? 'pointer-events-none opacity-50' : ''}`}>
                    <FileImageOutlined className="mr-2" />
                    {imageLoading ? 'Đang xử lý ảnh...' : 'Chọn ảnh QR'}
                    <input type="file" accept="image/*" onChange={scanImage} disabled={disabled || imageLoading} className="sr-only" />
                </label>
            </div>
        </div>
    );
};

export default DeliveryQrScanner;
