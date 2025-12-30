Formloop Exact Vector Duplicate Finder (MVP)

Script file: Formloop_Exact_Vector_Duplicate_Finder_MVP.jsx
Version: v0.2 (Translation-Invariant)
Host app: Adobe Illustrator (ExtendScript .jsx)

Finds exact duplicate vector paths in your current selection by comparing true path geometry. In v0.2, position is ignored. Two identical shapes in different locations can match.

What it does

Scans your current selection only

Recursively collects PathItem objects inside selected GroupItems

Skips anything that is not a PathItem (no CompoundPath support)

Compares path geometry using:

closed value

pathPoints.length

For each point index:

anchor [x,y]

leftDirection [x,y]

rightDirection [x,y]

Values are rounded to a tolerance (pt)

v0.2 matching behavior: translation-invariant. The script subtracts an origin offset (first anchor point) from every coordinate before comparing.

What it does NOT do (MVP limits)

Does not scan the full document. Selection only

No CompoundPathItem support

No clipping mask or masked content handling (non-PathItems are ignored)

No appearance or color matching

No point order normalization

No reversed-direction normalization

No rotation, scale, or skew invariance

No “visually similar” detection. Only exact geometry after rounding

How to use

In Illustrator, select at least 2 vector paths.

Run the script:

File > Scripts > Other Script…

In the dialog:

Tolerance (pt). Default 0.01

Mode

Report only (default)

Delete duplicates (keep first)

Output

Create a text report (default ON)

Optional. Copy report to clipboard (if supported)

Output
Report includes

Script name + version

Total PathItems scanned (from selection)

Skipped counts:

locked

hidden

zero-point paths

Number of duplicate sets found

Total duplicates found (or deleted in delete mode)

For each duplicate set:

set index

count in set

for each item: item.name, layer name, and geometricBounds

Report placement

If enabled, the script creates a new text frame near the top-left of the active artboard. Font fallback attempts Arial.

Notes and tips

If your shapes look identical but do not match, common reasons:

Different point order (same shape, different construction)

One path has reversed direction

Different number of points

Tolerance too small for your file’s numeric values

For best results, compare paths created the same way (duplicates from copy/paste, symbols expanded similarly, etc.).

Performance guardrail

If more than 5000 PathItems are found in the selection, the script prompts before continuing.

Install

Save the .jsx file to a known location.

Run via:

File > Scripts > Other Script…

Optional. Place it in Illustrator’s Scripts folder for quick access, then restart Illustrator.

Changelog

v0.2

Added translation-invariant matching (position ignored)

v0.1

Absolute-coordinate matching only

License

Use, modify, and distribute internally at your own risk. If you plan to sell or publicly distribute, add your preferred license text here.

Support / Feedback

If you hit a mismatch case, capture:

a screenshot of the selection

the tolerance used

whether the paths were created by copy/paste, offset path, expand appearance, etc.
