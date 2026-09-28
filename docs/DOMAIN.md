# Домен и модель данных

Спутник [PRD.md](./PRD.md): что за сущности живут в системе, какие у них поля и как из
них складывается фильтрация. Источник правды для `prisma/schema.prisma`.

## 1. Сущности

```
User ──владеет──< Property >──лежит в──── Complex ──── District ──── City
                     │  │
                     │  └──< PropertyImage
                     │  └──< VirtualTour
                     │
       Selection >──< SelectionItem
          │
          └──< ShareLink ──< ShareView

SavedSearch (агента)        ActivityLog (по объекту)
```

### Property — объект недвижимости
Центральная сущность. Всё остальное существует ради неё.

| Группа | Поля |
|---|---|
| Сделка | `dealType` (продажа/аренда), `status`, `price`, `currency`, `pricePerSqm` (расчётное), `commissionPercent` (внутреннее) |
| Тип | `propertyType` (квартира/дом/участок/коммерция), `buildingType` (панель/кирпич/монолит/блок/дерево) |
| Площади | `areaTotal`, `areaLiving`, `areaKitchen`, `landArea` (для дома и участка) |
| Планировка | `rooms` (0 = студия), `floor`, `floorsTotal`, `bathrooms`, `balcony` (нет/балкон/лоджия), `ceilingHeight` |
| Состояние | `renovation` (без ремонта/косметика/евро/дизайнерский), `builtYear`, `parking` |
| Адрес | `cityId`, `districtId`, `complexId`, `street`, `houseNumber`, `apartmentNumber` (внутреннее), `latitude`, `longitude` |
| Тексты | `title`, `description`, `internalNotes` (внутреннее) |
| Служебное | `ownerId`, `createdAt`, `updatedAt`, `publishedAt`, `deletedAt`, `hasTour` (денормализация под фильтр), `imagesCount` |

**Статусы:** `DRAFT` → `ACTIVE` → `RESERVED` → `SOLD` / `RENTED`, а также `WITHDRAWN`
из любого состояния. Черновик виден только владельцу и админу.

**Внутренние поля** — `commissionPercent`, `internalNotes`, `apartmentNumber`,
`ownerId` — никогда не попадают в публичные ответы. Отбор делается на уровне выборки в
репозитории, а не фильтрацией в компоненте: публичный запрос выбирает явный набор
колонок, а не `SELECT *` с последующим удалением ключей.

**Денормализация.** `hasTour` и `imagesCount` держим в самой строке: фильтр «только с
3D-туром» — один из главных, и он не должен превращаться в join с группировкой на
каждый запрос выдачи. Поля пересчитываются в той же транзакции, что и изменение
связанных туров и фото.

### VirtualTour — 3D-тур
`propertyId`, `provider` (`MATTERPORT` | `KUULA` | `OTHER`), `sourceUrl` (что вставил
агент), `embedUrl` (нормализованный, только если провайдер поддерживает iframe),
`isEmbeddable`, `createdAt`.

Валидация URL — единственная по-настоящему security-sensitive часть модели, см.
`adr/0002-3d-tour-embedding.md`. Правило: только `https`, только хост из allowlist,
`embedUrl` собирается из разобранного идентификатора тура, а не склеивается из строки
пользователя.

### PropertyImage
`propertyId`, `storageKey`, `width`, `height`, `sortOrder`, `isCover`, `alt`.
Файлы лежат во внешнем хранилище, в базе только ключ, см. `adr/0003-image-storage.md`.

### Complex / District / City — справочники
`Complex`: `name`, `developer`, `districtId`, `latitude`, `longitude`, `isArchived`.
`District`: `name`, `cityId`, `isArchived`. `City`: `name`, `isArchived`.
Удаления нет, только архивация: объекты ссылаются на записи годами.

### User
`email`, `passwordHash`, `name`, `phone`, `role` (`AGENT` | `ADMIN`), `isActive`,
`invitedAt`, `lastLoginAt`. Открытой регистрации нет, запись создаёт админ.

### Selection / SelectionItem / ShareLink / ShareView
`Selection`: `agentId`, `name`, `clientComment`, `createdAt`.
`SelectionItem`: `selectionId`, `propertyId`, `sortOrder`.
`ShareLink`: `token` (32+ байта из CSPRNG), `selectionId` или `propertyId`,
`revokedAt`, `expiresAt`, `viewsCount`, `lastViewedAt`.
`ShareView`: `shareLinkId`, `viewedAt`, `userAgentHash` — без IP и без персональных
данных клиента, счётчик нужен агенту, а не аналитике.

### SavedSearch
`agentId`, `name`, `queryString` — сохраняем ровно ту строку запроса, что уходит в URL
выдачи. Один формат для ссылки, закладки и сохранённого поиска, разбирается одним
парсером.

### ActivityLog
`propertyId`, `userId`, `action`, `changedFields` (JSON), `createdAt`. Не чистится.

## 2. Фильтры

Все фильтры — серверные, состояние живёт в query string. Один и тот же Zod-парсер
разбирает URL в объект фильтра и на странице, и в API.

| Фильтр | Параметр | Тип | Как работает |
|---|---|---|---|
| Тип сделки | `deal` | enum | Равенство, обязателен по умолчанию: `sale` |
| Тип объекта | `type` | enum, мультивыбор | `IN` |
| Цена | `priceMin`, `priceMax` | целое | Диапазон |
| Цена за м² | `ppsMin`, `ppsMax` | целое | Диапазон по расчётной колонке |
| Площадь общая | `areaMin`, `areaMax` | дробное | Диапазон |
| Комнаты | `rooms` | мультивыбор `0,1,2,3,4plus` | `IN`, `4plus` разворачивается в `>= 4` |
| Этаж | `floorMin`, `floorMax` | целое | Диапазон |
| Не первый этаж | `notFirst` | флаг | `floor > 1` |
| Не последний этаж | `notLast` | флаг | `floor < floorsTotal` |
| Только последний | `lastOnly` | флаг | `floor = floorsTotal` |
| Район | `district` | мультивыбор id | `IN` |
| ЖК | `complex` | мультивыбор id | `IN` |
| Тип дома | `building` | мультивыбор enum | `IN` |
| Год постройки | `builtFrom`, `builtTo` | целое | Диапазон |
| Ремонт | `renovation` | мультивыбор enum | `IN` |
| Санузлы | `bathMin` | целое | `>=` |
| Балкон | `balcony` | мультивыбор enum | `IN` |
| Парковка | `parking` | флаг | Признак есть |
| **Только с 3D-туром** | `tour` | флаг | `hasTour = true` |
| Только с фото | `photo` | флаг | `imagesCount > 0` |
| Статус | `status` | мультивыбор enum | `IN`, по умолчанию только `ACTIVE` |
| Агент | `agent` | id | Равенство, внутренний фильтр |
| Текстовый поиск | `q` | строка | По `title`, `street`, названию ЖК |

**Сортировка:** `sort` ∈ `price_asc`, `price_desc`, `pps_asc`, `pps_desc`, `area_desc`,
`created_desc` (по умолчанию).
**Пагинация:** `page`, размер страницы фиксированный.

**Правила реализации.**
- Взаимоисключающие флаги (`notLast` и `lastOnly`) парсер отбрасывает, а не складывает
  в противоречивое условие.
- В токенах фильтров нет плюса: `4plus`, а не `4+`. Плюс в query string
  декодируется как пробел, и поправленная руками ссылка теряла бы фильтр.
- Неизвестные параметры игнорируются молча, некорректные значения — ошибка валидации.
  Разница важна: мусор в ссылке не должен ломать выдачу, а `priceMin=abc` должен.
- Пустой фильтр — это `deal=sale&status=ACTIVE`, а не «все строки в базе».
- Запрос на выдачу отдаёт список и `total` одним обращением к слою данных.

## 3. Индексы

Фильтрация уровня CIAN — это в первую очередь про индексы, а не про SQL.

- `(dealType, status, price)` — базовая комбинация почти любого запроса.
- `(dealType, status, propertyType, rooms)` — типовой набор из формы.
- `(districtId, dealType, status)` и `(complexId, dealType, status)` — отбор по географии.
- `(hasTour, dealType, status)` — флаг «с 3D-туром».
- `(createdAt DESC)` — сортировка по умолчанию.
- Частичный индекс с условием `deletedAt IS NULL` — мягкое удаление не должно
  обесценивать остальные индексы.
- GIN на триграммы для `q`, когда текстовый поиск перестанет укладываться в `ILIKE`.

План проверяется на сидированных 10 000 объектов через `EXPLAIN ANALYZE`, а не на глаз.
