-- CreateTable
CREATE TABLE "Draft" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "draftId" TEXT NOT NULL,
    "dateFound" DATETIME NOT NULL,
    "type" TEXT NOT NULL,
    "headline" TEXT NOT NULL,
    "bullets" TEXT NOT NULL,
    "localContext" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "sourceName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "postedAt" DATETIME,
    "facebookPostId" TEXT,
    "imageData" TEXT,
    "urlHash" TEXT NOT NULL,
    "titleHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "MarketHistory" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "community" TEXT NOT NULL,
    "weekDate" DATETIME NOT NULL,
    "activeCount" INTEGER NOT NULL,
    "pendingCount" INTEGER NOT NULL,
    "soldLast30" INTEGER NOT NULL,
    "medianSold" INTEGER NOT NULL,
    "avgDom" INTEGER NOT NULL,
    "newListingsCount" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "Draft_draftId_key" ON "Draft"("draftId");

-- CreateIndex
CREATE INDEX "Draft_status_idx" ON "Draft"("status");

-- CreateIndex
CREATE INDEX "Draft_urlHash_titleHash_idx" ON "Draft"("urlHash", "titleHash");

-- CreateIndex
CREATE UNIQUE INDEX "MarketHistory_community_weekDate_key" ON "MarketHistory"("community", "weekDate");
