-- Pedidos anteriores a la fase de lanzamiento: el envío era gratis, así que el subtotal es el
-- total y el IVA (21 %) va incluido en él. Funciona igual en SQLite y en PostgreSQL.
UPDATE "Pedido"
SET "subtotalCentimos" = "totalCentimos",
    "envioCentimos" = 0,
    "ivaCentimos" = "totalCentimos" - CAST(ROUND("totalCentimos" * 100.0 / 121) AS INTEGER)
WHERE "subtotalCentimos" = 0 AND "totalCentimos" > 0;
