const config = window.APP_CONFIG;

function formatGuarani(value) {
  return `Gs. ${Number(value).toLocaleString('es-PY')}`;
}

function getQuantityText(quantity) {
  return `${quantity} ${quantity === 1 ? 'unidad' : 'unidades'}`;
}

function getQuantity() {
  return Number(document.querySelector('#quantitySelect')?.value || 1);
}

function getSubtotal(quantity = getQuantity()) {
  return Number(config.COMBOS?.[quantity]) || config.PRODUCT_PRICE * quantity;
}

function getTrackingPayload(quantity = getQuantity()) {
  return { quantity, subtotal: getSubtotal(quantity) };
}

function generateOrderNumber() {
  return `#CG${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 90 + 10)}`;
}

function isParaguayanPhone(value) {
  const cleaned = value.replace(/[\s\-()]/g, '');
  return /^(?:\+595|0)?\d{9,10}$/.test(cleaned);
}

function normalizeText(value) {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function isCashOnDeliveryArea(value) {
  const city = normalizeText(value);
  const areas = ['asuncion', 'central', 'san lorenzo', 'fernando de la mora', 'luque', 'capiata', 'lambare', 'mariano roque alonso', 'nemby', 'villa elisa', 'san antonio', 'limpio', 'itaugua', 'ita', 'aregua', 'ypane'];
  return areas.some((area) => city.includes(area));
}

function setDeliveryNoticeText(form) {
  const city = form.querySelector('[name="city"]');
  const notice = form.querySelector('.delivery-notice');
  if (!city || !notice) return;
  const value = city.value.trim();
  if (!value) {
    notice.textContent = 'Asunción y Central: pago contra entrega. Interior: se coordina por WhatsApp y se abona antes del despacho.';
    return;
  }
  notice.textContent = isCashOnDeliveryArea(value) ? 'Zona habilitada para pago contra entrega. No abonás nada ahora.' : 'Envíos al interior: coordinamos por WhatsApp y se abona antes de realizar el despacho.';
}

function updateOrderSummary() {
  const quantity = getQuantity();
  const subtotal = getSubtotal(quantity);
  const fields = {
    productPriceTop: formatGuarani(subtotal),
    summaryQuantityText: getQuantityText(quantity),
    summaryPriceUnit: quantity === 1 ? formatGuarani(config.PRODUCT_PRICE) : `Combo ${quantity}: ${formatGuarani(subtotal)}`,
    summaryQuantity: getQuantityText(quantity),
    summaryTotal: formatGuarani(subtotal)
  };
  Object.entries(fields).forEach(([id, value]) => {
    const el = document.querySelector(`#${id}`);
    if (el) el.textContent = value;
  });
}

function initGallery() {
  const gallery = document.querySelector('.gallery');
  const thumbs = Array.from(gallery?.querySelectorAll('.thumb') || []);
  const mainImage = document.querySelector('#mainProductImage');
  let autoSlideTimer;
  let startX = 0;
  if (!thumbs.length || !mainImage) return;

  function activateThumb(thumb) {
    thumbs.forEach((item) => item.classList.remove('active'));
    thumb.classList.add('active');
    if (thumb.dataset.image) mainImage.src = thumb.dataset.image;
    window.Tracking?.fire('select_item', getTrackingPayload());
  }

  function activeIndex() {
    return Math.max(0, thumbs.findIndex((thumb) => thumb.classList.contains('active')));
  }

  function goTo(index) {
    activateThumb(thumbs[(index + thumbs.length) % thumbs.length]);
  }

  function nextImage() {
    goTo(activeIndex() + 1);
  }

  function restartAutoSlide() {
    window.clearInterval(autoSlideTimer);
    autoSlideTimer = window.setInterval(nextImage, 6500);
  }

  thumbs.forEach((thumb) => thumb.addEventListener('click', () => {
    activateThumb(thumb);
    restartAutoSlide();
  }));

  document.querySelector('.gallery-arrow-right')?.addEventListener('click', () => { nextImage(); restartAutoSlide(); });
  document.querySelector('.gallery-arrow-left')?.addEventListener('click', () => { goTo(activeIndex() - 1); restartAutoSlide(); });
  gallery.addEventListener('touchstart', (event) => { startX = event.touches[0].clientX; }, { passive: true });
  gallery.addEventListener('touchend', (event) => {
    const deltaX = event.changedTouches[0].clientX - startX;
    if (Math.abs(deltaX) < 44) return;
    deltaX < 0 ? nextImage() : goTo(activeIndex() - 1);
    restartAutoSlide();
  }, { passive: true });

  restartAutoSlide();
}

function initTimer() {
  const minutesEl = document.querySelector('#minutes');
  const secondsEl = document.querySelector('#seconds');
  const mobileMinutesEl = document.querySelector('#mobileMinutes');
  const mobileSecondsEl = document.querySelector('#mobileSeconds');
  let remaining = 10 * 60;
  function updateTimer() {
    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;
    const minutesText = String(minutes).padStart(2, '0');
    const secondsText = String(seconds).padStart(2, '0');
    if (minutesEl) minutesEl.textContent = minutesText;
    if (secondsEl) secondsEl.textContent = secondsText;
    if (mobileMinutesEl) mobileMinutesEl.textContent = minutesText;
    if (mobileSecondsEl) mobileSecondsEl.textContent = secondsText;
    remaining = remaining > 0 ? remaining - 1 : 10 * 60;
  }
  updateTimer();
  setInterval(updateTimer, 1000);
}

function initLiveCounters() {
  const viewerCount = document.querySelector('#viewerCount');
  const stockCount = document.querySelector('#stockCount');
  setInterval(() => {
    if (viewerCount) viewerCount.textContent = String(Math.floor(Math.random() * 18) + 14);
    if (stockCount && Math.random() > 0.78) {
      const current = Number(stockCount.textContent) || 24;
      if (current > 6) stockCount.textContent = String(current - 1);
    }
  }, 6500);
}

function showCheckout() {
  const productPage = document.querySelector('[data-page="product"]');
  const checkoutPage = document.querySelector('[data-page="checkout"]');
  if (!productPage || !checkoutPage) return;
  productPage.hidden = true;
  checkoutPage.hidden = false;
  checkoutPage.classList.add('is-visible');
  document.body.classList.add('checkout-open');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  const payload = getTrackingPayload();
  window.Tracking?.fire('add_to_cart', payload);
  window.Tracking?.fire('AddToCart', payload);
  window.Tracking?.fire('begin_checkout', payload);
  window.Tracking?.fire('InitiateCheckout', payload);
}

function showProduct() {
  const productPage = document.querySelector('[data-page="product"]');
  const checkoutPage = document.querySelector('[data-page="checkout"]');
  if (!productPage || !checkoutPage) return;
  checkoutPage.hidden = true;
  productPage.hidden = false;
  document.body.classList.remove('checkout-open');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showConfirmation(orderId, phone) {
  const confirmation = document.querySelector('#confirmation');
  const orderNumber = document.querySelector('#orderNumber');
  const confirmationPhone = document.querySelector('#confirmationPhone');
  if (orderNumber) orderNumber.textContent = orderId;
  if (confirmationPhone) confirmationPhone.textContent = phone || '---';
  confirmation?.classList.remove('hidden');
  document.documentElement.style.overflow = 'hidden';
}

function closeConfirmation() {
  document.querySelector('#confirmation')?.classList.add('hidden');
  document.documentElement.style.overflow = '';
  showProduct();
}

function setSubmitLoading(form, loading) {
  const submitButton = form.querySelector('button[type="submit"]');
  const btnText = submitButton?.querySelector('.btn-text');
  const btnLoader = submitButton?.querySelector('.btn-loader');
  if (submitButton) submitButton.disabled = loading;
  btnText?.classList.toggle('hidden', loading);
  btnLoader?.classList.toggle('hidden', !loading);
}

function cleanReferenceNote(value, departamento, city) {
  const note = String(value || '').trim();
  if (!note) return '';

  const compactNote = normalizeText(note).replace(/\s+/g, '');
  const repeatedValues = [departamento, city]
    .map((item) => normalizeText(String(item || '')).replace(/\s+/g, ''))
    .filter(Boolean);

  const isRepeatedLocation = repeatedValues.some((item) => {
    if (compactNote === item) return true;
    return compactNote.length > item.length && compactNote === item.repeat(Math.round(compactNote.length / item.length));
  });

  return isRepeatedLocation ? '' : note;
}

function buildSupabaseOrder(formData, orderId, paymentMode) {
  const quantity = Number(formData.get('quantity') || 1);
  const departamento = String(formData.get('departamento') || '').trim();
  const city = String(formData.get('city') || '').trim();
  const notes = cleanReferenceNote(formData.get('notes'), departamento, city);
  const mapUrl = String(formData.get('map') || '').trim();
  const ci = String(formData.get('ci') || '').trim();
  const referenceParts = [];
  if (notes) referenceParts.push(`Referencia: ${notes}`);
  if (ci) referenceParts.push(`CI: ${ci}`);
  if (mapUrl) referenceParts.push(`Maps: ${mapUrl}`);
  referenceParts.push(paymentMode === 'cash_on_delivery' ? 'Pago contra entrega' : 'Interior: abono previo antes del despacho');
  return {
    id: orderId,
    product: config.PRODUCT_NAME,
    combo: `${getQuantityText(quantity)} | ${config.PRODUCT_NAME}`,
    quantity: quantity,
    total: getSubtotal(quantity),
    customer_name: String(formData.get('name') || '').trim(),
    customer_phone: String(formData.get('phone') || '').trim(),
    city: city,
    address: String(formData.get('address') || '').trim() || 'No informado',
    neighborhood: departamento || 'No informado',
    reference: referenceParts.join(' | '),
    maps_url: mapUrl,
    status: 'pending_confirmation',
    created_at: new Date().toISOString()
  };
}

function buildLocalOrder(formData, orderId) {
  const quantity = Number(formData.get('quantity') || 1);
  const departamento = String(formData.get('departamento') || '').trim();
  const city = String(formData.get('city') || '').trim();
  const notes = cleanReferenceNote(formData.get('notes'), departamento, city);
  return {
    id: orderId,
    producto: config.PRODUCT_NAME,
    precio: config.PRODUCT_PRICE,
    cantidad: quantity,
    subtotal: getSubtotal(quantity),
    nombre: String(formData.get('name') || '').trim(),
    telefono: String(formData.get('phone') || '').trim(),
    correo: 'No informado',
    ci: String(formData.get('ci') || '').trim() || 'No informado',
    departamento: departamento || 'No informado',
    ciudad: city,
    direccion: String(formData.get('address') || '').trim() || 'No informado',
    referencia: notes || 'Sin referencia',
    ubicacion_maps: String(formData.get('map') || '').trim() || 'No informado',
    estado: 'pending_confirmation',
    created_at: new Date().toISOString()
  };
}

function saveLocalBackup(order) {
  const orders = JSON.parse(localStorage.getItem('creatinaGecapsOrders') || '[]');
  orders.push(order);
  localStorage.setItem('creatinaGecapsOrders', JSON.stringify(orders));
}

function initCheckout() {
  document.querySelectorAll('a[href="#checkout"]').forEach((link) => link.addEventListener('click', (event) => {
    event.preventDefault();
    showCheckout();
  }));
  document.querySelector('.back-link')?.addEventListener('click', (event) => { event.preventDefault(); showProduct(); });
  document.querySelector('.checkout-close')?.addEventListener('click', showProduct);
  document.querySelector('[data-close-confirmation]')?.addEventListener('click', closeConfirmation);
  document.querySelector('#confirmation')?.addEventListener('click', (event) => { if (event.target.id === 'confirmation') closeConfirmation(); });
}

function initForms() {
  document.querySelectorAll('[data-order-form]').forEach((form) => {
    const city = form.querySelector('[name="city"]');
    const quantitySelect = form.querySelector('[name="quantity"]');
    city?.addEventListener('input', () => setDeliveryNoticeText(form));
    quantitySelect?.addEventListener('change', updateOrderSummary);
    quantitySelect?.addEventListener('change', () => window.Tracking?.fire('select_item', getTrackingPayload()));
    setDeliveryNoticeText(form);

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const formData = new FormData(form);
      const error = form.querySelector('.form-error');
      const name = String(formData.get('name') || '').trim();
      const phone = String(formData.get('phone') || '').trim();
      const cityValue = String(formData.get('city') || '').trim();
      const quantity = Number(formData.get('quantity') || 1);
      const payload = getTrackingPayload(quantity);

      if (error) error.textContent = '';
      if (!name || !phone || !cityValue) {
        if (error) error.textContent = 'Completá nombre, teléfono y ciudad para confirmar tu pedido.';
        return;
      }
      if (!isParaguayanPhone(phone)) {
        if (error) error.textContent = 'Ingresá un número válido. Ej: 0981 123 456.';
        return;
      }

      const orderId = generateOrderNumber();
      const paymentMode = isCashOnDeliveryArea(cityValue) ? 'cash_on_delivery' : 'interior_coordination';
      const supabaseOrder = buildSupabaseOrder(formData, orderId, paymentMode);
      const localOrder = buildLocalOrder(formData, orderId);

      setSubmitLoading(form, true);
      try {
        await window.SupabaseOrders.save(supabaseOrder);
        saveLocalBackup(localOrder);
        window.Tracking?.fire('purchase', payload);
        window.Tracking?.fire('Purchase', payload);
        window.Tracking?.fire('generate_lead', payload);
        window.Tracking?.fire('Lead', payload);
      } catch (err) {
        console.error(err);
        if (error) error.textContent = 'No pudimos registrar tu pedido. Revisá tu conexión e intentá nuevamente. No se realizó ningún cobro.';
        setSubmitLoading(form, false);
        return;
      }

      form.reset();
      updateOrderSummary();
      setDeliveryNoticeText(form);
      setSubmitLoading(form, false);
      showConfirmation(orderId, phone);
    });
  });
}

function initMapPicker() {
  const modal = document.querySelector('#mapModal');
  const mapEl = document.querySelector('#mapPicker');
  const linkInput = document.querySelector('#mapLinkInput');
  const openLink = document.querySelector('#mapOpenLink');
  const confirmButton = document.querySelector('#mapConfirm');
  const error = document.querySelector('#mapError');
  const searchInput = document.querySelector('#mapSearch');
  const searchButton = document.querySelector('#mapSearchButton');
  let activeTarget;
  let map;
  let marker;

  function setLocation(lat, lng) {
    const url = `https://www.google.com/maps?q=${lat.toFixed(6)},${lng.toFixed(6)}`;
    if (linkInput) linkInput.value = url;
    if (openLink) openLink.href = url;
    if (marker) marker.setLatLng([lat, lng]);
    else marker = L.marker([lat, lng]).addTo(map);
  }

  function openMap(target) {
    if (!window.L || !modal || !mapEl) return;
    activeTarget = target;
    modal.classList.remove('hidden');
    document.documentElement.style.overflow = 'hidden';
    setTimeout(() => {
      if (!map) {
        map = L.map(mapEl).setView([-25.2637, -57.5759], 12);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap' }).addTo(map);
        map.on('click', (event) => setLocation(event.latlng.lat, event.latlng.lng));
        setLocation(-25.2637, -57.5759);
      }
      map.invalidateSize();
    }, 80);
  }

  function closeMap() {
    modal?.classList.add('hidden');
    document.documentElement.style.overflow = '';
  }

  async function searchLocation() {
    if (!searchInput?.value.trim()) return;
    if (error) error.textContent = '';
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchInput.value.trim() + ', Paraguay')}&limit=1`);
      const results = await response.json();
      if (!results.length) throw new Error('Sin resultados');
      const lat = Number(results[0].lat);
      const lng = Number(results[0].lon);
      map.setView([lat, lng], 16);
      setLocation(lat, lng);
    } catch (err) {
      if (error) error.textContent = 'No encontramos esa ubicación. Probá con otra referencia o marcá manualmente.';
    }
  }

  document.querySelectorAll('[data-open-map]').forEach((button) => button.addEventListener('click', () => openMap(button.closest('.map-input-row')?.querySelector('[name="map"]'))));
  document.querySelector('[data-close-map]')?.addEventListener('click', closeMap);
  modal?.addEventListener('click', (event) => { if (event.target.id === 'mapModal') closeMap(); });
  confirmButton?.addEventListener('click', () => { if (activeTarget && linkInput?.value) activeTarget.value = linkInput.value; closeMap(); });
  searchButton?.addEventListener('click', searchLocation);
  searchInput?.addEventListener('keydown', (event) => { if (event.key === 'Enter') { event.preventDefault(); searchLocation(); } });
}

function initAnimations() {
  const animated = document.querySelectorAll('.fade-up, .fade-left, .fade-right, .zoom-in, .slide-up, .smooth-reveal');
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
    animated.forEach((el) => el.classList.add('is-visible'));
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -48px 0px' });
  animated.forEach((el) => observer.observe(el));
}

initGallery();
initTimer();
initLiveCounters();
initCheckout();
initForms();
initMapPicker();
initAnimations();
updateOrderSummary();
