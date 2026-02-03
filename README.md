# Stoqr

Stock Portfolio Tracker & Analytics

## Tech Stack

- **Framework:** Next.js 14
- **UI:** Tailwind CSS + Radix UI + shadcn/ui
- **Animations:** Framer Motion
- **Charts:** Recharts
- **Forms:** React Hook Form + Zod

## Development

```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Build for production
npm run build

# Start production server
npm run start
```

## Deployment

**Current:** `http://74.225.184.252/stoqr` (path-based)

**Target:** `https://getstoqr.com`

See [docs/DNS_SETUP.md](docs/DNS_SETUP.md) for DNS configuration.

### Infrastructure

| Resource | Value |
|----------|-------|
| AKS Cluster | `intellibyld-dev-aks` |
| Namespace | `logpilot` |
| Container Registry | `intellibylddevacr.azurecr.io` |
| Image | `stoqr-frontend:latest` |

### Quick Deploy

```bash
# Build & push
docker build --platform linux/amd64 -t intellibylddevacr.azurecr.io/stoqr-frontend:latest .
az acr login --name intellibylddevacr
docker push intellibylddevacr.azurecr.io/stoqr-frontend:latest

# Deploy
kubectl rollout restart deployment/stoqr-frontend -n logpilot
```
