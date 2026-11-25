# Optional GPU runner

The default CI job runs on `ubuntu-latest`. That machine has no hardware GPU. Playwright there uses SwiftShader. A hardware screenshot job exists and does not start unless you turn it on.

## What this repository will not do

Nothing here registers a runner, creates a token, or SSHes into a machine. You do that in GitHub's runner settings.

## Skip rule

`.github/workflows/ci.yml` job `gpu-screenshots` has:

```yaml
if: vars.GPU_RUNNER == 'true'
runs-on: [self-hosted, gpu]
```

If the repository variable `GPU_RUNNER` is missing or any value other than `true`, GitHub skips the job. A missing self-hosted runner is not left waiting in the queue.

## Registering one (you do this)

1. Use a Windows machine with an NVIDIA RTX-class GPU and a current driver. The label must include `gpu`. GitHub's self-hosted labels are `self-hosted` plus whatever you add; the workflow asks for `[self-hosted, gpu]`.
2. In the repository, Settings → Actions → Runners → New self-hosted runner. Choose Windows and follow GitHub's script. When it asks for labels, add `gpu`.
3. Settings → Secrets and variables → Actions → Variables → New repository variable. Name `GPU_RUNNER`, value `true`.
4. The next push runs `gpu-screenshots` on that machine. `SHOOT=1` writes the smoke screenshots under `docs/screenshots/`. Those files are produced on the runner. This workflow does not commit them.

To stop the job, set `GPU_RUNNER` to `false` or delete the variable. Leave the runner installed or remove it from the same Settings page. Removing the variable is enough to skip the job even if the machine is still connected.
