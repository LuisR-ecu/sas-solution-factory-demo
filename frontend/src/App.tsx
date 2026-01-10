import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { Users, AlertTriangle, TrendingDown, BarChart3, RefreshCw, ChevronRight } from 'lucide-react';
import { ChurnSimulator } from './components/ChurnSimulator';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell 
} from 'recharts';

// Use the Environment Variable we set in Docker-Compose
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

type Customer = {
  customer_id: string;
  tenure_months: number;
  monthly_charges: number;
  contract: string;
  internet: string;
  support_tickets: number;
  churn: number;
};

const App = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState("C001");

  // Fetch real data from your FastAPI backend on Proxmox
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`${API_BASE}/data/customers`);
        const data = await res.json();
        setCustomers(data);
        setLoading(false);
      } catch (err) {
        console.error("Failed to fetch from Proxmox VM:", err);
      }
    };
    fetchData();
  }, []);

  // Calculate real metrics from the data
  const totalCustomers = customers.length;
  const churnRate = ((customers.filter(c => c.churn === 1).length / totalCustomers) * 100).toFixed(1);
  const highRiskCount = customers.filter(c => c.support_tickets > 2).length;

  const currentCustomer = customers.find(c => c.customer_id === selectedId) || customers[0];

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <RefreshCw className="animate-spin text-blue-600" size={48} />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-slate-200 px-8 py-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-2 rounded-xl shadow-lg shadow-blue-200">
            <BarChart3 className="text-white" size={22} />
          </div>
          <span className="font-black text-xl tracking-tight text-slate-800">
            SAS <span className="text-blue-600">Solutions Factory</span>
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs font-bold bg-green-100 text-green-700 px-3 py-1 rounded-full uppercase tracking-wider">
            Live Lab: pve-01
          </span>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-8">
        <header className="mb-10">
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Retention Intelligence</h1>
          <p className="text-slate-500 text-lg mt-2 font-medium">Strategic insights for customer success and churn mitigation.</p>
        </header>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
          <StatCard title="Total Segment" value={totalCustomers.toString()} icon={<Users />} trend="+2.5%" color="blue" />
          <StatCard title="Churn Probability" value={`${churnRate}%`} icon={<TrendingDown />} trend="-1.2%" color="amber" />
          <StatCard title="At-Risk Accounts" value={highRiskCount.toString()} icon={<AlertTriangle />} trend="+4.0%" color="red" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 space-y-10">
            {/* Chart Section */}
            <section className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200/60">
              <h3 className="text-xl font-bold mb-8 text-slate-800 tracking-tight">Risk Distribution by Contract</h3>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[
                    { name: 'Month-to-Month', rate: 42 },
                    { name: 'One Year', rate: 11 },
                    { name: 'Two Year', rate: 3 },
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                    <YAxis axisLine={false} tickLine={false} unit="%" tick={{fill: '#64748b', fontSize: 12}} />
                    <Tooltip 
                      cursor={{fill: '#f8fafc'}}
                      contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)'}} 
                    />
                    <Bar dataKey="rate" radius={[6, 6, 0, 0]} barSize={50}>
                      <Cell fill="#ef4444" />
                      <Cell fill="#f59e0b" />
                      <Cell fill="#10b981" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            {/* Interactive Table */}
            <section className="bg-white rounded-3xl shadow-sm border border-slate-200/60 overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-bold text-slate-800">Customer Risk Registry</h3>
              </div>
              <table className="w-full text-left">
                <thead>
                  <tr className="text-slate-400 text-xs uppercase tracking-widest bg-slate-50/50">
                    <th className="px-6 py-4 font-semibold">Customer ID</th>
                    <th className="px-6 py-4 font-semibold">Contract</th>
                    <th className="px-6 py-4 font-semibold">Monthly</th>
                    <th className="px-6 py-4 font-semibold">Status</th>
                    <th className="px-6 py-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {customers.slice(0, 5).map((c) => (
                    <tr 
                      key={c.customer_id} 
                      onClick={() => setSelectedId(c.customer_id)}
                      className={`group hover:bg-blue-50/50 cursor-pointer transition-colors ${selectedId === c.customer_id ? 'bg-blue-50' : ''}`}
                    >
                      <td className="px-6 py-4 font-bold text-slate-700">{c.customer_id}</td>
                      <td className="px-6 py-4 text-slate-500 text-sm">{c.contract}</td>
                      <td className="px-6 py-4 font-medium text-slate-700">${c.monthly_charges}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${c.churn ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                          {c.churn ? 'Churned' : 'Active'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <ChevronRight size={16} className="text-slate-300 group-hover:text-blue-500" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </div>

          {/* Sidebar */}
          <aside className="space-y-8">
            {currentCustomer && (
               <ChurnSimulator 
                 initialData={{
                   id: currentCustomer.customer_id,
                   probability: currentCustomer.churn ? 0.85 : 0.12,
                   contract: currentCustomer.contract
                 }} 
               />
            )}
             
            <div className="bg-gradient-to-br from-indigo-600 to-blue-700 p-8 rounded-[2rem] text-white shadow-xl shadow-blue-200">
                <h4 className="font-black text-xl mb-3 tracking-tight">Retention Strategy</h4>
                <p className="text-blue-100 text-sm leading-relaxed mb-6">
                  Our model indicates that <span className="font-bold text-white italic">Fiber Optic</span> users with <span className="font-bold text-white italic">Month-to-Month</span> contracts are 4x more likely to churn.
                </p>
                <button className="w-full bg-white text-blue-700 font-bold py-3 rounded-2xl hover:bg-blue-50 transition-all transform active:scale-95 shadow-md">
                  Generate Action Plan
                </button>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
};

// Polished Stat Card Component
const StatCard = ({ title, value, icon, trend, color }: StatCardProps & { color: string }) => {
  const colorMap: any = {
    blue: "text-blue-600 bg-blue-50",
    amber: "text-amber-600 bg-amber-50",
    red: "text-red-600 bg-red-50"
  };

  return (
    <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-200/60 hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300">
      <div className="flex justify-between items-start mb-6">
        <div className={`p-3 rounded-2xl ${colorMap[color]}`}>{icon}</div>
        <div className="flex flex-col items-end">
          <span className={`text-xs font-black px-2 py-1 rounded-lg ${trend.startsWith('+') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
            {trend}
          </span>
          <span className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-widest text-right">vs Last Month</span>
        </div>
      </div>
      <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">{title}</p>
      <p className="text-4xl font-black text-slate-900 mt-2">{value}</p>
    </div>
  );
};

export default App;