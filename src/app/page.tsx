import { redirect } from "next/navigation";

/** Корня у внутреннего инструмента нет: работа начинается с каталога. */
export default function Home() {
  redirect("/catalog");
}
