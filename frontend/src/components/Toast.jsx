import { createContext, useCallback, useContext, useEffect, useState } from "react";

const ToastContext = createContext(null);

let nextId = 1;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const show = useCallback(
    (message, { type = "success", duration = 3500 } = {}) => {
      const id = nextId++;
      setToasts((t) => [...t, { id, message, type }]);
      if (duration > 0) setTimeout(() => dismiss(id), duration);
      return id;
    },
    [dismiss],
  );

  const value = {
    success: (msg, opts) => show(msg, { ...opts, type: "success" }),
    error: (msg, opts) => show(msg, { ...opts, type: "error" }),
    info: (msg, opts) => show(msg, { ...opts, type: "info" }),
    dismiss,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed top-4 right-4 z-[60] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onDismiss }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const r = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(r);
  }, []);

  const palette =
    toast.type === "error"
      ? "bg-red-50 text-red-800 border-red-200"
      : toast.type === "info"
      ? "bg-slate-50 text-slate-800 border-slate-200"
      : "bg-emerald-50 text-emerald-800 border-emerald-200";

  const icon = toast.type === "error" ? "✕" : toast.type === "info" ? "ℹ" : "✓";

  return (
    <div
      className={`pointer-events-auto min-w-[260px] max-w-sm rounded-lg border shadow-lg px-4 py-3 text-sm flex items-start gap-3 transition-all duration-200 ${palette} ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
      }`}
      role="status"
    >
      <span className="font-bold leading-5">{icon}</span>
      <span className="flex-1 leading-5">{toast.message}</span>
      <button
        onClick={onDismiss}
        className="text-current opacity-60 hover:opacity-100 leading-5"
        aria-label="Dismiss"
      >
        &times;
      </button>
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}
