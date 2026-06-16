#!/usr/bin/env python3
"""Generate synthetic AI tokenomics events for proactive cost-control labs."""

from __future__ import annotations

import argparse
import csv
import json
import random
from collections import defaultdict
from dataclasses import asdict, dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Iterable


@dataclass(frozen=True)
class UsageEvent:
    timestamp: str
    scenario: str
    ai_team: str
    ai_business_unit: str
    ai_cost_center: str
    ai_tenant_id: str
    ai_user_id: str
    ai_workload_name: str
    ai_outcome_category: str
    gen_ai_request_model: str
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int
    estimated_cost_usd: float


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Simulate token surge, misuse, and chargeback alarm scenarios."
    )
    parser.add_argument("--minutes", type=int, default=60)
    parser.add_argument("--requests-per-minute", type=int, default=12)
    parser.add_argument("--input-usd-per-1m", type=float, default=0.20)
    parser.add_argument("--output-usd-per-1m", type=float, default=1.25)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--scenario", choices=["all", "surge", "misuse", "unknown"], default="all")
    parser.add_argument("--out-dir", default="/tmp/ai-tokenomics-simulation")
    args = parser.parse_args()

    random.seed(args.seed)
    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    events = list(generate_events(args))
    write_jsonl(out_dir / "token-cost-events.jsonl", events)
    write_csv(out_dir / "token-cost-events.csv", events)

    summary = summarize(events)
    alarms = evaluate_alarms(events)
    report = {
        "parameters": vars(args),
        "summary": summary,
        "alarms": alarms,
        "files": {
            "jsonl": str(out_dir / "token-cost-events.jsonl"),
            "csv": str(out_dir / "token-cost-events.csv"),
        },
    }

    with (out_dir / "token-cost-report.json").open("w", encoding="utf-8") as handle:
        json.dump(report, handle, indent=2)
        handle.write("\n")

    print(f"Events: {len(events)}")
    print(f"Total cost: ${summary['totals']['estimated_cost_usd']:.4f}")
    print(f"Total tokens: {summary['totals']['total_tokens']}")
    print("Triggered alarms:")
    for alarm in alarms:
        print(f"- {alarm['severity']} {alarm['name']}: {alarm['message']}")
    print(f"Report: {out_dir / 'token-cost-report.json'}")
    return 0


def generate_events(args: argparse.Namespace) -> Iterable[UsageEvent]:
    start = datetime.now(timezone.utc).replace(second=0, microsecond=0)
    teams = [
        ("support-ai", "customer-success", "cc-ml-1200", "tenant-enterprise", "support-rag"),
        ("commerce-ai", "commerce", "cc-ml-2200", "tenant-retail", "product-agent"),
        ("field-ai", "sales", "cc-ml-3100", "tenant-field", "proposal-assistant"),
    ]
    users_by_bu = {
        "customer-success": ["user-1042", "user-1077", "user-1188"],
        "commerce": ["user-2042", "user-2077", "user-2199"],
        "sales": ["user-3042", "user-3077", "user-3199"],
    }

    for minute in range(args.minutes):
        for _ in range(args.requests_per_minute):
            team, business_unit, cost_center, tenant, workload = random.choice(teams)
            user_id = random.choice(users_by_bu[business_unit])
            scenario = "baseline"
            outcome = random.choices(
                ["accepted", "needs-review", "draft-created"],
                weights=[0.70, 0.20, 0.10],
                k=1,
            )[0]
            model = "llama3.2:1b"
            prompt_tokens = max(50, int(random.gauss(650, 110)))
            completion_tokens = max(30, int(random.gauss(180, 45)))

            if args.scenario in ("all", "surge") and 20 <= minute < 35:
                if team == "support-ai":
                    scenario = "token_surge"
                    outcome = "needs-review"
                    prompt_tokens = max(1000, int(random.gauss(5200, 700)))
                    completion_tokens = max(120, int(random.gauss(520, 90)))

            if args.scenario in ("all", "misuse") and 38 <= minute < 50:
                if random.random() < 0.55:
                    scenario = "tenant_misuse"
                    team = "field-ai"
                    business_unit = "sales"
                    cost_center = "cc-ml-3100"
                    tenant = "tenant-field-lab"
                    user_id = "user-rogue-agent"
                    workload = "proposal-assistant"
                    outcome = "draft-created"
                    model = "llama3.2:1b"
                    prompt_tokens = max(2000, int(random.gauss(2900, 500)))
                    completion_tokens = max(800, int(random.gauss(1700, 320)))

            if args.scenario in ("all", "unknown") and minute >= 48:
                if random.random() < 0.18:
                    scenario = "unknown_attribution"
                    team = "unknown"
                    business_unit = "unknown"
                    cost_center = "unknown"
                    tenant = "tenant-unmapped"
                    user_id = "unknown"
                    workload = "unmapped-local-test"
                    outcome = "unknown"
                    prompt_tokens = max(700, int(random.gauss(1800, 350)))
                    completion_tokens = max(300, int(random.gauss(900, 220)))

            total_tokens = prompt_tokens + completion_tokens
            estimated_cost = estimate_cost(
                prompt_tokens,
                completion_tokens,
                args.input_usd_per_1m,
                args.output_usd_per_1m,
            )

            yield UsageEvent(
                timestamp=(start + timedelta(minutes=minute)).isoformat(),
                scenario=scenario,
                ai_team=team,
                ai_business_unit=business_unit,
                ai_cost_center=cost_center,
                ai_tenant_id=tenant,
                ai_user_id=user_id,
                ai_workload_name=workload,
                ai_outcome_category=outcome,
                gen_ai_request_model=model,
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                total_tokens=total_tokens,
                estimated_cost_usd=round(estimated_cost, 8),
            )


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


def summarize(events: list[UsageEvent]) -> dict[str, object]:
    totals = {
        "requests": len(events),
        "prompt_tokens": sum(event.prompt_tokens for event in events),
        "completion_tokens": sum(event.completion_tokens for event in events),
        "total_tokens": sum(event.total_tokens for event in events),
        "estimated_cost_usd": sum(event.estimated_cost_usd for event in events),
    }

    by_team: dict[str, dict[str, float]] = defaultdict(
        lambda: {
            "requests": 0,
            "total_tokens": 0,
            "estimated_cost_usd": 0.0,
        }
    )
    by_business_unit: dict[str, dict[str, float]] = defaultdict(
        lambda: {
            "requests": 0,
            "total_tokens": 0,
            "estimated_cost_usd": 0.0,
        }
    )
    by_user: dict[str, dict[str, float]] = defaultdict(
        lambda: {
            "requests": 0,
            "total_tokens": 0,
            "estimated_cost_usd": 0.0,
        }
    )
    by_outcome: dict[str, dict[str, float]] = defaultdict(
        lambda: {
            "requests": 0,
            "total_tokens": 0,
            "estimated_cost_usd": 0.0,
        }
    )
    by_scenario: dict[str, dict[str, float]] = defaultdict(
        lambda: {
            "requests": 0,
            "total_tokens": 0,
            "estimated_cost_usd": 0.0,
        }
    )

    for event in events:
        for bucket in (
            by_team[event.ai_team],
            by_business_unit[event.ai_business_unit],
            by_user[event.ai_user_id],
            by_outcome[event.ai_outcome_category],
            by_scenario[event.scenario],
        ):
            bucket["requests"] += 1
            bucket["total_tokens"] += event.total_tokens
            bucket["estimated_cost_usd"] += event.estimated_cost_usd

    return {
        "totals": round_costs(totals),
        "by_team": {key: round_costs(value) for key, value in by_team.items()},
        "by_business_unit": {
            key: round_costs(value) for key, value in by_business_unit.items()
        },
        "by_user": {key: round_costs(value) for key, value in by_user.items()},
        "by_outcome": {key: round_costs(value) for key, value in by_outcome.items()},
        "by_scenario": {key: round_costs(value) for key, value in by_scenario.items()},
    }


def evaluate_alarms(events: list[UsageEvent]) -> list[dict[str, object]]:
    baseline = [event for event in events if event.scenario == "baseline"]
    baseline_cost_per_request = safe_avg(event.estimated_cost_usd for event in baseline)
    baseline_input_tokens = safe_avg(event.prompt_tokens for event in baseline)

    alarms: list[dict[str, object]] = []

    surge_events = [event for event in events if event.scenario == "token_surge"]
    surge_cost_per_request = safe_avg(event.estimated_cost_usd for event in surge_events)
    surge_input_tokens = safe_avg(event.prompt_tokens for event in surge_events)
    if surge_events and surge_cost_per_request > baseline_cost_per_request * 4:
        alarms.append(
            alarm(
                "critical",
                "Budget burn spike",
                f"Token surge cost/request is {ratio(surge_cost_per_request, baseline_cost_per_request):.1f}x baseline.",
            )
        )
    if surge_events and surge_input_tokens > baseline_input_tokens * 4:
        alarms.append(
            alarm(
                "warning",
                "Context window explosion",
                f"Average input tokens are {ratio(surge_input_tokens, baseline_input_tokens):.1f}x baseline.",
            )
        )

    misuse_events = [event for event in events if event.scenario == "tenant_misuse"]
    total_cost = sum(event.estimated_cost_usd for event in events)
    misuse_cost = sum(event.estimated_cost_usd for event in misuse_events)
    if misuse_events and misuse_cost > total_cost * 0.25:
        alarms.append(
            alarm(
                "critical",
                "Tenant misuse",
                f"tenant-field-lab consumed {misuse_cost / total_cost:.0%} of simulated cost.",
            )
        )

    user_cost: dict[str, float] = defaultdict(float)
    for event in events:
        user_cost[event.ai_user_id] += event.estimated_cost_usd
    top_user, top_user_cost = max(user_cost.items(), key=lambda item: item[1])
    if top_user_cost > total_cost * 0.20:
        alarms.append(
            alarm(
                "warning",
                "User token misuse",
                f"{top_user} consumed {top_user_cost / total_cost:.0%} of simulated cost.",
            )
        )

    accepted_events = [event for event in events if event.ai_outcome_category == "accepted"]
    accepted_cost = sum(event.estimated_cost_usd for event in accepted_events)
    accepted_count = len(accepted_events)
    if accepted_count:
        cost_per_accepted = accepted_cost / accepted_count
        all_cost_per_request = total_cost / len(events)
        if cost_per_accepted > all_cost_per_request * 2:
            alarms.append(
                alarm(
                    "warning",
                    "Poor value ratio",
                    f"Cost per accepted answer is {cost_per_accepted / all_cost_per_request:.1f}x average request cost.",
                )
            )

    unknown_cost = sum(
        event.estimated_cost_usd
        for event in events
        if event.ai_team == "unknown"
        or event.ai_business_unit == "unknown"
        or event.ai_cost_center == "unknown"
    )
    if unknown_cost > 0:
        alarms.append(
            alarm(
                "warning",
                "Unknown chargeback attribution",
                f"${unknown_cost:.4f} has unknown team or cost center.",
            )
        )

    return alarms


def alarm(severity: str, name: str, message: str) -> dict[str, object]:
    return {
        "severity": severity,
        "name": name,
        "message": message,
        "recommended_action": recommended_action(name),
    }


def recommended_action(name: str) -> str:
    actions = {
        "Budget burn spike": "Throttle the workload, reduce max context, and notify the application owner.",
        "Context window explosion": "Inspect prompt construction and retrieval chunking before the next release.",
        "Tenant misuse": "Apply tenant-level rate limits or require approval for bulk jobs.",
        "User token misuse": "Review the user's workflow and apply user-level quota or approval controls.",
        "Poor value ratio": "Review prompts, model choice, and outcome quality before scaling the workload.",
        "Unknown chargeback attribution": "Block promotion until ai.team and ai.cost_center are populated.",
    }
    return actions.get(name, "Review dashboard and notify the owner.")


def write_jsonl(path: Path, events: list[UsageEvent]) -> None:
    with path.open("w", encoding="utf-8") as handle:
        for event in events:
            handle.write(json.dumps(asdict(event), sort_keys=True))
            handle.write("\n")


def write_csv(path: Path, events: list[UsageEvent]) -> None:
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(asdict(events[0]).keys()))
        writer.writeheader()
        for event in events:
            writer.writerow(asdict(event))


def round_costs(values: dict[str, float]) -> dict[str, float]:
    return {
        key: round(value, 6) if isinstance(value, float) else value
        for key, value in values.items()
    }


def safe_avg(values: Iterable[float]) -> float:
    values = list(values)
    if not values:
        return 0.0
    return sum(values) / len(values)


def ratio(value: float, baseline: float) -> float:
    if baseline <= 0:
        return 0.0
    return value / baseline


if __name__ == "__main__":
    raise SystemExit(main())
