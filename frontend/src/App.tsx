import React, { useState } from 'react';
import { Users, AlertTriangle, TrendingDown, BarChart3 } from 'lucide-react'; // Install lucide-react for icons
import { ChurnSimulator } from './components/ChurnSimulator';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell 
} from 'recharts';

// Mock data for the visualization
const chartData = [
  { name: 'Month-to-Month', rate: 42, color: '#ef4444' },
  { name: 'One Year', rate: 11, color: '#f59e0b' },
  { name: 'Two Year', rate: 3, color: '#10b981' },
];

const App = () => {
  const [selectedCustomer] = useState({
    id: "7010-BRMAI",
    probability: 0.72,
    contract: "Month-to-month"
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Navigation Header */}
      <nav className="bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 p-2 rounded-lg">
            <BarChart3 className="text-white" size={20} />
          </div>
          <span className="font-bold text-xl tracking-tight text-slate-800">
            Solutions<span className="text-blue-600">Factory</span>
          </span>
        </div>
        <div className="text-sm font-medium text-slate-500">Churn Analytics Demo v2.0</div>
      </nav>

      <main className="max-w-7xl mx-auto p-8">
        {/* Header Section */}
        <header className="mb-8">
          <h1 className="text-3xl font-extrabold text-slate-900">Executive Dashboard</h1>
          <p className="text-slate-500 mt-1">Transforming customer data into retention intelligence.</p>
        </header>

        {/* KPI Scorecards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard title="Total Customers" value="7,043" icon={<Users className="text-blue-600" />} trend="+2.5%" />
          <StatCard title="Avg. Churn Risk" value="26.5%" icon={<TrendingDown className="text-amber-500" />} trend="-1.2%" />
          <StatCard title="High Risk Alerts" value="1,869" icon={<AlertTriangle className="text-red-500" />} trend="+4.0%" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Visualizations */}
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                Churn Rate by Contract Type
              </h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} unit="%" />
                    <Tooltip 
                      cursor={{fill: '#f8fafc'}}
                      contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} 
                    />
                    <Bar dataKey="rate" radius={[4, 4, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Placeholder for Customer Table */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-64 flex items-center justify-center text-slate-400 italic">
              Interactive Customer Table (Filterable by Risk Segment)
            </div>
          </div>

          {/* Side Panel: Intelligence Tools */}
          <div className="space-y-6">
             <ChurnSimulator initialData={selectedCustomer} />
             
             <div className="bg-blue-600 p-6 rounded-2xl text-white shadow-lg shadow-blue-200">
                <h4 className="font-bold text-lg mb-2">Proactive Retention</h4>
                <p className="text-blue-100 text-sm leading-relaxed">
                  Moving Month-to-Month customers to One-Year contracts reduces churn probability by an average of 31%.
                </p>
                <button className="mt-4 w-full bg-white text-blue-600 font-bold py-2 rounded-xl hover:bg-blue-50 transition-colors">
                  View Strategy Guide
                </button>
             </div>
          </div>
        </div>
      </main>
    </div>
  );
};

// Helper Component for Stats
const StatCard = ({ title, value, icon, trend }) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-blue-300 transition-colors cursor-default">
    <div className="flex justify-between items-start mb-4">
      <div className="p-2 bg-slate-50 rounded-lg">{icon}</div>
      <span className={`text-xs font-bold px-2 py-1 rounded-md ${trend.startsWith('+') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
        {trend}
      </span>
    </div>
    <p className="text-sm font-medium text-slate-500">{title}</p>
    <p className="text-2xl font-black text-slate-900 mt-1">{value}</p>
  </div>
);

export default App;