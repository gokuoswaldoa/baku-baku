import React from 'react';
import { FlameSphereIcon } from './Icons';

export default function Header({ currentStep, totalSteps, isSubmitted }) {
  return (
    <header className="w-full pt-6 pb-4 px-4 border-b border-charcoal-800 bg-charcoal-950/80 backdrop-blur-md sticky top-0 z-30 transition-all">
      <div className="max-w-md mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <FlameSphereIcon className="w-10 h-10 drop-shadow-[0_0_12px_rgba(255,90,0,0.5)]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-black tracking-wider text-white uppercase font-sans">
                Bolas de Fuego
              </span>
              <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded bg-fire-500/20 text-fire-400 border border-fire-500/30">
                Dark Kitchen
              </span>
            </div>
            <p className="text-xs text-neutral-400 font-medium">
              Sushi Empanizado en Esfera • Entrega Local
            </p>
          </div>
        </div>

        {!isSubmitted && (
          <div className="text-right">
            <span className="text-xs font-semibold text-neutral-400">Paso</span>
            <div className="text-sm font-bold text-fire-500">
              {currentStep} <span className="text-neutral-500 font-normal">/ {totalSteps}</span>
            </div>
          </div>
        )}
      </div>

      {!isSubmitted && (
        <div className="max-w-md mx-auto mt-3">
          <div className="w-full bg-charcoal-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-fire-600 via-fire-500 to-amber-400 h-full rounded-full transition-all duration-500 ease-out shadow-[0_0_10px_rgba(255,90,0,0.5)]"
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            />
          </div>
        </div>
      )}
    </header>
  );
}
