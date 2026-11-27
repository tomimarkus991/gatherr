<!-- generated from cc3503d80c4e, 2026-05-06 -->
<!-- c4-map config e854e651d5aa -->

# Containers: Gatherr

What runs in production and how the pieces talk. Drawn from [docs/c4/level-2.md](../c4/level-2.md). Up: [context](c4-context.md). Inside the containers: [API components](c4-components-api.md), [SPA components](c4-components-web.md). Hosting: [deployment](c4-deployment.md).

```mermaid
C4Container
  title Containers: Gatherr

  Person(user, "User", "Organiser or participant")

  System_Boundary(g, "Gatherr") {
    Container(spa, "Web SPA", "React, TanStack", "Events, availability, heatmap")
    Container(proxy, "Reverse proxy", "Traefik", "TLS termination")
    Container(api, "API", "Spring Boot, Java 21", "REST /api/v1, JWT")
    ContainerDb(db, "Database", "PostgreSQL 17", "Users, events, responses")
  }

  Boundary(ext, "External", "") {
    System_Ext(google, "Google Identity", "OAuth / OIDC")
  }

  Rel(user, spa, "Uses", "HTTPS")
  Rel(spa, proxy, "Calls API", "JSON, Bearer JWT")
  Rel(proxy, api, "Forwards", "HTTP 8080")
  Rel(api, db, "Reads/writes", "JDBC")
  Rel(spa, google, "Gets ID token", "GIS")
  Rel(api, google, "Fetches keys", "OIDC")

  UpdateRelStyle(user, spa, $offsetX="-55", $offsetY="-30")
  UpdateRelStyle(spa, google, $offsetX="-35", $offsetY="-28")
  UpdateLayoutConfig($c4ShapeInRow="1", $c4BoundaryInRow="2")
```

- The SPA signs in with Google, sends the ID token to `POST /auth/google`, and gets back the API's own JWT, kept in `localStorage`.
- With `VITE_ENABLE_MOCK=true` the SPA runs against MSW mocks instead of the API.
