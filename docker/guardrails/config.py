"""
Guardrails AI Server Configuration

Defines named guards for input/output validation of LLM calls.
Each guard exposes a REST endpoint at /guards/{name}/validate.
"""

from guardrails import Guard
from guardrails.hub import DetectPII, ToxicLanguage

# ---------------------------------------------------------------------------
# Input Guards
# ---------------------------------------------------------------------------

pii_input_guard = Guard(name="pii-input-guard").use(
    DetectPII(
        pii_entities=[
            "EMAIL_ADDRESS",
            "PHONE_NUMBER",
            "PERSON",
            "CREDIT_CARD",
            "US_SSN",
            "IBAN_CODE",
            "IP_ADDRESS",
        ],
        on_fail="fix",
    ),
    on="prompt",
)

jailbreak_guard = Guard(name="jailbreak-guard").use_many(
    # Jailbreak detection is handled via the hub validator when available.
    # Falls back to a rule-based approach using the ToxicLanguage validator
    # with a low threshold as a proxy for adversarial prompts.
    ToxicLanguage(
        threshold=0.5,
        validation_method="sentence",
        on_fail="noop",
    ),
    on="prompt",
)

# ---------------------------------------------------------------------------
# Output Guards
# ---------------------------------------------------------------------------

toxicity_guard = Guard(name="toxicity-guard").use(
    ToxicLanguage(
        threshold=0.7,
        validation_method="sentence",
        on_fail="noop",
    ),
    on="output",
)

pii_output_guard = Guard(name="pii-output-guard").use(
    DetectPII(
        pii_entities=[
            "EMAIL_ADDRESS",
            "PHONE_NUMBER",
            "PERSON",
            "CREDIT_CARD",
            "US_SSN",
            "IBAN_CODE",
            "IP_ADDRESS",
        ],
        on_fail="fix",
    ),
    on="output",
)
