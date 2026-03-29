"""
Generate realistic-looking sample data for the OG-Core Policy Dashboard.

This creates four JSON fixture files that mimic OG-Core model output:
- baseline_ss.json   (steady-state baseline)
- baseline_tpi.json  (transition path baseline)
- reform_ss.json     (steady-state after corporate tax cut)
- reform_tpi.json    (transition path after corporate tax cut)
"""

import json
import os
import numpy as np

T = 80  # transition path length (years)
S = 80  # periods of economic life (ages 21-100)

np.random.seed(42)

# --- Baseline Steady State ---
baseline_ss = {
    "Y": 1245.3,
    "C": 812.4,
    "K": 4892.1,
    "L": 312.5,
    "D": 746.7,
    "w": 2.14,
    "r": 0.042,
    "G": 186.8,
    "TR": 149.4,
    "total_tax_revenue": 298.8,
    "income_tax_revenue": 149.4,
    "corporate_tax_revenue": 74.7,
    "consumption_tax_revenue": 0.0,
    "payroll_tax_revenue": 74.7,
    "wealth_tax_revenue": 0.0,
    "Gini": 0.42,
    "var_of_logs": 0.85,
    # Lifecycle profiles (length S, ages 21-100)
    "n": (np.sin(np.linspace(0, np.pi, S)) * 0.4 + 0.1).tolist(),
    "b_s": (
        np.linspace(0, 50, S // 2).tolist()
        + np.linspace(50, 5, S - S // 2).tolist()
    ),
    "c": (np.log(np.linspace(1, 10, S)) * 15 + 20).tolist(),
}

# --- Baseline Transition Path (T periods) ---
baseline_tpi = {}
tpi_vars = [
    "Y", "C", "K", "L", "D", "w", "r", "G", "TR",
    "total_tax_revenue", "income_tax_revenue", "corporate_tax_revenue",
    "consumption_tax_revenue", "payroll_tax_revenue", "wealth_tax_revenue",
    "Gini", "var_of_logs",
]

for var in tpi_vars:
    ss_val = baseline_ss[var]
    # Transition: start at 90% of SS, converge to SS over T periods
    path = [ss_val * (0.9 + 0.1 * (1 - np.exp(-0.05 * t))) for t in range(T)]
    # Add small noise
    noise = np.random.normal(0, abs(ss_val) * 0.005, T)
    baseline_tpi[var] = [round(v + n, 4) for v, n in zip(path, noise)]

# --- Reform Steady State (corporate tax cut: cit_rate 0.21 -> 0.15) ---
reform_ss = dict(baseline_ss)
reform_ss["Y"] = round(baseline_ss["Y"] * 1.045, 1)
reform_ss["K"] = round(baseline_ss["K"] * 1.062, 1)
reform_ss["C"] = round(baseline_ss["C"] * 1.032, 1)
reform_ss["L"] = round(baseline_ss["L"] * 1.018, 1)
reform_ss["D"] = round(baseline_ss["D"] * 0.94, 1)
reform_ss["w"] = round(baseline_ss["w"] * 1.033, 3)
reform_ss["r"] = round(baseline_ss["r"] * 0.93, 4)
reform_ss["G"] = round(baseline_ss["G"] * 1.02, 1)
reform_ss["TR"] = round(baseline_ss["TR"] * 1.01, 1)
reform_ss["corporate_tax_revenue"] = round(
    baseline_ss["corporate_tax_revenue"] * 0.78, 1
)
reform_ss["total_tax_revenue"] = round(baseline_ss["total_tax_revenue"] * 0.92, 1)
reform_ss["income_tax_revenue"] = round(baseline_ss["income_tax_revenue"] * 1.02, 1)
reform_ss["Gini"] = round(baseline_ss["Gini"] + 0.01, 3)
reform_ss["var_of_logs"] = round(baseline_ss["var_of_logs"] + 0.02, 3)

# Reform lifecycle profiles (slightly shifted)
reform_ss["n"] = [round(v * 1.01, 6) for v in baseline_ss["n"]]
reform_ss["b_s"] = [round(v * 1.05, 4) for v in baseline_ss["b_s"]]
reform_ss["c"] = [round(v * 1.03, 4) for v in baseline_ss["c"]]

# --- Reform Transition Path ---
reform_tpi = {}
for var in tpi_vars:
    ss_val = reform_ss[var]
    base_start = baseline_tpi[var][0]
    # Start from same initial point as baseline, converge to reform SS
    path = [
        base_start + (ss_val - base_start) * (1 - np.exp(-0.04 * t))
        for t in range(T)
    ]
    noise = np.random.normal(0, abs(ss_val) * 0.005, T)
    reform_tpi[var] = [round(v + n, 4) for v, n in zip(path, noise)]

# --- Write fixture files ---
os.makedirs("data/fixtures", exist_ok=True)

for name, data in [
    ("baseline_ss", baseline_ss),
    ("baseline_tpi", baseline_tpi),
    ("reform_ss", reform_ss),
    ("reform_tpi", reform_tpi),
]:
    filepath = f"data/fixtures/{name}.json"
    with open(filepath, "w") as f:
        json.dump(data, f, indent=2)
    print(f"Generated {filepath}")

print("\nAll fixture files generated successfully.")
