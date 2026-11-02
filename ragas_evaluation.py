import json

from ragas import evaluate
from ragas.dataset_schema import EvaluationDataset, SingleTurnSample


# =====================================
# 1. LOAD NODE.JS EVALUATION RESULTS
# =====================================

with open("evaluation-results.json", "r", encoding="utf-8") as f:
    data = json.load(f)

print("Loaded records:", len(data))


# =====================================
# 2. CONVERT JSON TO RAGAS DATASET
# =====================================

samples = []

for item in data:
    sample = SingleTurnSample(
        user_input=item["question"],
        retrieved_contexts=item["contexts"],
        response=item["answer"],
        reference=item["groundTruth"]
    )

    samples.append(sample)


dataset = EvaluationDataset(samples=samples)

print("RAGAS dataset created.")