import { JSX } from 'react';
import { LuX, LuCircleCheck, LuCircleAlert, LuInfo } from 'react-icons/lu';
import { useToast } from 'components/toast_container/context';
import { ToastType } from 'types/electron';

const icons: Record<ToastType, JSX.Element> = {
    success: <LuCircleCheck size={15} />,
    error: <LuCircleAlert size={15} />,
    info: <LuInfo size={15} />,
};

export const ToastContainer = () => {
    const { toasts, removeToast } = useToast();

    if (!toasts.length) return null;

    return (
        <div className="toast-stack">
            {toasts.map(toast => (
                <div key={toast.id} className={`toast-item toast-${toast.type}`}>
                    <span className="toast-icon">{icons[toast.type] ?? icons.info}</span>
                    <span className="toast-message">{toast.message}</span>
                    <button className="toast-close" onClick={() => removeToast(toast.id)}>
                        <LuX size={13} />
                    </button>
                </div>
            ))}
        </div>
    );
};