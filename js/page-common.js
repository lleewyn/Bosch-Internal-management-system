/** Tiện ích dùng chung cho các trang quản lý */
window.PageCommon = {
    injectFormStyles() {
        if (document.getElementById('page-common-form-style')) return;
        const s = document.createElement('style');
        s.id = 'page-common-form-style';
        s.textContent = `
            .hr-form-input, .hr-form-select {
                width: 100%; padding: 10px 12px; border: 1px solid #d1d5db;
                border-radius: 6px; font-size: 13px; font-family: inherit;
                background: #fff; box-sizing: border-box;
            }
            .hr-form-select { cursor: pointer; }
            tr.selected-row, tr.selected { background-color: #f3f2f1 !important; }
            .op-badge-selection {
                display: none; background: #f0f7ff; color: #0078d4;
                padding: 8px 16px; border-radius: 4px; border: 1px solid #b3d7ff;
                font-weight: 700; font-size: 13px;
            }
            .op-badge-selection.visible { display: block; }
            /* Tooltip khi hover vào element bị ẩn quyền */
            [data-perm-readonly="1"] { pointer-events: none !important; }
        `;
        document.head.appendChild(s);
    },

    /**
     * Gọi sau khi trang render xong để re-apply permission
     * cho các element được tạo động bởi JS
     */
    applyDynamicPermissions() {
        if (window.AppRouter) {
            window.AppRouter.applyPagePermissions?.();
        }
    },

    bindTabs(tabSelector, viewMap, onChange) {
        document.querySelectorAll(tabSelector).forEach((tab) => {
            tab.addEventListener('click', () => {
                document.querySelectorAll(tabSelector).forEach((t) => t.classList.remove('active'));
                tab.classList.add('active');
                const key = tab.dataset.tab;
                Object.entries(viewMap).forEach(([k, el]) => {
                    if (el) el.style.display = k === key ? (el.dataset.display || 'flex') : 'none';
                });
                if (onChange) onChange(key);
            });
        });
    },

    showSelectionBadge(viewEl, text) {
        const badge = viewEl?.querySelector('.op-badge-selection, .op-box-actions > div:first-child');
        if (!badge) return;
        if (text) {
            badge.classList.add('visible');
            badge.style.display = 'block';
            badge.textContent = text;
        } else {
            badge.classList.remove('visible');
            badge.style.display = 'none';
        }
    },

    bindRowSelect(tbody, onSelect) {
        tbody.querySelectorAll('tr').forEach((tr) => {
            tr.addEventListener('click', () => {
                tbody.querySelectorAll('tr').forEach((r) => r.classList.remove('selected-row'));
                tr.classList.add('selected-row');
                if (onSelect) onSelect(tr.dataset.id, tr);
            });
        });
    },

    filterTableRows(container, term) {
        const t = (term || '').toLowerCase();
        container.querySelectorAll('tbody tr').forEach((tr) => {
            tr.style.display = !t || tr.textContent.toLowerCase().includes(t) ? '' : 'none';
        });
    }
};
