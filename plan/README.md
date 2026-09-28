# plan/

This folder tracks where the project is heading and how far it has got. It is the shared
memory between AI sessions, so keep it current.

| File | Contents | Update when |
|---|---|---|
| `roadmap.md` | Milestones M0–M8 with goals and exit criteria | a milestone starts or finishes, or scope changes |
| `tasks.md` | Concrete tasks with IDs, grouped into Now / Next / Later | you start or finish a task, or find new work |
| `open-questions.md` | Unanswered design and product questions | a question comes up or gets answered |
| `decisions.md` | Log of decisions made, with reasons | a decision is made, even a small one |
| `log.md` | Short record of each work session, newest first | at the end of every session |

## Workflow for each session

1. Read `tasks.md`. Pick the top item in **Now**, or ask the user if **Now** is empty.
2. If the task depends on a **blocking** open question, stop and ask the user.
3. Do the work. Run `make check` (available once M0 is done) before calling it done.
4. Tick the task off, move follow-ups into **Next** or **Later**, and add new tasks with the next free ID.
5. If you chose between alternatives, add an entry to `decisions.md`.
6. Add a short entry to `log.md`: what was done, what's next, and any problems.

## Conventions

- Task IDs are `T-###` and never reused. Decision IDs are `D-###`. Question IDs are `Q-###`.
- Task states: `[ ]` todo, `[~]` in progress, `[x]` done, `[-]` dropped (give a reason).
- Keep entries short. Details belong in code, tests or commit messages.
