# 🚀 GhostClips.io - Netlify Deployment Guide

## Korak 1: Poveži s Netlify

1. Idi na **[app.netlify.com](https://app.netlify.com)**
2. Klikni **"Add new site"** → **"Import an existing project"**
3. Odaberi **GitHub**
4. Pronađi repo: **bakatraka555/ghostclips.io**
5. Klikni **Deploy**

Netlify će automatski prepoznati `netlify.toml` konfiguraciju.

---

## Korak 2: Dodaj Environment Variables

Idi na: **Site settings** → **Environment variables** → **Add a variable**

| Varijabla | Vrijednost | Napomena |
|-----------|------------|----------|
| `GOOGLE_AI_API_KEY` | (kopiraj iz Raincrest) | Za AI slike |
| `BUNNY_API_KEY` | (kopiraj iz Raincrest) | Za CDN storage |
| `BUNNY_STORAGE_ZONE` | `ghostclips` | Nova zona |
| `BUNNY_CDN_DOMAIN` | `ghostclips.b-cdn.net` | Novi CDN |

---

## Korak 3: Kreiraj Bunny.net Storage Zone

1. Idi na **[panel.bunny.net](https://panel.bunny.net)**
2. Storage → **Add Storage Zone**
3. Naziv: `ghostclips`
4. Region: Frankfurt (EU) ili New York (US)
5. Klikni **Create**

### Kreiraj Pull Zone (CDN):
1. Pull Zones → **Add Pull Zone**
2. Origin: **Storage Zone** → `ghostclips`
3. Hostname: `ghostclips` (dobit ćeš `ghostclips.b-cdn.net`)
4. Klikni **Create**

---

## Korak 4: Deploy!

Commit bilo što ili klikni **"Trigger deploy"** u Netlify.

Tvoja aplikacija će biti dostupna na:
- `https://ghostclips-io.netlify.app` (ili slično)

---

## Korak 5: Custom Domain (Opcionalno)

1. **Site settings** → **Domain management**
2. Klikni **Add domain**
3. Unesi: `ghostclips.io`
4. Slijedi upute za DNS postavke

---

## 🧪 Test

1. Otvori: `https://tvoj-site.netlify.app`
2. Idi na `/app.html`
3. Klikni 🎲 za random prompt
4. Klikni **Generate Video**
5. Ako sve radi - slika se generira!

---

## ❓ Troubleshooting

### "GOOGLE_AI_API_KEY not configured"
- Provjeri da si dodao env variable u Netlify
- Redeploy site nakon dodavanja

### Slika se ne uploada na Bunny
- Provjeri BUNNY_API_KEY
- Provjeri da storage zone postoji
- Provjeri CORS na Bunny (Allow all origins)

### Functions timeout
- Netlify free tier ima 10s limit
- Upgrade na Pro za 26s ($19/mj)

---

## ✅ Checklist

- [ ] GitHub repo connected
- [ ] Netlify site created
- [ ] Environment variables added
- [ ] Bunny storage zone created
- [ ] Bunny pull zone (CDN) created
- [ ] First successful image generation
- [ ] Custom domain (optional)
