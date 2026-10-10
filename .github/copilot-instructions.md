# Safe merged-branch cleanup

When the user explicitly requests branch cleanup, delete only a non-default, unprotected branch after verifying a merged PR or full integration into the default branch, no later commits, and no open PR, worktree, or current checkout.

Protected branches, release branches, and branches with unresolved enidence are excluded. Never delete `main`, `master`, the repository default branch, or any protected branch. Never force-push, rewrite history, or delete an old branch without verification. Classify uncertain branches as `REVIEW REQUIRED` and report them.

After verified cleanup, report the repository, branch, merge evidence, and whether the remote and/or local reference was removed.
