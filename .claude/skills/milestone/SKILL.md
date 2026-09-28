---
name: milestone
description: Work through all open tasks of one roadmap milestone (e.g. M0) in a single run. Each task is done, verified and recorded in plan/ the same way as /next-task. Optional argument is a milestone ID; add --commit to commit each task separately.
argument-hint: "[M#] [--commit]"
disable-model-invocation: true
---

# Milestone

Work through **every open task of one milestone** from `plan/roadmap.md`, one task at a
time, until the milestone is done or the run hits something it can't get past. Leave
`plan/` in a correct state after each task, so the run can stop at any point and be
picked up again.

Arguments: `$ARGUMENTS`

Each single task is handled exactly as in `.claude/skills/next-task/SKILL.md`. Read that
file now. This skill only adds the parts that come from doing several tasks in a row:
choosing and ordering them, asking questions up front, and deciding when to stop.

## 1. Load context

Do step 1 of `next-task` once for the whole run (CLAUDE.md, the `plan/` files, `git status`).
Read the milestone's full section in `roadmap.md`, including its exit criteria.

## 2. Select the milestone and its tasks

- If the arguments contain a milestone ID (`M#`), use it. Otherwise use the first milestone
  whose status is `in progress`; if none is, use the first that is `not started`.
- If the milestone is marked `done`, say so and stop.
- Collect every task tagged `(M#)` from **Now**, **Next** and **Later** that is `[ ]` or `[~]`.
  Skip `[x]` and `[-]` tasks.
- Include tasks whose text says "Optional" like any other task. A milestone run does them all.
- Order them:
  1. `[~]` tasks first (resume them).
  2. Then respect dependencies: a task that says it needs another task ("Needs T-004",
     "after T-010") comes after it. Also put tooling before anything that uses it.
  3. Otherwise keep the order they have in `tasks.md` (Now, then Next, then Later).
- Sort out tasks this run **can't do on its own**, before starting: ones that need the
  user to act outside the repo (host setup, firewall allowlists, accounts, container
  rebuilds), or that depend on work in a different milestone that isn't done. Don't
  attempt these; they go in the report. Tasks that depend on them are skipped as well.

## 3. Unblock everything up front

The point of a milestone run is that it can then work without interruption, so collect
questions now rather than in the middle:

- Do step 3 of `next-task` for **all** selected tasks at once: find every unanswered
  **blocking** question for this milestone or these tasks, and ask them together with
  `AskUserQuestion` (up to 4 per call, several calls if needed). Record each answer as in
  step 6 of `next-task` before starting any task.
- If some tasks can't be done (step 2), mention them in the
  same round of questions only if the user's answer would change the plan.
- Then print the plan: the ordered task list, and the tasks that are skipped with the
  reason for each. Start straight away; don't wait for confirmation.

During the run, ask the user again only if a new question comes up that is really theirs
to decide (game design, scope, taste) and no sensible default exists. If there is a sensible
default, take it and record it as a decision.

## 4. Work through the tasks

For each task in order:

1. Say which task you are starting in one line (`T-### (2/5): <title>`).
2. Do steps 4, 5 and 6 of `next-task` for it: mark `[~]`, do the work, verify with
   `make check` (or whatever checks exist yet), update `plan/` files and `log.md`.
   Write one `log.md` entry per task, as `next-task` does.
3. If the arguments contain `--commit`, commit this task now, as step 7 of `next-task`
   describes (one commit per task, message `T-###: <task title>`). The next task starts
   from a clean tree. Without `--commit`, don't commit; note the suggested commit message
   for the final report.
4. If the task produced follow-up tasks, add them to `tasks.md` as `next-task` says. A
   follow-up that belongs to this milestone **and** is needed for its exit criteria is
   appended to the end of this run's task list. Other follow-ups are only recorded.

Keep tasks separate: don't start the next one before the current one is verified and
recorded, and don't mix changes from two tasks in one commit. Work on the tasks yourself,
one after another. Don't hand them to parallel subagents, because they share the working
tree and later tasks build on earlier ones.

## 5. When to stop

Stop the run early, and go to step 6, if:

- a task's checks fail and you can't make them pass. Leave it `[~]` with the failure noted
  in `log.md`, as `next-task` says. Don't start further tasks on top of a failing tree.
- a task turns out to need something only the user can provide (a decision with no sensible
  default, an environment change). Record what is needed and leave it `[ ]` or `[~]`. If
  the tree is clean and the remaining tasks don't depend on this one, skip it and carry on
  instead of stopping.
- the working tree has changes you didn't make.

## 6. Finish the milestone

- Check the milestone's exit criteria in `roadmap.md` one by one against the actual repo
  (run the commands they name, e.g. `make build`). Criteria that tasks don't cover yet
  become new tasks for this milestone.
- If every task of the milestone is `[x]` or `[-]` and every exit criterion is met, set the
  milestone to `done` in `roadmap.md` and the next milestone to `in progress`, and add that
  to the last `log.md` entry. Otherwise leave it `in progress`.
- Make sure **Now** in `tasks.md` holds about 3 tasks for what comes next.
- If `--commit` is set and the milestone wrap-up changed files, commit them as
  `M#: Finish <milestone name>`.

End with a short report:
- the tasks done (with commit hashes if committed, or the suggested commit messages if not)
- the tasks skipped or left open, and what each one needs
- each exit criterion: met or not met, with the reason
- decisions made and follow-up tasks added
- the milestone status and the next task in **Now**
