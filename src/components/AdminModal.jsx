import React, { useState, useEffect } from 'react';
import {
  getStoredLeads,
  updateLeadStatus,
  deleteLead,
  exportLeadsToCSV,
  getWebhookUrl,
  saveWebhookUrl
} from '../utils/storage';
import { WhatsAppIcon, FlameSphereIcon } from './Icons';
import {
  X,
  Download,
  Trash2,
  CheckCircle2,
  Clock,
  Send,
  Phone,
  Tag,
  Settings,
  HelpCircle,
  Search,
  ExternalLink
} from 'lucide-react';

export default function AdminModal({ isOpen, onClose }) {
  const [leads, setLeads] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('todos');
  const [showWebhookConfig, setShowWebhookConfig] = useState(false);
  const [webhookUrl, setWebhookUrlState] = useState('');
  const [webhookSaved, setWebhookSaved] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLeads(getStoredLeads());
      setWebhookUrlState(getWebhookUrl());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleStatusChange = (id, newStatus) => {
    const updated = updateLeadStatus(id, newStatus);
    setLeads(updated);
  };

  const handleDelete = (id) => {
    if (window.confirm('¿Seguro que deseas eliminar este registro?')) {
      const updated = deleteLead(id);
      setLeads(updated);
    }
  };

  const handleSaveWebhook = (e) => {
    e.preventDefault();
    saveWebhookUrl(webhookUrl);
    setWebhookSaved(true);
    setTimeout(() => setWebhookSaved(false), 2500);
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

  const createWhatsAppUrl = (lead) => {
    const phone = (lead.whatsapp || '').replace(/[^0-9]/g, '');
    const cleanPhone = phone.length === 10 ? `52${phone}` : phone;
    const message = encodeURIComponent(
      `Hola! Muchas gracias por participar en la encuesta de Bolas de Fuego. Te comparto nuestro menú digital para entregas en la colonia. Recuerda que tienes tu beneficio de fundador: $40 MXN de descuento en tu primer pedido mayor a $180 presentando tu código personal: ${lead.couponCode}. ¿Te gustaría revisar las opciones disponibles hoy?`
    );
    return `https://wa.me/${cleanPhone}?text=${message}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-charcoal-900 border border-charcoal-700 w-full max-w-3xl rounded-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-charcoal-800 flex items-center justify-between bg-charcoal-950">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-fire-500/10 border border-fire-500/30 flex items-center justify-center">
              <FlameSphereIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Base de Datos y Control de Cupones
              </h2>
              <p className="text-xs text-neutral-400">
                Gestión directa de fundadores y clientes potenciales
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowWebhookConfig(!showWebhookConfig)}
              className="p-2 rounded-lg bg-charcoal-800 hover:bg-charcoal-700 text-neutral-300 hover:text-white transition-colors"
              title="Configurar conexión con Google Sheets"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-charcoal-800 hover:bg-charcoal-700 text-neutral-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Webhook Drawer (Optional Google Sheet integration) */}
        {showWebhookConfig && (
          <div className="p-4 bg-charcoal-950 border-b border-charcoal-800 animate-slide-up text-xs">
            <div className="flex items-start justify-between mb-2">
              <div>
                <span className="font-bold text-white block">Sincronización con Google Sheets (Opcional)</span>
                <span className="text-neutral-400">
                  Pega aquí la URL de tu Google Apps Script si deseas que cada respuesta se guarde automáticamente en una hoja de cálculo en la nube.
                </span>
              </div>
            </div>
            <form onSubmit={handleSaveWebhook} className="flex gap-2 mt-2">
              <input
                type="url"
                value={webhookUrl}
                onChange={(e) => setWebhookUrlState(e.target.value)}
                placeholder="https://script.google.com/macros/s/.../exec"
                className="flex-1 px-3 py-2 rounded-lg bg-charcoal-900 border border-charcoal-700 text-white text-xs focus:outline-none focus:border-fire-500"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-fire-500 hover:bg-fire-600 text-white font-semibold text-xs transition-colors shrink-0"
              >
                {webhookSaved ? 'Guardado' : 'Guardar URL'}
              </button>
            </form>
          </div>
        )}

        {/* Metric Cards */}
        <div className="p-4 border-b border-charcoal-800 grid grid-cols-3 gap-3 bg-charcoal-900/60 text-center">
          <div className="p-3 rounded-xl bg-charcoal-950 border border-charcoal-800">
            <span className="text-xs text-neutral-400 block mb-0.5">Total Respuestas</span>
            <span className="text-xl font-black text-white">{leads.length}</span>
          </div>

          <div className="p-3 rounded-xl bg-charcoal-950 border border-charcoal-800">
            <span className="text-xs text-neutral-400 block mb-0.5">Con WhatsApp</span>
            <span className="text-xl font-black text-emerald-400">{totalWithPhone}</span>
          </div>

          <div className="p-3 rounded-xl bg-charcoal-950 border border-charcoal-800">
            <span className="text-xs text-neutral-400 block mb-0.5">Cupones Canjeados</span>
            <span className="text-xl font-black text-fire-500">{totalRedeemed}</span>
          </div>
        </div>

        {/* Filter and Export Bar */}
        <div className="p-3 border-b border-charcoal-800 flex flex-wrap items-center justify-between gap-2 bg-charcoal-950">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por teléfono o cupón..."
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-charcoal-900 border border-charcoal-700 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-fire-500"
              />
            </div>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-charcoal-900 border border-charcoal-700 text-xs text-neutral-300 focus:outline-none focus:border-fire-500"
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
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-charcoal-800 hover:bg-charcoal-700 text-white text-xs font-semibold border border-charcoal-700 transition-colors disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5 text-fire-500" />
            <span>Descargar CSV (Excel)</span>
          </button>
        </div>

        {/* Leads Table / List */}
        <div className="flex-1 overflow-y-auto p-4 divide-y divide-charcoal-800/80">
          {filteredLeads.length === 0 ? (
            <div className="text-center py-12 text-neutral-500 text-xs">
              No se han registrado clientes potenciales con los filtros actuales.
            </div>
          ) : (
            filteredLeads.map((lead) => (
              <div key={lead.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">
                      {lead.whatsapp ? `+52 ${lead.whatsapp}` : 'Sin número ingresado'}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-charcoal-800 border border-fire-500/40 text-fire-400 font-mono font-bold text-[11px]">
                      {lead.couponCode}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        lead.status === 'canjeado'
                          ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/40'
                          : lead.status === 'contactado'
                          ? 'bg-blue-950/80 text-blue-400 border border-blue-500/40'
                          : 'bg-amber-950/80 text-amber-400 border border-amber-500/40'
                      }`}
                    >
                      {lead.status}
                    </span>
                  </div>

                  <p className="text-neutral-400">
                    <strong className="text-neutral-300">Cena:</strong> {lead.dinnerPreference === 'Otro antojo' ? lead.otherDinner || 'Otro' : lead.dinnerPreference || 'N/A'} • <strong className="text-neutral-300">Presupuesto:</strong> {lead.budget || 'N/A'} • <strong className="text-neutral-300">Ingredientes:</strong> {(lead.ingredients || []).join(', ') || 'N/A'}
                  </p>

                  <span className="text-[10px] text-neutral-500 block">
                    Registrado: {lead.formattedDate || lead.createdAt}
                  </span>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  {/* Status Toggle Button */}
                  <select
                    value={lead.status}
                    onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                    className="px-2 py-1 rounded bg-charcoal-800 border border-charcoal-700 text-[11px] text-neutral-200 focus:outline-none"
                  >
                    <option value="pendiente">Pendiente</option>
                    <option value="contactado">Contactado</option>
                    <option value="canjeado">Canjeado</option>
                  </select>

                  {/* WhatsApp Direct Send Link */}
                  {lead.whatsapp && (
                    <a
                      href={createWhatsAppUrl(lead)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px] transition-colors"
                      title="Enviar menú y cupón personalizado a este contacto"
                    >
                      <WhatsAppIcon className="w-3.5 h-3.5" />
                      <span>Enviar Menú</span>
                    </a>
                  )}

                  <button
                    onClick={() => handleDelete(lead.id)}
                    className="p-1.5 rounded bg-charcoal-800 hover:bg-red-950 hover:text-red-400 text-neutral-400 transition-colors"
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
        <div className="px-5 py-3 border-t border-charcoal-800 bg-charcoal-950 flex items-center justify-between text-[11px] text-neutral-500">
          <span>Los datos se guardan de forma segura en este navegador.</span>
          <span>Beneficio: $40 MXN en consumo mayor a $180 MXN</span>
        </div>
      </div>
    </div>
  );
}
