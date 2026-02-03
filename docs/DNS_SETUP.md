# Stoqr DNS Setup Guide

## Overview

Configure DNS for Stoqr to use the `getstoqr.com` domain.

> **Note:** IP `74.225.184.252` is the shared **Intellibyld AKS Cluster** Application Gateway.
> This IP hosts multiple projects: Intellibyld, Stoqr, and GoFytt.

### Current State
```
http://74.225.184.252/stoqr → Stoqr Frontend (path-based)
```

### Target State
```
https://getstoqr.com     → Stoqr Frontend
https://www.getstoqr.com → Stoqr Frontend
https://app.getstoqr.com → Stoqr Frontend (primary)
```

---

## Infrastructure

| Resource | Value |
|----------|-------|
| AKS Cluster | `intellibyld-dev-aks` |
| Resource Group | `intellibyld-dev-rg` |
| Namespace | `logpilot` |
| Application Gateway IP | `74.225.184.252` (shared) |
| Container Registry | `intellibylddevacr.azurecr.io` |

---

## Step 1: DNS Records

Add the following DNS records at your domain registrar for `getstoqr.com`:

| Type | Host | Value | TTL |
|------|------|-------|-----|
| A | `@` | `74.225.184.252` | 300 |
| A | `www` | `74.225.184.252` | 300 |
| CNAME | `www` | `getstoqr.com` | 300 |

> **Note:** Use either the A record for www OR the CNAME, not both.

### Verify DNS Propagation

```bash
# Check DNS resolution
nslookup getstoqr.com
nslookup www.getstoqr.com

# Or use dig
dig getstoqr.com +short
dig www.getstoqr.com +short
```

---

## Step 2: Create Separate Ingress for Stoqr

Create a dedicated ingress for the getstoqr.com domain:

```bash
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: stoqr-ingress
  namespace: logpilot
  annotations:
    kubernetes.io/ingress.class: azure/application-gateway
    appgw.ingress.kubernetes.io/ssl-redirect: "false"
    appgw.ingress.kubernetes.io/connection-draining: "true"
    appgw.ingress.kubernetes.io/connection-draining-timeout: "30"
    appgw.ingress.kubernetes.io/request-timeout: "300"
spec:
  rules:
  - host: getstoqr.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: stoqr-frontend
            port:
              number: 80
  - host: www.getstoqr.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: stoqr-frontend
            port:
              number: 80
EOF
```

---

## Step 3: SSL/TLS with cert-manager

### Prerequisites

Ensure cert-manager is installed:

```bash
# Check if cert-manager is installed
kubectl get pods -n cert-manager

# If not installed:
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.14.0/cert-manager.yaml
```

### Create ClusterIssuer (if not exists)

```bash
kubectl apply -f - <<EOF
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@getstoqr.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: azure/application-gateway
EOF
```

### Update Ingress with TLS

```bash
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: stoqr-ingress
  namespace: logpilot
  annotations:
    kubernetes.io/ingress.class: azure/application-gateway
    cert-manager.io/cluster-issuer: letsencrypt-prod
    appgw.ingress.kubernetes.io/ssl-redirect: "true"
    appgw.ingress.kubernetes.io/connection-draining: "true"
    appgw.ingress.kubernetes.io/request-timeout: "300"
spec:
  tls:
  - hosts:
    - getstoqr.com
    - www.getstoqr.com
    secretName: stoqr-tls
  rules:
  - host: getstoqr.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: stoqr-frontend
            port:
              number: 80
  - host: www.getstoqr.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: stoqr-frontend
            port:
              number: 80
EOF
```

---

## Step 4: Update Next.js Configuration

Update `next.config.mjs` to remove the `/stoqr` base path for production:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Remove basePath for getstoqr.com domain
  // basePath: '/stoqr',  // Only needed for path-based routing
};

export default nextConfig;
```

---

## Step 5: Rebuild and Deploy

```bash
cd /Users/tharun/Documents/GitHub/stoqr-new

# Build Docker image
docker build --platform linux/amd64 \
  -t intellibylddevacr.azurecr.io/stoqr-frontend:latest .

# Push to ACR
az acr login --name intellibylddevacr
docker push intellibylddevacr.azurecr.io/stoqr-frontend:latest

# Restart deployment
kubectl rollout restart deployment/stoqr-frontend -n logpilot

# Check status
kubectl rollout status deployment/stoqr-frontend -n logpilot
```

---

## Step 6: Verify Setup

### Check Ingress

```bash
kubectl get ingress -n logpilot
kubectl describe ingress stoqr-ingress -n logpilot
```

### Check Certificate

```bash
kubectl get certificate -n logpilot
kubectl describe certificate stoqr-tls -n logpilot
```

### Test Endpoints

```bash
# Test without TLS
curl -v http://getstoqr.com

# Test with TLS (after cert is issued)
curl -v https://getstoqr.com

# Check for redirect
curl -v http://www.getstoqr.com
```

---

## Troubleshooting

### DNS Not Resolving

```bash
# Check propagation
dig getstoqr.com +trace

# Clear DNS cache (macOS)
sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder
```

### Certificate Not Issued

```bash
# Check cert-manager logs
kubectl logs -n cert-manager deployment/cert-manager

# Check certificate request status
kubectl get certificaterequest -n logpilot
kubectl describe certificaterequest -n logpilot
```

### 502 Bad Gateway

```bash
# Check pods
kubectl get pods -n logpilot | grep stoqr

# Check logs
kubectl logs -n logpilot deployment/stoqr-frontend

# Check service endpoints
kubectl get endpoints stoqr-frontend -n logpilot
```

---

## Quick Reference

### Current Deployment

| Component | Status |
|-----------|--------|
| Pods | 2 replicas running |
| Service | ClusterIP (port 80 → 3000) |
| Image | `intellibylddevacr.azurecr.io/stoqr-frontend:latest` |

### Commands

```bash
# View pods
kubectl get pods -n logpilot | grep stoqr

# View logs
kubectl logs -n logpilot deployment/stoqr-frontend -f

# Restart
kubectl rollout restart deployment/stoqr-frontend -n logpilot

# Scale
kubectl scale deployment/stoqr-frontend -n logpilot --replicas=3
```
