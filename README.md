FORMLOOP EXACT VECTOR DUPLICATE FINDER (MVP)
==========================================

Script file: Formloop_Exact_Vector_Duplicate_Finder_MVP.jsx
Version: v0.2 (Translation-Invariant)
Host app: Adobe Illustrator (ExtendScript .jsx)

------------------------------------------------------------

OVERVIEW
--------

This script finds exact duplicate vector paths in the CURRENT SELECTION
by comparing true path geometry.

As of v0.2, matching is translation-invariant.
Identical shapes in different positions can be detected as duplicates.

------------------------------------------------------------

WHAT IT DOES
------------

- Operates on the current selection only
- Recursively scans GroupItems to collect PathItem objects
- Ignores everything except PathItem
- Skips locked and hidden items
- Skips zero-point paths
- Compares geometry using:
  - closed state
  - pathPoints.length
  - For each point index:
    - anchor [x,y]
    - leftDirection [x,y]
    - rightDirection [x,y]
- All numeric values are rounded to a user-defined tolerance (pt)

------------------------------------------------------------

WHAT IT DOES NOT DO (MVP LIMITS)
-------------------------------

- Does not scan the entire document
- No CompoundPathItem support
- No clipping mask handling
- No appearance or color comparison
- No point order normalization
- No reversed direction normalization
- No rotation, scale, or skew invariance
- No “visually similar” detection

------------------------------------------------------------

HOW TO USE
----------

1. Select at least TWO vector paths in Illustrator
2. Run the script via:
   File > Scripts > Other Script...
3. In the dialog:
   - Set Tolerance (pt). Default is 0.01
   - Choose Mode:
     * Report only (default)
     * Delete duplicates (keep first)
   - Output options:
     * Create a text report (default ON)
     * Copy report to clipboard (if supported)
4. Click Run

------------------------------------------------------------

OUTPUT
------

REPORT CONTENT
- Script name and version
- Total PathItems scanned
- Skipped counts:
  - locked
  - hidden
  - zero-point
- Number of duplicate sets found
- Total duplicates found or deleted
- Per duplicate set:
  - set index
  - number of items
  - item name (if any)
  - layer name
  - geometric bounds (for orientation only)

REPORT PLACEMENT
- If enabled, a new text frame is created near the
  top-left of the active artboard
- Uses Arial as a safe font fallback

------------------------------------------------------------

PERFORMANCE NOTES
-----------------

- Early exit if fewer than 2 PathItems are found
- If more than 5000 PathItems are detected, the script
  prompts before continuing

------------------------------------------------------------

KNOWN MATCHING PITFALLS
----------------------

If shapes appear identical but do not match:
- Different point order
- Reversed path direction
- Different point count
- Tolerance set too low

For best results, compare paths created via the same
construction method (copy/paste, expand appearance, etc.)

------------------------------------------------------------

INSTALLATION
------------

1. Save the .jsx file to disk
2. Run via:
   File > Scripts > Other Script...
3. Optional:
   Place the file in Illustrator’s Scripts folder
   and restart Illustrator for permanent access

------------------------------------------------------------

CHANGELOG
---------

v0.2
- Added translation-invariant geometry matching

v0.1
- Absolute-coordinate geometry matching only

------------------------------------------------------------

LICENSE
-------

MIT License
Copyright (c) 2025 Formloop

------------------------------------------------------------

SUPPORT / FEEDBACK
------------------

When reporting issues, include:
- Screenshot of the selected shapes
- Tolerance used
- How the paths were created
  (copy/paste, offset path, expand appearance, etc.)
