from groq import Groq

# Replace with your key or use env variable
client = Groq(api_key="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")

try:
    response = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[
            {"role": "user", "content": "Say hello in one sentence"}
        ],
    )

    print("✅ API WORKING")
    print(response.choices[0].message.content)

except Exception as e:
    print("❌ ERROR:", str(e))