-- CreateIndex
CREATE INDEX "Booking_roomId_status_checkIn_checkOut_idx" ON "Booking"("roomId", "status", "checkIn", "checkOut");

-- CreateIndex
CREATE INDEX "Booking_status_expiresAt_idx" ON "Booking"("status", "expiresAt");
