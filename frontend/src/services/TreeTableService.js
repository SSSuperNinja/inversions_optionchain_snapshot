// src/services/TreeTableService.js

// URL del servicio CAP (router: /api/chain/snapshot, action: crud)
const BASE_URL = 'http://localhost:4004/api/chain/snapshot/crud';

export const TreeTableService = {
  // ===== GET ALL =====
  async getHierarchy() {
    try {
      const params = new URLSearchParams({
        ProcessType: 'GetAll',
        dbServer: 'MongoDB',
        User: 'Admin'
      });

      const url = `${BASE_URL}?${params.toString()}`;
      console.log('🌐 Llamando GETALL a:', url);

      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}) // sin payload
      });

      const text = await resp.text();
      console.log('📥 Respuesta cruda GETALL:', resp.status, text);

      if (!resp.ok) {
        throw new Error(`Error HTTP ${resp.status}: ${text}`);
      }

      let json;
      try {
        json = JSON.parse(text);
      } catch (e) {
        console.error('❌ No se pudo parsear la respuesta como JSON');
        throw e;
      }

      const value = json.value || json || [];
      console.log('✅ Datos parseados GETALL:', value);
      return value;
    } catch (error) {
      console.error('❌ Error en getHierarchy:', error);
      return [];
    }
  },

  // ===== CREATE PADRE =====
  async createSnapshot(snapshot) {
    const params = new URLSearchParams({
      ProcessType: 'CreateSnapshot',
      dbServer: 'MongoDB',
      User: 'Admin'
    });

    const url = `${BASE_URL}?${params.toString()}`;
    console.log('🌐 CreateSnapshot =>', url, snapshot);

    const body = {
      snapshot_id: Number(snapshot.snapshot_id),
      underlying_id: Number(snapshot.underlying_id),
      ts: snapshot.ts
    };

    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const text = await resp.text();
    console.log('📥 Respuesta CreateSnapshot:', resp.status, text);

    if (!resp.ok) {
      throw new Error(`Error HTTP ${resp.status}: ${text}`);
    }

    return true;
  },

  // ===== CREATE HIJO =====
  async createItem(item) {
    const params = new URLSearchParams({
      ProcessType: 'CreateSnapshotItem',
      dbServer: 'MongoDB',
      User: 'Admin'
    });

    const url = `${BASE_URL}?${params.toString()}`;
    console.log('🌐 CreateSnapshotItem =>', url, item);

    const body = {
      snapshot_id: Number(item.snapshot_id),
      option_id: Number(item.option_id),
      strike: item.strike ? Number(item.strike) : undefined,
      right: item.right,
      expiration: item.expiration || undefined,
      bid: item.bid ? Number(item.bid) : undefined,
      ask: item.ask ? Number(item.ask) : undefined,
      iv: item.iv ? Number(item.iv) : undefined,
      delta: item.delta ? Number(item.delta) : undefined,
      gamma: item.gamma ? Number(item.gamma) : undefined,
      theta: item.theta ? Number(item.theta) : undefined,
      vega: item.vega ? Number(item.vega) : undefined
    };

    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const text = await resp.text();
    console.log('📥 Respuesta CreateSnapshotItem:', resp.status, text);

    if (!resp.ok) {
      throw new Error(`Error HTTP ${resp.status}: ${text}`);
    }

    return true;
  },

  // ===== DELETE PADRE + HIJOS =====
  async deleteSnapshot(snapshot_id, underlying_id) {
    const params = new URLSearchParams({
      ProcessType: 'DeleteSnapshot',
      dbServer: 'MongoDB',
      User: 'Admin'
    });

    const url = `${BASE_URL}?${params.toString()}`;
    console.log('🌐 DeleteSnapshot =>', url, { snapshot_id, underlying_id });

    const body = { snapshot_id, underlying_id };

    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const text = await resp.text();
    console.log('📥 Respuesta DeleteSnapshot:', resp.status, text);

    if (!resp.ok) {
      throw new Error(`Error HTTP ${resp.status}: ${text}`);
    }

    return true;
  },

  // ===== DELETE HIJO =====
  async deleteItem(item_id) {
    const params = new URLSearchParams({
      ProcessType: 'DeleteSnapshotItem',
      dbServer: 'MongoDB',
      User: 'Admin'
    });

    const url = `${BASE_URL}?${params.toString()}`;
    console.log('🌐 DeleteSnapshotItem =>', url, { item_id });

    const body = { item_id };

    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const text = await resp.text();
    console.log('📥 Respuesta DeleteSnapshotItem:', resp.status, text);

    if (!resp.ok) {
      throw new Error(`Error HTTP ${resp.status}: ${text}`);
    }

    return true;
  }
};
