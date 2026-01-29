import React, { useEffect, useState } from 'react';

type Props = {
  apiBase: string;
  customer: {
    tenure_months: number;
    monthly_charges: number;
    contract: string;
    internet: string;
    support_tickets: number;
    churn_probability?: number;
  };
  baselineProb?: number;
};

type PredictResponse = {
  churn_probability: number;
  risk_label: string;
  risk_factors: { feature: string; impact: number }[];
};

export const ChurnSimulator: React.FC<Props> = ({ apiBase, customer, baselineProb }) => {
  const [baseline, setBaseline] = useState(baselineProb ?? customer?.churn_probability ?? 0);
  const [contract, setContract] = useState(customer.contract);
  const [internet, setInternet] = useState(customer.internet);
  const [tickets, setTickets] = useState(customer.support_tickets);
  const [charges, setCharges] = useState(customer.monthly_charges);
  const [prob, setProb] = useState(baselineProb ?? customer?.churn_probability ?? 0);
  const [loading, setLoading] = useState(false);
  const [delta, setDelta] = useState<number | null>(null);
  const [offerId, setOfferId] = useState('upgrade_combo');
  const [offerProb, setOfferProb] = useState<number | null>(null);

  useEffect(() => {
    const newBaseline = baselineProb ?? customer['churn_probability'] ?? 0;
    setBaseline(newBaseline);
    setContract(customer.contract);
    setInternet(customer.internet);
    setTickets(customer.support_tickets);
    setCharges(customer.monthly_charges);
    setProb(newBaseline);
    setDelta(null);
    setOfferProb(null);
  }, [customer, baselineProb]);

  const callPredict = async (
    nextContract: string,
    nextInternet: string,
    nextTickets: number,
    nextCharges: number,
  ) => {
    setLoading(true);
    try {
      const payload = {
        tenure_months: customer.tenure_months,
        monthly_charges: nextCharges,
        contract: nextContract,
        internet: nextInternet,
        support_tickets: nextTickets,
      };
      const res = await fetch(`${apiBase}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('predict failed');
      const body = (await res.json()) as PredictResponse;
      setDelta(body.churn_probability - baseline);
      setProb(body.churn_probability);
      return body.churn_probability;
    } catch (err) {
      console.error(err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const offers = [
    {
      id: 'upgrade_combo',
      title: 'Upgrade to 1-year + 10% discount',
      apply: (req: any) => ({
        ...req,
        contract: req.contract === 'Month-to-month' ? 'One year' : req.contract,
        monthly_charges: Math.max(0, req.monthly_charges * 0.9),
      }),
    },
    {
      id: 'discount_only',
      title: '10% discount (price incentive)',
      apply: (req: any) => ({
        ...req,
        monthly_charges: Math.max(0, req.monthly_charges * 0.9),
      }),
    },
    {
      id: 'service_recovery',
      title: 'Service recovery (-1 ticket) + 5% discount',
      apply: (req: any) => ({
        ...req,
        support_tickets: Math.max(0, req.support_tickets - 1),
        monthly_charges: Math.max(0, req.monthly_charges * 0.95),
      }),
    },
  ];

  const applyOffer = async () => {
    const req = {
      tenure_months: customer.tenure_months,
      monthly_charges: charges,
      contract,
      internet,
      support_tickets: tickets,
    };
    const offer = offers.find((o) => o.id === offerId) ?? offers[0];
    const afterReq = offer.apply(req);

    // Reflect applied offer in UI controls
    setContract(afterReq.contract);
    setInternet(afterReq.internet);
    setTickets(afterReq.support_tickets);
    setCharges(afterReq.monthly_charges);

    const result = await callPredict(
      afterReq.contract,
      afterReq.internet,
      afterReq.support_tickets,
      afterReq.monthly_charges,
    );
    if (result !== null) setOfferProb(result);
  };

  return (
    <div className="card" style={{ padding: 14 }}>
      <div className="section-title">Retention Intervention Simulator</div>
      <div className="muted" style={{ fontSize: 12, marginBottom: 10 }}>
        Recommended Action Impact
      </div>

      <div style={{ display: 'grid', gap: 10 }}>
        <div>
          <label className="muted" style={{ fontSize: 12 }}>
            Offer catalog
          </label>
          <select
            value={offerId}
            onChange={(e) => setOfferId(e.target.value)}
            style={{
              marginTop: 6,
              width: '100%',
              padding: '10px 12px',
              borderRadius: 10,
              border: '1px solid #d7dde7',
              fontSize: 14,
            }}
          >
            {offers.map((o) => (
              <option key={o.id} value={o.id}>
                {o.title}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="muted" style={{ fontSize: 12 }}>
            Contract scenario
          </label>
          <select
            value={contract}
            onChange={(e) => {
              const next = e.target.value;
              setContract(next);
              callPredict(next, internet, tickets, charges);
            }}
            style={{
              marginTop: 6,
              width: '100%',
              padding: '10px 12px',
              borderRadius: 10,
              border: '1px solid #d7dde7',
              fontSize: 14,
            }}
          >
            <option value="Month-to-month">Month-to-month</option>
            <option value="One year">One year</option>
            <option value="Two year">Two year</option>
          </select>
        </div>

        <div>
          <label className="muted" style={{ fontSize: 12 }}>
            Internet plan
          </label>
          <select
            value={internet}
            onChange={(e) => {
              const next = e.target.value;
              setInternet(next);
              callPredict(contract, next, tickets, charges);
            }}
            style={{
              marginTop: 6,
              width: '100%',
              padding: '10px 12px',
              borderRadius: 10,
              border: '1px solid #d7dde7',
              fontSize: 14,
            }}
          >
            <option value="Fiber">Fiber</option>
            <option value="DSL">DSL</option>
            <option value="None">None</option>
          </select>
        </div>

        <div>
          <label className="muted" style={{ fontSize: 12 }}>
            Support tickets (last 6 mo)
          </label>
          <input
            type="range"
            min={0}
            max={10}
            step={1}
            value={tickets}
            onChange={(e) => {
              const next = Number(e.target.value);
              setTickets(next);
              callPredict(contract, internet, next, charges);
            }}
            style={{ width: '100%' }}
          />
          <div className="muted" style={{ fontSize: 12 }}>Tickets: {tickets}</div>
        </div>

        <div>
          <label className="muted" style={{ fontSize: 12 }}>
            Monthly charges (simulate discount)
          </label>
          <input
            type="number"
            value={charges}
            onChange={(e) => {
              const next = Number(e.target.value);
              setCharges(next);
              callPredict(contract, internet, tickets, next);
            }}
            min={10}
            step={1}
            style={{
              marginTop: 6,
              width: '100%',
              padding: '10px 12px',
              borderRadius: 10,
              border: '1px solid #d7dde7',
              fontSize: 14,
            }}
          />
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        <div className="muted" style={{ fontSize: 12 }}>
          Baseline risk: {(baseline * 100).toFixed(1)}%
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 6 }}>
          <div style={{ fontSize: 24, fontWeight: 800 }}>New risk: {(prob * 100).toFixed(1)}%</div>
        </div>
        {delta !== null && (
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: delta <= 0 ? '#0f766e' : '#b91c1c',
              marginTop: 6,
            }}
          >
            Change: {delta <= 0 ? '▼' : '▲'} {(Math.abs(delta) * 100).toFixed(1)} pts vs baseline
          </div>
        )}
        {loading && <p className="muted">Recomputing…</p>}
        {offerProb !== null && (
          <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
            Offer scenario risk: {(offerProb * 100).toFixed(1)}%
          </div>
        )}
      </div>

      <button
        className="button"
        style={{ marginTop: 12, width: '100%', textAlign: 'center' }}
        onClick={applyOffer}
      >
        Apply retention offer
      </button>
    </div>
  );
};
