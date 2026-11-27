<!-- generated from cc3503d80c4e, 2026-05-06 -->
<!-- c4-map config e854e651d5aa -->

# Deployment: production

Where each container runs. Built from `.github/workflows/deploy-*.yml` and `docker-compose.prod.yml`. Up: [containers](c4-containers.md).

```mermaid
C4Deployment
  title Deployment: production

  Deployment_Node(browser, "User browser", "Chrome, Safari, Firefox") {
    Container(spa, "Web SPA", "React", "Static bundle")
  }

  Deployment_Node(cf, "Cloudflare Pages", "project gatherr") {
    Container(static, "Static hosting", "Cloudflare CDN", "Serves SPA files")
  }

  Deployment_Node(vps, "VPS", "Docker Compose") {
    Container(proxy, "Traefik", "Let's Encrypt", "api.gatherr.alber.ee")
    Container(api, "gatherr-backend", "Docker, JRE 21", "Spring Boot API")
    ContainerDb(db, "gatherr-db", "postgres:17", "Volume postgres_data")
  }

  Rel(static, spa, "Delivers", "HTTPS")
  Rel(spa, proxy, "Calls API", "HTTPS")
  Rel(proxy, api, "Forwards", "HTTP 8080")
  Rel(api, db, "Reads/writes", "JDBC")

  UpdateLayoutConfig($c4ShapeInRow="3", $c4BoundaryInRow="2")
```

- Push to `main` touching `backend/` builds the image to Docker Hub, copies `docker-compose.prod.yml` to `/my-apps/gatherr/` over SSH, writes `.env` from the `ENV_FILE` secret, and runs `docker compose up -d`.
- Push to `main` touching `frontend/` runs `npm run build` and `wrangler pages deploy`.
- The API and database share the `internal` network; only the API joins Traefik's `proxy` network.
