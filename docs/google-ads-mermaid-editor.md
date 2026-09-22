# План: Google Ads кампания «mermaid editor» (Broad) для IQ Mermaid

Статус: **LIVE — кампания создана** (см. раздел «Результат запуска»).
Продукт: **IQ Mermaid** (`https://iq-mermaid.com`) — отдельный проект от iq-rest (QR Menu SaaS). Всё, что создаётся ниже, принадлежит только этому продукту: без чужих изображений, чужих брендов, сниппетов/сателок/коллаутов, чужого копирайтинга, чужих негативов и чужих конверсий.

---

## 1. Что уже есть (факты из репозиториев)

| Что | Где |
| --- | --- |
| Google Ads тулинг (эталон) | `iq-rest/apps/landing/scripts/*` — `create-*-campaign.ts`, `GOOGLE_ADS.md`, на ветке `fix/active-restaurant-cookie` (ворктри `iq-rest/.claude/worktrees/cookie-fix`). Библиотека: `google-ads-api`, запуск через `tsx`/node, чтение `GOOGLE_ADS_*` из `.env` |
| Креды Google Ads (заполнены) | `iq-rest/.env` → `GOOGLE_ADS_CLIENT_ID`, `GOOGLE_ADS_CLIENT_SECRET`, `GOOGLE_ADS_REFRESH_TOKEN`, `GOOGLE_ADS_DEVELOPER_TOKEN`, `GOOGLE_ADS_CUSTOMER_ID` (6803239831 — ad-account iq-rest), `GOOGLE_ADS_LOGIN_CUSTOMER_ID` (3424878580 — MCC). **В mermaid их нет** — нужно добавить |
| Копирайтинг/лендинг | `iq-mermaid.com` — EN-главная, H1 «Mermaid live editor, visual and code in one place», логотип в шапке «Mermaid Editor», «Free forever», экспорт SVG/PNG, 8 типов диаграмм (строки в `content/chrome/en.json`) |
| Ресёрч ключа | `mermaid-keywords-raw.json` (в корне umbrella): «mermaid editor» ≈ 1.9k/мес, конкуренция LOW |

Ключевой момент: **в `.env` проекта mermaid сейчас нет ни одного `GOOGLE_ADS_*` ключа** — их надо будет добавить (значения скопировать из `iq-rest/.env`, это git-ignored файл). Копировать конверсионные `GOOGLE_ADS_CONVERSION_ACTION_ID*`, `FB_*`, `META_*`, Stripe и пр. **нельзя**.

---

## 2. Спека кампании (что создаём)

- **Тип**: Search-кампания, статус на создании — по желанию (`ENABLED` сразу или `PAUSED` для контроля).
- **Стратегия**: **Manual CPC**, `enhanced_cpc_enabled: false` (чистый мануал, без Enhanced).
- **Макс. цена за клик**: **€0.01** = `10 000` micros. В EUR billable unit = 10 000 micros (€0.01), т.е. это ровно один биллинг-юнит — минимально валидное значение для API. Ставим как дефолтную ставку ad group (одна группа, один ключ — этого достаточно).
- **Структура**: 1 ad group → **1 ключ: `mermaid editor`, match type `BROAD`**. Больше ключей не добавляем.
- **Объявление**: **1 RSA, только текст**. Без asset-ов вообще: без изображений, логотипа/бренд-ассетов, сателок, коллаутов, сниппетов.
  - Final URL: `https://iq-mermaid.com/` (EN-главная).
  - Display path: `/mermaid/editor` (≤15 символов на сегмент).
  - Копирайтинг — только IQ Mermaid, из реальных строк сайта (см. п. 3).
- **Гео/язык**: язык — English (`languageConstants/1000`). Гео — решение пользователя (см. п. 6).
- **Бюджет**: дневной минимум (рекомендация €0.50/день), см. п. 6.
- **Негативы**: только mermaid-специфичные, если нужны (см. п. 6). Негативы iq-rest (рестораны, сети, «бесплатно», шаблоны меню и т.п.) **не переносим**.
- **Конверсии**: **не привязываем** (mermaid — бесплатный продукт; чужие conversion action id из iq-rest не использовать).
- **EU**: `contains_eu_political_advertising = DOES_NOT_CONTAIN_EU_POLITICAL_ADVERTISING`.
- **Имя кампании** (уникальное, pre-flight проверка на дубликат): `Mermaid — Search — mermaid editor (broad, manual €0.01)`.

### ⚠️ Ожидание по ставке €0.01
€0.01/клик — технический минимум, но реальный рынок для «mermaid editor» заметно дороже (порядка €0.3–1.5+ за клик). Такая ставка практически **не выигрывает аукционы**: кампания будет жить, но с ~нулевыми показами/кликами и почти нулевым расходом. Это нормально, если цель — «завести кампанию вручную дёшево/проверить пайплайн», но трафика от неё ждать не стоит. Если нужны реальные показы — ставку позже можно поднять (скрипт `update-*-bids` или UI).

---

## 3. RSA-копирайтинг (вариант, из реальных строк сайта, ≤30/≤90 симв.)

Заголовки (≤15 шт., ≤30 симв.):
- `Free Mermaid Live Editor`
- `Mermaid Editor Online`
- `Visual Canvas + Mermaid Code`
- `Draw Diagrams in the Browser`
- `Free Forever, No Paywall`
- `No Sign-Up Required`
- `8 Diagram Types Supported`
- `Export to SVG and PNG`
- `Renders as You Type`
- `Code and Canvas in Sync`
- `Mermaid Flowcharts, ERDs & More`
- `No Credit Card Required`

Описания (≤4 шт., ≤90 симв.):
- `A mermaid editor that keeps a visual canvas and the code in sync. Free, no paywall.`
- `Draw by clicking and dragging, or write mermaid by hand. Export SVG, PNG, .mmd or Markdown.`
- `The real mermaid engine redraws moments after your last keystroke. No sign-up needed.`
- `Free online mermaid editor. Click to add a block, drag an arrow — the code writes itself.`

---

## 4. Анти-перенос чужого проекта (главный чек-лист)

Возможные векторы «перекочевали из iq-rest/другого продукта» и контроль:

1. **Константы/код** — новый скрипт пишется с нуля под mermaid, не копи-паст с заменой имени:
   - [ ] Final URL/домен: только `iq-mermaid.com`, никаких `iq-rest.com`, `/it/...`, `/es/...`, якорей `#features/#pricing/#faq`.
   - [ ] Копирайтинг: только строки из mermaid (п. 3). Запрещённые маркеры в тексте: `IQ Rest`, `QR Menu`, `menu digitale`, `ristorante`, `restaurant`, цены/пробные периоды iq-rest, «35 языков» (у mermaid 34 локали), Stripe/подписки.
   - [ ] Негативы: только mermaid-список, без ресторанной/менюшной тематики.
   - [ ] Никаких image/logo asset-ов, никаких sitelink/callout/structured-snippet в коде.
   - [ ] Никаких `GOOGLE_ADS_CONVERSION_ACTION_ID*` из iq-rest (конверсии не ставим).
   - [ ] Гео/язык — только заданные (не тащить `IT geo 2380` / итальянский язык по умолчанию).
2. **Уровень аккаунта (автоприменяемые ассеты)** — это единственный вектор, который «приезжает» сам: в общем аккаунте могут быть auto-applied assets (сателки/коллауты/изображения/лого iq-rest), которые Google по умолчанию цепляет к новым кампаниям.
   - [ ] После создания — проверить вкладку «Ассеты» кампании в UI и GAQL-запрос (п. 5): чужие assets отключить / выключить автоприменение для кампании (Settings → Auto-applied assets).
3. **Другие сущности аккаунта**: убедиться, что к кампании не прилинкованы чужие shared negative lists / аудитории / расширения. Проверить критерии кампании.

---

## 5. Аудит после создания (проверка «ничего чужого нет»)

GAQL-запросы по новой кампании (customer_id из env):

- Кампания: `SELECT campaign.id, campaign.name, campaign.status FROM campaign WHERE campaign.name = 'Mermaid — Search — mermaid editor (broad, manual €0.01)'`
- Группа/ставка: `SELECT ad_group.id, ad_group.name, ad_group.cpc_bid_micros, ad_group.status FROM ad_group WHERE campaign.id = <id>` → ждём `cpc_bid_micros = 10000`
- Ключи: `SELECT ad_group_criterion.keyword.text, ad_group_criterion.keyword.match_type FROM ad_group_criterion WHERE campaign.id = <id> AND ad_group_criterion.type = 'KEYWORD'` → ждём ровно `mermaid editor / BROAD`
- Негативы: `... WHERE campaign_criterion.negative = true` → только свой список
- Объявления: `SELECT ad_group_ad.ad.id, ad_group_ad.ad.final_urls FROM ad_group_ad WHERE campaign.id = <id>` → host `iq-mermaid.com`
- Ассеты: `SELECT campaign_asset.campaign, campaign_asset.asset, campaign_asset.field_type, campaign_asset.status FROM campaign_asset WHERE campaign_asset.campaign = ...` → ожидаем **0 строк** (нет изображений/лого/сателок/сниппетов)
- Гео/язык: `... FROM campaign_criterion WHERE campaign.id = <id>` → только заданные

Плюс визуальная проверка в UI `https://ads.google.com/aw/campaigns?ocid=<CUSTOMER_ID>` (статус, ставка €0.01, активы, auto-applied assets).

---

## 6. Открытые вопросы (нужно решение до запуска)

1. **Аккаунт**: использовать тот же Google Ads customer (iq-rest `6803239831`, там уже провижены токены) — рекомендация; отдельный customer под mermaid = ручное заведение + новые токены.
2. **Гео/язык**: EN везде / EN-страны (US/UK/CA/AU/IE…) / ЕС+UK / US. Язык English в любом случае.
3. **Дневной бюджет**: €0.50 (минимум) / €1 / €3.
4. **Негативы** (опционально, broad-расширение): например `download`, `app`, `extension`, `vscode`, `python`, `tutorial`, `template` — или без негативов.
5. **Статус при создании**: `PAUSED` (сначала посмотреть в UI) или сразу `ENABLED`.

---

## 7. Шаги исполнения (после подтверждения плана)

1. Добавить в `mermaid/.env` (git-ignored) ключи `GOOGLE_ADS_CLIENT_ID / CLIENT_SECRET / REFRESH_TOKEN / DEVELOPER_TOKEN / CUSTOMER_ID / LOGIN_CUSTOMER_ID` — скопировать значения из `iq-rest/.env`; проверить, что непустые, не выводя значения.
2. Установить зависимость `google-ads-api` (dev) в mermaid.
3. Написать с нуля `scripts/google-ads/create-mermaid-editor-campaign.mjs` по образцу `create-*-campaign.ts`, но: 1 ключ BROAD, manual CPC `10000` micros, 1 RSA без asset-ов, pre-flight на дубликат имени, поддержка `--dry-run`.
4. `node --env-file=.env scripts/google-ads/create-mermaid-editor-campaign.mjs --dry-run` → проверить структуру (имя, ставка, ключ, URL, отсутствие asset-ов).
5. Прогнать live (статус по п. 6.5).
6. Аудит по п. 5 (GAQL + UI), при необходимости отключить auto-applied assets.
7. Отчёт: ссылка на кампанию, подтверждение «чужих изображений/бренда/сниппетов нет».

---

## 8. Справочно (источники)

- Эталон тулинга и документ: `iq-rest/apps/landing/scripts/GOOGLE_ADS.md` и `create-*-campaign.ts` (ветка `fix/active-restaurant-cookie`).
- Креды-источник: `iq-rest/.env` (переменные `GOOGLE_ADS_*`).
- Данные по ключу: `mermaid-keywords-raw.json` в корне umbrella-папки iq-rest.

---

## 9. Результат запуска (факт)

Создано live скриптом `scripts/google-ads/create-mermaid-editor-campaign.cjs`:

- Кампания: `Mermaid — Search — mermaid editor (broad, manual €0.01)`
  — `customers/6803239831/campaigns/24226434682`, бюджет `campaignBudgets/15850512680` (€0.50/день = 500 000 micros)
- Ad group: `AG — mermaid editor (broad)` — `adGroups/199455287426`, default max CPC **10 000 micros = €0.01**
- Ключ: 1 шт `mermaid editor` / **BROAD** (`adGroupCriteria/199455287426~664145604205`)
- Объявление: 1 RSA, Final URL `https://iq-mermaid.com` (`ads/823637170279`)
- Критерии: язык English (`languageConstants/1000`), 18 негативов (PHRASE), гео — нет (весь мир), 3 дефолтных DEVICE-критерия Google (все устройства)

Проверка после запуска (`scripts/google-ads/audit-mermaid-editor-campaign.cjs 24226434682`) — **AUDIT PASS**: Manual CPC без Enhanced, 0 campaign assets (нет изображений/лого/сателок/коллаутов/сниппетов), нет LOCATION и BRAND-критериев — из iq-rest/других проектов ничего не перекочевало.

Управление в UI: `https://ads.google.com/aw/campaigns?ocid=6803239831`

---

## 10. Bid-landscape по «mermaid editor» (Keyword Plan, EN/US, EUR)

Проверка `scripts/google-ads/keyword-research-mermaid-editor.cjs` (read-only):

| Ключ | Поисков/мес | Конкуренция | low–high Top-of-page € |
| --- | --- | --- | --- |
| mermaid live editor | 14 800 | LOW (idx 3) | 1.90 – 8.28 |
| mermaid editor | 1 900 | LOW (idx 8) | 0.88 – 7.08 |
| mermaid online editor | 390 | LOW | 0.99 – 8.61 |
| mermaid diagram editor | 590 | LOW | 0.91 – 4.52 |
| mermaid flowchart editor | 20 | LOW | нет данных |
| mermaid wysiwyg / markdown / drag-and-drop editor | 10–20 | LOW | нет данных |

Вывод по ставке €0.01: на запросах **с конкуренцией** показ невозможен (порог аукциона на порядки выше цента); на **бесконкурентном** длинном хвосте (10–50 поисков/мес) редкие показы/клики за копейку теоретически возможны — практически ожидаем ~0 показов, расход при любом исходе пренебрежимо мал. Проверяется эмпирически по метрикам кампании через несколько дней.
