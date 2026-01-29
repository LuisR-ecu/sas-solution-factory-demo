import React, { useEffect, useMemo, useState } from 'react';
import './App.css';
import { Users, AlertTriangle, BarChart3, Download, Info } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { ChurnSimulator } from './components/ChurnSimulator';

type Summary = {
  total_customers: number;
  churn_rate: number;
  avg_churn_probability: number;
  high_risk_alerts: number;
  moderate_risk_alerts: number;
  threshold_high: number;
  threshold_moderate: number;
};

type ChurnSegment = {
  segment: string;
  churn_rate: number;
  customers: number;
};

type Customer = {
  customer_id: string;
  tenure_months: number;
  monthly_charges: number;
  contract: string;
  internet: string;
  support_tickets: number;
  churn: number;
  churn_probability: number;
  risk_label: string;
};

type Prediction = {
  churn_probability: number;
  risk_label: string;
  risk_factors: { feature: string; impact: number }[];
};

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const percent = (val: number | undefined, digits = 1) =>
  val === undefined ? '—' : `${(val * 100).toFixed(digits)}%`;

const formatCurrency = (val: number) => `$${val.toFixed(2)}`;

const fetchJson = async <T,>(path: string, options?: RequestInit): Promise<T> => {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
};

const App: React.FC = () => {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [contractData, setContractData] = useState<ChurnSegment[]>([]);
  const [internetData, setInternetData] = useState<ChurnSegment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<'tenure_months' | 'monthly_charges' | 'support_tickets'>(
    'tenure_months',
  );
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selected, setSelected] = useState<Customer | null>(null);
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [predictLoading, setPredictLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initial data load
  useEffect(() => {
    const load = async () => {
      try {
        const [summaryResp, contractResp, internetResp, customersResp] = await Promise.all([
          fetchJson<Summary>('/data/summary'),
          fetchJson<ChurnSegment[]>('/data/churn_by_contract'),
          fetchJson<ChurnSegment[]>('/data/churn_by_internet'),
          fetchJson<Customer[]>('/data/customers'),
        ]);
        setSummary(summaryResp);
        setContractData(contractResp);
        setInternetData(internetResp);
        setCustomers(customersResp);
      } catch (err) {
        console.error(err);
        setError('Unable to load data from API.');
      }
    };
    load();
  }, []);

  // Predict when selection changes
  useEffect(() => {
    const runPrediction = async () => {
      if (!selected) return;
      setPredictLoading(true);
      try {
        const payload = {
          tenure_months: selected.tenure_months,
          monthly_charges: selected.monthly_charges,
          contract: selected.contract,
          internet: selected.internet,
          support_tickets: selected.support_tickets,
        };
        const resp = await fetchJson<Prediction>('/predict', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setPrediction(resp);
      } catch (err) {
        console.error(err);
        setPrediction(null);
      } finally {
        setPredictLoading(false);
      }
    };
    runPrediction();
  }, [selected]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const subset = term
      ? customers.filter((c) => c.customer_id.toLowerCase().includes(term))
      : [...customers];
    return subset.sort((a, b) => {
      const factor = sortDir === 'asc' ? 1 : -1;
      if (a[sortKey] < b[sortKey]) return -1 * factor;
      if (a[sortKey] > b[sortKey]) return 1 * factor;
      return 0;
    });
  }, [customers, search, sortKey, sortDir]);

  const exportCsv = async () => {
    try {
      const threshold = summary?.threshold_high ?? 0.7;
      const res = await fetch(`${API_BASE}/export/high_risk.csv?threshold=${threshold}`);
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'outreach-high-risk.csv';
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      setError('CSV export failed.');
    }
  };

  const toggleSort = (key: typeof sortKey) => {
    if (key === sortKey) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  return (
    <div className="app-shell">
      <nav className="nav">
        <div className="brand">
          <div className="brand-mark">
            <BarChart3 size={18} />
          </div>
          Customer Retention Intelligence Dashboard
        </div>
      </nav>

      <header>
        <h1 className="page-title">Churn Risk Intelligence</h1>
        <p className="muted">Predictive churn risk monitoring and retention strategy simulation.</p>
      </header>

      {error && <div className="card" style={{ color: '#b91c1c' }}>{error}</div>}

      <div className="grid kpi-grid">
        <KpiCard
          title="Total Customers"
          value={summary ? summary.total_customers.toLocaleString() : '—'}
          icon={<Users size={18} />}
          helper="Rows in data feed"
        />
        <KpiCard
          title="Avg. Churn Risk"
          value={summary ? percent(summary.avg_churn_probability, 1) : '—'}
          icon={<BarChart3 size={18} />}
          helper="Mean predicted probability"
        />
        <KpiCard
          title="High Risk Alerts"
          value={summary ? summary.high_risk_alerts.toLocaleString() : '—'}
          icon={<AlertTriangle size={18} />}
          helper={`Prob ≥ ${(summary?.threshold_high ?? 0.7) * 100}%`}
        />
      </div>

      <div className="grid charts" style={{ marginTop: 18 }}>
        <div className="card">
          <div className="section-title">Churn Rate by Contract Type</div>
          <Chart data={contractData} />
        </div>
        <div className="card">
          <div className="section-title">Churn Rate by Internet Service</div>
          <Chart data={internetData} />
        </div>
      </div>

      <div className="card table-wrap" style={{ marginTop: 18 }}>
        <div className="section-title">Customer Risk Registry</div>
        <div className="table-actions">
          <input
            className="search"
            placeholder="Search by customer_id"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="button" onClick={exportCsv}>
            <Download size={14} style={{ marginRight: 6, verticalAlign: 'text-bottom' }} />
            Generate outreach list
          </button>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Customer</th>
              <th onClick={() => toggleSort('tenure_months')}>Tenure</th>
              <th onClick={() => toggleSort('monthly_charges')}>Monthly Charges</th>
              <th>Contract</th>
              <th>Internet</th>
              <th onClick={() => toggleSort('support_tickets')}>Tickets</th>
              <th>Risk</th>
              <th>Churn Prob</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.customer_id} onClick={() => setSelected(c)} style={{ cursor: 'pointer' }}>
                <td>{c.customer_id}</td>
                <td>{c.tenure_months} mo</td>
                <td>{formatCurrency(c.monthly_charges)}</td>
                <td>{c.contract}</td>
                <td>{c.internet}</td>
                <td>{c.support_tickets}</td>
                <td>
                  <span className={`pill ${c.risk_label.toLowerCase()}`}>{c.risk_label}</span>
                </td>
                <td>{percent(c.churn_probability, 1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Info size={14} /> Definitions
        </div>
        <p className="muted">
          Churn risk = predicted probability from logistic regression. High risk threshold ={' '}
          {(summary?.threshold_high ?? 0.7) * 100}% · Moderate = {(summary?.threshold_moderate ?? 0.5) * 100}%.
        </p>
      </div>

      {selected && (
        <>
          <div className="backdrop" onClick={() => setSelected(null)} />
          <aside className="drawer">
            <h3 style={{ marginTop: 0 }}>{selected.customer_id}</h3>
            <p className="muted">
              {selected.contract} · {selected.internet} · {selected.tenure_months} months
            </p>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
              <span className={`pill ${selected.risk_label.toLowerCase()}`}>{selected.risk_label}</span>
              <span style={{ fontWeight: 700 }}>{percent(prediction?.churn_probability ?? selected.churn_probability, 1)}</span>
            </div>

            <hr className="divider" />

            <div className="section-title">Top Drivers</div>
            {predictLoading && <p className="muted">Loading explainability…</p>}
            {!predictLoading && prediction && prediction.risk_factors && (
              <ul style={{ paddingLeft: 16, margin: 0 }}>
                {prediction.risk_factors.map((f) => (
                  <li key={f.feature} style={{ marginBottom: 6 }}>
                    {f.feature} <span className="muted">({f.impact >= 0 ? '+' : ''}{f.impact.toFixed(3)})</span>
                  </li>
                ))}
              </ul>
            )}

            <hr className="divider" />

            <ChurnSimulator
              apiBase={API_BASE}
              customer={selected}
              baselineProb={prediction?.churn_probability ?? selected.churn_probability ?? 0}
            />
          </aside>
        </>
      )}

    </div>
  );
};

export default App;

const KpiCard = ({
  title,
  value,
  icon,
  helper,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  helper: string;
}) => (
  <div className="card">
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{ width: 36, height: 36, background: '#e8f3ff', borderRadius: 10, display: 'grid', placeItems: 'center', color: '#0f7ef1' }}>
        {icon}
      </div>
      <span className="kpi-trend">Live</span>
    </div>
    <div className="muted" style={{ marginTop: 6 }}>{title}</div>
    <div className="kpi-value">{value}</div>
    <div className="muted" style={{ fontSize: 12 }}>{helper}</div>
  </div>
);

const Chart = ({ data }: { data: ChurnSegment[] }) => (
  <div style={{ height: 260 }}>
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
        <XAxis dataKey="segment" tick={{ fontSize: 12 }} />
        <YAxis tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} width={52} />
        <Tooltip formatter={(v: number) => `${(v * 100).toFixed(1)}%`} />
        <Bar dataKey="churn_rate" radius={[6, 6, 0, 0]} fill="#0f7ef1" />
      </BarChart>
    </ResponsiveContainer>
  </div>
);
