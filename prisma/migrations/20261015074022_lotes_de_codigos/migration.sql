-- CreateTable
CREATE TABLE "LoteCodigos" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kitId" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LoteCodigos_kitId_fkey" FOREIGN KEY ("kitId") REFERENCES "Kit" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CodigoActivacion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "codigo" TEXT NOT NULL,
    "kitId" TEXT NOT NULL,
    "pedidoId" TEXT,
    "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usadoEn" DATETIME,
    "usuarioId" TEXT,
    "desactivadoEn" DATETIME,
    "loteId" TEXT,
    CONSTRAINT "CodigoActivacion_kitId_fkey" FOREIGN KEY ("kitId") REFERENCES "Kit" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CodigoActivacion_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "Pedido" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CodigoActivacion_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CodigoActivacion_loteId_fkey" FOREIGN KEY ("loteId") REFERENCES "LoteCodigos" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_CodigoActivacion" ("codigo", "creadoEn", "id", "kitId", "pedidoId", "usadoEn", "usuarioId") SELECT "codigo", "creadoEn", "id", "kitId", "pedidoId", "usadoEn", "usuarioId" FROM "CodigoActivacion";
DROP TABLE "CodigoActivacion";
ALTER TABLE "new_CodigoActivacion" RENAME TO "CodigoActivacion";
CREATE UNIQUE INDEX "CodigoActivacion_codigo_key" ON "CodigoActivacion"("codigo");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
