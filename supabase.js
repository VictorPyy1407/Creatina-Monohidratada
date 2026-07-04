window.SupabaseOrders = {
  async save(order) {
    const config = window.APP_CONFIG;
    if (!config.SUPABASE_URL || !config.SUPABASE_ANON_KEY || !config.SUPABASE_TABLE) {
      throw new Error('Supabase no está configurado.');
    }

    const response = await fetch(`${config.SUPABASE_URL}/rest/v1/${config.SUPABASE_TABLE}`, {
      method: 'POST',
      headers: {
        apikey: config.SUPABASE_ANON_KEY,
        Authorization: `Bearer ${config.SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal'
      },
      body: JSON.stringify(order)
    });

    if (!response.ok) {
      const message = await response.text().catch(() => '');
      throw new Error(message || 'No se pudo guardar el pedido en Supabase.');
    }

    return true;
  }
};
