import { ExclamationCircleOutlined } from '@ant-design/icons';

const TONES = {
    warning: {
        icon: 'bg-amber-100 text-amber-700',
        button: 'bg-amber-500 hover:bg-amber-600',
    },
    danger: {
        icon: 'bg-rose-100 text-rose-700',
        button: 'bg-rose-600 hover:bg-rose-700',
    },
    primary: {
        icon: 'bg-blue-100 text-blue-700',
        button: 'bg-blue-700 hover:bg-blue-800',
    },
};

const ConfirmDialog = ({
    open,
    title,
    message,
    confirmLabel = 'Xác nhận',
    cancelLabel = 'Hủy',
    tone = 'warning',
    loading = false,
    onConfirm,
    onCancel,
}) => {
    if (!open) return null;

    const styles = TONES[tone] || TONES.warning;

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
            <div role="alertdialog" aria-modal="true" aria-labelledby="confirm-dialog-title" aria-describedby="confirm-dialog-message" className="w-full max-w-md rounded-3xl border border-white/20 bg-white p-6 text-left shadow-2xl">
                <div className="flex items-start gap-4">
                    <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-xl ${styles.icon}`}>
                        <ExclamationCircleOutlined />
                    </div>
                    <div className="min-w-0">
                        <h2 id="confirm-dialog-title" className="text-xl font-black text-slate-950">{title}</h2>
                        <p id="confirm-dialog-message" className="mt-2 text-sm leading-6 text-slate-600">{message}</p>
                    </div>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    <button type="button" onClick={onCancel} disabled={loading} className="h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50">
                        {cancelLabel}
                    </button>
                    <button type="button" onClick={onConfirm} disabled={loading} className={`h-11 rounded-xl px-4 text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${styles.button}`}>
                        {loading ? 'Đang xử lý...' : confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmDialog;
