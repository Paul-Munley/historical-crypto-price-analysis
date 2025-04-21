import os
from openai import OpenAI


def ask_question(prompt: str):
    # Initialize the OpenAI client with your API key
    client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

    # Send the question to the OpenAI API and get a response
    response = client.chat.completions.create(
        model="gpt-4",  # Use "gpt-4" if you have access
        messages=[{"role": "user", "content": prompt}]
    )

    return response.choices[0].message.content
