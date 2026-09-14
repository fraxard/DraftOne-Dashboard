-- AlterTable
ALTER TABLE "projects" ADD COLUMN "notes" TEXT;

-- CreateTable
CREATE TABLE "project_members" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" VARCHAR(50),
    "joined_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "project_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "project_members_organization_id_idx" ON "project_members"("organization_id");

-- CreateIndex
CREATE INDEX "project_members_organization_id_project_id_idx" ON "project_members"("organization_id", "project_id");

-- CreateIndex
CREATE INDEX "project_members_organization_id_user_id_idx" ON "project_members"("organization_id", "user_id");

-- CreateIndex
CREATE INDEX "project_members_organization_id_deleted_at_idx" ON "project_members"("organization_id", "deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "project_members_organization_id_id_key" ON "project_members"("organization_id", "id");

-- CreateIndex
CREATE INDEX "projects_organization_id_deleted_at_idx" ON "projects"("organization_id", "deleted_at");

-- AddForeignKey
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_organization_id_project_id_fkey" FOREIGN KEY ("organization_id", "project_id") REFERENCES "projects"("organization_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_organization_id_user_id_fkey" FOREIGN KEY ("organization_id", "user_id") REFERENCES "users"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;