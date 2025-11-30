import React, { useState } from 'react';
import { Sparkles, ArrowRight, Loader2, FileText } from 'lucide-react';
import { analyzeReceiptText } from '../services/geminiService';
import { AIReceiptResponse } from '../types';

interface AIReceiptParserProps {
  onAnalysisComplete: (data: AIReceiptResponse) => void;
  onCancel: () => void;
}

const AIReceiptParser: React.FC<AIReceiptParserProps> = ({ onAnalysisComplete, onCancel }) => {
  const [inputText, setInputText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!inputText.trim()) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      const result = await analyzeReceiptText(inputText);
      onAnalysisComplete(result);
    } catch (err) {
      setError("Falha ao processar o recibo. Tente novamente ou insira manualmente.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-indigo-100 p-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="bg-indigo-100 p-2 rounded-lg">
          <Sparkles className="w-5 h-5 text-indigo-600" />
        </div>
        <h3 className="font-semibold text-gray-800">Dividir com IA</h3>
      </div>

      <p className="text-sm text-gray-600 mb-4">
        Cole o texto do recibo, ou descreva os itens (ex: "Pizza 50, Cerveja 20").
        O Gemini irá categorizar e sugerir a divisão.
      </p>

      <textarea
        className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm mb-4 resize-none"
        placeholder="Cole o texto do recibo aqui..."
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
        disabled={isAnalyzing}
      />

      {error && (
        <div className="mb-4 text-xs text-red-500 bg-red-50 p-2 rounded">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-3">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
          disabled={isAnalyzing}
        >
          Cancelar
        </button>
        <button
          onClick={handleAnalyze}
          disabled={!inputText.trim() || isAnalyzing}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors
            ${!inputText.trim() || isAnalyzing ? 'bg-indigo-300 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}
          `}
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Analisando...
            </>
          ) : (
            <>
              Processar
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default AIReceiptParser;
