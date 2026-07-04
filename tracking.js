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
    const eventPayload = basePayload(payload);
    if (typeof window.gtag === 'function') window.gtag('event', eventName, eventPayload);
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: eventName, ...eventPayload });
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
        AddToCart: () => fireOnce('meta:AddToCart', () => trackMeta('AddToCart', payload)),
        InitiateCheckout: () => fireOnce('meta:InitiateCheckout', () => trackMeta('InitiateCheckout', payload)),
        Lead: () => fireOnce('meta:Lead', () => trackMeta('Lead', payload))
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
})();
