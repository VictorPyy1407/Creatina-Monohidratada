(function () {
  const config = window.APP_CONFIG;
  const fired = new Set();

  function quantityFromPayload(payload) {
    return Number(payload && payload.quantity) || 1;
  }

  function subtotalFromPayload(payload) {
    const quantity = quantityFromPayload(payload);
    return Number(payload && payload.subtotal) || (config.COMBOS && config.COMBOS[quantity]) || config.PRODUCT_PRICE * quantity;
  }

  function basePayload(payload) {
    const quantity = quantityFromPayload(payload);
    const subtotal = subtotalFromPayload(payload);
    return {
      producto: config.PRODUCT_NAME,
      precio: config.PRODUCT_PRICE,
      cantidad: quantity,
      subtotal: subtotal,
      moneda: config.CURRENCY,
      origen: config.ORIGIN,
      url: window.location.href,
      fecha: new Date().toISOString()
    };
  }

  function gaItemPayload(payload) {
    const quantity = quantityFromPayload(payload);
    const subtotal = subtotalFromPayload(payload);
    return {
      item_id: config.ORIGIN,
      item_name: config.PRODUCT_NAME,
      item_category: 'Landing Page',
      price: Math.round(subtotal / quantity),
      quantity: quantity
    };
  }

  function ecommercePayload(payload) {
    const subtotal = subtotalFromPayload(payload);
    const eventPayload = {
      currency: config.CURRENCY,
      value: subtotal,
      items: [gaItemPayload(payload)]
    };
    const transactionId = payload && (payload.transaction_id || payload.orderId);
    if (transactionId) eventPayload.transaction_id = transactionId;
    return eventPayload;
  }

  function metaPayload(payload) {
    const quantity = quantityFromPayload(payload);
    const subtotal = subtotalFromPayload(payload);
    return {
      content_name: config.PRODUCT_NAME,
      content_type: 'product',
      value: subtotal,
      currency: config.CURRENCY,
      quantity: quantity
    };
  }

  function fireOnce(key, callback) {
    if (fired.has(key)) return false;
    fired.add(key);
    callback();
    return true;
  }

  function initMetaPixel() {
    if (!config.META_PIXEL_ID || config.META_PIXEL_ID === 'META_PIXEL_ID') return;
    if (typeof window.fbq === 'function') return;
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
    window.fbq('init', config.META_PIXEL_ID);
  }

  function trackGA(eventName, payload) {
    const ecommerceEvents = new Set(['view_item', 'select_item', 'add_to_cart', 'begin_checkout', 'purchase']);
    const eventPayload = ecommerceEvents.has(eventName) ? ecommercePayload(payload) : basePayload(payload);
    if (typeof window.gtag === 'function') window.gtag('event', eventName, eventPayload);
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(ecommerceEvents.has(eventName) ? { event: eventName, ecommerce: eventPayload } : { event: eventName, ...eventPayload });
  }

  function trackMeta(eventName, payload) {
    if (typeof window.fbq === 'function') window.fbq('track', eventName, metaPayload(payload));
  }

  window.Tracking = {
    fire(name, payload) {
      const events = {
        select_item: () => fireOnce('ga4:select_item', () => trackGA('select_item', payload)),
        add_to_cart: () => fireOnce('ga4:add_to_cart', () => trackGA('add_to_cart', payload)),
        begin_checkout: () => fireOnce('ga4:begin_checkout', () => trackGA('begin_checkout', payload)),
        generate_lead: () => fireOnce('ga4:generate_lead', () => trackGA('generate_lead', payload)),
        purchase: () => fireOnce('ga4:purchase', () => trackGA('purchase', payload)),
        AddToCart: () => fireOnce('meta:AddToCart', () => trackMeta('AddToCart', payload)),
        InitiateCheckout: () => fireOnce('meta:InitiateCheckout', () => trackMeta('InitiateCheckout', payload)),
        Lead: () => fireOnce('meta:Lead', () => trackMeta('Lead', payload)),
        Purchase: () => fireOnce('meta:Purchase', () => trackMeta('Purchase', payload))
      };
      if (events[name]) events[name]();
    },
    payload: basePayload
  };

  initMetaPixel();
  fireOnce('ga4:page_view', () => trackGA('page_view'));
  fireOnce('ga4:view_item', () => trackGA('view_item'));
  fireOnce('meta:PageView', () => trackMeta('PageView'));
  fireOnce('meta:ViewContent', () => trackMeta('ViewContent'));

  // Visitor tracking
  (function () {
    const cfg = window.APP_CONFIG;
    const SUPABASE_URL = cfg.SUPABASE_URL;
    const SUPABASE_KEY = cfg.SUPABASE_ANON_KEY;
    const TRACK_URL = `${SUPABASE_URL}/functions/v1/track-visitor`;
    let sessionId = sessionStorage.getItem('lp_session_id') || 'sess_' + Math.random().toString(36).substring(2, 15) + '_' + Date.now().toString(36);
    sessionStorage.setItem('lp_session_id', sessionId);
    let hbInterval = null;
    let hidden = false;

    function send(event, extra = {}) {
      if (!SUPABASE_URL || !SUPABASE_KEY) return;
      const params = new URLSearchParams(window.location.search);
      fetch(TRACK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` },
        body: JSON.stringify({
          event, sessionId, pageUrl: location.href, pageTitle: document.title,
          referrer: document.referrer, userAgent: navigator.userAgent,
          screenResolution: `${screen.width}x${screen.height}`, viewport: `${innerWidth}x${innerHeight}`,
          landingPage: cfg.ORIGIN, timestamp: new Date().toISOString(),
          utmSource: params.get('utm_source'), utmMedium: params.get('utm_medium'),
          utmCampaign: params.get('utm_campaign'), utmContent: params.get('utm_content'),
          utmTerm: params.get('utm_term'), ...extra
        }),
        keepalive: event === 'page_hide'
      }).catch(() => {});
    }

    function startHb() { if (!hbInterval) hbInterval = setInterval(() => { if (!hidden && document.visibilityState === 'visible') send('heartbeat'); }, 30000); }
    function stopHb() { if (hbInterval) { clearInterval(hbInterval); hbInterval = null; } }
    document.addEventListener('visibilitychange', () => { hidden = document.hidden; if (hidden) { send('page_hide'); stopHb(); } else { send('page_view'); startHb(); } });
    window.addEventListener('beforeunload', () => send('page_hide'));
    window.addEventListener('pagehide', () => send('page_hide'));

    send('page_view');
    startHb();

    window.VisitorTracker = { trackEvent: send, trackEcommerce: (evt, data) => send(evt, { productName: data?.productName || cfg.PRODUCT_NAME, productPrice: data?.productPrice || cfg.PRODUCT_PRICE, orderId: data?.orderId, revenue: data?.revenue }), getSessionId: () => sessionId };
  })();
})();
