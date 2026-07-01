# RadioCalico System Architecture

## Complete System Overview

```mermaid
graph TB
    subgraph "Client Layer"
        Browser["🌐 Web Browser<br/>Chrome/Firefox/Safari/Edge"]
        HLS["HLS.js Library<br/>Stream Playback"]
    end

    subgraph "Development Stack"
        DevExpress["Express.js<br/>Port 3000"]
        SQLiteDB["SQLite<br/>Local File"]
        DevServer["nodemon<br/>Hot-reload"]
    end

    subgraph "Production Stack"
        subgraph "Web Layer"
            Nginx["nginx Alpine<br/>Port 80/3001<br/>Reverse Proxy"]
        end
        
        subgraph "API Layer"
            ExpressAPI["Express.js<br/>Port 3000<br/>API Only"]
            PoolConnection["Connection Pool<br/>20 Max Connections"]
        end
        
        subgraph "Database Layer"
            PostgreSQL["PostgreSQL 16<br/>Port 5432<br/>Production DB"]
            WAL["WAL Mode<br/>Atomic Writes"]
        end
    end

    subgraph "HLS Streaming"
        HLSStream["HLS Stream Generator<br/>ID3 Metadata"]
        Segments["MPEG-TS Segments<br/>Cached 5s"]
        Manifest["M3u8 Manifest<br/>Playlist"]
    end

    subgraph "Data Models"
        Users["Users Table<br/>Accounts"]
        Tracks["Played Tracks Table<br/>History"]
        Ratings["Ratings Table<br/>UNIQUE Constraint"]
    end

    subgraph "API Endpoints"
        HealthEP["GET /health<br/>Status Check"]
        NowPlayingEP["GET/POST /api/now-playing<br/>Track Management"]
        RateEP["POST /api/rate<br/>Rating Submission"]
        RatingsEP["GET /api/ratings/:title<br/>Rating Retrieval"]
        RecentEP["GET /api/recently-played<br/>History"]
        UsersEP["GET/POST /api/users<br/>User Management"]
    end

    subgraph "Features"
        Rating["Rating System<br/>Thumbs Up/Down"]
        Session["Session Management<br/>localStorage"]
        VolumeCtrl["Volume Control<br/>Persistent"]
        Visualizer["Waveform Visualizer<br/>Animations"]
        Vinyl["Spinning Vinyl<br/>Animation"]
    end

    subgraph CICD["CI/CD Pipeline"]
        GitHub["GitHub Actions"]
        Testing["Unit Tests<br/>Integration Tests"]
        Security["Security Scanning<br/>npm audit, Trivy"]
        Docker["Docker Build"]
    end

    %% Client connections
    Browser -->|HTTP/HTTPS| Nginx
    Browser -->|HTTP/HTTPS| DevExpress
    Browser -->|Fetch HLS| HLSStream
    HLS -->|Parse ID3| Segments

    %% Development stack
    DevExpress -->|Auto-reload| DevServer
    DevExpress -->|Query/Persist| SQLiteDB
    DevExpress -->|Generate| HLSStream

    %% Production stack - Web Layer
    Nginx -->|Reverse Proxy| ExpressAPI
    Nginx -->|Serve Static| Browser
    Nginx -->|Cache Assets| Manifest
    Nginx -->|Cache Segments| Segments

    %% Production stack - API Layer
    ExpressAPI -->|Query| PoolConnection
    PoolConnection -->|Connect| PostgreSQL
    ExpressAPI -->|Generate| HLSStream

    %% Database connections
    PostgreSQL -->|Store| Users
    PostgreSQL -->|Store| Tracks
    PostgreSQL -->|Store| Ratings
    PostgreSQL -->|WAL Mode| WAL

    %% HLS Streaming
    HLSStream -->|Create| Segments
    HLSStream -->|Generate| Manifest
    Segments -->|Include| Ratings

    %% API Endpoints
    ExpressAPI -->|Implements| HealthEP
    ExpressAPI -->|Implements| NowPlayingEP
    ExpressAPI -->|Implements| RateEP
    ExpressAPI -->|Implements| RatingsEP
    ExpressAPI -->|Implements| RecentEP
    ExpressAPI -->|Implements| UsersEP

    %% Features
    Browser -->|Uses| Rating
    Browser -->|Uses| Session
    Browser -->|Uses| VolumeCtrl
    Browser -->|Uses| Visualizer
    Browser -->|Uses| Vinyl

    %% CI/CD
    GitHub -->|Runs| Testing
    GitHub -->|Runs| Security
    GitHub -->|Builds| Docker
    Docker -->|Creates| Nginx
    Docker -->|Creates| ExpressAPI
    Docker -->|Creates| PostgreSQL

    %% Styling
    classDef client fill:#e1f5ff,stroke:#01579b,stroke-width:2px
    classDef dev fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    classDef prod fill:#e8f5e9,stroke:#1b5e20,stroke-width:2px
    classDef data fill:#fce4ec,stroke:#880e4f,stroke-width:2px
    classDef api fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef streaming fill:#f1f8e9,stroke:#33691e,stroke-width:2px
    classDef ci fill:#ede7f6,stroke:#311b92,stroke-width:2px

    class Browser,HLS client
    class DevExpress,SQLiteDB,DevServer dev
    class Nginx,ExpressAPI,PostgreSQL,PoolConnection,WAL prod
    class Users,Tracks,Ratings data
    class HealthEP,NowPlayingEP,RateEP,RatingsEP,RecentEP,UsersEP api
    class HLSStream,Segments,Manifest streaming
    class CICD ci
```

---

## Development vs Production Architecture

### Development Architecture (Single Container)

```mermaid
graph LR
    Client["🌐 Browser<br/>localhost:3000"]
    
    subgraph DevStack ["dev Container"]
        ExpressServer["Express.js Server<br/>+ Static Files<br/>+ API Routes"]
        SQLiteDB["SQLite Database<br/>db/radiocalico.db<br/>In-memory for tests"]
        HLS["HLS Stream Generator<br/>ID3 Metadata"]
        Nodemon["nodemon<br/>Auto-reload"]
    end

    Client -->|HTTP| ExpressServer
    ExpressServer -->|CRUD| SQLiteDB
    ExpressServer -->|Generate| HLS
    ExpressServer -.->|Watch| Nodemon
    Client -->|Play| HLS

    classDef dev fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    classDef client fill:#e1f5ff,stroke:#01579b,stroke-width:2px
    class DevStack dev
    class Client client
```

### Production Architecture (Multi-Service)

```mermaid
graph TB
    Client["🌐 Browser<br/>External Users"]
    
    subgraph ProdStack ["Production Environment"]
        subgraph WebLayer ["Web Server"]
            Nginx["nginx Alpine<br/>Port 3001 ← 80<br/>- Reverse Proxy<br/>- Static Files<br/>- Compression<br/>- Security Headers"]
        end
        
        subgraph APILayer ["API Server"]
            Express["Express.js Alpine<br/>Port 3000 Internal<br/>- REST API<br/>- HLS Generation<br/>- Request Validation"]
            Pool["Connection Pool<br/>20 Max Concurrent"]
        end
        
        subgraph DBLayer ["Data Layer"]
            Postgres["PostgreSQL Alpine<br/>Port 5432 Internal<br/>- Relational DB<br/>- ACID Compliance<br/>- Connection Pooling"]
        end
    end

    Client -->|HTTP/HTTPS| Nginx
    Nginx -->|Proxy /api/*| Express
    Nginx -->|Serve *.js|*.css| Client
    Express -->|Pool| Pool
    Pool -->|Query| Postgres
    Express -->|Generate| HLS["HLS Streams<br/>ID3 Metadata"]
    HLS -->|Cached 5s| Nginx
    Client -->|Play| HLS

    classDef prod fill:#e8f5e9,stroke:#1b5e20,stroke-width:2px
    classDef client fill:#e1f5ff,stroke:#01579b,stroke-width:2px
    class ProdStack prod
    class Client client
```

---

## Data Flow Diagram

```mermaid
sequenceDiagram
    actor User
    participant Browser
    participant nginx
    participant Express
    participant HLS
    participant PostgreSQL
    participant Session

    User->>Browser: Opens /
    Browser->>nginx: GET /
    nginx->>Express: Proxy to API
    Express->>Browser: Serves index.html
    
    Browser->>Session: Check sessionId
    Session-->>Browser: Unique session stored

    User->>Browser: Click Play
    Browser->>nginx: GET /live.m3u8
    nginx->>Express: Generate manifest
    Express->>HLS: Create segments
    HLS->>Browser: Stream with ID3

    User->>Browser: Submit rating (👍)
    Browser->>nginx: POST /api/rate
    nginx->>Express: Rate request
    Express->>PostgreSQL: UPSERT rating
    PostgreSQL-->>Express: Confirmed
    Express-->>Browser: Rating saved

    User->>Browser: View counts
    Browser->>nginx: GET /api/ratings/:title
    nginx->>Express: Query ratings
    Express->>PostgreSQL: SELECT aggregates
    PostgreSQL-->>Express: thumbsUp: 5, thumbsDown: 2
    Express-->>Browser: Display counts
```

---

## Database Schema Diagram

```mermaid
erDiagram
    USERS ||--o{ RATINGS : has
    PLAYED_TRACKS ||--o{ RATINGS : recorded_as
    RATINGS }o--|| USERS : "rated_by"
    RATINGS }o--|| PLAYED_TRACKS : "for_track"

    USERS {
        int id PK
        string name
        string email UK
        datetime created_at
    }

    PLAYED_TRACKS {
        int id PK
        string title
        string artist
        datetime played_at
    }

    RATINGS {
        int id PK
        string session_id
        string track_title FK
        string track_artist FK
        int rating "1 or -1"
        datetime created_at
        unique "session_id, track_title, track_artist"
    }
```

---

## Deployment Architecture

```mermaid
graph TB
    subgraph Dev ["Development Environment"]
        DevDocker["Docker Container<br/>radiocalico-dev"]
        DevDir["Local Directory Volume<br/>Hot-reload"]
    end

    subgraph Prod ["Production Environment"]
        subgraph Services ["Docker Services"]
            PG["radiocalico-db-postgres<br/>PostgreSQL 16 Alpine"]
            API["radiocalico-api<br/>Node 22 Alpine"]
            WEB["radiocalico-web<br/>nginx Alpine"]
        end
        
        subgraph Volumes ["Persistent Storage"]
            DBVolume["radiocalico-db-postgres-data<br/>PostgreSQL Data"]
        end
        
        subgraph Network ["Docker Network"]
            BridgeNet["radiocalico-network<br/>Bridge Network"]
        end
    end

    subgraph Registry ["Container Registry"]
        DockerHub["Docker Hub<br/>or Private Registry"]
    end

    subgraph CI["CI/CD Pipeline"]
        GitHub["GitHub Actions"]
        Tests["Tests & Scans"]
        Build["Build & Push"]
    end

    GitHub -->|Tests| Tests
    Tests -->|Pass| Build
    Build -->|Push| DockerHub
    DockerHub -->|Pull| Dev
    DockerHub -->|Pull| Prod

    Dev -->|Volume Bind| DevDir
    
    PG -->|Data| DBVolume
    API -->|Connect| BridgeNet
    WEB -->|Connect| BridgeNet
    PG -->|Connect| BridgeNet

    classDef dev fill:#f3e5f5,stroke:#4a148c
    classDef prod fill:#e8f5e9,stroke:#1b5e20
    classDef ci fill:#ede7f6,stroke:#311b92

    class Dev dev
    class Prod,Services,Volumes,Network prod
    class CI ci
```

---

## Port Mapping & Networking

```mermaid
graph LR
    subgraph External["External Network"]
        UserBrowser["User Browser<br/>localhost:3001<br/>or<br/>remote-server:3001"]
    end

    subgraph Docker["Docker Network: radiocalico-network"]
        subgraph NGINXContainer["nginx Container<br/>radiocalico-web"]
            Port80["Port 80 Internal<br/>Exposed as 3001"]
            StaticFiles["Static Files<br/>public/"]
            ReverseProxy["Reverse Proxy<br/>to API"]
        end

        subgraph APIContainer["API Container<br/>radiocalico-api"]
            Port3000["Port 3000<br/>Internal Only"]
            Routes["Express Routes<br/>HLS Generator"]
        end

        subgraph DBContainer["Database Container<br/>radiocalico-db-postgres"]
            Port5432["Port 5432<br/>Internal Only"]
            PSQL["PostgreSQL Engine"]
        end
    end

    UserBrowser -->|localhost:3001| Port80
    Port80 -->|/api/routes| ReverseProxy
    ReverseProxy -->|:3000/api| Port3000
    Port80 -->|static files| StaticFiles
    Port3000 -->|Queries| Port5432
    Port5432 -->|Tables| PSQL

    classDef external fill:#e1f5ff,stroke:#01579b
    classDef internal fill:#fff9c4,stroke:#f57f17
    classDef services fill:#e8f5e9,stroke:#1b5e20

    class External external
    class Port80,Port3000,Port5432,ReverseProxy internal
    class NGINXContainer,APIContainer,DBContainer services
```

---

## Security Layers

```mermaid
graph TB
    subgraph NetSec["Network Security"]
        HTTPS["TLS/HTTPS Termination<br/>Reverse Proxy"]
        Headers["Security Headers<br/>X-Frame, X-Content-Type"]
        CORS["CORS Configuration"]
    end

    subgraph AppSec["Application Security"]
        InputValidation["Input Validation<br/>Request Sanitization"]
        Pooling["Connection Pooling<br/>Rate Limiting"]
        SessionMgmt["Session Management<br/>localStorage"]
    end

    subgraph DBSec["Database Security"]
        Constraints["Constraints<br/>UNIQUE, CHECK"]
        Indexes["Indexes<br/>Query Optimization"]
        Encryption["Encryption<br/>Password Hashing"]
    end

    subgraph ContainerSec["Container Security"]
        NonRoot["Non-root User<br/>UID 1001"]
        Alpine["Minimal Base Images<br/>Alpine Linux"]
        ReadOnly["Read-only Filesystem"]
    end

    subgraph CISec["CI/CD Security"]
        NPMAudit["npm audit<br/>Dependency Scan"]
        SecretScan["Secret Scanning"]
        TrivyTool["Container Scanning"]
        SASTTool["Code Analysis"]
    end

    Client["Client Layer"]
    Client -->|HTTPS| HTTPS
    HTTPS -->|Headers| Headers
    Headers -->|Validate| InputValidation
    InputValidation -->|Pool| Pooling
    Pooling -->|Session| SessionMgmt
    SessionMgmt -->|Stored| Constraints
    Constraints -->|Speed| Indexes
    Indexes -->|Protect| Encryption
    
    Build["Build Process"]
    Build -->|Scan| NPMAudit
    Build -->|Detect| SecretScan
    Build -->|Security| TrivyTool
    Build -->|Analyze| SASTTool
    
    Build -->|Create| Alpine
    Alpine -->|Run as| NonRoot
    NonRoot -->|Limit| ReadOnly

    classDef security fill:#ffebee,stroke:#b71c1c,stroke-width:2px
    class NetSec,AppSec,DBSec,ContainerSec,CISec security
```

---

## Component Interactions

```mermaid
graph TB
    subgraph Frontend["Frontend Layer"]
        HTML["HTML/CSS/JS<br/>public/index.html<br/>public/style.css"]
        HLSjs["HLS.js Library<br/>Stream Playback"]
        RatingUI["Rating Buttons<br/>Session Management"]
    end

    subgraph Backend["Backend Layer"]
        ServerDev["server.js (Dev)<br/>or"]
        ServerAPI["server-api.js (Prod)"]
        RoutesFile["routes.js (Dev)<br/>or"]
        RoutesPostgres["routes-postgres.js (Prod)"]
    end

    subgraph Database["Data Access Layer"]
        DBSQLite["db.js<br/>SQLite"]
        DBPostgres["db-postgres.js<br/>PostgreSQL"]
    end

    subgraph Storage["Data Storage"]
        SQLiteFile["db/radiocalico.db"]
        PostgresDB["PostgreSQL Cluster"]
    end

    HTML -->|Fetch API| ServerDev
    HTML -->|Fetch API| ServerAPI
    HLSjs -->|Play Stream| ServerDev
    HLSjs -->|Play Stream| ServerAPI
    RatingUI -->|POST /rate| RoutesFile
    RatingUI -->|POST /rate| RoutesPostgres
    
    ServerDev -->|Use| RoutesFile
    ServerAPI -->|Use| RoutesPostgres
    
    RoutesFile -->|Query| DBSQLite
    RoutesPostgres -->|Query| DBPostgres
    
    DBSQLite -->|Read/Write| SQLiteFile
    DBPostgres -->|Read/Write| PostgresDB

    classDef ui fill:#e3f2fd,stroke:#1565c0
    classDef backend fill:#f3e5f5,stroke:#6a1b9a
    classDef data fill:#fce4ec,stroke:#c2185b
    classDef storage fill:#fff9c4,stroke:#f57f17

    class Frontend ui
    class Backend backend
    class Database data
    class Storage storage
```

---

## Technology Stack Matrix

```mermaid
graph LR
    subgraph FrontendLayer["Frontend<br/>Browser"]
        F1["HTML5"]
        F2["CSS3"]
        F3["Vanilla JS"]
        F4["HLS.js"]
        F5["localStorage"]
    end

    subgraph DevStack["Development"]
        D1["Node.js 22"]
        D2["Express.js 5"]
        D3["SQLite"]
        D4["nodemon"]
        D5["Jest"]
    end

    subgraph ProdStack["Production"]
        P1["Node.js 22"]
        P2["Express.js 5"]
        P3["PostgreSQL 16"]
        P4["nginx"]
        P5["pg driver"]
    end

    subgraph DevOpsTools["DevOps"]
        DO1["Docker"]
        DO2["Docker Compose"]
        DO3["GitHub Actions"]
        DO4["Trivy"]
    end

    FrontendLayer -->|API Calls| DevStack
    FrontendLayer -->|API Calls| ProdStack
    DevStack -->|Run| D1
    D1 -->|Framework| D2
    D2 -->|Database| D3
    D2 -->|Testing| D5
    D3 -.->|Watch| D4
    
    ProdStack -->|Runtime| P1
    P1 -->|API| P2
    P2 -->|Connect| P5
    P5 -->|DB| P3
    P4 -->|Proxy| P2
    
    DO1 -->|Orchestrate| DO2
    DO3 -->|Build| DO1
    DO3 -->|Scan| DO4

    classDef f fill:#e3f2fd,stroke:#1565c0
    classDef d fill:#f3e5f5,stroke:#6a1b9a
    classDef p fill:#e8f5e9,stroke:#1b5e20
    classDef do fill:#ede7f6,stroke:#311b92

    class FrontendLayer f
    class DevStack d
    class ProdStack p
    class DevOpsTools do
```

---

## Key Statistics

| Component | Dev | Prod |
|---|---|---|
| **Containers** | 1 | 3 |
| **Image Size** | 670MB | 179MB (API) + 50MB (nginx) + 250MB (postgres) |
| **Database** | SQLite (file) | PostgreSQL (network) |
| **Startup Time** | ~2s | ~8s |
| **Health Checks** | Yes | Yes (all 3 services) |
| **Auto-reload** | Yes (nodemon) | No (production) |
| **Caching** | App-level | nginx + database |
| **Concurrency** | Single-threaded | 20 DB connections |
| **Scaling** | N/A | Horizontal (multiple API instances) |

---

## Deployment Flow

```mermaid
graph LR
    Git["Git Repository<br/>GitHub"]
    CI["GitHub Actions<br/>CI/CD"]
    
    Git -->|Push| CI
    CI -->|Test| Testing["Unit Tests<br/>Integration Tests"]
    CI -->|Scan| Security["npm audit<br/>Trivy"]
    Testing -->|Pass| Build["Build Docker Images"]
    Security -->|Pass| Build
    
    Build -->|Dev| DevImg["radiocalico:dev<br/>670MB"]
    Build -->|Prod API| ProdImg["radiocalico:prod<br/>179MB"]
    
    Build -->|Push to| Registry["Docker Registry<br/>Docker Hub"]
    
    Registry -->|Pull| DevEnv["Developer Machine<br/>docker-compose"]
    Registry -->|Pull| ProdEnv["Production Server<br/>docker-compose"]
    
    DevEnv -->|localhost:3000| DevUser["Developer"]
    ProdEnv -->|hostname:3001| Users["Users"]

    classDef source fill:#e3f2fd,stroke:#1565c0
    classDef pipeline fill:#ede7f6,stroke:#311b92
    classDef images fill:#f3e5f5,stroke:#6a1b9a
    classDef registry fill:#fff9c4,stroke:#f57f17
    classDef deploy fill:#e8f5e9,stroke:#1b5e20
    classDef user fill:#ffebee,stroke:#b71c1c

    class Git source
    class CI,Testing,Security,Build pipeline
    class DevImg,ProdImg images
    class Registry registry
    class DevEnv,ProdEnv deploy
    class DevUser,Users user
```

---

## System Scalability

```mermaid
graph TB
    subgraph CurrentSetup["Current Single-Instance"]
        Dev1["1 Dev Instance"]
        Prod1["1 nginx, 1 API, 1 PostgreSQL"]
    end

    subgraph HorizontalScale["Horizontal Scaling"]
        LB["Load Balancer<br/>HAProxy"]
        N1["nginx 1"]
        N2["nginx 2"]
        N3["nginx 3"]
        API1["API 1"]
        API2["API 2"]
        API3["API 3"]
        PG["PostgreSQL<br/>Primary"]
    end

    subgraph VerticalScale["Vertical Scaling"]
        Docker["Docker Swarm"]
        K8s["Kubernetes"]
    end

    CurrentSetup -->|Add Instances| HorizontalScale
    LB -->|Route| N1
    LB -->|Route| N2
    LB -->|Route| N3
    N1 -->|Proxy| API1
    N2 -->|Proxy| API2
    N3 -->|Proxy| API3
    API1 -->|Connect| PG
    API2 -->|Connect| PG
    API3 -->|Connect| PG
    
    CurrentSetup -->|Upgrade Resources| VerticalScale
    HorizontalScale -->|Managed by| Docker
    HorizontalScale -->|Managed by| K8s

    classDef current fill:#fff9c4,stroke:#f57f17
    classDef scale fill:#e8f5e9,stroke:#1b5e20
    classDef orch fill:#ede7f6,stroke:#311b92

    class CurrentSetup current
    class HorizontalScale,VerticalScale scale
    class Docker,K8s orch
```
