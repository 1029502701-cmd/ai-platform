# Cloudflare Pages Production Deployment Fix Guide

## Problem
CF Pages GitHub Connect deployments fail with: sh: 1: vite: not found
No production deployment has been created yet.

## Root Cause Analysis

### Issue 1: Invalid CF_API_TOKEN
The token used in GitHub Actions is invalid. API verification returns:
Error code 1000: Invalid API Token

### Issue 2: Two conflicting deployment mechanisms
Both CF Pages GitHub Connect and GitHub Actions try to deploy, causing confusion.

### Issue 3: Node.js Version Not Specified
No .node-version file was present. CF Pages may use outdated Node.

## Solution

What Was Changed:
1. .github/workflows/ci-cd.yml - Simplified to only typecheck + build validation (no deploy)
2. .node-version - Created with content '20'
3. package.json - Added engines.node >= 20.0.0

## How to Trigger First Production Deployment

After pushing changes to GitHub:

1. Create a test commit:
   git commit --allow-empty -m "chore: trigger production deploy"
   git push origin main

2. Watch the CF Pages dashboard for new deployment
3. The URL will be: https://ai-platform.pages.dev

## Troubleshooting

If deployment still fails:
- Check Deployments tab in CF dashboard
- Click latest deployment -> View logs
- Common issues: missing secrets, build errors, insufficient memory