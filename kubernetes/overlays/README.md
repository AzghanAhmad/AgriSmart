# Kustomize overlays

- **`production/`** — example patch: JSON logs + pinned image tags (`v1.0.0`) + PodDisruptionBudgets.  
  Edit `images[].newTag` and registry via `newName` before applying.

```powershell
kubectl kustomize kubernetes/overlays/production
kubectl apply -k kubernetes/overlays/production
```

- **Staging** — copy `production/` and use different tags or a separate namespace (add `namespace:` to kustomization).

Optional HPA (after metrics-server works):

```powershell
kubectl apply -f kubernetes/autoscaling/backend-hpa.yaml
```

**Network policies:** not applied by default; strict policies can block NodePort from the host on some CNIs. Add when using Ingress + internal-only mesh.
