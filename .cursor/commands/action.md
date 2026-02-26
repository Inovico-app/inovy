# Infrastructure Action Command

When the user runs `/action`, execute the following workflow in order.

## Workflow

### 1. Add and commit changes

- Run `git status` to see what has changed
- Stage all changes: `git add -A`
- Generate a **succinct** commit message from the changes (e.g. "fix: qdrant volume_mounts schema", "feat: add qdrant container app module")
- Commit: `git commit -m "<succinct message>"`

If there are no changes to commit, skip to step 2 (push may still be needed if there are unpushed commits).

### 2. Push code

```bash
git push
```

### 3. Start the Azure infrastructure pipeline

```bash
gh workflow run azure-infra.yml --ref $(git rev-parse --abbrev-ref HEAD)
```

Use default workflow inputs (environment=prd, resource_group_name=rg-terraform-states, location=westeurope) unless the user specifies otherwise.

### 4. Wait for the run and check for errors

- Wait for the run to appear: `sleep 5`
- Get the latest run ID: `gh run list --workflow=azure-infra.yml --limit 1 --json databaseId --jq '.[0].databaseId'`
- Watch until it completes: `gh run watch <run-id>`
- If the run **failed**, fetch and display failed logs: `gh run view <run-id> --log-failed`
- Report the outcome: success or failure with error details

## Error handling

- If `git push` fails (e.g. no upstream, auth): report the error and stop
- If `gh workflow run` fails: report the error and stop
- If the pipeline fails: show the `--log-failed` output and summarize the Terraform or workflow errors

## Requirements

- User must be authenticated: `gh auth status` should succeed
- Run from the project root
- Ensure `gh` CLI is installed
