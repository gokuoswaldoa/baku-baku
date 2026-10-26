import React, { useState } from 'react';
import Header from './components/Header';
import SuccessScreen from './components/SuccessScreen';
import AdminModal from './components/AdminModal';
import BakuLogo from './components/BakuLogo';
import { generateUniqueCoupon, saveLead } from './utils/storage';
import {
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
  Sparkles
} from 'lucide-react';

const DINNER_OPTIONS = [
  { id: 'tacos', label: 'Tacos', desc: 'Pastor, asada, birria o suadero', icon: TacoIcon },
  { id: 'pizza', label: 'Pizza', desc: 'Clásica, masa delgada o deep dish', icon: PizzaIcon },
  { id: 'burgers', label: 'Hamburguesas / Hot Dogs', desc: 'Carne smashed, tocino o estilo callejero', icon: BurgerIcon },
  { id: 'alitas', label: 'Alitas / Boneless', desc: 'Búfalo, bbq o limón pimienta', icon: WingsIcon },
  { id: 'otro', label: 'Otro antojo', desc: 'Escribe tu comida preferida', icon: UtensilsIcon },
];

const BUDGET_OPTIONS = [
  { id: '50-80', label: '$50 - $80', unit: 'MXN', desc: 'Económico y rápido', badge: 'Casual' },
  { id: '80-120', label: '$80 - $120', unit: 'MXN', desc: 'Cena habitual de fin de semana', badge: 'Popular' },
  { id: '120-150', label: '$120 - $150', unit: 'MXN', desc: 'Antojo especial o combo completo', badge: 'Gourmet' },
  { id: '150+', label: 'Más de $150', unit: 'MXN', desc: 'Cena abundante / Sin límite', badge: 'Premium' },
];

const CONCEPT_OPTIONS = [
  {
    id: 'si-totalmente',
    title: '¡Totalmente! Me encantaría probarlo',
    desc: 'Buscaba una opción crujiente y diferente para pedir los fines de semana.',
    badge: 'Primera opción',
  },
  {
    id: 'tal-vez',
    title: 'Probablemente sí',
    desc: 'Si el precio es justo y las salsas complementan bien, seguro pido.',
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
  { id: 'atun-spicy', label: 'Atún spicy', desc: 'Atún marinado con sriracha, ajonjolí y cebollín', icon: PepperIcon },
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
  const isAdminRoute = window.location.pathname.replace(/\/+$/, '') === '/admi';

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
    } else if (step === 5) {
      if (!/^\d{10}$/.test(formData.whatsapp)) {
        setValidationError('Ingresa un número de WhatsApp válido de 10 dígitos para recibir tu cupón.');
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

    const uniqueCode = generateUniqueCoupon(formData.whatsapp);
    setGeneratedCoupon(uniqueCode);

    try {
      await saveLead({
        whatsapp: formData.whatsapp,
        couponCode: uniqueCode,
        dinnerPreference: formData.dinnerPreference,
        otherDinner: formData.otherDinner,
        budget: formData.budget,
        trySushi: formData.trySushi,
        ingredients: formData.ingredients,
      });
    } catch (error) {
      setIsSubmitting(false);
      setGeneratedCoupon('');
      setValidationError(error.message);
      return;
    }

    setTimeout(() => {
      setIsSubmitting(false);
      setIsSubmitted(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 1100);
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

  if (isAdminRoute) {
    return (
      <div className="min-h-screen bg-baku-ivory">
        <AdminModal isOpen onClose={() => window.location.assign('/')} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-baku-ivory text-baku-carbon flex flex-col font-sans selection:bg-baku-orange selection:text-white">
      {/* Top Header with official logo & progress bar */}
      <Header currentStep={step} totalSteps={totalSurveySteps} isSubmitted={isSubmitted || step === 0} />

      {/* Main Container */}
      <main className="flex-1 w-full max-w-md sm:max-w-xl mx-auto px-4 py-6 sm:py-8 flex flex-col justify-center">
        {isSubmitted ? (
          <SuccessScreen formData={formData} uniqueCoupon={generatedCoupon} onReset={handleReset} />
        ) : step === 0 ? (
          /* STEP 0: Welcome Presentation */
          <div className="text-center py-2 animate-fade-in">
            {/* Official Mascot Logo: Red Panda with Headband holding Crispy Sushi Sphere */}
            <div className="mb-4 flex justify-center">
              <BakuLogo size="lg" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-baku-white border border-baku-border text-baku-carbon text-xs font-bold tracking-wide uppercase shadow-sm mb-3">
              <span className="w-2 h-2 rounded-full bg-baku-orange" />
              <span>Validación de Mercado • Dark Kitchen Local</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-baku-carbon tracking-tight mb-2">
              ¿Listo para probar las <span className="text-baku-orange">Bolas de Fuego</span>?
            </h1>

            <p className="text-baku-neutral text-sm leading-relaxed mb-6 max-w-md mx-auto">
              Estamos preparando la apertura de <strong className="text-baku-carbon font-bold">BAKU-BAKU SUSHI & FIRE</strong> en la colonia Ruben Jaramillo, Temixco:
              bolas de sushi empanizadas, doradas y ultra crujientes.
            </p>

            {/* Quick Benefits Cards */}
            <div className="grid grid-cols-2 gap-3 mb-6 text-left">
              <div className="p-3.5 rounded-2xl bg-baku-white border border-baku-border shadow-baku-card flex items-start gap-3">
                <Clock className="w-5 h-5 text-baku-orange shrink-0 mt-0.5" />
                <div>
                  <h2 className="text-xs font-extrabold text-baku-carbon">Solo 1 Minuto</h2>
                  <p className="text-[11px] text-baku-neutral mt-0.5">5 preguntas breves para definir el menú oficial.</p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-baku-white border border-baku-orange/40 shadow-baku-card flex items-start gap-3">
                <BadgePercent className="w-5 h-5 text-baku-red shrink-0 mt-0.5" />
                <div>
                  <h2 className="text-xs font-extrabold text-baku-red">Beneficio Fundador</h2>
                  <p className="text-[11px] text-baku-neutral mt-0.5">$40 MXN de descuento en tu primer pedido.</p>
                </div>
              </div>
            </div>

            {/* Start Button */}
            <button
              onClick={() => {
                setStep(1);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="w-full py-4 px-6 rounded-2xl bg-baku-orange hover:bg-baku-orange-hover text-white font-extrabold text-base shadow-baku-btn transition-all active:scale-[0.98] flex items-center justify-center gap-2 group cursor-pointer"
            >
              <span>Comenzar Encuesta</span>
              <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
            </button>

            <p className="text-[11px] text-baku-neutral mt-3">
              Tus respuestas son anónimas y nos ayudan a definir horarios, recetas y cobertura en la colonia.
            </p>
          </div>
        ) : (
          /* MULTI-STEP QUESTIONS */
          <div className="animate-slide-up">
            {/* Step 1: Single choice - Cena de fin de semana */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-baku-orange">Pregunta 1 de 5</span>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-baku-carbon mt-1">
                    ¿Qué sueles pedir para cenar los fines de semana?
                  </h2>
                  <p className="text-xs sm:text-sm text-baku-neutral mt-1">
                    Selecciona tu comida favorita al pedir cena a domicilio.
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
                        className={`w-full text-left p-3.5 sm:p-4 rounded-2xl border transition-all flex items-center gap-3.5 cursor-pointer ${
                          isSelected
                            ? 'bg-baku-tint border-baku-orange shadow-baku-selected text-baku-carbon'
                            : 'bg-baku-white border-baku-border text-baku-carbon hover:border-baku-neutral/40 hover:bg-white shadow-baku-card'
                        }`}
                      >
                        <div
                          className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                            isSelected ? 'bg-baku-orange text-white' : 'bg-baku-subtle text-baku-carbon'
                          }`}
                        >
                          <IconComponent className="w-5 h-5" />
                        </div>

                        <div className="flex-1">
                          <div className="font-bold text-sm sm:text-base flex items-center justify-between">
                            <span className={isSelected ? 'text-baku-carbon' : 'text-baku-carbon'}>{item.label}</span>
                            <div
                              className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                                isSelected ? 'border-baku-orange bg-baku-orange' : 'border-baku-neutral/50'
                              }`}
                            >
                              {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                            </div>
                          </div>
                          <p className="text-xs text-baku-neutral mt-0.5">{item.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {formData.dinnerPreference === 'Otro antojo' && (
                  <div className="pt-2 animate-fade-in">
                    <label className="block text-xs font-bold text-baku-carbon mb-1.5">
                      ¿Qué platillo es tu favorito?
                    </label>
                    <input
                      type="text"
                      value={formData.otherDinner}
                      onChange={(e) => setFormData({ ...formData, otherDinner: e.target.value })}
                      placeholder="Ej. Tortas ahogadas, crepas, comida china..."
                      className="w-full px-4 py-3 rounded-xl bg-baku-white border border-baku-border text-baku-carbon placeholder-baku-neutral/60 text-sm focus:outline-none focus:border-baku-orange focus:ring-2 focus:ring-baku-orange/20 transition-all shadow-sm"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Rango de precio */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-baku-orange">Pregunta 2 de 5</span>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-baku-carbon mt-1">
                    ¿Cuánto sueles gastar por persona en una cena de fin de semana?
                  </h2>
                  <p className="text-xs sm:text-sm text-baku-neutral mt-1">
                    Considerando platillo principal y bebida o complemento.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-2.5">
                  {BUDGET_OPTIONS.map((item) => {
                    const isSelected = formData.budget === item.label;

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleBudgetSelect(item.label)}
                        className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center justify-between cursor-pointer ${
                          isSelected
                            ? 'bg-baku-tint border-baku-orange shadow-baku-selected'
                            : 'bg-baku-white border-baku-border hover:border-baku-neutral/40 hover:bg-white shadow-baku-card'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-base font-extrabold text-baku-carbon">{item.label}</span>
                            <span className="text-xs font-semibold text-baku-neutral">{item.unit}</span>
                            <span
                              className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                isSelected ? 'bg-baku-orange text-white' : 'bg-baku-subtle text-baku-carbon'
                              }`}
                            >
                              {item.badge}
                            </span>
                          </div>
                          <p className="text-xs text-baku-neutral">{item.desc}</p>
                        </div>

                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ml-3 transition-colors ${
                            isSelected ? 'border-baku-orange bg-baku-orange' : 'border-baku-neutral/50'
                          }`}
                        >
                          {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 3: Concept visual validation */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-baku-orange">Pregunta 3 de 5</span>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-baku-carbon mt-1">
                    Si abriera una opción de Sushi Empanizado en Bola (Bolas de Fuego) a domicilio en la colonia, ¿te animarías a probarlo?
                  </h2>
                  <p className="text-xs sm:text-sm text-baku-neutral mt-1">
                    Esferas crujientes rellenas de arroz sazonado, proteína gourmet y queso crema fundido.
                  </p>
                </div>

                {/* Concept Banner with Mascot */}
                <div className="p-3.5 rounded-2xl bg-baku-white border border-baku-border shadow-baku-card flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-baku-tint border border-baku-orange/30 flex items-center justify-center shrink-0 overflow-hidden">
                    <img src="/baku-logo.webp" alt="Panda Rojo" className="w-10 h-10 object-contain" />
                  </div>
                  <div className="text-xs">
                    <span className="font-extrabold text-baku-carbon block">Concepto BAKU-BAKU:</span>
                    <span className="text-baku-neutral">Sushi frito en esfera, fácil de comer sin cubiertos ni desastres, con empanizado panko ultra crujiente.</span>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {CONCEPT_OPTIONS.map((opt) => {
                    const isSelected = formData.trySushi === opt.title;

                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => handleConceptSelect(opt.title)}
                        className={`w-full text-left p-4 rounded-2xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-baku-tint border-baku-orange shadow-baku-selected'
                            : 'bg-baku-white border-baku-border hover:border-baku-neutral/40 hover:bg-white shadow-baku-card'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-sm font-extrabold ${isSelected ? 'text-baku-orange' : 'text-baku-carbon'}`}>
                            {opt.title}
                          </span>
                          <span
                            className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                              isSelected ? 'bg-baku-orange text-white' : 'bg-baku-subtle text-baku-carbon'
                            }`}
                          >
                            {opt.badge}
                          </span>
                        </div>
                        <p className="text-xs text-baku-neutral leading-relaxed">{opt.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 4: Multiple choice - Ingredientes */}
            {step === 4 && (
              <div className="space-y-4">
                <div className="mb-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-baku-orange">Pregunta 4 de 5</span>
                    <span className="text-xs font-bold text-baku-neutral bg-baku-white px-2 py-0.5 rounded-md border border-baku-border">
                      {formData.ingredients.length} seleccionados
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-baku-carbon mt-1">
                    ¿Qué ingredientes te llaman más la atención?
                  </h2>
                  <p className="text-xs sm:text-sm text-baku-neutral mt-1">
                    Puedes elegir todas las opciones que te gustaría ver en nuestro menú.
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
                        className={`w-full text-left p-3.5 sm:p-4 rounded-2xl border transition-all flex items-center gap-3.5 cursor-pointer ${
                          isChecked
                            ? 'bg-baku-tint border-baku-orange shadow-baku-selected text-baku-carbon'
                            : 'bg-baku-white border-baku-border text-baku-carbon hover:border-baku-neutral/40 hover:bg-white shadow-baku-card'
                        }`}
                      >
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                            isChecked ? 'bg-baku-orange text-white' : 'bg-baku-subtle text-baku-carbon'
                          }`}
                        >
                          <IconComp className="w-5 h-5" />
                        </div>

                        <div className="flex-1">
                          <div className="font-bold text-sm flex items-center justify-between">
                            <span className="text-baku-carbon">{item.label}</span>
                            <div
                              className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                                isChecked
                                  ? 'border-baku-orange bg-baku-orange text-white'
                                  : 'border-baku-neutral/50 bg-baku-white'
                              }`}
                            >
                              {isChecked && (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-3.5 h-3.5">
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                              )}
                            </div>
                          </div>
                          <p className="text-xs text-baku-neutral mt-0.5">{item.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 5: WhatsApp y Beneficio Fundador */}
            {step === 5 && (
              <div className="space-y-4">
                <div className="mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-baku-orange">Paso Final</span>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-baku-carbon mt-1">
                    Beneficio Exclusivo de Fundador
                  </h2>
                </div>

                <div className="rounded-2xl bg-baku-white border-2 border-baku-orange/50 p-5 shadow-baku-card relative overflow-hidden">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="px-2.5 py-1 rounded-md bg-baku-red text-white text-xs font-extrabold tracking-wider uppercase">
                      $40 MXN DESC.
                    </span>
                    <span className="text-xs text-baku-carbon font-extrabold">
                      Comunidad Fundadora
                    </span>
                  </div>

                  <label className="block text-sm font-bold text-baku-carbon mb-2 leading-relaxed">
                    ¡Gracias por ayudarnos a definir el menú! Déjanos tu número de WhatsApp y te enviaremos tu beneficio de fundador: $40 MXN de descuento en tu primer pedido mayor a $180. (Beneficio exclusivo para quienes respondieron la encuesta).
                  </label>

                  <div className="relative mt-4">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-baku-neutral">
                      <WhatsAppIcon className="w-5 h-5 text-emerald-600" />
                      <span className="ml-2 text-xs font-extrabold text-baku-carbon border-r border-baku-border pr-2.5">
                        +52
                      </span>
                    </div>
                    <input
                      type="tel"
                      value={formData.whatsapp}
                      onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value.replace(/[^0-9]/g, '').slice(0, 10) })}
                      placeholder="10 dígitos (ej. 55 1234 5678)"
                      className="w-full pl-24 pr-4 py-3.5 rounded-xl bg-white border border-baku-border text-baku-carbon placeholder-baku-neutral/60 text-sm font-semibold tracking-wide focus:outline-none focus:border-baku-orange focus:ring-2 focus:ring-baku-orange/20 transition-all shadow-sm"
                    />
                  </div>

                  <div className="mt-4 flex items-start gap-2 text-[11px] text-baku-neutral">
                    <ShieldCheck className="w-4 h-4 text-baku-neutral shrink-0 mt-0.5" />
                    <span>Tu número se asociará a un código único de fundador. Cero spam, únicamente recibirás el menú y aviso de apertura.</span>
                  </div>
                </div>
              </div>
            )}

            {/* Validation alert */}
            {validationError && (
              <div className="mt-4 p-3.5 rounded-xl bg-red-50 border border-baku-red/40 text-baku-red text-xs font-medium flex items-center gap-2 animate-fade-in" role="alert">
                <Info className="w-4 h-4 text-baku-red shrink-0" />
                <span>{validationError}</span>
              </div>
            )}

            {/* Navigation buttons */}
            <div className="mt-8 pt-4 border-t border-baku-border flex items-center gap-3">
              {step > 1 && (
                <button
                  type="button"
                  onClick={prevStep}
                  disabled={isSubmitting}
                  className="py-3 px-4 rounded-xl bg-baku-white hover:bg-baku-subtle text-baku-carbon font-extrabold text-sm border border-baku-border shadow-sm transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Anterior</span>
                </button>
              )}

              {step < totalSurveySteps ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="flex-1 py-3.5 px-6 rounded-xl bg-baku-orange hover:bg-baku-orange-hover text-white font-extrabold text-sm shadow-baku-btn transition-all active:scale-[0.98] flex items-center justify-center gap-2 group cursor-pointer"
                >
                  <span>Continuar</span>
                  <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="flex-1 py-4 px-6 rounded-xl bg-baku-orange hover:bg-baku-orange-hover text-white font-extrabold text-sm shadow-baku-btn transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-75 disabled:cursor-not-allowed cursor-pointer"
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

      {/* Footer */}
      <footer className="w-full py-4 text-center border-t border-baku-border text-xs text-baku-neutral bg-baku-white/50">
        <div className="max-w-md sm:max-w-xl mx-auto px-4 flex items-center justify-between">
          <span className="font-medium">BAKU-BAKU SUSHI & FIRE • Dark Kitchen Local</span>
        </div>
      </footer>
    </div>
  );
}
