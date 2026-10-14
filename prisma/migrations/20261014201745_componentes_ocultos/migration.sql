-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Componente" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "resumen" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "precioCentimos" INTEGER NOT NULL,
    "stock" INTEGER NOT NULL,
    "imagen" TEXT NOT NULL,
    "voltaje" REAL NOT NULL,
    "voltajeLogico" REAL,
    "consumoMa" INTEGER NOT NULL,
    "conector" TEXT NOT NULL,
    "pines" INTEGER NOT NULL,
    "especificaciones" JSONB NOT NULL,
    "visible" BOOLEAN NOT NULL DEFAULT true
);
INSERT INTO "new_Componente" ("categoria", "conector", "consumoMa", "descripcion", "especificaciones", "id", "imagen", "nombre", "pines", "precioCentimos", "resumen", "slug", "stock", "tipo", "voltaje", "voltajeLogico") SELECT "categoria", "conector", "consumoMa", "descripcion", "especificaciones", "id", "imagen", "nombre", "pines", "precioCentimos", "resumen", "slug", "stock", "tipo", "voltaje", "voltajeLogico" FROM "Componente";
DROP TABLE "Componente";
ALTER TABLE "new_Componente" RENAME TO "Componente";
CREATE UNIQUE INDEX "Componente_slug_key" ON "Componente"("slug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
