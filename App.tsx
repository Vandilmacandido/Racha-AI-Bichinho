import React, { useState, useEffect } from 'react';
import { 
  Plus, Users, Home, Receipt, DollarSign, BrainCircuit, 
  Trash2, ChevronRight, UserPlus, FileText, Check, Percent, Sparkles
} from 'lucide-react';
import { Participant, ExpenseItem, AIReceiptResponse } from './types';
import AIReceiptParser from './components/AIReceiptParser';
import BalanceView from './components/BalanceView';
import AdBanner from './components/AdBanner';
import { generateSpendingInsights } from './services/geminiService';

// --- MOCK DATA FOR INITIALIZATION ---
const INITIAL_PARTICIPANTS: Participant[] = [
  { id: 'u1', name: 'EU' },
];

enum View {
  DASHBOARD = 'DASHBOARD',
  ADD_EXPENSE = 'ADD_EXPENSE',
  BALANCE = 'BALANCE'
}

function App() {
  // State
  const [participants, setParticipants] = useState<Participant[]>(INITIAL_PARTICIPANTS);
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [currentView, setCurrentView] = useState<View>(View.DASHBOARD);
  const [insights, setInsights] = useState<string | null>(null);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);

  // Add Participant State
  const [newParticipantName, setNewParticipantName] = useState('');

  // Add Expense State
  const [newExpenseName, setNewExpenseName] = useState('');
  const [newExpenseAmount, setNewExpenseAmount] = useState('');
  const [newExpensePayer, setNewExpensePayer] = useState(INITIAL_PARTICIPANTS[0].id);
  const [newExpenseSplitAmong, setNewExpenseSplitAmong] = useState<string[]>([]);
  const [showAIParser, setShowAIParser] = useState(false);

  // Global Tip State (Dashboard)
  const [globalTipOption, setGlobalTipOption] = useState<'0' | '10' | '12' | '15' | 'custom'>('10');
  const [globalCustomTipValue, setGlobalCustomTipValue] = useState('');
  // We keep the state but hide the UI selector, defaulting to first user as the "payer" of the tip for accounting purposes
  const [globalTipPayer, setGlobalTipPayer] = useState(INITIAL_PARTICIPANTS[0].id);
  const [showTipWidget, setShowTipWidget] = useState(false);

  // Initialize split selection when entering add view or participants change
  useEffect(() => {
    if (currentView === View.ADD_EXPENSE) {
       // Default: Everyone is involved
       setNewExpenseSplitAmong(participants.map(p => p.id));
    }
  }, [currentView, participants]);

  // Update default payer when participants change
  useEffect(() => {
    if (participants.length > 0 && !participants.find(p => p.id === globalTipPayer)) {
        setGlobalTipPayer(participants[0].id);
    }
  }, [participants, globalTipPayer]);

  // --- HANDLERS ---

  const handleAddParticipant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newParticipantName.trim()) return;

    const newPerson: Participant = {
        id: `u${Date.now()}`,
        name: newParticipantName.trim()
    };

    setParticipants([...participants, newPerson]);
    setNewParticipantName('');
  };

  const handleRemoveParticipant = (id: string) => {
     // Prevent removing if they are part of expenses (simplified check)
     const hasExpenses = expenses.some(e => e.paidBy === id || e.splitAmong.includes(id));
     if (hasExpenses) {
         alert("Não é possível remover alguém que já possui despesas registradas.");
         return;
     }
     setParticipants(participants.filter(p => p.id !== id));
  };

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(newExpenseAmount);

    if (!newExpenseName || amount <= 0) return;
    if (newExpenseSplitAmong.length === 0) {
        alert("Selecione pelo menos uma pessoa para dividir a conta.");
        return;
    }

    const expense: ExpenseItem = {
      id: Date.now().toString(),
      name: newExpenseName,
      amount: amount,
      category: 'Geral',
      paidBy: newExpensePayer,
      splitAmong: newExpenseSplitAmong,
      date: new Date().toISOString()
    };

    setExpenses([...expenses, expense]);
    resetForm();
    setCurrentView(View.DASHBOARD);
  };

  const handleAddGlobalTip = () => {
      const currentTotal = expenses.reduce((acc, curr) => acc + curr.amount, 0);
      if (currentTotal <= 0) {
          alert("Adicione despesas antes de calcular a taxa de serviço.");
          return;
      }

      let tipAmount = 0;
      let tipName = "Taxa de Serviço";

      if (globalTipOption === 'custom') {
          tipAmount = parseFloat(globalCustomTipValue) || 0;
          tipName = `Taxa de Serviço (Manual)`;
      } else {
          const pct = parseInt(globalTipOption);
          tipAmount = currentTotal * (pct / 100);
          tipName = `Taxa de Serviço (${pct}%)`;
      }

      if (tipAmount <= 0) return;

      const expense: ExpenseItem = {
        id: `tip-${Date.now()}`,
        name: tipName,
        amount: tipAmount,
        category: 'Taxa',
        paidBy: globalTipPayer,
        splitAmong: participants.map(p => p.id), // Tip usually split among everyone
        date: new Date().toISOString()
      };

      setExpenses([...expenses, expense]);
      setShowTipWidget(false);
  };

  const toggleSplitParticipant = (id: string) => {
      setNewExpenseSplitAmong(prev => {
          if (prev.includes(id)) {
              return prev.filter(pId => pId !== id);
          } else {
              return [...prev, id];
          }
      });
  };

  const handleAIAnalysisComplete = (data: AIReceiptResponse) => {
    if (data.items.length > 0) {
        setNewExpenseName(data.items.map(i => i.description).join(', ').slice(0, 30) + (data.items.length > 1 ? '...' : ''));
        setNewExpenseAmount(data.total.toString());
    }
    setShowAIParser(false);
  };

  const resetForm = () => {
    setNewExpenseName('');
    setNewExpenseAmount('');
    setNewExpensePayer(participants[0].id);
    setNewExpenseSplitAmong(participants.map(p => p.id));
    setShowAIParser(false);
  };

  const handleDeleteExpense = (id: string) => {
    setExpenses(expenses.filter(e => e.id !== id));
  };

  const handleGenerateInsights = async () => {
    if (expenses.length === 0) return;
    setIsGeneratingInsights(true);
    const text = await generateSpendingInsights(expenses, participants);
    setInsights(text);
    setIsGeneratingInsights(false);
  };

  // --- RENDER HELPERS ---

  const renderDashboard = () => {
    const totalGroupAmount = expenses.reduce((acc, curr) => acc + curr.amount, 0);

    return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Total Card */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10">
            <p className="text-emerald-100 text-sm font-medium mb-1">Total do Grupo</p>
            <h1 className="text-4xl font-bold">
            R$ {totalGroupAmount.toFixed(2)}
            </h1>
            <div className="mt-4 flex gap-2">
                <button 
                    onClick={() => handleGenerateInsights()}
                    className="bg-white/20 hover:bg-white/30 backdrop-blur-sm text-xs py-1.5 px-3 rounded-full flex items-center gap-1 transition-colors"
                    disabled={isGeneratingInsights}
                >
                    <BrainCircuit className="w-3 h-3" />
                    {isGeneratingInsights ? 'Analisando...' : 'Gerar Insights IA'}
                </button>
            </div>
            {insights && (
                <div className="mt-4 p-3 bg-white/10 rounded-lg text-xs leading-relaxed border border-white/20">
                    {insights}
                </div>
            )}
        </div>
        <Percent className="absolute -right-4 -bottom-4 w-32 h-32 text-emerald-500/20 rotate-12" />
      </div>

      {/* Service Charge / Tip Widget */}
      <div className="bg-white rounded-xl shadow-sm border border-emerald-100 p-4">
          <div 
            className="flex justify-between items-center cursor-pointer"
            onClick={() => setShowTipWidget(!showTipWidget)}
          >
              <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                  <div className="bg-emerald-100 p-1 rounded">
                    <Percent className="w-4 h-4 text-emerald-600" />
                  </div>
                  Adicionar Taxa de Serviço
              </h2>
              <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${showTipWidget ? 'rotate-90' : ''}`} />
          </div>

          {showTipWidget && (
            <div className="mt-4 space-y-4 animate-in slide-in-from-top-2">
                 <p className="text-xs text-gray-500">
                    Adicione uma porcentagem sobre o total atual (R$ {totalGroupAmount.toFixed(2)}). Isso será dividido igualmente entre todos.
                 </p>
                 
                 {/* Percentage Selection */}
                 <div className="flex gap-2">
                      {['10', '12', '15'].map((opt) => (
                          <button
                              key={opt}
                              onClick={() => { setGlobalTipOption(opt as any); setGlobalCustomTipValue(''); }}
                              className={`flex-1 py-2 text-sm rounded-lg border transition-all ${
                                  globalTipOption === opt
                                  ? 'bg-emerald-600 border-emerald-600 text-white font-bold'
                                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                              }`}
                          >
                              {opt}%
                          </button>
                      ))}
                      <button
                          onClick={() => setGlobalTipOption('custom')}
                          className={`flex-1 py-2 text-sm rounded-lg border transition-all ${
                              globalTipOption === 'custom'
                              ? 'bg-emerald-600 border-emerald-600 text-white font-bold'
                              : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                          }`}
                      >
                          R$
                      </button>
                  </div>

                  {globalTipOption === 'custom' && (
                      <input
                          type="number"
                          step="0.01"
                          value={globalCustomTipValue}
                          onChange={(e) => setGlobalCustomTipValue(e.target.value)}
                          placeholder="Valor da taxa"
                          className="w-full p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 placeholder-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                      />
                  )}

                  <div className="flex gap-3 pt-2">
                    <button
                        onClick={() => setShowTipWidget(false)}
                        className="flex-1 bg-white border border-gray-300 text-gray-700 font-medium py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleAddGlobalTip}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 rounded-lg text-sm shadow-sm transition-colors"
                    >
                        Aplicar Taxa
                    </button>
                  </div>
            </div>
          )}
      </div>

      {/* Participants Management */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <h2 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-600" />
              Pessoas no Grupo
          </h2>
          <div className="flex flex-wrap gap-2 mb-3">
              {participants.map(p => (
                  <div key={p.id} className="bg-gray-50 border border-gray-200 rounded-full px-3 py-1 text-sm flex items-center gap-2 group">
                      <span className="text-gray-700">{p.name}</span>
                      {/* Simple way to verify removal availability - usually hidden in production unless edit mode */}
                      <button onClick={() => handleRemoveParticipant(p.id)} className="text-gray-300 hover:text-red-500">
                        &times;
                      </button>
                  </div>
              ))}
          </div>
          <form onSubmit={handleAddParticipant} className="flex gap-2">
              <input 
                  type="text" 
                  placeholder="Nome do amigo..." 
                  className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  value={newParticipantName}
                  onChange={(e) => setNewParticipantName(e.target.value)}
              />
              <button 
                type="submit"
                disabled={!newParticipantName.trim()}
                className="bg-emerald-600 text-white p-2 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
              >
                  <UserPlus className="w-4 h-4" />
              </button>
          </form>
      </div>

      {/* Expense List */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-bold text-gray-800">Despesas Recentes</h2>
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">{expenses.length} itens</span>
        </div>
        
        {expenses.length === 0 ? (
            <div className="text-center py-10 bg-white rounded-xl border border-dashed border-gray-300">
                <div className="bg-gray-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Receipt className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-gray-500 text-sm">Nenhuma despesa ainda.</p>
                <button 
                    onClick={() => setCurrentView(View.ADD_EXPENSE)}
                    className="text-emerald-600 font-medium text-sm mt-2 hover:underline"
                >
                    Adicionar a primeira
                </button>
            </div>
        ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 divide-y divide-gray-100">
            {expenses.map((expense) => (
                <div key={expense.id} className="p-4 flex justify-between items-center hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${expense.category === 'Taxa' ? 'bg-emerald-100 text-emerald-600' : 'bg-emerald-100 text-emerald-600'}`}>
                        {expense.category === 'Taxa' ? <Percent className="w-5 h-5" /> : <DollarSign className="w-5 h-5" />}
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-800">{expense.name}</h3>
                        <div className="flex gap-2 text-xs text-gray-500">
                            <span>Pag: {participants.find(p => p.id === expense.paidBy)?.name}</span>
                            <span>•</span>
                            <span>Div: {expense.splitAmong.length} pessoas</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <span className="font-bold text-gray-900">R$ {expense.amount.toFixed(2)}</span>
                    <button onClick={() => handleDeleteExpense(expense.id)} className="text-gray-400 hover:text-red-500">
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
                </div>
            ))}
            </div>
        )}
      </div>
      
      <AdBanner location="Dashboard Bottom" />
    </div>
  );
  };

  const renderAddExpense = () => {
    return (
      <div className="space-y-6 animate-in slide-in-from-bottom-5 duration-300">
        <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-800">Nova Despesa</h2>
            <button onClick={() => setShowAIParser(!showAIParser)} className="text-sm font-medium text-indigo-600 flex items-center gap-1">
                <Sparkles className="w-4 h-4" />
                {showAIParser ? 'Modo Manual' : 'Usar IA'}
            </button>
        </div>

        <AdBanner location="Add Screen Top" />

        {showAIParser ? (
          <AIReceiptParser 
              onAnalysisComplete={handleAIAnalysisComplete} 
              onCancel={() => setShowAIParser(false)} 
          />
        ) : (
          <form onSubmit={handleAddExpense} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
              {/* O que e Quanto */}
              <div className="grid grid-cols-1 gap-4">
                  <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                      <input
                          type="text"
                          value={newExpenseName}
                          onChange={(e) => setNewExpenseName(e.target.value)}
                          placeholder="Ex: Jantar Pizza"
                          className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          required
                      />
                  </div>

                  <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Valor (R$)</label>
                      <input
                          type="number"
                          step="0.01"
                          value={newExpenseAmount}
                          onChange={(e) => setNewExpenseAmount(e.target.value)}
                          placeholder="0.00"
                          className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-lg font-semibold"
                          required
                      />
                  </div>
              </div>

              {/* Dividir com quem */}
              <div>
                  <div className="flex justify-between items-center mb-2">
                      <label className="block text-sm font-medium text-gray-700">Dividir com quem?</label>
                      <button 
                          type="button"
                          onClick={() => {
                              if (newExpenseSplitAmong.length === participants.length) {
                                  setNewExpenseSplitAmong([]);
                              } else {
                                  setNewExpenseSplitAmong(participants.map(p => p.id));
                              }
                          }}
                          className="text-xs text-emerald-600 font-medium"
                      >
                          {newExpenseSplitAmong.length === participants.length ? 'Desmarcar todos' : 'Marcar todos'}
                      </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                      {participants.map(p => {
                          const isSelected = newExpenseSplitAmong.includes(p.id);
                          return (
                              <button
                                  key={p.id}
                                  type="button"
                                  onClick={() => toggleSplitParticipant(p.id)}
                                  className={`px-3 py-2 text-sm rounded-lg border transition-all flex items-center justify-between ${
                                      isSelected
                                      ? 'bg-emerald-50 border-emerald-500 text-emerald-700 font-medium' 
                                      : 'bg-white border-gray-200 text-gray-400'
                                  }`}
                              >
                                  <span>{p.name}</span>
                                  {isSelected && <Check className="w-3.5 h-3.5" />}
                              </button>
                          );
                      })}
                  </div>
                  {newExpenseSplitAmong.length === 0 && (
                      <p className="text-xs text-red-500 mt-1">Selecione pelo menos uma pessoa.</p>
                  )}
              </div>

              <div className="pt-2">
                  <button
                      type="submit"
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-emerald-600/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                      <Plus className="w-5 h-5" />
                      Salvar Despesa
                  </button>
              </div>
          </form>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24 font-sans text-gray-900">
      
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 py-3 flex justify-center items-center">
          <div className="flex items-center gap-3">
            <span className="font-bold text-lg tracking-tight text-gray-800">Racha AI <span className="text-emerald-600">Bichinho</span></span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-md mx-auto px-4 py-6">
        {currentView === View.DASHBOARD && renderDashboard()}
        {currentView === View.ADD_EXPENSE && renderAddExpense()}
        {currentView === View.BALANCE && (
            <div className="animate-in fade-in duration-500">
                <BalanceView participants={participants} expenses={expenses} />
                <AdBanner location="Balance Screen" />
            </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-safe z-50">
        <div className="max-w-md mx-auto flex justify-around items-center h-16 px-2">
          <button 
            onClick={() => setCurrentView(View.DASHBOARD)}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${currentView === View.DASHBOARD ? 'text-emerald-600' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <Home className="w-6 h-6" />
            <span className="text-[10px] font-medium">Início</span>
          </button>
          
          <button 
            onClick={() => {
                resetForm();
                setCurrentView(View.ADD_EXPENSE);
            }}
            className="flex flex-col items-center justify-center w-full h-full -mt-6"
          >
            <div className="bg-emerald-600 text-white rounded-full p-3 shadow-lg shadow-emerald-600/30 hover:bg-emerald-700 transition-colors transform active:scale-95">
                <Plus className="w-7 h-7" />
            </div>
            <span className="text-[10px] font-medium text-gray-600 mt-1">Adicionar</span>
          </button>

          <button 
            onClick={() => setCurrentView(View.BALANCE)}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${currentView === View.BALANCE ? 'text-emerald-600' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <Users className="w-6 h-6" />
            <span className="text-[10px] font-medium">Balanço</span>
          </button>
        </div>
      </nav>
      
      {/* Safe area padding for mobile nav */}
      <div className="h-safe-bottom" />
    </div>
  );
}

export default App;