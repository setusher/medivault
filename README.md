# MediVault

## Elyx – LLM Branch

WhatsApp-style care conversations, generated with LLMs — then pushed to Firebase for the UI. This branch contains the offline generator + utilities.

## What's Inside :
Message generator: creates 32 weeks of chats following the hackathon rules (labs cadence, travel weeks, exercise updates, weekly report, adherence mix).

Decision extractor: pulls out weekly plan changes / test orders from chats.

Post-processing + validation: cleans JSON, fixes timestamps, enforces constraints.

Firebase push: uploads messages/decisions/metrics/labs to users/{memberId}.

Time analytics: estimates doctor consults and coach hours from the message stream.

Persona analyzer: summarizes member tone, motivations, and friction points.

Prompts: the exact prompts used to generate messages & decisions.

## Quickstart
1) Create & fill .env (see .env.example)
    - CHAT_API_URL, CHAT_API_KEY (OpenRouter)  OR  use a local Ollama endpoint
    - PRIMARY_MODEL / FALLBACK_MODEL
    - FIREBASE_PROJECT_ID + GOOGLE_APPLICATION_CREDENTIALS (for push)
    - WEEK_RANGE=1-4  (tip: run in chunks)

2) pip install -r requirements.txt

3) Generate
python -m src.run_all

Artifacts → data/
  messages_weekXX.json, decisions_weekXX.json, metrics.json, labs.json

## Push to Firebase 
- python -m src.push_to_firestore 
- Structure in Firebase -



  <img width="727" height="195" alt="image" src="https://github.com/user-attachments/assets/b92b1413-ea9a-46eb-a77f-e15ffb421205" />


## Prompts
All prompts used for generation and extraction live in prompts/. Include these in your submission as requested.
