import React, { useState } from 'react';
import BakuLogo from './BakuLogo';
import { WhatsAppIcon } from './Icons';
import { CheckCircle2, Copy, Check, Utensils, Tag } from 'lucide-react';

export default function SuccessScreen({ formData, uniqueCoupon, onReset }) {
  const [copied, setCopied] = useState(false);
  const couponCode = uniqueCoupon || 'BAKU-FUNDADOR';

  const handleCopy = () => {
    navigator.clipboard.writeText(couponCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareText = encodeURIComponent(
    `Descubrí BAKU-BAKU SUSHI & FIRE, el nuevo concepto de bolas de sushi empanizadas a domicilio en la colonia. Responde su breve encuesta y recibe $40 MXN de descuento en tu primer pedido mayor a $180.
    https://baku-baku.vercel.app/`
  );
  const whatsappShareUrl = `https://api.whatsapp.com/send?text=${shareText}`;

  return (
    <div className="max-w-md sm:max-w-xl mx-auto px-4 py-6 animate-slide-up">
      {/* Visual Header */}
      <div className="text-center mb-6">
        <div className="mb-3 flex justify-center">
          <BakuLogo size="md" />
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-extrabold uppercase mb-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>Respuestas Guardadas con Éxito</span>
        </div>

        <h2 className="text-2xl sm:text-3xl font-extrabold text-baku-carbon tracking-tight mb-1">
          ¡Gracias por tu ayuda!
        </h2>
        
        <p className="text-baku-orange font-extrabold text-base sm:text-lg mb-2">
          Estamos preparando el fuego.
        </p>

        <p className="text-baku-neutral text-xs sm:text-sm leading-relaxed max-w-sm mx-auto">
          Te avisaremos pronto. Tu opinión es fundamental para definir el menú oficial de BAKU-BAKU en la colonia.
        </p>
      </div>

      {/* Founder VIP Coupon Card */}
      <div className="rounded-2xl bg-baku-white border-2 border-baku-orange/50 p-5 shadow-baku-card mb-5 relative overflow-hidden">
        <div className="flex items-center justify-between border-b border-baku-border pb-3 mb-3">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-baku-orange" />
            <span className="text-xs uppercase font-extrabold tracking-wider text-baku-carbon">
              Beneficio Exclusivo de Fundador
            </span>
          </div>
          <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-baku-red text-white uppercase">
            $40 MXN DESC.
          </span>
        </div>

        <div className="text-center py-2">
          <span className="text-xs text-baku-neutral font-medium block mb-1">
            Tu código personal e intransferible:
          </span>
          <div className="inline-flex items-center gap-2 bg-baku-tint border border-baku-orange/40 rounded-xl px-4 py-2 text-baku-orange font-mono font-black text-lg tracking-wider">
            <span>{couponCode}</span>
            <button
              onClick={handleCopy}
              className="p-1 hover:text-baku-carbon transition-colors cursor-pointer"
              title="Copiar código"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-baku-neutral hover:text-baku-carbon" />}
            </button>
          </div>
          {copied && (
            <p className="text-[11px] text-emerald-600 mt-1.5 font-bold">Copiado al portapapeles</p>
          )}
        </div>

        <div className="mt-3 pt-3 border-t border-dashed border-baku-border space-y-1 text-center text-xs text-baku-carbon">
          <p className="font-extrabold text-baku-carbon">
            $40 MXN de descuento en tu primer pedido mayor a $180 MXN
          </p>
          <p className="text-[11px] text-baku-neutral">
            {formData.whatsapp
              ? `Asociado a tu número +52 ${formData.whatsapp}. Te enviaremos el menú en cuanto encendamos la cocina.`
              : 'Guarda este código para validarlo en tu primer pedido por WhatsApp.'}
          </p>
        </div>
      </div>

      {/* Response Summary Card */}
      <div className="rounded-2xl bg-baku-white border border-baku-border p-4 mb-5 text-xs shadow-baku-card">
        <h3 className="font-extrabold text-baku-carbon uppercase tracking-wider mb-2.5 flex items-center gap-2">
          <Utensils className="w-3.5 h-3.5 text-baku-orange" />
          Resumen de tus respuestas
        </h3>

        <div className="space-y-2">
          <div className="flex justify-between py-1 border-b border-baku-border/60">
            <span className="text-baku-neutral">Cena preferida:</span>
            <span className="font-bold text-baku-carbon text-right">
              {formData.dinnerPreference === 'Otro antojo' ? formData.otherDinner || 'Otro' : formData.dinnerPreference || 'No especificado'}
            </span>
          </div>
          <div className="flex justify-between py-1 border-b border-baku-border/60">
            <span className="text-baku-neutral">Presupuesto aproximado:</span>
            <span className="font-bold text-baku-carbon text-right">{formData.budget || 'No especificado'}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-baku-border/60">
            <span className="text-baku-neutral">¿Te animarías a probar?:</span>
            <span className="font-bold text-baku-orange text-right">{formData.trySushi || 'No especificado'}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-baku-border/60">
            <span className="text-baku-neutral">Ingredientes preferidos:</span>
            <span className="font-bold text-baku-carbon text-right max-w-[190px] truncate">
              {formData.ingredients.length > 0 ? formData.ingredients.join(', ') : 'Ninguno'}
            </span>
          </div>
          {formData.whatsapp && (
            <div className="flex justify-between py-1">
              <span className="text-baku-neutral">WhatsApp registrado:</span>
              <span className="font-bold text-emerald-600 text-right">+52 {formData.whatsapp}</span>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-2.5">
        <a
          href={whatsappShareUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl font-extrabold text-xs sm:text-sm bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-md cursor-pointer"
        >
          <WhatsAppIcon className="w-4 h-4" />
          <span>Compartir encuesta con vecinos por WhatsApp</span>
        </a>

        <button
          onClick={onReset}
          className="w-full py-2.5 px-4 rounded-xl font-bold text-xs text-baku-neutral hover:text-baku-carbon hover:bg-baku-white transition-all border border-baku-border cursor-pointer"
        >
          Llenar otra respuesta de prueba
        </button>
      </div>
    </div>
  );
}
