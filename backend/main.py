from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Dict, Any
from io import StringIO
import csv
import pandas as pd
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline

app = FastAPI(title="SAS Solutions Factory Demo API")

# FIX 1: Open CORS for your entire network
# This allows your MacBook/Phone to talk to the OptiPlex node
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Open for demo/lab accessibility
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Demo dataset ---
DATA = [
    {"customer_id": "C001", "tenure_months": 2, "monthly_charges": 89.5, "contract": "Month-to-month", "internet": "Fiber", "support_tickets": 3, "churn": 1},
    {"customer_id": "C002", "tenure_months": 24, "monthly_charges": 55.2, "contract": "One year", "internet": "DSL", "support_tickets": 0, "churn": 0},
    {"customer_id": "C003", "tenure_months": 12, "monthly_charges": 72.1, "contract": "Month-to-month", "internet": "Fiber", "support_tickets": 1, "churn": 1},
    {"customer_id": "C004", "tenure_months": 48, "monthly_charges": 40.0, "contract": "Two year", "internet": "None", "support_tickets": 0, "churn": 0},
    {"customer_id": "C005", "tenure_months": 6, "monthly_charges": 99.9, "contract": "Month-to-month", "internet": "Fiber", "support_tickets": 4, "churn": 1},
    {"customer_id": "C006", "tenure_months": 36, "monthly_charges": 65.0, "contract": "One year", "internet": "DSL", "support_tickets": 1, "churn": 0},
    {"customer_id": "C007", "tenure_months": 18, "monthly_charges": 80.3, "contract": "Month-to-month", "internet": "DSL", "support_tickets": 2, "churn": 1},
    {"customer_id": "C008", "tenure_months": 60, "monthly_charges": 35.5, "contract": "Two year", "internet": "None", "support_tickets": 0, "churn": 0},
]

df = pd.DataFrame(DATA)
FEATURES = ["tenure_months", "monthly_charges", "contract", "internet", "support_tickets"]
categorical = ["contract", "internet"]
numeric = ["tenure_months", "monthly_charges", "support_tickets"]

# --- Model Training ---
preprocess = ColumnTransformer(
    transformers=[
        ("cat", OneHotEncoder(handle_unknown="ignore"), categorical),
        ("num", "passthrough", numeric),
    ]
)

model = Pipeline(steps=[
    ("preprocess", preprocess),
    ("clf", LogisticRegression(max_iter=500))
])

model.fit(df[FEATURES], df["churn"])


def risk_label(prob: float) -> str:
    if prob >= 0.7:
        return "High"
    if prob >= 0.4:
        return "Medium"
    return "Low"


def get_feature_names() -> List[str]:
    transformer = model.named_steps["preprocess"]
    return transformer.get_feature_names_out().tolist()


def summarize_contributions(sample: pd.DataFrame, top_n: int = 3) -> List[Dict[str, Any]]:
    transformer = model.named_steps["preprocess"]
    clf = model.named_steps["clf"]

    transformed = transformer.transform(sample)
    feature_names = get_feature_names()
    # Multiply each encoded feature by its coefficient to approximate contribution.
    arr = transformed.toarray() if hasattr(transformed, "toarray") else transformed
    arr = arr[0] if getattr(arr, "ndim", 1) == 2 else arr
    contributions = arr * clf.coef_[0]

    readable = []
    for name, impact in zip(feature_names, contributions):
        label = name.replace("cat__", "").replace("num__", "")
        # Present categorical features as key=value for clarity.
        if "_" in label and "contract" in label:
            label = label.replace("contract_", "contract=")
        elif "_" in label and "internet" in label:
            label = label.replace("internet_", "internet=")
        readable.append({"feature": label, "impact": float(round(impact, 4))})

    return sorted(readable, key=lambda x: abs(x["impact"]), reverse=True)[:top_n]


# Pre-compute churn probabilities for the dataset so the frontend has meaningful KPIs.
df["churn_probability"] = model.predict_proba(df[FEATURES])[:, 1]
df["risk_label"] = df["churn_probability"].apply(risk_label)


def compute_summary(threshold: float = 0.7) -> Dict[str, Any]:
    total_customers = len(df)
    # Use observed churn for headline rate; predicted average for current risk.
    churn_rate = float(df["churn"].mean())
    avg_risk = float(df["churn_probability"].mean())
    high_risk = int((df["churn_probability"] >= threshold).sum())
    moderate_risk = int((df["churn_probability"] >= 0.5).sum())

    return {
        "total_customers": total_customers,
        "churn_rate": round(churn_rate, 4),
        "avg_churn_probability": round(avg_risk, 4),
        "high_risk_alerts": high_risk,
        "moderate_risk_alerts": moderate_risk,
        "threshold_high": threshold,
        "threshold_moderate": 0.5,
    }


def churn_by_group(column: str) -> List[Dict[str, Any]]:
    grouped = (
        df.groupby(column)
        .agg(
            churn_rate=("churn", "mean"),
            predicted_rate=("churn_probability", "mean"),
            customers=("customer_id", "count"),
        )
        .reset_index()
    )
    # Prefer predicted_rate for forward-looking charts.
    grouped["churn_rate"] = grouped["predicted_rate"]
    return grouped[[column, "churn_rate", "customers"]].rename(columns={column: "segment"}).to_dict(orient="records")

class PredictRequest(BaseModel):
    tenure_months: int
    monthly_charges: float
    contract: str
    internet: str
    support_tickets: int

@app.get("/health")
def health():
    return {"status": "ok", "env": "homelab_cluster"}


@app.get("/data/summary")
def data_summary():
    """Roll-up KPIs used by the frontend scorecards."""
    return compute_summary()


@app.get("/data/churn_by_contract")
def churn_by_contract():
    return churn_by_group("contract")


@app.get("/data/churn_by_internet")
def churn_by_internet():
    return churn_by_group("internet")


@app.get("/data/customers")
def get_customers():
    return df.to_dict(orient="records")


@app.get("/export/high_risk.csv")
def export_high_risk(threshold: float = 0.7):
    """Enterprise-friendly CSV export for outreach."""
    high_risk = df[df["churn_probability"] >= threshold].copy()

    # Keep a concise, sales-ready column set
    cols = [
        "customer_id",
        "contract",
        "internet",
        "monthly_charges",
        "support_tickets",
        "churn_probability",
    ]

    output = StringIO()
    writer = csv.DictWriter(output, fieldnames=cols)
    writer.writeheader()
    writer.writerows(high_risk[cols].to_dict(orient="records"))
    output.seek(0)

    return StreamingResponse(
        output,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=outreach-high-risk.csv"},
    )


# FIX 2: Corrected logic for the specific customer lookup
@app.get("/predict/{customer_id}")
async def predict_by_id(customer_id: str):
    customer = df[df["customer_id"] == customer_id]
    
    if customer.empty:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    X_input = customer[FEATURES]
    probability = float(model.predict_proba(X_input)[0][1])
    label = risk_label(probability)
    risk_factors = summarize_contributions(X_input, top_n=3)

    return {
        "customer_id": customer_id,
        "churn_probability": round(probability, 4),
        "risk_label": label,
        "risk_factors": risk_factors
    }

# This powers your "What-If" simulator on the frontend
@app.post("/predict")
def predict_custom(req: PredictRequest):
    x_df = pd.DataFrame([req.model_dump()])
    probability = float(model.predict_proba(x_df)[0][1])
    return {
        "churn_probability": round(probability, 4),
        "risk_label": risk_label(probability),
        "risk_factors": summarize_contributions(x_df, top_n=3),
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
