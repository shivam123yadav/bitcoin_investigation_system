# Elliptic++ adapter

This adapter adds Elliptic++ as a separate REAL BLOCKCHAIN validation dataset.

It does not modify the original CSV files and does not fabricate missing
network/wallet fields.

Run from the SIH_Prototype root:

    python tools/elliptic_adapter.py

Expected input:

    datasets/real/elliptic_transactions/
        txs_features.csv
        txs_classes.csv
        txs_edgelist.csv

Output:

    backend/data/elliptic/
        elliptic_transactions_normalized.csv
        elliptic_transaction_edges.csv
        elliptic_ml_features.csv
        elliptic_adapter_summary.json

Important semantics:
- time_step remains the Elliptic++ time-step index.
- class 1 = illicit, class 2 = licit, class 3 = unknown.
- src_ip/dst_ip/ports/GeoIP/ASN/address-list fields remain null because
  Elliptic++ does not provide them in these transaction files.
