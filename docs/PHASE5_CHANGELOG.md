# Backend Phase 5 changes

## Implemented

1. Replaced the Phase 4-only transaction pattern detector with a three-family detector:
   - peeling-chain
   - classic mixing-like
   - repeated high-fanout
2. Added repeated high-fanout detection for repeated low-input/high-output transactions with:
   - exact output-wallet-set reuse
   - minimum repeated observations
   - bounded observation window
   - output similarity
   - coefficient-of-variation guard
   - approximate value conservation
   - explainable pattern observations
3. Pattern steps now include every input/output wallet for repeated-fanout candidates so entity attribution is not lost when a wallet appears in the middle of a large output set.
4. Lead ranking now treats a single strong pattern finding as an active pattern evidence channel rather than requiring two patterns.
5. Lead evidence identifies `repeated-fanout` explicitly instead of using a generic transaction-flow label.
6. Evaluation output now records `pattern_type` in `pattern_evaluation.csv`.
7. Added regression tests for repeated-fanout detection and classic mixing detection.
8. Preserved the previous implementation as `app/services/analysis_phase4_backup.py`.

## Validation performed on the supplied backend

- All Python source files compile successfully with `py_compile`.
- The focused pattern regression suite passes 2/2 tests.
- A synthetic 9-transaction, 1-input/15-output repeated-fanout fixture produces a `repeated-fanout` candidate and retains the target wallet in its pattern steps.

## Important limitation

The supplied ZIP does not contain the external `datasets/` directory referenced by `app/services/paths.py`, so a full 48,000-record end-to-end analysis could not be rerun from the ZIP alone. The existing normalized backend artifacts were inspected, and the new pattern detector was validated independently against a fixture matching the observed repeated-fanout structure.

## Phase 5.1 — restart-safe local run state

The backend now restores the latest completed analysis from `backend/data/runs/` when the API process starts. The persisted state includes the latest leads, clusters, patterns, evidence, findings and timelines alongside the existing wallet/IP Parquet artifacts.

This is intentionally file-based and local: no Redis, Celery, external database, or background worker was added. If the cached state is missing or incomplete, the API still starts normally and the next explicit analysis run rebuilds it.
