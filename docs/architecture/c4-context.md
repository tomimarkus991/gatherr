<!-- generated from cc3503d80c4e, 2026-05-06 -->
<!-- c4-map config e854e651d5aa -->

# System context: Gatherr

Who uses Gatherr and which outside systems it depends on. Drawn from [docs/c4/level-1.md](../c4/level-1.md). Next level down: [containers](c4-containers.md).

```mermaid
C4Context
  title System context: Gatherr

  Person(organiser, "Organiser", "Creates events, reads heatmap")
  Person(participant, "Participant", "Marks availability")
  System(gatherr, "Gatherr", "Group scheduling with heatmap")
  System_Ext(google, "Google Identity", "Sign-in, ID tokens")
  System_Ext(gfonts, "Google Fonts", "Web fonts")

  Rel(organiser, gatherr, "Creates events", "HTTPS")
  Rel(participant, gatherr, "Responds", "HTTPS")
  Rel(gatherr, google, "Verifies sign-in", "OIDC")
  Rel(gatherr, gfonts, "Loads fonts", "HTTPS")

  UpdateRelStyle(gatherr, google, $offsetX="-45", $offsetY="-30")
  UpdateLayoutConfig($c4ShapeInRow="2", $c4BoundaryInRow="1")
```

Google is the only way to sign in. Google Calendar import is planned (PRs #68 and #69) but not yet live.
