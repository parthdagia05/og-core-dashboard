# OG-Core Policy Dashboard

A proof-of-concept interactive dashboard for exploring OG-Core
macroeconomic model parameters and visualizing policy impacts.

Built as a demonstration project for GSoC 2026 — OG-CLEWS
integration in [MUIOGO](https://github.com/EAPD-DRB/MUIOGO).

## What This Does
- **Parameter Editor**: Edit 40+ OG-Core parameters across 7 tabs
  with tooltips, validation, and default indicators
- **Results Dashboard**: 6 interactive Plotly charts comparing
  baseline vs reform scenarios
- **Simulated Impact**: Parameter changes produce illustrative
  (not real) model outputs using scaling rules

## Tech Stack
Flask, Plotly.js, Bootstrap 5, jQuery, pandas, NumPy

## Quick Start
```bash
pip install -r requirements.txt
python generate_fixtures.py
python app.py
# Open http://localhost:5050
```

## Connection to GSoC
This dashboard demonstrates the same features I will build inside
MUIOGO for the OG-CLEWS integration project:
- Tabbed parameter entry with validation and tooltips
- Interactive Plotly visualizations of model outputs
- Baseline vs reform comparison with multiple view modes
- Export capabilities (CSV, PNG)

## Disclaimer
This is a proof-of-concept. The "reform" results are generated using
simple scaling rules, **not** by running the actual OG-Core model
(which takes 2+ hours). The parameter editor loads OG-Core's real
parameter schema.
