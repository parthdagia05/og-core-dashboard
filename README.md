# OG-Core Policy Dashboard

A proof-of-concept interactive dashboard for exploring OG-Core macroeconomic model parameters and visualizing policy impacts.

Built as a demonstration project for **GSoC 2026 — OG-CLEWS integration in [MUIOGO](https://github.com/EAPD-DRB/MUIOGO)**.

> **Live Demo**: [og-core-dashboard.onrender.com](https://og-core-dashboard.onrender.com)

## What This Does

- **Parameter Editor**: Edit 40+ OG-Core parameters across 7 categories (Demographics, Preferences, Firms, Government, Taxes, Open Economy, UBI) with tooltips, validation, and default-value indicators
- **Results Dashboard**: 6 interactive Plotly charts comparing baseline vs reform scenarios
- **Simulated Impact**: Parameter changes produce illustrative model outputs using economic scaling rules
- **Multiple View Modes**: Toggle between % Difference, Levels, and Side-by-side comparison
- **Export**: Download results as CSV or chart images as PNG

## Screenshots

| Parameter Editor | Results Dashboard |
|:---:|:---:|
| Tabbed form with 40+ params, tooltips, change highlighting | 5 Plotly charts + summary table with color-coded changes |

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Backend | Flask (Python 3.12) |
| Frontend | HTML + Bootstrap 5 + jQuery |
| Charts | Plotly.js |
| Data | JSON fixtures (no database) |
| Deployment | Render |

Deliberately matches **MUIOGO's stack** (jQuery + Bootstrap + Plotly) rather than using React/D3.

## Quick Start

```bash
pip install -r requirements.txt
python generate_fixtures.py
python app.py
# Open http://localhost:5050
```

## Project Structure

```
og-core-dashboard/
├── app.py                      # Flask backend (7 API routes, 13 scaling rules)
├── generate_fixtures.py        # Creates realistic sample OG-Core output
├── data/
│   ├── default_parameters.json # OG-Core parameter schema
│   ├── parameter_metadata.json # Labels, tooltips, ranges per param
│   └── fixtures/               # Pre-computed baseline & reform results
├── static/
│   ├── css/dashboard.css       # Custom responsive styles
│   └── js/
│       ├── params.js           # Parameter editor (forms, validation, change tracking)
│       ├── charts.js           # Plotly chart rendering (5 charts + summary table)
│       └── app.js              # Main controller (wiring, simulate, exports)
└── templates/
    └── index.html              # Single-page Bootstrap 5 layout
```

## Connection to GSoC

This dashboard demonstrates the exact features I will build inside MUIOGO for the OG-CLEWS integration:

| Feature | This Dashboard | Planned for MUIOGO |
|---------|---------------|-------------------|
| Tabbed parameter editor | 7 tabs, 40+ params | Full OG-Core + CLEWS params |
| Plotly visualizations | 5 chart types | Extended with energy/climate charts |
| Baseline vs reform | 3 view modes | Real OG-Core model runs |
| Validation & tooltips | Client + server-side | Integrated with OG-Core validators |
| Export (CSV/PNG) | Summary table + charts | Full dataset export |

## Why Me

I built this **entire proof-of-concept from scratch** to demonstrate my readiness for the OG-CLEWS integration project. Here's what this project shows:

**I understand the OG-Core ecosystem.** I studied OG-Core's parameter structure, model outputs (steady-state and transition paths), and the economic intuition behind them. The 13 scaling rules in this dashboard reflect real economic relationships — higher corporate taxes reduce capital accumulation, higher TFP boosts all outputs, consumption taxes reduce spending but raise revenue.

**I match MUIOGO's technical stack exactly.** This dashboard uses Flask + jQuery + Bootstrap 5 + Plotly.js — the same tools MUIOGO is built with. I chose this deliberately over React or D3 to prove I can contribute to the existing codebase from day one, without introducing new dependencies or patterns.

**I can build polished, functional UIs.** The parameter editor supports tabbed navigation, tooltips with plain-language descriptions, input validation, change highlighting, and reset functionality. The results dashboard offers three comparison modes, interactive Plotly charts with hover details, and one-click CSV/PNG exports.

**I ship working software end-to-end.** This isn't a mockup — it's a deployed, working application with a Flask backend serving API routes, client-server data flow, and realistic fixture data. The codebase is clean, modular (~1,750 lines across 7 files), and well-structured for maintainability.

**I'm prepared for the real integration work.** Building this PoC gave me hands-on experience with the exact challenges the GSoC project will face: mapping OG-Core parameters to form inputs, visualizing multi-dimensional model output, and creating meaningful baseline-vs-reform comparisons. I'm ready to take this from "illustrative scaling rules" to actual OG-Core + CLEWS model integration.

## Disclaimer

This is a proof-of-concept. The "reform" results are generated using simple scaling rules, **not** by running the actual OG-Core model (which takes 2+ hours). The parameter editor loads OG-Core's real parameter schema.
