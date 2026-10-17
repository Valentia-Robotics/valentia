-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Categoria" AS ENUM ('PLACAS', 'MOTORES', 'SENSORES', 'ALIMENTACION', 'CHASIS', 'EXTRAS');

-- CreateEnum
CREATE TYPE "TipoEjercicio" AS ENUM ('TEST', 'RETO');

-- CreateEnum
CREATE TYPE "EstadoPedido" AS ENUM ('PENDIENTE', 'PAGADO', 'PREPARANDO', 'ENVIADO', 'ENTREGADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "TipoLinea" AS ENUM ('KIT', 'COMPONENTE', 'CONFIGURACION');

-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('CLIENTE', 'ADMIN');

-- CreateEnum
CREATE TYPE "MotivoVerificacion" AS ENUM ('REGISTRO', 'DISPOSITIVO', 'RECUPERAR');

-- CreateTable
CREATE TABLE "Componente" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "categoria" "Categoria" NOT NULL,
    "tipo" TEXT NOT NULL,
    "resumen" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "precioCentimos" INTEGER NOT NULL,
    "stock" INTEGER NOT NULL,
    "imagen" TEXT NOT NULL,
    "voltaje" DOUBLE PRECISION NOT NULL,
    "voltajeLogico" DOUBLE PRECISION,
    "consumoMa" INTEGER NOT NULL,
    "conector" TEXT NOT NULL,
    "pines" INTEGER NOT NULL,
    "especificaciones" JSONB NOT NULL,
    "visible" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Componente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Kit" (
    "id" TEXT NOT NULL,
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

    CONSTRAINT "Kit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KitComponente" (
    "kitId" TEXT NOT NULL,
    "componenteId" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "KitComponente_pkey" PRIMARY KEY ("kitId","componenteId")
);

-- CreateTable
CREATE TABLE "Curso" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "nivel" TEXT NOT NULL,

    CONSTRAINT "Curso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Leccion" (
    "id" TEXT NOT NULL,
    "cursoId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "videoUrl" TEXT NOT NULL,
    "duracionMin" INTEGER NOT NULL,

    CONSTRAINT "Leccion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ejercicio" (
    "id" TEXT NOT NULL,
    "leccionId" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,
    "tipo" "TipoEjercicio" NOT NULL,
    "enunciado" TEXT NOT NULL,
    "opciones" JSONB,
    "correcta" INTEGER,
    "explicacion" TEXT,
    "pistas" JSONB,
    "solucion" TEXT,

    CONSTRAINT "Ejercicio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pedido" (
    "id" TEXT NOT NULL,
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
    "estado" "EstadoPedido" NOT NULL DEFAULT 'PENDIENTE',
    "proveedorPago" TEXT NOT NULL,
    "referenciaPago" TEXT,
    "numeroSeguimiento" TEXT,
    "aceptaCondicionesEn" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pagadoEn" TIMESTAMP(3),
    "enviadoEn" TIMESTAMP(3),
    "entregadoEn" TIMESTAMP(3),
    "canceladoEn" TIMESTAMP(3),
    "correoConfirmacionEn" TIMESTAMP(3),

    CONSTRAINT "Pedido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Direccion" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "direccion" TEXT NOT NULL,
    "codigoPostal" TEXT NOT NULL,
    "ciudad" TEXT NOT NULL,
    "provincia" TEXT NOT NULL,
    "predeterminada" BOOLEAN NOT NULL DEFAULT false,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Direccion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventoStripe" (
    "id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "recibidoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventoStripe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LineaPedido" (
    "id" TEXT NOT NULL,
    "pedidoId" TEXT NOT NULL,
    "tipo" "TipoLinea" NOT NULL,
    "nombre" TEXT NOT NULL,
    "slug" TEXT,
    "precioUnitarioCentimos" INTEGER NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "piezas" JSONB,

    CONSTRAINT "LineaPedido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CodigoActivacion" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "kitId" TEXT NOT NULL,
    "pedidoId" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usadoEn" TIMESTAMP(3),
    "usuarioId" TEXT,
    "desactivadoEn" TIMESTAMP(3),
    "loteId" TEXT,

    CONSTRAINT "CodigoActivacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoteCodigos" (
    "id" TEXT NOT NULL,
    "kitId" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoteCodigos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "contrasenaHash" TEXT NOT NULL,
    "rol" "Rol" NOT NULL DEFAULT 'CLIENTE',
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "emailVerificadoEn" TIMESTAMP(3),

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Verificacion" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "usuarioId" TEXT,
    "email" TEXT NOT NULL,
    "motivo" "MotivoVerificacion" NOT NULL,
    "codigoHash" TEXT NOT NULL,
    "intentos" INTEGER NOT NULL DEFAULT 0,
    "caducaEn" TIMESTAMP(3) NOT NULL,
    "enviadoEn" TIMESTAMP(3) NOT NULL,
    "confirmadoEn" TIMESTAMP(3),
    "usadoEn" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Verificacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnvioCodigo" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "enviadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EnvioCodigo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DispositivoConfianza" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ultimoUsoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "caducaEn" TIMESTAMP(3) NOT NULL,
    "paseHash" TEXT,
    "paseCaducaEn" TIMESTAMP(3),

    CONSTRAINT "DispositivoConfianza_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CursoUsuario" (
    "usuarioId" TEXT NOT NULL,
    "cursoId" TEXT NOT NULL,
    "desbloqueadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CursoUsuario_pkey" PRIMARY KEY ("usuarioId","cursoId")
);

-- CreateTable
CREATE TABLE "ProgresoLeccion" (
    "usuarioId" TEXT NOT NULL,
    "leccionId" TEXT NOT NULL,
    "completadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProgresoLeccion_pkey" PRIMARY KEY ("usuarioId","leccionId")
);

-- CreateTable
CREATE TABLE "VideoVisto" (
    "usuarioId" TEXT NOT NULL,
    "leccionId" TEXT NOT NULL,
    "vistoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VideoVisto_pkey" PRIMARY KEY ("usuarioId","leccionId")
);

-- CreateTable
CREATE TABLE "ResultadoTest" (
    "usuarioId" TEXT NOT NULL,
    "leccionId" TEXT NOT NULL,
    "aciertos" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "mejorAciertos" INTEGER NOT NULL,
    "intentos" INTEGER NOT NULL DEFAULT 1,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResultadoTest_pkey" PRIMARY KEY ("usuarioId","leccionId")
);

-- CreateTable
CREATE TABLE "ProgresoEjercicio" (
    "usuarioId" TEXT NOT NULL,
    "ejercicioId" TEXT NOT NULL,
    "respuesta" INTEGER,
    "acertado" BOOLEAN NOT NULL DEFAULT false,
    "intentos" INTEGER NOT NULL DEFAULT 0,
    "solucionVista" BOOLEAN NOT NULL DEFAULT false,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProgresoEjercicio_pkey" PRIMARY KEY ("usuarioId","ejercicioId")
);

-- CreateTable
CREATE TABLE "LimiteIntento" (
    "id" TEXT NOT NULL,
    "contador" INTEGER NOT NULL DEFAULT 1,
    "caducaEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LimiteIntento_pkey" PRIMARY KEY ("id")
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

-- CreateIndex
CREATE UNIQUE INDEX "Pedido_numero_key" ON "Pedido"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "Pedido_referenciaPago_key" ON "Pedido"("referenciaPago");

-- CreateIndex
CREATE INDEX "Pedido_usuarioId_idx" ON "Pedido"("usuarioId");

-- CreateIndex
CREATE INDEX "Pedido_email_idx" ON "Pedido"("email");

-- CreateIndex
CREATE INDEX "Pedido_estado_creadoEn_idx" ON "Pedido"("estado", "creadoEn");

-- CreateIndex
CREATE INDEX "Direccion_usuarioId_idx" ON "Direccion"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "CodigoActivacion_codigo_key" ON "CodigoActivacion"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

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

-- CreateIndex
CREATE INDEX "LimiteIntento_caducaEn_idx" ON "LimiteIntento"("caducaEn");

-- AddForeignKey
ALTER TABLE "Kit" ADD CONSTRAINT "Kit_cursoId_fkey" FOREIGN KEY ("cursoId") REFERENCES "Curso"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KitComponente" ADD CONSTRAINT "KitComponente_kitId_fkey" FOREIGN KEY ("kitId") REFERENCES "Kit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KitComponente" ADD CONSTRAINT "KitComponente_componenteId_fkey" FOREIGN KEY ("componenteId") REFERENCES "Componente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Leccion" ADD CONSTRAINT "Leccion_cursoId_fkey" FOREIGN KEY ("cursoId") REFERENCES "Curso"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ejercicio" ADD CONSTRAINT "Ejercicio_leccionId_fkey" FOREIGN KEY ("leccionId") REFERENCES "Leccion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pedido" ADD CONSTRAINT "Pedido_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Direccion" ADD CONSTRAINT "Direccion_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LineaPedido" ADD CONSTRAINT "LineaPedido_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "Pedido"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodigoActivacion" ADD CONSTRAINT "CodigoActivacion_kitId_fkey" FOREIGN KEY ("kitId") REFERENCES "Kit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodigoActivacion" ADD CONSTRAINT "CodigoActivacion_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "Pedido"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodigoActivacion" ADD CONSTRAINT "CodigoActivacion_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodigoActivacion" ADD CONSTRAINT "CodigoActivacion_loteId_fkey" FOREIGN KEY ("loteId") REFERENCES "LoteCodigos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoteCodigos" ADD CONSTRAINT "LoteCodigos_kitId_fkey" FOREIGN KEY ("kitId") REFERENCES "Kit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Verificacion" ADD CONSTRAINT "Verificacion_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispositivoConfianza" ADD CONSTRAINT "DispositivoConfianza_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CursoUsuario" ADD CONSTRAINT "CursoUsuario_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CursoUsuario" ADD CONSTRAINT "CursoUsuario_cursoId_fkey" FOREIGN KEY ("cursoId") REFERENCES "Curso"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgresoLeccion" ADD CONSTRAINT "ProgresoLeccion_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgresoLeccion" ADD CONSTRAINT "ProgresoLeccion_leccionId_fkey" FOREIGN KEY ("leccionId") REFERENCES "Leccion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoVisto" ADD CONSTRAINT "VideoVisto_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoVisto" ADD CONSTRAINT "VideoVisto_leccionId_fkey" FOREIGN KEY ("leccionId") REFERENCES "Leccion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResultadoTest" ADD CONSTRAINT "ResultadoTest_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResultadoTest" ADD CONSTRAINT "ResultadoTest_leccionId_fkey" FOREIGN KEY ("leccionId") REFERENCES "Leccion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgresoEjercicio" ADD CONSTRAINT "ProgresoEjercicio_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgresoEjercicio" ADD CONSTRAINT "ProgresoEjercicio_ejercicioId_fkey" FOREIGN KEY ("ejercicioId") REFERENCES "Ejercicio"("id") ON DELETE CASCADE ON UPDATE CASCADE;
