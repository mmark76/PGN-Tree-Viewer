# GitHub Copilot instructions

## Safe merged-branch cleanup

Perform branch cleanup only when the repository owner explicitly requests it.

Before deleting a branch, verify all of the following:

1. Identify the repository default branch through GitHub metadata. Never delete the default branch, including `main` or `master`.
2. Never delete a protected branch, release branch, or a branch whose protection or purpose is uncertain.
3. Verify that the related pull request is merged, or that every commit on the candidate branch is already reachable from the default branch.
4. Verify that the branch has no commits after the merged pull-request head.
5. Verify that no open pull request uses the branch and no local checkout or worktree is currently on it.
6. If any evidence is incomplete, ambiguous, or unavailable, classify the branch as `REVIEW REQUIRED` and do not delete it.

For a verified deletion, delete only the specific merged feature branch requested by the owner. Do not force-push, rewrite history, alter the default branch, or delete tags.

Report the repository, branch, evidence used, and whether the remote branch, local branch, or worktree was removed. Keep unverified and active branches intact.
