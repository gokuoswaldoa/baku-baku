import React from 'react';
import { MessageCircle, MapPin } from 'lucide-react';
import { availability, business, whatsapp } from '../order-config';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-neutral-950 border-t border-baku-border py-12 text-baku-muted text-xs">
      <div className="max-w-6xl mx-auto px-4 space-y-8">
        
        {/* Main Footer Row */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-baku-border/40 text-center md:text-left">
          
          {/* Logo & Identity */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl overflow-hidden border border-baku-border bg-baku-surface flex items-center justify-center p-1 flex-shrink-0">
              <img 
                src="/assets/logo.jpg" 
                alt={"Logo oficial " + business.name} 
                className="w-full h-full object-cover rounded-xl"
              />
            </div>
            <div>
              <div className="flex items-center gap-2 justify-center md:justify-start">
                <img 
                  src="/assets/BAKU-BAKU_transparente.webp" 
                  alt={business.shortName} 
                  className="h-4 w-auto object-contain brightness-110"
                />
              </div>
              <p className="text-[11px] text-baku-orange font-bold tracking-widest uppercase mt-0.5">
                {business.location}
              </p>
            </div>
          </div>

          {/* Quick Contact & Modality Notes */}
          <div className="flex flex-wrap items-center justify-center md:justify-end gap-6 text-[11px]">
            <div className="flex items-center gap-1.5 text-baku-ivory">
              <MapPin className="w-4 h-4 text-baku-orange" />
              <span>{business.location}</span>
            </div>

            <a
              href={whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-800/40 text-emerald-400 font-bold hover:bg-emerald-900/60 transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>{business.whatsappDisplay}</span>
            </a>
          </div>

        </div>

        {/* Disclaimers & Copyright */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-[10px] text-baku-muted/70 text-center sm:text-left">
          <p>
            © {new Date().getFullYear()} {business.name}. Todos los derechos reservados.
          </p>
          <p>
            {availability.pickup} {availability.orderNote}
          </p>
        </div>

      </div>
    </footer>
  );
};
