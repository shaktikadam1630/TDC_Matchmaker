# Deploying to AWS

Recommended low-ops layout:

| Piece | AWS service |
|---|---|
| Frontend (static build) | S3 + CloudFront |
| API (Docker image) | ECR + App Runner (or ECS Fargate behind an ALB) |
| Database | MongoDB Atlas (or Amazon DocumentDB) |
| Secrets | AWS Secrets Manager / App Runner secrets |

## 1. One-time setup

1. **Database.** Create an Atlas cluster (or DocumentDB), allow the App Runner egress, and create a user. Keep the connection string handy.
2. **ECR.** `aws ecr create-repository --repository-name tdc-matchmaker-api`
3. **App Runner service** from that ECR image:
   - Port `4000`, health check path `/api/health` (HTTP).
   - Environment variables: `NODE_ENV=production`, `MONGO_URI`, `JWT_SECRET` (long and random), `CORS_ORIGINS=https://<your-cloudfront-domain>`, `OPENAI_API_KEY` (optional), `AUTO_SEED=true` for the first boot only, then set it to `false`. Store secrets in Secrets Manager.
   - Enable auto-deployments so each pushed `latest` image rolls out.
4. **Frontend bucket.** Create a private S3 bucket and a CloudFront distribution (Origin Access Control). Set the default root object to `index.html` and add custom error responses 403 and 404 → `/index.html` with status 200, so SPA deep links work.
5. **CloudFront `/api/*` behaviour (recommended).** Add the App Runner URL as a second origin, route `/api/*` to it with caching disabled and all headers/cookies/query strings forwarded. The frontend then runs same-origin with `VITE_API_URL=/api`. If you prefer a separate API domain, build with `VITE_API_URL=https://api.example.com/api` and set `CORS_ORIGINS` to the frontend domain.
6. **GitHub OIDC role.** Create an IAM role that GitHub Actions can assume with permissions for `ecr:*` on the repo, `s3:PutObject/DeleteObject/ListBucket` on the bucket and `cloudfront:CreateInvalidation`.

## 2. CI/CD

[.github/workflows/deploy.yml](../../.github/workflows/deploy.yml) runs the backend tests, builds and pushes the API image to ECR, then builds the frontend, syncs it to S3 and invalidates CloudFront. Set these repository **variables**: `AWS_REGION`, `AWS_ROLE_ARN`, `ECR_REPOSITORY`, `S3_BUCKET`, `CLOUDFRONT_DISTRIBUTION_ID`, `VITE_API_URL`.

## 3. Alternatives and notes

- **ECS Fargate:** use the same image behind an ALB with target-group health check `/api/health`. The app already trusts one proxy hop (`trust proxy`).
- **Email in production:** swap `services/emailService.js` for Amazon SES. The `sendEmail({to, subject, text})` contract is unchanged.
- **Scaling:** the API is stateless. The only in-memory state is the AI result cache, which is optional (move it to Redis if you run many instances).
- **Login hardening:** the demo stores the JWT in localStorage. For production prefer an httpOnly, SameSite cookie plus CSRF protection, and a shared rate-limit store.
