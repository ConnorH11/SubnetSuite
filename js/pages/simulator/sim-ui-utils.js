// sim-ui-utils.js

export function makeDraggable(modal, header) {
    let isDragging = false, startX, startY, initialX, initialY;
    const doc = modal.ownerDocument || document;
    const win = doc.defaultView || window;

    header.addEventListener('mousedown', (e) => {
        if (e.target.closest('button')) return; // Prevent drag logic if clicking a button (like close/minimize)
        
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        
        const rect = modal.getBoundingClientRect();
        const isFixed = win.getComputedStyle(modal).position === 'fixed';
        
        if (isFixed) {
            initialX = rect.left;
            initialY = rect.top;
        } else {
            const parentRect = modal.offsetParent ? modal.offsetParent.getBoundingClientRect() : {left: 0, top: 0};
            initialX = rect.left - parentRect.left;
            initialY = rect.top - parentRect.top;
        }
        
        modal.style.transform = 'none'; 
        modal.style.right = 'auto';
        modal.style.bottom = 'auto';
        modal.style.left = `${initialX}px`;
        modal.style.top = `${initialY}px`;
        
        doc.body.style.userSelect = 'none';
    });

    win.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        modal.style.left = `${initialX + dx}px`;
        modal.style.top = `${initialY + dy}px`;
    });

    win.addEventListener('mouseup', () => {
        isDragging = false;
        doc.body.style.userSelect = '';
    });
}
