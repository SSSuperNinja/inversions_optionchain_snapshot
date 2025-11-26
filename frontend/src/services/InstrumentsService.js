// frontend/src/services/InstrumentsService.js

const INSTRUMENTS_BASE_URL = 'http://localhost:3030/odata/v4/catalog/Instruments';
const LOGIN_URL = 'http://localhost:3030/api/auth/login';

class InstrumentsService {
  constructor() {
    this.token = null;
    this.tokenExpiry = null;
  }

  // Login para obtener el token
  async login() {
    try {
      const response = await fetch(LOGIN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: "prueba@gmail.com",
          password: "12345"
        })
      });

      if (!response.ok) {
        console.error('❌ Login failed status:', response.status);
        return false;
      }

      const data = await response.json();
      this.token = data.token;
      // Expira en 1 hora por defecto (ajusta si tu backend da expiry)
      this.tokenExpiry = Date.now() + (60 * 60 * 1000);

      localStorage.setItem('auth_token', this.token);
      localStorage.setItem('auth_token_expiry', String(this.tokenExpiry));

      console.log('✅ Login exitoso, token obtenido');
      return true;
    } catch (error) {
      console.error('❌ Error en login:', error);
      return false;
    }
  }

  // Verificar si el token es válido
  isTokenValid() {
    if (!this.token) {
      const storedToken = localStorage.getItem('auth_token');
      const storedExpiry = localStorage.getItem('auth_token_expiry');
      if (storedToken && storedExpiry) {
        this.token = storedToken;
        this.tokenExpiry = parseInt(storedExpiry, 10);
      }
    }
    return !!this.token && !!this.tokenExpiry && Date.now() < this.tokenExpiry;
  }

  // Helper: buscar recursivamente el primer array con objetos que tengan ib_conid
  findArrayWithIbConid(obj) {
    if (!obj) return null;
    if (Array.isArray(obj)) {
      const hasIb = obj.some(item => item && (item.ib_conid != null || item.IB_CONID != null || item.conid != null));
      if (hasIb) return obj;
    } else if (typeof obj === 'object') {
      for (const k of Object.keys(obj)) {
        try {
          const res = this.findArrayWithIbConid(obj[k]);
          if (res) return res;
        } catch (e) {
          // ignorar
        }
      }
    }
    return null;
  }

  // Obtener instruments con manejo de autenticación (robusto)
  async getInstruments() {
    try {
      if (!this.isTokenValid()) {
        console.log('🔐 Token no válido o inexistente, haciendo login...');
        const ok = await this.login();
        if (!ok) {
          console.warn('⚠ Login falló; getInstruments abortado');
          return [];
        }
      }

      const params = new URLSearchParams({
        ProcessType: 'GetAll',
        dbServer: 'MongoDB'
      });

      const url = `${INSTRUMENTS_BASE_URL}?${params.toString()}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-Token': this.token
        }
      });

      if (!response.ok) {
        console.error('❌ HTTP Error al obtener instruments:', response.status, await response.text());
        // Si regresa 401 -> intentar login una vez más
        if (response.status === 401) {
          console.log('🔄 Token expirado, renovando login...');
          const ok = await this.login();
          if (ok) return this.getInstruments();
        }
        return [];
      }

      const json = await response.json();
      console.log('🔍 Respuesta completa instruments:', json);

      let instrumentsArray = [];

      // 1) Caso: value[0].data es directamente un array de instrumentos
      if (json.value && Array.isArray(json.value) && json.value.length > 0) {
        const first = json.value[0];

        // direct data array (ej: value[0].data = [ {ib_conid:...}, ... ])
        if (Array.isArray(first.data) && first.data.length > 0) {
          // si first.data[0] es el objeto wrapper y contiene dataRes, usar dataRes
          if (first.data.length === 1 && Array.isArray(first.data[0].dataRes) && first.data[0].dataRes.length > 0) {
            console.log("✅ Encontrado instruments en value[0].data[0].dataRes");
            instrumentsArray = first.data[0].dataRes;
          } else {
            // Si data contiene directamente instrumentos
            const mayBeInstruments = first.data;
            const hasIb = mayBeInstruments.some(it => it && (it.ib_conid != null || it.IB_CONID != null || it.conid != null));
            if (hasIb) {
              console.log("✅ Encontrado instruments en value[0].data (directo)");
              instrumentsArray = mayBeInstruments;
            }
          }
        }

        // 2) Caso: value[0].dataRes directamente
        if (instrumentsArray.length === 0 && Array.isArray(first.dataRes) && first.dataRes.length > 0) {
          console.log("✅ Encontrado instruments en value[0].dataRes");
          instrumentsArray = first.dataRes;
        }

        // 3) Si aún vacío, buscar recursivamente en todo el objeto
        if (instrumentsArray.length === 0) {
          const foundRec = this.findArrayWithIbConid(json);
          if (foundRec && foundRec.length > 0) {
            console.log("✅ Encontrado instruments por búsqueda recursiva");
            instrumentsArray = foundRec;
          }
        }
      } else {
        console.warn('⚠ Respuesta OData inesperada o value vacío:', json);
      }

      console.log('🔍 instrumentsArray final extraído:', instrumentsArray);
      return instrumentsArray || [];
    } catch (error) {
      console.error('❌ Error en getInstruments:', error);
      return [];
    }
  }

  // Mapear para ComboBox (sin mocks)
  async getInstrumentsForComboBox() {
    const instruments = await this.getInstruments();

    console.log('🔍 Instruments crudos recibidos para ComboBox:', instruments);

    if (!Array.isArray(instruments) || instruments.length === 0) {
      console.warn('⚠ No hay instruments crudos -> devolver array vacío (sin mocks).');
      return [];
    }

    const formattedInstruments = instruments
      .map((instrument, idx) => {
        const raw = instrument || {};
        const possibleIb = raw.ib_conid ?? raw.IB_CONID ?? raw.conid ?? raw.id ?? raw.ID;

        if (possibleIb == null) {
          console.warn(`⚠️ Instrumento ${idx} no contiene ib_conid, se omitirá:`, raw);
          return null;
        }

        const id = Number(possibleIb);
        if (isNaN(id)) {
          console.warn(`⚠️ Instrumento ${idx} ib_conid no numérico, se omitirá:`, possibleIb);
          return null;
        }

        // Construir texto de display con tolerancia
        const symbol = raw.symbol ?? raw.ticker ?? raw.name ?? raw.instrumentName ?? raw.description ?? 'Sin símbolo';
        const exchange = raw.exchange ? ` / ${raw.exchange}` : '';
        const display = `${symbol}${exchange} (${id})`;

        console.log('🔍 Procesando instrumento:', { idx, id, symbol, display, raw });

        return {
          id,
          text: display,
          rawInstrument: raw
        };
      })
      .filter(Boolean);

    console.log('🔍 Instruments formateados:', formattedInstruments);
    return formattedInstruments;
  }
}

export default new InstrumentsService();
