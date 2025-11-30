import React, { useMemo } from 'react';
import { Participant, ExpenseItem, Balance } from '../types';
import { TrendingUp, CheckCircle, MessageCircle, Wallet, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';

interface BalanceViewProps {
  participants: Participant[];
  expenses: ExpenseItem[];
}

const BalanceView: React.FC<BalanceViewProps> = ({ participants, expenses }) => {
  
  // Calculate summary stats per participant
  const summary = useMemo(() => {
    const stats: Record<string, { paid: number; consumed: number; net: number }> = {};
    
    // Initialize
    participants.forEach(p => {
        stats[p.id] = { paid: 0, consumed: 0, net: 0 };
    });

    expenses.forEach(expense => {
      // Add to paid amount
      if (stats[expense.paidBy]) {
        stats[expense.paidBy].paid += expense.amount;
      }

      // Add to consumed amount
      const splitCount = expense.splitAmong.length;
      if (splitCount > 0) {
        const share = expense.amount / splitCount;
        expense.splitAmong.forEach(consumerId => {
          if (stats[consumerId]) {
            stats[consumerId].consumed += share;
          }
        });
      }
    });

    // Calculate net
    Object.keys(stats).forEach(id => {
        stats[id].net = stats[id].paid - stats[id].consumed;
    });

    return participants.map(p => ({
        ...p,
        ...stats[p.id]
    }));
  }, [participants, expenses]);

  // Logic to calculate debts (simplified algorithm)
  const balances = useMemo(() => {
    // 1. Calculate net balance for each person
    const netBalances: Record<string, number> = {};
    participants.forEach(p => netBalances[p.id] = 0);

    expenses.forEach(expense => {
      // Who paid gets positive credit
      netBalances[expense.paidBy] += expense.amount;

      // Who consumed gets negative debit
      const splitCount = expense.splitAmong.length;
      if (splitCount > 0) {
        const amountPerPerson = expense.amount / splitCount;
        expense.splitAmong.forEach(consumerId => {
          if (netBalances[consumerId] !== undefined) {
             netBalances[consumerId] -= amountPerPerson;
          }
        });
      }
    });

    // 2. Resolve debts (Greedy algorithm simplified)
    const debtors = participants
        .filter(p => netBalances[p.id] < -0.01)
        .sort((a, b) => netBalances[a.id] - netBalances[b.id]); // Ascending (most negative first)
    
    const creditors = participants
        .filter(p => netBalances[p.id] > 0.01)
        .sort((a, b) => netBalances[b.id] - netBalances[a.id]); // Descending (most positive first)

    const transactions: Balance[] = [];

    let i = 0; // debtor index
    let j = 0; // creditor index

    while (i < debtors.length && j < creditors.length) {
      const debtor = debtors[i];
      const creditor = creditors[j];

      // Use absolute value for calculations
      const debtAmount = Math.abs(netBalances[debtor.id]);
      const creditAmount = netBalances[creditor.id];

      const amount = Math.min(debtAmount, creditAmount);
      
      if (amount > 0.01) {
          transactions.push({
            from: debtor.id,
            to: creditor.id,
            amount: amount
          });
      }

      // Update balances
      netBalances[debtor.id] += amount;
      netBalances[creditor.id] -= amount;

      // Move indices if settled
      if (Math.abs(netBalances[debtor.id]) < 0.01) i++;
      if (netBalances[creditor.id] < 0.01) j++;
    }

    return transactions;
  }, [participants, expenses]);

  const getParticipantName = (id: string) => participants.find(p => p.id === id)?.name || 'Desconhecido';

  const handleShareWhatsapp = () => {
    let message = "*📊 Resumo Racha AI Bichinho*\n\n";
    
    // Add Summary
    message += "*Extrato Individual:*\n";
    summary.forEach(p => {
        const status = p.net > 0.01 ? `Recebe R$ ${p.net.toFixed(2)}` : p.net < -0.01 ? `Paga R$ ${Math.abs(p.net).toFixed(2)}` : "Zerado";
        message += `👤 ${p.name}: ${status}\n`;
    });
    message += "\n";

    if (balances.length === 0) {
        message += "✅ *Tudo quitado! Ninguém deve nada.*\n";
    } else {
        message += "*💸 Pagamentos Necessários:*\n";
        balances.forEach(txn => {
            const payer = getParticipantName(txn.from);
            const receiver = getParticipantName(txn.to);
            message += `🔴 *${payer}* paga *${receiver}*: R$ ${txn.amount.toFixed(2)}\n`;
        });
    }
    
    message += "\n_Gerado pelo Racha AI Bichinho_ 🐾";

    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
  };

  const totalSpent = expenses.reduce((acc, curr) => acc + curr.amount, 0);

  if (expenses.length === 0) {
      return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
            <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Wallet className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-gray-800 font-bold text-lg">Nenhum dado ainda</h3>
            <p className="text-gray-500 text-sm mt-2">Adicione despesas para ver o balanço.</p>
        </div>
      );
  }

  return (
    <div className="space-y-6">
      
      {/* Resumo Geral */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
            <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                <Wallet className="w-4 h-4 text-emerald-600" />
                Resumo de Gastos
            </h2>
            <span className="text-xs font-semibold text-gray-500 bg-gray-200 px-2 py-1 rounded">
                Total: R$ {totalSpent.toFixed(2)}
            </span>
        </div>
        
        <div className="divide-y divide-gray-100">
            {summary.map((person) => (
                <div key={person.id} className="p-4 flex justify-between items-center">
                    <div>
                        <div className="font-bold text-gray-800 flex items-center gap-2">
                            {person.name}
                            {person.net > 0.01 && <ArrowDownCircle className="w-3 h-3 text-emerald-500" />}
                            {person.net < -0.01 && <ArrowUpCircle className="w-3 h-3 text-red-500" />}
                        </div>
                        <div className="text-xs text-gray-500 flex gap-3 mt-1">
                            <span>Pagou: <span className="text-gray-700">R$ {person.paid.toFixed(2)}</span></span>
                            <span>Consumiu: <span className="text-gray-700">R$ {person.consumed.toFixed(2)}</span></span>
                        </div>
                    </div>
                    <div className="text-right">
                        {Math.abs(person.net) < 0.01 ? (
                            <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded-full">Zerado</span>
                        ) : person.net > 0 ? (
                            <div className="flex flex-col items-end">
                                <span className="text-xs text-emerald-600 font-medium uppercase tracking-wide">Receber</span>
                                <span className="font-bold text-emerald-600">R$ {person.net.toFixed(2)}</span>
                            </div>
                        ) : (
                             <div className="flex flex-col items-end">
                                <span className="text-xs text-red-600 font-medium uppercase tracking-wide">Pagar</span>
                                <span className="font-bold text-red-600">R$ {Math.abs(person.net).toFixed(2)}</span>
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
      </div>

      {/* Pagamentos Pendentes (se houver) */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
            Pagamentos Necessários
        </h2>
        
        {balances.length === 0 ? (
           <div className="text-center py-6 bg-emerald-50 rounded-lg border border-emerald-100">
               <CheckCircle className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
               <p className="text-emerald-800 font-medium text-sm">Contas equilibradas!</p>
               <p className="text-emerald-600 text-xs">Ninguém precisa transferir nada para ninguém.</p>
           </div>
        ) : (
          <div className="space-y-4">
            {balances.map((txn, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 shadow-sm relative overflow-hidden">
                 <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-400"></div>
                 <div className="flex items-center gap-3 pl-2">
                    <div className="flex flex-col">
                        <span className="text-sm font-bold text-gray-800">{getParticipantName(txn.from)}</span>
                        <span className="text-xs text-gray-500">paga para</span>
                        <span className="text-sm font-bold text-emerald-700">{getParticipantName(txn.to)}</span>
                    </div>
                 </div>
                 <div className="font-bold text-gray-800 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                    R$ {txn.amount.toFixed(2)}
                 </div>
              </div>
            ))}
          </div>
        )}

        <button 
            onClick={handleShareWhatsapp}
            className="w-full mt-6 bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm"
        >
            <MessageCircle className="w-5 h-5" />
            Compartilhar no WhatsApp
        </button>
      </div>
    </div>
  );
};

export default BalanceView;