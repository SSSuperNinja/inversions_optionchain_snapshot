import React from 'react';
import { 
  X, 
  FileText, 
  Activity, 
  TrendingUp, 
  Layers,
  BarChart2,
  History,
  Edit2
} from 'lucide-react';

export function DetailsPanel({ selectedItem, onClose }) {
  if (!selectedItem) return null;

  // Recuperamos los datos completos (Full Data)
  // Si el backend mandó 'fullData', lo usamos. Si no, usamos el item directo.
  const data = selectedItem.fullData || selectedItem;
  
  // Detectamos si es Opción (Hijo) mirando si tiene la propiedad 'strike'
  const isOption = data.hasOwnProperty('strike');

  // Estilos reutilizables
  const labelStyle = "text-xs font-semibold text-gray-500 uppercase tracking-wide";
  const valueStyle = "text-sm font-medium text-gray-900";
  const cardStyle = "bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-4";

  return (
    <div className="w-[350px] h-full bg-[#f5f6f7] border-l border-gray-300 flex flex-col flex-shrink-0 shadow-xl transition-all duration-300 ease-in-out font-sans">
      
      {/* --- HEADER --- */}
      <div className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-5 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isOption ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}`}>
            {isOption ? <Activity size={18} /> : <Layers size={18} />}
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-800 leading-tight">
                {isOption ? 'Contrato Opción' : 'Snapshot Header'}
            </h3>
            <p className="text-[11px] text-gray-500">
                ID: {data.id || 'N/A'}
            </p>
          </div>
        </div>
        <button 
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
        >
            <X size={18} />
        </button>
      </div>

      {/* --- CONTENIDO SCROLLABLE --- */}
      <div className="flex-grow overflow-y-auto p-5">
        
        {/* TARJETA 1: INFORMACIÓN PRINCIPAL */}
        <div className={cardStyle}>
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
                <FileText size={14} className="text-gray-400" />
                <span className="text-xs font-bold text-gray-700">DETALLES GENERALES</span>
            </div>
            
            <div className="space-y-3">
                {isOption ? (
                    <>
                        <div className="flex justify-between">
                            <span className={labelStyle}>Underlying</span>
                            <span className="font-mono text-sm">{data.option_id}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className={labelStyle}>Strike</span>
                            <span className="font-bold text-gray-900">{data.strike}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className={labelStyle}>Tipo</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${data.right === 'C' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                                {data.right === 'C' ? 'CALL' : 'PUT'}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className={labelStyle}>Expiración</span>
                            <span className={valueStyle}>
                                {data.expiration ? new Date(data.expiration).toLocaleDateString() : '-'}
                            </span>
                        </div>
                    </>
                ) : (
                    <>
                         <div className="flex justify-between">
                            <span className={labelStyle}>Snapshot ID</span>
                            <span className="font-mono text-sm font-bold">{data.snapshot_id}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className={labelStyle}>Underlying</span>
                            <span className="font-mono text-sm">{data.underlying_id}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className={labelStyle}>Fecha</span>
                            <span className={valueStyle}>
                                {data.ts ? new Date(data.ts).toLocaleDateString() : '-'}
                            </span>
                        </div>
                         <div className="flex justify-between">
                            <span className={labelStyle}>Hora</span>
                            <span className={valueStyle}>
                                {data.ts ? new Date(data.ts).toLocaleTimeString() : '-'}
                            </span>
                        </div>
                    </>
                )}
            </div>
        </div>

        {/* TARJETA 2: MERCADO (Solo si es Opción) */}
        {isOption && (
            <div className={cardStyle}>
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
                    <TrendingUp size={14} className="text-gray-400" />
                    <span className="text-xs font-bold text-gray-700">MERCADO</span>
                </div>
                <div className="space-y-3">
                    <div className="flex justify-between items-center">
                        <span className={labelStyle}>Bid</span>
                        <span className="text-green-700 font-mono font-bold">{data.bid}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className={labelStyle}>Ask</span>
                        <span className="text-red-700 font-mono font-bold">{data.ask}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className={labelStyle}>Volatilidad (IV)</span>
                        <span className="text-gray-600 font-mono">{data.iv}%</span>
                    </div>
                </div>
            </div>
        )}

        {/* TARJETA 3: GRIEGAS (Solo si es Opción) */}
        {isOption && (
            <div className={cardStyle}>
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
                    <BarChart2 size={14} className="text-gray-400" />
                    <span className="text-xs font-bold text-gray-700">GRIEGAS (RIESGO)</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div className="p-2 bg-gray-50 rounded border border-gray-100 text-center">
                        <div className="text-[10px] text-gray-400 uppercase">Delta</div>
                        <div className="font-bold text-blue-600">{data.delta}</div>
                    </div>
                    <div className="p-2 bg-gray-50 rounded border border-gray-100 text-center">
                        <div className="text-[10px] text-gray-400 uppercase">Gamma</div>
                        <div className="font-bold text-blue-600">{data.gamma}</div>
                    </div>
                    <div className="p-2 bg-gray-50 rounded border border-gray-100 text-center">
                        <div className="text-[10px] text-gray-400 uppercase">Theta</div>
                        <div className="font-bold text-blue-600">{data.theta}</div>
                    </div>
                    <div className="p-2 bg-gray-50 rounded border border-gray-100 text-center">
                        <div className="text-[10px] text-gray-400 uppercase">Vega</div>
                        <div className="font-bold text-blue-600">{data.vega}</div>
                    </div>
                </div>
            </div>
        )}

      </div>

      {/* --- FOOTER --- */}
      <div className="p-4 bg-white border-t border-gray-200 flex justify-end gap-2 flex-shrink-0">
         <button className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors">
            <History size={14} /> Historial
         </button>
         <button className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors shadow-sm">
            <Edit2 size={14} /> Editar
         </button>
      </div>

    </div>
  );
}