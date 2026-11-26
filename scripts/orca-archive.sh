#!/usr/bin/env bash
# Orca deletion (archive) script: clears a branch's demo recordings once its
# PR is merged or closed. See docs/agents/orca-bot.md, "Demo recording".
#
#   bash scripts/orca-archive.sh [--dry-run] [branch]
#
# Without a branch it uses the workspace's current branch. It deletes
# ~/word-duel-demos/<branch>/ and the <branch>/ folder on the `demos` branch
# (or the whole `demos` branch when nothing else is left on it). It works in a
# temporary clone, never in the workspace, and always exits 0: a failing
# deletion script would stop Orca from deleting the workspace.

set -u

# Never let git stop to ask for a login: a hung prompt would block Orca's
# workspace deletion.
export GIT_TERMINAL_PROMPT=0
export GCM_INTERACTIVE=never

REPO="matthewalton/word-duel"
DEMOS_BRANCH="demos"
LOCAL_ROOT="$HOME/word-duel-demos"

dry_run=0
branch=""
tmp_dir=""

say() { printf 'orca-archive: %s\n' "$*"; }
warn() { printf 'orca-archive: warning: %s\n' "$*" >&2; }

# In a dry run, say what would happen; otherwise say it and do it.
act() {
  local what="$1"
  shift
  if [ "$dry_run" -eq 1 ]; then
    say "would $what"
  else
    say "$what"
    "$@"
  fi
}

cleanup() {
  if [ -n "$tmp_dir" ] && [ -d "$tmp_dir" ]; then
    rm -rf "$tmp_dir"
  fi
}

resolve_branch() {
  if [ -n "$branch" ]; then
    return 0
  fi
  # Orca runs the script inside the workspace; ORCA_WORKTREE_PATH is a fallback.
  branch=$(git -C "${ORCA_WORKTREE_PATH:-.}" rev-parse --abbrev-ref HEAD 2>/dev/null) || {
    warn "not inside a git checkout, so there is no branch to clear"
    return 1
  }
}

# Prints OPEN, DONE (merged or closed) or NONE. Fails if gh fails.
pr_state() {
  local states
  states=$(gh pr list --repo "$REPO" --head "$branch" --state all \
    --json state --jq '.[].state' 2>/dev/null) || return 1
  if [ -z "$states" ]; then
    echo NONE
  elif printf '%s\n' "$states" | grep -qx OPEN; then
    echo OPEN
  else
    echo DONE
  fi
}

clear_local() {
  local dir="$LOCAL_ROOT/$branch"
  if [ ! -d "$dir" ]; then
    say "nothing to remove in $dir"
    return 0
  fi
  act "remove $dir" rm -rf "$dir"
  # Remove folders left empty, up to and including ~/word-duel-demos.
  local parent
  parent=$(dirname "$dir")
  while [ "$dry_run" -eq 0 ] && [ "${parent#"$LOCAL_ROOT"}" != "$parent" ]; do
    rmdir "$parent" 2>/dev/null || break
    say "removed empty folder $parent"
    [ "$parent" = "$LOCAL_ROOT" ] && break
    parent=$(dirname "$parent")
  done
}

clear_remote() {
  local url clone remaining
  url="https://github.com/$REPO.git"

  # --exit-code exits 2 when the ref is missing; anything else is a failure.
  local status=0
  git ls-remote --exit-code --heads "$url" "$DEMOS_BRANCH" >/dev/null 2>&1 || status=$?
  if [ "$status" -eq 2 ]; then
    say "no $DEMOS_BRANCH branch on GitHub, nothing to remove there"
    return 0
  elif [ "$status" -ne 0 ]; then
    warn "could not reach GitHub, leaving the demos alone"
    return 0
  fi

  tmp_dir=$(mktemp -d) || { warn "could not make a temporary folder"; return 1; }
  clone="$tmp_dir/demos"
  if ! git clone --quiet --depth 1 --single-branch --branch "$DEMOS_BRANCH" "$url" "$clone" 2>/dev/null; then
    warn "could not clone the $DEMOS_BRANCH branch"
    return 1
  fi

  if [ -z "$(git -C "$clone" ls-files -- "$branch/")" ]; then
    say "nothing to remove in $branch/ on $DEMOS_BRANCH"
    return 0
  fi

  git -C "$clone" rm -r --quiet -- "$branch/" || { warn "git rm failed"; return 1; }
  remaining=$(git -C "$clone" ls-files | grep -vx README.md)

  if [ -z "$remaining" ]; then
    say "$branch/ is the last folder on $DEMOS_BRANCH"
    act "delete the $DEMOS_BRANCH branch on GitHub" \
      git -C "$clone" push --quiet origin --delete "$DEMOS_BRANCH"
  else
    act "commit the removal of $branch/ from $DEMOS_BRANCH" \
      git -C "$clone" commit --quiet -m "Remove demos for $branch" &&
    act "push $DEMOS_BRANCH to GitHub" \
      git -C "$clone" push --quiet origin "HEAD:$DEMOS_BRANCH"
  fi
}

main() {
  while [ $# -gt 0 ]; do
    case "$1" in
      --dry-run) dry_run=1 ;;
      -*) warn "unknown option $1, ignored" ;;
      *) branch="$1" ;;
    esac
    shift
  done

  [ "$dry_run" -eq 1 ] && say "dry run: nothing will change"

  resolve_branch || return 0

  case "$branch" in
    HEAD) say "detached HEAD, nothing to do"; return 0 ;;
    main) say "on main, nothing to do"; return 0 ;;
    "" | /* | *..* ) warn "refusing odd branch name '$branch'"; return 0 ;;
  esac

  local state
  if ! state=$(pr_state); then
    warn "could not look up the PR for $branch with gh, leaving its demos alone"
    return 0
  fi
  case "$state" in
    NONE) say "no PR for $branch, leaving its demos alone"; return 0 ;;
    OPEN) say "the PR for $branch is still open, leaving its demos alone"; return 0 ;;
  esac

  say "the PR for $branch is merged or closed, clearing its demos"
  clear_local || warn "could not clear the local demos"
  clear_remote || warn "could not clear the demos on GitHub"
}

trap cleanup EXIT
main "$@"
exit 0
