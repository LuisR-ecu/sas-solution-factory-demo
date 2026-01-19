from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline

app = FastAPI(title="SAS Solutions Factory Demo API")

# Allow React dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Demo dataset (tiny, embedded) ---
# Simple churn-ish dataset with categorical + numeric features
DATA = [
    {"customer_id": "C001", "tenure_months": 2, "monthly_charges": 89.5, "contract": "Month-to-month", "internet": "Fiber", "support_tickets": 3, "churn": 1},
    {"customer_id": "C002", "tenure_months": 24, "monthly_charges": 55.2, "contract": "One year", "internet": "DSL", "support_tickets": 0, "churn": 0},
    {"customer_id": "C003", "tenure_months": 12, "monthly_charges": 72.1, "contract": "Month-to-month", "internet": "Fiber", "support_tickets": 1, "churn": 1},
    {"customer_id": "C004", "tenure_months": 48, "monthly_charges": 40.0, "contract": "Two year", "internet": "None", "support_tickets": 0, "churn": 0},
    {"customer_id": "C005", "tenure_months": 6, "monthly_charges": 99.9, "contract": "Month-to-month", "internet": "Fiber", "support_tickets": 4, "churn": 1},
    {"customer_id": "C006", "tenure_months": 36, "monthly_charges": 65.0, "contract": "One year", "internet": "DSL", "support_tickets": 1, "churn": 0},
    {"customer_id": "C007", "tenure_months": 18, "monthly_charges": 80.3, "contract": "Month-to-month", "internet": "DSL", "support_tickets": 2, "churn": 1},
    {"customer_id": "C008", "tenure_months": 60, "monthly_charges": 35.5, "contract": "Two year", "internet": "None", "support_tickets": 0, "churn": 0},
    {"customer_id": "C009", "tenure_months": 9, "monthly_charges": 75.0, "contract": "Month-to-month", "internet": "Fiber", "support_tickets": 2, "churn": 1},
    {"customer_id": "C010", "tenure_months": 30, "monthly_charges": 58.8, "contract": "One year", "internet": "DSL", "support_tickets": 0, "churn": 0},
]

df = pd.DataFrame(DATA)

FEATURES = ["tenure_months", "monthly_charges", "contract", "internet", "support_tickets"]
TARGET = "churn"

# --- Train a simple pipeline model on startup ---
X = df[FEATURES]
y = df[TARGET]

categorical = ["contract", "internet"]
numeric = ["tenure_months", "monthly_charges", "support_tickets"]

preprocess = ColumnTransformer(
    transformers=[
        ("cat", OneHotEncoder(handle_unknown="ignore"), categorical),
        ("num", "passthrough", numeric),
    ]
)

model = Pipeline(
    steps=[
        ("preprocess", preprocess),
        ("clf", LogisticRegression(max_iter=500)),
    ]
)

# With tiny data, just fit on all for demo purposes
model.fit(X, y)

class PredictRequest(BaseModel):
    tenure_months: int
    monthly_charges: float
    contract: str
    internet: str
    support_tickets: int

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/data/summary")
def data_summary() -> Dict[str, Any]:
    churn_rate = float(df["churn"].mean())
    by_contract = df.groupby("contract")["churn"].mean().to_dict()
    by_internet = df.groupby("internet")["churn"].mean().to_dict()
    return {
        "rows": len(df),
        "churn_rate": churn_rate,
        "by_contract": by_contract,
        "by_internet": by_internet,
    }

@app.get("/data/customers")
def customers() -> List[Dict[str, Any]]:
    cols = ["customer_id"] + FEATURES + [TARGET]
    return df[cols].to_dict(orient="records")

@app.post("/predict")
def predict(req: PredictRequest) -> Dict[str, Any]:
    x = pd.DataFrame([req.model_dump()])
    prob = float(model.predict_proba(x)[0][1])
    pred = int(prob >= 0.5)

    # Lightweight "explainability": logistic regression coefficients mapped to features after encoding
    # This is not SHAP, but it's interpretable and interview-friendly for MVP.
    clf = model.named_steps["clf"]
    ohe = model.named_steps["preprocess"].named_transformers_["cat"]
    cat_feature_names = list(ohe.get_feature_names_out(categorical))
    feature_names = cat_feature_names + numeric
    coefs = clf.coef_[0].tolist()

    # Build a ranked list of top contributing features (by absolute weight)
    contrib = sorted(
        [{"feature": feature_names[i], "weight": float(coefs[i])} for i in range(len(feature_names))],
        key=lambda d: abs(d["weight"]),
        reverse=True,
    )[:6]

    return {"churn_probability": prob, "prediction": pred, "top_weights": contrib}

@app.get("/data/churn_by_contract")
def churn_by_contract() -> List[Dict[str, Any]]:
    g = df.groupby("contract")["churn"].mean().reset_index()
    return [{"contract": row["contract"], "churn_rate": float(row["churn"])} for _, row in g.iterrows()]

@app.get("/data/churn_by_internet")
def churn_by_internet() -> List[Dict[str, Any]]:
    g = df.groupby("internet")["churn"].mean().reset_index()
    return [{"internet": row["internet"], "churn_rate": float(row["churn"])} for _, row in g.iterrows()]

@app.get("/predict/{customer_id}")
async def predict_churn(customer_id: str):
    #simulate prediction logic
    probability = model.predict_proba(customer_data)[0][1]
    
    #get feauture importance (coefficients for Logistic Regression)
    # This provides the "why" behind the answer [cite: 64]
    feature_importance = dict(zip(X.columns, model.coef_[0]))
    top_drivers = sorted(feature_importance.items(), key = lambda x: abs(x[1]), reverse = True)[:3]
    
    return {
        "customer_id": customer_id,
        "churn_probability": round(probability, 2),
        "risk_factors": [{"feature": f, "impact": round(i, 2)} for f, i in top_drivers]
    }
    

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)