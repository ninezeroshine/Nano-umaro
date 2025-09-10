import React from 'react';

export type Toast = { 
  id: string; 
  kind: 'success' | 'error' | 'info'; 
  text: string;
  suggestions?: string[];
  retryable?: boolean;
};

export function useToasts() {
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const push = (t: Omit<Toast, 'id'>) => setToasts(s => [...s, { ...t, id: Math.random().toString(36).slice(2) }]);
  const remove = (id: string) => setToasts(s => s.filter(x => x.id !== id));
  return { toasts, push, remove };
}

export function ToastContainer({ toasts, remove }: { toasts: Toast[]; remove: (id: string) => void }) {
  React.useEffect(() => {
    const timers = toasts.map(t => setTimeout(() => remove(t.id), t.suggestions ? 8000 : 3500));
    return () => { timers.forEach(clearTimeout); };
  }, [toasts]);
  return (
    <div className="toasts">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.kind} ${t.suggestions ? 'toast-detailed' : ''}`} onClick={() => remove(t.id)}>
          <div className="toast-text">{t.text}</div>
          {t.suggestions && t.suggestions.length > 0 && (
            <div className="toast-suggestions">
              <strong>Что попробовать:</strong>
              <ul>
                {t.suggestions.map((suggestion, i) => (
                  <li key={i}>{suggestion}</li>
                ))}
              </ul>
            </div>
          )}
          {t.retryable && (
            <div className="toast-retry-hint">💡 Можно повторить попытку</div>
          )}
        </div>
      ))}
    </div>
  );
}


