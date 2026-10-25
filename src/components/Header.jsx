import React from 'react';
import BakuLogo from './BakuLogo';

export default function Header({ currentStep, totalSteps, isSubmitted }) {
  return (
    <header className="w-full pt-4 pb-3 px-4 border-b border-charcoal-800 bg-charcoal-950/85 backdrop-blur-md sticky top-0 z-30 transition-all">
      <div className="max-w-md mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BakuLogo size="sm" showBadge={false} />
          <div>
            <div className="flex items-center gap-2">
              <span
                className="text-lg font-display font-black tracking-wider text-baku-cream uppercase drop-shadow-[0_2px_0_#3E2723]"
                style={{
                  textShadow: '1.5px 1.5px 0 #3E2723, -1.5px 1.5px 0 #3E2723, 1.5px -1.5px 0 #3E2723, -1.5px -1.5px 0 #3E2723',
                }}
              >
                Baku-Baku
              </span>
              <span className="px-2 py-0.5 rounded-full bg-baku-chocolate border border-baku-red text-baku-orange font-slogan font-black text-[9px] uppercase tracking-widest">
                SUSHI & FIRE
              </span>
            </div>
            <p className="text-[11px] text-neutral-400 font-medium">
              Bolas de Fuego • Dark Kitchen Local
            </p>
          </div>
        </div>

        {!isSubmitted && (
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">Paso</span>
            <div className="text-sm font-bold text-baku-orange">
              {currentStep} <span className="text-neutral-500 font-normal">/ {totalSteps}</span>
            </div>
          </div>
        )}
      </div>

      {!isSubmitted && (
        <div className="max-w-md mx-auto mt-2.5">
          <div className="w-full bg-charcoal-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-baku-red via-baku-orange to-amber-300 h-full rounded-full transition-all duration-500 ease-out shadow-[0_0_10px_rgba(255,154,0,0.5)]"
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            />
          </div>
        </div>
      )}
    </header>
  );
}
