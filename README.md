# AgriSmart

## Model Versioning with DVC

AgriSmart uses DVC to manage model and vector artifacts outside git while keeping version pointers inside git.

### Why DVC is used

- Model files (`.pt`, vector DB artifacts) are large and change frequently.
- Git remains clean and lightweight by storing only `.dvc` pointer files.
- Teams can reproduce the exact model state from any commit.

### Reproducibility benefits

- Every code commit can map to a fixed model artifact version.
- New environments can restore exact artifacts with `python -m dvc pull`.
- Rollbacks are deterministic: checkout old commit + `dvc pull`.

### Model lifecycle

1. Train or update model artifacts.
2. Track artifacts with `python -m dvc add ...`.
3. Commit `.dvc` pointer changes to git.
4. Push artifact data to DVC remote with `python -m dvc push`.
5. Teammates pull pointers from git and run `python -m dvc pull`.

See `scripts/dvc-workflow.md` for step-by-step commands and collaboration flow.
