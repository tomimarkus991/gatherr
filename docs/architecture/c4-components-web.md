<!-- generated from cc3503d80c4e, 2026-05-06 -->
<!-- c4-map config e854e651d5aa -->

# Components: Web SPA

Top-level folders of `frontend/src`. Drawn from [docs/c4/level-3.md](../c4/level-3.md). Sibling: [API components](c4-components-api.md). Up: [containers](c4-containers.md).

Not drawn: **API types** (`api/types.gen.ts`, generated from the API's OpenAPI spec), used by data hooks and components, and the small helpers in `lib` (`utils`, `timezone`, `site`) used across routes and components.

```mermaid
C4Component
  title Components: Web SPA

  Container_Boundary(web, "Web SPA") {
    Component(shell, "App shell", "TanStack Router", "Router, typed env")
    Component(mocks, "Mocks", "MSW, faker", "Fake API, demo data")
    Component(routes, "Routes", "TanStack Router", "Home, create, event")
    Component(provider, "Query provider", "TanStack Query", "Query client, app init")
    Component(hooks, "Data hooks", "TanStack Query", "Queries, mutations")
    Component(components, "Components", "React, motion", "UI and page sections")
    Component(http, "HTTP client", "axios", "Adds Bearer token")
  }

  Boundary(ext, "Backend", "") {
    Container_Ext(api, "API", "Spring Boot", "REST /api/v1")
  }

  Rel(shell, routes, "Renders")
  Rel(routes, provider, "Wraps app")
  Rel(routes, components, "Composes")
  Rel(routes, hooks, "Fetches data")
  Rel(components, hooks, "Calls mutations")
  Rel(provider, hooks, "Loads current user")
  Rel(routes, mocks, "Starts in mock mode")
  Rel(hooks, http, "Sends requests")
  Rel(http, api, "Calls", "JSON/HTTPS")

  UpdateRelStyle(routes, provider, $offsetX="-50", $offsetY="-25")
  UpdateRelStyle(components, hooks, $offsetX="-50", $offsetY="-25")
  UpdateRelStyle(routes, components, $offsetX="-5", $offsetY="25")
  UpdateRelStyle(provider, hooks, $offsetX="45", $offsetY="-28")
  UpdateRelStyle(http, api, $offsetX="-55", $offsetY="-25")
  UpdateLayoutConfig($c4ShapeInRow="2", $c4BoundaryInRow="1")
```
