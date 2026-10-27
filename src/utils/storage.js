import { supabase, isSupabaseConfigured } from './supabase';

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

function normalizePhone(phone = '') {
  return phone.replace(/\D/g, '').slice(-10);
}

// Retrieve leads from browser localStorage (cache / fallback)
export function getStoredLeads() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Error al leer base de datos local:', err);
    return [];
  }
}

// Save new lead (persists to Supabase, with local cache fallback)
export async function saveLead(leadData) {
  try {
    const phone = normalizePhone(leadData.whatsapp);
    if (!phone || phone.length !== 10) {
      throw new Error('El WhatsApp es obligatorio y debe tener 10 dígitos.');
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

    // 1. If Supabase is configured, save directly to cloud database
    if (isSupabaseConfigured && supabase) {
      // Check for duplicate phone in Supabase
      const { data: existing, error: checkError } = await supabase
        .from('leads')
        .select('id')
        .eq('whatsapp', phone)
        .maybeSingle();

      if (checkError) {
        console.warn('Advertencia al verificar duplicado en Supabase:', checkError);
      } else if (existing) {
        throw new Error('Este número de WhatsApp ya tiene una respuesta registrada.');
      }

      // Insert record to Supabase
      const { error: insertError } = await supabase.from('leads').insert([
        {
          id: newLead.id,
          created_at: newLead.createdAt,
          formatted_date: newLead.formattedDate,
          whatsapp: newLead.whatsapp,
          coupon_code: newLead.couponCode || '',
          status: newLead.status,
          benefit: newLead.benefit,
          dinner_preference: newLead.dinnerPreference || '',
          other_dinner: newLead.otherDinner || '',
          budget: newLead.budget || '',
          try_sushi: newLead.trySushi || '',
          ingredients: newLead.ingredients || [],
        },
      ]);

      if (insertError) {
        console.error('Error al guardar en Supabase:', insertError);
        if (insertError.code === '23505') {
          throw new Error('Este número de WhatsApp ya tiene una respuesta registrada.');
        }
        throw new Error('Error al conectar con la base de datos central. Intenta nuevamente.');
      }
    } else {
      // Fallback check against localStorage
      const localLeads = getStoredLeads();
      if (localLeads.some((l) => normalizePhone(l.whatsapp) === phone)) {
        throw new Error('Este número de WhatsApp ya tiene una respuesta registrada.');
      }
    }

    // 2. Always update local storage as reliable client cache
    const currentLocal = getStoredLeads();
    const updated = [newLead, ...currentLocal.filter((l) => l.id !== newLead.id)];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    return newLead;
  } catch (err) {
    console.error('Error al guardar lead:', err);
    throw err;
  }
}

// Update lead status (updates Supabase & local cache)
export async function updateLeadStatus(id, newStatus) {
  try {
    // Update local cache
    const leads = getStoredLeads();
    const updated = leads.map((item) => (item.id === id ? { ...item, status: newStatus } : item));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    // Update Supabase if configured
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase
        .from('leads')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) {
        console.error('Error al actualizar estado en Supabase:', error);
      }
    }
    return updated;
  } catch (err) {
    console.error('Error al actualizar estado:', err);
    return getStoredLeads();
  }
}

// Delete lead (deletes from Supabase & local cache)
export async function deleteLead(id) {
  try {
    const leads = getStoredLeads();
    const updated = leads.filter((item) => item.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error al eliminar lead en Supabase:', error);
      }
    }
    return updated;
  } catch (err) {
    console.error('Error al eliminar lead:', err);
    return getStoredLeads();
  }
}

// Get remote leads directly from Supabase
export async function getRemoteLeads() {
  if (!isSupabaseConfigured || !supabase) {
    return getStoredLeads();
  }

  try {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Error al consultar Supabase:', error);
      throw new Error(`Error en Supabase: ${error.message}`);
    }

    const mapped = (data || []).map((row) => ({
      id: row.id,
      createdAt: row.created_at,
      formattedDate:
        row.formatted_date ||
        new Intl.DateTimeFormat('es-MX', {
          dateStyle: 'medium',
          timeStyle: 'short',
        }).format(new Date(row.created_at)),
      whatsapp: row.whatsapp,
      couponCode: row.coupon_code,
      status: row.status || 'pendiente',
      benefit: row.benefit || '$40 MXN de descuento en compra > $180 MXN',
      dinnerPreference: row.dinner_preference || '',
      otherDinner: row.other_dinner || '',
      budget: row.budget || '',
      trySushi: row.try_sushi || '',
      ingredients: row.ingredients || [],
    }));

    // Sync latest cloud data into local storage cache
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mapped));
    return mapped;
  } catch (err) {
    console.warn('Fallo al obtener leads remotos, usando cache local:', err);
    return getStoredLeads();
  }
}

// Legacy webhook functions (kept for backwards compatibility)
export function getWebhookUrl() {
  return '';
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
