# DVC Workflow for AgriSmart

This guide defines the model/versioning workflow before Docker and Kubernetes deployment.

## 1) Initialization Flow

Run once at repository root:

```bash
python -m dvc init
python -m dvc remote add -d localstorage ./data/dvc-storage
```

If already initialized, verify:

```bash
python -m dvc remote list
python -m dvc doctor
```

## 2) Add / Update Model Flow

When new model artifacts are produced (for example inside `models/`):

```bash
python -m dvc add models
git add models.dvc .gitignore
git commit -m "Track updated model artifacts with DVC"
```

For chatbot vector DB artifacts:

```bash
python -m dvc add Backend/chatbot/wheat_cotton_rice_db
git add Backend/chatbot/wheat_cotton_rice_db.dvc Backend/chatbot/.gitignore
git commit -m "Track updated chatbot vector artifacts with DVC"
```

## 3) DVC Push / Pull Flow

Push artifacts after committing pointer files:

```bash
python -m dvc push
```

Pull artifacts in a new environment:

```bash
git pull
python -m dvc pull
```

## 4) Rollback Example

Rollback to an older model version using git + DVC pointers:

```bash
git checkout <older-commit>
python -m dvc pull
```

This restores the exact model artifacts referenced by that commit.

## 5) Collaboration Workflow

1. Teammate updates model files.
2. Teammate runs `dvc add ...` and commits `.dvc` pointer updates.
3. Teammate runs `dvc push`.
4. Other teammate pulls git changes and runs `dvc pull`.

Result: everyone runs the same model version for reproducible inference/testing.

## 6) Expected Directory Structure

```text
AgriSmart/
├── .dvc/
├── .dvcignore
├── models.dvc
├── models/
│   ├── metadata.json
│   ├── wheat/
│   │   └── best.pt
│   ├── rice/
│   │   └── best.pt
│   └── cotton/
│       └── best.pt
├── Backend/
│   └── chatbot/
│       ├── wheat_cotton_rice_db.dvc
│       └── wheat_cotton_rice_db/
└── data/
    └── dvc-storage/
```

## Notes

- `MODEL_DIR` controls where services look for YOLO weights.
- Startup validation in backend/yolo service checks expected DVC-managed model paths.
- Missing model files are logged clearly and can be restored with `dvc pull`.
