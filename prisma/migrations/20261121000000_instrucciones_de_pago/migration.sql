-- Instrucciones de pago de cada gimnasio (número de Yape, cuenta bancaria): las escribe el
-- admin y el miembro las ve al elegir Yape o transferencia (#173).
ALTER TABLE "Gym" ADD COLUMN "paymentInstructions" TEXT;
