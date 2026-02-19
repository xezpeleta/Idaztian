// ── Global toast notification system ───────────────────────────────────────

export function showToast(message: string, isError: boolean = false) {
    if (typeof document === 'undefined') return;

    // Inject styles
    if (!document.getElementById('idz-toast-styles')) {
        const style = document.createElement('style');
        style.id = 'idz-toast-styles';
        style.textContent = `
            .idz-toast {
                position: fixed;
                bottom: 1.5rem;
                right: 1.5rem;
                z-index: 9999;
                background: #2b2b2b;
                color: #dcddde;
                border: 1px solid rgba(255,255,255,0.1);
                border-radius: 8px;
                padding: 0.6em 1.1em;
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                font-size: 0.875rem;
                box-shadow: 0 4px 20px rgba(0,0,0,0.5);
                pointer-events: none;
                opacity: 0;
                transform: translateY(0.5rem);
                transition: opacity 0.2s ease, transform 0.2s ease;
            }
            .idz-toast--visible {
                opacity: 1;
                transform: translateY(0);
            }
            .idz-toast--error {
                border-color: rgba(235, 87, 87, 0.4);
                background: #332121;
                color: #ffb4b4;
            }
        `;
        document.head.appendChild(style);
    }

    const w = window as any;
    if (w.__idzActiveToast) {
        w.__idzActiveToast.remove();
        w.__idzActiveToast = null;
    }
    if (w.__idzToastTimeout) {
        clearTimeout(w.__idzToastTimeout);
        w.__idzToastTimeout = null;
    }

    const toast = document.createElement('div');
    toast.className = 'idz-toast';
    if (isError) {
        toast.classList.add('idz-toast--error');
    }
    toast.textContent = message;
    document.body.appendChild(toast);
    w.__idzActiveToast = toast;

    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            toast.classList.add('idz-toast--visible');
        });
    });

    w.__idzToastTimeout = setTimeout(() => {
        if (!toast.classList.contains('idz-toast--visible')) return;
        toast.classList.remove('idz-toast--visible');
        toast.addEventListener('transitionend', () => toast.remove(), { once: true });
        if (w.__idzActiveToast === toast) {
            w.__idzActiveToast = null;
        }
    }, isError ? 4000 : 2500);
}
