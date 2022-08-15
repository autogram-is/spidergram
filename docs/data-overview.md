# Data Storage Overview

Spidergram's core consists of the UNIQUE-URL and RESOURCE data types, linked by RESPONDS-WITH and LINKS-TO relationships. Other Spidergram plugins add additional domain concepts and relationships to capture design pattern usage, different hierarchies for organizing the site's content, ownership of different portions of the site by individuals or groups, and more.

Storage-intensive data for individual resources (or other entities) can be handled by the PAYLOAD entity. Raw text, filepaths, etc can be stored here for fast loading on a per-Resource basis.

```mermaid
erDiagram
    UNIQUE-URL {
        string url
        string referer
        data parsed
        int depth
    }
    RESOURCE {
        string url
        int responseCode
        data headers
    }

    HIERARCHY-ITEM {
        string name
        string family
        string description
        data rules
    }

    PATTERN {
        string name
        string description
        string documentation
    }

    OWNER name
        string description
    }

    PAYLOAD {
        string type
        blob data
    }

    RESOURCE ||--o{ PAYLOAD : has
    UNIQUE-URL ||--o| RESOURCE : RespondsWith
    RESOURCE }o--o{ UNIQUE-URL : LinksTo
    RESOURCE }o--o{ HIERARCHY-ITEM : LivesAt
    HIERARCHY-ITEM |o--o{ HIERARCHY-ITEM : HasParent
    PATTERN }o--o{ RESOURCE : OccursOn
    OWNER }o--o{ RESOURCE : IsResponsibleFor
    OWNER }o--o{ HIERARCHY-ITEM : IsResponsibleFor
```