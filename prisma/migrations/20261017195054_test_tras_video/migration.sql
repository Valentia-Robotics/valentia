-- CreateTable
CREATE TABLE "VideoVisto" (
    "usuarioId" TEXT NOT NULL,
    "leccionId" TEXT NOT NULL,
    "vistoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("usuarioId", "leccionId"),
    CONSTRAINT "VideoVisto_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "VideoVisto_leccionId_fkey" FOREIGN KEY ("leccionId") REFERENCES "Leccion" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ResultadoTest" (
    "usuarioId" TEXT NOT NULL,
    "leccionId" TEXT NOT NULL,
    "aciertos" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "mejorAciertos" INTEGER NOT NULL,
    "intentos" INTEGER NOT NULL DEFAULT 1,
    "actualizadoEn" DATETIME NOT NULL,

    PRIMARY KEY ("usuarioId", "leccionId"),
    CONSTRAINT "ResultadoTest_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ResultadoTest_leccionId_fkey" FOREIGN KEY ("leccionId") REFERENCES "Leccion" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
