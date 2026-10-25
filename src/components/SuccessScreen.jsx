import React, { useState } from 'react';
import BakuLogo from './BakuLogo';
import { WhatsAppIcon } from './Icons';
import { CheckCircle2, Copy, Check, Utensils, Tag, ShieldCheck, ArrowRight } from 'lucide-react';

export default function SuccessScreen({ formData, uniqueCoupon, onReset }) {
  const [copied, setCopied] = useState(false);
  const couponCode = uniqueCoupon || 'BAKU-FUNDADOR';

  const handleCopy = () => {
    navigator.clipboard.writeText(couponCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareText = encodeURIComponent(
    `Descubrí Baku Baku, el nuevo concepto de sushi empanizado en esfera a domicilio. Responde su breve encuesta y recibe $40 MXN de descuento en tu primer pedido mayor a $180.`
  );
  const whatsappShareUrl = `https://api.whatsapp.com/send?text=${shareText}`;

  return (
    <div className="max-w-md mx-auto px-4 py-6 animate-slide-up">
      {/* Visual Header */}
      <div className="relative text-center mb-6">
        <div className="absolute inset-0 -top-8 bg-baku-orange/10 blur-3xl rounded-full pointer-events-none" />
        
        <div className="mb-3">
          <BakuLogo size="md" showBadge={false} />
        </div>

        <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-2">
          ¡Gracias por tu ayuda!
        </h2>
        
        <p className="text-fire-400 font-semibold text-base mb-2">
          Estamos preparando el fuego.
        </p>

        <p className="text-neutral-300 text-xs sm:text-sm leading-relaxed max-w-xs mx-auto">
          Te avisaremos pronto. Tu opinión es fundamental para definir el menú y comenzar a cocinar en la colonia.
        </p>
      </div>

      {/* Founder VIP Coupon Card */}
      <div className="relative rounded-2xl bg-gradient-to-b from-charcoal-850 to-charcoal-900 border border-fire-500/50 p-5 shadow-fire-sm overflow-hidden mb-5">
        <div className="absolute top-0 right-0 w-28 h-28 bg-fire-500/10 rounded-bl-full pointer-events-none" />
        
        <div className="flex items-center justify-between border-b border-charcoal-700/60 pb-3 mb-3">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-fire-500" />
            <span className="text-xs uppercase font-bold tracking-widest text-neutral-300">
              Beneficio de Fundador
            </span>
          </div>
          <span className="text-xs font-bold px-2 py-0.5 rounded bg-fire-500 text-white">
            $40 MXN DESC.
          </span>
        </div>

        <div className="text-center py-2">
          <span className="text-xs text-neutral-400 block mb-1">
            Tu código personal e intransferible:
          </span>
          <div className="inline-flex items-center gap-2 bg-charcoal-950 border border-charcoal-700 rounded-xl px-4 py-2.5 text-fire-400 font-mono font-bold text-lg tracking-wider">
            <span>{couponCode}</span>
            <button
              onClick={handleCopy}
              className="p-1 hover:text-white transition-colors"
              title="Copiar código"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-neutral-400 hover:text-white" />}
            </button>
          </div>
          {copied && (
            <p className="text-[11px] text-emerald-400 mt-1.5 font-medium">Copiado al portapapeles</p>
          )}
        </div>

        <div className="mt-3 pt-3 border-t border-dashed border-charcoal-700 space-y-1 text-center text-xs text-neutral-300">
          <p className="font-semibold text-white">
            $40 MXN de descuento en tu primer pedido mayor a $180 MXN
          </p>
          <p className="text-[11px] text-neutral-400">
            {formData.whatsapp
              ? `Asociado a tu número +52 ${formData.whatsapp}. Te enviaremos el menú en cuanto encendamos la cocina.`
              : 'Guarda este código para validarlo al hacer tu primer pedido.'}
          </p>
        </div>
      </div>

      {/* Response Summary Card */}
      <div className="rounded-2xl bg-charcoal-900/80 border border-charcoal-800 p-4 mb-5 text-xs">
        <h3 className="font-bold text-neutral-400 uppercase tracking-wider mb-2.5 flex items-center gap-2">
          <Utensils className="w-3.5 h-3.5 text-fire-500" />
          Resumen de tus respuestas
        </h3>

        <div className="space-y-2">
          <div className="flex justify-between py-1 border-b border-charcoal-800">
            <span className="text-neutral-400">Cena preferida:</span>
            <span className="font-semibold text-neutral-200 text-right">
              {formData.dinnerPreference === 'Otro antojo' ? formData.otherDinner || 'Otro' : formData.dinnerPreference || 'No especificado'}
            </span>
          </div>
          <div className="flex justify-between py-1 border-b border-charcoal-800">
            <span className="text-neutral-400">Presupuesto aproximado:</span>
            <span className="font-semibold text-neutral-200 text-right">{formData.budget || 'No especificado'}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-charcoal-800">
            <span className="text-neutral-400">¿Te animarías a probar?:</span>
            <span className="font-semibold text-fire-400 text-right">{formData.trySushi || 'No especificado'}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-charcoal-800">
            <span className="text-neutral-400">Ingredientes preferidos:</span>
            <span className="font-semibold text-neutral-200 text-right max-w-[170px] truncate">
              {formData.ingredients.length > 0 ? formData.ingredients.join(', ') : 'Ninguno'}
            </span>
          </div>
          {formData.whatsapp && (
            <div className="flex justify-between py-1">
              <span className="text-neutral-400">WhatsApp registrado:</span>
              <span className="font-semibold text-emerald-400 text-right">+52 {formData.whatsapp}</span>
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
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-xs sm:text-sm bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-md"
        >
          <WhatsAppIcon className="w-4 h-4" />
          <span>Compartir encuesta con vecinos por WhatsApp</span>
        </a>

        <button
          onClick={onReset}
          className="w-full py-2.5 px-4 rounded-xl font-semibold text-xs text-neutral-400 hover:text-neutral-200 hover:bg-charcoal-850 transition-all border border-charcoal-800"
        >
          Llenar otra respuesta de prueba
        </button>
      </div>
    </div>
  );
}
