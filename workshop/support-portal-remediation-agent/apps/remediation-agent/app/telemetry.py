import json
import logging
import os
from pathlib import Path

from opentelemetry import trace
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor
from splunk_otel import init_splunk_otel

deployment_environment = os.getenv("DEPLOYMENT_ENVIRONMENT", "demo")
service_namespace = os.getenv("OTEL_SERVICE_NAMESPACE", "ibobs2002")
service_name = os.getenv("OTEL_SERVICE_NAME", "remediation-agent")
app_version = os.getenv("OTEL_SERVICE_VERSION", os.getenv("APP_VERSION", "0.1.0"))

_STANDARD_LOG_FIELDS = {
    "args",
    "asctime",
    "created",
    "exc_info",
    "exc_text",
    "filename",
    "funcName",
    "levelname",
    "levelno",
    "lineno",
    "module",
    "msecs",
    "message",
    "msg",
    "name",
    "pathname",
    "process",
    "processName",
    "relativeCreated",
    "stack_info",
    "thread",
    "threadName",
    "taskName",
}


def log_directory() -> Path:
    return Path(os.getenv("IBOBS_LOG_DIR", Path(__file__).resolve().parents[3] / "var" / "log"))


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "timestamp": self.formatTime(record, "%Y-%m-%dT%H:%M:%S%z"),
            "severity_text": record.levelname,
            "message": record.getMessage(),
            "logger.name": record.name,
            "service.name": service_name,
            "service.namespace": service_namespace,
            "service.version": app_version,
            "app.version": app_version,
            "deployment.environment": deployment_environment,
        }

        trace_id = getattr(record, "otelTraceID", None)
        span_id = getattr(record, "otelSpanID", None)
        trace_sampled = getattr(record, "otelTraceSampled", None)
        if trace_id:
            payload["trace_id"] = trace_id
        if span_id:
            payload["span_id"] = span_id
        if trace_sampled is not None:
            payload["trace_sampled"] = trace_sampled

        for key, value in record.__dict__.items():
            if key in _STANDARD_LOG_FIELDS or key.startswith("_") or key.startswith("otel"):
                continue
            payload[key] = value

        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)

        return json.dumps(payload, default=str)


def configure_agent_logger() -> logging.Logger:
    directory = log_directory()
    directory.mkdir(parents=True, exist_ok=True)

    formatter = JsonFormatter()
    logger = logging.getLogger(service_name)
    logger.setLevel(os.getenv("LOG_LEVEL", "INFO").upper())
    logger.handlers.clear()

    stream_handler = logging.StreamHandler()
    stream_handler.setFormatter(formatter)
    file_handler = logging.FileHandler(directory / f"{service_name}.log")
    file_handler.setFormatter(formatter)

    logger.addHandler(stream_handler)
    logger.addHandler(file_handler)
    logger.propagate = False
    return logger


agent_logger = configure_agent_logger()


def telemetry_enabled() -> bool:
    return bool(
        os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT")
        or (os.getenv("SPLUNK_ACCESS_TOKEN") and os.getenv("SPLUNK_REALM"))
    )


def init_agent_telemetry(app) -> bool:
    if not telemetry_enabled():
        return False

    os.environ.setdefault("OTEL_SERVICE_NAME", service_name)
    os.environ["OTEL_RESOURCE_ATTRIBUTES"] = merge_resource_attributes(
        os.getenv("OTEL_RESOURCE_ATTRIBUTES"),
        build_resource_attributes(),
    )
    otlp_endpoint = os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT")
    os.environ.setdefault(
        "OTEL_EXPORTER_OTLP_ENDPOINT",
        otlp_endpoint or f"https://ingest.{os.getenv('SPLUNK_REALM')}.signalfx.com",
    )
    os.environ.setdefault("OTEL_EXPORTER_OTLP_PROTOCOL", "http/protobuf")
    if (not otlp_endpoint or "signalfx.com" in otlp_endpoint) and os.getenv("SPLUNK_ACCESS_TOKEN"):
        os.environ.setdefault("OTEL_EXPORTER_OTLP_HEADERS", f"x-sf-token={os.getenv('SPLUNK_ACCESS_TOKEN')}")
    os.environ.setdefault("OTEL_PROPAGATORS", "tracecontext,baggage,b3")

    init_splunk_otel()
    FastAPIInstrumentor.instrument_app(app)
    HTTPXClientInstrumentor().instrument()
    agent_logger.info("agent telemetry initialized", extra={"telemetry_enabled": True})
    return True


def build_resource_attributes() -> str:
    return ",".join(
        [
            f"service.namespace={service_namespace}",
            f"deployment.environment={deployment_environment}",
            f"service.version={app_version}",
            f"app.version={app_version}",
        ]
    )


def merge_resource_attributes(existing: str | None, required: str) -> str:
    attributes: dict[str, str] = {}
    order: list[str] = []

    for group in (existing, required):
        if not group:
            continue
        for item in group.split(","):
            key, separator, value = item.partition("=")
            key = key.strip()
            if not key or not separator:
                continue
            if key not in attributes:
                order.append(key)
            attributes[key] = value.strip()

    return ",".join(f"{key}={attributes[key]}" for key in order)


def annotate_current_span(attributes: dict[str, str]) -> None:
    span = trace.get_current_span()
    if not span:
        return

    for key, value in attributes.items():
        span.set_attribute(key, value)
