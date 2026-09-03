#!/usr/bin/env python3
"""
AgentVPS Telegram Gateway Daemon
Zero-dependency Python daemon bridging Telegram Bot API to the remote agent tmux session.
Uses long-polling so no incoming ports or public URLs are required.
"""
import os
import sys
import json
import time
import subprocess
import urllib.request
import urllib.parse

BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN")
ADMIN_CHAT_ID = os.environ.get("TELEGRAM_ADMIN_CHAT_ID")

if not BOT_TOKEN or not ADMIN_CHAT_ID:
    print("❌ TELEGRAM_BOT_TOKEN or TELEGRAM_ADMIN_CHAT_ID not provided. Exiting bridge.")
    sys.exit(0)

BASE_URL = f"https://api.telegram.org/bot{BOT_TOKEN}/"

def send_message(chat_id, text, parse_mode="Markdown"):
    url = BASE_URL + "sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": parse_mode
    }
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            return json.loads(response.read().decode())
    except Exception as e:
        print(f"Error sending message: {e}", file=sys.stderr)
        return None

def run_cmd(cmd):
    try:
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=15)
        return result.stdout.strip()
    except Exception as e:
        return f"Error: {e}"

def handle_update(update):
    message = update.get("message")
    if not message:
        return

    chat_id = str(message.get("chat", {}).get("id"))
    text = message.get("text", "").strip()

    # Security check: Only allow the configured admin chat ID
    if chat_id != str(ADMIN_CHAT_ID):
        print(f"⚠ Unauthorized access attempt from chat_id: {chat_id}")
        send_message(chat_id, "⛔ *Unauthorized*. You are not the configured administrator of this AgentVPS node.")
        return

    if not text:
        return

    print(f"📩 Command received from admin: {text}")

    if text.startswith("/start") or text.startswith("/help"):
        agent_type = os.environ.get("AGENT_TYPE", "AI Agent")
        msg = (
            f"👋 *AgentVPS Control Gateway*\n\n"
            f"Active Agent: `{agent_type}`\n"
            f"Workspace: `/workspace`\n\n"
            f"*Commands:*\n"
            f"• `/status` - Check server resources and agent health\n"
            f"• `/diff` - View current Git workspace changes\n"
            f"• `/logs` - View recent execution logs\n"
            f"• `/stop` - Send interrupt (Ctrl+C) to agent\n"
            f"• `/run <prompt>` - Send task directly to the agent\n\n"
            f"_Tip: You can also simply type your prompt directly to send it to the agent._"
        )
        send_message(chat_id, msg)

    elif text == "/status":
        mem = run_cmd("free -m | awk 'NR==2{printf \"Memory: %s/%sMB (%.2f%%)\", $3,$2,$3*100/$2 }'")
        uptime = run_cmd("uptime -p")
        tmux_check = run_cmd("tmux has-session -t agent_session 2>&1")
        is_running = "Active 🟢" if not tmux_check else "Offline 🔴"
        status_msg = (
            f"📊 *AgentVPS Node Status*\n\n"
            f"• *Agent Status:* {is_running}\n"
            f"• *System Uptime:* {uptime}\n"
            f"• *Memory Usage:* {mem}\n"
        )
        send_message(chat_id, status_msg)

    elif text == "/diff":
        diff = run_cmd("cd /workspace && git diff --stat && git diff")
        if not diff:
            send_message(chat_id, "ℹ *Git Status:* Clean workspace. No uncommitted changes.")
        else:
            if len(diff) > 3800:
                diff = diff[:3800] + "\n\n... (truncated)"
            send_message(chat_id, f"```diff\n{diff}\n```")

    elif text == "/logs":
        logs = run_cmd("tail -n 25 /workspace/.agent.log 2>/dev/null || echo 'No logs available yet.'")
        if len(logs) > 3800:
            logs = logs[-3800:]
        send_message(chat_id, f"📜 *Recent Logs:*\n```\n{logs}\n```")

    elif text == "/stop":
        run_cmd("tmux send-keys -t agent_session C-c")
        send_message(chat_id, "⏹ Interrupt signal (`Ctrl+C`) sent to agent.")

    else:
        # Prompt to agent
        prompt = text
        if text.startswith("/run "):
            prompt = text[5:].strip()
        # Escape quotes for tmux send-keys
        sanitized = prompt.replace('"', '\\"').replace('$', '\\$')
        run_cmd(f'tmux send-keys -t agent_session "{sanitized}" Enter')
        send_message(chat_id, f"🚀 *Dispatched to agent:* \n`{prompt}`")

def main():
    print(f"🤖 Starting Telegram Bridge for Admin ID: {ADMIN_CHAT_ID}")
    send_message(ADMIN_CHAT_ID, "🚀 *AgentVPS 24/7 Node is Online!* Send `/help` for commands.")
    
    offset = 0
    while True:
        try:
            url = f"{BASE_URL}getUpdates?offset={offset}&timeout=25"
            req = urllib.request.Request(url)
            with urllib.request.urlopen(req, timeout=30) as response:
                result = json.loads(response.read().decode())
                if result.get("ok"):
                    for update in result.get("result", []):
                        offset = update["update_id"] + 1
                        handle_update(update)
        except Exception as e:
            time.sleep(3)

if __name__ == "__main__":
    main()
