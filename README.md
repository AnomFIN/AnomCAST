# ANOMCAST

**ANOMCAST** on paikallisverkossa toimiva Chrome-to-TV -jakamistyökalu Samsung Smart TV:lle.  
Jaa nykyinen välilehti tai linkki suoraan telkkarin näytölle — yhdellä klikkauksella, ilman pilveä, ilman kirjautumista.

---

## Mitä se tekee (v0.1)

- Jaa nykyinen Chrome-välilehti telkkariin (popup-painike tai Alt+Shift+S)
- Jaa oikea-klikilla valittu linkki telkkariin (kontekstivalikko)
- Näytä viimeisin jaettu sivu TV-sivulla suuressa selkeässä näkymässä
- Valinnainen Samsung WebSocket -integraatio parhaaseen mahdolliseen automatisointiin

---

## Arkkitehtuuri

```
Chrome Extension  →  Local Bridge (Node.js)  →  TV Receiver Page
  (capture)            (store + serve)             (display)
```

1. **Extension** – kerää välilehden metatiedot ja lähettää ne bridgelle
2. **Bridge** – vastaanottaa, validoi ja tallentaa jaon muistiin; tarjoilee TV-sivun
3. **TV Page** – hakee uusimman jaon bridgeltä ja näyttää sen

---

## Kansiorakenne

```
/anomcast
  /extension
    manifest.json        MV3-manifest
    background.js        Service worker (kontekstivalikko, pikanäppäin, viestit)
    popup.html           Popup-UI
    popup.js             Popup-logiikka
    popup.css            Popup-tyyli
  /bridge
    package.json         NPM-metadata ja riippuvuudet
    server.js            Express-palvelin + reitit
    /services
      shareStore.js      Muistissa oleva tilavarasto
      samsungRemote.js   Samsung WebSocket -integraatio (best-effort)
    /utils
      logger.js          Konsoliloggeri
      network.js         Paikallisen IP-osoitteen tunnistus
      validateShare.js   Payloadin validointi ja normalisointi
    /public
      tv.html            TV-vastaanottosivun HTML
      tv.css             TV-tyyli (iso näyttö, tumma teema)
      tv.js              TV-sivun logiikka (fetch + polling)
  README.md
```

---

## Vaatimukset

- **Node.js** 18 tai uudempi
- **Google Chrome** (Manifest V3 -tuki)
- PC ja Samsung TV samassa paikallisverkossa
- Samsung TV: Tizen-pohjainen, 2016 tai uudempi (Samsung-integraatiolle)

---

## Asennus ja käynnistys

### 1. Bridge

```bash
cd bridge
npm install
npm start
# tai: node server.js
```

Bridge käynnistyy portille **3847** ja tulostaa:

```
[ANOMCAST][BRIDGE] Server listening on http://127.0.0.1:3847
[ANOMCAST][BRIDGE] Receiver page: http://192.168.x.x:3847/tv
```

### 2. Chrome-laajennus

1. Avaa Chrome ja mene osoitteeseen `chrome://extensions`
2. Ota käyttöön **Kehittäjätila** (yläoikealla)
3. Klikkaa **Lataa pakkaamaton laajennus**
4. Valitse kansio `/extension`
5. Laajennus ilmestyy selaimen osoiteriville

### 3. Samsung TV:n IP-osoite (valinnainen)

Muokkaa tiedostoa `bridge/services/samsungRemote.js`:

```js
const TV_IP = '192.168.1.50'; // ← vaihda TV:n todellinen IP-osoite
```

TV:n IP löytyy yleensä kohdasta:  
**Asetukset → Yleistä → Verkko → Verkon tila**

---

## Käyttö

1. Käynnistä bridge: `cd bridge && npm start`
2. Lataa laajennus Chromeen (ks. yllä)
3. Selaa mihin tahansa sivuun Chromessa
4. Klikkaa laajennuksen kuvaketta → **"Jaa telkkariin"**  
   tai paina **Alt+Shift+S**
5. Avaa TV:n selaimessa: `http://<PC:n IP>:3847/tv`
6. Jaettu sivu näkyy TV:llä

---

## Hyödylliset osoitteet

| Osoite | Kuvaus |
|--------|--------|
| `http://127.0.0.1:3847/health` | Bridge toimii? |
| `http://127.0.0.1:3847/api/current` | Viimeisin jako (JSON) |
| `http://127.0.0.1:3847/api/history` | Jakohistoria (JSON) |
| `http://127.0.0.1:3847/tv` | TV-vastaanottosivu (localhost) |
| `http://<PC:n IP>:3847/tv` | TV-vastaanottosivu (TV käyttää tätä) |

---

## Vianmääritys

**Bridge ei käynnisty**  
→ Tarkista, että Node.js on asennettu (`node -v`) ja `npm install` on ajettu `/bridge`-kansiossa.

**Laajennus ei löydä bridgeä ("Bridge ei vastaa")**  
→ Varmista, että bridge on käynnissä. Tarkista `http://127.0.0.1:3847/health` selaimessa.

**Palomuuri estää yhteyden**  
→ Salli portti 3847 TCP palomuurisäännöistä (Windows: Defender-palomuuri → Lisäasetukset → Saapuvat säännöt).

**TV ei saa yhteyttä bridge-osoitteeseen**  
→ Varmista, että PC ja TV ovat samassa verkossa.  
→ Käytä PC:n LAN-IP-osoitetta (esim. `192.168.1.100:3847/tv`), ei `127.0.0.1`.

**Samsung WebSocket -yhteys epäonnistuu**  
→ Tämä on normaalia — Samsung-integraatio on valinnainen. TV-sivu toimii silti normaalisti manuaalisesti avattuna.  
→ Tarkista, että TV_IP on oikein `samsungRemote.js`-tiedostossa.

**Favicon puuttuu tai ei lataudu**  
→ Joillakin sivuilla ei ole faviconeja. TV-sivu näyttää otsikon ja URL:n silti normaalisti.

**Chrome-järjestelmäsivuja ei voi jakaa**  
→ `chrome://`-osoitteet eivät ole jaettavissa. Tämä on tarkoituksellista.

---

## Tunnetut rajoitukset

- **Ei todellista näytön peilausta** — ANOMCAST jakaa URL:n ja metadatan, ei pikseleitä
- **Ei automaattista laitehakua** — TV:n IP täytyy asettaa manuaalisesti
- **Samsung-selaimen automaattinen avaus ei ole luotettavasti toteutettu** — avaa TV-sivu itse TV:n selaimessa
- **Tila nollautuu, kun bridge käynnistetään uudelleen** — muisti ei tallennu levylle
- **Ei tue kaikkia Samsung-malleja WebSocketin osalta** — Tizen 2016+ suositeltava

---

## Samsung-kohtaiset huomiot

Samsung TV -integraatio käyttää epävirallista WebSocket API:a:

```
ws://<TV_IP>:8001/api/v2/channels/samsung.remote.control?name=<base64 nimi>
```

- API ei ole virallinen eikä dokumentoitu Samsungin puolesta
- Toimii vaihtelevasti eri mallien ja firmware-versioiden välillä
- TV saattaa pyytää parituspyyntöä yhdistettäessä ensimmäistä kertaa
- Selaimen automaattinen avaus on **TODO** — ei toteutettu luotettavasti
- Kaukosäätimen näppäinten lähetys (`sendKey`) on tuettu, jos yhteys muodostuu

**Tärkeää:** ANOMCAST toimii täysin ilman Samsung-integraatiota. Se on bonus, ei ydinominaisuus.

---

## v0.2 parannusideat

- QR-koodi TV-sivulla (helppo avata puhelimella myös)
- Open Graph -esikatselukortit (kuva, kuvaus)
- Automaattinen laitehaku (mDNS / SSDP)
- Useiden TV-kohteiden tuki
- Historia-näkymä TV-sivulla
- Valinnainen PIN-paritus
- YouTube Smart Mode (avaa video suoraan YouTube-appissa)
- Muistin pysyvyys (valinnainen tiedostotallennus käynnistyskertojen välillä)
