// utils.js

// --- Dark Mode Logic ---
const THEME_KEY = 'app_theme';

function initTheme() {
    const savedTheme = localStorage.getItem(THEME_KEY);
    if (savedTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
    } else {
        document.documentElement.removeAttribute('data-theme');
    }
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    if (currentTheme === 'dark') {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem(THEME_KEY, 'light');
    } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem(THEME_KEY, 'dark');
    }
    updateToggleBtnText();
}

function updateToggleBtnText() {
    const btn = document.getElementById('themeToggleBtn');
    if (btn) {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        btn.textContent = isDark ? '☀️ Light Mode' : '🌙 Dark Mode';
    }
}

// --- Toast Notification Logic ---
function showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    // Add icon based on type
    let icon = '';
    switch (type) {
        case 'success': icon = '✅'; break;
        case 'error': icon = '❌'; break;
        case 'warning': icon = '⚠️'; break;
        default: icon = 'ℹ️';
    }

    toast.innerHTML = `
        <div style="display:flex; align-items:center; gap:10px;">
            <span style="font-size:1.2em;">${icon}</span>
            <span>${message}</span>
        </div>
    `;

    container.appendChild(toast);

    // Auto remove after 3 seconds
    setTimeout(() => {
        toast.classList.add('hide');
        toast.addEventListener('animationend', () => {
            toast.remove();
        });
    }, 3000);
}

// Initialize on load
// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    initTheme();

    // Inject Toggle Button into Navbar if it exists and button doesn't
    const navbar = document.querySelector('.navbar div'); // Usually where logout is
    if (navbar) {
        // Theme Toggle
        if (!document.getElementById('themeToggleBtn')) {
            const btn = document.createElement('button');
            btn.id = 'themeToggleBtn';
            btn.className = 'theme-toggle-btn';
            btn.onclick = toggleTheme;
            navbar.insertBefore(btn, navbar.firstChild);
            updateToggleBtnText();
        }

        // Notification Bell
        if (!document.getElementById('notificationBell') && localStorage.getItem('token')) {
            const bellContainer = document.createElement('div');
            bellContainer.style.display = 'inline-block';
            bellContainer.style.position = 'relative';

            bellContainer.innerHTML = `
                <button id="notificationBell" class="notification-bell">
                    🔔 <span id="notificationBadge" class="notification-badge">0</span>
                </button>
                <div id="notificationDropdown" class="notification-dropdown">
                    <div class="notification-header">
                        <span>Notifications</span>
                        <button onclick="markAllRead()" style="background:none; border:none; color:var(--primary-color); cursor:pointer; font-size:0.8em;">Mark all read</button>
                    </div>
                    <div id="notificationList"></div>
                </div>
             `;

            navbar.insertBefore(bellContainer, document.getElementById('themeToggleBtn')); // Insert before theme toggle

            // Event Listeners
            document.getElementById('notificationBell').addEventListener('click', (e) => {
                e.stopPropagation();
                document.getElementById('notificationDropdown').classList.toggle('active');
            });

            // Close dropdown when clicking outside
            document.addEventListener('click', (e) => {
                if (!bellContainer.contains(e.target)) {
                    document.getElementById('notificationDropdown').classList.remove('active');
                }
            });

            // Initial Fetch
            fetchNotifications();
            // Poll every 60s
            setInterval(fetchNotifications, 60000);
        }
    }
});

// --- Notification Center Logic ---
async function fetchNotifications() {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
        const res = await fetch('http://localhost:5001/api/notifications', {
            headers: { "Authorization": "Bearer " + token }
        });
        if (res.ok) {
            const data = await res.json();
            renderNotifications(data);
        }
    } catch (err) { console.error("Notif fetch error", err); }
}

function renderNotifications(notifications) {
    const list = document.getElementById('notificationList');
    if (!list) return;

    const unreadCount = notifications.filter(n => !n.isRead).length;
    const badge = document.getElementById('notificationBadge');
    if (unreadCount > 0) {
        badge.style.display = 'block';
        badge.textContent = unreadCount;
    } else {
        badge.style.display = 'none';
    }

    if (notifications.length === 0) {
        list.innerHTML = '<div class="notification-empty">No notifications</div>';
        return;
    }

    list.innerHTML = notifications.map(n => `
        <div class="notification-item ${n.isRead ? '' : 'unread'}" onclick="markRead('${n._id}')">
            <div style="font-weight:bold; font-size:0.85em; margin-bottom:3px;">${n.type.toUpperCase()}</div>
            <div>${n.message}</div>
            <div style="font-size:0.75em; color:var(--text-muted); margin-top:5px;">
                ${new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date(n.createdAt).toLocaleDateString()}
            </div>
        </div>
    `).join('');
}

async function markRead(id) {
    const token = localStorage.getItem('token');
    try {
        await fetch(`http://localhost:5001/api/notifications/${id}/read`, {
            method: 'PATCH',
            headers: { "Authorization": "Bearer " + token }
        });
        fetchNotifications(); // refresh
    } catch (err) { }
}

async function markAllRead() {
    const token = localStorage.getItem('token');
    try {
        await fetch(`http://localhost:5001/api/notifications/read-all`, {
            method: 'PATCH',
            headers: { "Authorization": "Bearer " + token }
        });
        fetchNotifications();
    } catch (err) { }
}

// --- Custom Modal Logic ---
function createModalHTML(title, message, isConfirm = false, confirmText = 'Confirm', cancelText = 'Cancel', isDanger = false) {
    return `
        <div class="custom-modal-overlay" id="customModalOverlay">
            <div class="custom-modal">
                <div class="custom-modal-title">${title}</div>
                <div class="custom-modal-message">${message}</div>
                <div class="custom-modal-actions">
                    ${isConfirm ? `<button class="modal-btn btn-cancel" id="modalCancelBtn">${cancelText}</button>` : ''}
                    <button class="modal-btn ${isDanger ? 'btn-danger' : 'btn-confirm'}" id="modalConfirmBtn">${confirmText}</button>
                </div>
            </div>
        </div>
    `;
}

/**
 * Shows a custom confirmation modal.
 * @param {string} message - The message to display.
 * @param {string} title - The title of the modal.
 * @param {object} options - Optional settings { confirmText, cancelText, isDanger }
 * @returns {Promise<boolean>} - Resolves to true if confirmed, false if cancelled.
 */
function showConfirm(message, title = "Confirmation", options = {}) {
    return new Promise((resolve) => {
        const { confirmText = "Yes, Do it", cancelText = "Cancel", isDanger = false } = options;

        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = createModalHTML(title, message, true, confirmText, cancelText, isDanger);
        document.body.appendChild(modalContainer);

        const overlay = modalContainer.querySelector('#customModalOverlay');
        const confirmBtn = modalContainer.querySelector('#modalConfirmBtn');
        const cancelBtn = modalContainer.querySelector('#modalCancelBtn');

        const close = (result) => {
            overlay.style.animation = 'fadeIn 0.3s reverse forwards'; // Fade out
            overlay.querySelector('.custom-modal').style.animation = 'slideUp 0.3s reverse forwards'; // Slide down
            setTimeout(() => {
                document.body.removeChild(modalContainer);
                resolve(result);
            }, 300);
        };

        confirmBtn.onclick = () => close(true);
        cancelBtn.onclick = () => close(false);
        // Click outside to cancel
        overlay.onclick = (e) => {
            if (e.target === overlay) close(false);
        };
    });
}

/**
 * Shows a custom alert modal.
 * @param {string} message - The message to display.
 * @param {string} title - The title of the modal.
 * @returns {Promise<void>} - Resolves when dismissed.
 */
function showAlert(message, title = "Alert") {
    return new Promise((resolve) => {
        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = createModalHTML(title, message, false, "OK");
        document.body.appendChild(modalContainer);

        const overlay = modalContainer.querySelector('#customModalOverlay');
        const confirmBtn = modalContainer.querySelector('#modalConfirmBtn');

        const close = () => {
            overlay.style.animation = 'fadeIn 0.3s reverse forwards';
            overlay.querySelector('.custom-modal').style.animation = 'slideUp 0.3s reverse forwards';
            setTimeout(() => {
                document.body.removeChild(modalContainer);
                resolve();
            }, 300);
        };

        confirmBtn.onclick = () => close();
        overlay.onclick = (e) => {
            if (e.target === overlay) close();
        };
    });
}
