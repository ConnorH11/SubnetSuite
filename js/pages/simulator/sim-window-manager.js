// sim-window-manager.js
// Desktop window management system with taskbar, z-ordering, minimize/maximize

export class WindowManager {
    constructor(container) {
        this.container = container;
        this.windows = new Map();
        this.zCounter = 100;
        this.taskbarItems = [];
        this.activeWindowId = null;
    }

    createWindow(id, title, icon, options = {}) {
        const win = document.createElement('div');
        win.className = 'wm-window';
        win.dataset.windowId = id;
        win.style.width = (options.width || 600) + 'px';
        win.style.height = (options.height || 420) + 'px';
        win.style.left = (options.x || 60 + this.windows.size * 30) + 'px';
        win.style.top = (options.y || 40 + this.windows.size * 20) + 'px';
        win.style.zIndex = ++this.zCounter;

        win.innerHTML = `
            <div class="wm-titlebar">
                <div class="wm-title-left">
                    <i class="bi ${icon} wm-title-icon"></i>
                    <span class="wm-title-text">${title}</span>
                </div>
                <div class="wm-title-buttons">
                    <button class="wm-btn wm-btn-min" title="Minimize"><i class="bi bi-dash"></i></button>
                    <button class="wm-btn wm-btn-max" title="Maximize"><i class="bi bi-square"></i></button>
                    <button class="wm-btn wm-btn-close" title="Close"><i class="bi bi-x-lg"></i></button>
                </div>
            </div>
            <div class="wm-content"></div>
        `;

        const contentEl = win.querySelector('.wm-content');
        
        const windowData = {
            id,
            element: win,
            content: contentEl,
            title,
            icon,
            minimized: false,
            maximized: false,
            savedBounds: null,
        };

        this.windows.set(id, windowData);

        // Bring to front on click
        win.addEventListener('mousedown', () => this.focusWindow(id));

        // Titlebar buttons
        win.querySelector('.wm-btn-close').addEventListener('click', (e) => {
            e.stopPropagation();
            this.closeWindow(id);
        });
        win.querySelector('.wm-btn-min').addEventListener('click', (e) => {
            e.stopPropagation();
            this.minimizeWindow(id);
        });
        win.querySelector('.wm-btn-max').addEventListener('click', (e) => {
            e.stopPropagation();
            this.maximizeWindow(id);
        });

        // Draggable titlebar
        this._makeDraggable(win, win.querySelector('.wm-titlebar'));

        // Resizable
        this._makeResizable(win);

        this.container.querySelector('.wm-desktop-area').appendChild(win);
        this._updateTaskbar();
        this.focusWindow(id);

        return contentEl;
    }

    closeWindow(id) {
        const win = this.windows.get(id);
        if (!win) return;
        win.element.remove();
        this.windows.delete(id);
        this._updateTaskbar();
    }

    minimizeWindow(id) {
        const win = this.windows.get(id);
        if (!win) return;
        win.minimized = true;
        win.element.style.display = 'none';
        this._updateTaskbar();
    }

    restoreWindow(id) {
        const win = this.windows.get(id);
        if (!win) return;
        win.minimized = false;
        win.element.style.display = '';
        this.focusWindow(id);
        this._updateTaskbar();
    }

    maximizeWindow(id) {
        const win = this.windows.get(id);
        if (!win) return;

        if (win.maximized) {
            // Restore
            if (win.savedBounds) {
                win.element.style.left = win.savedBounds.left;
                win.element.style.top = win.savedBounds.top;
                win.element.style.width = win.savedBounds.width;
                win.element.style.height = win.savedBounds.height;
            }
            win.maximized = false;
            win.element.classList.remove('wm-maximized');
        } else {
            // Save current bounds
            win.savedBounds = {
                left: win.element.style.left,
                top: win.element.style.top,
                width: win.element.style.width,
                height: win.element.style.height,
            };
            win.element.style.left = '0';
            win.element.style.top = '0';
            win.element.style.width = '100%';
            win.element.style.height = 'calc(100% - 48px)';
            win.maximized = true;
            win.element.classList.add('wm-maximized');
        }
    }

    focusWindow(id) {
        const win = this.windows.get(id);
        if (!win) return;
        win.element.style.zIndex = ++this.zCounter;
        this.activeWindowId = id;

        // Update active state on all windows
        this.windows.forEach((w, wid) => {
            w.element.classList.toggle('wm-focused', wid === id);
        });
        this._updateTaskbar();
    }

    _updateTaskbar() {
        const taskbar = this.container.querySelector('.wm-taskbar-apps');
        if (!taskbar) return;
        taskbar.innerHTML = '';

        this.windows.forEach((win, id) => {
            const btn = document.createElement('button');
            btn.className = `wm-taskbar-btn ${id === this.activeWindowId && !win.minimized ? 'active' : ''} ${win.minimized ? 'minimized' : ''}`;
            btn.innerHTML = `<i class="bi ${win.icon}"></i><span>${win.title}</span>`;
            btn.addEventListener('click', () => {
                if (win.minimized) {
                    this.restoreWindow(id);
                } else if (id === this.activeWindowId) {
                    this.minimizeWindow(id);
                } else {
                    this.focusWindow(id);
                }
            });
            taskbar.appendChild(btn);
        });
    }

    _makeDraggable(win, handle) {
        let isDragging = false, startX, startY, initialX, initialY;

        handle.addEventListener('mousedown', (e) => {
            if (e.target.closest('.wm-btn')) return;
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            const rect = win.getBoundingClientRect();
            const parentRect = win.parentElement.getBoundingClientRect();
            initialX = rect.left - parentRect.left;
            initialY = rect.top - parentRect.top;
            document.body.style.userSelect = 'none';
            e.preventDefault();
        });

        window.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            win.style.left = `${initialX + dx}px`;
            win.style.top = `${initialY + dy}px`;
        });

        window.addEventListener('mouseup', () => {
            isDragging = false;
            document.body.style.userSelect = '';
        });
    }

    _makeResizable(win) {
        const handle = document.createElement('div');
        handle.className = 'wm-resize-handle';
        win.appendChild(handle);

        let isResizing = false, startX, startY, startW, startH;

        handle.addEventListener('mousedown', (e) => {
            isResizing = true;
            startX = e.clientX;
            startY = e.clientY;
            startW = win.offsetWidth;
            startH = win.offsetHeight;
            document.body.style.userSelect = 'none';
            e.preventDefault();
            e.stopPropagation();
        });

        window.addEventListener('mousemove', (e) => {
            if (!isResizing) return;
            const newW = Math.max(300, startW + (e.clientX - startX));
            const newH = Math.max(200, startH + (e.clientY - startY));
            win.style.width = newW + 'px';
            win.style.height = newH + 'px';
        });

        window.addEventListener('mouseup', () => {
            isResizing = false;
            document.body.style.userSelect = '';
        });
    }
}
