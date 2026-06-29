#!/usr/bin/env python3
"""Compare local Ollama-derived rates with a managed online model rate card."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Compare local, on-prem, and managed online token rates."
    )
    parser.add_argument(
        "--local-json",
        required=True,
        help="JSON output from benchmark_ollama.py.",
    )
    parser.add_argument(
        "--online-model",
        required=True,
        help="Name of the managed online model or API rate card.",
    )
    parser.add_argument(
        "--online-input-usd-per-1m",
        type=float,
        required=True,
        help="Managed online model input price per 1M tokens.",
    )
    parser.add_argument(
        "--online-output-usd-per-1m",
        type=float,
        required=True,
        help="Managed online model output price per 1M tokens.",
    )
    parser.add_argument(
        "--prompt-tokens",
        type=int,
        help="Prompt tokens to compare. Defaults to benchmark average prompt tokens.",
    )
    parser.add_argument(
        "--completion-tokens",
        type=int,
        help="Completion tokens to compare. Defaults to benchmark average completion tokens.",
    )
    parser.add_argument(
        "--onprem-name",
        default="on-prem-gpu-pool",
        help="Optional on-prem rate-card name.",
    )
    parser.add_argument(
        "--onprem-input-usd-per-1m",
        type=float,
        help="Optional on-prem input rate per 1M tokens.",
    )
    parser.add_argument(
        "--onprem-output-usd-per-1m",
        type=float,
        help="Optional on-prem output rate per 1M tokens.",
    )
    parser.add_argument("--json-out", help="Optional path to write comparison JSON.")
    args = parser.parse_args()

    local = load_json(args.local_json)
    local_rates = local["derived_token_rates_usd_per_1m"]
    token_counts = local["token_counts"]
    samples = max(int(local.get("samples", 1)), 1)

    prompt_tokens = args.prompt_tokens or round(token_counts["prompt_tokens"] / samples)
    completion_tokens = args.completion_tokens or round(
        token_counts["completion_tokens"] / samples
    )

    candidates = [
        {
            "name": f"local-{local['model']}",
            "basis": "observed_local_benchmark",
            "input_usd_per_1m": local_rates["input"],
            "output_usd_per_1m": local_rates["output"],
        },
        {
            "name": args.online_model,
            "basis": "public_managed_api_rate_card",
            "input_usd_per_1m": args.online_input_usd_per_1m,
            "output_usd_per_1m": args.online_output_usd_per_1m,
        },
    ]

    if args.onprem_input_usd_per_1m is not None and args.onprem_output_usd_per_1m is not None:
        candidates.append(
            {
                "name": args.onprem_name,
                "basis": "internal_onprem_rate_card",
                "input_usd_per_1m": args.onprem_input_usd_per_1m,
                "output_usd_per_1m": args.onprem_output_usd_per_1m,
            }
        )

    rows = [
        {
            **candidate,
            "prompt_tokens": prompt_tokens,
            "completion_tokens": completion_tokens,
            "estimated_request_cost_usd": estimate_cost(
                prompt_tokens,
                completion_tokens,
                candidate["input_usd_per_1m"],
                candidate["output_usd_per_1m"],
            ),
        }
        for candidate in candidates
    ]
    rows.sort(key=lambda row: row["estimated_request_cost_usd"])

    cheapest = rows[0]
    result = {
        "comparison_tokens": {
            "prompt_tokens": prompt_tokens,
            "completion_tokens": completion_tokens,
            "total_tokens": prompt_tokens + completion_tokens,
        },
        "ranked_options": rows,
        "cheapest": cheapest,
        "notes": [
            "This compares price only. It does not score quality, latency, privacy, data residency, reliability, or operational effort.",
            "Managed online prices must be verified against the provider pricing page before a workshop or customer conversation.",
            "Local and on-prem prices are internal rate-card estimates derived from measured throughput and cost pools.",
        ],
    }

    print_summary(result)
    if args.json_out:
        with Path(args.json_out).open("w", encoding="utf-8") as handle:
            json.dump(result, handle, indent=2)
            handle.write("\n")

    return 0


def load_json(path: str) -> dict[str, Any]:
    with Path(path).open(encoding="utf-8") as handle:
        return json.load(handle)


def estimate_cost(
    prompt_tokens: int,
    completion_tokens: int,
    input_usd_per_1m: float,
    output_usd_per_1m: float,
) -> float:
    return (
        (prompt_tokens / 1_000_000.0) * input_usd_per_1m
        + (completion_tokens / 1_000_000.0) * output_usd_per_1m
    )


def print_summary(result: dict[str, Any]) -> None:
    tokens = result["comparison_tokens"]
    print(
        "Comparison request: "
        f"{tokens['prompt_tokens']} input tokens, "
        f"{tokens['completion_tokens']} output tokens"
    )
    print("Ranked by estimated request cost:")
    for row in result["ranked_options"]:
        print(
            "- "
            f"{row['name']}: ${row['estimated_request_cost_usd']:.9f} "
            f"({row['input_usd_per_1m']:.6f}/1M in, "
            f"{row['output_usd_per_1m']:.6f}/1M out)"
        )
    cheapest = result["cheapest"]
    print(f"Cheapest price-only option: {cheapest['name']}")


if __name__ == "__main__":
    raise SystemExit(main())
