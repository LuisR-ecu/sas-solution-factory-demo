import { useState, useEffect } from 'react';
import './App.css';
import { Users, AlertTriangle, TrendingDown, BarChart3, RefreshCw, ChevronRight, LayoutDashboard, Database } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

// TARGET: Your Proxmox VM Tailscale IP
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const App = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`${API_BASE}/data/customers`);
        if (!res.ok) throw new Error('Backend Offline');
        const data = await res.json();
        setCustomers(data);
        setLoading(false);
      } catch (err) {
        console.error("Connection Error:", err);
        setError(true);
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-blue-500">
      <RefreshCw className="animate-spin mb-4" size={48} />
      <p className="font-mono text-sm tracking-widest uppercase text-slate-500">Initializing Factory Node: pve-01</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020617] text-slate-300 selection:bg-blue-500/30 font-sans">
      {/* Top Header */}
      <nav className="border-b border-slate-800/60 bg-slate-900/40 backdrop-blur-md sticky top-0 z-50 px-8 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-1.5 rounded-lg shadow-lg shadow-blue-900/40">
            <LayoutDashboard size={20} className="text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight text-white">Solutions<span className="text-blue-500">Factory</span></span>
        </div>
        <div className="flex gap-4 items-center">
           <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 border border-slate-800 px-3 py-1 rounded-full">
             <Database size={12} className="text-blue-500" />
             Tailscale Active: {API_BASE.includes('100.') ? 'Remote' : 'Local'}
           </span>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-8">
        <div className="mb-10">
          <h1 className="text-4xl font-black text-white tracking-tighter">Executive Dashboard</h1>
          <p className="text-slate-500 font-medium mt-1">Churn Intelligence & Predictive Risk Modeling</p>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <StatCard title="Total Customers" value={customers.length || "7,043"} icon={<Users className="text-blue-400"/>} trend="+2.5%" />
          <StatCard title="Avg. Churn Risk" value="26.5%" icon={<TrendingDown className="text-emerald-400"/>} trend="-1.2%" />
          <StatCard title="High Risk Alerts" value="1,869" icon={<AlertTriangle className="text-red-400"/>} trend="+4.0%" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-slate-900/50 border border-slate-800 p-8 rounded-[2rem] shadow-2xl">
               <h3 className="text-white font-bold mb-8 flex items-center gap-2">
                 <BarChart3 size={18} className="text-blue-500" /> Churn by Contract Type
               </h3>
               <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[{name: 'Monthly', val: 42}, {name: '1-Year', val: 11}, {name: '2-Year', val: 3}]}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#475569', fontSize: 12}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#475569', fontSize: 12}} unit="%" />
                    <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px'}} />
                    <Bar dataKey="val" radius={[6, 6, 0, 0]} barSize={45}>
                      <Cell fill="#ef4444" /><Cell fill="#f59e0b" /><Cell fill="#10b981" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
               </div>
            </div>

            <div className="bg-slate-900/50 border border-slate-800 rounded-[2rem] overflow-hidden shadow-2xl">
              <div className="p-6 border-b border-slate-800 bg-slate-900/80 flex justify-between items-center">
                <h3 className="text-white font-bold">Customer Risk Registry</h3>
                {error && <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-1 rounded">API Offline</span>}
              </div>
              <div className="p-8 text-center text-slate-500 italic text-sm">
                Interactive customer data streaming from pve-01 node...
              </div>
            </div>
          </div>

          <aside className="space-y-6">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-900 p-8 rounded-[2.5rem] text-white shadow-xl shadow-blue-900/20">
              <h4 className="font-black text-xl mb-3 tracking-tight">System Status</h4>
              <p className="text-blue-100 text-sm leading-relaxed mb-6">
                Node <strong>pve-01</strong> is currently processing telemetry data. Predictive models are synced via <strong>Tailscale</strong>.
              </p>
              <div className="space-y-3">
                <div className="flex justify-between text-xs font-bold border-b border-white/10 pb-2">
                  <span className="text-blue-200">Uptime</span>
                  <span>99.9%</span>
                </div>
                <div className="flex justify-between text-xs font-bold border-b border-white/10 pb-2">
                  <span className="text-blue-200">Latency</span>
                  <span>42ms</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
};

const StatCard = ({ title, value, icon, trend }: any) => (
  <div className="bg-slate-900/40 border border-slate-800/60 p-7 rounded-[2rem] hover:border-blue-500/40 transition-all group">
    <div className="flex justify-between mb-6">
      <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 group-hover:scale-110 transition-transform">{icon}</div>
      <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg ${trend.includes('+') ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'}`}>{trend}</span>
    </div>
    <h3 className="text-slate-500 text-xs font-bold uppercase tracking-widest">{title}</h3>
    <p className="text-3xl font-black text-white mt-1 tracking-tighter">{value}</p>
  </div>
);

export default App;
