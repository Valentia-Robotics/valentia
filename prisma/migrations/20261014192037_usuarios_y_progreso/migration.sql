-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "contrasenaHash" TEXT NOT NULL,
    "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "CursoUsuario" (
    "usuarioId" TEXT NOT NULL,
    "cursoId" TEXT NOT NULL,
    "desbloqueadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("usuarioId", "cursoId"),
    CONSTRAINT "CursoUsuario_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CursoUsuario_cursoId_fkey" FOREIGN KEY ("cursoId") REFERENCES "Curso" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProgresoLeccion" (
    "usuarioId" TEXT NOT NULL,
    "leccionId" TEXT NOT NULL,
    "completadaEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("usuarioId", "leccionId"),
    CONSTRAINT "ProgresoLeccion_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProgresoLeccion_leccionId_fkey" FOREIGN KEY ("leccionId") REFERENCES "Leccion" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProgresoEjercicio" (
    "usuarioId" TEXT NOT NULL,
    "ejercicioId" TEXT NOT NULL,
    "respuesta" INTEGER,
    "acertado" BOOLEAN NOT NULL DEFAULT false,
    "intentos" INTEGER NOT NULL DEFAULT 0,
    "solucionVista" BOOLEAN NOT NULL DEFAULT false,
    "actualizadoEn" DATETIME NOT NULL,

    PRIMARY KEY ("usuarioId", "ejercicioId"),
    CONSTRAINT "ProgresoEjercicio_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProgresoEjercicio_ejercicioId_fkey" FOREIGN KEY ("ejercicioId") REFERENCES "Ejercicio" ("id") ON DELETE CASCADE ON UPDATE CASCADE
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
    CONSTRAINT "CodigoActivacion_kitId_fkey" FOREIGN KEY ("kitId") REFERENCES "Kit" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CodigoActivacion_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "Pedido" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CodigoActivacion_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_CodigoActivacion" ("codigo", "creadoEn", "id", "kitId", "pedidoId", "usadoEn") SELECT "codigo", "creadoEn", "id", "kitId", "pedidoId", "usadoEn" FROM "CodigoActivacion";
DROP TABLE "CodigoActivacion";
ALTER TABLE "new_CodigoActivacion" RENAME TO "CodigoActivacion";
CREATE UNIQUE INDEX "CodigoActivacion_codigo_key" ON "CodigoActivacion"("codigo");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");
