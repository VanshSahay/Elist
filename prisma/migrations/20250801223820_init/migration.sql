-- CreateTable
CREATE TABLE "public"."Waitlist" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "chatId" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Waitlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Subscriber" (
    "id" SERIAL NOT NULL,
    "waitlistId" INTEGER NOT NULL,
    "userId" BIGINT NOT NULL,
    "username" TEXT NOT NULL,
    "subscribedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Subscriber_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."Subscriber" ADD CONSTRAINT "Subscriber_waitlistId_fkey" FOREIGN KEY ("waitlistId") REFERENCES "public"."Waitlist"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
