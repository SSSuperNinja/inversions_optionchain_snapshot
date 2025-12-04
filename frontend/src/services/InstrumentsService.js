// frontend/src/services/InstrumentsService.js

const INSTRUMENTS_BASE_URL =
  'http://localhost:3030/odata/v4/catalog/Instruments';
const LOGIN_URL = 'http://localhost:3030/api/auth/login';

class InstrumentsService {
  constructor() {
    this.token = null;
    this.tokenExpiry = null;
  }

  /**
   * Login para obtener el token
   * Devuelve:
   *   - token (string) en caso de éxito
   *   - null en caso de error
   */
  async login(email = 'prueba@gmail.com', password = '12345') {
    try {
      const response = await fetch(LOGIN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        console.error('❌ Login failed status:', response.status);
        return null;
      }

      const data = await response.json();
      this.token = data.token;
      // Expira en 1 hora por defecto (ajusta si tu backend da expiry)
      this.tokenExpiry = Date.now() + 60 * 60 * 1000;

      localStorage.setItem('auth_token', this.token);
      localStorage.setItem('auth_token_expiry', String(this.tokenExpiry));

      console.log('✅ Login exitoso, token obtenido');
      return this.token;
    } catch (error) {
      console.error('❌ Error en login:', error);
      return null;
    }
  }

  // Verificar si el token es válido (memoria + localStorage)
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
      const hasIb = obj.some(
        (item) =>
          item &&
          (item.ib_conid != null ||
            item.IB_CONID != null ||
            item.conid != null)
      );
      if (hasIb) return obj;
    } else if (typeof obj === 'object') {
      for (const k of Object.keys(obj)) {
        try {
          const res = this.findArrayWithIbConid(obj[k]);
          if (res) return res;
        } catch (e) {
          // ignorar errores puntuales
        }
      }
    }
    return null;
  }

  async getInstrumentsRaw() {
    try {
      // Asegurar token
      if (!this.isTokenValid()) {
        console.log('🔐 Token no válido o inexistente, haciendo login...');
        const token = await this.login();
        if (!token) {
          console.warn('⚠ Login falló; getInstruments abortado');
          return [];
        }
      }

      // Usa los mismos params que tu back de ejemplo (ajusta si hace falta)
      const params = new URLSearchParams({
        ProcessType: 'getsome',
        dbServer: 'MongoDB',
        LoggedUser: 'test@example.com'
      });

      const url = `${INSTRUMENTS_BASE_URL}?${params.toString()}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          // cabecera que tú mencionaste
          'x-session-token': this.token
        }
      });

      if (!response.ok) {
        const text = await response.text();
        console.error(
          '❌ HTTP Error al obtener instruments:',
          response.status,
          text
        );
        // Si regresa 401 -> intentar login una vez más
        if (response.status === 401) {
          console.log('🔄 Token expirado, renovando login...');
          const token = await this.login();
          if (token) return this.getInstrumentsRaw();
        }
        return [];
      }

      const json = await response.json();
      console.log('🔍 Respuesta completa instruments:', json);

      let instrumentsArray = [];

      // Estructura tipo:
      // {
      //   "@odata.context": "...",
      //   "value": [
      //     {
      //       data: [ { dataRes: [ ... ] } ]
      //     }
      //   ]
      // }
      if (json.value && Array.isArray(json.value) && json.value.length > 0) {
        const first = json.value[0];

        // 1) value[0].data[0].dataRes
        if (Array.isArray(first.data) && first.data.length > 0) {
          if (
            first.data.length === 1 &&
            Array.isArray(first.data[0].dataRes) &&
            first.data[0].dataRes.length > 0
          ) {
            console.log(
              '✅ Encontrado instruments en value[0].data[0].dataRes'
            );
            instrumentsArray = first.data[0].dataRes;
          } else {
            // 2) value[0].data directo
            const mayBeInstruments = first.data;
            const hasIb = mayBeInstruments.some(
              (it) =>
                it &&
                (it.ib_conid != null ||
                  it.IB_CONID != null ||
                  it.conid != null)
            );
            if (hasIb) {
              console.log('✅ Encontrado instruments en value[0].data (directo)');
              instrumentsArray = mayBeInstruments;
            }
          }
        }

        // 3) value[0].dataRes directo
        if (
          instrumentsArray.length === 0 &&
          Array.isArray(first.dataRes) &&
          first.dataRes.length > 0
        ) {
          console.log('✅ Encontrado instruments en value[0].dataRes');
          instrumentsArray = first.dataRes;
        }

        // 4) Búsqueda recursiva como último recurso
        if (instrumentsArray.length === 0) {
          const foundRec = this.findArrayWithIbConid(json);
          if (foundRec && foundRec.length > 0) {
            console.log(
              '✅ Encontrado instruments por búsqueda recursiva en el JSON'
            );
            instrumentsArray = foundRec;
          }
        }
      } else {
        console.warn('⚠ Respuesta OData inesperada o value vacío:', json);
      }

      console.log('🔍 instrumentsArray final extraído:', instrumentsArray);
      return instrumentsArray || [];
    } catch (error) {
      console.error('❌ Error en getInstrumentsRaw:', error);
      return [];
    }
  }

  /**
   * Versión simplificada: regresa SOLO los ib_conid (números),
   * que es lo que tú usas como underlying_id en el combo de PADRES.
   */
  async getInstruments() {
    const instruments = await this.getInstrumentsRaw();

    if (!Array.isArray(instruments) || instruments.length === 0) {
      return [];
    }

    const ids = instruments
      .map((raw) => {
        const possibleIb =
          raw?.ib_conid ?? raw?.IB_CONID ?? raw?.conid ?? raw?.id ?? raw?.ID;
        if (possibleIb == null) return null;
        const num = Number(possibleIb);
        return isNaN(num) ? null : num;
      })
      .filter((v) => v != null);

    console.log('🎯 ib_conid extraídos para underlyingOptions:', ids);
    return ids;
  }

  /**
   * Versión “bonita” para ComboBox:
   * devuelve objetos { id, text, rawInstrument }
   */
  async getInstrumentsForComboBox() {
    const instruments = await this.getInstrumentsRaw();

    console.log('🔍 Instruments crudos recibidos para ComboBox:', instruments);

    if (!Array.isArray(instruments) || instruments.length === 0) {
      console.warn(
        '⚠ No hay instruments crudos -> devolver array vacío (sin mocks).'
      );
      return [];
    }

    const formattedInstruments = instruments
      .map((instrument, idx) => {
        const raw = instrument || {};
        const possibleIb =
          raw.ib_conid ?? raw.IB_CONID ?? raw.conid ?? raw.id ?? raw.ID;

        if (possibleIb == null) {
          console.warn(
            `⚠ Instrumento ${idx} no contiene ib_conid, se omitirá:`,
            raw
          );
          return null;
        }

        const id = Number(possibleIb);
        if (isNaN(id)) {
          console.warn(
            `⚠ Instrumento ${idx} ib_conid no numérico, se omitirá:`,
            possibleIb
          );
          return null;
        }

        // Construir texto de display con tolerancia
        const symbol =
          raw.symbol ??
          raw.ticker ??
          raw.name ??
          raw.instrumentName ??
          raw.description ??
          'Sin símbolo';

        const exchange = raw.exchange ? ` / ${raw.exchange}` : '';
        const display = `${symbol}${exchange} (${id})`;

        console.log('🔍 Procesando instrumento:', {
          idx,
          id,
          symbol,
          display,
          raw
        });

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

// Instancia única
const instrumentsService = new InstrumentsService();

/**
 * Función de login compatible con tu App.jsx:
 *   const token = await login('correo','pass');
 */
export async function login(email, password) {
  return instrumentsService.login(email, password);
}

/**
 * Función compatible con tu App.jsx:
 *   const instruments = await getInstruments(token);
 * El token se usa para “sembrar” la instancia, pero si ya hay token interno
 * igual funciona sin parámetro.
 */
export async function getInstruments(externalToken) {
  if (externalToken) {
    instrumentsService.token = externalToken;
  }
  return instrumentsService.getInstruments();
}

// Extra por si luego quieres textos bonitos en combo
export async function getInstrumentsForComboBox() {
  return instrumentsService.getInstrumentsForComboBox();
}

export default instrumentsService;