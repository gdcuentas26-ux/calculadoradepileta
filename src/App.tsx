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
  Loader2
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
            <p className="text-blue-100 text-sm">Calculadora simple y rápida</p>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4">
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
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Info className="text-blue-500 w-5 h-5" />
                ¿De qué material es tu pileta?
              </h2>
              <div className="grid gap-3">
                {[
                  { id: 'cemento', label: 'Cemento / Material', icon: '🏗️' },
                  { id: 'plastico', label: 'Plástico / Fibra de Vidrio', icon: '🚤' },
                  { id: 'lona', label: 'Lona / Estructural', icon: '⛺' }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => { setMaterial(item.id as PoolMaterial); setStep(2); }}
                    className="flex items-center justify-between p-5 bg-white border-2 border-transparent hover:border-blue-500 rounded-2xl shadow-sm transition-all text-left"
                  >
                    <span className="text-lg font-medium flex items-center gap-3">
                      <span className="text-2xl">{item.icon}</span>
                      {item.label}
                    </span>
                    <ChevronRight className="text-slate-300" />
                  </button>
                ))}
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
      <footer className="mt-12 text-center px-6">
        <p className="text-slate-400 text-xs">
          Esta calculadora ofrece dosis aproximadas para mantenimiento estándar. 
          Siempre lee las instrucciones del fabricante del producto.
        </p>
      </footer>
    </div>
  );
}
