-- База может быть общей: schema задаём явно, см. 0001_init.
SET search_path TO "realty";

-- CreateTable
CREATE TABLE "ImageBlob" (
    "id" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "contentType" TEXT NOT NULL,
    "byteSize" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImageBlob_pkey" PRIMARY KEY ("id")
);
