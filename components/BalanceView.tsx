import React, { useMemo } from 'react';
import { Participant, ExpenseItem, Balance } from '../types';
import { TrendingUp, CheckCircle, Share2, MessageCircle } from 'lucide-react';

interface BalanceViewProps {
  participants: Participant[];
  expenses: ExpenseItem[];
}

const BalanceView: React.FC<BalanceViewProps> = ({ participants, expenses }) => {
  
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
    let message = "";
    
    if (balances.length === 0) {
        message = "Tudo quitado no Racha Conta! Ninguém deve nada. ✅";
    } else {
        message = "*📊 Resumo do Racha Conta*\n\n";
        balances.forEach(txn => {
            const payer = getParticipantName(txn.from);
            const receiver = getParticipantName(txn.to);
            message += `🔴 *${payer}* paga *${receiver}*: R$ ${txn.amount.toFixed(2)}\n`;
        });
        message += "\n_Gerado pelo Racha Conta Inteligente_ 💸";
    }

    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
            Balanço Final
        </h2>
        
        {balances.length === 0 ? (
           <div className="text-center py-8 text-gray-500">
               <CheckCircle className="w-12 h-12 mx-auto mb-2 text-emerald-400" />
               <p>Tudo quitado! Ninguém deve nada.</p>
           </div>
        ) : (
          <div className="space-y-4">
            {balances.map((txn, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                 <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-bold text-xs">
                        {getParticipantName(txn.from).charAt(0)}
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-900">{getParticipantName(txn.from)}</span>
                        <span className="text-xs text-gray-500">paga para <span className="font-semibold">{getParticipantName(txn.to)}</span></span>
                    </div>
                 </div>
                 <div className="font-bold text-gray-800">
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
            Enviar Resumo no WhatsApp
        </button>
      </div>
    </div>
  );
};

export default BalanceView;