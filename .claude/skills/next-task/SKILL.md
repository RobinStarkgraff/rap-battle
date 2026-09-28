---
name: next-task
description: Pick up the next task from plan/tasks.md, carry it out following CLAUDE.md, verify it, and update the plan/ files. Optional argument is a task ID (e.g. T-004); add --commit to commit the result.
argument-hint: "[T-###] [--commit]"
disable-model-invocation: true
---

# Next task

Work on **exactly one** task from `plan/tasks.md`, from start to finish, then leave `plan/`
in a correct state for the next session.

Arguments: `$ARGUMENTS`

## 1. Load context

Read these files before doing anything else:
- `CLAUDE.md`
- `plan/tasks.md`
- `plan/open-questions.md`
- `plan/decisions.md`
- the newest entry in `plan/log.md`
- the roadmap section in `plan/roadmap.md` for the milestone the task belongs to

Then run `git status`. If the working tree has uncommitted changes that aren't about the
current task, tell the user and ask how to proceed before touching anything.

## 2. Select the task

- If the arguments contain a task ID (`T-###`), pick that task.
- Otherwise, if a task in **Now** is marked `[~]`, resume it.
- Otherwise, pick the first `[ ]` task in **Now**.
- If **Now** is empty, move the top task of **Next** into **Now** and tell the user you did so.

Say which task you picked in one line before you start.

## 3. Check it's unblocked

- Find every open question marked **blocking** for this task's milestone, or that this
  task clearly depends on. If any of them is still unanswered, **don't guess**. Ask the
  user with `AskUserQuestion` (at most 4 questions per call, with concrete options and a
  recommended default). Record each answer (step 6) before continuing.
- If the task itself is to answer questions (e.g. T-001), the task is that question
  session: ask, record the answers, and turn each design-relevant answer into a decision.
- If a task that must come first isn't done yet (e.g. tooling doesn't exist), say so
  and suggest doing that one first instead.

## 4. Do the work

- Mark the task `[~]` in `plan/tasks.md`.
- If the task isn't trivial, write a short plan of 3 to 6 bullets for yourself and follow it.
  Ask the user only when a choice is really theirs to make (game design, scope, taste).
  Otherwise pick the sensible option and write it down as a decision.
- Follow the architecture and code quality rules in `CLAUDE.md` exactly, especially keeping
  `core/` pure and deterministic and writing tests alongside every change to `core/`.
- Stay inside the task. If you find other work that needs doing, add it as a new task and
  don't do it now.

## 5. Verify

- Run `make check` if it exists. Before M0 is finished, run whatever checks exist (for
  example `npx tsc --noEmit`, `npx vitest run`), or say that none exist yet.
- For changes you can see or that affect multiplayer, also run `make test-e2e` if it exists.
- If a check fails, fix it. Don't mark a task done while its checks fail. If you can't get
  them green, leave the task `[~]`, say what's failing in the log, and stop.
- Check the task against its milestone's exit criteria in `roadmap.md`.

## 6. Update the plan

- `plan/tasks.md`:
  - move the finished task to **Done** as `[x] T-### … (YYYY-MM-DD)`
  - add follow-up tasks you found, using the next free ID, then increase "Next free ID"
  - top up **Now** from **Next** so it holds about 3 tasks
- `plan/open-questions.md`: move answered questions to "Answered" along with their answers.
- `plan/decisions.md`: add a `D-###` entry for every choice made between real alternatives.
- `plan/roadmap.md`: update the milestone status (`in progress` / `done`) if it changed.
- `CLAUDE.md`: update it if the task changed facts it states (commands, stack, layout).
- `plan/log.md`: add a dated entry at the top with what was done, what's next, and any problems.

## 7. Wrap up

- If the arguments contain `--commit`: commit the task's changes (code and `plan/` updates)
  as one commit with the message `T-###: <task title>` and the attribution lines the session
  requires. Otherwise don't commit. Show the suggested commit message instead.
- End with a short report: the task done, files changed, check results, decisions made,
  and the next task in **Now**.
