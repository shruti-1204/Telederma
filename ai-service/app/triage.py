def triage_decision(predicted_class, confidence, symptoms):
    """
    Rule-based triage decision for the Telederma AI service.

    predicted_class: str
        Top predicted condition from the AI model.

    confidence: float
        Model confidence between 0 and 1.

    symptoms: dict
        Binary symptom flags, for example:
        {
            "bleeding": 1,
            "increasing_size": 0
        }

    Returns:
        (triage_level, reason)
    """

    # Escalation rules
    if (
        symptoms.get("bleeding") == 1
        or symptoms.get("increasing_size") == 1
    ):
        return (
            "RED",
            "Reported bleeding or increasing size requires prompt evaluation"
        )

    # Low-confidence prediction
    if confidence < 0.3:
        return (
            "YELLOW",
            "Low model confidence - dermatologist review recommended"
        )

    # Condition-specific review rule
    high_risk_classes = ["Impetigo"]

    if predicted_class in high_risk_classes and confidence > 0.4:
        return (
            "YELLOW",
            f"Possible {predicted_class} - dermatologist evaluation advised"
        )

    return (
        "GREEN",
        "No escalation rule triggered based on the available information"
    )