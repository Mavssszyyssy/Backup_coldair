# AEROPULSE release path

When the user says **Push and deploy**, use this release path without asking for a second general confirmation:

1. Work from `main-martyn` in both repositories. Never push an AEROPULSE release from a different branch unless the user names it.
2. Run the relevant local tests once before committing. Run the full main-project suites when a change crosses web, API, and mobile boundaries.
3. If `backend/` changed, mirror only those backend changes into `aeropulse-backend-release/backend/`. Do not copy or edit the release mirror's `front/` or `bork5/caact-mobile/`; they are not part of the backend deployment.
4. Commit and push the backend release repository first. Then commit its updated gitlink together with the main-project changes and push the main repository.
5. Do not manually promote normal deployments in Vercel. Both Vercel projects track `main-martyn` as their Production branch and automatically assign their production domains.
6. Wait for GitHub verification and Vercel Production to finish. Report completion only after these smoke checks succeed:
   - `https://api.coldair-act.online/api/health` returns HTTP 200, `environment: production`, and the pushed backend release.
   - `https://www.coldair-act.online/` returns HTTP 200.
7. If a check fails, inspect the failing job first. Do not rerun every suite or create a deployment-only commit unless the failure is reproducible and the correction is required.

The main repository owns full-system verification. The `aeropulse-backend` repository verifies only `backend/**`, because its Vercel project deploys only that directory.
