-- CreateTable
CREATE TABLE "client_contacts" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255),
    "phone" VARCHAR(50),
    "designation" VARCHAR(100),
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "client_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "client_contacts_organization_id_idx" ON "client_contacts"("organization_id");

-- CreateIndex
CREATE INDEX "client_contacts_organization_id_client_id_idx" ON "client_contacts"("organization_id", "client_id");

-- CreateIndex
CREATE INDEX "client_contacts_organization_id_deleted_at_idx" ON "client_contacts"("organization_id", "deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "client_contacts_organization_id_id_key" ON "client_contacts"("organization_id", "id");

-- CreateIndex
CREATE INDEX "clients_organization_id_deleted_at_idx" ON "clients"("organization_id", "deleted_at");

-- AddForeignKey
ALTER TABLE "client_contacts" ADD CONSTRAINT "client_contacts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_contacts" ADD CONSTRAINT "client_contacts_organization_id_client_id_fkey" FOREIGN KEY ("organization_id", "client_id") REFERENCES "clients"("organization_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;