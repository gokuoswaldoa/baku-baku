import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  getStoredLeads,
  updateLeadStatus,
  deleteLead,
  exportLeadsToCSV,
  getRemoteLeads
} from '../utils/storage';
import { isSupabaseConfigured } from '../utils/supabase';
import { WhatsAppIcon } from './Icons';
import BakuLogo from './BakuLogo';
import {
  X,
  Download,
  Trash2,
  Settings,
  Search,
  RefreshCw,
  Database
} from 'lucide-react';

export default function AdminModal({ isOpen, onClose }) {
  const [leads, setLeads] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('todos');
  const [showConfig, setShowConfig] = useState(false);
  const [remoteError, setRemoteError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    setRemoteError('');
    try {
      const freshLeads = await getRemoteLeads();
      setLeads(freshLeads || []);
    } catch (err) {
      setRemoteError(err.message || 'Error al conectar con la base de datos');
      setLeads(getStoredLeads());
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleStatusChange = async (id, newStatus) => {
    setLeads((prev) => prev.map((item) => (item.id === id ? { ...item, status: newStatus } : item)));
    await updateLeadStatus(id, newStatus);
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Seguro que deseas eliminar este registro?')) {
      setLeads((prev) => prev.filter((item) => item.id !== id));
      await deleteLead(id);
    }
  };

  const filteredLeads = leads.filter((item) => {
    const matchesSearch =
      (item.whatsapp || '').includes(searchTerm) ||
      (item.couponCode || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'todos' || item.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const totalWithPhone = leads.filter((l) => l.whatsapp).length;
  const totalRedeemed = leads.filter((l) => l.status === 'canjeado').length;
  const surveyUrl = `${window.location.origin}/`;

  const createWhatsAppUrl = (lead) => {
    const phone = (lead.whatsapp || '').replace(/[^0-9]/g, '');
    const cleanPhone = phone.length === 10 ? `52${phone}` : phone;
    const message = encodeURIComponent(
      `Hola! Muchas gracias por participar en la encuesta de BAKU-BAKU SUSHI & FIRE. Te comparto nuestro menú oficial para entregas en la colonia. Recuerda que tienes tu beneficio de fundador: $40 MXN de descuento en tu primer pedido mayor a $180 con tu código personal: ${lead.couponCode}. ¿Te gustaría revisar las opciones disponibles hoy?`
    );
    return `https://wa.me/${cleanPhone}?text=${message}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-baku-carbon/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-baku-white border border-baku-border w-full max-w-3xl rounded-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-baku-border flex items-center justify-between bg-baku-ivory">
          <div className="flex items-center gap-3">
            <BakuLogo size="header" />
            <div>
              <h2 className="text-base font-extrabold text-baku-carbon flex items-center gap-2">
                Base de Datos y Control de Cupones
              </h2>
              <p className="text-xs text-baku-neutral">
                Gestión directa de fundadores y clientes potenciales de BAKU-BAKU
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
              isSupabaseConfigured 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}>
              <Database className="w-3 h-3" />
              {isSupabaseConfigured ? 'Supabase Conectado' : 'Modo Local'}
            </span>
            <button
              onClick={loadData}
              disabled={isLoading}
              className="p-2 rounded-lg bg-white hover:bg-baku-subtle text-baku-carbon transition-colors border border-baku-border cursor-pointer disabled:opacity-50"
              title="Recargar datos de la nube"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setShowConfig(!showConfig)}
              className="p-2 rounded-lg bg-white hover:bg-baku-subtle text-baku-carbon transition-colors border border-baku-border"
              title="Información de base de datos"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-white hover:bg-baku-subtle text-baku-carbon transition-colors border border-baku-border"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Database Config Drawer */}
        {showConfig && (
          <div className="p-4 bg-baku-tint border-b border-baku-border animate-slide-up text-xs">
            <div className="flex items-start justify-between">
              <div>
                <span className="font-extrabold text-baku-carbon block">Estado de la Base de Datos (Supabase)</span>
                <span className="text-baku-neutral">
                  {isSupabaseConfigured
                    ? 'Tus variables VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY están activas. Las respuestas se sincronizan en tiempo real en la nube.'
                    : 'Para conectar con Supabase en Vercel o localmente, agrega las variables VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en tu archivo .env o en el panel de Vercel.'}
                </span>
              </div>
            </div>
            {remoteError && <p className="mt-2 text-xs font-semibold text-baku-red">{remoteError}</p>}
          </div>
        )}

        {/* Metric Cards */}
        <div className="p-4 border-b border-baku-border grid grid-cols-3 gap-3 bg-baku-ivory/50 text-center">
          <div className="p-3 rounded-xl bg-white border border-baku-border shadow-sm">
            <span className="text-xs text-baku-neutral font-semibold block mb-0.5">Total Respuestas</span>
            <span className="text-xl font-black text-baku-carbon">{leads.length}</span>
          </div>

          <div className="p-3 rounded-xl bg-white border border-baku-border shadow-sm">
            <span className="text-xs text-baku-neutral font-semibold block mb-0.5">Con WhatsApp</span>
            <span className="text-xl font-black text-emerald-600">{totalWithPhone}</span>
          </div>

          <div className="p-3 rounded-xl bg-white border border-baku-border shadow-sm">
            <span className="text-xs text-baku-neutral font-semibold block mb-0.5">Cupones Canjeados</span>
            <span className="text-xl font-black text-baku-orange">{totalRedeemed}</span>
          </div>
        </div>

        <div className="mx-4 mt-4 rounded-2xl border border-baku-orange/40 bg-baku-tint p-4 flex flex-col sm:flex-row items-center gap-4">
          <div className="shrink-0 rounded-xl bg-white p-2 shadow-sm">
            <QRCodeSVG
              value={surveyUrl}
              size={132}
              bgColor="#ffffff"
              fgColor="#1f1f1f"
              level="M"
              includeMargin
              title="Código QR para abrir la encuesta BAKU-BAKU"
            />
          </div>
          <div className="text-center sm:text-left">
            <h3 className="text-sm font-extrabold text-baku-carbon">Comparte la encuesta</h3>
            <p className="mt-1 text-xs leading-relaxed text-baku-neutral">
              Muestra este código desde tu teléfono para que tus vecinos lo escaneen y entren directamente a la encuesta.
            </p>
            <p className="mt-2 break-all rounded-lg bg-white/70 px-2.5 py-1.5 font-mono text-[10px] text-baku-carbon">
              {surveyUrl}
            </p>
          </div>
        </div>

        {/* Filter and Export Bar */}
        <div className="p-3 border-b border-baku-border flex flex-wrap items-center justify-between gap-2 bg-baku-white">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-baku-neutral" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por teléfono o cupón..."
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-baku-ivory border border-baku-border text-xs text-baku-carbon placeholder-baku-neutral/60 focus:outline-none focus:border-baku-orange"
              />
            </div>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-baku-ivory border border-baku-border text-xs text-baku-carbon focus:outline-none focus:border-baku-orange"
            >
              <option value="todos">Todos los estados</option>
              <option value="pendiente">Pendientes</option>
              <option value="contactado">Contactados</option>
              <option value="canjeado">Canjeados</option>
            </select>
          </div>

          <button
            onClick={() => exportLeadsToCSV(leads)}
            disabled={leads.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-baku-carbon hover:bg-black text-white text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-baku-orange" />
            <span>Descargar CSV</span>
          </button>
        </div>

        {/* Leads Table / List */}
        <div className="flex-1 overflow-y-auto p-4 divide-y divide-baku-border">
          {filteredLeads.length === 0 ? (
            <div className="text-center py-12 text-baku-neutral text-xs">
              No se han registrado clientes potenciales con los filtros actuales.
            </div>
          ) : (
            filteredLeads.map((lead) => (
              <div key={lead.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-baku-carbon text-sm">
                      {lead.whatsapp ? `+52 ${lead.whatsapp}` : 'Sin número ingresado'}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-baku-tint border border-baku-orange/40 text-baku-orange font-mono font-bold text-[11px]">
                      {lead.couponCode}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                        lead.status === 'canjeado'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                          : lead.status === 'contactado'
                          ? 'bg-blue-50 text-blue-700 border border-blue-300'
                          : 'bg-amber-50 text-amber-700 border border-amber-300'
                      }`}
                    >
                      {lead.status}
                    </span>
                  </div>

                  <p className="text-baku-neutral">
                    <strong className="text-baku-carbon font-semibold">Cena:</strong> {lead.dinnerPreference === 'Otro antojo' ? lead.otherDinner || 'Otro' : lead.dinnerPreference || 'N/A'} • <strong className="text-baku-carbon font-semibold">Presupuesto:</strong> {lead.budget || 'N/A'} • <strong className="text-baku-carbon font-semibold">Ingredientes:</strong> {(lead.ingredients || []).join(', ') || 'N/A'}
                  </p>

                  <span className="text-[10px] text-baku-neutral/80 block">
                    Registrado: {lead.formattedDate || lead.createdAt}
                  </span>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <select
                    value={lead.status}
                    onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                    className="px-2 py-1 rounded bg-baku-ivory border border-baku-border text-[11px] text-baku-carbon focus:outline-none"
                  >
                    <option value="pendiente">Pendiente</option>
                    <option value="contactado">Contactado</option>
                    <option value="canjeado">Canjeado</option>
                  </select>

                  {lead.whatsapp && (
                    <a
                      href={createWhatsAppUrl(lead)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] transition-colors"
                      title="Enviar menú y cupón personalizado a este contacto"
                    >
                      <WhatsAppIcon className="w-3.5 h-3.5" />
                      <span>Enviar Menú</span>
                    </a>
                  )}

                  <button
                    onClick={() => handleDelete(lead.id)}
                    className="p-1.5 rounded bg-baku-ivory hover:bg-red-50 text-baku-neutral hover:text-baku-red transition-colors border border-baku-border"
                    title="Eliminar registro"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer info */}
        <div className="px-5 py-3 border-t border-baku-border bg-baku-ivory flex items-center justify-between text-[11px] text-baku-neutral">
          <span>Los datos se guardan de forma segura en este navegador.</span>
          <span>Beneficio: $40 MXN en consumo mayor a $180 MXN</span>
        </div>
      </div>
    </div>
  );
}
