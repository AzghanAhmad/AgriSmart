# AgriSmart Kubernetes Deployment (Step 6)

**Production hardening, observability, CI/CD, and readiness narrative:** see [docs/PRODUCTION_READINESS.md](../docs/PRODUCTION_READINESS.md).

**Production Kustomize overlay:** [overlays/production/](overlays/production/) (JSON logs, image tags, PDBs).

This folder contains a production-structured Kubernetes baseline that mirrors the current Docker Compose behavior:

- `backend` is the only externally exposed API (`NodePort`)
- `yolo-service`, `chatbot-service`, and `postgres` are internal (`ClusterIP`)
- strict fallback mode remains disabled
- persistent storage is provisioned for Postgres, ChromaDB, uploads, and models

## 1) Prerequisites

- A running Kubernetes cluster and `kubectl` context set correctly
- Container images available to the cluster:
  - `agrismart-backend:latest`
  - `agrismart-yolo:latest`
  - `agrismart-chatbot:latest`
  - `postgres:16`

If using a remote cluster, push the AgriSmart images to a registry and update image names in `deployments/*.yaml`.

### Models on Kubernetes (required for yolo `/ready`)

YOLO readiness expects these files on the **models** volume (default `MODEL_DIR=/models`):

- `/models/wheat/best.pt`
- `/models/rice/best.pt`
- `/models/cotton/best.pt`

Docker Compose bind-mounts `./models` from your machine; **PVCs start empty**, so yolo stays `0/1` and backend init blocks on `wait-for-yolo-ready`.

Copy from your dev machine (after `./models` is populated, e.g. from DVC or your existing repo):

```powershell
kubectl apply -f kubernetes/helpers/models-loader-pod.yaml
kubectl wait -n agrismart --for=condition=Ready pod/models-loader --timeout=120s
kubectl cp ./models/. agrismart/models-loader:/models/
kubectl delete pod -n agrismart models-loader
kubectl rollout restart deployment/yolo-service deployment/backend -n agrismart
```

**Windows / OneDrive:** recursive `kubectl cp .\models\. ...` often fails with `archive/tar: unknown file mode ?rw-rw-rw-`. Copy only the weight files (and create dirs first):

```powershell
kubectl exec -n agrismart pod/models-loader -- mkdir -p /models/wheat /models/rice /models/cotton
kubectl cp .\models\wheat\best.pt agrismart/models-loader:/models/wheat/best.pt
kubectl cp .\models\rice\best.pt agrismart/models-loader:/models/rice/best.pt
kubectl cp .\models\cotton\best.pt agrismart/models-loader:/models/cotton/best.pt
kubectl exec -n agrismart pod/models-loader -- ls -la /models/wheat/best.pt /models/rice/best.pt /models/cotton/best.pt
kubectl delete pod -n agrismart models-loader
kubectl rollout restart deployment/yolo-service deployment/backend -n agrismart
```

Optional HF caches (only if you want warm caches on the PVC): copy `hf-home`, `hf-cache`, `st-cache` the same way, one path at a time, or use a WSL shell for `kubectl cp ./models/. ...`.

Optional: set `MODEL_DOWNLOAD_URL_WHEAT` / `RICE` / `COTTON` on the yolo Deployment and rely on the entrypoint download (same as Compose).

### Docker Desktop Kubernetes (local images)

The cluster shares the host Docker engine. Pods use `imagePullPolicy: IfNotPresent`, so images must exist **with the same names as in the manifests**.

From the repo root, build and tag (Compose now sets `image:` to match Kubernetes):

```powershell
docker compose build backend chatbot-service yolo-service
docker image ls | findstr agrismart
```

You should see `agrismart-backend`, `agrismart-chatbot`, and `agrismart-yolo` with tag `latest`.

If a pod shows **ErrImagePull** / **image can't be pulled**, the image name is missing locally—run the build above, then restart the deployment:

```powershell
kubectl rollout restart deployment/chatbot-service deployment/yolo-service deployment/backend -n agrismart
```

### Backend `DATABASE_URL` in Kubernetes

Do not use shell-style `$(POSTGRES_USER)` inside a Deployment `env.value`—Kubernetes does not substitute it. The full URL is stored in `secrets/agrismart-secrets.yaml` as `DATABASE_URL` and loaded via `envFrom`. After changing the secret:

```powershell
kubectl apply -f kubernetes/secrets/
kubectl rollout restart deployment/backend -n agrismart
```

## 2) Deploy Incrementally

```powershell
kubectl apply -f kubernetes/namespace.yaml
kubectl apply -f kubernetes/configmaps/
kubectl apply -f kubernetes/secrets/
kubectl apply -f kubernetes/storage/
kubectl apply -f kubernetes/services/
kubectl apply -f kubernetes/deployments/
```

Alternative:

```powershell
kubectl apply -k kubernetes/
```

## 3) Validate

```powershell
kubectl get pods -n agrismart
kubectl get svc -n agrismart
kubectl get pvc -n agrismart
kubectl describe pod -n agrismart -l app=backend
kubectl logs -n agrismart deploy/backend
kubectl logs -n agrismart deploy/chatbot-service
kubectl logs -n agrismart deploy/yolo-service
kubectl logs -n agrismart deploy/postgres
```

Check backend endpoints:

- **Docker Desktop:** use `localhost` (NodePort is published on the host):

```powershell
curl http://127.0.0.1:30050/health
curl http://127.0.0.1:30050/ready
curl http://127.0.0.1:30050/health/dependencies
```

- **Remote cluster:** replace with a node IP or `kubectl port-forward`:

```powershell
kubectl port-forward -n agrismart svc/backend-service 5000:5000
# then curl http://127.0.0.1:5000/health
```

Init container logs (while backend is `Init:*`):

```powershell
kubectl logs -n agrismart deploy/backend -c wait-for-postgres
kubectl logs -n agrismart deploy/backend -c wait-for-yolo-ready
kubectl logs -n agrismart deploy/backend -c wait-for-chatbot-ready
```

## 4) Failure Behavior Test

```powershell
kubectl delete pod -n agrismart -l app=yolo-service
curl http://127.0.0.1:30050/health/dependencies
```

Expected:

- backend reports structured degraded/503 while yolo is down
- yolo pod is recreated and backend returns healthy after recovery

## 5) Optional Ingress (later stage)

`ingress/backend-ingress.yaml` is provided but intentionally not included in `kustomization.yaml`.
Apply it only after NodePort flow is stable:

```powershell
kubectl apply -f kubernetes/ingress/backend-ingress.yaml
```
