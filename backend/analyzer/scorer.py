"""Scoring helpers for aggregating claim verdicts into one truth score."""


def calculate_score(claims_results: list[dict]) -> dict:
    """Calculate overall truth score from claim results."""
    if not claims_results:
        return {
            "overall_score": 0,
            "true_count": 0,
            "false_count": 0,
            "uncertain_count": 0,
            "unverifiable_count": 0,
        }

    true_count = 0
    false_count = 0
    uncertain_count = 0
    unverifiable_count = 0
    total_score = 0

    for result in claims_results:
        verdict = result.get("verdict", "UNCERTAIN")
        confidence = result.get("confidence", 75)

        if verdict == "TRUE":
            true_count += 1
            total_score += confidence
        elif verdict == "FALSE":
            false_count += 1
            total_score += 0
        elif verdict == "UNCERTAIN":
            uncertain_count += 1
            total_score += 40
        else:
            unverifiable_count += 1
            total_score += 0

    overall_score = int(total_score / len(claims_results))

    return {
        "overall_score": overall_score,
        "true_count": true_count,
        "false_count": false_count,
        "uncertain_count": uncertain_count,
        "unverifiable_count": unverifiable_count,
    }


def calculate_overall_score(claims_results: list[dict]) -> dict:
    """Provide backwards-compatible access to the current scoring algorithm."""
    return calculate_score(claims_results)
