// src/services/InstrumentsService.js

const AUTH_URL = 'http://localhost:3333/api/auth/login';
const INSTRUMENTS_URL = 'http://localhost:3333/odata/v4/catalog/Instruments';

/**
 * Login para obtener el token de sesión.
 */
export async function login(email, password) {
  try {
    const resp = await fetch(AUTH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });

    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status}`);
    }

    const data = await resp.json();
    return data.token;
  } catch (err) {
    console.error('❌ Error en login Instruments:', err);
    return null;
  }
}

/**
 * Llama a /Instruments usando el token y regresa un array
 * con los IDs que vamos a usar en el ComboBox (ib_conid).
 */
export async function getInstruments(sessionToken) {
  if (!sessionToken) {
    console.warn('⚠️ getInstruments llamado sin token');
    return [];
  }

  try {
    const params = new URLSearchParams({
      ProcessType: 'getsome',
      dbServer: 'MongoDB',
      LoggedUser: 'test@example.com'
    });

    const resp = await fetch(`${INSTRUMENTS_URL}?${params.toString()}`, {
      method: 'GET',
      headers: {
        'x-session-token': sessionToken,
        Accept: 'application/json'
      }
    });

    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status}`);
    }

    const json = await resp.json();

    // === DESANIDAR ESTRUCTURA ===
    // json.value[0].data[0].dataRes -> array de instrumentos
    const valueArr = Array.isArray(json.value) ? json.value : [];
    const dataArr = valueArr[0]?.data;
    const inner = Array.isArray(dataArr) ? dataArr[0] : null;
    const dataRes = Array.isArray(inner?.dataRes) ? inner.dataRes : [];

    // Ahora sí, extraemos los ib_conid
    const instruments = dataRes
      .map((item) => item.ib_conid) // <<--- aquí está el ID que mandaste
      .filter((v) => v !== undefined && v !== null);

    console.log('🎯 Instruments para ComboBox (ib_conid):', instruments);

    return instruments;
  } catch (err) {
    console.error('❌ Error en getInstruments:', err);
    return [];
  }
}
