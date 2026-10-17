-- CreateTable
CREATE TABLE "LimiteIntento" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contador" INTEGER NOT NULL DEFAULT 1,
    "caducaEn" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "LimiteIntento_caducaEn_idx" ON "LimiteIntento"("caducaEn");
