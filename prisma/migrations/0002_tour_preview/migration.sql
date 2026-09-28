-- База общая с другими проектами: schema задаём явно, см. 0001_init.
SET search_path TO "realty";

-- AlterTable
ALTER TABLE "VirtualTour" ADD COLUMN "previewImageUrl" TEXT;
