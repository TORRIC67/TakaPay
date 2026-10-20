# Kuhost Taka Pay bure (Render + Neon)

Muundo: **Frontend** (Render Static Site) -> **Backend** (Render Web Service) -> **Database** (Neon).
Hakuna kadi ya benki inayohitajika kuanza. Hali ilikaguliwa Oktoba 2026; masharti ya mipango ya bure hubadilika, angalia tovuti zao kabla ya kuamua.

## Kwa nini muundo huu
- **Render Postgres ya bure inafutwa siku 30 baada ya kuitengeneza** (data pia, baada ya siku 14 za ziada). Ndiyo sababu database iko Neon.
- **Neon Free**: 0.5 GB, haina kikomo cha muda; inalala baada ya dakika 5 bila matumizi na kuamka ndani ya sekunde chache.
- **Render Web Service ya bure** inalala baada ya dakika 15 bila ombi; ombi la kwanza baadaye linachukua takriban dakika 1. Diski yake ni ya muda (inafutika), ndiyo sababu risiti za benki ziko ndani ya database.
- **Epuka Vercel Hobby**: masharti yake yanakataza matumizi ya kibiashara. Render Static na Cloudflare Pages zinaruhusu.

## Hatua
### 1. GitHub
Weka project kwenye repo ya GitHub (private ni sawa). USIPAKIE `.env`, `.venv`, `node_modules` wala `*.db` (`.gitignore` tayari inazuia).
Hakikisha `backend/brand/logo.png` na `favicon.png` vimo.

### 2. Neon (database)
1. neon.com -> Sign up -> New Project (chagua region iliyo karibu na Render, mfano Frankfurt).
2. Bonyeza **Connect**, ZIMA "Connection pooling" (tunataka anwani ya moja kwa moja), nakili connection string:
   `postgresql://USER:PASS@ep-xxxx.region.aws.neon.tech/neondb?sslmode=require`
   (project inabadilisha `postgresql://` kuwa driver sahihi yenyewe).

### 3. Render (backend + frontend)
1. dashboard.render.com -> New -> **Blueprint** -> chagua repo yako. Inasoma `render.yaml` na kutengeneza huduma mbili: `smarttaka-api` na `smarttaka`.
2. Jaza vitu vyenye `sync: false`: `DATABASE_URL` (ya Neon), `HARAKAPAY_API_KEY`, `HARAKAPAY_WEBHOOK_TOKEN`, `HARAKAPAY_WEBHOOK_URL`, `MESEJI_API_KEY`, `SENSOR_API_KEY`.
3. Subiri build. Fungua `https://<backend-yako>.onrender.com/health` (inapaswa kujibu OK) na `/docs`.
4. Angalia anwani HALISI za huduma zote mbili (Render inaweza kuongeza herufi ikiwa jina limechukuliwa) na urekebishe:
   - backend: `CORS_ORIGINS` = `["https://<frontend-yako>.onrender.com"]` na `APP_URL` = anwani ya frontend
   - frontend: `VITE_API_URL` = `https://<backend-yako>.onrender.com`
   Kisha **redeploy** frontend (VITE_API_URL inaingia wakati wa build).
5. `HARAKAPAY_WEBHOOK_URL` = `https://<backend-yako>.onrender.com/payments/webhooks/harakapay?token=<HARAKAPAY_WEBHOOK_TOKEN>`

### 4. Admin wa kwanza (kutoka PC yako)
Kwenye PowerShell, ndani ya `backend` ukiwa na venv:
```
$env:DATABASE_URL="postgresql://USER:PASS@ep-xxxx.region.aws.neon.tech/neondb?sslmode=require"
python seed_admin.py 07XXXXXXXX "Jina Lako"
```
Inaomba password. Hii inaweka admin kwenye database ya mtandaoni (meza zinatengenezwa pia). Funga dirisha baadaye ili `DATABASE_URL` ifutike.

### 5. Jaribu
Fungua frontend, ingia kama admin, jisajili kama mkazi (OTP inahitaji SMS halisi: `SMS_PROVIDER=meseji` na funguo), lipa kwa jaribio.

## Mambo ya kuzingatia
- **Presentation:** fungua tovuti dakika 2 kabla ili huduma iamke. Mbinu ya kawaida ya kuiweka macho ni huduma ya bure ya kupiga ping kila dakika 5 (mfano UptimeRobot); saa 750 za bure kwa mwezi zinatosha huduma moja.
- **Malipo halisi:** webhook ikifika huduma ikiwa imelala, ombi huchelewa takriban dakika 1; mfumo una ukaguzi wa kurudia (reconcile) unaoshughulikia malipo yaliyochelewa. Kwa wateja halisi, fikiria Render Starter (takriban $7/mwezi) isilale.
- **Neon 0.5 GB:** risiti za benki zinahifadhiwa kwenye database (hadi MB 5 kila moja); angalia matumizi mara kwa mara.
- **Usalama:** weka `SECRET_KEY` mpya (render.yaml inaitengeneza yenyewe), usitumie funguo za majaribio, na usiweke `CORS_ORIGIN_REGEX` kwenye seva halisi.
