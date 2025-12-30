/**
 * Formloop_Exact_Vector_Duplicate_Finder_MVP.jsx
 * v0.2 (adds translation-invariant matching)
 *
 * Change from v0.1 MVP:
 * - Translation-invariant geometry matching is now enabled.
 *   Paths are considered duplicates if their point geometry matches AFTER removing absolute position
 *   by subtracting an origin offset from every anchor/left/right coordinate.
 *
 * Still true (unchanged):
 * - CURRENT SELECTION only.
 * - PathItem only (recurses into GroupItem children). Ignores everything else.
 * - No CompoundPathItem support.
 * - Geometry only. No appearance or color.
 * - No normalization for point order or reversed direction.
 * - Rounding tolerance still applies (round(value / tol) * tol).
 */

(function Formloop_Exact_Vector_Duplicate_Finder_v02() {
    var SCRIPT_NAME = "Formloop Exact Vector Duplicate Finder MVP";
    var SCRIPT_VERSION = "v0.2 (Translation-Invariant)";

    // ----------------------------
    // Entry guards
    // ----------------------------
    if (app.documents.length === 0) {
        alert("No document open.");
        return;
    }

    var doc = app.activeDocument;

    if (!doc.selection || doc.selection.length === 0) {
        alert("Select at least 2 vector paths, then run again.");
        return;
    }

    // ----------------------------
    // Helpers
    // ----------------------------
    function isNumberFinite(n) {
        return typeof n === "number" && isFinite(n);
    }

    function safeParseFloat(s, fallback) {
        var n = parseFloat(String(s));
        return isNumberFinite(n) ? n : fallback;
    }

    function safeParseTol(s) {
        var tol = safeParseFloat(s, 0.01);
        if (!isNumberFinite(tol) || tol <= 0) tol = 0.01;
        return tol;
    }

    function roundToTol(value, tol) {
        var v = Number(value);
        if (!isNumberFinite(v)) v = 0;
        return Math.round(v / tol) * tol;
    }

    function fmt(value, decimals) {
        var v = Number(value);
        if (!isNumberFinite(v)) v = 0;
        return v.toFixed(decimals);
    }

    function getActiveArtboardRect(documentRef) {
        var idx = documentRef.artboards.getActiveArtboardIndex();
        return documentRef.artboards[idx].artboardRect; // [left, top, right, bottom]
    }

    function findFontOrFallback() {
        var candidates = ["ArialMT", "Arial"];
        for (var i = 0; i < candidates.length; i++) {
            try {
                var f = app.textFonts.getByName(candidates[i]);
                if (f) return f;
            } catch (e) {}
        }
        return app.textFonts.length ? app.textFonts[0] : null;
    }

    function canCopyToClipboard() {
        var os = ($.os || "").toLowerCase();
        return (os.indexOf("mac") >= 0) || (os.indexOf("windows") >= 0) || (os.indexOf("win") >= 0);
    }

    function copyTextToClipboard(text) {
        try {
            var os = ($.os || "").toLowerCase();
            var safeText = String(text);

            if (os.indexOf("mac") >= 0) {
                var cmdMac = 'osascript -e ' +
                    '"set the clipboard to \\"' +
                    safeText.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\r/g, "\\r").replace(/\n/g, "\\n") +
                    '\\""';
                app.system(cmdMac);
                return true;
            }

            if (os.indexOf("windows") >= 0 || os.indexOf("win") >= 0) {
                var cmdText = safeText.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
                cmdText = cmdText.replace(/"/g, '\\"');
                var cmdWin = 'cmd.exe /c "echo ' + cmdText + ' | clip"';
                app.system(cmdWin);
                return true;
            }
        } catch (e) {}
        return false;
    }

    // ----------------------------
    // Recursive selection flattener
    // ----------------------------
    function collectPathItemsFromSelection(selection, state) {
        function walk(item) {
            if (!item) return;

            try {
                if (item.locked) { state.skippedLocked++; return; }
                if (item.hidden) { state.skippedHidden++; return; }
            } catch (e) {
                return;
            }

            if (item.typename === "GroupItem") {
                var kids = item.pageItems;
                for (var i = 0; i < kids.length; i++) walk(kids[i]);
                return;
            }

            if (item.typename === "PathItem") {
                state.pathItems.push(item);
                return;
            }

            // MVP: ignore everything else (including CompoundPathItem)
        }

        for (var i = 0; i < selection.length; i++) walk(selection[i]);
    }

    // ----------------------------
    // Geometry signature (translation-invariant)
    // ----------------------------
    function geometrySignatureTranslationInvariant(pathItem, tol, decimals) {
        var pts = pathItem.pathPoints;
        var pointCount = pts.length;

        // Origin offset: first point's anchor (raw, not rounded).
        // We subtract this from every anchor/left/right coordinate before rounding.
        var ox = pts[0].anchor[0];
        var oy = pts[0].anchor[1];

        var parts = [];
        parts.push("typename=PathItem");
        parts.push("closed=" + (pathItem.closed ? "1" : "0"));
        parts.push("points=" + pointCount);
        parts.push("txinv=1"); // explicit marker for this signature style

        for (var i = 0; i < pointCount; i++) {
            var p = pts[i];

            var ax = fmt(roundToTol((p.anchor[0] - ox), tol), decimals);
            var ay = fmt(roundToTol((p.anchor[1] - oy), tol), decimals);

            var lx = fmt(roundToTol((p.leftDirection[0] - ox), tol), decimals);
            var ly = fmt(roundToTol((p.leftDirection[1] - oy), tol), decimals);

            var rx = fmt(roundToTol((p.rightDirection[0] - ox), tol), decimals);
            var ry = fmt(roundToTol((p.rightDirection[1] - oy), tol), decimals);

            parts.push("p" + i + "=" + ax + "," + ay + "|" + lx + "," + ly + "|" + rx + "," + ry);
        }

        return parts.join(";");
    }

    // ----------------------------
    // Report helpers
    // ----------------------------
    function safeName(s) {
        s = String(s || "");
        return s ? s : "[Unnamed]";
    }

    function safeLayerName(item) {
        try {
            if (item && item.layer && item.layer.name) return String(item.layer.name);
        } catch (e) {}
        return "[Unknown Layer]";
    }

    function safeBoundsStr(item) {
        try {
            var b = item.geometricBounds; // [left, top, right, bottom]
            if (b && b.length === 4) {
                return "[" + fmt(b[0], 2) + ", " + fmt(b[1], 2) + ", " + fmt(b[2], 2) + ", " + fmt(b[3], 2) + "]";
            }
        } catch (e) {}
        return "[Bounds unavailable]";
    }

    function buildReportText(summary, duplicateSets, tol) {
        var lines = [];

        lines.push(SCRIPT_NAME + " - " + SCRIPT_VERSION);
        lines.push("Matching: Translation-invariant (position ignored).");
        lines.push("Tolerance (pt): " + tol);
        lines.push("");

        lines.push("Total selected PathItems scanned: " + summary.scannedCount);
        lines.push("Skipped (locked): " + summary.skippedLocked);
        lines.push("Skipped (hidden): " + summary.skippedHidden);
        lines.push("Skipped (zero-point): " + summary.skippedZeroPoint);
        lines.push("");

        lines.push("Duplicate sets found: " + summary.duplicateSetCount);
        lines.push("Total duplicates " + (summary.deleteMode ? "deleted" : "that would be deleted") + ": " + summary.totalDuplicatesToDelete);
        lines.push("");

        for (var s = 0; s < duplicateSets.length; s++) {
            var set = duplicateSets[s];
            lines.push("Set " + (s + 1) + " (" + set.items.length + " items)");
            for (var i = 0; i < set.items.length; i++) {
                var it = set.items[i];
                lines.push(
                    "  - " +
                    safeName(it.name) +
                    " | Layer: " + safeLayerName(it) +
                    " | Bounds: " + safeBoundsStr(it)
                );
            }
            lines.push("");
        }

        return lines.join("\r");
    }

    function createTextReport(documentRef, reportText) {
        var ab = getActiveArtboardRect(documentRef);
        var left = ab[0] + 20;
        var top = ab[1] - 20;

        var tf = documentRef.textFrames.add();
        tf.left = left;
        tf.top = top;
        tf.contents = reportText;

        try {
            var f = findFontOrFallback();
            if (f) tf.textRange.characterAttributes.textFont = f;
        } catch (e) {}

        try {
            tf.textRange.characterAttributes.size = 10;
        } catch (e2) {}

        return tf;
    }

    // ----------------------------
    // Pre-scan selection and guardrails
    // ----------------------------
    var state = {
        pathItems: [],
        skippedLocked: 0,
        skippedHidden: 0,
        skippedZeroPoint: 0
    };

    collectPathItemsFromSelection(doc.selection, state);

    if (state.pathItems.length < 2) {
        alert("Select at least 2 vector paths, then run again.");
        return;
    }

    if (state.pathItems.length > 5000) {
        var proceed = confirm(
            "You have " + state.pathItems.length + " PathItems in your selection.\n" +
            "This may be slow.\n\n" +
            "Continue?"
        );
        if (!proceed) return;
    }

    // ----------------------------
    // Single dialog
    // ----------------------------
    var dlg = new Window("dialog", SCRIPT_NAME + " - " + SCRIPT_VERSION);
    dlg.orientation = "column";
    dlg.alignChildren = ["fill", "top"];

    var tolPanel = dlg.add("panel", undefined, "Tolerance");
    tolPanel.orientation = "row";
    tolPanel.alignChildren = ["left", "center"];
    tolPanel.add("statictext", undefined, "Tolerance (pt):");
    var tolInput = tolPanel.add("edittext", undefined, "0.01");
    tolInput.characters = 10;

    var modePanel = dlg.add("panel", undefined, "Mode");
    modePanel.orientation = "column";
    modePanel.alignChildren = ["left", "top"];
    var rbReport = modePanel.add("radiobutton", undefined, "Report only");
    var rbDelete = modePanel.add("radiobutton", undefined, "Delete duplicates (keep first)");
    rbReport.value = true;

    var outPanel = dlg.add("panel", undefined, "Output");
    outPanel.orientation = "column";
    outPanel.alignChildren = ["left", "top"];
    var cbTextReport = outPanel.add("checkbox", undefined, "Create a text report (new Illustrator text frame)");
    cbTextReport.value = true;

    var cbClipboard = null;
    if (canCopyToClipboard()) {
        cbClipboard = outPanel.add("checkbox", undefined, "Also copy report to clipboard");
        cbClipboard.value = false;
    }

    var btnRow = dlg.add("group");
    btnRow.alignment = "right";
    btnRow.add("button", undefined, "Cancel", { name: "cancel" });
    btnRow.add("button", undefined, "Run", { name: "ok" });

    if (dlg.show() !== 1) return;

    var tol = safeParseTol(tolInput.text);
    var deleteMode = rbDelete.value === true;
    var makeTextReport = cbTextReport.value === true;
    var doClipboard = (cbClipboard && cbClipboard.value === true);

    // ----------------------------
    // Build map (one pass), compute sets (second pass)
    // ----------------------------
    var map = {}; // signature -> array of PathItems
    var scannedCount = 0;

    state.skippedZeroPoint = 0;

    for (var i = 0; i < state.pathItems.length; i++) {
        var it = state.pathItems[i];

        try {
            if (it.locked) { state.skippedLocked++; continue; }
            if (it.hidden) { state.skippedHidden++; continue; }
        } catch (e0) {
            continue;
        }

        var ptsLen = 0;
        try { ptsLen = it.pathPoints.length; } catch (e1) { ptsLen = 0; }
        if (ptsLen === 0) {
            state.skippedZeroPoint++;
            continue;
        }

        var sig = "";
        try {
            sig = geometrySignatureTranslationInvariant(it, tol, 4);
        } catch (e2) {
            state.skippedZeroPoint++;
            continue;
        }

        if (!map[sig]) map[sig] = [];
        map[sig].push(it);
        scannedCount++;
    }

    var duplicateSets = [];
    var totalDuplicatesToDelete = 0;

    for (var key in map) {
        if (!map.hasOwnProperty(key)) continue;
        var list = map[key];
        if (list && list.length > 1) {
            duplicateSets.push({ signature: key, items: list });
            totalDuplicatesToDelete += (list.length - 1);
        }
    }

    // ----------------------------
    // Delete mode (defer deletion until after scan)
    // ----------------------------
    var deletedCount = 0;
    var deleteError = null;

    if (deleteMode && totalDuplicatesToDelete > 0) {
        try {
            for (var s = 0; s < duplicateSets.length; s++) {
                var items = duplicateSets[s].items;

                for (var d = items.length - 1; d >= 1; d--) {
                    items[d].remove();
                    deletedCount++;
                }
            }
        } catch (eAbort) {
            deleteError = eAbort;
        }
    }

    if (deleteError) {
        alert(
            "Error occurred during deletion. Aborted further deletes.\n\n" +
            "Deleted before error: " + deletedCount + "\n" +
            "Error: " + (deleteError.message || deleteError)
        );
        return;
    }

    // ----------------------------
    // Report output
    // ----------------------------
    var summary = {
        scannedCount: scannedCount,
        skippedLocked: state.skippedLocked,
        skippedHidden: state.skippedHidden,
        skippedZeroPoint: state.skippedZeroPoint,
        duplicateSetCount: duplicateSets.length,
        totalDuplicatesToDelete: deleteMode ? deletedCount : totalDuplicatesToDelete,
        deleteMode: deleteMode
    };

    var reportText = buildReportText(summary, duplicateSets, tol);

    if (makeTextReport) {
        try {
            createTextReport(doc, reportText);
        } catch (eRep) {
            alert("Report creation failed: " + (eRep.message || eRep));
        }
    }

    if (doClipboard) {
        copyTextToClipboard(reportText);
    }

    if (deleteMode) {
        alert(
            "Done.\n" +
            "Duplicate sets: " + summary.duplicateSetCount + "\n" +
            "Duplicates deleted: " + summary.totalDuplicatesToDelete
        );
    } else {
        alert(
            "Done.\n" +
            "Duplicate sets: " + summary.duplicateSetCount + "\n" +
            "Duplicates found: " + summary.totalDuplicatesToDelete
        );
    }
})();
