<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Project instructions (read this first)

The full project guide lives in `CLAUDE.md` in this same directory: data formats, the `basePath` / `.env.local` gotchas, the map asset pipeline, test and build commands, and the branch rules. Read it in full before doing anything and follow it as if it were this file.

When asked to execute an implementation plan from `docs/superpowers/plans/`, follow `docs/superpowers/codex-executor.md`. In short: work only on the named feature branch, one `git commit` per plan task, never `git push`, never merge into `main`, never touch `.env*`, and ignore the `superpowers:*` skill names mentioned at the top of each plan (they are Claude Code skills; just execute the tasks in order).
