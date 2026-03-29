/**
 * OG-Core Policy Dashboard — Main App Controller
 *
 * Wires together ParamEditor and Charts modules,
 * handles user interactions, and manages data flow.
 */

$(document).ready(function () {
    "use strict";

    // ------------------------------------------------------------------
    // Initialization
    // ------------------------------------------------------------------

    ParamEditor.init(function () {
        ParamEditor.initTooltips();
        loadInitialData();
    });

    /**
     * Load baseline + default reform data and render charts.
     */
    function loadInitialData() {
        $.when(
            $.getJSON("/api/results/baseline"),
            $.getJSON("/api/results/reform")
        ).done(function (baselineResp, reformResp) {
            var data = {
                baseline: baselineResp[0],
                reform: reformResp[0],
            };
            Charts.update(data, getSelectedMode());
            showCharts();
        }).fail(function () {
            $("#charts-loading").html(
                '<div class="alert alert-danger">' +
                '<i class="bi bi-exclamation-circle me-2"></i>' +
                'Failed to load results data. Is the Flask server running?' +
                '</div>'
            );
        });
    }

    /**
     * Show charts container and hide loading spinner.
     */
    function showCharts() {
        $("#charts-loading").addClass("d-none");
        $("#charts-container").removeClass("d-none");
    }

    /**
     * Get the currently selected view mode.
     */
    function getSelectedMode() {
        return $('input[name="viewMode"]:checked').val() || "pct_diff";
    }

    // ------------------------------------------------------------------
    // Event Handlers
    // ------------------------------------------------------------------

    // Apply & Update Charts
    $("#btn-apply").on("click", function () {
        var $btn = $(this);
        $btn.prop("disabled", true).html(
            '<span class="spinner-border spinner-border-sm me-1"></span>Simulating...'
        );

        var params = ParamEditor.getCurrentParams();

        $.ajax({
            url: "/api/simulate",
            method: "POST",
            contentType: "application/json",
            data: JSON.stringify(params),
            success: function (data) {
                Charts.update(data, getSelectedMode());
                var changeCount = ParamEditor.getChangeCount();
                if (changeCount > 0) {
                    showToast(changeCount + " parameter(s) applied. Charts updated.");
                } else {
                    showToast("Showing baseline scenario (no changes).");
                }
            },
            error: function () {
                showToast("Simulation failed. Check the server.", "danger");
            },
            complete: function () {
                $btn.prop("disabled", false).html(
                    '<i class="bi bi-play-fill me-1"></i>Apply & Update Charts'
                );
            },
        });
    });

    // View Mode Toggle
    $('input[name="viewMode"]').on("change", function () {
        Charts.setMode($(this).val());
    });

    // Reset All Parameters
    $("#btn-reset-all").on("click", function () {
        ParamEditor.resetAll();
        showToast("All parameters reset to defaults.");
    });

    // Reset Current Tab
    $("#btn-reset-tab").on("click", function () {
        ParamEditor.resetCurrentTab();
        showToast("Current tab reset to defaults.");
    });

    // Export PNG
    $("#btn-export-png").on("click", function () {
        Charts.exportAllPng();
    });

    // ------------------------------------------------------------------
    // Toast Notifications
    // ------------------------------------------------------------------

    function showToast(message, type) {
        type = type || "success";
        var bgClass = type === "danger" ? "bg-danger" : "bg-dark";
        var $toast = $(
            '<div class="toast align-items-center text-white ' + bgClass + ' border-0 position-fixed bottom-0 end-0 m-3" ' +
            'role="alert" style="z-index:9999">' +
            '  <div class="d-flex">' +
            '    <div class="toast-body">' + message + '</div>' +
            '    <button type="button" class="btn-close btn-close-white me-2 m-auto" ' +
            '            data-bs-dismiss="toast"></button>' +
            '  </div>' +
            '</div>'
        );
        $("body").append($toast);
        var toast = new bootstrap.Toast($toast[0], { delay: 3000 });
        toast.show();
        $toast.on("hidden.bs.toast", function () { $toast.remove(); });
    }
});
