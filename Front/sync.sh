#!/usr/bin/env sh
# Equal rule folders: .cursor/ ⇄ .agents/
# Usage:
#   sh sync.sh check    # compare only — never mutates
#   sh sync.sh cursor   # copy files .cursor → .agents (AFTER user choice)
#   sh sync.sh agents   # copy files .agents → .cursor (AFTER user choice)
#
# Policy ([.cursor/SYNC.md] / [.agents/SYNC.md]):
# - check never deletes or overwrites
# - do not run cursor|agents until user selects resolve action
# - copy does NOT delete destination-only paths (no wipe / no --delete)

set -e
ROOT="$(CDPATH= cd -- "$(dirname "$0")" && pwd)"
CURSOR="$ROOT/.cursor"
AGENTS="$ROOT/.agents"

die() { echo "sync.sh: $*" >&2; exit 1; }

[ -d "$CURSOR" ] || die "missing .cursor/"
[ -d "$AGENTS" ] || die "missing .agents/"

# Copy/update files from src → dst. Never remove dst-only files/dirs.
copy_dir() {
  src="$1"
  dst="$2"
  if command -v rsync >/dev/null 2>&1; then
    # no --delete: keep destination-only items
    rsync -a "$src"/ "$dst"/
  else
    # portable: walk files under src and copy into dst
    (CDPATH= cd -- "$src" && find . -type f -print) | while IFS= read -r rel; do
      rel="${rel#./}"
      mkdir -p "$dst/$(dirname "$rel")"
      cp -a "$src/$rel" "$dst/$rel"
    done
  fi
  echo "copied (no delete): $src → $dst"
  echo "note: destination-only paths were kept; run check and resolve leftovers via SYNC.md"
}

check_diff() {
  if command -v diff >/dev/null 2>&1; then
    if diff -rq "$CURSOR" "$AGENTS"; then
      echo "OK: .cursor and .agents are identical"
      exit 0
    else
      echo "DIFF: .cursor and .agents differ (compare only; nothing changed)" >&2
      exit 1
    fi
  else
    die "diff not found"
  fi
}

case "${1:-}" in
  cursor) copy_dir "$CURSOR" "$AGENTS" ;;
  agents) copy_dir "$AGENTS" "$CURSOR" ;;
  check)  check_diff ;;
  *)
    echo "Usage: sh sync.sh {cursor|agents|check}" >&2
    echo "check = compare only; cursor|agents = copy after user choice (no dest wipe)" >&2
    exit 2
    ;;
esac
