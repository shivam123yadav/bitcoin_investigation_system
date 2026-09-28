# Elliptic++ real-data analysis

Run from the SIH_Prototype root:

    python tools/elliptic_analysis.py

This analysis is deliberately separate from the existing SIH synthetic
pipeline.

It performs:
- Isolation Forest anomaly detection
- Random Forest labelled evaluation on licit/illicit transactions
- transaction graph features from the 234,355 edges
- investigation ranking
- precision/recall/F1/ROC-AUC/PR-AUC

Class 3 (unknown) is NOT used as ground truth in supervised evaluation.

The resulting investigation score is a prioritization score, not a probability.

No original Elliptic++ CSV files are modified.
