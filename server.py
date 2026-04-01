"""EasyBudget server — JSON API for source data + user plan persistence."""

from __future__ import annotations

import http.server
import json
import os
import uuid

from parser import parse_all

PORT = 8600
BASE = os.path.dirname(os.path.abspath(__file__))
PLAN_FILE = os.path.join(BASE, "data", "plan.json")
TRACKING_FILE = os.path.join(BASE, "data", "tracking.json")


def load_plan() -> list[dict]:
    if os.path.exists(PLAN_FILE):
        with open(PLAN_FILE, encoding="utf-8") as f:
            return json.load(f)
    return []


def save_plan(items: list[dict]) -> None:
    with open(PLAN_FILE, "w", encoding="utf-8") as f:
        json.dump(items, f, ensure_ascii=False, indent=2)


def load_tracking() -> dict:
    if os.path.exists(TRACKING_FILE):
        with open(TRACKING_FILE, encoding="utf-8") as f:
            return json.load(f)
    return {"incomeEstimate": 0, "monthlyIncome": {}, "monthlyActuals": {}}


def save_tracking(data: dict) -> None:
    with open(TRACKING_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


class Handler(http.server.SimpleHTTPRequestHandler):

    _source_cache: dict | None = None

    def do_GET(self):
        if self.path == "/api/sources":
            if Handler._source_cache is None:
                Handler._source_cache = parse_all()
            self._json(Handler._source_cache)
        elif self.path == "/api/plan":
            self._json(load_plan())
        elif self.path == "/api/tracking":
            self._json(load_tracking())
        else:
            self.send_error(404)

    def do_POST(self):
        body = self._read_body()
        if self.path == "/api/plan":
            save_plan(body.get("items", []))
            self._json({"ok": True})
        elif self.path == "/api/plan/add":
            plan = load_plan()
            item = body
            item["id"] = str(uuid.uuid4())[:8]
            plan.append(item)
            save_plan(plan)
            self._json({"ok": True, "id": item["id"], "items": plan})
        elif self.path == "/api/plan/remove":
            plan = load_plan()
            item_id = body.get("id")
            new_plan = [p for p in plan if p.get("id") != item_id]
            save_plan(new_plan)
            self._json({"ok": True, "items": new_plan})
        elif self.path == "/api/plan/update":
            plan = load_plan()
            item_id = body.get("id")
            updates = body.get("updates", {})
            new_plan = []
            for p in plan:
                if p.get("id") == item_id:
                    new_plan.append({**p, **updates})
                else:
                    new_plan.append(p)
            save_plan(new_plan)
            self._json({"ok": True, "items": new_plan})
        elif self.path == "/api/tracking":
            save_tracking(body)
            self._json({"ok": True})
        elif self.path == "/api/sources/refresh":
            Handler._source_cache = parse_all()
            self._json(Handler._source_cache)
        else:
            self.send_error(404)

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors_headers()
        self.end_headers()

    def _read_body(self) -> dict:
        length = int(self.headers.get("Content-Length", 0))
        raw = self.rfile.read(length)
        return json.loads(raw) if raw else {}

    def _json(self, data, code=200):
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self._cors_headers()
        self.end_headers()
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode("utf-8"))

    def _cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def log_message(self, fmt, *args):
        msg = args[0] if args else ""
        if "/api/" in msg or "POST" in msg:
            super().log_message(fmt, *args)


if __name__ == "__main__":
    os.chdir(BASE)
    print(f"EasyBudget API: http://localhost:{PORT}")
    http.server.HTTPServer(("", PORT), Handler).serve_forever()
