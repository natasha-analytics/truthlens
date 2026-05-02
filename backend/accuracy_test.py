import asyncio
import json

from analyzer.fact_checker import fact_check_claim


KNOWN_CLAIMS = [
    {"claim": "The Earth orbits the Sun", "expected": "TRUE"},
    {"claim": "Water boils at 100 degrees Celsius at sea level", "expected": "TRUE"},
    {"claim": "The human body has 206 bones", "expected": "TRUE"},
    {"claim": "Neil Armstrong landed on the moon in 1969", "expected": "TRUE"},
    {"claim": "India gained independence in 1947", "expected": "TRUE"},
    {"claim": "The capital of France is Paris", "expected": "TRUE"},
    {"claim": "Shakespeare wrote Romeo and Juliet", "expected": "TRUE"},
    {"claim": "The Pacific Ocean is the largest ocean", "expected": "TRUE"},
    {"claim": "Python was created by Guido van Rossum", "expected": "TRUE"},
    {"claim": "The Taj Mahal is located in Agra India", "expected": "TRUE"},
    {"claim": "Mount Everest is the tallest mountain on Earth", "expected": "TRUE"},
    {"claim": "The human heart has four chambers", "expected": "TRUE"},
    {"claim": "World War 2 ended in 1945", "expected": "TRUE"},
    {"claim": "Google was founded by Larry Page and Sergey Brin", "expected": "TRUE"},
    {"claim": "The chemical symbol for Gold is Au", "expected": "TRUE"},
    {"claim": "ISRO was founded in 1969", "expected": "TRUE"},
    {"claim": "The capital of Japan is Tokyo", "expected": "TRUE"},
    {"claim": "The Eiffel Tower is located in Paris France", "expected": "TRUE"},
    {"claim": "The speed of light is approximately 300000 km per second", "expected": "TRUE"},
    {"claim": "Mahatma Gandhi was born in 1869", "expected": "TRUE"},
    {"claim": "The capital of Australia is Sydney", "expected": "FALSE"},
    {"claim": "Albert Einstein failed mathematics in school", "expected": "FALSE"},
    {"claim": "The Great Wall of China is visible from space", "expected": "FALSE"},
    {"claim": "Napoleon Bonaparte was extremely short", "expected": "FALSE"},
    {"claim": "Goldfish have a 3 second memory", "expected": "FALSE"},
    {"claim": "Lightning never strikes the same place twice", "expected": "FALSE"},
    {"claim": "Humans only use 10 percent of their brain", "expected": "FALSE"},
    {"claim": "The capital of India is Mumbai", "expected": "FALSE"},
    {"claim": "The Eiffel Tower is located in London", "expected": "FALSE"},
    {"claim": "The square root of 144 is 14", "expected": "FALSE"},
    {"claim": "Diamonds are made of gold", "expected": "FALSE"},
    {"claim": "The sun is a planet", "expected": "FALSE"},
    {"claim": "Bats are completely blind", "expected": "FALSE"},
    {"claim": "Humans and dinosaurs lived at the same time", "expected": "FALSE"},
    {"claim": "The capital of Brazil is Rio de Janeiro", "expected": "FALSE"},
    {"claim": "Sound travels faster than light", "expected": "FALSE"},
    {"claim": "The Earth is flat", "expected": "FALSE"},
    {"claim": "The Amazon River is the longest river in the world", "expected": "FALSE"},
    {"claim": "The currency of Japan is the Yuan", "expected": "FALSE"},
    {"claim": "The first iPhone was released in 2010", "expected": "FALSE"},
]


async def run_accuracy_test():
    print("Starting TruthLens accuracy test on 40 claims...")

    results = []
    correct = 0
    true_positive = 0
    false_positive = 0
    true_negative = 0
    false_negative = 0

    for i, item in enumerate(KNOWN_CLAIMS):
        claim = item["claim"]
        expected = item["expected"]
        result = await fact_check_claim(claim)
        actual = result["verdict"]
        is_correct = (
            actual == expected or
            (expected == "TRUE" and actual in ["TRUE"]) or
            (expected == "FALSE" and actual in ["FALSE"])
        )
        if is_correct:
            correct += 1
        if expected == "TRUE" and actual == "TRUE":
            true_positive += 1
        elif expected == "FALSE" and actual == "FALSE":
            true_negative += 1
        elif expected == "FALSE" and actual == "TRUE":
            false_positive += 1
        elif expected == "TRUE" and actual == "FALSE":
            false_negative += 1
        status = "PASS" if is_correct else "FAIL"
        print(f"{status} [{i+1}/40] {claim[:45]}...")
        print(f"   Expected:{expected} Got:{actual} Confidence:{result['confidence']}%")
        results.append(
            {
                "claim": claim,
                "expected": expected,
                "actual": actual,
                "confidence": result["confidence"],
                "correct": is_correct,
            }
        )
        await asyncio.sleep(0.5)

    total = len(KNOWN_CLAIMS)
    accuracy = (correct / total) * 100
    precision = (
        true_positive / (true_positive + false_positive) * 100
        if (true_positive + false_positive) > 0
        else 0
    )
    recall = (
        true_positive / (true_positive + false_negative) * 100
        if (true_positive + false_negative) > 0
        else 0
    )
    f1 = (
        2 * precision * recall / (precision + recall)
        if (precision + recall) > 0
        else 0
    )

    print("\n========== TRUTHLENS ACCURACY REPORT ==========")
    print(f"Total Tested : {total}")
    print(f"Correct      : {correct}")
    print(f"Accuracy     : {accuracy:.1f}%")
    print(f"Precision    : {precision:.1f}%")
    print(f"Recall       : {recall:.1f}%")
    print(f"F1 Score     : {f1:.1f}%")
    print("================================================")

    with open("accuracy_results.json", "w") as f:
        json.dump(
            {
                "accuracy": round(accuracy, 1),
                "precision": round(precision, 1),
                "recall": round(recall, 1),
                "f1_score": round(f1, 1),
                "total_tested": total,
                "correct": correct,
                "results": results,
            },
            f,
            indent=2,
        )
    print("Saved to accuracy_results.json")


if __name__ == "__main__":
    asyncio.run(run_accuracy_test())
