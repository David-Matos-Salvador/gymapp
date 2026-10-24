# Producción: Caddy, TLS y límites de recursos

Runbook del override de producción. El stack base sigue siendo `docker-compose.yml`;
`docker-compose.prod.yml` agrega Caddy con TLS automático, límites de recursos y saca del
host los puertos internos.

> **Alcance:** un solo host Docker. No hay alta disponibilidad, orquestador ni registry de
> imágenes. No ejecutes estos pasos contra Contabo sin backup verificado y ventana de
> mantenimiento.

## Artefactos

| Archivo                     | Rol                                                                  |
| --------------------------- | -------------------------------------------------------------------- |
| `docker-compose.yml`        | Stack base: `db`, `redis`, `migrate`, `app` y volúmenes persistentes |
| `docker-compose.prod.yml`   | Override: Caddy, puertos públicos, límites y rotación de logs        |
| `Caddyfile`                 | Reverse proxy, compresión, límite de body, timeouts y headers        |
| `docs/deploy/produccion.md` | Este runbook                                                         |

## Arquitectura

```text
Internet :80/:443
        │
     Caddy  ──TLS──►  app:3000  ──►  db:5432
        │                 │
        │                 └──────►  redis:6379
        │
        └─ volumes: caddy_data (certificados), caddy_config

app ── volume uploads ──► /app/public/uploads
```

En producción solo Caddy publica puertos. `app`, `db` y `redis` quedan en la red interna de
Compose y no son alcanzables desde el host ni desde Internet.

## Requisitos

- Docker Engine 24+ y Docker Compose **v2.24 o superior** (`!reset` en el merge de puertos).
  Verificado con Compose `v2.38.2`.
- Host con al menos **2 vCPU y 4 GiB de RAM** (los límites suman ~3,5 GiB; el resto es SO,
  Docker y picos).
- Control del DNS del dominio y puertos 80/443 abiertos.
- `DOMAIN` definido antes de levantar el stack.

## 1. DNS

Creá el registro del dominio productivo (ejemplo `app.gymapp.pe`):

| Tipo | Nombre          | Valor                 | Cuándo                          |
| ---- | --------------- | --------------------- | ------------------------------- |
| A    | `app.gymapp.pe` | IPv4 pública del host | Siempre                         |
| AAAA | `app.gymapp.pe` | IPv6 pública del host | Solo si el host tiene IPv6 real |

Reglas:

- `DOMAIN` debe ser exactamente el nombre del certificado, sin `https://` ni barra final.
- Un solo registro A (varios A hacen fallar la validación ACME de forma intermitente).
- Si publicás AAAA, el host debe aceptar 80/443 por IPv6. Si no, quitá el AAAA.
- TTL bajo (300 s) durante la puesta en marcha; subilo después.
- No pongas el dominio detrás de un proxy/CDN con TLS propio (Cloudflare naranja, etc.) para
  la validación HTTP-01/TLS-ALPN. Si necesitás CDN, Caddy requiere el challenge DNS-01 y una
  build con plugin DNS (fuera de este runbook).
- Si el dominio tiene registros CAA, deben permitir los CAs que use Caddy (por defecto
  Let's Encrypt y ZeroSSL). Ante la duda, no publiques CAA hasta validar el certificado.

Verificación:

```bash
dig +short A app.gymapp.pe
dig +short AAAA app.gymapp.pe
```

## 2. Firewall

Exponé solo SSH, HTTP y HTTPS:

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp   # o tu puerto SSH real
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 443/udp   # opcional: HTTP/3; sin esto Caddy usa HTTP/2
sudo ufw enable
```

Advertencias:

- Docker escribe reglas propias en iptables y **puede saltear ufw**. Usá también el firewall
  del proveedor (security group / firewall cloud) y verificá desde otra red.
- Si no habilitás 443/udp, HTTP/3 no funciona pero el sitio sigue por TCP 443.
- No abras 3000, 5432 ni 6379.

## 3. Variables de entorno

Creá `.env.production` en el servidor, fuera del repo y con permisos restringidos:

```bash
install -m 600 /dev/null .env.production
```

Contenido (sin valores reales):

```dotenv
DOMAIN=app.gymapp.pe
AUTH_URL=https://app.gymapp.pe
NEXT_PUBLIC_APP_URL=https://app.gymapp.pe

POSTGRES_USER=gymuser
POSTGRES_DB=gymdb
POSTGRES_PASSWORD=<password-largo-y-aleatorio>
REDIS_PASSWORD=<password-largo-y-aleatorio>
AUTH_SECRET=<salida-de-openssl-rand-base64-32>

# Opcionales
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```

Notas:

- `AUTH_URL` y `NEXT_PUBLIC_APP_URL` deben ser `https://` y **no** `localhost`; la app valida
  esto al arrancar (`src/lib/env.ts`) y falla si no se cumple.
- `AUTH_SECRET` debe tener al menos 32 caracteres. Generá uno nuevo por entorno:
  `openssl rand -base64 32`.
- No definas `DATABASE_URL` ni `REDIS_URL`: Compose las arma con los passwords anteriores.
- `POSTGRES_PASSWORD` y `REDIS_PASSWORD` se insertan en URLs (`DATABASE_URL`, `REDIS_URL`).
  Usá caracteres URL-safe (`A-Z a-z 0-9 - _`) o URL-encodeá los especiales; `@ : / ? # %`
  sin escapar rompen la conexión.
- No commitees `.env.production` (ya está en `.gitignore`).
- Si cambiás `DOMAIN`, actualizá también `AUTH_URL` y `NEXT_PUBLIC_APP_URL`.

Definí un alias para no repetir los `-f` en cada comando:

```bash
dc() {
  docker compose --env-file .env.production \
    -f docker-compose.yml -f docker-compose.prod.yml "$@"
}
```

Comprobá la interpolación antes de levantar nada:

```bash
dc config --quiet
```

## 4. Primer deploy

```bash
git fetch --tags
git checkout <tag-de-produccion>

dc build
dc up -d
```

Qué hace `up -d`:

1. levanta `db` y `redis` y espera sus healthchecks;
2. ejecuta `migrate` (`prisma migrate deploy`) y espera a que termine con éxito;
3. levanta `app` y espera `service_healthy`;
4. levanta Caddy, que obtiene el certificado para `DOMAIN`.

Verificación:

```bash
dc ps -a
dc logs --tail=200 migrate
dc logs --tail=100 app
dc logs -f caddy
```

Esperado: `migrate` con exit code 0, `app` y `caddy` en `healthy`. Si `migrate` falla, `app` no
arranca (dependencia `service_completed_successfully`).

### Migraciones

El servicio `migrate` corre automáticamente en cada `up`. Para ejecutarlo explícitamente:

```bash
dc run --rm migrate
```

Reglas:

- En producción solo `prisma migrate deploy` (o `npm run db:migrate:deploy`).
- **Nunca** `prisma migrate dev`, `prisma db push` ni `npm run db:reset` contra producción.
- Las migraciones de Prisma son forward-only: un rollback de código no revierte el schema.

## 5. Healthcheck y puertos

```bash
curl -fsS https://app.gymapp.pe/api/health | jq .
```

Respuesta esperada: `"status":"ok"` y checks de `database`/`redis` en `ok`. Si devuelve 503,
alguno de los checks falló.

Estado de contenedores:

```bash
dc ps
docker inspect -f '{{.Name}} health={{.State.Health.Status}}' $(dc ps -q)
docker inspect -f '{{.Name}} oom={{.State.OOMKilled}}' $(dc ps -q)
```

Puertos publicados (solo Caddy):

```bash
docker ps --format 'table {{.Names}}\t{{.Ports}}' | grep gymapp
ss -lntup | grep -E ':(3000|5432|6379)\b' && echo "ERROR: puerto interno publicado" || echo "ok"
```

Desde otra máquina, `nc -zv app.gymapp.pe 3000` (y 5432/6379) debe fallar.

Para depurar la app sin publicar el 3000:

```bash
dc exec app wget -qO- http://127.0.0.1:3000/api/health
```

El override usa `ports: !reset []` para limpiar los puertos del compose base. Si ejecutás solo
`docker-compose.yml`, esos puertos vuelven a bindearse en `127.0.0.1`.

## 6. Validar TLS y certificados

```bash
# Respuesta HTTPS y HSTS
curl -sSI https://app.gymapp.pe | grep -iE 'strict-transport|server|x-request-id'

# Redirección HTTP -> HTTPS
curl -sSI http://app.gymapp.pe | head -n 5

# Certificado presentado
openssl s_client -connect app.gymapp.pe:443 -servername app.gymapp.pe </dev/null 2>/dev/null \
  | openssl x509 -noout -subject -issuer -dates
```

Esperado:

- `HTTP/2` o `HTTP/3`, `200` en `/api/health`;
- `Strict-Transport-Security` presente;
- `X-Request-Id` en la respuesta (Caddy inyecta un UUID por request y la app lo valida);
- certificado emitido por Let's Encrypt o ZeroSSL, con fechas vigentes;
- `http://` responde `308` hacia `https://`.

Caddy renueva automáticamente. Igual conviene un chequeo externo de expiración (uptime monitor
o `openssl ... -checkend 604800`).

> El healthcheck de Caddy valida que el proceso y la admin API respondan; **no** garantiza que
> el certificado se haya emitido. Validá TLS por separado con los comandos anteriores.

## 7. Si falla el challenge ACME

Checklist, en orden:

1. **DNS propagado y único**

   ```bash
   dig +short A app.gymapp.pe
   dig +short AAAA app.gymapp.pe
   ```

   Debe haber un A correcto. Si hay AAAA y el host no responde por IPv6, quitá el AAAA.

2. **Puertos alcanzables desde Internet**

   ```bash
   # Desde otra red, no desde el propio servidor
   nc -zv app.gymapp.pe 80
   nc -zv app.gymapp.pe 443
   ```

   Revisá firewall cloud, ufw y reglas de Docker. HTTP-01 necesita el puerto 80.

3. **Sin proxy/CDN delante**
   Cloudflare en modo proxy, túneles o balanceadores con TLS propio rompen HTTP-01. Poné el
   registro en DNS-only o usá DNS-01 (requiere build de Caddy con plugin DNS).

4. **CAA**

   ```bash
   dig +short CAA app.gymapp.pe
   ```

   Si existe, debe permitir el CA que intenta usar Caddy.

5. **`DOMAIN` correcto**
   Debe coincidir exactamente con el DNS y con `AUTH_URL`/`NEXT_PUBLIC_APP_URL`.

6. **Reloj del host**

   ```bash
   timedatectl status
   ```

   Un reloj desfasado invalida ACME.

7. **Logs de Caddy**

   ```bash
   dc logs --tail=300 caddy | grep -iE 'acme|tls|certificate|challenge|error'
   ```

8. **Rate limits**
   Let's Encrypt limita los fallos de validación. No reinicies Caddy en loop. Corregí la causa
   y reiniciá una vez:
   ```bash
   dc restart caddy
   ```

Para probar sin gastar el rate limit productivo, agregá temporalmente en el bloque global del
`Caddyfile`:

```caddyfile
acme_ca https://acme-staging-v02.api.letsencrypt.org/directory
```

Los certificados de staging **no son confiables** para usuarios. Al terminar, quitá esa línea,
bajá el stack y borrá el volumen de certificados para forzar una emisión real:

```bash
dc down
docker volume rm <proyecto>_caddy_data
dc up -d
```

Reemplazá `<proyecto>` por el nombre del proyecto Compose (`docker volume ls | grep caddy_data`).
Nunca borres `pgdata` ni `uploads` en producción.

## 8. Backups

El backup de la base **no alcanza**: también hay que respaldar uploads y el `.env.production`.

### Base de datos

```bash
mkdir -p backups
dc exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' \
  > "backups/gymapp-$(date -u +%Y%m%dT%H%M%SZ).dump"

pg_restore --list backups/gymapp-<timestamp>.dump >/dev/null
sha256sum backups/gymapp-<timestamp>.dump
```

### Uploads

```bash
dc exec -T app tar -C /app/public -czf - uploads \
  > "backups/uploads-$(date -u +%Y%m%dT%H%M%SZ).tar.gz"
sha256sum backups/uploads-<timestamp>.tar.gz
```

### Configuración y certificados

- `.env.production`: copia cifrada fuera del servidor. Contiene secretos.
- `caddy_data`: opcional. Si se pierde, Caddy reemite certificados (sujeto a rate limits).

Reglas:

- Copiá los backups **fuera del host** (S3, rclone, otro servidor).
- Programá un cron diario y probá una restauración al menos una vez por trimestre.
- Retención sugerida: 7 diarios + 4 semanales.
- Verificá el dump con `pg_restore --list` antes de confiar en él.

### Restaurar en una base nueva (recomendado)

Usá una release compatible con el schema del dump. Si estás haciendo rollback de código,
primero `git checkout <tag-anterior>` y `dc build app migrate`.

```bash
dc stop app
dc exec -T db sh -c 'createdb -U "$POSTGRES_USER" gymapp_rollback'
dc exec -T db sh -c 'pg_restore -U "$POSTGRES_USER" -d gymapp_rollback --no-owner --no-privileges' \
  < backups/gymapp-<timestamp>.dump
```

Luego apuntá `POSTGRES_DB=gymapp_rollback` en `.env.production`, verificá que no haya
migraciones pendientes y recreá la app:

```bash
dc run --rm migrate   # no-op esperado si el dump coincide con la release
dc up -d --force-recreate app
```

No hagas un restore `--clean` in-place sobre la base productiva salvo que sea la última opción
y con el stack detenido.

Restaurar uploads (con la app detenida para evitar escrituras). `exec` no funciona sobre un
contenedor detenido, así que se usa un contenedor one-off con el mismo volumen:

```bash
dc stop app
dc run --rm --no-deps -T app sh -c 'tar -C /app/public -xzf -' \
  < backups/uploads-<timestamp>.tar.gz
dc start app
```

## 9. Actualizaciones

```bash
git fetch --tags
git checkout <tag-nuevo>

dc build app migrate
dc up -d

dc logs --tail=200 migrate app
```

Hay una interrupción breve mientras se recrea `app`; Caddy devuelve 502/503 en esa ventana. No
hay rolling update ni segunda instancia.

## 10. Rollback

### Código

```bash
git checkout <tag-anterior>
dc build app migrate
dc up -d --force-recreate app
```

Si el release nuevo aplicó migraciones destructivas, el código anterior puede no ser
compatible: en ese caso restaurá la base desde el backup previo (sección 8) en una base nueva.
No edites `_prisma_migrations` a mano.

### Base de datos

Seguí el restore a base nueva de la sección 8 y cambiá `POSTGRES_DB`. Guardá el dump anterior
hasta validar el rollback.

### Qué no hacer

- `docker compose down -v` en producción: borra `pgdata`, `uploads`, `redisdata` y los
  certificados.
- `prisma db push`, `migrate dev` o `db:reset`.
- Borrar volúmenes para “limpiar” sin backup verificado.

## 11. Límites de recursos

| Servicio | `mem_limit` | `cpus` | Razón                                                            |
| -------- | ----------- | ------ | ---------------------------------------------------------------- |
| `app`    | 2 GiB       | 2.0    | Next.js + Prisma; heap V8 limitado a 1,5 GiB vía `NODE_OPTIONS`. |
| `db`     | 1 GiB       | 2.0    | Postgres con `shared_buffers` por defecto; `shm_size: 256mb`.    |
| `redis`  | 256 MiB     | 0.5    | Cache/sesiones. Sin `maxmemory`: el cgroup corta por OOM.        |
| `caddy`  | 256 MiB     | 0.5    | TLS, compresión y proxy.                                         |

Total aproximado: **3,5 GiB**. Los límites son duros (cgroup): al alcanzarlos, el kernel mata
el proceso (OOM) y `restart: unless-stopped` lo reinicia. En Postgres eso implica recuperación
de crash y posibles transacciones en vuelo perdidas.

Monitoreo:

```bash
docker stats --no-stream
docker inspect -f '{{.Name}} oom={{.State.OOMKilled}}' $(dc ps -q)
```

Para ajustar, editá `docker-compose.prod.yml` y aplicá:

```bash
dc up -d
```

No subas límites “por las dudas” sin medir: los `cpus` también throttlean. Si el host tiene más
recursos, el límite sigue siendo por contenedor.

## 12. Logs

```bash
dc logs -f --tail=200 caddy app
dc logs --since=1h caddy | grep '"level":"error"'
dc logs -f db redis
```

- Caddy escribe access logs JSON a stdout con `uuid`, IP remota, status y duración.
- El override limita los logs de Docker a **10 MB × 3 archivos** por contenedor. Para retención
  centralizada, configurá un logging driver externo (fuera de este runbook).
- No agregues headers sensibles a los access logs.

## 13. Riesgos y límites conocidos

- **DNS/certificado:** el primer deploy depende de DNS correcto y puertos 80/443 alcanzables.
  Un AAAA mal configurado o un CDN en modo proxy son las causas más comunes de fallo.
- **Rate limits ACME:** los reintentos en loop agravan el problema. Corregí la causa antes de
  reiniciar Caddy.
- **Un solo host:** no hay HA. Caddy, app y base comparten el mismo punto de falla.
- **Deploy con downtime breve:** `app` se recrea; no hay rolling update.
- **Uploads:** Caddy limita la request a **10 MB**; la app limita a **5 MB por archivo**
  (`src/app/api/upload/route.ts`). Si subís el límite de la app, actualizá también Caddy.
  Los uploads viven en el volumen `uploads` y necesitan backup propio.
- **SSE:** `/api/events` es un stream de larga duración. El Caddyfile **no** define un timeout
  `write` duro y el heartbeat de la app (25 s) mantiene vivo `write_idle` (60 s). Si ponés un
  CDN/proxy delante, desactivá buffering y timeouts para esa ruta.
- **Puertos:** solo el merge de `docker-compose.yml` + `docker-compose.prod.yml` elimina
  3000/5432/6379 del host. Docker puede saltear ufw; usá firewall cloud y verificá desde afuera.
- **`!reset`:** requiere Compose v2.24+. En versiones viejas el merge falla o deja puertos
  publicados.
- **Nombres fijos:** `gymapp-app`, `gymapp-db`, `gymapp-redis`, `gymapp-caddy`. No corras dos
  stacks (staging + prod) en el mismo host sin renombrarlos.
- **Límites duros:** OOM en `db` puede requerir recuperación; monitoreá `docker stats` y
  `OOMKilled`.
- **Redis:** no se configuró `maxmemory`; si el dataset supera 256 MiB, el cgroup lo mata y se
  pueden perder claves recientes. Monitoreá memoria o agregá `--maxmemory` con una política
  acorde al uso (por ejemplo `noeviction` si las sesiones no deben evictarse).
- **Caddy `request_body`:** el límite de body es una directiva relativamente nueva; está
  validado con `caddy:2.11-alpine`. Revalidá el Caddyfile al actualizar la imagen.
- **Migraciones forward-only:** el rollback de código no revierte el schema. El rollback real
  es restaurar un backup en una base nueva.
- **Secretos:** `.env.production` y los dumps contienen credenciales. No los subas al repo ni
  los pegues en tickets/logs.
- **Sin WAF ni rate limiting de borde:** Caddy no incluye rate limit estándar. Si lo necesitás,
  evaluá un plugin o un servicio externo.

## 14. Verificación previa al deploy (sin levantar producción)

Con un dominio dummy y variables HTTPS ficticias:

```bash
# En el host de deploy, con .env.production real:
dc config --quiet

# En CI/local, usando el .env local y un dominio dummy:
DOMAIN=app.example.test \
AUTH_URL=https://app.example.test \
NEXT_PUBLIC_APP_URL=https://app.example.test \
docker compose -f docker-compose.yml -f docker-compose.prod.yml config --quiet
```

Validar el Caddyfile:

```bash
docker run --rm -e DOMAIN=app.example.test \
  -v "$PWD/Caddyfile:/etc/caddy/Caddyfile:ro" \
  caddy:2.11-alpine caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
```

Ambos comandos deben terminar con exit code 0. No levantan contenedores de producción.
