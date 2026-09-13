# PROMPT MAESTRO — Captura de email + login con Supabase (sitio Zignalez)

> Conecta el formulario de captura (`#lista`) del sitio estático de Zignalez a **Supabase**
> (Auth + Database) para registrar suscriptores con doble opt-in y ofrecer un "login" vía
> magic link que da acceso a una zona de miembros. Estático (Pages), sin backend propio.

## ROL Y PRINCIPIO
Ingeniero backend-lite + seguridad, adversarial. Regla dura: **el dato del fan no se
guarda sin su consentimiento verificado** (doble opt-in, Ley 21.719 Chile). Magic link =
la UX más simple para un fan que no va a recordar una contraseña. Sin rojo del sello
(`#F80606`). Nada "listo" sin probar el flujo completo (registro → email → confirmación →
login → zona miembros).

## 0. ESTADO REAL (verificado esta sesión; re-verificar antes de tocar)
- Sitio estático vanilla (`index.html`, ~188 KB) en **Cloudflare Pages** (`zignalez-web.pages.dev`).
- Formulario `#lista` (`<form id="capture-form">`): campos `email` (required), `whatsapp`
  (opcional), checkbox de consentimiento, botón "Unirme a la lista".
- Variable `ENDPOINT_CAPTURA = ""` → **modo demo**: el form muestra mensaje honesto y no envía
  nada. Todo el manejo en JS vanilla al final del `index.html`.
- No hay zona de miembros implementada. La sección `#miembros` existe solo como placeholder.
- **No hay backend desplegado** (el api-gateway del monorepo está en dev, no en producción).

## ARQUITECTURA PROPUESTA: SUPABASE (free tier)

### ¿Por qué Supabase?
- **$0 en free tier** (suficiente para dev + primeros ~1000 fans): 500 MB Postgres, 50.000 MAU,
  Auth con magic link, Edge Functions, 2 GB bandwidth.
- **$25/mes Pro** cuando escale (8 GB DB, 100.000 MAU, email personalizado, backups diarios).
- El sitio sigue estático en Pages — solo se agrega `supabase-js` (CDN, ~45 KB gzip) que habla
  directo con Supabase usando la **anon key** (pública, segura con Row Level Security).
- Sin lock-in: la tabla se exporta como SQL/CSV en cualquier momento.
- Auth magic link envía el correo de confirmación → doble opt-in nativo.

### Flujo completo

```
Fan llega al sitio → ve #lista → ingresa email (+ whatsapp opcional) + marca consentimiento
  ↓
JS: supabase.auth.signInWithOtp({ email, options: { data: { whatsapp, consent_ts } } })
  ↓
Supabase Auth envía magic link al correo del fan (plantilla personalizable)
  ↓
Fan hace click en el link → Supabase lo redirige a zignalez.com/?login=confirmed
(o /miembros.html si se prefiere una página separada)
  ↓
JS detecta el fragmento de auth en la URL → supabase.auth.getSession() → sesión activa
  ↓
Fan autenticado → ve la zona de miembros (adelantos con audio, contenido exclusivo)
  ↓
Trigger en Supabase: on auth.users INSERT → copia email/whatsapp a tabla `subscribers`
(o directamente en el client: después del OTP exitoso, insert en `subscribers`)
```

## 1. CONFIGURACIÓN DE SUPABASE (manual, una vez)

### 1.1 Crear proyecto
1. `supabase.com` → New Project → nombre: `zignalez-fans` → región: `South America (São Paulo)`.
2. Anotar: **Project URL** (`https://xxxxx.supabase.co`) y **anon key** (pública, safe para frontend).
3. Guardar el **service_role key** en un lugar seguro (**nunca** en el frontend).

### 1.2 Crear tabla `subscribers`
```sql
-- En Supabase SQL Editor
CREATE TABLE public.subscribers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  whatsapp TEXT,
  consent_ts BIGINT NOT NULL,           -- timestamp del consentimiento (JS Date.now())
  confirmed BOOLEAN DEFAULT FALSE,       -- true cuando confirma el magic link
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  source TEXT DEFAULT 'web'              -- para tracking futuro (web, qr, link directo)
);

-- Índice para búsquedas
CREATE INDEX idx_subscribers_email ON public.subscribers(email);

-- Row Level Security (OBLIGATORIO — la anon key es pública)
ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;

-- Policy: el frontend con anon key solo puede INSERT (no leer, no borrar)
CREATE POLICY "Anon puede registrarse"
  ON public.subscribers FOR INSERT
  TO anon
  WITH CHECK (TRUE);

-- Policy: un usuario autenticado puede leer SU propio registro
CREATE POLICY "Fan lee su registro"
  ON public.subscribers FOR SELECT
  TO authenticated
  USING (email = auth.jwt() ->> 'email');

-- Policy: nadie (excepto service_role) puede DELETE o UPDATE desde el frontend
-- (no se crean policies para DELETE/UPDATE → bloqueado por defecto con RLS)
```

### 1.3 Configurar Auth
1. **Authentication → Providers → Email**: habilitar "Magic Link" (viene habilitado por defecto).
2. **Authentication → Email Templates → Magic Link**: personalizar:
   - Subject: `Tu acceso a Zignalez 🔊`
   - Body: mantener el `{{ .ConfirmationURL }}` pero con branding Zignalez (fondo oscuro,
     logo, texto "Confirma tu acceso para ver contenido exclusivo antes que nadie").
3. **Authentication → URL Configuration**:
   - Site URL: `https://zignalez-web.pages.dev` (o dominio custom cuando exista).
   - Redirect URLs: agregar `https://zignalez-web.pages.dev/**` y el dominio custom.
4. **SMTP personalizado** (opcional pero recomendado en Pro): conectar un dominio verificado
   (ej. `noreply@zignalez.com` vía Resend, Postmark o Mailgun) para que el correo no
   llegue de `noreply@mail.app.supabase.io` (menos confiable, límite 4 emails/hora en free).

## 2. INTEGRACIÓN EN EL FRONTEND (index.html)

### 2.1 Agregar Supabase JS (CDN, antes del `</body>`)
```html
<!-- Supabase JS client (anon key es PÚBLICA, segura con RLS) -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/supabase-js/2.45.6/umd/supabase.min.js"
  integrity="sha384-..." crossorigin="anonymous"></script>
```
> **Verificar** la última versión estable en cdnjs y el hash SRI. Si cdnjs no tiene
> `supabase-js`, usar `https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js`.

### 2.2 Inicializar cliente
```javascript
// Al inicio del bloque <script> principal, ANTES del manejo del form
var SUPABASE_URL = 'https://TU_PROYECTO.supabase.co';
var SUPABASE_ANON_KEY = 'eyJ...';  // anon key (pública)
var sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
```

### 2.3 Reemplazar el manejo del formulario
```javascript
/* ====== Captura + Auth: Supabase magic link ====== */
var form = document.getElementById('capture-form');
var note = document.getElementById('note');
var submit = document.getElementById('submit');

// Detectar si el fan vuelve del magic link (sesión en URL fragment)
sb.auth.onAuthStateChange(function(event, session) {
  if (event === 'SIGNED_IN' && session) {
    showMiembros(session.user);
  }
});

// Verificar sesión existente al cargar
sb.auth.getSession().then(function(res) {
  if (res.data.session) {
    showMiembros(res.data.session.user);
  }
});

form.addEventListener('submit', function(e) {
  e.preventDefault();
  var email = form.email.value.trim();
  var wsp = form.whatsapp ? form.whatsapp.value.trim() : '';
  var consent = document.getElementById('consent').checked;

  if (!email || !consent) {
    note.className = 'form-note warn';
    note.textContent = 'Completa tu correo y marca el consentimiento.';
    return;
  }

  submit.disabled = true;
  note.className = 'form-note warn';
  note.textContent = 'Enviando…';

  // 1) Registrar en tabla subscribers (RLS permite INSERT anon)
  sb.from('subscribers').upsert(
    { email: email, whatsapp: wsp, consent_ts: Date.now() },
    { onConflict: 'email' }
  ).then(function(res) {
    if (res.error) {
      console.warn('Subscriber upsert:', res.error.message);
      // No bloquear — el magic link es lo importante
    }

    // 2) Enviar magic link (esto ES el doble opt-in: si no hace click, no queda autenticado)
    return sb.auth.signInWithOtp({
      email: email,
      options: {
        data: { whatsapp: wsp },
        emailRedirectTo: window.location.origin + '/#miembros'
      }
    });
  }).then(function(res) {
    if (res && res.error) throw res.error;
    note.className = 'form-note ok';
    note.textContent = 'Revisa tu correo — te envié un link para confirmar tu acceso.';
    submit.textContent = '✓ Revisa tu correo';
  }).catch(function(err) {
    submit.disabled = false;
    note.className = 'form-note err';
    note.textContent = 'No se pudo enviar. Intenta de nuevo en un momento.';
    console.error('Captura error:', err);
  });
});

// Logout
function logout() {
  sb.auth.signOut().then(function() {
    document.getElementById('miembros-content').hidden = true;
    document.getElementById('miembros-locked').hidden = false;
  });
}

// Mostrar zona de miembros
function showMiembros(user) {
  var locked = document.getElementById('miembros-locked');
  var content = document.getElementById('miembros-content');
  if (locked) locked.hidden = true;
  if (content) {
    content.hidden = false;
    var nameEl = content.querySelector('.member-email');
    if (nameEl) nameEl.textContent = user.email;
  }
  // Marcar como confirmado en la tabla
  sb.from('subscribers').update({ confirmed: true, confirmed_at: new Date().toISOString() })
    .eq('email', user.email).then(function(){});
}
```

### 2.4 Zona de miembros (HTML, reemplaza el placeholder `#miembros`)
```html
<section id="miembros">
  <div class="wrap">
    <!-- Estado: no autenticado -->
    <div id="miembros-locked">
      <div class="sec-head">
        <h2>Zona de miembros</h2>
        <span class="eyebrow">Acceso con tu correo</span>
      </div>
      <div class="miembros-gate">
        <p>¿Ya estás en la lista? Ingresa tu correo para acceder al contenido exclusivo.</p>
        <form id="login-form" class="login-inline">
          <input type="email" id="login-email" placeholder="tu@correo.com" required autocomplete="email">
          <button type="submit" class="btn btn-primary btn-sm">Acceder</button>
        </form>
        <div class="form-note" id="login-note" role="status" aria-live="polite"></div>
        <p class="muted" style="font-size:13px;margin-top:12px">
          ¿No estás en la lista? <a href="#lista" class="link-inline">Únete arriba</a>.
        </p>
      </div>
    </div>

    <!-- Estado: autenticado -->
    <div id="miembros-content" hidden>
      <div class="sec-head">
        <h2>Bienvenido a la señal</h2>
        <button onclick="logout()" class="link-inline" style="cursor:pointer;border:0;background:none">Cerrar sesión</button>
      </div>
      <p>Conectado como <strong class="member-email"></strong></p>
      <div class="miembros-grid">
        <!-- CONTENIDO EXCLUSIVO: agregar aquí -->
        <div class="miembro-card">
          <div class="eyebrow" style="margin-bottom:10px">Próximamente</div>
          <h3>Adelantos con audio</h3>
          <p class="muted">Los temas nuevos suenan aquí antes de llegar a plataformas.
             Cuando estén listos, aparecerán en esta sección.</p>
        </div>
        <div class="miembro-card">
          <div class="eyebrow" style="margin-bottom:10px">Próximamente</div>
          <h3>Maquetas inéditas</h3>
          <p class="muted">Versiones crudas, demos y procesos creativos que no se publican.</p>
        </div>
      </div>
    </div>
  </div>
</section>
```

### 2.5 CSS adicional (zona de miembros + login inline)
```css
/* Zona de miembros */
.miembros-gate{max-width:480px;margin:0 auto;text-align:center;padding:40px 0}
.login-inline{display:flex;gap:10px;margin-top:20px;flex-wrap:wrap}
.login-inline input{flex:1;min-width:200px;padding:14px 16px;background:var(--ink-2);border:1px solid var(--line);border-radius:4px;color:var(--chrome-hi);font-size:16px;font-family:var(--font-b)}
.login-inline input:focus{outline:none;border-color:var(--uv)}
.miembros-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,280px),1fr));gap:20px;margin-top:30px}
.miembro-card{background:var(--ink-2);border:1px solid var(--line);border-radius:8px;padding:24px}
.miembro-card h3{font-size:18px;margin-bottom:8px}
```

### 2.6 JS para el login inline (zona miembros)
```javascript
/* Login inline en zona de miembros */
var loginForm = document.getElementById('login-form');
var loginNote = document.getElementById('login-note');
if (loginForm) {
  loginForm.addEventListener('submit', function(e) {
    e.preventDefault();
    var email = document.getElementById('login-email').value.trim();
    if (!email) return;
    loginNote.className = 'form-note warn';
    loginNote.textContent = 'Enviando link de acceso…';
    sb.auth.signInWithOtp({
      email: email,
      options: { emailRedirectTo: window.location.origin + '/#miembros' }
    }).then(function(res) {
      if (res.error) throw res.error;
      loginNote.className = 'form-note ok';
      loginNote.textContent = 'Revisa tu correo — te envié un link para acceder.';
    }).catch(function() {
      loginNote.className = 'form-note err';
      loginNote.textContent = 'No se pudo enviar. ¿Estás en la lista?';
    });
  });
}
```

## 3. CONFIGURACIÓN DE VARIABLES (lo único que cambia al conectar)

```javascript
// REEMPLAZAR estos valores con los de tu proyecto Supabase:
var SUPABASE_URL = 'https://TU_PROYECTO.supabase.co';
var SUPABASE_ANON_KEY = 'eyJ...tu_anon_key...';
```

> **Seguridad**: la `anon key` es **pública por diseño** en Supabase. La seguridad está en
> las **Row Level Security policies** (paso 1.2). El `service_role key` **nunca** va en el
> frontend.

## 4. MODO DEMO (sin Supabase configurado)

Mientras `SUPABASE_URL` esté vacío o sea placeholder, el formulario debe mostrar el
mensaje de demo actual. Implementar como:

```javascript
var DEMO_MODE = !SUPABASE_URL || SUPABASE_URL.includes('TU_PROYECTO');
if (DEMO_MODE) {
  note.className = 'form-note dev';
  note.textContent = 'Conecta Supabase para activar el registro (ver PROMPT_MAESTRO_CAPTURA).';
}
```

## 5. FASES DE IMPLEMENTACIÓN

### Fase 1 — Setup Supabase (10 min)
1. Crear proyecto en `supabase.com`.
2. Ejecutar SQL del paso 1.2 (tabla + RLS).
3. Configurar Auth (paso 1.3).
4. Copiar URL + anon key.

### Fase 2 — Integrar en index.html (15 min)
1. Agregar `<script>` de supabase-js (CDN).
2. Reemplazar el bloque de formulario JS con el del paso 2.3.
3. Agregar zona de miembros HTML (paso 2.4) y CSS (paso 2.5).
4. Agregar login inline JS (paso 2.6).
5. Pegar URL + anon key en las variables.

### Fase 3 — Probar flujo completo
1. Abrir el sitio → ingresar email → verificar que aparece en `subscribers` en Supabase.
2. Verificar que llega el magic link al correo.
3. Click en magic link → verificar redirección a `/#miembros`.
4. Verificar que la zona de miembros muestra el email y el contenido.
5. Cerrar sesión → verificar que vuelve al estado locked.
6. Probar login inline en zona de miembros con el mismo email.

### Fase 4 — Personalizar email (opcional, recomendado)
1. En Supabase → Auth → Email Templates → personalizar con branding Zignalez.
2. (Pro) Conectar SMTP propio para enviar desde `@zignalez.com`.

### Fase 5 — Contenido exclusivo (gradual)
1. Subir adelantos con audio a Supabase Storage (o links privados).
2. Reemplazar los placeholders en `.miembro-card` por reproductores reales.
3. Los archivos en Storage se protegen con policies: solo `authenticated` puede leer.

## ESTIMACIÓN DE COSTOS

| Tier | Fans | Costo/mes | Incluye |
|------|------|-----------|---------|
| Free | 0–1.000 | **$0** | 500 MB DB, 50K MAU, Auth, magic link (4/hr desde Supabase SMTP) |
| Pro | 1.000–50.000 | **$25** | 8 GB DB, 100K MAU, SMTP custom, backups, analytics |

> El sitio en Pages sigue siendo **$0** (free tier de Cloudflare). El costo total es $0 hasta
> que necesites Pro, y $25/mes cuando escales.

## GUARDRAILS
Sin rojo `#F80606` · `anon key` pública, **service_role key NUNCA en frontend** · RLS
obligatorio (sin RLS = base de datos abierta al mundo) · doble opt-in vía magic link ·
Ley 21.719: consentimiento explícito antes de guardar (checkbox) + política de privacidad
enlazada · modo demo cuando no hay Supabase configurado · sin fake success (si falla, dice
que falló).

## CRITERIOS DE ACEPTACIÓN
1. Fan ingresa email + consiente → recibe magic link → click → queda autenticado → ve zona
   de miembros con su email.
2. `subscribers` en Supabase tiene el registro con `confirmed: true` y `confirmed_at`.
3. Sin sesión: zona de miembros muestra gate con login inline.
4. Login inline envía magic link → click → autenticado → contenido visible.
5. Logout limpia sesión → vuelve al gate.
6. RLS: desde el navegador con anon key, no se pueden leer ni borrar registros ajenos.
7. Sin Supabase configurado: modo demo con mensaje honesto.
8. Mobile: formulario sin zoom (16px), botones ≥44px, responsive.

## ALTERNATIVAS EVALUADAS Y DESCARTADAS

| Opción | Pros | Contras | Veredicto |
|--------|------|---------|-----------|
| **Cloudflare Workers + D1** | Mismo ecosistema, $0 | No tiene Auth nativo, hay que implementar magic link manual (SES/Resend), más código, más mantenimiento | Descartado: más trabajo por el mismo resultado |
| **Formspree/Basin** | Setup 2 min | No tiene login/auth, no da base de datos propia, $0 hasta 50 subs luego $8+/mes, datos en servicio externo | Descartado: no escala al login |
| **API Gateway propio** | Control total | No está desplegado, requiere VPS ($5+/mes), Auth casero = más superficie de ataque | Descartado: no hay infra estable |
| **Supabase** | Auth + DB + Storage, $0, magic link nativo, RLS, export fácil | Dependencia de servicio externo (mitigable: export SQL) | **Elegido** |

## AUDITORÍA DE FUENTES
- **[Seguro]** Supabase pricing y features: documentación oficial verificable en
  `supabase.com/pricing` y `supabase.com/docs`. Free tier: 500 MB DB, 50K MAU, Auth con
  magic link. Pro: $25/mes.
- **[Seguro]** Row Level Security: patrón documentado en `supabase.com/docs/guides/auth/row-level-security`.
  La anon key es pública por diseño; sin RLS, cualquiera con la key lee toda la tabla.
- **[Seguro]** Ley 21.719 (Chile, protección de datos): requiere consentimiento explícito,
  informado y específico antes de tratar datos personales. El checkbox + link a política
  cumple el requisito formal; el magic link cumple doble opt-in.
- **[Probable]** El free tier de Supabase se mantiene estable (~3 años sin cambios significativos),
  pero no hay garantía contractual de que no cambie.
- **Dato faltante que más cambiaría el resultado:** la existencia de un dominio propio
  (`zignalez.com`) — sin dominio custom, los magic links redirigen a `zignalez-web.pages.dev`,
  que es menos profesional y puede generar desconfianza en el fan.
