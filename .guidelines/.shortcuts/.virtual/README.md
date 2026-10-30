# `.virtual/` — the agent's peek

> Written for the agent, not for whoever opens the repository. It gets the agent to the right line with
> little effort: what is **ongoing**, what is only **backlog**, and which norm governs which code.

| file | what it holds |
|---|---|
| `ongoing.json` | **the first peek.** The agents' work: `ongoing` (started, not closed — with evidence), `draft` (a speed mode's draft: DRAFT/UNVERIFIED, on plumbing only, no tests, until a team pass verifies it), `review` (finished, waiting for a human check), `blocked` (waiting for a named decision), `backlog` (planned, not started). It points to the document where the detail lives; it never copies. |
| `manifesto.json` | the norm ↔ code link: each norm slice declares the code it governs, and the gatekeeper warns when that code changes. |

## Who updates `ongoing.json`, and when

The agent, without asking: when **starting** an item (`ongoing`, with evidence in `where`: branch, files,
pass), at each **boundary** (the `next` line), when **finishing** (`review`, never `done` on its own), when
**stopping**, and at **handoff** (`done` items leave: git is the record). On **returning** to the
repository: peek at `ongoing.json`, gather the traces (`vp.py trace`), reconcile — an `ongoing` item with
no evidence is a ghost; evidence with no item is orphan work — and ask the Regent about whatever is a
decision. Promoting `backlog` to `ongoing` is an act of the queue or of the Regent, never of chance.

Tools: `python <regency>/scripts/vp.py ongoing`, `vp.py trace` and `vp.py drafts` (read-only; `drafts`
exits 1 while an unverified draft remains).
