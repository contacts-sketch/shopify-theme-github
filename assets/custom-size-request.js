/* =========================================
   Petaloons — Custom Size Request Widget JS
   ========================================= */

(function () {
  'use strict';

  // ── WhatsApp config ──────────────────────
  // Replace with the actual Petaloons number (digits only, with country code).
  // This is also stored as data-whatsapp-number on the form element in the
  // snippet, so you can override it there without touching this file.
  const WHATSAPP_NUMBER_DEFAULT = '918625075493';
  // ─────────────────────────────────────────

  const DRAWER_ID      = 'csrwDrawer';
  const OVERLAY_ID     = 'csrwOverlay';
  const OPEN_BTN_ID    = 'csrwOpenBtn';
  const CLOSE_BTN_ID   = 'csrwCloseBtn';
  const FORM_ID        = 'csrwForm';
  const SUCCESS_ID     = 'csrwSuccess';
  const PHOTO_INPUT_ID = 'csrwPhotoInput';
  const UPLOAD_AREA_ID = 'csrwUploadArea';
  const PREVIEW_ID     = 'csrwUploadPreview';
  const BANNER_ID      = 'csrwProductBanner';
  const ERROR_ID       = 'csrwFormError';

  // ---- DOM refs ----
  let drawer, overlay, openBtn, closeBtn, form, successPanel,
      photoInput, uploadArea, uploadPreview, productBanner, formError;

  function init() {
    drawer        = document.getElementById(DRAWER_ID);
    overlay       = document.getElementById(OVERLAY_ID);
    openBtn       = document.getElementById(OPEN_BTN_ID);
    closeBtn      = document.getElementById(CLOSE_BTN_ID);
    form          = document.getElementById(FORM_ID);
    successPanel  = document.getElementById(SUCCESS_ID);
    photoInput    = document.getElementById(PHOTO_INPUT_ID);
    uploadArea    = document.getElementById(UPLOAD_AREA_ID);
    uploadPreview = document.getElementById(PREVIEW_ID);
    productBanner = document.getElementById(BANNER_ID);
    formError     = document.getElementById(ERROR_ID);

    if (!drawer || !form) return;

    bindEvents();
    captureProductContext();
  }

  // ---- Open / Close ----

  function openDrawer() {
    drawer.classList.add('is-open');
    overlay.classList.add('is-visible');
    document.body.style.overflow = 'hidden';
    drawer.setAttribute('aria-hidden', 'false');

    // focus first interactive element
    const firstInput = drawer.querySelector('input, select, textarea, button');
    if (firstInput) setTimeout(() => firstInput.focus(), 350);
  }

  function closeDrawer() {
    drawer.classList.remove('is-open');
    overlay.classList.remove('is-visible');
    document.body.style.overflow = '';
    drawer.setAttribute('aria-hidden', 'true');
    if (openBtn) openBtn.focus();
  }

  // ---- Events ----

  function bindEvents() {
    if (openBtn)  openBtn.addEventListener('click',  openDrawer);
    if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
    if (overlay)  overlay.addEventListener('click',  closeDrawer);

    // Close on Escape
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && drawer.classList.contains('is-open')) closeDrawer();
    });

    // Focus trap inside drawer
    drawer.addEventListener('keydown', handleFocusTrap);

    // Form submit
    if (form) form.addEventListener('submit', handleSubmit);

    // Real-time: enable submit only when all required fields are filled
    if (form) {
      form.addEventListener('input',  updateSubmitState);
      form.addEventListener('change', updateSubmitState);
      updateSubmitState(); // set initial state
    }

    // Success close button
    const successCloseBtn = document.getElementById('csrwSuccessClose');
    if (successCloseBtn) successCloseBtn.addEventListener('click', function () {
      closeDrawer();
      setTimeout(resetForm, 400);
    });

    // Photo upload
    if (photoInput) photoInput.addEventListener('change', handlePhotoChange);

    // Drag-and-drop on upload area
    if (uploadArea) {
      uploadArea.addEventListener('dragover',  function (e) { e.preventDefault(); uploadArea.classList.add('is-drag-over'); });
      uploadArea.addEventListener('dragleave', function ()  { uploadArea.classList.remove('is-drag-over'); });
      uploadArea.addEventListener('drop', function (e) {
        e.preventDefault();
        uploadArea.classList.remove('is-drag-over');
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
          const dt = new DataTransfer();
          dt.items.add(file);
          photoInput.files = dt.files;
          showPhotoPreview(file);
        }
      });
    }

    // Remove photo button
    const removePhotoBtn = document.getElementById('csrwRemovePhoto');
    if (removePhotoBtn) removePhotoBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      clearPhoto();
    });
  }

  // ---- Focus Trap ----

  function handleFocusTrap(e) {
    if (e.key !== 'Tab') return;
    const focusable = drawer.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last  = focusable[focusable.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  // ---- Product Context ----

  function captureProductContext() {
    const isProduct = window.location.pathname.includes('/products/');
    if (!isProduct) return;

    // Title: try multiple selectors used by Dawn theme
    const titleEl = document.querySelector('.product__title h1')
                 || document.querySelector('h1.product__title')
                 || document.querySelector('.product-single__title')
                 || document.querySelector('h1[itemprop="name"]')
                 || document.querySelector('h1');

    const title = (titleEl ? titleEl.textContent.trim() : '') ||
                  document.querySelector('meta[property="og:title"]')?.content || '';

    const url     = window.location.href;
    const variantParam = new URLSearchParams(window.location.search).get('variant');

    // Try to get variant label from DOM (Dawn radio/select pickers)
    let variantLabel = '';
    const checkedRadios = document.querySelectorAll('.product-form__input input[type="radio"]:checked');
    if (checkedRadios.length) {
      variantLabel = Array.from(checkedRadios)
        .map(r => r.closest('.product-form__input')?.querySelector('.visually-hidden-flashsale, label[for="' + r.id + '"]')?.textContent.trim() || r.value)
        .filter(Boolean).join(' / ');
    }

    // Fallback: Dawn select-based variant picker
    if (!variantLabel) {
      const variantSelect = document.querySelector('.product-form__input select');
      if (variantSelect) {
        const opt = variantSelect.options[variantSelect.selectedIndex];
        if (opt) variantLabel = opt.text.trim();
      }
    }

    // Populate hidden fields
    setHiddenField('csrwProductTitle',   title);
    setHiddenField('csrwProductUrl',     url);
    setHiddenField('csrwSelectedVariant', variantLabel || variantParam || '');

    // Pre-fill "Product Interested In" with title
    const productInterested = document.getElementById('csrwProductInterested');
    if (productInterested && title) productInterested.value = title;

    // Show the context banner
    if (productBanner && title) {
      productBanner.classList.add('is-visible');
      const bannerTitle = document.getElementById('csrwBannerTitle');
      if (bannerTitle) bannerTitle.textContent = title;
    }

    // Watch for variant changes (Dawn dispatches custom events + URL changes)
    listenForVariantChanges();
  }

  function listenForVariantChanges() {
    // Dawn's variant picker updates the URL; observe that
    const origPushState = history.pushState.bind(history);
    history.pushState = function (...args) {
      origPushState(...args);
      updateVariantFromURL();
    };

    window.addEventListener('popstate', updateVariantFromURL);

    // Also listen for Shopify's global variant change event
    document.addEventListener('variant:change', function (e) {
      if (e.detail && e.detail.variant) {
        setHiddenField('csrwSelectedVariant', e.detail.variant.title || '');
      }
    });
  }

  function updateVariantFromURL() {
    const variantParam = new URLSearchParams(window.location.search).get('variant');
    if (variantParam) setHiddenField('csrwSelectedVariant', variantParam);
  }

  function setHiddenField(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value || '';
  }

  // ---- Photo Upload ----

  function handlePhotoChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showError('Photo must be under 5MB.');
      clearPhoto();
      return;
    }
    showPhotoPreview(file);
  }

  function showPhotoPreview(file) {
    if (!uploadPreview) return;
    const img     = uploadPreview.querySelector('.csrw-upload-preview__img');
    const nameEl  = uploadPreview.querySelector('.csrw-upload-preview__name');
    const sizeEl  = uploadPreview.querySelector('.csrw-upload-preview__size');
    const placeholder = uploadArea.querySelector('.csrw-upload-placeholder');

    const reader = new FileReader();
    reader.onload = function (e) {
      if (img) img.src = e.target.result;
    };
    reader.readAsDataURL(file);

    if (nameEl) nameEl.textContent = file.name;
    if (sizeEl) sizeEl.textContent = formatBytes(file.size);
    if (placeholder) placeholder.style.display = 'none';

    uploadPreview.classList.add('is-visible');
    uploadArea.classList.add('is-drag-over');
    uploadArea.style.borderStyle = 'solid';
  }

  function clearPhoto() {
    if (photoInput) photoInput.value = '';
    if (uploadPreview) uploadPreview.classList.remove('is-visible');

    const placeholder = uploadArea ? uploadArea.querySelector('.csrw-upload-placeholder') : null;
    if (placeholder) placeholder.style.display = '';
    if (uploadArea) {
      uploadArea.classList.remove('is-drag-over');
      uploadArea.style.borderStyle = '';
    }
  }

  function formatBytes(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  }

  // ---- Form Submission ----

  function handleSubmit(e) {
    e.preventDefault();
    hideError();

    if (!validateForm()) return;

    const submitBtn = form.querySelector('.csrw-submit-btn');
    submitBtn.classList.add('is-loading');
    submitBtn.disabled = true;

    // Build formatted data, open WhatsApp, show success
    const data = collectFormData();
    openWhatsApp(data);
    showSuccess();

    submitBtn.classList.remove('is-loading');
    submitBtn.disabled = false;
  }

  // ---- Collect all field values into a plain object ----

  function collectFormData() {
    const get = function (name) {
      const el = form.querySelector('[name="' + name + '"]');
      return el ? (el.value || '').trim() : '';
    };

    return {
      petName:          get('pet_name'),
      petType:          get('pet_type'),
      breed:            get('breed'),
      weightKg:         get('weight_kg'),
      chestCm:          get('chest_cm'),
      neckCm:           get('neck_cm'),
      waistCm:          get('waist_cm'),
      backLengthCm:     get('back_length_cm'),
      customerName:     get('contact[name]'),
      whatsapp:         get('whatsapp'),
      email:            get('contact[email]'),
      productInterested: get('product_interested'),
      productTitle:     (document.getElementById('csrwProductTitle')    || {}).value || '',
      productUrl:       (document.getElementById('csrwProductUrl')      || {}).value || '',
      selectedVariant:  (document.getElementById('csrwSelectedVariant') || {}).value || '',
    };
  }

  // ---- Build WhatsApp message text ----

  function buildWhatsAppMessage(d) {
    var lines = [
      '🐾 *New Custom Size Request — Petaloons*',
      '',
      '*Pet Name:* '      + (d.petName    || '—'),
      '*Pet Type:* '      + (d.petType    || '—'),
      '*Breed:* '         + (d.breed      || '—'),
      '*Weight:* '        + (d.weightKg   ? d.weightKg   + ' KG' : '—'),
      '*Chest:* '         + (d.chestCm    ? d.chestCm    + ' CM' : '—'),
      '*Neck:* '          + (d.neckCm     ? d.neckCm     + ' CM' : '—'),
      '*Waist:* '         + (d.waistCm    ? d.waistCm    + ' CM' : '—'),
      '*Back Length:* '   + (d.backLengthCm ? d.backLengthCm + ' CM' : '—'),
      '',
      '*Customer Name:* '     + (d.customerName || '—'),
      '*WhatsApp Number:* '   + (d.whatsapp     || '—'),
      '*Email:* '             + (d.email        || '—'),
      '',
      '*Product Interested In:* ' + (d.productInterested || d.productTitle || '—'),
    ];

    if (d.productUrl) {
      lines.push('*Product URL:* ' + d.productUrl);
    }
    if (d.selectedVariant) {
      lines.push('*Selected Variant:* ' + d.selectedVariant);
    }

    lines.push('');
    lines.push('_Please review and suggest the best size/customization._');

    return lines.join('\n');
  }

  // ---- Open WhatsApp with pre-filled message ----

  function openWhatsApp(data) {
    // Read number from data-attribute on form (set in snippet) or fall back to default
    var number = (form.dataset.whatsappNumber || WHATSAPP_NUMBER_DEFAULT).replace(/\D/g, '');
    var message = buildWhatsAppMessage(data);
    var encoded = encodeURIComponent(message);

    // wa.me works on both mobile (opens app) and desktop (opens WhatsApp Web)
    var url = 'https://wa.me/' + number + '?text=' + encoded;

    // Always open in a new tab — never navigate the current page
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  // ---- Real-time submit button state ----

  function updateSubmitState() {
    var submitBtn = document.getElementById('csrwSubmitBtn');
    if (!submitBtn || !form) return;

    var allFilled = true;
    var required = form.querySelectorAll('[data-required]');

    required.forEach(function (input) {
      if (!input.value || !input.value.trim()) allFilled = false;
    });

    // Also check email format if filled
    var emailEl = form.querySelector('[name="contact[email]"]');
    if (emailEl && emailEl.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailEl.value.trim())) {
      allFilled = false;
    }

    submitBtn.disabled = !allFilled;
    submitBtn.setAttribute('aria-disabled', String(!allFilled));
  }

  // ---- Validation ----

  function validateForm() {
    let valid = true;
    const required = form.querySelectorAll('[data-required]');

    required.forEach(function (input) {
      const field = input.closest('.csrw-field');
      const isEmpty = !input.value || !input.value.trim();

      if (isEmpty) {
        valid = false;
        if (field) field.classList.add('has-error');
      } else {
        if (field) field.classList.remove('has-error');
      }
    });

    // Email format
    const emailEl = form.querySelector('[name="contact[email]"]');
    if (emailEl && emailEl.value) {
      const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailEl.value.trim());
      if (!emailOk) {
        valid = false;
        const field = emailEl.closest('.csrw-field');
        if (field) field.classList.add('has-error');
      }
    }

    if (!valid) {
      showError('Please fill in all required fields.');
      const firstError = form.querySelector('.csrw-field.has-error input, .csrw-field.has-error select');
      if (firstError) firstError.focus();
    }

    return valid;
  }

  // Clear per-field errors on input
  document.addEventListener('input', function (e) {
    const field = e.target.closest && e.target.closest('.csrw-field');
    if (field) field.classList.remove('has-error');
  });

  document.addEventListener('change', function (e) {
    const field = e.target.closest && e.target.closest('.csrw-field');
    if (field) field.classList.remove('has-error');
  });

  // ---- UI helpers ----

  function showSuccess() {
    if (form) form.style.display = 'none';
    if (successPanel) successPanel.classList.add('is-visible');

    const body = drawer.querySelector('.csrw-drawer__body');
    if (body) body.scrollTop = 0;
  }

  function resetForm() {
    if (form) {
      form.reset();
      form.style.display = '';
      form.querySelectorAll('.csrw-field').forEach(function (f) { f.classList.remove('has-error'); });
      // Reset product-interested to product title if on product page
      captureProductContext();
    }
    if (successPanel) successPanel.classList.remove('is-visible');
    clearPhoto();
    hideError();
    updateSubmitState();
  }

  function showError(msg) {
    if (!formError) return;
    formError.textContent = msg;
    formError.classList.add('is-visible');
    formError.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function hideError() {
    if (formError) formError.classList.remove('is-visible');
  }

  // ---- Boot ----

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
