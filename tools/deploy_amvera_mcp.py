# -*- coding: utf-8 -*-
"""Деплой сайта в Amvera через MCP-API (без git-пуша и пароля аккаунта).

Зачем: шаг `git push` в Amvera падал с «Connection reset by peer» с 4 ноября 2026 —
пуш из GitHub-раннера не доходил. MCP-API работает с токеном и умеет коммитить файлы
и запускать сборку.

Переменные окружения:
  AMVERA_MCP_TOKEN — токен MCP (обязателен)
  BEFORE_SHA       — коммит, с которого считать изменения (по умолчанию HEAD^)
  PROJECT          — slug проекта (по умолчанию meysternlp)
  BRANCH           — ветка репозитория проекта (по умолчанию master)
  MCP_URL          — адрес MCP-сервера региона (по умолчанию Moscow-1)
"""
import base64
import http.client
import json
import os
import re
import socket
import subprocess
import sys
import time
import urllib.request

MCP_URL = os.environ.get("MCP_URL", "https://openmcp.msk1.amvera.ru/mcp")
PROJECT = os.environ.get("PROJECT", "meysternlp")
BRANCH = os.environ.get("BRANCH", "master")
TOKEN = os.environ.get("AMVERA_MCP_TOKEN", "").strip()
BEFORE = os.environ.get("BEFORE_SHA", "").strip()
MAX_TEXT = 250 * 1024
MAX_B64 = 4 * 1024 * 1024


class MCPError(RuntimeError):
    pass


class MCP:
    def __init__(self, url, token):
        self.url = url
        self.token = token
        self.session = None
        self._id = 0

    def _post(self, payload):
        self._id += 1
        payload.setdefault("jsonrpc", "2.0")
        payload.setdefault("id", self._id)
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json, text/event-stream",
            "Authorization": "Bearer " + self.token,
        }
        if self.session:
            headers["Mcp-Session-Id"] = self.session
        req = urllib.request.Request(self.url, data=json.dumps(payload).encode("utf-8"),
                                     headers=headers, method="POST")
        with urllib.request.urlopen(req, timeout=120) as r:
            sid = r.headers.get("Mcp-Session-Id")
            if sid:
                self.session = sid
            body = self._read_body(r)
        return self._parse(body)

    @staticmethod
    def _read_body(resp):
        """Читает ответ, не дожидаясь закрытия SSE-потока сервером."""
        buf = bytearray()
        while True:
            try:
                chunk = resp.read1(65536)
            except (http.client.IncompleteRead, socket.timeout):
                break
            if not chunk:
                break
            buf.extend(chunk)
            text = buf.decode("utf-8", "replace")
            if 'data: ' in text and "\n\n" in text:
                break
            if text.lstrip().startswith("{"):
                try:
                    json.loads(text)
                    break
                except ValueError:
                    continue
        try:
            return buf.decode("utf-8", "replace")
        except Exception:  # noqa: BLE001
            return ""

    @staticmethod
    def _parse(body):
        body = body.strip()
        if not body:
            return {}
        if body.startswith("{"):
            return json.loads(body)
        # SSE: берём последнее событие с data
        last = None
        for line in body.splitlines():
            if line.startswith("data:"):
                last = line[5:].strip()
        if last is None:
            raise MCPError("не смог разобрать ответ MCP: " + body[:300])
        return json.loads(last)

    def initialize(self):
        self._post({"method": "initialize", "params": {
            "protocolVersion": "2024-11-05",
            "capabilities": {},
            "clientInfo": {"name": "amvera-deploy", "version": "1.0"},
        }})
        self._post({"method": "notifications/initialized", "params": {}})
        return self

    def call(self, tool, args):
        last = None
        for attempt in range(4):
            try:
                return self._call_once(tool, args)
            except (http.client.HTTPException, OSError, MCPError) as e:
                last = e
                time.sleep(2 + 3 * attempt)
                try:  # пересоздать сессию перед повтором
                    self.session = None
                    self.initialize()
                except Exception:  # noqa: BLE001
                    pass
        raise last

    def _call_once(self, tool, args):
        res = self._post({"method": "tools/call", "params": {"name": tool, "arguments": args}})
        if "error" in res:
            raise MCPError("%s: %s" % (tool, json.dumps(res["error"], ensure_ascii=False)[:300]))
        content = res.get("result", {}).get("content", [])
        text = "\n".join(c.get("text", "") for c in content if isinstance(c, dict))
        if "isError" in res.get("result", {}) and res["result"]["isError"]:
            raise MCPError("%s: %s" % (tool, text[:300]))
        if "validation failed" in text.lower() or text.lower().startswith("failed"):
            raise MCPError("%s: %s" % (tool, text[:300]))
        return text


def git(*args):
    return subprocess.run(["git"] + list(args), capture_output=True, check=True).stdout


def changed_files():
    if BEFORE and set(BEFORE) != {"0"}:
        base = BEFORE
    else:
        base = "HEAD^"
    try:
        out = git("diff", "--name-only", "--diff-filter=ACMR", base, "HEAD").decode("utf-8")
    except subprocess.CalledProcessError:
        out = git("show", "--name-only", "--pretty=format:", "HEAD").decode("utf-8")
    files, skipped = [], []
    for path in [p.strip() for p in out.splitlines() if p.strip()]:
        if not os.path.isfile(path):
            skipped.append(path + " (удалён или нет в рабочем дереве)")
            continue
        size = os.path.getsize(path)
        if size > MAX_B64:
            skipped.append("%s (%d КБ — слишком большой)" % (path, size // 1024))
            continue
        files.append(path)
    return files, skipped


def upload(mcp, path):
    size = os.path.getsize(path)
    raw = open(path, "rb").read()
    parts = path.rsplit("/", 1)
    folder = "/" if len(parts) == 1 else "/" + parts[0]
    name = parts[-1]
    args = {
        "slug": PROJECT, "branch": BRANCH, "path": folder,
        "filePath": "", "filename": name,
        "commitMessage": "deploy: " + path,
    }
    try:
        if size <= MAX_TEXT:
            args["fileText"] = raw.decode("utf-8")
            args["fileBase64"] = ""
            mcp.call("uploadFiles", args)
            return "текст"
        return _upload_b64(mcp, raw, args)
    except (UnicodeDecodeError, MCPError):
        return _upload_b64(mcp, raw, args)


def _upload_b64(mcp, raw, args):
    args = dict(args)
    args["fileText"] = ""
    args["fileBase64"] = base64.b64encode(raw).decode("ascii")
    mcp.call("uploadFiles", args)
    return "base64"


def main():
    if not TOKEN:
        print("AMVERA_MCP_TOKEN не задан — деплой пропущен")
        return 1
    files, skipped = changed_files()
    for s in skipped:
        print("пропуск:", s)
    if not files:
        print("изменений для загрузки нет — только пересборка")
    mcp = MCP(MCP_URL, TOKEN).initialize()
    print("MCP сессия:", mcp.session)
    ok = 0
    for path in files:
        try:
            mode = upload(mcp, path)
            print("загружен: %-52s (%s)" % (path, mode))
            ok += 1
        except MCPError as e:
            print("ОШИБКА при загрузке %s: %s" % (path, str(e)[:200]))
            raise
    print("MCP: пересборка проекта", PROJECT)
    print(mcp.call("rebuildProject", {"slug": PROJECT})[:200])
    print("итог: загружено файлов %d из %d" % (ok, len(files)))
    return 0


if __name__ == "__main__":
    sys.exit(main())
