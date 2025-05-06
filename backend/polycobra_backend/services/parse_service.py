import json
import statistics as s

from polycobra_backend.services.ai_service import ask_question

DOLLAR_VALUES_PARSE_PROMPT = ("Parse any and all dollar values in the following string and present them as a list "
                              "of numbers in sorted order. For example, [13, 17, 20]. Input string: ")


def extract_threshold_from_question(question: str) -> float:
    list_of_numbers: str = ask_question(f"{DOLLAR_VALUES_PARSE_PROMPT} {question}")
    numbers = json.loads(list_of_numbers)

    return s.mean(numbers)
