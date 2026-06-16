from __future__ import annotations

import json
import os
import urllib.error
import urllib.request
from typing import Any

from flask import Flask, request


OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2:1b")
DEFAULT_NUM_PREDICT = int(os.getenv("OLLAMA_NUM_PREDICT", "180"))


app = Flask(__name__)


@app.get("/health")
def health() -> tuple[dict[str, str], int]:
    return {"status": "ok", "model": OLLAMA_MODEL}, 200


@app.post("/ask")
def ask() -> tuple[Any, int]:
    payload = request.get_json(silent=True) or {}
    question = payload.get("question") or payload.get("prompt")
    if not question:
        return {"error": "Provide question or prompt in the JSON body."}, 400

    scenario = str(payload.get("scenario", "normal"))
    model = str(payload.get("model", OLLAMA_MODEL))
    num_predict = int(payload.get("num_predict", DEFAULT_NUM_PREDICT))
    prompt = build_prompt(str(question), scenario)

    try:
        ollama_response = call_ollama(model, prompt, num_predict)
    except urllib.error.URLError as exc:
        return {
            "error": f"Unable to reach Ollama at {OLLAMA_BASE_URL}",
            "detail": str(exc),
            "hint": f"Run: ollama pull {model} && ollama serve",
        }, 502

    return {
        "answer": ollama_response.get("response", ""),
        "model": model,
        "scenario": scenario,
        "usage": {
            "prompt_tokens": int(ollama_response.get("prompt_eval_count", 0) or 0),
            "completion_tokens": int(ollama_response.get("eval_count", 0) or 0),
        },
    }, 200


def call_ollama(model: str, prompt: str, num_predict: int) -> dict[str, Any]:
    payload = {
        "model": model,
        "prompt": prompt,
        "stream": False,
        "options": {
            "num_predict": num_predict,
        },
    }
    body = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        f"{OLLAMA_BASE_URL.rstrip('/')}/api/generate",
        data=body,
        headers={"content-type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=300) as response:
        return json.loads(response.read().decode("utf-8"))


def build_prompt(question: str, scenario: str) -> str:
    if scenario == "surge":
        repeated_context = "\n".join(
            [
                "Customer transcript chunk: The user asks for a detailed explanation of AI chargeback, token budgets, rate cards, and GPU utilization.",
            ]
            * 35
        )
        return f"{repeated_context}\n\nQuestion: {question}\nAnswer in detail."

    if scenario == "misuse":
        return (
            "You are running a bulk proposal-generation job through an interactive chat endpoint. "
            "Generate a comprehensive answer with assumptions, risks, pricing, and implementation steps.\n\n"
            f"Question: {question}"
        )

    return question


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", "8080")))
