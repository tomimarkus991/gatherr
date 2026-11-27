<!-- generated from cc3503d80c4e, 2026-05-06 -->
<!-- c4-map config e854e651d5aa -->

# Components: API

Packages inside the Spring Boot API (`com.gatherr.backend`). Drawn from [docs/c4/level-3.md](../c4/level-3.md). Sibling: [SPA components](c4-components-web.md). Up: [containers](c4-containers.md).

Not drawn, because nearly everything uses them: **DTOs** (`dto`, request/response payloads) and **Model** (`model`, JPA entities `User`, `Event`, `EventUser`). `DataSeeder` seeds dev data through the repositories.

```mermaid
C4Component
  title Components: API

  Container_Ext(spa, "Web SPA", "React", "Sends JSON with JWT")

  Container_Boundary(api, "API") {
    Component(config, "Security config", "Spring Security", "JWT filter, public routes")
    Component(controller, "Controllers", "Spring Web", "Auth, users, events, availability")
    Component(service, "Services", "Spring", "Auth, JWT, event logic")
    Component(util, "Utilities", "Java", "JWT helpers, short-ID words")
    Component(mapper, "Mappers", "MapStruct", "User to DTO")
    Component(repo, "Repositories", "Spring Data JPA", "Users, events, responses")
  }

  Boundary(ext, "Storage", "") {
    ContainerDb(db, "Database", "PostgreSQL", "Schema via Liquibase")
  }

  Rel(spa, config, "Sends requests", "JSON/HTTPS")
  Rel(config, controller, "Passes authed")
  Rel(controller, service, "Calls")
  Rel(controller, util, "Reads user ID")
  Rel(service, mapper, "Maps users")
  Rel(service, util, "Builds short IDs")
  Rel(service, repo, "Loads/saves")
  Rel(repo, db, "Queries", "JDBC")

  UpdateRelStyle(config, controller, $offsetX="-60", $offsetY="-25")
  UpdateRelStyle(service, util, $offsetX="-60", $offsetY="-25")
  UpdateLayoutConfig($c4ShapeInRow="2", $c4BoundaryInRow="1")
```

Public routes (`SecurityConfig.java`): `POST /auth/google`, `GET /events/{shortId}`, `GET /events/{shortId}/summary` and Swagger. Everything else needs the API JWT.
