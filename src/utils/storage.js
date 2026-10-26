// Helper to generate a unique founder coupon code
export function generateUniqueCoupon(phone = '') {
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const phoneSuffix = cleanPhone.length >= 4 ? cleanPhone.slice(-4) : '';
  const randomChars = Math.random().toString(36).substring(2, 6).toUpperCase();
  
  if (phoneSuffix) {
    return `BAKU-${phoneSuffix}`;
  }
  return `BAKU-${randomChars}`;
}

const STORAGE_KEY = 'baku_baku_leads';
const CONFIG_KEY = 'baku_baku_config';
const ADMIN_TOKEN_KEY = 'baku_baku_admin_token';
const DEPLOYMENT_WEBHOOK_URL = import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL || '';

function normalizePhone(phone = '') {
  return phone.replace(/\D/g, '').slice(-10);
}

// Retrieve all leads from browser database
export function getStoredLeads() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Error al leer base de datos local:', err);
    return [];
  }
}

// Save new lead
export async function saveLead(leadData) {
  try {
    const existing = getStoredLeads();
    const phone = normalizePhone(leadData.whatsapp);
    if (!phone) {
      throw new Error('El WhatsApp es obligatorio para registrar la respuesta.');
    }

    if (existing.some((lead) => normalizePhone(lead.whatsapp) === phone)) {
      throw new Error('Este número de WhatsApp ya tiene una respuesta registrada.');
    }

    const newLead = {
      id: 'lead_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      createdAt: new Date().toISOString(),
      formattedDate: new Intl.DateTimeFormat('es-MX', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date()),
      status: 'pendiente', // 'pendiente' | 'contactado' | 'canjeado'
      benefit: '$40 MXN de descuento en compra > $180 MXN',
      ...leadData,
      whatsapp: phone,
    };

    const updated = [newLead, ...existing];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    // Optional webhook trigger if Google Sheet or external API is configured
    const webhookUrl = getWebhookUrl();
    if (webhookUrl) {
      const payload = new URLSearchParams({
        id: newLead.id,
        createdAt: newLead.createdAt,
        whatsapp: newLead.whatsapp,
        couponCode: newLead.couponCode || '',
        status: newLead.status,
        benefit: newLead.benefit,
        dinnerPreference: newLead.dinnerPreference || '',
        otherDinner: newLead.otherDinner || '',
        budget: newLead.budget || '',
        trySushi: newLead.trySushi || '',
        ingredients: (newLead.ingredients || []).join(' | '),
      });

      fetch(webhookUrl, {
        method: 'POST',
        mode: 'no-cors',
        // Apps Script receives these values through e.parameter without a CORS preflight.
        body: payload,
      }).catch((e) => console.warn('Webhook no pudo enviarse:', e));
    }

    return newLead;
  } catch (err) {
    console.error('Error al guardar lead:', err);
    throw err;
  }
}

// Update lead status
export function updateLeadStatus(id, newStatus) {
  try {
    const leads = getStoredLeads();
    const updated = leads.map((item) => (item.id === id ? { ...item, status: newStatus } : item));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.error('Error al actualizar estado:', err);
    return getStoredLeads();
  }
}

// Delete lead
export function deleteLead(id) {
  try {
    const leads = getStoredLeads();
    const updated = leads.filter((item) => item.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.error('Error al eliminar lead:', err);
    return getStoredLeads();
  }
}

// Webhook config
export function getWebhookUrl() {
  try {
    return DEPLOYMENT_WEBHOOK_URL || localStorage.getItem(CONFIG_KEY) || '';
  } catch {
    return DEPLOYMENT_WEBHOOK_URL;
  }
}

export function saveWebhookUrl(url) {
  try {
    localStorage.setItem(CONFIG_KEY, url);
  } catch (err) {
    console.error('Error al guardar webhook:', err);
  }
}

export function getAdminToken() {
  try {
    return localStorage.getItem(ADMIN_TOKEN_KEY) || '';
  } catch {
    return '';
  }
}

export function saveAdminToken(token) {
  try {
    localStorage.setItem(ADMIN_TOKEN_KEY, token.trim());
  } catch (err) {
    console.error('Error al guardar token administrativo:', err);
  }
}

export async function getRemoteLeads(token) {
  const webhookUrl = getWebhookUrl();
  if (!webhookUrl || !token) return [];

  const response = await fetch(`${webhookUrl}?action=leads&token=${encodeURIComponent(token)}`);
  if (!response.ok) {
    throw new Error(`No se pudo consultar Google Sheets (${response.status}).`);
  }

  const result = await response.json();
  if (!result.ok) {
    throw new Error(result.error || 'Google Sheets rechazó la consulta.');
  }

  return result.leads || [];
}

// Export database to CSV
export function exportLeadsToCSV(leads) {
  if (!leads || leads.length === 0) return;

  const headers = [
    'Fecha',
    'WhatsApp',
    'Codigo_Cupon',
    'Estado_Cupon',
    'Beneficio',
    'Cena_Frecuente',
    'Presupuesto',
    'Interes_Probar',
    'Ingredientes_Favoritos',
  ];

  const rows = leads.map((l) => [
    `"${l.formattedDate || l.createdAt}"`,
    `"${l.whatsapp || 'Sin WhatsApp'}"`,
    `"${l.couponCode || 'N/A'}"`,
    `"${l.status || 'pendiente'}"`,
    `"${l.benefit || ''}"`,
    `"${l.dinnerPreference === 'Otro antojo' ? l.otherDinner || 'Otro' : l.dinnerPreference || ''}"`,
    `"${l.budget || ''}"`,
    `"${l.trySushi || ''}"`,
    `"${(l.ingredients || []).join(' | ')}"`,
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `baku_baku_leads_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
