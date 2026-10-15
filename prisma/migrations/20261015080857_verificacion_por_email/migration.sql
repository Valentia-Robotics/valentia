-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN "emailVerificadoEn" DATETIME;

-- CreateTable
CREATE TABLE "Verificacion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tokenHash" TEXT NOT NULL,
    "usuarioId" TEXT,
    "email" TEXT NOT NULL,
    "motivo" TEXT NOT NULL,
    "codigoHash" TEXT NOT NULL,
    "intentos" INTEGER NOT NULL DEFAULT 0,
    "caducaEn" DATETIME NOT NULL,
    "enviadoEn" DATETIME NOT NULL,
    "confirmadoEn" DATETIME,
    "usadoEn" DATETIME,
    "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Verificacion_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EnvioCodigo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "enviadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "DispositivoConfianza" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "usuarioId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ultimoUsoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "caducaEn" DATETIME NOT NULL,
    "paseHash" TEXT,
    "paseCaducaEn" DATETIME,
    CONSTRAINT "DispositivoConfianza_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Verificacion_tokenHash_key" ON "Verificacion"("tokenHash");

-- CreateIndex
CREATE INDEX "Verificacion_email_motivo_idx" ON "Verificacion"("email", "motivo");

-- CreateIndex
CREATE INDEX "EnvioCodigo_email_enviadoEn_idx" ON "EnvioCodigo"("email", "enviadoEn");

-- CreateIndex
CREATE UNIQUE INDEX "DispositivoConfianza_tokenHash_key" ON "DispositivoConfianza"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "DispositivoConfianza_paseHash_key" ON "DispositivoConfianza"("paseHash");

-- CreateIndex
CREATE INDEX "DispositivoConfianza_usuarioId_idx" ON "DispositivoConfianza"("usuarioId");

-- Las cuentas que ya existían antes de pedir la verificación por email se dan por verificadas
UPDATE "Usuario" SET "emailVerificadoEn" = "creadoEn" WHERE "emailVerificadoEn" IS NULL;
