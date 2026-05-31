# DataShare — Sequence Diagrams

## Flux A — Registration + Login (US03 + US04)

```mermaid
sequenceDiagram
    actor User as Browser
    participant API as NestJS API
    participant DB as PostgreSQL

    Note over User, DB: US03 — Registration
    User->>API: POST /api/auth/register<br/>{email, password}
    API->>API: Validate email format<br/>Validate password (min 8 chars)
    API->>DB: SELECT User WHERE email = ?
    alt Email already exists
        DB-->>API: User found
        API-->>User: 409 Conflict<br/>{error: {code: "Conflict", message: "Email already registered"}}
    else Email available
        DB-->>API: No result
        API->>API: Hash password (bcrypt, 12 rounds)
        API->>DB: INSERT User (id, email, password_hash)
        DB-->>API: User created
        API-->>User: 201 Created<br/>{id, email, created_at}
    end

    Note over User, DB: US04 — Login
    User->>API: POST /api/auth/login<br/>{email, password}
    API->>DB: SELECT User WHERE email = ?
    alt User not found
        DB-->>API: No result
        API-->>User: 401 Unauthorized<br/>{error: {code: "Unauthorized", message: "Invalid credentials"}}
    else User found
        DB-->>API: User record
        API->>API: Verify bcrypt(password, password_hash)
        alt Password mismatch
            API-->>User: 401 Unauthorized<br/>{error: {code: "Unauthorized", message: "Invalid credentials"}}
        else Password valid
            API->>API: Generate JWT access token (15min)<br/>{sub: user_id, email}
            API->>API: Generate refresh token (UUID v4)
            API->>API: Hash refresh token (bcrypt)
            API->>DB: INSERT RefreshToken (user_id, token_hash, expires_at)
            DB-->>API: OK
            API-->>User: 200 OK<br/>{access_token, token_type: "Bearer"}<br/>+ Set-Cookie: refresh_token (HttpOnly, Secure, 7d)
        end
    end
```

---

## Flux B — File Upload with Account (US01 + US09)

```mermaid
sequenceDiagram
    actor User as Browser
    participant API as NestJS API
    participant S3 as MinIO
    participant DB as PostgreSQL

    User->>API: POST /api/files<br/>Authorization: Bearer {JWT}<br/>multipart/form-data: {file, expires_in?, password?}
    API->>API: Validate JWT → extract user_id
    alt JWT invalid or expired
        API-->>User: 401 Unauthorized
    else JWT valid
        API->>API: Validate file:<br/>- Size ≤ 1 GB<br/>- Extension not forbidden (.exe, .bat...)
        alt Validation fails
            API-->>User: 400 Bad Request<br/>{error: {code: "ValidationError"}}
        else File valid
            API->>API: Generate storage_key: {uuid}/{original_name}
            opt Password provided (US09)
                API->>API: Hash password (bcrypt)
            end
            API->>S3: PUT object (storage_key, file stream)
            S3-->>API: OK (ETag)
            API->>DB: INSERT File (user_id, original_name, storage_key,<br/>mime_type, size_bytes, password_hash, expires_at)
            DB-->>API: File record
            API->>API: Generate download token (UUID v4)
            API->>DB: INSERT DownloadToken (file_id, token, expires_at)
            DB-->>API: DownloadToken record
            API-->>User: 201 Created<br/>{file_id, original_name, size_bytes,<br/>download_url, expires_at}
        end
    end
```

---

## Flux C — Download via Link (US02)

```mermaid
sequenceDiagram
    actor Client as Browser (Public)
    participant API as NestJS API
    participant DB as PostgreSQL
    participant S3 as MinIO

    Note over Client, S3: Step 1 — Get file info before download
    Client->>API: GET /api/download/{token}/info
    API->>DB: SELECT DownloadToken WHERE token = ?
    alt Token not found
        API-->>Client: 404 Not Found<br/>{error: {code: "NotFound"}}
    else Token found
        API->>API: Check expires_at > NOW()
        alt Token expired
            API-->>Client: 410 Gone<br/>{error: {code: "LinkExpired"}}
        else Token valid
            API->>DB: SELECT File WHERE id = file_id
            DB-->>API: File metadata
            API-->>Client: 200 OK<br/>{filename, size_bytes, mime_type,<br/>expires_at, password_required: bool}
        end
    end

    Note over Client, S3: Step 2 — Download file
    Client->>API: GET /api/download/{token}<br/>?password=*** (if required)
    API->>DB: SELECT DownloadToken + File WHERE token = ?
    API->>API: Verify token not expired
    opt File is password-protected (US09)
        API->>API: Verify bcrypt(password, file.password_hash)
        alt Password wrong
            API-->>Client: 403 Forbidden<br/>{error: {code: "PasswordRequired"}}
        end
    end
    API->>S3: Generate presigned GET URL (TTL 5min)
    S3-->>API: Presigned URL
    API->>DB: UPDATE DownloadToken SET download_count = download_count + 1
    DB-->>API: OK
    API-->>Client: 302 Redirect → presigned URL
    Client->>S3: GET (presigned URL)
    S3-->>Client: File stream (binary)
```

---

## Flux D — Anonymous Upload (US07)

```mermaid
sequenceDiagram
    actor User as Browser (Anonymous)
    participant API as NestJS API
    participant S3 as MinIO
    participant DB as PostgreSQL

    User->>API: POST /api/files/anonymous<br/>multipart/form-data: {file, expires_in?}
    Note over API: No JWT verification — public endpoint
    API->>API: Validate file:<br/>- Size ≤ 1 GB<br/>- Extension not forbidden
    alt Validation fails
        API-->>User: 400 Bad Request<br/>{error: {code: "ValidationError"}}
    else File valid
        API->>API: Generate storage_key: {uuid}/{original_name}
        API->>S3: PUT object (storage_key, file stream)
        S3-->>API: OK (ETag)
        API->>DB: INSERT File (user_id=NULL, original_name,<br/>storage_key, mime_type, size_bytes, expires_at)
        DB-->>API: File record
        API->>API: Generate download token (UUID v4)
        API->>DB: INSERT DownloadToken (file_id, token, expires_at)
        DB-->>API: DownloadToken record
        API-->>User: 201 Created<br/>{download_url, expires_at}
        Note over User: No history, no file management
    end
```

---

## Flux E — File History (US05)

```mermaid
sequenceDiagram
    actor User as Browser
    participant API as NestJS API
    participant DB as PostgreSQL

    User->>API: GET /api/files<br/>Authorization: Bearer {JWT}
    API->>API: Validate JWT → extract user_id
    alt JWT invalid
        API-->>User: 401 Unauthorized
    else JWT valid
        API->>DB: SELECT * FROM File<br/>WHERE user_id = ? AND is_deleted = false<br/>ORDER BY created_at DESC
        DB-->>API: List of files
        API->>API: For each file: compute link_status<br/>(expires_at > NOW() → "valid", else → "expired")
        API-->>User: 200 OK<br/>[{id, original_name, size_bytes, mime_type,<br/>created_at, expires_at, link_status,<br/>download_url}, ...]
    end
```

---

## Flux F — File Deletion (US06)

```mermaid
sequenceDiagram
    actor User as Browser
    participant API as NestJS API
    participant DB as PostgreSQL
    participant S3 as MinIO

    User->>API: DELETE /api/files/{id}<br/>Authorization: Bearer {JWT}
    API->>API: Validate JWT → extract user_id
    API->>DB: SELECT File WHERE id = ?
    alt File not found
        API-->>User: 404 Not Found
    else File found
        API->>API: Check file.user_id == user_id
        alt Not the owner
            API-->>User: 403 Forbidden<br/>{error: {code: "Forbidden"}}
        else Owner confirmed
            API->>S3: DELETE object (storage_key)
            S3-->>API: OK
            API->>DB: UPDATE File SET is_deleted = true
            DB-->>API: OK
            API->>DB: UPDATE DownloadToken<br/>SET expires_at = NOW()<br/>WHERE file_id = ?
            DB-->>API: OK (tokens invalidated)
            API-->>User: 204 No Content
            Note over User: Irreversible — file physically<br/>deleted from MinIO
        end
    end
```

---

## Flux G — Tag Management (US08)

```mermaid
sequenceDiagram
    actor User as Browser
    participant API as NestJS API
    participant DB as PostgreSQL

    Note over User, DB: Add tags to a file
    User->>API: POST /api/files/{id}/tags<br/>Authorization: Bearer {JWT}<br/>{tags: ["design", "client-x"]}
    API->>API: Validate JWT → extract user_id
    API->>DB: SELECT File WHERE id = ? AND user_id = ?
    alt File not found or not owner
        API-->>User: 403 Forbidden
    else Owner confirmed
        loop For each tag name
            API->>DB: UPSERT Tag (name) → get tag_id
            API->>DB: INSERT FileTag (file_id, tag_id)<br/>ON CONFLICT DO NOTHING
        end
        API->>DB: SELECT Tags WHERE FileTag.file_id = ?
        DB-->>API: Updated tag list
        API-->>User: 200 OK<br/>{tags: [{id, name}, ...]}
    end

    Note over User, DB: Remove a tag from a file
    User->>API: DELETE /api/files/{id}/tags/{tagId}<br/>Authorization: Bearer {JWT}
    API->>API: Validate JWT → verify ownership
    API->>DB: DELETE FileTag<br/>WHERE file_id = ? AND tag_id = ?
    DB-->>API: OK
    API-->>User: 204 No Content

    Note over User, DB: List all user's tags
    User->>API: GET /api/tags<br/>Authorization: Bearer {JWT}
    API->>API: Validate JWT → extract user_id
    API->>DB: SELECT DISTINCT Tag<br/>FROM Tag JOIN FileTag JOIN File<br/>WHERE File.user_id = ?
    DB-->>API: Tag list
    API-->>User: 200 OK<br/>[{id, name}, ...]
```

---

## Flux H — Auto-Expiration (US10)

```mermaid
sequenceDiagram
    participant Cron as CronJob<br/>(@nestjs/schedule)
    participant DB as PostgreSQL
    participant S3 as MinIO
    actor Client as Browser (Public)
    participant API as NestJS API

    Note over Cron, S3: Daily purge — runs at 00:00 UTC
    Cron->>DB: SELECT * FROM File<br/>WHERE expires_at < NOW()<br/>AND is_deleted = false
    DB-->>Cron: List of expired files

    loop For each expired file
        Cron->>S3: DELETE object (storage_key)
        S3-->>Cron: OK
        Cron->>DB: UPDATE File SET is_deleted = true<br/>WHERE id = ?
        DB-->>Cron: OK
        Cron->>DB: UPDATE DownloadToken<br/>SET expires_at = NOW()<br/>WHERE file_id = ?
        DB-->>Cron: OK (tokens invalidated)
    end
    Cron->>Cron: Log: "Purged {N} expired files"

    Note over Client, API: User tries to access expired link
    Client->>API: GET /api/download/{token}
    API->>DB: SELECT DownloadToken WHERE token = ?
    DB-->>API: Token record
    API->>API: Check: expires_at < NOW()
    API-->>Client: 410 Gone<br/>{error: {code: "LinkExpired",<br/>message: "This download link has expired."}}
```
