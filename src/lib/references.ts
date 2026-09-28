/**
 * Справочники для формы объекта: города, районы, ЖК.
 *
 * Архивные записи в выбор не попадают, но остаются у объектов, которые на них
 * уже ссылаются — поэтому это фильтр выборки, а не удаление.
 */

import { getPrisma } from "./prisma";

export type Reference = {
  readonly id: string;
  readonly name: string;
};

export type DistrictReference = Reference & { readonly cityId: string };
export type ComplexReference = Reference & { readonly districtId: string };

export async function listReferences(): Promise<{
  cities: readonly Reference[];
  districts: readonly DistrictReference[];
  complexes: readonly ComplexReference[];
}> {
  const prisma = getPrisma();

  const [cities, districts, complexes] = await Promise.all([
    prisma.city.findMany({
      where: { isArchived: false },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.district.findMany({
      where: { isArchived: false },
      select: { id: true, name: true, cityId: true },
      orderBy: { name: "asc" },
    }),
    prisma.complex.findMany({
      where: { isArchived: false },
      select: { id: true, name: true, districtId: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return { cities, districts, complexes };
}
