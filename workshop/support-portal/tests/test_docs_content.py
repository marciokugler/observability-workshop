from pathlib import Path
import unittest


REPO_ROOT = Path(__file__).resolve().parents[1]


class DocsContentTest(unittest.TestCase):
    def test_splunk_validation_page_is_actionable(self) -> None:
        page = REPO_ROOT / "docs" / "workshop" / "splunk-validation.md"
        self.assertTrue(page.exists())

        content = page.read_text(encoding="utf-8")
        for required_text in [
            "service.instance.id",
            "deployment.environment",
            "support-portal",
            "support-knowledge",
            "/var/cache/support-knowledge",
            "system.filesystem.utilization",
            "service.request.duration.ns",
            "Gather MCP Evidence",
            "clean_support_knowledge_cache",
            "remediation.evaluate",
            "docker compose run --rm traffic-simulator",
            "docker compose run --rm rum-simulator",
        ]:
            with self.subTest(required_text=required_text):
                self.assertIn(required_text, content)


if __name__ == "__main__":
    unittest.main()
