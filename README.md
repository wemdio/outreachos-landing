# outreachOS — landing

Статический лендинг для **outreachOS** (`https://outreachos.pro`). Вход в приложение — `https://app.outreachos.pro`.

Полностью статический: один `index.html` + ассеты. **Сборки нет.**

## Структура

```
index.html            # вся страница (HTML + CSS + JS инлайн)
fonts/                # self-hosted шрифты (Fixel Display, Spectral, JetBrains Mono) — без внешних CDN
hero-d1-768.webp      # рендер-схема (мобайл, srcset 768w)
hero-d1-1200.webp     # рендер-схема (дефолт / OG-превью, srcset 1200w)
hero-d1-1600.webp     # рендер-схема (десктоп-ретина, srcset 1600w)
outreachos-logo.webp  # лого в навбаре (WebP)
icon-tg.png           # иконка Telegram
icon-wa.png           # иконка WhatsApp
llms.txt              # сводка сайта для AI-агентов/LLM (стандарт llmstxt.org)
robots.txt            # директивы для краулеров (+ ссылка на sitemap)
sitemap.xml           # карта сайта (одна страница)
```

## Локальный просмотр

```bash
npx http-server . -p 4321 -c-1
# открыть http://localhost:4321
```

(Любой статический сервер подойдёт — `python -m http.server`, и т.п.)

## Деплой на Timeweb (VPS + nginx)

```bash
# на сервере
sudo mkdir -p /var/www/outreachos-landing
# залить файлы (с локальной машины):
rsync -avz --delete ./ user@SERVER_IP:/var/www/outreachos-landing/
```

nginx:

```nginx
server {
    listen 80;
    server_name outreachos.pro www.outreachos.pro;
    root /var/www/outreachos-landing;
    index index.html;

    # кэш ассетов (шрифты/картинки не меняются)
    location ~* \.(woff2|webp|png|svg|ico)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    location / { try_files $uri $uri/ /index.html; }
}
```

HTTPS:

```bash
sudo certbot --nginx -d outreachos.pro -d www.outreachos.pro
```

## Деплой на статик-хостинг (альтернатива)

Любой хост статики (Timeweb Apps, Cloudflare Pages, Netlify): **build command — пусто, output dir — корень репо (`.`)**. Сборки нет.

## DNS

- `outreachos.pro` → этот лендинг (сервер/хостинг статики)
- `app.outreachos.pro` → сервер приложения

## Заметки

- Шрифты **self-hosted** в `fonts/` — никаких внешних CDN (важно для РФ-аудитории и стабильности).
- Скрытые dev-режимы для правок схемы в герое: `#edit` (перетащить подписи), `#editfx` (перетащить пути частиц). На обычных пользователей не влияют — активны только при наличии хэша в URL.
