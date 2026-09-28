# SIH Bitcoin Detection Evaluation

This evaluation is intentionally **post-hoc**: the ground-truth labels are never passed into the backend model or lead-ranking logic. They are used only after the API has produced its leads and patterns.

## Run

Start the backend exactly as you normally do:

```bash
cd backend
source ../.venv-linux313/bin/activate
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Then, from the project root:

```bash
python backend/scripts/evaluate_detection.py
```

Or from `backend`:

```bash
python scripts/evaluate_detection.py
```

## Outputs

The script creates:

```text
backend/data/evaluation/
├── baseline_evaluation.json
├── lead_rankings.csv
└── pattern_evaluation.csv
```

### What is measured

For K = 10, 25, 50, 100, 150:

- Scenario-associated lead rate
- Scenario-core lead rate
- Background-only rate
- Average Precision
- NDCG
- Scenario-family coverage
- Scenario-instance coverage

For patterns:

- Number of peeling candidates
- Number of peeling candidates touching D-labeled entities
- D instance coverage
- Number of mixing candidates
- Number of mixing candidates touching E-labeled entities
- E instance coverage

## Important interpretation

A scenario-associated wallet is not automatically malicious. The synthetic ground truth represents planted behavioral scenarios, and the project documentation requires analyst review.

Likewise, a pattern touching a D/E-labeled wallet is only an evaluation signal. It does not prove that the candidate pattern is a true positive.

The evaluator is for measuring the current prototype and comparing later versions against the same fixed baseline.
