/*
  Warnings:

  - You are about to drop the column `accesoHash` on the `Pedido` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Pedido" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "numero" TEXT NOT NULL,
    "usuarioId" TEXT,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telefono" TEXT NOT NULL DEFAULT '',
    "direccion" TEXT NOT NULL,
    "codigoPostal" TEXT NOT NULL,
    "ciudad" TEXT NOT NULL,
    "provincia" TEXT NOT NULL DEFAULT '',
    "subtotalCentimos" INTEGER NOT NULL DEFAULT 0,
    "envioCentimos" INTEGER NOT NULL DEFAULT 0,
    "ivaCentimos" INTEGER NOT NULL DEFAULT 0,
    "totalCentimos" INTEGER NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "proveedorPago" TEXT NOT NULL,
    "referenciaPago" TEXT,
    "numeroSeguimiento" TEXT,
    "aceptaCondicionesEn" DATETIME,
    "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pagadoEn" DATETIME,
    "enviadoEn" DATETIME,
    "entregadoEn" DATETIME,
    "canceladoEn" DATETIME,
    "correoConfirmacionEn" DATETIME,
    CONSTRAINT "Pedido_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Pedido" ("aceptaCondicionesEn", "actualizadoEn", "canceladoEn", "ciudad", "codigoPostal", "correoConfirmacionEn", "creadoEn", "direccion", "email", "entregadoEn", "enviadoEn", "envioCentimos", "estado", "id", "ivaCentimos", "nombre", "numero", "numeroSeguimiento", "pagadoEn", "proveedorPago", "provincia", "referenciaPago", "subtotalCentimos", "telefono", "totalCentimos", "usuarioId") SELECT "aceptaCondicionesEn", "actualizadoEn", "canceladoEn", "ciudad", "codigoPostal", "correoConfirmacionEn", "creadoEn", "direccion", "email", "entregadoEn", "enviadoEn", "envioCentimos", "estado", "id", "ivaCentimos", "nombre", "numero", "numeroSeguimiento", "pagadoEn", "proveedorPago", "provincia", "referenciaPago", "subtotalCentimos", "telefono", "totalCentimos", "usuarioId" FROM "Pedido";
DROP TABLE "Pedido";
ALTER TABLE "new_Pedido" RENAME TO "Pedido";
CREATE UNIQUE INDEX "Pedido_numero_key" ON "Pedido"("numero");
CREATE UNIQUE INDEX "Pedido_referenciaPago_key" ON "Pedido"("referenciaPago");
CREATE INDEX "Pedido_usuarioId_idx" ON "Pedido"("usuarioId");
CREATE INDEX "Pedido_email_idx" ON "Pedido"("email");
CREATE INDEX "Pedido_estado_creadoEn_idx" ON "Pedido"("estado", "creadoEn");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
