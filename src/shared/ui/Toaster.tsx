import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useI18n } from '@/shared/i18n/I18nProvider';
import { Button } from './Button';
import { Icon } from './Icon';
import styles from './Toaster.module.css';

interface Toast {
  id: number;
  tone: 'success' | 'error';
  message: string;
}

type Notify = (tone: Toast['tone'], message: string) => void;
const ToastContext = createContext<Notify | null>(null);

/** Feedback for management actions, announced through a polite live region. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);
  const { t } = useI18n();

  const dismiss = useCallback(
    (id: number) => setToasts((list) => list.filter((x) => x.id !== id)),
    [],
  );
  const notify = useCallback<Notify>(
    (tone, message) => {
      const id = nextId.current++;
      setToasts((list) => [...list.slice(-2), { id, tone, message }]);
      window.setTimeout(() => dismiss(id), tone === 'error' ? 8000 : 5000);
    },
    [dismiss],
  );

  const value = useMemo(() => notify, [notify]);
  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className={styles.region} role="status" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={`${styles.toast} ${styles[toast.tone]}`}>
            <span className={styles.icon}>
              <Icon name={toast.tone === 'success' ? 'check' : 'alert'} />
            </span>
            <span className={styles.message}>{toast.message}</span>
            <Button variant="ghost" size="sm" onClick={() => dismiss(toast.id)}>
              <span className="visually-hidden">{t('common.close')}</span>
              <Icon name="close" size={14} />
            </Button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): Notify {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
