-- CreateTable
CREATE TABLE "Quarto" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "precoNoite" DOUBLE PRECISION NOT NULL,
    "imagens" TEXT,
    "capacidade" INTEGER NOT NULL,
    CONSTRAINT "Quarto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reserva" (
    "id" SERIAL NOT NULL,
    "quartoId" INTEGER NOT NULL,
    "nomeCliente" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "checkin" TIMESTAMP(3) NOT NULL,
    "checkout" TIMESTAMP(3) NOT NULL,
    "guests" INTEGER NOT NULL DEFAULT 1,
    "total" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pendente',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Reserva_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Reserva_quartoId_idx" ON "Reserva"("quartoId");

-- AddForeignKey
ALTER TABLE "Reserva" ADD CONSTRAINT "Reserva_quartoId_fkey" FOREIGN KEY ("quartoId") REFERENCES "Quarto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

