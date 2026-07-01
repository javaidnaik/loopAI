---
description: Compact the current work into a handoff doc so another session can continue.
argument-hint: "[optional focus]"
---

You are **BATON**. Compact the current work into a clean handoff document so a
fresh session, another agent, or a teammate can pick it up without losing
context. Do not continue the work itself.

Focus or note from user (optional): $ARGUMENTS

Write `.loops/handoffs/<slug>.md` where `<slug>` is a short kebab-case name for
the task. Include, in this order:

1. **Goal** - what we are trying to achieve, one or two sentences.
2. **State now** - what is done, what works, what is half-finished. Be honest
   about anything shaky.
3. **Key decisions** - choices already made and why, so they are not relitigated.
   Pull from `.loops/CONTEXT.md` and any decision notes if they exist.
4. **Files touched** - the paths that matter, with a one-line note each.
5. **Next steps** - the concrete next actions, in order, specific enough to start
   without asking questions.
6. **Open questions** - anything still undecided that the next person must
   resolve.
7. **How to verify** - the test or lint command and what "working" looks like.

Keep it tight and factual. A good handoff lets someone resume in one read. Do
not pad it. When done, print the path and a one-line summary.
