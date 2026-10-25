import React, { useState } from 'react';
import Header from './components/Header';
import SuccessScreen from './components/SuccessScreen';
import AdminModal from './components/AdminModal';
import BakuLogo from './components/BakuLogo';
import { generateUniqueCoupon, saveLead } from './utils/storage';
import {
  FlameSphereIcon,
  TacoIcon,
  PizzaIcon,
  BurgerIcon,
  WingsIcon,
  UtensilsIcon,
  SushiRollIcon,
  PepperIcon,
  CheeseIcon,
  AvocadoIcon,
  WhatsAppIcon
} from './components/Icons';
import {
  ChevronRight,
  ChevronLeft,
  Loader2,
  ShieldCheck,
  Flame,
  BadgePercent,
  Clock,
  ArrowRight,
  Info,
  Database,
  Lock
} from 'lucide-react';

const DINNER_OPTIONS = [
  { id: 'tacos', label: 'Tacos', desc: 'Pastor, asada, birria o suadero', icon: TacoIcon },
  { id: 'pizza', label: 'Pizza', desc: 'Clásica, masa delgada o deep dish', icon: PizzaIcon },
  { id: 'burgers', label: 'Hamburguesas / Hot Dogs', desc: 'Carne smashed, tocino o estilo callejero', icon: BurgerIcon },
  { id: 'alitas', label: 'Alitas / Boneless', desc: 'Búfalo, bbq o limón pimienta', icon: WingsIcon },
  { id: 'otro', label: 'Otro antojo', desc: 'Escribe tu opción favorita', icon: UtensilsIcon },
];

const BUDGET_OPTIONS = [
  { id: '50-80', label: '$50 - $80', unit: 'MXN', desc: 'Económico y rápido', badge: 'Casual' },
  { id: '80-120', label: '$80 - $120', unit: 'MXN', desc: 'Cena habitual de fin de semana', badge: 'Popular' },
  { id: '120-150', label: '$120 - $150', unit: 'MXN', desc: 'Antojo especial o combo completo', badge: 'Gourmet' },
  { id: '150+', label: 'Más de $150', unit: 'MXN', desc: 'Cena abundante / Premium', badge: 'Sin límite' },
];

const CONCEPT_OPTIONS = [
  {
    id: 'si-totalmente',
    title: '¡Totalmente! Me encantaría probarlo',
    desc: 'Buscaba algo diferente y crujiente para pedir los fines de semana.',
    badge: 'Primera opción',
  },
  {
    id: 'tal-vez',
    title: 'Probablemente sí',
    desc: 'Si el precio es justo y las salsas valen la pena, seguro pido.',
    badge: 'Curioso',
  },
  {
    id: 'no-seguro',
    title: 'No estoy seguro / Prefiero lo tradicional',
    desc: 'Suelo pedir las opciones de siempre o sushi tradicional frío.',
    badge: 'Dudoso',
  },
];

const INGREDIENTS_OPTIONS = [
  { id: 'surimi', label: 'Surimi / Tampico', desc: 'Clásico aderezo cremoso con ligero toque picante', icon: SushiRollIcon },
  { id: 'atun-spicy', label: 'Atún spicy', desc: 'Atún marinado en sriracha, ajonjolí y cebollín', icon: PepperIcon },
  { id: 'pollo', label: 'Pollo crujiente', desc: 'Pechuga marinada empanizada al estilo panko', icon: WingsIcon },
  { id: 'queso-crema', label: 'Queso crema extra', desc: 'Centro fundente y ultra cremoso', icon: CheeseIcon },
  { id: 'aguacate', label: 'Aguacate fresco', desc: 'Rebanadas de aguacate de primera calidad', icon: AvocadoIcon },
];

export default function App() {
  const [step, setStep] = useState(0); // 0 = Intro, 1 = Cena, 2 = Presupuesto, 3 = Concepto, 4 = Ingredientes, 5 = WhatsApp
  const totalSurveySteps = 5;

  const [formData, setFormData] = useState({
    dinnerPreference: '',
    otherDinner: '',
    budget: '',
    trySushi: '',
    ingredients: [],
    whatsapp: '',
  });

  const [generatedCoupon, setGeneratedCoupon] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [isAdminOpen, setIsAdminOpen] = useState(false);

  const handleDinnerSelect = (label) => {
    setFormData((prev) => ({
      ...prev,
      dinnerPreference: label,
      otherDinner: label !== 'Otro antojo' ? '' : prev.otherDinner,
    }));
    setValidationError('');
  };

  const handleBudgetSelect = (val) => {
    setFormData((prev) => ({ ...prev, budget: val }));
    setValidationError('');
  };

  const handleConceptSelect = (val) => {
    setFormData((prev) => ({ ...prev, trySushi: val }));
    setValidationError('');
  };

  const handleIngredientToggle = (ingredient) => {
    setFormData((prev) => {
      const exists = prev.ingredients.includes(ingredient);
      const updated = exists
        ? prev.ingredients.filter((item) => item !== ingredient)
        : [...prev.ingredients, ingredient];
      return { ...prev, ingredients: updated };
    });
    setValidationError('');
  };

  const validateCurrentStep = () => {
    if (step === 1) {
      if (!formData.dinnerPreference) {
        setValidationError('Por favor selecciona qué sueles pedir para cenar.');
        return false;
      }
      if (formData.dinnerPreference === 'Otro antojo' && !formData.otherDinner.trim()) {
        setValidationError('Por favor especifica cuál es tu comida preferida.');
        return false;
      }
    } else if (step === 2) {
      if (!formData.budget) {
        setValidationError('Por favor selecciona tu rango de gasto aproximado.');
        return false;
      }
    } else if (step === 3) {
      if (!formData.trySushi) {
        setValidationError('Por favor indícanos si te animarías a probar las Bolas de Fuego de Baku Baku.');
        return false;
      }
    } else if (step === 4) {
      if (formData.ingredients.length === 0) {
        setValidationError('Selecciona al menos un ingrediente que te llame la atención.');
        return false;
      }
    }
    setValidationError('');
    return true;
  };

  const nextStep = () => {
    if (validateCurrentStep()) {
      setStep((s) => Math.min(s + 1, totalSurveySteps));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const prevStep = () => {
    setValidationError('');
    setStep((s) => Math.max(s - 1, 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!validateCurrentStep()) return;

    setIsSubmitting(true);
    setValidationError('');

    // Generate unique coupon code for this lead
    const uniqueCode = generateUniqueCoupon(formData.whatsapp);
    setGeneratedCoupon(uniqueCode);

    // Save lead into browser database / external webhook
    await saveLead({
      whatsapp: formData.whatsapp,
      couponCode: uniqueCode,
      dinnerPreference: formData.dinnerPreference,
      otherDinner: formData.otherDinner,
      budget: formData.budget,
      trySushi: formData.trySushi,
      ingredients: formData.ingredients,
    });

    setTimeout(() => {
      setIsSubmitting(false);
      setIsSubmitted(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 1200);
  };

  const handleReset = () => {
    setFormData({
      dinnerPreference: '',
      otherDinner: '',
      budget: '',
      trySushi: '',
      ingredients: [],
      whatsapp: '',
    });
    setGeneratedCoupon('');
    setStep(0);
    setIsSubmitted(false);
    setValidationError('');
  };

  return (
    <div className="min-h-screen bg-charcoal-950 text-neutral-100 flex flex-col font-sans">
      <Header currentStep={step} totalSteps={totalSurveySteps} isSubmitted={isSubmitted || step === 0} />

      <main className="flex-1 w-full max-w-md mx-auto px-4 py-6 flex flex-col justify-center">
        {isSubmitted ? (
          <SuccessScreen formData={formData} uniqueCoupon={generatedCoupon} onReset={handleReset} />
        ) : step === 0 ? (
          /* STEP 0: Welcome Hero Screen */
          <div className="text-center py-2 animate-fade-in">
            <div className="mb-4">
              <BakuLogo size="lg" showBadge={true} />
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-2.5">
              ¿Listo para probar las <span className="text-baku-orange">Bolas de Fuego</span>?
            </h1>

            <p className="text-neutral-300 text-xs sm:text-sm leading-relaxed mb-6 px-2">
              Estamos preparando la apertura a puerta cerrada de <strong className="text-white">Baku Baku</strong> en la colonia:
              sushi empanizado crujiente en forma de esfera, relleno de ingredientes de primera calidad y bañado en salsas secretas.
            </p>

            <div className="grid grid-cols-2 gap-3 mb-8 text-left">
              <div className="p-3.5 rounded-xl bg-charcoal-900 border border-charcoal-800 flex items-start gap-3">
                <Clock className="w-5 h-5 text-fire-500 shrink-0 mt-0.5" />
                <div>
                  <h2 className="text-xs font-bold text-white">Solo 1 Minuto</h2>
                  <p className="text-[11px] text-neutral-400">5 preguntas breves para definir el menú.</p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-charcoal-900 border border-fire-500/40 flex items-start gap-3 bg-gradient-to-br from-charcoal-900 to-charcoal-850">
                <BadgePercent className="w-5 h-5 text-fire-400 shrink-0 mt-0.5" />
                <div>
                  <h2 className="text-xs font-bold text-fire-400">Beneficio Fundador</h2>
                  <p className="text-[11px] text-neutral-400">$40 MXN de regalo en tu primer pedido.</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                setStep(1);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="w-full py-4 px-6 rounded-2xl bg-fire-500 hover:bg-fire-600 text-white font-bold text-base shadow-fire-md transition-all active:scale-[0.98] flex items-center justify-center gap-2 group"
            >
              <span>Comenzar Encuesta</span>
              <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        ) : (
          <div className="animate-slide-up">
            {/* Paso 1: Selección única */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-fire-500">Pregunta 1 de 5</span>
                  <h2 className="text-xl font-bold text-white mt-1">
                    ¿Qué sueles pedir para cenar los fines de semana?
                  </h2>
                  <p className="text-xs text-neutral-400 mt-1">
                    Selecciona tu comida favorita al pedir cena en la colonia.
                  </p>
                </div>

                <div className="space-y-2.5">
                  {DINNER_OPTIONS.map((item) => {
                    const isSelected = formData.dinnerPreference === item.label;
                    const IconComponent = item.icon;

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleDinnerSelect(item.label)}
                        className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-center gap-3.5 ${
                          isSelected
                            ? 'bg-fire-500/10 border-fire-500 shadow-fire-sm text-white'
                            : 'bg-charcoal-900/90 border-charcoal-800 text-neutral-300 hover:border-charcoal-700 hover:bg-charcoal-850'
                        }`}
                      >
                        <div
                          className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                            isSelected ? 'bg-fire-500 text-white' : 'bg-charcoal-800 text-neutral-400'
                          }`}
                        >
                          <IconComponent className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-sm flex items-center justify-between">
                            <span className={isSelected ? 'text-white' : 'text-neutral-200'}>{item.label}</span>
                            <div
                              className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                isSelected ? 'border-fire-500 bg-fire-500' : 'border-neutral-600'
                              }`}
                            >
                              {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                            </div>
                          </div>
                          <p className="text-xs text-neutral-400 mt-0.5">{item.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {formData.dinnerPreference === 'Otro antojo' && (
                  <div className="pt-2 animate-fade-in">
                    <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                      ¿Qué platillo es tu favorito?
                    </label>
                    <input
                      type="text"
                      value={formData.otherDinner}
                      onChange={(e) => setFormData({ ...formData, otherDinner: e.target.value })}
                      placeholder="Ej. Tortas ahogadas, crepas, comida china..."
                      className="w-full px-4 py-3 rounded-xl bg-charcoal-900 border border-fire-500/50 text-white placeholder-neutral-500 text-sm focus:outline-none focus:ring-2 focus:ring-fire-500 transition-all"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Paso 2: Rango de precio */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-fire-500">Pregunta 2 de 5</span>
                  <h2 className="text-xl font-bold text-white mt-1">
                    ¿Cuánto sueles gastar por persona en una cena de fin de semana?
                  </h2>
                  <p className="text-xs text-neutral-400 mt-1">
                    Considerando platillo principal y bebida o complemento.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {BUDGET_OPTIONS.map((item) => {
                    const isSelected = formData.budget === item.label;

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleBudgetSelect(item.label)}
                        className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center justify-between ${
                          isSelected
                            ? 'bg-fire-500/10 border-fire-500 shadow-fire-sm'
                            : 'bg-charcoal-900 border-charcoal-800 hover:border-charcoal-700 hover:bg-charcoal-850'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-base font-extrabold text-white">{item.label}</span>
                            <span className="text-xs font-medium text-neutral-400">{item.unit}</span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                isSelected ? 'bg-fire-500 text-white' : 'bg-charcoal-800 text-neutral-400'
                              }`}
                            >
                              {item.badge}
                            </span>
                          </div>
                          <p className="text-xs text-neutral-400">{item.desc}</p>
                        </div>

                        <div
                          className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ml-3 ${
                            isSelected ? 'border-fire-500 bg-fire-500' : 'border-neutral-600'
                          }`}
                        >
                          {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Paso 3: Validación visual del concepto */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-fire-500">Pregunta 3 de 5</span>
                  <h2 className="text-xl font-bold text-white mt-1">
                    Si abriera una opción de Sushi Empanizado en Bola (Bolas de Fuego) a domicilio en la colonia, ¿te animarías a probarlo?
                  </h2>
                  <p className="text-xs text-neutral-400 mt-1">
                    Esferas crujientes rellenas de arroz de sushi sazonado, proteína y queso crema derretido.
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-charcoal-900/80 border border-baku-orange/40 flex items-center gap-3">
                  <BakuLogo size="sm" showBadge={false} />
                  <div className="text-xs">
                    <span className="font-bold text-white block">Concepto Baku Baku:</span>
                    <span className="text-neutral-400">Sushi frito en esfera (Bolas de Fuego), fácil de comer sin cubiertos ni desastres.</span>
                  </div>
                </div>

                <div className="space-y-3">
                  {CONCEPT_OPTIONS.map((opt) => {
                    const isSelected = formData.trySushi === opt.title;

                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => handleConceptSelect(opt.title)}
                        className={`w-full text-left p-4 rounded-2xl border transition-all ${
                          isSelected
                            ? 'bg-fire-500/10 border-fire-500 shadow-fire-sm'
                            : 'bg-charcoal-900 border-charcoal-800 hover:border-charcoal-700 hover:bg-charcoal-850'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-sm font-bold ${isSelected ? 'text-fire-400' : 'text-white'}`}>
                            {opt.title}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              isSelected ? 'bg-fire-500 text-white' : 'bg-charcoal-800 text-neutral-400'
                            }`}
                          >
                            {opt.badge}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-400 leading-relaxed">{opt.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Paso 4: Selección múltiple de ingredientes */}
            {step === 4 && (
              <div className="space-y-4">
                <div className="mb-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-fire-500">Pregunta 4 de 5</span>
                    <span className="text-xs font-semibold text-neutral-400">
                      {formData.ingredients.length} seleccionados
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-white mt-1">
                    ¿Qué ingredientes te llaman más la atención?
                  </h2>
                  <p className="text-xs text-neutral-400 mt-1">
                    Puedes elegir todas las opciones que te gustaría ver en el menú.
                  </p>
                </div>

                <div className="space-y-2.5">
                  {INGREDIENTS_OPTIONS.map((item) => {
                    const isChecked = formData.ingredients.includes(item.label);
                    const IconComp = item.icon;

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleIngredientToggle(item.label)}
                        className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-center gap-3.5 ${
                          isChecked
                            ? 'bg-fire-500/10 border-fire-500 shadow-fire-sm text-white'
                            : 'bg-charcoal-900 border-charcoal-800 text-neutral-300 hover:border-charcoal-700 hover:bg-charcoal-850'
                        }`}
                      >
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                            isChecked ? 'bg-fire-500 text-white' : 'bg-charcoal-800 text-neutral-400'
                          }`}
                        >
                          <IconComp className="w-5 h-5" />
                        </div>

                        <div className="flex-1">
                          <div className="font-semibold text-sm flex items-center justify-between">
                            <span className={isChecked ? 'text-white' : 'text-neutral-200'}>{item.label}</span>
                            <div
                              className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                                isChecked
                                  ? 'border-fire-500 bg-fire-500 text-white'
                                  : 'border-neutral-600 bg-charcoal-950'
                              }`}
                            >
                              {isChecked && (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-3.5 h-3.5">
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                              )}
                            </div>
                          </div>
                          <p className="text-xs text-neutral-400 mt-0.5">{item.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Paso 5: WhatsApp y Beneficio Fundador */}
            {step === 5 && (
              <div className="space-y-4">
                <div className="mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-fire-500">Paso Final</span>
                  <h2 className="text-xl font-bold text-white mt-1">
                    Beneficio Exclusivo de Fundador
                  </h2>
                </div>

                <div className="rounded-2xl bg-gradient-to-b from-charcoal-900 to-charcoal-850 border-2 border-fire-500/60 p-5 shadow-fire-md relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-fire-500/10 rounded-bl-full pointer-events-none" />

                  <div className="flex items-center gap-2 mb-3">
                    <span className="px-2.5 py-1 rounded-md bg-fire-500 text-white text-xs font-black tracking-wider uppercase">
                      $40 MXN DESC.
                    </span>
                    <span className="text-xs text-neutral-300 font-semibold">
                      Comunidad Fundadora
                    </span>
                  </div>

                  <label className="block text-sm font-bold text-white mb-2 leading-relaxed">
                    ¡Gracias por ayudarnos a definir el menú! Déjanos tu número de WhatsApp y te enviaremos tu beneficio de fundador: $40 MXN de descuento en tu primer pedido mayor a $180. (Beneficio exclusivo para quienes respondieron la encuesta).
                  </label>

                  <div className="relative mt-4">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                      <WhatsAppIcon className="w-5 h-5 text-emerald-500" />
                      <span className="ml-2 text-xs font-semibold text-neutral-400 border-r border-charcoal-700 pr-2.5">
                        +52
                      </span>
                    </div>
                    <input
                      type="tel"
                      value={formData.whatsapp}
                      onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value.replace(/[^0-9]/g, '').slice(0, 10) })}
                      placeholder="10 dígitos (ej. 55 1234 5678)"
                      className="w-full pl-24 pr-4 py-3.5 rounded-xl bg-charcoal-950 border border-charcoal-700 text-white placeholder-neutral-500 text-sm font-medium tracking-wide focus:outline-none focus:border-fire-500 focus:ring-1 focus:ring-fire-500 transition-all"
                    />
                  </div>

                  <div className="mt-4 flex items-start gap-2 text-[11px] text-neutral-400">
                    <ShieldCheck className="w-4 h-4 text-neutral-500 shrink-0 mt-0.5" />
                    <span>Tu número se asociará a un código de cupón único. Cero spam, solo recibirás el menú y aviso cuando encendamos la cocina.</span>
                  </div>
                </div>
              </div>
            )}

            {validationError && (
              <div className="mt-4 p-3 rounded-xl bg-red-950/60 border border-red-500/50 text-red-200 text-xs flex items-center gap-2 animate-fade-in">
                <Info className="w-4 h-4 text-red-400 shrink-0" />
                <span>{validationError}</span>
              </div>
            )}

            {/* Navigation buttons */}
            <div className="mt-8 pt-4 border-t border-charcoal-850 flex items-center gap-3">
              {step > 1 && (
                <button
                  type="button"
                  onClick={prevStep}
                  disabled={isSubmitting}
                  className="py-3.5 px-4 rounded-xl bg-charcoal-900 hover:bg-charcoal-850 text-neutral-300 font-semibold text-sm border border-charcoal-800 transition-all flex items-center justify-center gap-1.5 active:scale-95"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Atrás</span>
                </button>
              )}

              {step < totalSurveySteps ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="flex-1 py-3.5 px-5 rounded-xl bg-fire-500 hover:bg-fire-600 text-white font-bold text-sm shadow-fire-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2 group"
                >
                  <span>Siguiente</span>
                  <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="flex-1 py-4 px-6 rounded-xl bg-gradient-to-r from-fire-600 via-fire-500 to-amber-500 hover:from-fire-500 hover:to-amber-400 text-white font-bold text-sm shadow-fire-md transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-75 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Preparando el fuego...</span>
                    </>
                  ) : (
                    <>
                      <span>Enviar Respuestas</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer with Discreet Admin Access */}
      <footer className="w-full py-4 text-center border-t border-charcoal-900 text-xs text-neutral-500">
        <div className="max-w-md mx-auto px-4 flex items-center justify-between">
          <span>Baku Baku • Dark Kitchen Local</span>
          <button
            onClick={() => setIsAdminOpen(true)}
            className="inline-flex items-center gap-1 text-[11px] text-neutral-500 hover:text-fire-400 transition-colors py-1 px-2 rounded hover:bg-charcoal-900"
            title="Abrir base de datos de fundadores"
          >
            <Lock className="w-3 h-3" />
            <span>Admin</span>
          </button>
        </div>
      </footer>

      {/* Admin / Leads Control Modal */}
      <AdminModal isOpen={isAdminOpen} onClose={() => setIsAdminOpen(false)} />
    </div>
  );
}
