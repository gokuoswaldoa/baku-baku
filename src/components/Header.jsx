import React from 'react';
import BakuLogo from './BakuLogo';

export default function Header({ currentStep, totalSteps, isSubmitted }) {
  const percentage = Math.round((currentStep / totalSteps) * 100);

  return (
    <header className="w-full pt-3 pb-2.5 px-4 border-b border-baku-border bg-baku-white/95 backdrop-blur-md sticky top-0 z-30 shadow-[0_2px_8px_rgba(30,30,30,0.03)] transition-all">
      <div className="max-w-md sm:max-w-xl mx-auto flex items-center justify-between gap-3">
        {/* Brand identity */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <BakuLogo size="header" />
          <div className="leading-tight">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-base sm:text-lg font-extrabold text-baku-carbon tracking-tight uppercase font-sans">
                BAKU-BAKU
              </span>
              <span className="text-[9px] sm:text-[10px] font-extrabold tracking-wider px-2 py-0.5 rounded-full bg-baku-carbon text-baku-orange uppercase">
                SUSHI & FIRE
              </span>
            </div>
            <p className="text-[11px] text-baku-neutral font-medium">
              Bolas de Sushi Empanizadas • Dark Kitchen Local
            </p>
          </div>
        </div>

        {/* Step counter */}
        {!isSubmitted && currentStep > 0 && (
          <div className="text-right shrink-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-baku-neutral block">
              Progreso
            </span>
            <div className="text-xs sm:text-sm font-extrabold text-baku-carbon">
              <span className="text-baku-orange">{currentStep}</span>
              <span className="text-baku-neutral font-medium"> / {totalSteps}</span>
              <span className="text-[10px] text-baku-neutral ml-1 hidden sm:inline">({percentage}%)</span>
            </div>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      {!isSubmitted && currentStep > 0 && (
        <div className="max-w-md sm:max-w-xl mx-auto mt-2">
          <div
            className="w-full bg-baku-subtle h-2 rounded-full overflow-hidden"
            role="progressbar"
            aria-valuenow={percentage}
            aria-valuemin="0"
            aria-valuemax="100"
            aria-label="Progreso de la encuesta"
          >
            <div
              className="bg-baku-orange h-full rounded-full transition-all duration-300 ease-out"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      )}
    </header>
  );
}
