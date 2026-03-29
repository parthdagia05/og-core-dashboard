"""
OG-Core Policy Dashboard — Flask Backend

A proof-of-concept dashboard for exploring OG-Core macroeconomic model
parameters and visualizing policy impacts using pre-computed fixtures.
"""

import csv
import io
import json
import os

from flask import Flask, jsonify, render_template, request, Response

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
app = Flask(__name__,
            template_folder=os.path.join(BASE_DIR, "templates"),
            static_folder=os.path.join(BASE_DIR, "static"))

# ---------------------------------------------------------------------------
# Data loading helpers
# ---------------------------------------------------------------------------

DATA_DIR = os.path.join(BASE_DIR, "data")
FIXTURES_DIR = os.path.join(DATA_DIR, "fixtures")


def load_json(filepath):
    with open(filepath, "r") as f:
        return json.load(f)


def load_fixture(name):
    return load_json(os.path.join(FIXTURES_DIR, f"{name}.json"))


DEFAULT_PARAMS = load_json(os.path.join(DATA_DIR, "default_parameters.json"))
PARAM_METADATA = load_json(os.path.join(DATA_DIR, "parameter_metadata.json"))


# ---------------------------------------------------------------------------
# Scaling rules for simulated parameter impact
# ---------------------------------------------------------------------------

SCALING_RULES = {
    "cit_rate": {
        "K": lambda base, old, new: base * (1 - 0.5 * (new - old)),
        "Y": lambda base, old, new: base * (1 - 0.3 * (new - old)),
        "C": lambda base, old, new: base * (1 - 0.15 * (new - old)),
        "L": lambda base, old, new: base * (1 - 0.1 * (new - old)),
        "w": lambda base, old, new: base * (1 - 0.2 * (new - old)),
        "r": lambda base, old, new: base * (1 + 0.3 * (new - old)),
        "total_tax_revenue": lambda base, old, new: base * (1 + 0.8 * (new - old)),
        "corporate_tax_revenue": lambda base, old, new: base * (new / old) if old != 0 else base,
        "D": lambda base, old, new: base * (1 + 0.4 * (new - old)),
    },
    "alpha_G": {
        "Y": lambda base, old, new: base * (1 + 0.2 * (new - old)),
        "C": lambda base, old, new: base * (1 - 0.1 * (new - old)),
        "G": lambda base, old, new: base * (new / old) if old != 0 else base,
        "D": lambda base, old, new: base * (1 + 1.5 * (new - old)),
    },
    "alpha_T": {
        "C": lambda base, old, new: base * (1 + 0.3 * (new - old)),
        "TR": lambda base, old, new: base * (new / old) if old != 0 else base,
        "D": lambda base, old, new: base * (1 + 1.2 * (new - old)),
        "L": lambda base, old, new: base * (1 - 0.2 * (new - old)),
    },
    "tau_c": {
        "C": lambda base, old, new: base * (1 - 0.6 * (new - old)),
        "total_tax_revenue": lambda base, old, new: base * (1 + 0.7 * (new - old)),
        "consumption_tax_revenue": lambda base, old, new: base + (new - old) * 800,
        "Y": lambda base, old, new: base * (1 - 0.1 * (new - old)),
    },
    "tau_payroll": {
        "L": lambda base, old, new: base * (1 - 0.3 * (new - old)),
        "total_tax_revenue": lambda base, old, new: base * (1 + 0.6 * (new - old)),
        "payroll_tax_revenue": lambda base, old, new: base + (new - old) * 600,
        "w": lambda base, old, new: base * (1 - 0.15 * (new - old)),
    },
    "Z": {
        "Y": lambda base, old, new: base * (new / old) if old != 0 else base,
        "C": lambda base, old, new: base * (new / old) ** 0.7 if old != 0 else base,
        "K": lambda base, old, new: base * (new / old) ** 1.2 if old != 0 else base,
        "w": lambda base, old, new: base * (new / old) ** 0.6 if old != 0 else base,
        "L": lambda base, old, new: base * (new / old) ** 0.3 if old != 0 else base,
    },
    "gamma": {
        "K": lambda base, old, new: base * (1 + 1.0 * (new - old)),
        "w": lambda base, old, new: base * (1 - 0.5 * (new - old)),
        "r": lambda base, old, new: base * (1 + 0.8 * (new - old)),
        "Y": lambda base, old, new: base * (1 + 0.1 * (new - old)),
    },
    "delta_annual": {
        "K": lambda base, old, new: base * (1 - 2.0 * (new - old)),
        "Y": lambda base, old, new: base * (1 - 0.5 * (new - old)),
        "r": lambda base, old, new: base * (1 + 1.5 * (new - old)),
    },
    "beta_annual": {
        "K": lambda base, old, new: base * (1 + 5.0 * (new - old)),
        "C": lambda base, old, new: base * (1 - 0.5 * (new - old)),
        "r": lambda base, old, new: base * (1 - 3.0 * (new - old)),
    },
    "sigma": {
        "K": lambda base, old, new: base * (1 + 0.3 * (new - old)),
        "C": lambda base, old, new: base * (1 - 0.1 * (new - old)),
        "L": lambda base, old, new: base * (1 - 0.15 * (new - old)),
    },
    "debt_ratio_ss": {
        "D": lambda base, old, new: base * (new / old) if old != 0 else base,
        "r": lambda base, old, new: base * (1 + 0.1 * (new - old)),
        "K": lambda base, old, new: base * (1 - 0.05 * (new - old)),
    },
    "world_int_rate_annual": {
        "r": lambda base, old, new: base + (new - old) * 0.5,
        "K": lambda base, old, new: base * (1 - 2.0 * (new - old)),
        "Y": lambda base, old, new: base * (1 - 0.5 * (new - old)),
    },
    "ubi_nom_1864": {
        "C": lambda base, old, new: base * (1 + 0.00002 * (new - old)),
        "L": lambda base, old, new: base * (1 - 0.00001 * (new - old)),
        "D": lambda base, old, new: base * (1 + 0.00003 * (new - old)),
        "TR": lambda base, old, new: base + (new - old) * 0.3,
    },
}


def flatten_params(nested):
    """Flatten nested {category: {param: val}} to {param: val}."""
    flat = {}
    for category in nested.values():
        if isinstance(category, dict):
            flat.update(category)
    return flat


def apply_scaling(baseline_data, old_params_flat, new_params_flat):
    """Apply scaling rules to baseline data based on parameter changes."""
    result = {}
    for key, val in baseline_data.items():
        if isinstance(val, list) and len(val) > 0 and isinstance(val[0], (int, float)):
            result[key] = list(val)
        else:
            result[key] = val

    for param_name, rules in SCALING_RULES.items():
        old_val = old_params_flat.get(param_name)
        new_val = new_params_flat.get(param_name)
        if old_val is None or new_val is None or old_val == new_val:
            continue
        for var_name, scale_fn in rules.items():
            if var_name in result:
                current = result[var_name]
                if isinstance(current, list):
                    result[var_name] = [
                        round(scale_fn(v, old_val, new_val), 4) for v in current
                    ]
                else:
                    result[var_name] = round(scale_fn(current, old_val, new_val), 4)

    return result


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/parameters")
def get_parameters():
    return jsonify({
        "defaults": DEFAULT_PARAMS,
        "metadata": PARAM_METADATA,
    })


@app.route("/api/parameters/validate", methods=["POST"])
def validate_parameters():
    params = request.get_json()
    errors = []

    flat_meta = {}
    for cat_key, cat_data in PARAM_METADATA.items():
        for p_name, p_meta in cat_data["params"].items():
            flat_meta[p_name] = p_meta

    flat_params = flatten_params(params) if any(
        isinstance(v, dict) for v in params.values()
    ) else params

    for p_name, value in flat_params.items():
        meta = flat_meta.get(p_name)
        if not meta:
            continue
        if meta["type"] == "array":
            if isinstance(value, list):
                if p_name == "lambdas" and abs(sum(value) - 1.0) > 0.001:
                    errors.append({
                        "param": p_name,
                        "message": "Values must sum to 1.0",
                    })
            continue
        if "min" in meta and value < meta["min"]:
            errors.append({
                "param": p_name,
                "message": f"Value must be >= {meta['min']}",
            })
        if "max" in meta and value > meta["max"]:
            errors.append({
                "param": p_name,
                "message": f"Value must be <= {meta['max']}",
            })

    return jsonify({"valid": len(errors) == 0, "errors": errors})


@app.route("/api/simulate", methods=["POST"])
def simulate():
    new_params = request.get_json()
    new_flat = flatten_params(new_params) if any(
        isinstance(v, dict) for v in new_params.values()
    ) else new_params
    old_flat = flatten_params(DEFAULT_PARAMS)

    baseline_ss = load_fixture("baseline_ss")
    baseline_tpi = load_fixture("baseline_tpi")

    reform_ss = apply_scaling(baseline_ss, old_flat, new_flat)
    reform_tpi = apply_scaling(baseline_tpi, old_flat, new_flat)

    return jsonify({
        "baseline": {"ss": baseline_ss, "tpi": baseline_tpi},
        "reform": {"ss": reform_ss, "tpi": reform_tpi},
    })


@app.route("/api/results/baseline")
def get_baseline():
    return jsonify({
        "ss": load_fixture("baseline_ss"),
        "tpi": load_fixture("baseline_tpi"),
    })


@app.route("/api/results/reform")
def get_reform():
    return jsonify({
        "ss": load_fixture("reform_ss"),
        "tpi": load_fixture("reform_tpi"),
    })


@app.route("/api/results/compare", methods=["POST"])
def compare():
    data = request.get_json()
    baseline_ss = load_fixture("baseline_ss")
    reform_ss = data.get("reform_ss") or load_fixture("reform_ss")

    comparison = []
    display_vars = [
        ("Y", "GDP"), ("K", "Capital"), ("L", "Labor"), ("C", "Consumption"),
        ("D", "Debt"), ("w", "Wage"), ("r", "Interest Rate"),
    ]
    for var_key, var_label in display_vars:
        b_val = baseline_ss.get(var_key, 0)
        r_val = reform_ss.get(var_key, 0)
        pct = ((r_val - b_val) / b_val * 100) if b_val != 0 else 0
        comparison.append({
            "variable": var_label,
            "key": var_key,
            "baseline": round(b_val, 4),
            "reform": round(r_val, 4),
            "pct_change": round(pct, 2),
        })

    return jsonify({"comparison": comparison})


@app.route("/api/export/csv")
def export_csv():
    baseline_ss = load_fixture("baseline_ss")
    reform_ss = load_fixture("reform_ss")

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Variable", "Baseline (SS)", "Reform (SS)", "% Change"])

    display_vars = [
        ("Y", "GDP"), ("K", "Capital"), ("L", "Labor"), ("C", "Consumption"),
        ("D", "Debt"), ("w", "Wage"), ("r", "Interest Rate"),
        ("total_tax_revenue", "Total Tax Revenue"),
        ("Gini", "Gini Coefficient"),
    ]
    for var_key, var_label in display_vars:
        b_val = baseline_ss.get(var_key, 0)
        r_val = reform_ss.get(var_key, 0)
        pct = ((r_val - b_val) / b_val * 100) if b_val != 0 else 0
        writer.writerow([var_label, round(b_val, 4), round(r_val, 4), f"{pct:.2f}%"])

    return Response(
        output.getvalue(),
        mimetype="text/csv",
        headers={"Content-Disposition": "attachment; filename=og_core_comparison.csv"},
    )


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    app.run(debug=True, port=5050)
