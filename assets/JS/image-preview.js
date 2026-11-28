/**
 * Universal Product Image Preview & Interactive Zoom System
 * Provides smooth pop-up animation, click-to-zoom, wheel zoom, cursor panning, and touch support.
 */

(function () {
    let currentZoom = 1;
    const minZoom = 1;
    const maxZoom = 4;
    let isDragging = false;
    let startX = 0, startY = 0;
    let panX = 0, panY = 0;
    let modal, imgElement, viewport, zoomBadge;

    let currentGallery = [];
    let currentGalleryIndex = 0;

    function createModalHTML() {
        if (document.getElementById('productPreviewModal')) return;

        const modalHTML = `
        <div class="product-preview-modal" id="productPreviewModal" role="dialog" aria-hidden="true">
            <button class="preview-close-btn" id="previewCloseBtn" title="Close Preview">&times;</button>
            <div class="preview-hint-badge" id="previewHintBadge">Click, drag, or scroll wheel to move & zoom image</div>
            
            <button class="preview-nav-btn prev" id="previewPrevBtn" title="Previous Image" style="display: none;">
                <i class="fas fa-chevron-left"></i>
            </button>
            <button class="preview-nav-btn next" id="previewNextBtn" title="Next Image" style="display: none;">
                <i class="fas fa-chevron-right"></i>
            </button>

            <div class="preview-content-box">
                <div class="preview-image-viewport" id="previewViewport">
                    <img src="" alt="Product Image Preview" class="preview-target-img" id="previewTargetImg">
                </div>
            </div>

            <div class="preview-toolbar">
                <button class="preview-btn" id="zoomOutBtn" title="Zoom Out"><i class="fas fa-search-minus"></i></button>
                <span class="preview-zoom-badge" id="previewZoomBadge">100%</span>
                <button class="preview-btn" id="zoomInBtn" title="Zoom In"><i class="fas fa-search-plus"></i></button>
                <button class="preview-btn" id="zoomResetBtn" title="Reset Zoom"><i class="fas fa-undo"></i></button>
            </div>
        </div>`;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        bindModalEvents();
    }

    function bindModalEvents() {
        modal = document.getElementById('productPreviewModal');
        imgElement = document.getElementById('previewTargetImg');
        viewport = document.getElementById('previewViewport');
        zoomBadge = document.getElementById('previewZoomBadge');

        const closeBtn = document.getElementById('previewCloseBtn');
        const zoomInBtn = document.getElementById('zoomInBtn');
        const zoomOutBtn = document.getElementById('zoomOutBtn');
        const zoomResetBtn = document.getElementById('zoomResetBtn');
        const prevBtn = document.getElementById('previewPrevBtn');
        const nextBtn = document.getElementById('previewNextBtn');

        closeBtn.addEventListener('click', closePreview);
        zoomInBtn.addEventListener('click', () => setZoom(currentZoom + 0.5));
        zoomOutBtn.addEventListener('click', () => setZoom(currentZoom - 0.5));
        zoomResetBtn.addEventListener('click', () => resetZoom());

        prevBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            showPrevImage();
        });

        nextBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            showNextImage();
        });

        // Close on clicking backdrop outside content box
        modal.addEventListener('click', (e) => {
            if (e.target === modal || e.target.classList.contains('preview-content-box')) {
                closePreview();
            }
        });

        // Prevent native browser image drag ghost
        imgElement.ondragstart = (e) => e.preventDefault();
        viewport.ondragstart = (e) => e.preventDefault();

        // Robust Pointer Capture Drag & Move
        let startX = 0, startY = 0;
        let initialPanX = 0, initialPanY = 0;
        let hasMoved = false;

        function onPointerDown(e) {
            if (e.target.tagName === 'BUTTON' || e.target.closest('.preview-toolbar') || e.target.closest('.preview-close-btn') || e.target.closest('.preview-nav-btn')) return;
            isDragging = true;
            hasMoved = false;
            startX = e.clientX;
            startY = e.clientY;
            initialPanX = panX;
            initialPanY = panY;
            viewport.classList.add('is-dragging');

            try {
                viewport.setPointerCapture(e.pointerId);
            } catch (err) {}
        }

        function onPointerMove(e) {
            if (!isDragging) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;

            if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
                hasMoved = true;
            }

            panX = initialPanX + dx;
            panY = initialPanY + dy;
            updateTransform();
        }

        function onPointerUp(e) {
            if (!isDragging) return;
            isDragging = false;
            viewport.classList.remove('is-dragging');

            try {
                if (viewport.hasPointerCapture(e.pointerId)) {
                    viewport.releasePointerCapture(e.pointerId);
                }
            } catch (err) {}
        }

        viewport.addEventListener('pointerdown', onPointerDown);
        viewport.addEventListener('pointermove', onPointerMove);
        viewport.addEventListener('pointerup', onPointerUp);
        viewport.addEventListener('pointercancel', onPointerUp);

        // Extra safety release if mouse leaves window or loses focus
        window.addEventListener('mouseup', () => {
            isDragging = false;
            if (viewport) viewport.classList.remove('is-dragging');
        });
        window.addEventListener('blur', () => {
            isDragging = false;
            if (viewport) viewport.classList.remove('is-dragging');
        });

        // Click on viewport toggles zoom focused specifically on clicked spot
        viewport.addEventListener('click', (e) => {
            if (e.target.tagName === 'BUTTON' || e.target.closest('.preview-toolbar') || e.target.closest('.preview-close-btn') || e.target.closest('.preview-nav-btn')) return;
            if (hasMoved) return; // Ignore toggle if user was dragging
            if (currentZoom === 1) {
                const rect = viewport.getBoundingClientRect();
                const offsetX = e.clientX - (rect.left + rect.width / 2);
                const offsetY = e.clientY - (rect.top + rect.height / 2);
                const targetZoom = 2.4;
                panX = -offsetX * (targetZoom - 1);
                panY = -offsetY * (targetZoom - 1);
                setZoom(targetZoom);
            } else {
                resetZoom();
            }
        });

        // Mouse Wheel Zooming focused on cursor position
        viewport.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY < 0 ? 0.3 : -0.3;
            const newZoom = Math.min(Math.max(currentZoom + delta, minZoom), maxZoom);
            if (newZoom !== currentZoom) {
                if (newZoom > 1 && currentZoom === 1) {
                    const rect = viewport.getBoundingClientRect();
                    const offsetX = e.clientX - (rect.left + rect.width / 2);
                    const offsetY = e.clientY - (rect.top + rect.height / 2);
                    panX = -offsetX * (newZoom - 1);
                    panY = -offsetY * (newZoom - 1);
                }
                setZoom(newZoom);
            }
        }, { passive: false });

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (!modal || !modal.classList.contains('active')) return;
            if (e.key === 'Escape') closePreview();
            if (e.key === 'ArrowLeft') showPrevImage();
            if (e.key === 'ArrowRight') showNextImage();
            if (e.key === '+' || e.key === '=') setZoom(currentZoom + 0.25);
            if (e.key === '-') setZoom(currentZoom - 0.25);
            if (e.key === '0') resetZoom();
        });
    }

    function showPrevImage() {
        if (!currentGallery || currentGallery.length <= 1) return;
        currentGalleryIndex = (currentGalleryIndex - 1 + currentGallery.length) % currentGallery.length;
        updatePreviewGalleryItem();
    }

    function showNextImage() {
        if (!currentGallery || currentGallery.length <= 1) return;
        currentGalleryIndex = (currentGalleryIndex + 1) % currentGallery.length;
        updatePreviewGalleryItem();
    }

    function updatePreviewGalleryItem() {
        if (!currentGallery || currentGallery.length === 0) return;
        resetZoom();
        imgElement.src = currentGallery[currentGalleryIndex];
        imgElement.alt = `Product Image ${currentGalleryIndex + 1}`;

        const prevBtn = document.getElementById('previewPrevBtn');
        const nextBtn = document.getElementById('previewNextBtn');
        if (prevBtn && nextBtn) {
            const hasMultiple = currentGallery.length > 1;
            prevBtn.style.display = hasMultiple ? 'flex' : 'none';
            nextBtn.style.display = hasMultiple ? 'flex' : 'none';
        }
    }

    function clampPan() {
        if (!viewport || !imgElement) return;
        if (currentZoom <= 1.05) {
            panX = 0;
            panY = 0;
            return;
        }

        const vWidth = viewport.clientWidth || 1;
        const vHeight = viewport.clientHeight || 1;
        const imgWidth = (imgElement.clientWidth || vWidth) * currentZoom;
        const imgHeight = (imgElement.clientHeight || vHeight) * currentZoom;

        const maxPanX = Math.max(0, (imgWidth - vWidth) / 2);
        const maxPanY = Math.max(0, (imgHeight - vHeight) / 2);

        panX = Math.min(Math.max(panX, -maxPanX), maxPanX);
        panY = Math.min(Math.max(panY, -maxPanY), maxPanY);
    }

    function setZoom(newZoom) {
        const targetZoom = Math.min(Math.max(newZoom, minZoom), maxZoom);
        
        // When zooming out to 1x (or below), reset image position back to original centered viewport
        if (targetZoom <= 1.05) {
            currentZoom = 1;
            panX = 0;
            panY = 0;
            viewport.classList.remove('is-zoomed');
        } else {
            currentZoom = targetZoom;
            viewport.classList.add('is-zoomed');
        }
        
        zoomBadge.textContent = `${Math.round(currentZoom * 100)}%`;
        updateTransform(currentZoom === 1);
    }

    function updateTransform(smooth = false) {
        if (!imgElement) return;
        clampPan();
        if (smooth) {
            imgElement.style.transition = 'transform 0.3s cubic-bezier(0.25, 1, 0.5, 1)';
        } else {
            imgElement.style.transition = isDragging ? 'none' : 'transform 0.15s ease-out';
        }
        imgElement.style.transform = `translate(${panX}px, ${panY}px) scale(${currentZoom})`;
    }

    function resetZoom() {
        panX = 0;
        panY = 0;
        setZoom(1);
    }

    window.openImagePreview = function (images, startIndex = 0, altText = '') {
        createModalHTML();
        
        if (typeof images === 'string') {
            currentGallery = [images];
            currentGalleryIndex = 0;
        } else if (Array.isArray(images)) {
            currentGallery = images.map(item => typeof item === 'string' ? item : (item.main || item.thumb || item.src || item));
            currentGalleryIndex = Math.max(0, Math.min(startIndex, currentGallery.length - 1));
        } else {
            currentGallery = [];
            currentGalleryIndex = 0;
        }

        updatePreviewGalleryItem();
        if (altText) imgElement.alt = altText;

        modal.style.display = 'flex';
        // Trigger smooth reflow for pop-up animation
        setTimeout(() => {
            modal.classList.add('active');
        }, 10);

        document.body.style.overflow = 'hidden';

        // Auto fade hint badge
        const hintBadge = document.getElementById('previewHintBadge');
        if (hintBadge) {
            hintBadge.style.opacity = '1';
            setTimeout(() => {
                hintBadge.style.opacity = '0';
            }, 3000);
        }
    };

    window.closePreview = function () {
        if (!modal) return;
        modal.classList.remove('active');
        setTimeout(() => {
            modal.style.display = 'none';
            document.body.style.overflow = '';
        }, 300);
    };

    // Override openLightbox function for seamless compatibility with product detail pages
    window.openLightbox = function () {
        if (typeof imageData !== 'undefined' && Array.isArray(imageData) && imageData.length > 0) {
            const index = typeof currentImageIndex !== 'undefined' ? currentImageIndex : 0;
            window.openImagePreview(imageData, index, 'Product Image Detail');
        } else {
            const mainImg = document.getElementById('mainImage') || document.querySelector('.main-image');
            if (mainImg) {
                window.openImagePreview(mainImg.src, 0, 'Product Detail Preview');
            }
        }
    };

    // Initialize Quick Zoom buttons & click handlers on product catalog cards across the site
    function initCatalogQuickZoom() {
        const productImages = document.querySelectorAll('.product-card .product-image, .product-item .product-image, .products-container .product-image, .smps-product-image');
        productImages.forEach(container => {
            if (!container.querySelector('.quick-zoom-btn')) {
                const zoomBtn = document.createElement('button');
                zoomBtn.className = 'quick-zoom-btn';
                zoomBtn.type = 'button';
                zoomBtn.title = 'Quick Zoom Preview';
                zoomBtn.innerHTML = '<i class="bi bi-zoom-in"></i>';

                zoomBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const img = container.querySelector('img.default-image') || container.querySelector('img');
                    if (img) {
                        window.openImagePreview(img.src, img.alt || 'Product Preview');
                    }
                });

                container.appendChild(zoomBtn);
            }
        });

        // Also bind click handlers to main-image wrappers on product detail pages
        document.querySelectorAll('.main-image-wrapper, #imageWrapper, .main-image-container img.main-image').forEach(el => {
            el.style.cursor = 'pointer';
            el.onclick = function (e) {
                e.preventDefault();
                e.stopPropagation();
                window.openLightbox();
            };
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            createModalHTML();
            initCatalogQuickZoom();
        });
    } else {
        createModalHTML();
        initCatalogQuickZoom();
    }
})();
