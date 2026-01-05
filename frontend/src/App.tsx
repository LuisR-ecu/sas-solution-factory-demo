import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

type Summary = {
  rows: number;
  churn_rate: number;
  by_contract: Record<string, number>;
  by_internet: Record<string, number>;
};

type Customer = {
  customer_id: string;
  tenure_months: number;
  monthly_charges: number;
  contract: string;
  internet: string;
  support_tickets: number;
  churn: number;
};

type PredictRequest = Omit<Customer, "customer_id" | "churn">;

type PredictResponse = {
  churn_probability: number;
  prediction: number;
  top_weights: { feature: string; weight: number }[];
};

type ContractPoint = { contract: string; churn_rate: number };
type InternetPoint = { internet: string; churn_rate: number };

export default function App() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [selected, setSelected] = useState<Customer | null>(null);

  const [predictResult, setPredictResult] = useState<PredictResponse | null>(null);
  const [predictLoading, setPredictLoading] = useState(false);
  const [byContract, setByContract] = useState<ContractPoint[]>([]);
  const [byInternet, setByInternet] = useState<InternetPoint[]>([]);

  // Load summary + customers
  useEffect(() => {
    Promise.all([
  fetchJSON<Summary>("http://127.0.0.1:8000/data/summary"),
  fetchJSON<Customer[]>("http://127.0.0.1:8000/data/customers"),
  fetchJSON<ContractPoint[]>("http://127.0.0.1:8000/data/churn_by_contract"),
  fetchJSON<InternetPoint[]>("http://127.0.0.1:8000/data/churn_by_internet"),
])
  .then(([s, c, bc, bi]) => {
    setSummary(s);
    setCustomers(c);
    setSelected(c[0] ?? null);
    setByContract(bc);
    setByInternet(bi);
  })
  .catch((e) => setError(String(e)));
  }, []);

  const churnPct = summary ? (summary.churn_rate * 100).toFixed(1) + "%" : "--";

  const defaultReq: PredictRequest | null = useMemo(() => {
    if (!selected) return null;
    const { tenure_months, monthly_charges, contract, internet, support_tickets } = selected;
    return { tenure_months, monthly_charges, contract, internet, support_tickets };
  }, [selected]);

  async function runPredict(req: PredictRequest) {
    setPredictLoading(true);
    setPredictResult(null);
    try {
      const res = await fetch("http://127.0.0.1:8000/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
      });
      if (!res.ok) throw new Error(`Predict failed: HTTP ${res.status}`);
      const data = (await res.json()) as PredictResponse;
      setPredictResult(data);
    } catch (e) {
      setError(String(e));
    } finally {
      setPredictLoading(false);
    }
  }

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.h1}>SAS Solutions Factory Demo</h1>
          <p style={styles.sub}>Churn Analytics Dashboard (MVP → Demo-ready)</p>
        </div>
        <div style={styles.badge}>React + TS • FastAPI • ML</div>
      </header>

      {error && <div style={styles.error}>Error: {error}</div>}
      {!summary && !error && <div style={styles.loading}>Loading…</div>}

      {summary && (
        <>
          {/* Top KPI cards */}
          <div style={styles.cardRow}>
            <Card title="Customers" value={summary.rows.toString()} />
            <Card title="Overall churn rate" value={churnPct} />
          </div>
          {/* Charts */}  
          <section style={{ ...styles.panel, marginTop: "1rem" }}>
            <h2 style={styles.h2}>Churn Insights</h2>
            <p style={styles.small}>Quick segment view for stakeholder-friendly demos.</p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div style={{ height: 260 }}>
                <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>
                  Churn rate by contract
                </div>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={byContract}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="contract" />
                    <YAxis tickFormatter={(v) => `${Math.round(v * 100)}%`} />
                    <Tooltip formatter={(v) => `${(Number(v) * 100).toFixed(1)}%`} />
                    <Bar dataKey="churn_rate" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div style={{ height: 260 }}>
                <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>
                  Churn rate by internet
                </div>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={byInternet}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="internet" />
                    <YAxis tickFormatter={(v) => `${Math.round(v * 100)}%`} />
                    <Tooltip formatter={(v) => `${(Number(v) * 100).toFixed(1)}%`} />
                    <Bar dataKey="churn_rate" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>
          
          <div style={styles.grid}>
            {/* Customers table */}
            <section style={styles.panel}>
              <h2 style={styles.h2}>Customers</h2>
              <p style={styles.small}>
                Click a row to load it into the predictor.
              </p>
              <CustomerTable
                customers={customers}
                selectedId={selected?.customer_id ?? null}
                onSelect={(c) => {
                  setSelected(c);
                  setPredictResult(null);
                }}
              />
            </section>

            {/* Predictor */}
            <section style={styles.panel}>
              <h2 style={styles.h2}>Churn Predictor</h2>
              <p style={styles.small}>
                This uses a simple interpretable model. (We’ll upgrade to SHAP later.)
              </p>

              {!defaultReq && <div>No customer selected.</div>}

              {defaultReq && (
                <PredictorForm
                  initial={defaultReq}
                  onPredict={runPredict}
                  loading={predictLoading}
                />
              )}

              <div style={{ height: 12 }} />

              {predictResult && (
                <ResultCard result={predictResult} />
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}

function CustomerTable({
  customers,
  selectedId,
  onSelect,
}: {
  customers: Customer[];
  selectedId: string | null;
  onSelect: (c: Customer) => void;
}) {
  return (
    <div style={styles.tableWrap}>
      <table style={styles.table}>
        <thead>
          <tr>
            <Th>ID</Th>
            <Th>Tenure</Th>
            <Th>$ / mo</Th>
            <Th>Contract</Th>
            <Th>Internet</Th>
            <Th>Tickets</Th>
            <Th>Churn</Th>
          </tr>
        </thead>
        <tbody>
          {customers.map((c) => {
            const active = c.customer_id === selectedId;
            return (
              <tr
                key={c.customer_id}
                onClick={() => onSelect(c)}
                style={{
                  cursor: "pointer",
                  background: active ? "rgba(0,0,0,0.06)" : "transparent",
                }}
              >
                <Td mono>{c.customer_id}</Td>
                <Td>{c.tenure_months}</Td>
                <Td>{c.monthly_charges.toFixed(1)}</Td>
                <Td>{c.contract}</Td>
                <Td>{c.internet}</Td>
                <Td>{c.support_tickets}</Td>
                <Td>{c.churn === 1 ? "Yes" : "No"}</Td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function PredictorForm({
  initial,
  onPredict,
  loading,
}: {
  initial: PredictRequest;
  onPredict: (req: PredictRequest) => void;
  loading: boolean;
}) {
  const [form, setForm] = useState<PredictRequest>(initial);

  // When selected customer changes, refresh form
  useEffect(() => setForm(initial), [initial]);

  return (
    <div style={styles.form}>
      <div style={styles.formRow}>
        <Label>Tenure (months)</Label>
        <Input
          type="number"
          value={form.tenure_months}
          onChange={(v) => setForm({ ...form, tenure_months: Number(v) })}
        />
      </div>

      <div style={styles.formRow}>
        <Label>Monthly charges</Label>
        <Input
          type="number"
          value={form.monthly_charges}
          onChange={(v) => setForm({ ...form, monthly_charges: Number(v) })}
        />
      </div>

      <div style={styles.formRow}>
        <Label>Support tickets</Label>
        <Input
          type="number"
          value={form.support_tickets}
          onChange={(v) => setForm({ ...form, support_tickets: Number(v) })}
        />
      </div>

      <div style={styles.formRow}>
        <Label>Contract</Label>
        <select
          style={styles.select}
          value={form.contract}
          onChange={(e) => setForm({ ...form, contract: e.target.value })}
        >
          <option>Month-to-month</option>
          <option>One year</option>
          <option>Two year</option>
        </select>
      </div>

      <div style={styles.formRow}>
        <Label>Internet</Label>
        <select
          style={styles.select}
          value={form.internet}
          onChange={(e) => setForm({ ...form, internet: e.target.value })}
        >
          <option>Fiber</option>
          <option>DSL</option>
          <option>None</option>
        </select>
      </div>

      <button
        style={styles.button}
        onClick={() => onPredict(form)}
        disabled={loading}
      >
        {loading ? "Predicting…" : "Predict churn"}
      </button>
    </div>
  );
}

function ResultCard({ result }: { result: PredictResponse }) {
  const pct = (result.churn_probability * 100).toFixed(1) + "%";
  const label = result.prediction === 1 ? "Likely to churn" : "Unlikely to churn";

  return (
    <div style={styles.result}>
      <div style={styles.resultTop}>
        <div>
          <div style={styles.resultLabel}>{label}</div>
          <div style={styles.resultPct}>{pct}</div>
        </div>
        <div style={styles.resultHint}>Top factors (weights)</div>
      </div>

      <div style={styles.weights}>
        {result.top_weights.map((w) => (
          <div key={w.feature} style={styles.weightRow}>
            <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
              {w.feature}
            </span>
            <span style={{ opacity: 0.8 }}>{w.weight.toFixed(3)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- tiny UI primitives ---
function Card({ title, value }: { title: string; value: string }) {
  return (
    <div style={styles.card}>
      <div style={styles.cardTitle}>{title}</div>
      <div style={styles.cardValue}>{value}</div>
    </div>
  );
}

function Th({ children }: { children: any }) {
  return <th style={styles.th}>{children}</th>;
}
function Td({ children, mono }: { children: any; mono?: boolean }) {
  return <td style={{ ...styles.td, fontFamily: mono ? "ui-monospace, Menlo, monospace" : undefined }}>{children}</td>;
}
function Label({ children }: { children: any }) {
  return <div style={styles.label}>{children}</div>;
}
function Input({
  type,
  value,
  onChange,
}: {
  type: string;
  value: number;
  onChange: (v: string) => void;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={styles.input}
    />
  );
}

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch failed: ${url} (HTTP ${res.status})`);
  return (await res.json()) as T;
}

const styles: Record<string, React.CSSProperties> = {
  page: { padding: "2rem", fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: "1rem" },
  h1: { margin: 0, fontSize: 28 },
  sub: { margin: "0.25rem 0 0", opacity: 0.75 },
  badge: { padding: "0.4rem 0.7rem", border: "1px solid #ddd", borderRadius: 999, fontSize: 12, opacity: 0.8 },
  cardRow: { display: "flex", gap: "1rem", flexWrap: "wrap", marginTop: "1.5rem" },
  card: { border: "1px solid #ddd", borderRadius: 14, padding: "1rem", minWidth: 240, background: "white" },
  cardTitle: { fontSize: 12, opacity: 0.7 },
  cardValue: { fontSize: 30, fontWeight: 800, marginTop: 4 },
  grid: { display: "grid", gridTemplateColumns: "1.25fr 1fr", gap: "1rem", marginTop: "1rem" },
  panel: { border: "1px solid #ddd", borderRadius: 14, padding: "1rem", background: "white" },
  h2: { margin: 0, fontSize: 16 },
  small: { marginTop: 6, marginBottom: 12, opacity: 0.75, fontSize: 13 },
  tableWrap: { overflow: "auto", border: "1px solid #eee", borderRadius: 12 },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th: { textAlign: "left", padding: "10px 10px", borderBottom: "1px solid #eee", background: "#fafafa", position: "sticky", top: 0 },
  td: { padding: "10px 10px", borderBottom: "1px solid #f0f0f0", whiteSpace: "nowrap" },
  form: { display: "grid", gap: 10 },
  formRow: { display: "grid", gap: 6 },
  label: { fontSize: 12, opacity: 0.75 },
  input: { border: "1px solid #ddd", borderRadius: 12, padding: "10px 12px", fontSize: 14 },
  select: { border: "1px solid #ddd", borderRadius: 12, padding: "10px 12px", fontSize: 14, background: "white" },
  button: { border: "1px solid #222", background: "#222", color: "white", borderRadius: 12, padding: "10px 12px", fontSize: 14, cursor: "pointer" },
  result: { border: "1px solid #eee", borderRadius: 14, padding: "1rem", background: "#fcfcff" },
  resultTop: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" },
  resultLabel: { fontSize: 13, opacity: 0.8 },
  resultPct: { fontSize: 34, fontWeight: 900, marginTop: 4 },
  resultHint: { fontSize: 12, opacity: 0.7 },
  weights: { marginTop: 12, display: "grid", gap: 8 },
  weightRow: { display: "flex", justifyContent: "space-between", borderBottom: "1px dashed #eee", paddingBottom: 6 },
  error: { marginTop: 12, padding: 12, borderRadius: 12, background: "#ffecec", border: "1px solid #ffb3b3" },
  loading: { marginTop: 12, opacity: 0.75 },
};