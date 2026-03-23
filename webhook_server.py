#!/usr/bin/env python3
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
import json
from datetime import datetime
import os
import secrets

ROOT = Path('/home/barrysu/.openclaw/workspace/stock-dashboard/data/trades')
ROOT.mkdir(parents=True, exist_ok=True)
SECRET_FILE = Path('/home/barrysu/.openclaw/workspace/stock-dashboard/data/trade_webhook_secret.txt')
if not SECRET_FILE.exists():
    SECRET_FILE.write_text(secrets.token_urlsafe(24))
WEBHOOK_SECRET = os.environ.get('TRADE_WEBHOOK_SECRET') or SECRET_FILE.read_text().strip()

class Handler(BaseHTTPRequestHandler):
    def _send(self, code=200, payload=None):
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
        if payload is not None:
            self.wfile.write(json.dumps(payload, ensure_ascii=False).encode('utf-8'))

    def do_OPTIONS(self):
        self._send(200, {"ok": True})

    def do_POST(self):
        if self.path.rstrip('/') != '/trade':
            self._send(404, {"ok": False, "error": "not_found"})
            return
        provided = self.headers.get('X-Trade-Secret', '')
        if not WEBHOOK_SECRET or provided != WEBHOOK_SECRET:
            self._send(403, {"ok": False, "error": "forbidden"})
            return
        length = int(self.headers.get('Content-Length', '0'))
        raw = self.rfile.read(length)
        try:
            payload = json.loads(raw.decode('utf-8'))
        except Exception:
            self._send(400, {"ok": False, "error": "invalid_json"})
            return

        date = payload.get('date') or datetime.now().strftime('%Y-%m-%d')
        path = ROOT / f'{date}.json'
        items = []
        if path.exists():
            try:
                items = json.loads(path.read_text())
            except Exception:
                items = []
        payload['savedAt'] = datetime.utcnow().isoformat() + 'Z'
        items.insert(0, payload)
        path.write_text(json.dumps(items, ensure_ascii=False, indent=2))
        self._send(200, {"ok": True, "saved": str(path), "count": len(items)})

if __name__ == '__main__':
    server = HTTPServer(('0.0.0.0', 8787), Handler)
    print('webhook server listening on :8787')
    server.serve_forever()
