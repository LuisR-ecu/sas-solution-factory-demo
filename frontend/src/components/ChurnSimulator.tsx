import React, { useState, useEffect } from 'react';

export const ChurnSimulator = ({ initialData }) => {
  const [contract, setContract] = useState(initialData.contract);
  const [prob, setProb] = useState(initialData.probability);

  // Simulate real-time interaction [cite: 64]
  const handleContractChange = (newVal) => {
    setContract(newVal);
    // In a real app, you'd call your FastAPI endpoint here [cite: 65]
    const simulatedImpact = newVal === 'Two year' ? -0.3 : 0.2; 
    setProb(Math.min(Math.max(initialData.probability + simulatedImpact, 0), 1));
  };

  return (
    <div className="p-6 bg-white rounded-xl shadow-md border border-slate-100">
      <h3 className="text-lg font-bold text-slate-800 mb-4">Risk Optimizer (What-If?)</h3>
      <label className="block text-sm font-medium text-slate-600">Contract Type</label>
      <select 
        value={contract} 
        onChange={(e) => handleContractChange(e.target.value)}
        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500"
      >
        <option value="Month-to-month">Month-to-month</option>
        <option value="One year">One year</option>
        <option value="Two year">Two year</option>
      </select>

      <div className="mt-6">
        <p className="text-sm text-slate-500">Predicted Churn Risk</p>
        <div className="w-full bg-gray-200 rounded-full h-4 mt-2">
          <div 
            className={`h-4 rounded-full transition-all duration-500 ${prob > 0.5 ? 'bg-red-500' : 'bg-green-500'}`} 
            style={{ width: `${prob * 100}%` }}
          ></div>
        </div>
        <p className="text-right font-bold mt-1">{(prob * 100).toFixed(0)}%</p>
      </div>
    </div>
  );
};