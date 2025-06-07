import json
import statistics as s

from polycobra_backend.services.ai_service import ask_question

DOLLAR_VALUES_PARSE_PROMPTS = [
    ("Parse any and all dollar values in the following string and present them as a list "
     "of numbers in sorted order. Ignore any numbers that are date values. The output should look like the following: [13, 17, 20]. Input string: "),
    ("List just the dollar amounts mentioned in this text, ordered and in JSON list format. Only give a list like [100, 200, 300]. Ignore any other values. Text: "),
    ("From the text below, extract dollar amounts only. Format output as a Python list. Example: [50, 75]. Text: "),
]

def extract_threshold_from_question(question: str) -> float:
    for prompt in DOLLAR_VALUES_PARSE_PROMPTS:
        try:
            list_of_numbers: str = ask_question(f"{prompt}{question}")
            print(f"Prompt: {prompt}")
            print(f"Response: {list_of_numbers}")
            numbers = json.loads(list_of_numbers)
            return s.mean(numbers)
        except Exception as e:
            print(f"Prompt failed: {e}")
            continue
    return -1  # All prompts failed