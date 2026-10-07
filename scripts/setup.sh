#!/usr/bin/env bash
# One-command setup: checks the tools a reel needs, installs the npm
# dependencies and, with --voice, the local house voice. Safe to re-run; every
# step skips what's already in place.
#
#   bash scripts/setup.sh            check tools, npm install
#   bash scripts/setup.sh --voice    also install the house voice (Apple Silicon, ~3 GB)
#   bash scripts/setup.sh --check    report only, install nothing
#
# Same as `npm run setup` (`npm run setup -- --voice`).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# Keep in step with voices/lock.py, voices/align.py and src/tts.mjs.
MLX_AUDIO="mlx-audio==0.5.8"
QWEN_REPO="mlx-community/Qwen3-TTS-12Hz-1.7B-Base-6bit"
WHISPER_REPO="mlx-community/whisper-small.en-asr-8bit"
ANCHOR="voices/anchors/kokoro-heart.wav"
VENV_PY=".tts/venv/bin/python"
HF_HUB=".tts/hf/hub"

usage() {
  sed -n '2,10p' "$0" | sed 's/^# \{0,1\}//'
}

CHECK=0
VOICE=0
for arg in "$@"; do
  case "$arg" in
    --check) CHECK=1 ;;
    --voice) VOICE=1 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $arg" >&2; usage >&2; exit 2 ;;
  esac
done

if [ -t 1 ]; then
  GREEN=$'\033[32m' YELLOW=$'\033[33m' RED=$'\033[31m' DIM=$'\033[2m' RESET=$'\033[0m'
else
  GREEN='' YELLOW='' RED='' DIM='' RESET=''
fi

MISSING=0
ok()   { printf '%s✓%s %s\n' "$GREEN" "$RESET" "$1"; }
# skip/fail <status> [hint]: the hint goes on its own indented line.
skip() {
  printf '%s–%s %s\n' "$YELLOW" "$RESET" "$1"
  if [ -n "${2:-}" ]; then printf '  %s%s%s\n' "$DIM" "$2" "$RESET"; fi
}
fail() {
  MISSING=$((MISSING + 1))
  printf '%s✗%s %s\n' "$RED" "$RESET" "$1"
  if [ -n "${2:-}" ]; then printf '  %s%s%s\n' "$DIM" "$2" "$RESET"; fi
}
has() { command -v "$1" >/dev/null 2>&1; }

OS="$(uname -s)"
# hint <macOS> <Ubuntu>: the install line for this machine.
hint() {
  case "$OS" in
    Darwin) echo "Install: $1" ;;
    Linux) echo "Install: $2" ;;
    *) echo "Install: $1 (macOS) or $2 (Ubuntu)" ;;
  esac
}

# Under Rosetta `uname -m` says x86_64, so ask the hardware.
apple_silicon() {
  [ "$OS" = Darwin ] && [ "$(/usr/sbin/sysctl -n hw.optional.arm64 2>/dev/null || echo 0)" = 1 ]
}

# ------------------------------------------------------------------ required

NODE_OK=0
if has node; then
  NODE_V="$(node -p 'process.versions.node')"
  if [ "${NODE_V%%.*}" -ge 20 ]; then
    NODE_OK=1
    ok "Node $NODE_V"
    if [ "${NODE_V%%.*}" -lt 22 ]; then
      skip "Node 22 or later recommended: page captures in headless Chrome need its built-in WebSocket."
    fi
  else
    fail "Node $NODE_V is too old. reelkit needs Node 20 or later." \
      "$(hint 'brew install node' 'Node 20+ from https://nodejs.org (apt'\''s nodejs is usually older)')"
  fi
else
  fail "Node not found. reelkit needs Node 20 or later." \
    "$(hint 'brew install node' 'Node 20+ from https://nodejs.org (apt'\''s nodejs is usually older)')"
fi

if has ffmpeg && has ffprobe; then
  ok "ffmpeg $(ffmpeg -version 2>/dev/null | awk 'NR == 1 { print $3 }') and ffprobe"
elif has ffmpeg; then
  fail "ffprobe not found. It ships with ffmpeg, so reinstall ffmpeg." "$(hint 'brew reinstall ffmpeg' 'sudo apt install --reinstall ffmpeg')"
else
  fail "ffmpeg not found. It renders every reel and reads source video." "$(hint 'brew install ffmpeg' 'sudo apt install ffmpeg')"
fi

# ------------------------------------------------------------------ optional

# src/media.mjs prefers Homebrew's yt-dlp, then whatever is on PATH.
YTDLP=""
if [ -x /opt/homebrew/bin/yt-dlp ]; then YTDLP=/opt/homebrew/bin/yt-dlp; elif has yt-dlp; then YTDLP="$(command -v yt-dlp)"; fi
if [ -n "$YTDLP" ]; then
  ok "yt-dlp $("$YTDLP" --version 2>/dev/null || echo '')"
else
  skip "yt-dlp not found (optional). Without it, reels can't use source videos from YouTube, Vimeo or X." \
    "$(hint 'brew install yt-dlp' 'sudo apt install pipx && pipx install yt-dlp (apt'\''s yt-dlp lags behind YouTube)')"
fi

# src/media.mjs uses CHROME_PATH, else the macOS Google Chrome app.
MAC_CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
CHROME_HINT="$(hint 'brew install --cask google-chrome' 'the .deb from https://www.google.com/chrome, then export CHROME_PATH=/usr/bin/google-chrome')"
if [ -n "${CHROME_PATH:-}" ] && [ -x "$CHROME_PATH" ]; then
  ok "Chrome ($CHROME_PATH)"
elif [ -n "${CHROME_PATH:-}" ]; then
  skip "CHROME_PATH is set to $CHROME_PATH, but nothing runnable is there." "$CHROME_HINT"
elif [ -x "$MAC_CHROME" ]; then
  ok "Google Chrome"
else
  FOUND=""
  for c in google-chrome google-chrome-stable chromium chromium-browser; do
    if has "$c"; then FOUND="$(command -v "$c")"; break; fi
  done
  if [ -n "$FOUND" ]; then
    skip "Found $FOUND, but reelkit only uses Chrome through CHROME_PATH." "Run: export CHROME_PATH=$FOUND"
  else
    skip "Chrome not found (optional). Without it, pages that render client-side can't be captured." "$CHROME_HINT"
  fi
fi

CLAUDE_BIN="${CLAUDE_CLI:-claude}"
if has "$CLAUDE_BIN"; then
  ok "Claude Code $("$CLAUDE_BIN" --version 2>/dev/null | awk 'NR == 1 { print $1 }')"
else
  skip "claude CLI not found. It writes and fact-checks every new reel; existing episodes re-render without it." \
    "Install: npm install -g @anthropic-ai/claude-code, then run claude once to sign in"
fi

# ------------------------------------------------------------------ voice

eleven_key() {
  [ -n "${ELEVENLABS_API_KEY:-}" ] || { [ -f .env ] && grep -Eq '^[[:space:]]*ELEVENLABS_API_KEY[[:space:]]*=[[:space:]]*["'\'']?[^"'\''[:space:]]' .env; }
}
# Without the house voice, src/tts.mjs narrates with ElevenLabs when a key is
# set, else Kokoro.
FALLBACK_VOICE="Kokoro" FALLBACK_HINT="Add ELEVENLABS_API_KEY to .env to narrate with ElevenLabs instead."
if eleven_key; then FALLBACK_VOICE="ElevenLabs (key found)" FALLBACK_HINT=""; fi

# What the house voice needs, as src/tts.mjs (qwenAvailable) and alignWords see it.
voice_gaps() {
  local gaps=()
  [ -x "$VENV_PY" ] || gaps+=("Python venv")
  compgen -G ".tts/venv/lib/python3.12/site-packages/mlx_audio-*.dist-info" >/dev/null || gaps+=("mlx-audio")
  compgen -G "$HF_HUB/models--${QWEN_REPO//\//--}/snapshots/*/config.json" >/dev/null || gaps+=("Qwen3-TTS weights")
  compgen -G "$HF_HUB/models--${WHISPER_REPO//\//--}/snapshots/*/config.json" >/dev/null || gaps+=("Whisper weights")
  [ -f "$ANCHOR" ] || gaps+=("$ANCHOR")
  if [ ${#gaps[@]} -gt 0 ]; then
    local IFS=','
    echo "${gaps[*]}" | sed 's/,/, /g'
  fi
}

voice_status() {
  if ! apple_silicon; then
    skip "House voice: Apple Silicon only. Reels here use $FALLBACK_VOICE." "$FALLBACK_HINT"
    return 0
  fi
  if has uv; then
    ok "uv $(uv --version 2>/dev/null | awk '{ print $2 }')"
  else
    skip "uv not found (only needed for --voice)." "$(hint 'brew install uv' 'curl -LsSf https://astral.sh/uv/install.sh | sh')"
  fi
  local gaps
  gaps="$(voice_gaps)"
  if [ -z "$gaps" ]; then
    ok "House voice ready: Kokoro Heart × Qwen3-TTS, with Whisper word alignment"
  else
    skip "House voice not installed (missing: $gaps). Reels use $FALLBACK_VOICE instead." \
      "Run: npm run setup -- --voice (about 3 GB)"
  fi
}

# Python 3.12 + mlx-audio in .tts/venv, model weights in .tts/hf. Each step
# is a no-op when it's already done.
voice_install() {
  if ! apple_silicon; then
    skip "House voice skipped: it runs on Apple Silicon only (MLX). Reels here use $FALLBACK_VOICE." "$FALLBACK_HINT"
    return 0
  fi
  if ! has uv; then
    fail "uv not found. It installs the house voice's Python." "$(hint 'brew install uv' 'curl -LsSf https://astral.sh/uv/install.sh | sh')"
    return 0
  fi
  mkdir -p .tts
  export UV_PYTHON_INSTALL_DIR="$ROOT/.tts/python"
  # Trust the system certificate store, so corporate proxies with their own
  # root CA work (the Python side uses truststore for the same reason). Older
  # uv versions call this UV_NATIVE_TLS.
  export UV_SYSTEM_CERTS="${UV_SYSTEM_CERTS:-1}"

  uv python install --quiet 3.12
  ok "Python 3.12 (.tts/python)"

  if [ -x "$VENV_PY" ] && "$VENV_PY" -c 'import sys; sys.exit(sys.version_info[:2] != (3, 12))' 2>/dev/null; then
    ok "Python venv (.tts/venv)"
  else
    UV_VENV_CLEAR=1 uv venv --quiet --python 3.12 .tts/venv
    ok "Python venv created (.tts/venv)"
  fi

  uv pip install --quiet --python "$VENV_PY" "$MLX_AUDIO" truststore
  ok "$MLX_AUDIO and truststore"

  # Pre-download the weights: voices/align.py runs offline, and the first
  # reel shouldn't stall on a 2.5 GB download.
  local status repo msg finished=0
  while IFS='|' read -r status repo msg; do
    case "$status" in
      ok) ok "$repo" ;;
      cached) skip "$repo: using the cached copy ($msg)" ;;
      fail) fail "$repo didn't download: $msg" "Check your network or proxy, then re-run: npm run setup -- --voice" ;;
      finished) finished=1 ;;
    esac
  done < <(HF_HOME="$ROOT/.tts/hf" HF_HUB_DISABLE_TELEMETRY=1 "$VENV_PY" - "$QWEN_REPO" "$WHISPER_REPO" <<'PY'
import sys

try:
    # Trust the macOS keychain (corporate proxies with their own root CA), as voices/lock.py does.
    import truststore
    truststore.inject_into_ssl()
except ImportError:
    pass
from huggingface_hub import snapshot_download

try:
    # Only the files mlx-audio loads, so the offline fallback checks what
    # voices/lock.py and voices/align.py actually need.
    from mlx_audio.utils import DEFAULT_ALLOW_PATTERNS as PATTERNS
except ImportError:
    PATTERNS = None

for repo in sys.argv[1:]:
    try:
        snapshot_download(repo, allow_patterns=PATTERNS)
        print(f"ok|{repo}|", flush=True)
    except Exception as err:
        reason = (str(err).splitlines() or [type(err).__name__])[0][:160]
        try:
            snapshot_download(repo, allow_patterns=PATTERNS, local_files_only=True)
            print(f"cached|{repo}|{reason}", flush=True)
        except Exception:
            print(f"fail|{repo}|{reason}", flush=True)
print("finished||", flush=True)
PY
)
  if [ "$finished" = 0 ]; then
    fail "The model download stopped early. See the error above."
  fi

  if [ ! -f "$ANCHOR" ]; then
    fail "$ANCHOR is missing. The house voice is cloned from it; restore it from git."
  fi
}

# ------------------------------------------------------------------ install

if [ "$VOICE" = 1 ] && [ "$CHECK" = 0 ]; then
  voice_install
else
  voice_status
fi

if [ "$CHECK" = 1 ] && [ "$NODE_OK" = 0 ]; then
  skip "npm dependencies not checked until Node 20 or later is installed."
elif [ "$CHECK" = 1 ]; then
  if node -e '
    const deps = Object.keys(require("./package.json").dependencies || {});
    process.exit(deps.every(d => require("fs").existsSync(`node_modules/${d}/package.json`)) ? 0 : 1);
  ' 2>/dev/null; then
    ok "npm dependencies installed"
  else
    fail "npm dependencies not installed." "Run: npm run setup"
  fi
elif [ "$NODE_OK" = 1 ]; then
  # Kokoro runs on CPU; skip onnxruntime's CUDA download on Linux.
  ONNXRUNTIME_NODE_INSTALL_CUDA=skip npm install --no-audit --no-fund --loglevel=error
  ok "npm dependencies installed"
else
  skip "npm install skipped until Node 20 or later is installed."
fi

echo
if [ "$MISSING" -gt 0 ]; then
  printf '%s✗%s %s required item(s) missing. Fix the lines marked ✗, then run this again.\n' "$RED" "$RESET" "$MISSING"
  exit 1
fi
if [ "$CHECK" = 1 ]; then
  echo "Everything required is installed. npm run doctor shows which voice a reel would use."
else
  echo "You're set. Make a reel: npm run reel -- --url https://…"
fi
