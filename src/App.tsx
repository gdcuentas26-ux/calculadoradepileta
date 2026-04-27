/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, ReactNode } from 'react';
import { 
  Droplets, 
  Waves, 
  Trash2, 
  Info, 
  ChevronRight, 
  ChevronLeft, 
  Calculator, 
  CheckCircle2,
  AlertTriangle,
  CloudRain,
  ThermometerSun,
  FlaskConical,
  Sparkles,
  Loader2,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";

// --- Types & Constants ---

type PoolMaterial = 'cemento' | 'plastico' | 'lona';
type ChemicalType = 'cloro' | 'alguicida' | 'clarificante';
type ChlorineForm = 'liquido' | 'granulado' | 'polvo' | 'pastillas';

interface CalculationResult {
  chemicalName: string;
  amount: number; // in ml or grams
  unit: string;
  cups: number | null;
  instructions: string;
  useBuoy: boolean;
  dilute: boolean;
  tips: string[];
}

const CUP_SIZE_ML = 250;
const CUP_SIZE_G = 200;

// --- Helper Components ---

const Card = ({ children, className = "" }: { children: ReactNode, className?: string }) => (
  <div className={`bg-white rounded-2xl shadow-sm border border-blue-50 p-6 ${className}`}>
    {children}
  </div>
);

const Button = ({ 
  children, 
  onClick, 
  variant = 'primary', 
  disabled = false,
  className = "" 
}: { 
  children: ReactNode, 
  onClick?: () => void, 
  variant?: 'primary' | 'secondary' | 'outline',
  disabled?: boolean,
  className?: string
}) => {
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 shadow-md active:scale-95",
    secondary: "bg-cyan-500 text-white hover:bg-cyan-600 shadow-md active:scale-95",
    outline: "border-2 border-blue-100 text-blue-600 hover:bg-blue-50 active:scale-95"
  };

  return (
    <button 
      onClick={onClick} 
      disabled={disabled}
      className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 disabled:opacity-50 disabled:scale-100 ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
};

// --- Helper Functions ---

const formatCups = (decimal: number): string => {
  if (decimal <= 0) return "0";
  
  const whole = Math.floor(decimal);
  const remainder = decimal - whole;
  
  let fraction = "";
  // Round to nearest quarter
  if (remainder >= 0.125 && remainder < 0.375) fraction = "1/4";
  else if (remainder >= 0.375 && remainder < 0.625) fraction = "1/2";
  else if (remainder >= 0.625 && remainder < 0.875) fraction = "3/4";
  else if (remainder >= 0.875) return (whole + 1).toString();
  
  if (whole === 0) {
    return fraction || "menos de 1/4";
  }
  
  return fraction ? `${whole} y ${fraction}` : whole.toString();
};

// --- Main App ---

export default function App() {
  const [step, setStep] = useState(1);
  const [material, setMaterial] = useState<PoolMaterial | null>(null);
  const [knowsCapacity, setKnowsCapacity] = useState<boolean | null>(null);
  const [liters, setLiters] = useState<number>(0);
  const [dimensions, setDimensions] = useState({ length: 0, width: 0, depth: 0 });
  const [chemical, setChemical] = useState<ChemicalType | null>(null);
  const [chlorineForm, setChlorineForm] = useState<ChlorineForm | null>(null);
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [recommendation, setRecommendation] = useState<string | null>(null);
  const [loadingRec, setLoadingRec] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showPH, setShowPH] = useState(false);
  const [showShop, setShowShop] = useState(false);
  const [showManual, setShowManual] = useState(false);

  const openManual = () => {
    setShowManual(true);
    const url = new URL(window.location.href);
    url.searchParams.set('view', 'manual');
    window.history.pushState({}, '', url);
  };

  const closeManual = () => {
    setShowManual(false);
    const url = new URL(window.location.href);
    url.searchParams.delete('view');
    window.history.pushState({}, '', url);
  };

  const openPH = () => {
    setShowPH(true);
    const url = new URL(window.location.href);
    url.searchParams.set('view', 'ph');
    window.history.pushState({}, '', url);
  };

  const closePH = () => {
    setShowPH(false);
    const url = new URL(window.location.href);
    url.searchParams.delete('view');
    window.history.pushState({}, '', url);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('view') === 'ph') {
      setShowPH(true);
    }
    if (params.get('view') === 'manual') {
      setShowManual(true);
    }
  }, []);

  useEffect(() => {
    if (showPH || showShop || showManual || showAbout || showTerms) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [showPH, showShop, showManual, showAbout, showTerms]);

  useEffect(() => {
    if (showManual) {
      window.scrollTo(0, 0);
    }
  }, [showManual]);

  const fetchRecommendation = async (poolMaterial: PoolMaterial) => {
    setLoadingRec(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `Actúa como un experto en mantenimiento de piscinas. Recomienda el mejor tipo de cloro (líquido, granulado, polvo fino o pastillas) para una piscina de ${poolMaterial}. Explica brevemente por qué en un lenguaje simple y amigable. Máximo 2 oraciones.`;
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });
      
      setRecommendation(response.text || null);
    } catch (error) {
      console.error("Error fetching recommendation:", error);
      // Fallback recommendations if API fails
      const fallbacks = {
        cemento: "Para piletas de cemento, el cloro granulado es ideal por su efectividad y costo.",
        plastico: "En piletas de fibra, el cloro líquido es mejor para evitar manchas en el fondo.",
        lona: "Para piletas de lona, usá cloro líquido para no dañar ni decolorar el material."
      };
      setRecommendation(fallbacks[poolMaterial]);
    } finally {
      setLoadingRec(false);
    }
  };

  // Calculate volume if dimensions are provided
  useEffect(() => {
    if (knowsCapacity === false) {
      const vol = dimensions.length * dimensions.width * dimensions.depth * 1000;
      setLiters(vol);
    }
  }, [dimensions, knowsCapacity]);

  const [loadingResult, setLoadingResult] = useState(false);

  const calculate = async (selectedChemical?: ChemicalType, selectedForm?: ChlorineForm) => {
    const activeChemical = selectedChemical || chemical;
    const activeForm = selectedForm || chlorineForm;

    if (!activeChemical) return;
    if (activeChemical === 'cloro' && !activeForm) return;

    setLoadingResult(true);
    setStep(6); // Move to results step to show loading

    let chemicalName = '';
    let amount = 0;
    let unit = 'ml';
    let instructions = '';
    let useBuoy = false;
    let dilute = false;
    let tips: string[] = [];

    const vol10k = liters / 10000;

    // Local baseline calculation
    if (activeChemical === 'cloro') {
      chemicalName = `Cloro ${activeForm === 'liquido' ? 'Líquido' : activeForm === 'granulado' ? 'Granulado' : activeForm === 'polvo' ? 'en Polvo' : 'en Pastillas'}`;
      switch (activeForm) {
        case 'liquido':
          amount = vol10k * 500;
          unit = 'ml';
          instructions = "Verter directamente en el agua.";
          dilute = false;
          break;
        case 'granulado':
          amount = vol10k * 20;
          unit = 'g';
          instructions = "Disolver previamente en un balde.";
          dilute = true;
          break;
        case 'polvo':
          amount = vol10k * 20;
          unit = 'g';
          instructions = "Disolver en agua y esparcir.";
          dilute = true;
          break;
        case 'pastillas':
          amount = Math.ceil(liters / 20000);
          unit = amount === 1 ? 'pastilla' : 'pastillas';
          instructions = "Colocar en una boya flotante.";
          useBuoy = true;
          break;
      }
    } else if (activeChemical === 'alguicida') {
      chemicalName = 'Alguicida';
      amount = vol10k * 100;
      unit = 'ml';
      instructions = "Verter directamente en el agua.";
    } else if (activeChemical === 'clarificante') {
      chemicalName = 'Clarificante';
      amount = vol10k * 50;
      unit = 'ml';
      instructions = "Diluir en un balde y esparcir.";
      dilute = true;
    }

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `
        Actúa como un experto químico de piscinas. 
        Datos de la pileta:
        - Material: ${material}
        - Capacidad: ${liters} litros
        - Producto: ${chemicalName}
        
        Mi cálculo base es: ${amount} ${unit}.
        
        Por favor, verifica si esta dosis es correcta para mantenimiento regular. 
        Si no es exacta, corrígela. 
        Devuelve la respuesta estrictamente en formato JSON con la siguiente estructura:
        {
          "finalAmount": número,
          "finalUnit": "string (ml, g, o pastillas)",
          "finalInstructions": "string (instrucciones breves y claras)",
          "useBuoy": boolean,
          "dilute": boolean,
          "tips": ["string (3 consejos específicos para este caso)"]
        }
        Asegúrate de que las instrucciones mencionen si hay que diluir o no según el material (${material}).
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });

      const data = JSON.parse(response.text || "{}");
      
      const finalAmount = Number(data.finalAmount) || amount;
      const finalUnit = data.finalUnit || unit;
      
      let cups: number | null = null;
      if (activeForm !== 'pastillas' && finalUnit !== 'pastillas' && finalUnit !== 'pastilla') {
        const rawCups = finalUnit === 'g' ? finalAmount / CUP_SIZE_G : finalAmount / CUP_SIZE_ML;
        cups = Math.max(0.1, Number(rawCups.toFixed(1)));
      }

      setResult({
        chemicalName,
        amount: finalAmount,
        unit: finalUnit,
        cups,
        instructions: data.finalInstructions || instructions,
        useBuoy: data.useBuoy ?? useBuoy,
        dilute: data.dilute ?? dilute,
        tips: data.tips || tips
      });

    } catch (error) {
      console.error("Error verifying with Gemini:", error);
      // Fallback to local calculation if AI fails
      let cups: number | null = null;
      if (activeForm !== 'pastillas') {
        const rawCups = unit === 'g' ? amount / CUP_SIZE_G : amount / CUP_SIZE_ML;
        cups = Math.max(0.1, Number(rawCups.toFixed(1)));
      }
      setResult({
        chemicalName,
        amount: Math.round(amount),
        unit,
        cups,
        instructions,
        useBuoy,
        dilute,
        tips: [
          "Después de una lluvia fuerte, duplicar la dosis de cloro.",
          "Controlar el pH semanalmente (debe estar entre 7.2 y 7.6).",
          material === 'lona' || material === 'plastico' ? "Cuidado con los químicos granulados sin disolver, pueden decolorar el material." : "Mantener el filtro limpio para mejor efectividad."
        ]
      });
    } finally {
      setLoadingResult(false);
    }
  };

  const reset = () => {
    setStep(1);
    setMaterial(null);
    setKnowsCapacity(null);
    setLiters(0);
    setDimensions({ length: 0, width: 0, depth: 0 });
    setChemical(null);
    setChlorineForm(null);
    setResult(null);
    setRecommendation(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-12">
      {/* Header */}
      <header className="bg-blue-600 text-white p-6 rounded-b-[2.5rem] shadow-lg mb-8">
        <div 
          onClick={reset}
          className="max-w-md mx-auto flex items-center gap-3 cursor-pointer hover:opacity-90 transition-opacity"
        >
          <div className="bg-white/20 p-2 rounded-xl">
            <Waves className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold leading-tight">Mantenimiento de Pileta</h1>
            <p className="text-blue-100 text-sm">¿Cuánto cloro hay que ponerle a la pileta?</p>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4">
        {/* AdSense Top Placeholder */}
        <div className="mb-6 bg-slate-200/50 rounded-xl h-24 flex items-center justify-center text-slate-400 text-xs border border-dashed border-slate-300">
          Publicidad
        </div>

        <AnimatePresence mode="wait">
          {/* Step 1: Material */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 mb-6">
                <h2 className="text-blue-800 font-bold text-lg mb-2">Calculadora de Cloro Inteligente</h2>
                <p className="text-blue-700 text-sm leading-relaxed">
                  Si te preguntás <strong>"¿cuánto cloro le pongo a la pileta?"</strong> estás en el lugar correcto. 
                  Nuestra herramienta usa inteligencia artificial para darte la dosis exacta de cloro, 
                  alguicida y clarificante según las medidas de tu piscina.
                </p>
              </div>

              <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-slate-800">
                <Info className="text-blue-500 w-5 h-5" />
                ¿De qué material es tu pileta?
              </h2>
              <div className="grid gap-4">
                {[
                  { id: 'cemento', label: 'Material / Cemento', icon: '🏗️' },
                  { id: 'plastico', label: 'Plástico / Fibra de Vidrio', icon: '⛵' },
                  { id: 'lona', label: 'Lona / Estructural', icon: '🏊' }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => { setMaterial(item.id as PoolMaterial); setStep(2); }}
                    className="flex items-center gap-6 p-8 bg-white rounded-3xl shadow-sm border-2 border-transparent hover:border-blue-500 transition-all text-left hover:shadow-md group"
                  >
                    <span className="text-4xl group-hover:scale-110 transition-transform">{item.icon}</span>
                    <div className="flex flex-col">
                      <span className="font-black text-xl text-slate-700">{item.label}</span>
                    </div>
                    <ChevronRight className="ml-auto text-slate-300 group-hover:text-blue-500 transition-colors" />
                  </button>
                ))}
              </div>

              {/* pH Highlighted Section */}
              <div className="bg-amber-50 border-2 border-amber-200 p-6 rounded-3xl shadow-sm mt-8 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-amber-200/20 -mr-8 -mt-8 rounded-full blur-2xl"></div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="bg-amber-500 text-white p-2 rounded-xl shadow-sm group-hover:scale-110 transition-transform">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <h3 className="font-black text-amber-900 text-lg uppercase">¡EL PH ES CLAVE!</h3>
                </div>
                <p className="text-amber-800 text-sm mb-5 leading-relaxed">
                  Si el pH no es el correcto, el cloro <strong>pierde hasta el 80% de su efectividad</strong>. 
                  Mantenelo siempre entre 7.2 y 7.6.
                </p>
                <button 
                  onClick={openPH} 
                  className="bg-amber-100 hover:bg-amber-200 text-amber-950 px-5 py-3 rounded-2xl text-sm font-black inline-flex items-center gap-2 transition-colors border border-amber-300 shadow-sm"
                >
                  GUÍA COMPLETA DE PH <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Professional Manual Section */}
              <div className="mt-6">
                <button
                  onClick={openManual}
                  className="w-full group bg-gradient-to-br from-blue-600 to-blue-800 p-1 rounded-3xl shadow-xl hover:shadow-2xl transition-all"
                >
                  <div className="bg-white/10 backdrop-blur-sm rounded-[1.4rem] p-6 flex items-center justify-between group-hover:bg-white/20 transition-colors">
                    <div className="flex items-center gap-4 text-white">
                      <div className="bg-white text-blue-700 p-3 rounded-2xl shadow-lg">
                        <Sparkles className="w-6 h-6" />
                      </div>
                      <div className="text-left">
                        <h3 className="font-black text-lg leading-tight">MANUAL DE MANTENIMIENTO</h3>
                        <p className="text-blue-100 text-xs font-bold uppercase tracking-widest mt-1">Guía Completa 100% Online</p>
                      </div>
                    </div>
                    <ChevronRight className="text-white w-6 h-6 group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 2: Capacity Mode */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <button onClick={() => setStep(1)} className="text-blue-600 flex items-center gap-1 mb-2">
                <ChevronLeft className="w-4 h-4" /> Volver
              </button>
              <h2 className="text-xl font-bold mb-4">¿Sabés cuántos litros tiene?</h2>
              <div className="grid gap-3">
                <Button onClick={() => { setKnowsCapacity(true); setStep(3); }} variant="primary">
                  Sí, sé los litros
                </Button>
                <Button onClick={() => { setKnowsCapacity(false); setStep(4); }} variant="outline">
                  No, prefiero poner las medidas
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Liters Input */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <button onClick={() => setStep(2)} className="text-blue-600 flex items-center gap-1">
                <ChevronLeft className="w-4 h-4" /> Volver
              </button>
              <Card>
                <label className="block text-sm font-medium text-slate-500 mb-2">Capacidad en Litros</label>
                <div className="relative">
                  <input
                    type="number"
                    placeholder="Ej: 20000"
                    className="w-full text-3xl font-bold p-4 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-blue-500 outline-none"
                    onChange={(e) => setLiters(Number(e.target.value))}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">L</span>
                </div>
              </Card>
              <Button 
                onClick={() => setStep(5)} 
                disabled={liters <= 0} 
                className="w-full"
              >
                Continuar
              </Button>
            </motion.div>
          )}

          {/* Step 4: Dimensions Input */}
          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <button onClick={() => setStep(2)} className="text-blue-600 flex items-center gap-1">
                <ChevronLeft className="w-4 h-4" /> Volver
              </button>
              <Card className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Largo (metros)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="Ej: 6.5"
                    className="w-full p-3 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                    onChange={(e) => setDimensions({ ...dimensions, length: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Ancho (metros)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="Ej: 3.0"
                    className="w-full p-3 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                    onChange={(e) => setDimensions({ ...dimensions, width: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Profundidad promedio (metros)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="Ej: 1.5"
                    className="w-full p-3 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                    onChange={(e) => setDimensions({ ...dimensions, depth: Number(e.target.value) })}
                  />
                </div>
                <div className="pt-4 border-t border-slate-100">
                  <p className="text-sm text-slate-500">Capacidad estimada:</p>
                  <p className="text-2xl font-bold text-blue-600">{Math.round(liters).toLocaleString()} Litros</p>
                </div>
              </Card>
              <Button 
                onClick={() => setStep(5)} 
                disabled={liters <= 0} 
                className="w-full"
              >
                Continuar
              </Button>
            </motion.div>
          )}

          {/* Step 5: Chemical Selection */}
          {step === 5 && (
            <motion.div
              key="step5"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <button onClick={() => setStep(knowsCapacity ? 3 : 4)} className="text-blue-600 flex items-center gap-1">
                <ChevronLeft className="w-4 h-4" /> Volver
              </button>
              <h2 className="text-xl font-bold mb-4">¿Qué querés agregar hoy?</h2>
              
              {!chemical ? (
                <div className="grid gap-3">
                  <button 
                    onClick={() => { setChemical('cloro'); if (material) fetchRecommendation(material); }} 
                    className="flex items-center gap-4 p-6 bg-white rounded-2xl shadow-sm border-2 border-transparent hover:border-blue-500 transition-all group"
                  >
                    <div className="bg-blue-100 p-4 rounded-2xl text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      <Droplets className="w-6 h-6" />
                    </div>
                    <div className="text-left">
                      <span className="font-black text-xl block">Cloro</span>
                      <span className="text-sm text-slate-400">Desinfectante principal</span>
                    </div>
                  </button>
                  <button 
                    onClick={() => { setChemical('alguicida'); calculate('alguicida'); }} 
                    className="flex items-center gap-4 p-6 bg-white rounded-2xl shadow-sm border-2 border-transparent hover:border-green-500 transition-all group"
                  >
                    <div className="bg-green-100 p-4 rounded-2xl text-green-600 group-hover:bg-green-600 group-hover:text-white transition-colors">
                      <FlaskConical className="w-6 h-6" />
                    </div>
                    <div className="text-left">
                      <span className="font-black text-xl block">Alguicida</span>
                      <span className="text-sm text-slate-400">Evita el agua verde</span>
                    </div>
                  </button>
                  <button 
                    onClick={() => { setChemical('clarificante'); calculate('clarificante'); }} 
                    className="flex items-center gap-4 p-6 bg-white rounded-2xl shadow-sm border-2 border-transparent hover:border-cyan-500 transition-all group"
                  >
                    <div className="bg-cyan-100 p-4 rounded-2xl text-cyan-600 group-hover:bg-cyan-600 group-hover:text-white transition-colors">
                      <Waves className="w-6 h-6" />
                    </div>
                    <div className="text-left">
                      <span className="font-black text-xl block">Clarificante</span>
                      <span className="text-sm text-slate-400">Agua cristalina</span>
                    </div>
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {chemical === 'cloro' && (
                    <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-5 rounded-2xl text-white shadow-lg border border-blue-400/30">
                      <div className="flex items-center gap-2 mb-3">
                        <Sparkles className="w-5 h-5 text-blue-200" />
                        <h3 className="font-black uppercase tracking-wider text-xs text-blue-100">Recomendación IA</h3>
                      </div>
                      {loadingRec ? (
                        <div className="flex items-center gap-3 py-2">
                          <Loader2 className="w-5 h-5 animate-spin text-blue-200" />
                          <p className="text-sm font-medium text-blue-100 italic">Analizando tu pileta de {material}...</p>
                        </div>
                      ) : (
                        <p className="text-sm leading-relaxed font-medium">
                          {recommendation}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <p className="font-black text-blue-600 uppercase tracking-wider text-sm">Elegí el formato:</p>
                    <button onClick={() => { setChemical(null); setRecommendation(null); }} className="text-xs text-slate-400 underline">Cambiar producto</button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: 'liquido', label: 'Líquido', icon: '💧' },
                      { id: 'granulado', label: 'Granulado', icon: '🧂' },
                      { id: 'polvo', label: 'Polvo Fino', icon: '✨' },
                      { id: 'pastillas', label: 'Pastillas', icon: '⚪' }
                    ].map(form => (
                      <button 
                        key={form.id}
                        onClick={() => { setChlorineForm(form.id as ChlorineForm); }}
                        className={`p-5 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${chlorineForm === form.id ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-inner' : 'border-slate-100 bg-white text-slate-600 hover:border-blue-200'}`}
                      >
                        <span className="text-2xl">{form.icon}</span>
                        <span className="font-black text-sm">{form.label}</span>
                      </button>
                    ))}
                  </div>
                  <Button 
                    onClick={() => calculate()} 
                    disabled={!chlorineForm} 
                    className="w-full py-5 text-lg shadow-xl"
                  >
                    Calcular dosis ahora
                  </Button>
                </div>
              )}
            </motion.div>
          )}

          {/* Step 6: Results */}
          {step === 6 && (
            <motion.div
              key="step6"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-6"
            >
              {loadingResult ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                  <div className="relative">
                    <Loader2 className="w-16 h-16 text-blue-600 animate-spin" />
                    <Sparkles className="w-6 h-6 text-amber-400 absolute -top-1 -right-1 animate-pulse" />
                  </div>
                  <div className="text-center">
                    <h2 className="text-xl font-black text-slate-800">Verificando dosis...</h2>
                    <p className="text-slate-500 text-sm">La IA de Gemini está analizando la precisión para tu pileta de {material}.</p>
                  </div>
                </div>
              ) : result ? (
                <>
                  <div className="text-center space-y-2">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 text-green-600 rounded-full mb-2">
                      <CheckCircle2 className="w-10 h-10" />
                    </div>
                    <h2 className="text-2xl font-bold">¡Listo! Acá tenés la dosis</h2>
                    <p className="text-slate-500">Para tu pileta de {Math.round(liters).toLocaleString()} L</p>
                  </div>

                  <Card className="border-4 border-blue-600 bg-white text-center py-10 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2 bg-blue-600"></div>
                    <p className="text-blue-600 font-black uppercase tracking-widest text-sm mb-6">Dosis recomendada de {result.chemicalName}</p>
                    <div className="flex flex-col items-center justify-center">
                      <h3 className="text-7xl font-black mb-2 text-blue-700 drop-shadow-sm">
                        {result.amount} <span className="text-3xl font-bold text-blue-500">{result.unit}</span>
                      </h3>
                      {result.cups !== null && (
                        <div className="mt-6 inline-block bg-blue-50 px-8 py-3 rounded-2xl font-black text-2xl text-blue-800 border-2 border-blue-200 shadow-sm">
                          ≈ {formatCups(result.cups)} {result.cups <= 1 && result.cups > 0 ? 'taza' : 'tazas'}
                        </div>
                      )}
                    </div>
                  </Card>

                  <div className="space-y-4">
                    <h4 className="font-bold text-lg flex items-center gap-2">
                      <Calculator className="text-blue-500 w-5 h-5" />
                      Instrucciones de uso
                    </h4>
                    <p className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 leading-relaxed">
                      {result.instructions}
                    </p>

                    <div className="grid grid-cols-2 gap-3">
                      <div className={`p-4 rounded-2xl flex flex-col items-center gap-2 text-center ${result.dilute ? 'bg-orange-50 text-orange-700' : 'bg-slate-100 text-slate-400'}`}>
                        <Droplets className="w-6 h-6" />
                        <span className="text-xs font-bold uppercase">{result.dilute ? 'Hay que diluir' : 'No hace falta diluir'}</span>
                      </div>
                      <div className={`p-4 rounded-2xl flex flex-col items-center gap-2 text-center ${result.useBuoy ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-400'}`}>
                        <Waves className="w-6 h-6" />
                        <span className="text-xs font-bold uppercase">{result.useBuoy ? 'Usar boya' : 'Sin boya'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-bold text-lg flex items-center gap-2">
                      <Info className="text-blue-500 w-5 h-5" />
                      Consejos útiles
                    </h4>
                    <div className="space-y-3">
                      {result.tips.map((tip, i) => (
                        <div key={i} className="flex gap-3 p-4 bg-white rounded-2xl shadow-sm border border-slate-50">
                          <div className="mt-1"><AlertTriangle className="w-4 h-4 text-amber-500" /></div>
                          <p className="text-sm text-slate-600 leading-snug">{tip}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 pt-4">
                    <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                      <h5 className="font-bold text-blue-800 mb-2 flex items-center gap-2">
                        <CloudRain className="w-4 h-4" /> ¿Llovió?
                      </h5>
                      <p className="text-sm text-blue-700">La lluvia altera el pH y trae suciedad. Siempre reforzá el cloro después de una tormenta.</p>
                    </div>
                    <div className="p-4 bg-cyan-50 rounded-2xl border border-cyan-100">
                      <h5 className="font-bold text-cyan-800 mb-2 flex items-center gap-2">
                        <ThermometerSun className="w-4 h-4" /> Mucho calor
                      </h5>
                      <p className="text-sm text-cyan-700">Con temperaturas altas, el cloro se consume más rápido. Revisá el agua más seguido.</p>
                    </div>
                  </div>

                  <Button onClick={reset} variant="outline" className="w-full py-4">
                    Nueva consulta
                  </Button>
                </>
              ) : null}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer info */}
      <footer className="mt-12 text-center px-6 pb-12">
        <div className="flex justify-center gap-4 mb-6">
          <button onClick={() => setShowAbout(true)} className="text-blue-600 text-sm font-bold hover:underline">¿Qué hace esta página?</button>
          <button onClick={() => setShowTerms(true)} className="text-blue-600 text-sm font-bold hover:underline">Términos y Condiciones</button>
        </div>

        {/* AdSense Bottom Placeholder */}
        <div className="mb-8 bg-slate-200/50 rounded-xl h-64 flex items-center justify-center text-slate-400 text-xs border border-dashed border-slate-300">
          Publicidad
        </div>

        <p className="text-slate-400 text-xs">
          Esta calculadora ofrece dosis aproximadas para mantenimiento estándar de piletas. 
          Siempre lee las etiquetas de los productos químicos antes de aplicarlos.
        </p>
        <p className="text-slate-300 text-[10px] mt-4">
          &copy; {new Date().getFullYear()} Calculadora de Pileta - Especialistas en mantenimiento de piscinas.
        </p>
      </footer>

      {/* About Section Modal (Simple) */}
      {showAbout && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl p-8 max-w-md w-full max-h-[80vh] overflow-y-auto shadow-2xl relative"
          >
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-2xl font-black text-blue-600">¿Qué hace esta página?</h2>
              <button onClick={() => setShowAbout(false)} className="text-slate-400 hover:text-slate-600 transition-colors p-1">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="space-y-4 text-slate-600 leading-relaxed">
              <p>
                Nuestra misión es ayudarte a mantener tu pileta cristalina sin complicaciones. 
                Sabemos que calcular <strong>cuánto cloro hay que ponerle a la pileta</strong> puede ser confuso, 
                especialmente cuando varían los formatos (líquido, granulado o pastillas).
              </p>
              <p>
                Esta aplicación calcula el volumen de agua de tu piscina y, basándose en el material 
                (cemento, fibra o lona), determina la dosis exacta de químicos necesarios. 
                Utilizamos <strong>Inteligencia Artificial</strong> para optimizar las recomendaciones y 
                darte consejos profesionales de mantenimiento.
              </p>
              <p>
                Ya sea que necesites saber qué dosis de cloro poner o cómo aplicar alguicida y clarificante, 
                acá tenés una guía paso a paso simplificada.
              </p>
            </div>
            <Button onClick={() => setShowAbout(false)} className="w-full mt-8">Cerrar</Button>
          </motion.div>
        </div>
      )}

      {/* Terms Section Modal (Simple) */}
      {showTerms && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl p-8 max-w-md w-full max-h-[80vh] overflow-y-auto shadow-2xl relative"
          >
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-2xl font-black text-blue-600">Términos y Condiciones</h2>
              <button onClick={() => setShowTerms(false)} className="text-slate-400 hover:text-slate-600 transition-colors p-1">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="space-y-4 text-slate-600 text-sm leading-relaxed">
              <p><strong>Responsabilidad:</strong> Los valores proporcionados por esta calculadora son estimaciones teóricas basadas en promedios de mantenimiento de piscinas.</p>
              <p><strong>Seguridad:</strong> El manejo de productos químicos como el cloro debe hacerse con precaución. Siempre use guantes y protección ocular cuando sea necesario.</p>
              <p><strong>Exactitud:</strong> No nos hacemos responsables por daños materiales o problemas de salud derivados de un uso incorrecto de esta información. Siempre consulte el envase original del producto químico.</p>
              <p><strong>Privacidad:</strong> No guardamos tus datos personales. Todo el procesamiento se realiza para brindarte una respuesta inmediata.</p>
              <p><strong>Publicidad:</strong> Este sitio puede mostrar anuncios para financiar el servicio gratuito. Al usar este sitio, aceptas nuestra política de cookies.</p>
            </div>
            <Button onClick={() => setShowTerms(false)} className="w-full mt-8 text-slate-600 bg-slate-100 hover:bg-slate-200">Entendido</Button>
          </motion.div>
        </div>
      )}

      {/* Floating Action Button - Purchase link */}
      <div className="fixed bottom-6 right-6 z-40 pointer-events-none sm:pointer-events-auto">
        <motion.button
          onClick={() => setShowShop(true)}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="pointer-events-auto flex flex-col items-center gap-1 bg-white p-3 rounded-2xl shadow-2xl border-2 border-blue-600 group transition-all hover:bg-blue-50"
        >
          <div className="bg-blue-600 text-white p-2 rounded-xl group-hover:rotate-12 transition-transform">
            <Droplets className="w-5 h-5" />
          </div>
          <div className="text-center">
            <p className="text-[10px] font-black text-blue-600 leading-tight">¿NECESITÁS CLORO<br/>O ALGUICIDAS?</p>
            <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">Click aquí</p>
          </div>
        </motion.button>
      </div>

      {/* Shop Modal */}
      {showShop && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[110] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[2.5rem] w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col"
          >
            <div className="sticky top-0 bg-white/80 backdrop-blur-md p-6 border-b border-slate-100 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <div className="bg-blue-600 text-white p-2 rounded-xl">
                  <Droplets className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900 leading-tight">Insumos Recomendados</h2>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Productos de confianza</p>
                </div>
              </div>
              <button 
                onClick={() => setShowShop(false)} 
                className="bg-slate-100 p-2 rounded-full hover:bg-slate-200 transition-colors"
              >
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>

            <div className="p-6 space-y-3">
              {[
                { label: "Cloro líquido bidón 5 litros", url: "https://meli.la/2dSvTeg", icon: "💧", color: "blue" },
                { label: "Cloro granulado por 1 kg", url: "https://meli.la/1vJzw89", icon: "🧂", color: "blue" },
                { label: "Cloro granulado por 5 kg", url: "https://meli.la/2cM1NsE", icon: "🧂", color: "blue" },
                { label: "Pastillas Triple acción 1 kg", url: "https://meli.la/2iM7dx9", icon: "⚪", color: "blue" },
                { label: "Pastillas Triple acción 5 kgs", url: "https://meli.la/1abhh9i", icon: "⚪", color: "blue" },
                { label: "Alguicida por 1 lt", url: "https://meli.la/1f3pFow", icon: "🌿", color: "green" },
                { label: "Alguicida por 5 lts", url: "https://meli.la/2n73fTg", icon: "🌿", color: "green" },
                { label: "Clarificante por 1 lt", url: "https://meli.la/1gDmuNq", icon: "✨", color: "cyan" },
                { label: "Clarificante por 5 lts", url: "https://meli.la/2ygKfL5", icon: "✨", color: "cyan" },
                { label: "Combo Piletas de Lona", url: "https://meli.la/1xK8ooK", icon: "🏊", color: "amber" },
                { label: "Medidor pH/Cloro (Tiras)", url: "https://meli.la/1o2Lj9E", icon: "🧪", color: "amber" },
              ].map((item, idx) => (
                <a
                  key={idx}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-4 bg-slate-50 hover:bg-white hover:shadow-md border border-slate-100 rounded-2xl transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-2xl group-hover:scale-110 transition-transform">{item.icon}</span>
                    <span className="font-bold text-slate-700">{item.label}</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                </a>
              ))}
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100 text-center">
              <p className="text-[10px] text-slate-400 font-medium italic">
                * Enlaces externos sujetos a disponibilidad y precios de Mercado Libre.
              </p>
              <Button onClick={() => setShowShop(false)} variant="outline" className="w-full mt-4">
                Cerrar Lista
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* pH Info Modal/View */}
      {showPH && (
        <div className="fixed inset-0 bg-white z-[100] overflow-y-auto">
          <div className="max-w-2xl mx-auto px-6 py-12">
            <div className="flex justify-between items-center mb-8 sticky top-0 bg-white py-4 border-b border-slate-100 z-10">
              <div className="flex items-center gap-3">
                <div className="bg-amber-500 text-white p-2 rounded-xl">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <h2 className="text-3xl font-black text-slate-900">Guía de pH</h2>
              </div>
              <button 
                onClick={closePH} 
                className="bg-slate-100 p-3 rounded-full hover:bg-slate-200 transition-colors"
              >
                <X className="w-6 h-6 text-slate-600" />
              </button>
            </div>

            <div className="space-y-10 pb-20">
              <section className="bg-amber-50 p-8 rounded-[2rem] border-2 border-amber-100">
                <h3 className="text-xl font-black text-amber-900 mb-4">¿Por qué el pH es tan importante?</h3>
                <p className="text-amber-800 leading-relaxed text-lg">
                  El pH mide qué tan ácida o básica está el agua. Imaginalo como el "balance de energía" de 
                  tu pileta. Si este balance está mal, todo lo demás falla: el cloro no desinfecta, 
                  los ojos pican y el agua se pone turbia aunque le pongas kilos de producto.
                </p>
              </section>

              <div className="grid md:grid-cols-3 gap-6">
                <div className="p-6 bg-red-50 rounded-3xl border border-red-100">
                  <h4 className="font-black text-red-700 text-sm uppercase mb-2">pH Bajo (&lt; 7.2)</h4>
                  <p className="text-xs text-red-600 leading-relaxed">
                    <strong>Agua Ácida.</strong> Corroe partes metálicas, irrita ojos y piel. El cloro se consume rapidísimo.
                  </p>
                </div>
                <div className="p-6 bg-green-50 rounded-3xl border-2 border-green-500">
                  <h4 className="font-black text-green-700 text-sm uppercase mb-2">pH IDEAL (7.2 - 7.6)</h4>
                  <p className="text-xs text-green-800 leading-relaxed">
                    <strong>Balance Perfecto.</strong> El cloro rinde al máximo, el agua es cómoda y cristalina.
                  </p>
                </div>
                <div className="p-6 bg-blue-50 rounded-3xl border border-blue-100">
                  <h4 className="font-black text-blue-700 text-sm uppercase mb-2">pH Alto (&gt; 7.6)</h4>
                  <p className="text-xs text-blue-600 leading-relaxed">
                    <strong>Agua Alcalina.</strong> El cloro queda "bloqueado" y no mata bacterias. El agua se pone verde pronto.
                  </p>
                </div>
              </div>

              <section className="space-y-6">
                <h3 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                  <span className="bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm">1</span>
                  Cómo medir el pH
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  Usá un <strong>Kit Test</strong> (gotitas o cintas reactivas). Es recomendable hacerlo al menos 
                  dos veces por semana en verano.
                </p>
                <div className="flex gap-4 overflow-x-auto pb-2">
                  <div className="bg-slate-50 p-4 rounded-2xl min-w-[200px] border border-slate-100">
                    <div className="text-2xl mb-2">🧪</div>
                    <p className="text-sm font-bold">Gotitas (OTTO/Phenol)</p>
                    <p className="text-xs text-slate-400">Las más precisas y confiables.</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl min-w-[200px] border border-slate-100">
                    <div className="text-2xl mb-2">📏</div>
                    <p className="text-sm font-bold">Tiras Reactivas</p>
                    <p className="text-xs text-slate-400">Rápidas y fáciles de usar.</p>
                  </div>
                </div>
              </section>

              <section className="space-y-6">
                <h3 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                  <span className="bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm">2</span>
                  Cómo corregirlo
                </h3>
                <div className="space-y-4">
                  <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                    <h4 className="font-bold text-slate-800 mb-2">Si el pH está Alto (&gt; 7.6):</h4>
                    <p className="text-sm text-slate-600 mb-4">
                      Necesitás un <strong>Disminuidor de pH</strong> (ácido) o directamente sal de ácido. 
                      Seguí las dosis del envase y volvé a medir en 2 horas.
                    </p>
                  </div>
                  <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                    <h4 className="font-bold text-slate-800 mb-2">Si el pH está Bajo (&lt; 7.2):</h4>
                    <p className="text-sm text-slate-600">
                      Necesitás un <strong>Incrementador de pH</strong> (alcalinizante). Se agrega disuelto en agua 
                      y con el filtro en funcionamiento.
                    </p>
                  </div>
                </div>
              </section>

              <div className="bg-blue-600 text-white p-8 rounded-[2rem] shadow-xl text-center">
                <h4 className="text-xl font-black mb-3">CONSEJO PROFESIONAL</h4>
                <p className="text-blue-100">
                  Nunca agregues cloro si el pH está por encima de 8.0. Estarías tirando plata, 
                  ya que el cloro apenas podrá actuar en agua tan básica. Corregí el pH primero.
                </p>
              </div>

              <div className="text-center">
                <Button 
                  onClick={closePH}
                  className="px-12 py-5 text-xl"
                >
                  Volver a la Calculadora
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Professional Manual View */}
      {showManual && (
        <div className="fixed inset-0 bg-white z-[120] overflow-y-auto">
          <article className="max-w-3xl mx-auto px-6 py-12 font-sans text-slate-800">
            {/* SEO Structured Header */}
            <header className="mb-12 sticky top-0 bg-white/95 backdrop-blur-sm py-4 border-b border-slate-100 z-10 flex justify-between items-center">
              <div>
                <h1 className="text-3xl md:text-4xl font-black text-blue-900 leading-tight">
                  Guía Definitiva: Cómo Mantener tu Pileta Cristalina y Saludable
                </h1>
                <p className="text-slate-500 font-bold mt-2 uppercase tracking-tighter text-sm">Actualizado Abril 2024 • Mantenimiento Profesional</p>
              </div>
                <button 
                  onClick={closeManual} 
                  className="bg-slate-100 p-3 rounded-full hover:bg-slate-200 transition-colors ml-4 shrink-0"
                >
                <X className="w-6 h-6 text-slate-600" />
              </button>
            </header>

            <div className="space-y-12 prose prose-blue prose-lg max-w-none">
              <section className="bg-blue-50 p-8 rounded-[2.5rem] border border-blue-100 mb-12">
                <p className="text-lg text-blue-900 font-medium leading-relaxed m-0 italic">
                  "No se trata solo de tirar cloro. Tener una pileta '10 puntos' es una combinación de química, 
                  limpieza física y una rutina de filtrado constante. En esta guía online detallada te revelamos los secretos 
                  de los expertos para ahorrar tiempo y dinero."
                </p>
              </section>

              {/* Table of Contents - Interactive but clean */}
              <nav className="bg-slate-50 p-8 rounded-3xl border border-slate-100">
                <h2 className="text-xl font-black mb-4 text-slate-800">Contenido de la Guía:</h2>
                <ul className="grid gap-3 list-none p-0 m-0">
                  {[
                    { id: 'ph-balance', num: '1', title: 'El Secreto del pH: El Balance de Energía' },
                    { id: 'quimicos', num: '2', title: 'La Trilogía Química: Cloro, Alguicida y Clarificante' },
                    { id: 'limpieza', num: '3', title: 'La Rutina Física: Filtrado y Limpieza' },
                    { id: 'lluvia', num: '4', title: 'Protocolo Activo Post-Lluvia' },
                    { id: 'hibernacion', num: '5', title: 'Hibernación: Cómo cuidar el agua en invierno' },
                  ].map((item) => (
                    <li key={item.id}>
                      <button 
                        onClick={() => {
                          const el = document.getElementById(item.id);
                          if (el) {
                            const offset = 120; // sticky header height
                            const bodyRect = document.body.getBoundingClientRect().top;
                            const elementRect = el.getBoundingClientRect().top;
                            const elementPosition = elementRect - bodyRect;
                            const offsetPosition = elementPosition - offset;

                            window.scrollTo({
                              top: offsetPosition,
                              behavior: 'smooth'
                            });
                          }
                        }}
                        className="flex items-center gap-3 font-bold text-slate-600 hover:text-blue-600 transition-colors group text-left w-full"
                      >
                        <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center text-[10px] font-black transition-colors">{item.num}</span>
                        {item.title}
                      </button>
                    </li>
                  ))}
                </ul>
              </nav>

              <section id="ph-balance" className="scroll-mt-24">
                <h2 className="text-2xl font-black text-slate-900 mb-4 border-l-4 border-amber-500 pl-4 uppercase">1. El Secreto del pH: El Balance de Energía</h2>
                <p>
                  Antes de pensar en el cloro, tenés que medir el <strong>pH</strong>. Si el nivel no está entre <strong>7.2 y 7.6</strong>, 
                  los químicos no funcionan. Es la razón #1 por la cual la gente gasta dinero en cloro y el agua sigue turbia.
                </p>
                <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100 text-sm italic mt-4">
                  <strong>Tip de Ahorro:</strong> Medí el pH los lunes por la mañana. Si está alto, bajalo. Recién el martes poné los químicos.
                </div>
              </section>

              <section id="quimicos" className="scroll-mt-24">
                <h2 className="text-2xl font-black text-slate-900 mb-4 border-l-4 border-blue-500 pl-4 uppercase">2. La Trilogía Química: Cloro, Alguicida y Clarificante</h2>
                <div className="grid md:grid-cols-3 gap-6 mt-8">
                  <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                    <h3 className="font-black text-blue-600 mb-2 text-base">Cloro</h3>
                    <p className="text-sm">El desinfectante. Mata bacterias y hongos. Usalo todos los días al atardecer para que el sol no lo degrade.</p>
                  </div>
                  <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                    <h3 className="font-black text-green-600 mb-2 text-base">Alguicida</h3>
                    <p className="text-sm">El escudo protector. Previene que el agua se ponga verde. Una dosis semanal es suficiente.</p>
                  </div>
                  <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                    <h3 className="font-black text-cyan-600 mb-2 text-base">Clarificante</h3>
                    <p className="text-sm">El "imán" de suciedad. Junta las micropartículas para que decanten al fondo y puedas barrerlas.</p>
                  </div>
                </div>
              </section>

              <section id="limpieza" className="scroll-mt-24">
                <h2 className="text-2xl font-black text-slate-900 mb-4 border-l-4 border-indigo-500 pl-4 uppercase">3. La Rutina Física: Filtrado y Limpieza</h2>
                <p>
                  El filtrado es el 50% de la salud de tu pileta. En verano, deberías filtrar el agua <strong>al menos 4 a 6 horas diarias</strong>. 
                </p>
                <div className="grid gap-4">
                  <div className="bg-white p-6 rounded-3xl border border-slate-100 flex gap-4 items-start">
                    <div className="bg-blue-100 p-2 rounded-xl"><Droplets className="w-5 h-5 text-blue-600" /></div>
                    <div>
                      <h4 className="font-bold">Barrefondo</h4>
                      <p className="text-sm text-slate-500 italic">Lunes (después del clarificante el domingo noche).</p>
                    </div>
                  </div>
                  <div className="bg-white p-6 rounded-3xl border border-slate-100 flex gap-4 items-start">
                    <div className="bg-blue-100 p-2 rounded-xl"><Waves className="w-5 h-5 text-blue-600" /></div>
                    <div>
                      <h4 className="font-bold">Skimmer</h4>
                      <p className="text-sm text-slate-500 italic">Limpiá el canasto todos los días. Las hojas pudren el agua.</p>
                    </div>
                  </div>
                </div>
              </section>

              <section id="lluvia" className="bg-slate-900 text-white p-10 rounded-[3rem] shadow-2xl relative overflow-hidden scroll-mt-24">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                <h2 className="text-3xl font-black mb-6 text-blue-400 uppercase relative z-10">4. Protocolo Activo Post-Lluvia</h2>
                <p className="text-blue-100 mb-6 font-medium leading-relaxed">
                  La lluvia trae polvo, polen y altera el pH. Además, baja la concentración de desinfectante.
                </p>
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <div className="bg-blue-500/30 w-8 h-8 rounded-full flex items-center justify-center shrink-0">1</div>
                    <p>Subí el nivel de filtrado un par de horas más.</p>
                  </div>
                  <div className="flex gap-4">
                    <div className="bg-blue-500/30 w-8 h-8 rounded-full flex items-center justify-center shrink-0">2</div>
                    <p>Realizá un tratamiento de "Cloro de Choque" (duplicá la dosis habitual).</p>
                  </div>
                  <div className="flex gap-4">
                    <div className="bg-blue-500/30 w-8 h-8 rounded-full flex items-center justify-center shrink-0">3</div>
                    <p>Agregá clarificante si el agua queda opaca.</p>
                  </div>
                </div>
              </section>

              <section id="adsense-optimized" className="border-t border-slate-100 pt-12 text-center">
                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6">Información Útil para Mantenimiento</h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 text-left">
                    <p className="text-xs font-black text-slate-400 mb-2">PILETA DE LONA</p>
                    <p className="text-sm text-slate-600">Usar siempre boya. Nunca cloro granulado directo porque quema la lona.</p>
                  </div>
                  <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 text-left">
                    <p className="text-xs font-black text-slate-400 mb-2">PILETA DE NATACIÓN</p>
                    <p className="text-sm text-slate-600">El filtrado nocturno es más eficiente y consume menos energía.</p>
                  </div>
                </div>
              </section>

              <section id="hibernacion" className="bg-indigo-50 p-10 rounded-[3rem] border-2 border-indigo-100 relative overflow-hidden scroll-mt-24">
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-200/30 rounded-full blur-3xl"></div>
                <h2 className="text-2xl font-black text-indigo-900 mb-4 flex items-center gap-3 relative z-10 uppercase">
                  <span className="text-3xl">❄️</span> 
                  5. Hibernación: Cómo cuidar el agua en invierno
                </h2>
                <p className="text-indigo-800 font-medium mb-6 relative z-10">
                  Vaciar la pileta es un error crítico: daña la estructura por falta de presión y desperdicia miles de litros. 
                  Con este protocolo, el agua se mantiene intacta hasta la próxima temporada:
                </p>
                <div className="space-y-8 relative z-10">
                  <div className="flex gap-4">
                    <div className="bg-indigo-600 text-white w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 font-black shadow-lg">1</div>
                    <div>
                      <h4 className="font-black text-indigo-950 text-lg">El "Super Shock" Final</h4>
                      <p className="text-sm text-indigo-800 leading-relaxed">Antes de dejar de usarla, hacé un tratamiento de choque con el triple de cloro habitual y filtrá 6 horas continuas. Esto elimina cualquier bacteria latente.</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="bg-indigo-600 text-white w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 font-black shadow-lg">2</div>
                    <div>
                      <h4 className="font-black text-indigo-950 text-lg">Invernador: El Producto Mágico</h4>
                      <p className="text-sm text-indigo-800 leading-relaxed">Agregá un producto <strong>Invernador</strong> (vienen en bidones). Este químico "duerme" el agua, evitando que las algas crezcan aunque no haya filtrado diario.</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="bg-indigo-600 text-white w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 font-black shadow-lg">3</div>
                    <div>
                      <h4 className="font-black text-indigo-950 text-lg">Bloqueo Solar (Fundamental)</h4>
                      <p className="text-sm text-indigo-800 leading-relaxed">Las algas necesitan luz para vivir. Si usás un cobertor negro u opaco, podés mantener el agua cristalina casi sin químicos todo el invierno.</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="bg-indigo-600 text-white w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 font-black shadow-lg">4</div>
                    <div>
                      <h4 className="font-black text-indigo-950 text-lg">Chequeo Mensual</h4>
                      <p className="text-sm text-indigo-800 leading-relaxed">No la abandones del todo. Una vez por mes, prendé la bomba 1 hora para circular el agua y agregá un chorrito de cloro para mantener el refuerzo.</p>
                    </div>
                  </div>
                </div>
              </section>

              <footer className="pt-12 text-center border-t border-slate-100">
                <Button 
                  onClick={closeManual}
                  className="px-12 py-5 text-xl mb-4"
                >
                  Entendido, Volver a Calcular
                </Button>
                <p className="text-slate-400 text-xs mt-4 leading-relaxed">
                  © 2024 Mantenimiento de Piletas Profesionales. <br/>
                  Esta guía es informativa y los resultados dependen del estado de cada instalación.
                </p>
              </footer>
            </div>
          </article>
        </div>
      )}
    </div>
  );
}
