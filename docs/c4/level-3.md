<!-- generated from cc3503d80c4e, 2026-05-06 -->
<!-- c4-map config e854e651d5aa -->

> **Agent context map.** Dense on purpose and not laid out for viewing; labels may overlap when rendered. Diagrams for people: [docs/architecture/](../architecture/).

# Level 3: Components

Generated from source imports. A component is a directory (or package) at the configured depth; an arrow means code in one component imports the other, labelled with what it imports. Container context: [level-2.md](level-2.md).

## Backend API (Spring Boot)

Root `backend/src/main/java`, depth 1.

```mermaid
C4Component
  title Components of Backend API (Spring Boot)

  Container_Boundary(api_b, "Backend API (Spring Boot)") {
    Component(api__root, "Application", "Spring Boot", "Boots the app and seeds dev data (2 files)")
    Component(api_config, "Config", "Spring Security, springdoc", "Security filter chain, JWT and OpenAPI setup (3 files)")
    Component(api_controller, "Controllers", "Spring Web", "REST endpoints for auth, users, events, availability (5 files)")
    Component(api_dto, "DTOs", "Jakarta Validation, Lombok", "Request and response payloads (11 files)")
    Component(api_mapper, "Mappers", "MapStruct", "Maps users to response DTOs (1 files)")
    Component(api_model, "Model", "JPA, Hibernate", "User, Event and EventUser entities (4 files)")
    Component(api_repository, "Repositories", "Spring Data JPA", "Database access for users and events (3 files)")
    Component(api_service, "Services", "Spring, Transactions", "Auth, JWT, event and availability logic (5 files)")
    Component(api_util, "Utilities", "Spring Security", "JWT helpers and short-ID word lists (2 files)")
  }

  Rel(api__root, api_model, "uses", "Event, EventType, EventUser +1")
  Rel(api__root, api_repository, "uses", "EventRepository, EventUserRepository, UserRepository")
  Rel(api_controller, api_dto, "uses", "AuthRequestDto, AuthResponseDto, CreateEventDto +5")
  Rel(api_controller, api_service, "uses", "AuthService, AvailabilityService, EventService +1")
  Rel(api_controller, api_util, "uses", "JwtUtils")
  Rel(api_dto, api_model, "uses", "Event, EventType")
  Rel(api_mapper, api_dto, "uses", "UpdateUserDto, UserResponseDto")
  Rel(api_mapper, api_model, "uses", "User")
  Rel(api_repository, api_model, "uses", "Event, EventUser, User")
  Rel(api_service, api_dto, "uses", "AuthRequestDto, AuthResponseDto, CreateEventDto +8")
  Rel(api_service, api_mapper, "uses", "UserMapper")
  Rel(api_service, api_model, "uses", "Event, EventUser, User")
  Rel(api_service, api_repository, "uses", "EventRepository, EventUserRepository, UserRepository")
  Rel(api_service, api_util, "uses", "WordConstants")
```

## Frontend SPA (React)

Root `frontend/src`, depth 1.

```mermaid
C4Component
  title Components of Frontend SPA (React)

  Container_Boundary(web_b, "Frontend SPA (React)") {
    Component(web__root, "App shell", "TanStack Router, t3-env", "Router setup and typed env variables (3 files)")
    Component(web_api, "API types", "openapi-typescript", "Generated types from the backend OpenAPI (1 files)")
    Component(web_components, "Components", "React, motion, Radix", "UI primitives and page sections (29 files)")
    Component(web_hooks, "Data hooks", "TanStack Query", "Queries and mutations against the API (13 files)")
    Component(web_integrations, "Query provider", "TanStack Query", "Query client, devtools and app init (3 files)")
    Component(web_lib, "Lib", "axios, date-fns-tz", "HTTP client, timezone and class helpers (4 files)")
    Component(web_mocks, "Mocks", "MSW, faker", "Mock API handlers and demo data (5 files)")
    Component(web_routes, "Routes", "TanStack Router", "Home, create and event pages (4 files)")
  }

  Rel(web__root, web_integrations, "uses", "integrations/tanstack-query/root-provider")
  Rel(web__root, web_routes, "uses", "routes/__root, routes/create, routes/e/$shortId +1")
  Rel(web_components, web_api, "uses", "api/types.gen")
  Rel(web_components, web_hooks, "uses", "hooks/mutation/useDeleteEvent, hooks/mutation/useGoogleAuth, hooks/mutation/useLogout +4")
  Rel(web_components, web_lib, "uses", "lib/timezone, lib/utils")
  Rel(web_components, web_mocks, "uses", "mocks/types")
  Rel(web_hooks, web__root, "uses", "env")
  Rel(web_hooks, web_api, "uses", "api/types.gen")
  Rel(web_hooks, web_lib, "uses", "lib/axios")
  Rel(web_integrations, web_hooks, "uses", "hooks/query/useGetMe")
  Rel(web_routes, web__root, "uses", "env")
  Rel(web_routes, web_components, "uses", "components/icons/GoogleIcon, components/icons/GradientIcon, components/ui/ComponentExplainer +13")
  Rel(web_routes, web_hooks, "uses", "hooks/mutation/useCreateEvent, hooks/mutation/useGoogleAuth, hooks/mutation/useRespondToEvent +2")
  Rel(web_routes, web_integrations, "uses", "integrations/tanstack-query/devtools, integrations/tanstack-query/root-provider")
  Rel(web_routes, web_lib, "uses", "lib/site, lib/utils")
  Rel(web_routes, web_mocks, "uses", "mocks/index, mocks/types")
```
