-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Kit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "eslogan" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "precioCentimos" INTEGER NOT NULL,
    "imagen" TEXT NOT NULL,
    "nivel" TEXT NOT NULL,
    "edadMinima" INTEGER NOT NULL,
    "tiempoMontaje" TEXT NOT NULL,
    "destacado" BOOLEAN NOT NULL DEFAULT false,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "puntosFuertes" JSONB NOT NULL,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "cursoId" TEXT NOT NULL,
    CONSTRAINT "Kit_cursoId_fkey" FOREIGN KEY ("cursoId") REFERENCES "Curso" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Kit" ("cursoId", "descripcion", "destacado", "edadMinima", "eslogan", "id", "imagen", "nivel", "nombre", "orden", "precioCentimos", "puntosFuertes", "slug", "tiempoMontaje") SELECT "cursoId", "descripcion", "destacado", "edadMinima", "eslogan", "id", "imagen", "nivel", "nombre", "orden", "precioCentimos", "puntosFuertes", "slug", "tiempoMontaje" FROM "Kit";
DROP TABLE "Kit";
ALTER TABLE "new_Kit" RENAME TO "Kit";
CREATE UNIQUE INDEX "Kit_slug_key" ON "Kit"("slug");
CREATE UNIQUE INDEX "Kit_cursoId_key" ON "Kit"("cursoId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
