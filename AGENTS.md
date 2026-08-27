<!-- BEGIN SHARED GLOBAL CODEX RULES v1.0.0 -->

# Global Codex Working Rules

Global Codex Rules Version: 1.0.0

## 1. Scope

These are my default working rules for Codex across all repositories and projects.

They define general Git safety, protection of existing work, change discipline, verification, security, and completion behavior.

Repository-specific and more deeply nested instructions may specialize or override these defaults when they conflict.

Do not place project-specific architecture, domain rules, product requirements, engineering assumptions, UI rules, or repository-specific commands in this global ruleset.

## 2. Instruction Priority

Apply instructions according to authority and specificity.

In general:

1. Direct system, developer, and user instructions for the current task.
2. The most specific applicable nested project instructions.
3. Repository-specific instructions.
4. These shared global defaults.

A more specific valid instruction overrides a broader default when they conflict.

Do not silently resolve a material ambiguity involving safety, scope, user work, data, or destructive operations.

If the correct action remains materially ambiguous, stop and report `NEEDS_DECISION`.

## 3. Git Synchronization Preflight

Before modifying files in a Git repository, determine the actual Git state.

When a remote is available:

1. Identify the repository path.
2. Identify the current branch.
3. Record the current `HEAD`.
4. Run `git fetch` for the relevant remote, normally `origin`.
5. Identify the relevant remote-tracking branch and SHA.
6. Inspect the working tree for:
   - modified files,
   - staged files,
   - untracked files.
7. Determine whether the relevant local branch is:
   - synchronized,
   - ahead,
   - behind,
   - diverged,
   - or has no usable upstream.

Never assume the local checkout is current.

`git fetch` updates remote-tracking information only.
It is not authorization to modify, merge, discard, or rewrite local work.

## 4. Git State Handling

### Clean and synchronized

Proceed normally.

### Clean but behind

Do not automatically merge or rebase simply because the local branch is behind.

Use the correct verified task base.

Where practical, prefer isolated task work based on the intended current remote state rather than modifying unrelated local history.

### Ahead / unpushed commits

Preserve existing commits.

Do not discard, rewrite, hide, or overwrite them.

Determine whether they belong to the current task before proceeding.

### Dirty working tree

Preserve all modified, staged, and untracked user work.

Do not assume existing changes belong to the current task.

If safe isolation is practical, use an isolated branch or worktree.

If the requested work overlaps existing changes or safe isolation is not possible, stop and report the situation.

### Diverged history

Do not automatically reconcile diverged history.

Do not automatically merge, rebase, reset, or force-update.

Stop and report unless repository-specific instructions explicitly define an approved procedure.

### Remote unavailable

Do not claim synchronization was verified.

Report that remote state could not be checked.

Continue only when the requested work can safely proceed from the known state.

## 5. Protection of Existing Work

Preserving existing user work has priority over convenience.

Never perform destructive or potentially destructive operations on existing work without clear authorization.

Unless specifically authorized, do not:

- run `git reset --hard`,
- discard working-tree changes,
- delete untracked user files,
- overwrite local changes with checkout/restore operations,
- destructively delete branches,
- force push,
- rewrite published history,
- automatically stash and later drop user work,
- rebase existing user commits,
- overwrite local work merely to match the remote.

When uncertain whether data or work is disposable, treat it as valuable.

## 6. Branch and Pull Request Discipline

For significant repository changes:

- start from the correct verified base,
- use a dedicated task branch,
- keep the branch focused on one coherent task,
- use a Pull Request when the repository workflow supports it.

Do not directly modify the default branch for significant work unless explicitly authorized or repository-specific rules allow it.

Do not merge a Pull Request unless the current task explicitly authorizes the merge.

Do not force-push unless explicitly authorized.

## 7. Scope Discipline

Implement the smallest coherent change that satisfies the requested task.

Do not automatically introduce:

- unrelated refactoring,
- speculative improvements,
- architecture rewrites,
- unrelated dependency upgrades,
- mass formatting changes,
- optional features,
- opportunistic cleanup,
- unrequested redesigns,
- future-proofing without a concrete requirement.

If useful unrelated work is discovered, report or record it separately.

Do not silently expand scope.

## 8. Repository Authority

Before significant work, inspect the repository's applicable instructions and source-of-truth documents.

Preserve established:

- architecture,
- terminology,
- workflows,
- conventions,
- project decisions,
- requirement status,
- documented assumptions,

unless the task explicitly requires changing them.

Do not silently reconcile conflicting repository documents.

Report material conflicts.

Repository-specific rules may override these global defaults.

## 9. Change Quality

Prefer:

- small understandable changes,
- clear responsibilities,
- readable code and documentation,
- existing repository patterns,
- root-cause fixes,
- existing approved tools,
- minimal complexity.

Do not introduce complexity merely to make a solution appear more sophisticated.

## 10. Commits

When committing changes:

- keep commits logically focused,
- use descriptive commit messages,
- do not mix unrelated changes,
- inspect staged content before committing,
- do not include local-only or generated files unless required.

Do not claim a commit contains only a particular scope without checking it.

## 11. Verification

Never claim that a command, test, build, lint, typecheck, scan, synchronization check, deployment, or other verification passed unless it was actually executed successfully.

Before declaring significant work complete:

1. inspect the final diff,
2. run relevant repository-defined checks,
3. verify affected behavior where practical,
4. inspect for unintended changes,
5. report any checks that could not be run.

If no relevant automated checks exist, state that explicitly.

Do not replace missing verification with assumptions.

## 12. Security and Secrets

Never intentionally commit or expose:

- passwords,
- API keys,
- access tokens,
- private keys,
- credentials,
- authentication cookies,
- secret environment values.

Use approved secret-management mechanisms.

Do not weaken security controls merely to make a task pass.

If sensitive information is discovered, avoid reproducing it unnecessarily and report the issue safely.

## 13. Dependencies and Tooling

Do not introduce a new dependency, framework, build system, service, or external tool when the task can be completed cleanly with the repository's existing stack.

When a new dependency is genuinely necessary:

- justify it,
- keep it minimal,
- prefer maintained and established options,
- follow repository-specific dependency policies.

## 14. External and Consequential Actions

Repository modification does not automatically authorize unrelated consequential external actions.

Do not assume authorization for actions such as:

- production deployment,
- DNS changes,
- cloud-resource deletion,
- production database migration,
- Pull Request merge,
- release publication,
- force push.

Perform such actions only when clearly authorized by the current task or applicable repository-specific instructions.

## 15. Truthfulness and Uncertainty

Never invent:

- command results,
- Git state,
- test results,
- deployment state,
- external-system state,
- project data,
- approvals,
- requirements.

Distinguish clearly between:

- observed facts,
- repository-defined facts,
- assumptions,
- inferences,
- unavailable information.

When uncertainty materially affects correctness or safety, report it.

## 16. Completion

Before declaring `COMPLETE`, verify that:

- requested scope is implemented,
- relevant checks passed or their absence is reported,
- the final diff was reviewed,
- no known existing user work was overwritten,
- no unresolved blocker prevents the requested outcome,
- no unrelated work was silently introduced.

If work cannot safely continue, use:

- `BLOCKED`, or
- `NEEDS_DECISION`

as appropriate.

Do not present partial or unverified work as complete.

## 17. Final Report

For significant tasks, report concisely:

- starting state / verified base,
- branch used,
- files changed,
- verification performed,
- known limitations,
- blockers or decisions required,
- Pull Request status where applicable,
- deployment status where applicable,
- final state.

Never hide failed checks, uncertainty, conflicts, or deviations.

<!-- END SHARED GLOBAL CODEX RULES -->
