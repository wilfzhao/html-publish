-- Add AI publish metadata to versions.
ALTER TABLE "Version" ADD COLUMN "sourceClient" TEXT;
ALTER TABLE "Version" ADD COLUMN "sourceVersion" TEXT;
ALTER TABLE "Version" ADD COLUMN "artifactHash" TEXT;
ALTER TABLE "Version" ADD COLUMN "gitCommit" TEXT;
ALTER TABLE "Version" ADD COLUMN "gitBranch" TEXT;

-- Project-scoped deploy credentials. Only the SHA-256 hash is stored.
CREATE TABLE "ApiToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tokenPrefix" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "scopes" TEXT NOT NULL DEFAULT 'project:deploy',
    "expiresAt" DATETIME,
    "lastUsedAt" DATETIME,
    "revokedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ApiToken_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ApiToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "ApiToken_tokenHash_key" ON "ApiToken"("tokenHash");
CREATE INDEX "ApiToken_projectId_idx" ON "ApiToken"("projectId");

-- A deployment records every API publish attempt, including failures.
CREATE TABLE "Deployment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'CREATED',
    "note" TEXT NOT NULL,
    "entryFile" TEXT NOT NULL,
    "artifactHash" TEXT,
    "artifactSize" INTEGER,
    "fileCount" INTEGER,
    "sourceClient" TEXT,
    "sourceVersion" TEXT,
    "gitCommit" TEXT,
    "gitBranch" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "versionId" TEXT,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    CONSTRAINT "Deployment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Deployment_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "Deployment_projectId_idempotencyKey_key" ON "Deployment"("projectId", "idempotencyKey");
CREATE INDEX "Deployment_projectId_createdAt_idx" ON "Deployment"("projectId", "createdAt");
