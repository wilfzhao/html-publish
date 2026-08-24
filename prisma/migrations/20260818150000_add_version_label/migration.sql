ALTER TABLE "Version" ADD COLUMN "label" TEXT;

CREATE UNIQUE INDEX "Version_projectId_label_key" ON "Version"("projectId", "label");
