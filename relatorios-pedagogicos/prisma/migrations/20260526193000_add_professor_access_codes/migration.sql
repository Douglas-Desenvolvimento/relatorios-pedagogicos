-- CreateTable
CREATE TABLE "professor_access_codes" (
    "id" SERIAL NOT NULL,
    "professor_id" INTEGER NOT NULL,
    "code_hash" VARCHAR(64) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "created_by_user_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "professor_access_codes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_prof_access_code_prof_expires" ON "professor_access_codes"("professor_id", "expires_at");

-- CreateIndex
CREATE INDEX "idx_prof_access_code_used" ON "professor_access_codes"("used_at");

-- AddForeignKey
ALTER TABLE "professor_access_codes" ADD CONSTRAINT "professor_access_codes_professor_id_fkey" FOREIGN KEY ("professor_id") REFERENCES "professores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
