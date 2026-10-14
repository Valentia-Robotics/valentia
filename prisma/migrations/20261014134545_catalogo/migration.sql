-- CreateTable
CREATE TABLE "Componente" (
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
    "especificaciones" JSONB NOT NULL
);

-- CreateTable
CREATE TABLE "Kit" (
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
    "cursoId" TEXT NOT NULL,
    CONSTRAINT "Kit_cursoId_fkey" FOREIGN KEY ("cursoId") REFERENCES "Curso" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "KitComponente" (
    "kitId" TEXT NOT NULL,
    "componenteId" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL DEFAULT 1,

    PRIMARY KEY ("kitId", "componenteId"),
    CONSTRAINT "KitComponente_kitId_fkey" FOREIGN KEY ("kitId") REFERENCES "Kit" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "KitComponente_componenteId_fkey" FOREIGN KEY ("componenteId") REFERENCES "Componente" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Curso" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "nivel" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Leccion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cursoId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "videoUrl" TEXT NOT NULL,
    "duracionMin" INTEGER NOT NULL,
    CONSTRAINT "Leccion_cursoId_fkey" FOREIGN KEY ("cursoId") REFERENCES "Curso" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Ejercicio" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leccionId" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "enunciado" TEXT NOT NULL,
    "opciones" JSONB,
    "correcta" INTEGER,
    "explicacion" TEXT,
    "pistas" JSONB,
    "solucion" TEXT,
    CONSTRAINT "Ejercicio_leccionId_fkey" FOREIGN KEY ("leccionId") REFERENCES "Leccion" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Componente_slug_key" ON "Componente"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Kit_slug_key" ON "Kit"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Kit_cursoId_key" ON "Kit"("cursoId");

-- CreateIndex
CREATE UNIQUE INDEX "Curso_slug_key" ON "Curso"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Leccion_cursoId_slug_key" ON "Leccion"("cursoId", "slug");
