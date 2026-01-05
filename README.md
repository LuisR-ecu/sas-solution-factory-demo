# SAS Solutions Factory – Churn Analytics Demo

This project is an end-to-end **customer churn analytics solution** designed to mirror the type of
customer-facing, explainable, and scalable solutions built by SAS Solutions Factory teams.

It demonstrates how analytics, machine learning, and modern web technologies can be combined
to deliver actionable insights in a clean, interactive interface.

---

## 🔍 What This Demo Does

- Visualizes customer churn metrics and segment-level insights
- Allows interactive churn prediction for individual customers
- Provides transparent model explanations for trust and interpretability
- Mimics real-world solution architecture used in enterprise analytics teams

---

## 🧱 Architecture

**Frontend**
- React + TypeScript
- Recharts for data visualization

**Backend**
- FastAPI
- Scikit-learn (logistic regression for interpretability)

**Data**
- Synthetic churn dataset with categorical + numeric features

**Infrastructure (in progress)**
- Dockerized services
- Docker Compose for one-command startup

---

## 🚀 Features

- KPI cards (total customers, churn rate)
- Interactive bar charts by contract and internet type
- Clickable customer table
- Churn prediction form
- Explainable model outputs (feature weights)

---

## 🛠️ Tech Stack

- React
- TypeScript
- FastAPI
- Python
- Scikit-learn
- Docker (coming next)

---

## ▶️ Running Locally

### Backend
```bash
cd backend
source .venv/bin/activate
uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## 🎯 Why This Project

This demo was built to practice end-to-end solution delivery:
from data and modeling, to API design, to UI/UX, to deployment considerations —
the same skills required for modern analytics solution engineering roles.

## 📌 Next Steps
	•	Docker Compose full-stack deployment
	•	Per-customer SHAP-style explanations
	•	Improved UI polish
	•	Demo presentation deck

Built by Luis Ramirez
