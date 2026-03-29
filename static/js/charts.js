/**
 * OG-Core Policy Dashboard — Charts Module
 *
 * Renders 5 interactive Plotly charts and 1 summary HTML table.
 * Supports three view modes: % difference, levels, side-by-side.
 */

var Charts = (function () {
    "use strict";

    var COLORS = {
        baseline: "#3498db",
        reform: "#e74c3c",
        Y: "#2c3e50",
        C: "#27ae60",
        K: "#8e44ad",
        L: "#e67e22",
        debt: "#e74c3c",
        govSpend: "#3498db",
        transfers: "#27ae60",
        infrastructure: "#f39c12",
        income: "#2c3e50",
        corporate: "#e74c3c",
        consumption: "#27ae60",
        payroll: "#8e44ad",
        wealth: "#f39c12",
        gini: "#e74c3c",
        varLogs: "#3498db",
        savings: "#8e44ad",
        labor: "#e67e22",
        consumptionLC: "#27ae60",
    };

    var LAYOUT_DEFAULTS = {
        margin: { t: 10, r: 20, b: 40, l: 55 },
        font: { size: 11 },
        legend: { orientation: "h", y: -0.2, font: { size: 10 } },
        hovermode: "x unified",
        paper_bgcolor: "rgba(0,0,0,0)",
        plot_bgcolor: "rgba(0,0,0,0)",
    };

    var CONFIG = { responsive: true, displayModeBar: false };

    var currentData = null;
    var currentMode = "pct_diff";

    /**
     * Update all charts with new data.
     * @param {Object} data - { baseline: {ss, tpi}, reform: {ss, tpi} }
     * @param {string} mode - "pct_diff" | "levels" | "side_by_side"
     */
    function update(data, mode) {
        currentData = data;
        currentMode = mode || currentMode;
        renderMacro();
        renderGdpRatios();
        renderTaxRevenue();
        renderInequality();
        renderLifecycle();
        renderSummaryTable();
    }

    /**
     * Re-render all charts with a new view mode.
     */
    function setMode(mode) {
        currentMode = mode;
        if (currentData) update(currentData, mode);
    }

    // ------------------------------------------------------------------
    // Chart 1: Macro Aggregates (Time Series)
    // ------------------------------------------------------------------
    function renderMacro() {
        var bTpi = currentData.baseline.tpi;
        var rTpi = currentData.reform.tpi;
        var T = bTpi.Y.length;
        var years = Array.from({ length: T }, function (_, i) { return i; });
        var vars = [
            { key: "Y", name: "GDP", color: COLORS.Y },
            { key: "C", name: "Consumption", color: COLORS.C },
            { key: "K", name: "Capital", color: COLORS.K },
            { key: "L", name: "Labor", color: COLORS.L },
        ];

        var traces = [];

        if (currentMode === "pct_diff") {
            vars.forEach(function (v) {
                var pctDiff = bTpi[v.key].map(function (bVal, i) {
                    return bVal !== 0 ? ((rTpi[v.key][i] - bVal) / bVal * 100) : 0;
                });
                traces.push({
                    x: years, y: pctDiff, name: v.name,
                    type: "scatter", mode: "lines",
                    line: { color: v.color, width: 2 },
                });
            });
        } else if (currentMode === "levels") {
            vars.forEach(function (v) {
                traces.push({
                    x: years, y: rTpi[v.key], name: v.name + " (Reform)",
                    type: "scatter", mode: "lines",
                    line: { color: v.color, width: 2 },
                });
            });
        } else {
            vars.forEach(function (v) {
                traces.push({
                    x: years, y: bTpi[v.key], name: v.name + " (Base)",
                    type: "scatter", mode: "lines",
                    line: { color: v.color, width: 2 },
                });
                traces.push({
                    x: years, y: rTpi[v.key], name: v.name + " (Reform)",
                    type: "scatter", mode: "lines",
                    line: { color: v.color, width: 2, dash: "dash" },
                });
            });
        }

        var layout = $.extend(true, {}, LAYOUT_DEFAULTS, {
            xaxis: { title: "Year" },
            yaxis: { title: currentMode === "pct_diff" ? "% Change" : "Level" },
        });

        Plotly.newPlot("chart-macro", traces, layout, CONFIG);
    }

    // ------------------------------------------------------------------
    // Chart 2: GDP Ratios (Stacked Area)
    // ------------------------------------------------------------------
    function renderGdpRatios() {
        var tpi = currentMode === "pct_diff" || currentMode === "side_by_side"
            ? currentData.reform.tpi : currentData.reform.tpi;
        var bTpi = currentData.baseline.tpi;
        var T = tpi.Y.length;
        var years = Array.from({ length: T }, function (_, i) { return i; });

        var debtGdp = tpi.D.map(function (d, i) {
            return tpi.Y[i] !== 0 ? (d / tpi.Y[i]) : 0;
        });
        var govGdp = tpi.G.map(function (g, i) {
            return tpi.Y[i] !== 0 ? (g / tpi.Y[i]) : 0;
        });
        var trGdp = tpi.TR.map(function (tr, i) {
            return tpi.Y[i] !== 0 ? (tr / tpi.Y[i]) : 0;
        });

        var traces = [
            {
                x: years, y: debtGdp, name: "Debt/GDP",
                type: "scatter", fill: "tozeroy", mode: "lines",
                line: { color: COLORS.debt, width: 1 },
                fillcolor: "rgba(231,76,60,0.3)",
            },
            {
                x: years, y: govGdp, name: "Gov Spending/GDP",
                type: "scatter", fill: "tozeroy", mode: "lines",
                line: { color: COLORS.govSpend, width: 1 },
                fillcolor: "rgba(52,152,219,0.3)",
            },
            {
                x: years, y: trGdp, name: "Transfers/GDP",
                type: "scatter", fill: "tozeroy", mode: "lines",
                line: { color: COLORS.transfers, width: 1 },
                fillcolor: "rgba(39,174,96,0.3)",
            },
        ];

        var layout = $.extend(true, {}, LAYOUT_DEFAULTS, {
            xaxis: { title: "Year" },
            yaxis: { title: "Ratio", rangemode: "tozero" },
        });

        Plotly.newPlot("chart-gdp-ratios", traces, layout, CONFIG);
    }

    // ------------------------------------------------------------------
    // Chart 3: Tax Revenue Decomposition (Grouped Bar)
    // ------------------------------------------------------------------
    function renderTaxRevenue() {
        var useTpi = currentMode === "side_by_side" ? currentData.baseline.tpi : currentData.reform.tpi;
        var T = useTpi.Y.length;
        // Group every 10 years
        var decadeYears = [];
        var components = {
            income: [], corporate: [], consumption: [], payroll: [], wealth: [],
        };

        for (var t = 0; t < T; t += 10) {
            decadeYears.push("Year " + t);
            components.income.push(useTpi.income_tax_revenue[t]);
            components.corporate.push(useTpi.corporate_tax_revenue[t]);
            components.consumption.push(useTpi.consumption_tax_revenue[t]);
            components.payroll.push(useTpi.payroll_tax_revenue[t]);
            components.wealth.push(useTpi.wealth_tax_revenue[t]);
        }

        var traces = [
            { x: decadeYears, y: components.income, name: "Income Tax", type: "bar", marker: { color: COLORS.income } },
            { x: decadeYears, y: components.corporate, name: "Corporate Tax", type: "bar", marker: { color: COLORS.corporate } },
            { x: decadeYears, y: components.consumption, name: "Consumption Tax", type: "bar", marker: { color: COLORS.consumption } },
            { x: decadeYears, y: components.payroll, name: "Payroll Tax", type: "bar", marker: { color: COLORS.payroll } },
            { x: decadeYears, y: components.wealth, name: "Wealth Tax", type: "bar", marker: { color: COLORS.wealth } },
        ];

        if (currentMode === "side_by_side") {
            var rTpi = currentData.reform.tpi;
            var rComponents = { income: [], corporate: [], consumption: [], payroll: [], wealth: [] };
            for (var t2 = 0; t2 < T; t2 += 10) {
                rComponents.income.push(rTpi.income_tax_revenue[t2]);
                rComponents.corporate.push(rTpi.corporate_tax_revenue[t2]);
                rComponents.consumption.push(rTpi.consumption_tax_revenue[t2]);
                rComponents.payroll.push(rTpi.payroll_tax_revenue[t2]);
                rComponents.wealth.push(rTpi.wealth_tax_revenue[t2]);
            }
            traces.push(
                { x: decadeYears, y: rComponents.income, name: "Income (Reform)", type: "bar", marker: { color: COLORS.income, opacity: 0.5 } },
                { x: decadeYears, y: rComponents.corporate, name: "Corp (Reform)", type: "bar", marker: { color: COLORS.corporate, opacity: 0.5 } }
            );
        }

        var layout = $.extend(true, {}, LAYOUT_DEFAULTS, {
            barmode: "stack",
            xaxis: { title: "" },
            yaxis: { title: "Revenue" },
        });

        Plotly.newPlot("chart-tax-revenue", traces, layout, CONFIG);
    }

    // ------------------------------------------------------------------
    // Chart 4: Inequality Measures (Line)
    // ------------------------------------------------------------------
    function renderInequality() {
        var bTpi = currentData.baseline.tpi;
        var rTpi = currentData.reform.tpi;
        var T = bTpi.Gini.length;
        var years = Array.from({ length: T }, function (_, i) { return i; });

        var traces = [];

        if (currentMode === "pct_diff") {
            traces.push({
                x: years,
                y: bTpi.Gini.map(function (b, i) { return b !== 0 ? ((rTpi.Gini[i] - b) / b * 100) : 0; }),
                name: "Gini (% diff)", type: "scatter", mode: "lines",
                line: { color: COLORS.gini, width: 2 },
            });
            traces.push({
                x: years,
                y: bTpi.var_of_logs.map(function (b, i) { return b !== 0 ? ((rTpi.var_of_logs[i] - b) / b * 100) : 0; }),
                name: "Var of Log Income (% diff)", type: "scatter", mode: "lines",
                line: { color: COLORS.varLogs, width: 2 },
            });
        } else {
            traces.push({
                x: years, y: rTpi.Gini, name: "Gini (Reform)",
                type: "scatter", mode: "lines",
                line: { color: COLORS.gini, width: 2 },
            });
            traces.push({
                x: years, y: rTpi.var_of_logs, name: "Var of Log Income (Reform)",
                type: "scatter", mode: "lines",
                line: { color: COLORS.varLogs, width: 2 },
                yaxis: "y2",
            });
            if (currentMode === "side_by_side") {
                traces.push({
                    x: years, y: bTpi.Gini, name: "Gini (Baseline)",
                    type: "scatter", mode: "lines",
                    line: { color: COLORS.gini, width: 2, dash: "dash" },
                });
                traces.push({
                    x: years, y: bTpi.var_of_logs, name: "Var of Log (Baseline)",
                    type: "scatter", mode: "lines",
                    line: { color: COLORS.varLogs, width: 2, dash: "dash" },
                    yaxis: "y2",
                });
            }
        }

        var layout = $.extend(true, {}, LAYOUT_DEFAULTS, {
            xaxis: { title: "Year" },
            yaxis: { title: currentMode === "pct_diff" ? "% Change" : "Gini" },
        });

        if (currentMode !== "pct_diff") {
            layout.yaxis2 = {
                title: "Var of Log Income",
                overlaying: "y",
                side: "right",
                showgrid: false,
            };
        }

        Plotly.newPlot("chart-inequality", traces, layout, CONFIG);
    }

    // ------------------------------------------------------------------
    // Chart 5: Lifecycle Profiles (Steady State, by Age)
    // ------------------------------------------------------------------
    function renderLifecycle() {
        var bSs = currentData.baseline.ss;
        var rSs = currentData.reform.ss;
        var S = bSs.n.length;
        var ages = Array.from({ length: S }, function (_, i) { return 21 + i; });

        var traces = [];
        var profiles = [
            { key: "b_s", name: "Savings", color: COLORS.savings },
            { key: "n", name: "Labor Supply", color: COLORS.labor },
            { key: "c", name: "Consumption", color: COLORS.consumptionLC },
        ];

        if (currentMode === "pct_diff") {
            profiles.forEach(function (p) {
                traces.push({
                    x: ages,
                    y: bSs[p.key].map(function (b, i) {
                        return b !== 0 ? ((rSs[p.key][i] - b) / b * 100) : 0;
                    }),
                    name: p.name, type: "scatter", mode: "lines",
                    line: { color: p.color, width: 2 },
                });
            });
        } else if (currentMode === "levels") {
            profiles.forEach(function (p) {
                traces.push({
                    x: ages, y: rSs[p.key], name: p.name,
                    type: "scatter", mode: "lines",
                    line: { color: p.color, width: 2 },
                });
            });
        } else {
            profiles.forEach(function (p) {
                traces.push({
                    x: ages, y: bSs[p.key], name: p.name + " (Base)",
                    type: "scatter", mode: "lines",
                    line: { color: p.color, width: 2 },
                });
                traces.push({
                    x: ages, y: rSs[p.key], name: p.name + " (Reform)",
                    type: "scatter", mode: "lines",
                    line: { color: p.color, width: 2, dash: "dash" },
                });
            });
        }

        var layout = $.extend(true, {}, LAYOUT_DEFAULTS, {
            xaxis: { title: "Age" },
            yaxis: { title: currentMode === "pct_diff" ? "% Change" : "Level" },
        });

        Plotly.newPlot("chart-lifecycle", traces, layout, CONFIG);
    }

    // ------------------------------------------------------------------
    // Chart 6: Summary Comparison Table
    // ------------------------------------------------------------------
    function renderSummaryTable() {
        var bSs = currentData.baseline.ss;
        var rSs = currentData.reform.ss;

        var rows = [
            { key: "Y", label: "GDP" },
            { key: "K", label: "Capital" },
            { key: "L", label: "Labor" },
            { key: "C", label: "Consumption" },
            { key: "D", label: "Debt" },
            { key: "w", label: "Wage" },
            { key: "r", label: "Interest Rate" },
            { key: "total_tax_revenue", label: "Total Tax Revenue" },
            { key: "Gini", label: "Gini Coefficient" },
        ];

        var $tbody = $("#summary-table-body");
        $tbody.empty();

        rows.forEach(function (row) {
            var bVal = bSs[row.key] || 0;
            var rVal = rSs[row.key] || 0;
            var pct = bVal !== 0 ? ((rVal - bVal) / bVal * 100) : 0;
            var pctClass = pct > 0.005 ? "pct-positive" : (pct < -0.005 ? "pct-negative" : "pct-zero");
            var pctSign = pct > 0 ? "+" : "";

            var $tr = $("<tr>");
            $tr.append($("<td>").text(row.label));
            $tr.append($('<td class="text-end">').text(formatNum(bVal)));
            $tr.append($('<td class="text-end">').text(formatNum(rVal)));
            $tr.append($('<td class="text-end ' + pctClass + '">').text(pctSign + pct.toFixed(2) + "%"));
            $tbody.append($tr);
        });
    }

    /**
     * Format a number for display.
     */
    function formatNum(val) {
        if (Math.abs(val) >= 100) return val.toFixed(1);
        if (Math.abs(val) >= 1) return val.toFixed(2);
        return val.toFixed(4);
    }

    /**
     * Export a specific chart as PNG.
     */
    function exportPng(chartId) {
        Plotly.downloadImage(chartId, {
            format: "png",
            width: 900,
            height: 500,
            filename: "og_core_" + chartId,
        });
    }

    /**
     * Export all charts as PNG (downloads each one).
     */
    function exportAllPng() {
        var chartIds = [
            "chart-macro", "chart-gdp-ratios", "chart-tax-revenue",
            "chart-inequality", "chart-lifecycle",
        ];
        chartIds.forEach(function (id) {
            exportPng(id);
        });
    }

    return {
        update: update,
        setMode: setMode,
        exportPng: exportPng,
        exportAllPng: exportAllPng,
    };
})();
