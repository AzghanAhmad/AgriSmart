# AgriSmart Chatbot — What It Does (Simple Guide)

This note explains the farming chatbot in everyday language. For technical details (models, APIs, embeddings), see `CHATBOT_ADVANCED_GUIDE.md`.

---

## What is it?

The chatbot is **AgriSmart**: a helper for **Pakistani farmers** focused mainly on **wheat**, **rice**, and **cotton**. You can ask about diseases, pests, water, fertilizer, seasons, and similar topics.

It is **not** a general internet search. It answers from **documents** (PDFs) that were loaded into the app’s knowledge base.

---

## How does it answer a question?

1. **You send a message** (typed or from the microphone).
2. The system **searches** those farming PDFs for parts that best match your question.
3. A language model **reads only those parts** and writes an answer **based on that text**.

So the reply should stay **close to what is in the documents**. If the PDFs do not say something clearly, the bot may say it does not have that detail or may ask you to narrow the question.

---

## Reply language (English or Urdu)

In the chat screen you can choose **how the assistant writes its answer**:

| Option | What you get |
|--------|----------------|
| **English** | Normal English (Latin letters). Good when you ask in English or want a clear English answer. |
| **اردو** | Urdu written in **Arabic script** (the usual Urdu writing style). |

**Important for your project rules:**

- The app does **not** use **Roman Urdu** as a reply style anymore (no long answers that mix Urdu words only in English letters like “gandum mein zang”).
- If you type in **Roman Urdu** but choose **اردو**, the bot is steered to answer in **proper Urdu script**.
- If you choose **English**, the bot is steered to answer in **plain English**, even when the PDF text inside the system is partly Roman Urdu or mixed.

Your choice is **remembered** on the device so you do not have to tap it every time.

---

## Voice (microphone)

There is a separate switch for **which language the microphone expects** (for example Urdu vs English speech recognition). That only affects **how your voice is turned into text**. It does **not** replace the “Reply language” chips: those still control **English vs Urdu script** for the bot’s written answer.

---

## Chat session and “New chat”

- The bot can **remember earlier messages in the same chat** so follow-up questions make sense.
- **New chat** clears that memory and starts fresh (useful if answers drift or you change topic).

---

## What it does not do well (honest limits)

- It **cannot invent** reliable facts that are not supported by the loaded PDFs.
- It is tuned for **agriculture in Pakistan** for the crops above; random or off-topic questions may get a polite refusal.
- Quality depends on **API keys**, **network**, and **which PDFs** were ingested. If something fails, you may see a short error message.

---

## Quick summary

| Idea | Simple meaning |
|------|----------------|
| **Purpose** | Help with wheat / rice / cotton farming using your document library. |
| **Answers** | Grounded in PDFs, not free-form Wikipedia-style guessing. |
| **English / اردو** | You pick the **writing style** of the reply; Roman Urdu is not a reply mode. |
| **Voice** | Controls recognition language; reply style is still set by the chips. |
| **New chat** | Clears memory for a clean start. |

If you change server code or PDFs, restart the backend (and the separate chatbot service container, if you use one) so everyone runs the latest behavior.
