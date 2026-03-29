/**
 * OG-Core Policy Dashboard — Parameter Editor Module
 *
 * Handles loading parameter definitions, rendering form inputs,
 * tracking changes, validation, and reset functionality.
 */

var ParamEditor = (function () {
    "use strict";

    var defaults = {};   // { category: { param: value } }
    var metadata = {};   // { category: { label, params: { ... } } }
    var current = {};    // { category: { param: value } } — user-edited values

    /**
     * Initialize the parameter editor by fetching definitions from the API.
     * @param {Function} callback - called when ready
     */
    function init(callback) {
        $.getJSON("/api/parameters", function (data) {
            defaults = data.defaults;
            metadata = data.metadata;
            // Deep copy defaults as current working values
            current = JSON.parse(JSON.stringify(defaults));
            renderAllTabs();
            if (callback) callback();
        });
    }

    /**
     * Render parameter inputs for all category tabs.
     */
    function renderAllTabs() {
        $.each(metadata, function (catKey, catData) {
            var $panel = $("#panel-" + catKey);
            $panel.empty();
            $.each(catData.params, function (paramName, paramMeta) {
                var defaultVal = defaults[catKey][paramName];
                var currentVal = current[catKey][paramName];
                var $group = buildParamGroup(catKey, paramName, paramMeta, defaultVal, currentVal);
                $panel.append($group);
            });
        });
    }

    /**
     * Build a single parameter input group.
     */
    function buildParamGroup(catKey, paramName, meta, defaultVal, currentVal) {
        var isChanged = JSON.stringify(currentVal) !== JSON.stringify(defaultVal);
        var $group = $('<div class="param-group' + (isChanged ? " changed" : "") + '">')
            .attr("data-category", catKey)
            .attr("data-param", paramName);

        // Label row
        var $labelRow = $('<div class="d-flex justify-content-between align-items-center">');
        var $label = $('<label>').text(meta.label);
        var $info = $('<span class="param-info" tabindex="0">')
            .attr("title", meta.description)
            .attr("data-bs-toggle", "tooltip")
            .html('<i class="bi bi-info-circle"></i>');
        $labelRow.append($label).append($info);
        $group.append($labelRow);

        // Input
        if (meta.type === "array") {
            $group.append(buildArrayInput(catKey, paramName, meta, currentVal));
        } else {
            var inputType = (meta.type === "integer") ? "number" : "number";
            var $input = $('<input type="' + inputType + '" class="form-control">')
                .attr("id", "param-" + paramName)
                .attr("name", paramName)
                .attr("min", meta.min)
                .attr("max", meta.max)
                .attr("step", meta.step)
                .val(currentVal);

            if (meta.type === "integer") {
                $input.attr("step", 1);
            }

            $input.on("change input", function () {
                var val = (meta.type === "integer")
                    ? parseInt($(this).val(), 10)
                    : parseFloat($(this).val());
                if (!isNaN(val)) {
                    current[catKey][paramName] = val;
                    updateChangedState($(this).closest(".param-group"), defaultVal, val);
                }
            });

            $group.append($input);
        }

        // Default value indicator
        var defaultDisplay = Array.isArray(defaultVal)
            ? "[" + defaultVal.join(", ") + "]"
            : defaultVal;
        var $default = $('<div class="param-default">')
            .html('Default: <strong>' + defaultDisplay + '</strong>');
        $group.append($default);

        return $group;
    }

    /**
     * Build array input (for parameters like lambdas).
     */
    function buildArrayInput(catKey, paramName, meta, currentVal) {
        var $container = $('<div class="array-input-group">');
        var values = Array.isArray(currentVal) ? currentVal : [currentVal];

        $.each(values, function (i, val) {
            var $input = $('<input type="number" class="form-control">')
                .attr("min", meta.min)
                .attr("max", meta.max)
                .attr("step", meta.step || 0.01)
                .val(val)
                .attr("data-index", i);

            $input.on("change input", function () {
                var idx = parseInt($(this).attr("data-index"), 10);
                var newVal = parseFloat($(this).val());
                if (!isNaN(newVal)) {
                    current[catKey][paramName][idx] = newVal;
                    var defaultVal = defaults[catKey][paramName];
                    updateChangedState(
                        $(this).closest(".param-group"),
                        defaultVal,
                        current[catKey][paramName]
                    );
                    // Update sum indicator
                    var $sumEl = $(this).closest(".array-input-group").siblings(".array-sum");
                    if ($sumEl.length) {
                        var sum = current[catKey][paramName].reduce(function (a, b) { return a + b; }, 0);
                        $sumEl.text("Sum: " + sum.toFixed(3));
                        $sumEl.toggleClass("text-danger", Math.abs(sum - 1.0) > 0.001);
                    }
                }
            });

            $container.append($input);
        });

        // Add/remove buttons
        var $addBtn = $('<button class="btn btn-outline-primary btn-add" type="button" title="Add type">')
            .html('<i class="bi bi-plus"></i>')
            .on("click", function () {
                var arr = current[catKey][paramName];
                arr.push(0);
                renderAllTabs();
                initTooltips();
            });
        var $removeBtn = $('<button class="btn btn-outline-danger btn-remove" type="button" title="Remove last">')
            .html('<i class="bi bi-dash"></i>')
            .on("click", function () {
                var arr = current[catKey][paramName];
                if (arr.length > 1) {
                    arr.pop();
                    renderAllTabs();
                    initTooltips();
                }
            });
        $container.append($addBtn).append($removeBtn);

        // Sum indicator for lambdas
        var $wrapper = $('<div>');
        $wrapper.append($container);
        if (paramName === "lambdas") {
            var sum = values.reduce(function (a, b) { return a + b; }, 0);
            var $sum = $('<div class="array-sum param-default mt-1">')
                .text("Sum: " + sum.toFixed(3));
            if (Math.abs(sum - 1.0) > 0.001) $sum.addClass("text-danger");
            $wrapper.append($sum);
        }

        return $wrapper;
    }

    /**
     * Update the changed/unchanged visual state of a parameter group.
     */
    function updateChangedState($group, defaultVal, currentVal) {
        var isChanged = JSON.stringify(currentVal) !== JSON.stringify(defaultVal);
        $group.toggleClass("changed", isChanged);
    }

    /**
     * Initialize Bootstrap tooltips on parameter info icons.
     */
    function initTooltips() {
        $('[data-bs-toggle="tooltip"]').each(function () {
            new bootstrap.Tooltip(this, { placement: "right", trigger: "hover focus" });
        });
    }

    /**
     * Reset all parameters to defaults.
     */
    function resetAll() {
        current = JSON.parse(JSON.stringify(defaults));
        renderAllTabs();
        initTooltips();
    }

    /**
     * Reset parameters in the currently active tab to defaults.
     */
    function resetCurrentTab() {
        var activeTab = $(".param-tabs .nav-link.active").attr("id");
        if (!activeTab) return;
        var catKey = activeTab.replace("tab-", "");
        if (defaults[catKey]) {
            current[catKey] = JSON.parse(JSON.stringify(defaults[catKey]));
            var $panel = $("#panel-" + catKey);
            $panel.empty();
            $.each(metadata[catKey].params, function (paramName, paramMeta) {
                var defaultVal = defaults[catKey][paramName];
                var currentVal = current[catKey][paramName];
                var $group = buildParamGroup(catKey, paramName, paramMeta, defaultVal, currentVal);
                $panel.append($group);
            });
            initTooltips();
        }
    }

    /**
     * Get current parameter values (full nested structure).
     */
    function getCurrentParams() {
        return JSON.parse(JSON.stringify(current));
    }

    /**
     * Get default parameter values.
     */
    function getDefaults() {
        return JSON.parse(JSON.stringify(defaults));
    }

    /**
     * Check if any parameter has been changed from default.
     */
    function hasChanges() {
        return JSON.stringify(current) !== JSON.stringify(defaults);
    }

    /**
     * Get the count of changed parameters.
     */
    function getChangeCount() {
        var count = 0;
        $.each(current, function (catKey, catParams) {
            $.each(catParams, function (paramName, val) {
                if (JSON.stringify(val) !== JSON.stringify(defaults[catKey][paramName])) {
                    count++;
                }
            });
        });
        return count;
    }

    return {
        init: init,
        initTooltips: initTooltips,
        resetAll: resetAll,
        resetCurrentTab: resetCurrentTab,
        getCurrentParams: getCurrentParams,
        getDefaults: getDefaults,
        hasChanges: hasChanges,
        getChangeCount: getChangeCount,
    };
})();
