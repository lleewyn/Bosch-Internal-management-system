// Global Toast Notification System
document.addEventListener('DOMContentLoaded', () => {
    // Setup toast container if it doesn't exist
    let toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container';
        document.body.appendChild(toastContainer);
    }
});

/**
 * Hiển thị thông báo Toast
 * @param {string} title Tiêu đề thông báo
 * @param {string} message Nội dung thông báo
 * @param {string} type 'success' hoặc 'error'
 */
window.showToast = function(title, message, type = 'success') {
    const toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) return;

    const toast = document.createElement('div');
    toast.className = `bosch-toast ${type}`;

    const icons = {
        success: '<i class="fa-solid fa-circle-check"></i>',
        error: '<i class="fa-solid fa-circle-exclamation"></i>',
        info: '<i class="fa-solid fa-circle-info"></i>'
    };
    const icon = icons[type] || icons.success;

    toast.innerHTML = `
        <div class="toast-icon">${icon}</div>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            <div class="toast-message">${message}</div>
        </div>
        <div class="toast-close"><i class="fa-solid fa-xmark"></i></div>
    `;

    toastContainer.appendChild(toast);

    // Trigger animation
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);

    const closeToast = () => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    };

    // Close button
    toast.querySelector('.toast-close').addEventListener('click', closeToast);

    // Auto close
    setTimeout(closeToast, 4000);
};

/**
 * Validate form elements
 * Lấy tất cả các label có class .required-asterisk, 
 * sau đó tìm input/select gần nhất hoặc anh em của nó để kiểm tra giá trị
 * @param {HTMLElement} modalElement Thẻ chứa form (modal body)
 * @returns {boolean} true nếu hợp lệ, false nếu thiếu trường
 */
window.validateForm = function(modalElement) {
    const requiredLabels = modalElement.querySelectorAll('label:has(.required-asterisk)');
    let isValid = true;
    
    // Fallback if :has is not perfectly supported (though it is in modern browsers)
    const labels = requiredLabels.length > 0 ? requiredLabels : 
        Array.from(modalElement.querySelectorAll('.required-asterisk')).map(span => span.closest('label'));

    labels.forEach(label => {
        if (!label) return;

        const group = label.closest('.form-group') || label.parentElement;
        const input = group.querySelector(
            'input:not([type="radio"]):not([type="checkbox"]):not([type="hidden"]), select, textarea'
        );

        if (!input) return;

        input.style.borderColor = '';
        const empty = !input.value || String(input.value).trim() === '';
        const placeholderOption =
            input.tagName === 'SELECT' &&
            (!input.value || input.value.includes('--') || input.selectedIndex === 0 && input.options[0]?.value === '');

        if (empty || placeholderOption) {
            input.style.borderColor = '#E20015';
            isValid = false;
        }
    });

    if (!isValid) {
        showToast('Lỗi nhập liệu', 'Vui lòng điền đầy đủ các thông tin bắt buộc (*)', 'error');
    }

    return isValid;
};
