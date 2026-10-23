# Idle Blade Runner

Web tabanlı idle auto-runner oyunu. Kahraman sürekli koşar, gelen düşmanları otomatik keser.
Düşen altınla yükseltme alırsın, aşamalar ve bölgeler ilerledikçe düşmanlar güçlenir.

**Teknoloji:** [Phaser 3](https://phaser.io) (oyun alanı) + saf DOM/CSS (arayüz) + [Vite](https://vite.dev) (geliştirme/derleme)

## Çalıştırma

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # dist/ klasörüne statik build
npm run preview  # build'i yerelde dene
```

## Arayüz (Metin2 tarzı)

Oyun tam ekrandır:

- **Sol üst:** karakter kartı — avatar (kuşanılan başlık/zırh görünür) + seviye rozeti, HP, bölmeli EXP,
  altın. Avatara tıklamak Karakter penceresini açar. Altında **görev takipçisi**: aktif günlük görevler
  ilerleme çubuklarıyla; başlığa tıklayınca açılır/kapanır, göreve tıklayınca Görevler penceresi açılır.
- **Üst orta:** bölge/aşama ilerlemesi ve boss süresi.
- **Sol alt:** yarı saydam **olay kaydı** (sohbet kutusu gibi): Tümü / Savaş / Ganimet / Sistem sekmeleri;
  boss, elit, seviye, ganimet (nadirlik rengiyle), görev, başarım, rebirth kayıtları. Başlıktaki ▾ veya
  **Enter** ile küçültülür/açılır; kapalıyken yeni kayıt gelince çerçevesi parlar.
- **Alt çubuk:** solda kayıt düğmesi ve kaynaklar (💠 Parça, 🔮 Ruh Taşı), ortada yetenekler (**1–8**,
  altındaki **OTO** otomatik kullanım), sağda menü ikonları.

| Tuş | İşlev |
|---|---|
| **U** | Yükseltmeler |
| **I** | Envanter (Türkçe klavyede I/ı tuşu) |
| **B** | Demirci (birleştir, yeniden döv, setler) |
| **Y** | Yoldaşlar (yumurta, evcil hayvanlar) |
| **K** | Yetenekler (yetenek puanı, seviyeler, pasif ağaç) |
| **Q** | Görevler ve başarımlar |
| **P** | Prestij |
| **C** | Karakter |
| **Esc** | Ayarlar (açık pencere varsa önce en üsttekini kapatır) |
| **Enter** | Olay kaydını aç/kapat |
| **M** | Sesi aç/kapat |

Kısayollar fiziksel tuş konumuna göre çalışır (`KeyboardEvent.code`); klavye dili fark etmez.
Pencereler başlık çubuğundan sürüklenir (konum hatırlanır, çift tıklama varsayılana döndürür),
tıklanan öne gelir. Mobilde oyun üstte; pencere ve kayıt ortada tam genişlik, görev takipçisi tek satır.

## Karakter seviyesi

Düşmanlar EXP verir (boss x10, elit x3). Her seviye kalıcı **+%1 hasar ve maks. can** verir;
seviye rebirth'te sıfırlanmaz. Ayarlar `config/balance.js` → `HERO_LEVEL`.

Geliştirme modunda kısayollar: **G** altın ekler, **N** aşama atlar, **R** yetenek bekleme sürelerini sıfırlar,
**L** Destansı+ eşya düşürür. Konsolda `window.__idle` ile
`ctx`, `game` ve `ui` nesnelerine erişebilirsin.

## Denge simülasyonu

`tools/balance-sim.js` oyunun saf mantık sistemlerini Phaser olmadan çalıştırır (savaş ve hareket
kuralları `GameScene`/`EnemyManager` ile aynı). Yapay oyuncu yükseltmeleri güç/maliyet oranına göre
alır, yetenekleri otomatik kullanır, ödülleri toplar, 5 dk rekor gelmezse rebirth yapar.

```bash
npm run sim                                            # 120 dk, idle + aktif, 3 seed
npm run sim -- --minutes 40 --profile idle --seeds 1 --every 2
npm run sim -- --set ENEMY_SCALING.HP_GROWTH=1.2 --up damage.costGrowth=1.18   # dosyaya dokunmadan dene
```

Çıktıdaki `ttk(sn)` ortalama düşmanı öldürme süresidir: ~3–6 sn hedeflenir; sürekli 1'in altıysa oyun
yürüme hızıyla sınırlıdır (fazla kolay), 15'i geçiyorsa duvar vardır.

Simülatör yetenek puanlarını harcar, yumurtaları açar, en güçlü yoldaşı seçer ve boss mekaniklerini
(`systems/BossMechanics.js`, oyunla aynı sınıf) uygular.

**Mevcut denge (5 seed medyanı; yetenek ağacı, yoldaşlar, setler ve boss mekanikleri dahil):**

| | Aşama 10 | Aşama 20 | Aşama 30 | Aşama 50 | Aşama 75 | İlk rebirth | 2 saatte en iyi |
|---|---|---|---|---|---|---|---|
| Idle (dokunmayan) | 3:21 | 7:16 | 11:09 | 21:49 | 55:00 | 38–50 dk (aşama 60–70) | ~125 |
| Aktif (3 dokunuş/sn) | 2:36 | 5:22 | 8:33 | 15:49 | 40:24 | 33–58 dk (aşama 70–75) | ~135 |

2 saatlik en iyi aşama, eski ~100 hedefinin biraz üstünde: yeni kalıcı güç kaynakları (yetenek ağacı
~10–15 aşama) rebirth döngüsünü hızlandırıyor. Düşman can büyümesini artırmak bunu pek değiştirmiyor
(rebirth daha erken tetikleniyor); ince ayar için `data/passives.js` ve `data/pets.js` değerleri kullanılmalı.

## Mimari

```
src/
├── main.js                  Giriş noktası: context → UI → Phaser
├── config/
│   └── balance.js           TÜM denge sabitleri (hız, büyüme oranları, boss süresi...)
├── core/                    Oyundan bağımsız altyapı
│   ├── EventBus.js          Olay yolu (sahne ↔ arayüz iletişimi)
│   ├── events.js            Olay isimleri
│   ├── GameState.js         Kayıt şeması, varsayılanlar, sürüm göçleri
│   ├── SaveManager.js       localStorage + dışa/içe aktarma
│   └── GameContext.js       Durum + sistemleri birleştirir, otomatik kayıt
├── data/                    Veri odaklı içerik (kod yazmadan genişlet)
│   ├── upgrades.js          Yükseltmeler
│   ├── skills.js            Aktif yetenekler (bekleme, süre, etki, otomatik koşul)
│   ├── relics.js            Ruh Taşı ile alınan kalıcı prestige yükseltmeleri
│   ├── equipment.js         Nadirlikler, ekipman yuvaları, rastgele özellikler (affix)
│   ├── metrics.js           Başarım/görevlerin takip ettiği sayaçlar
│   ├── achievements.js      Kademeli başarımlar
│   └── quests.js            Günlük görev şablonları
│   ├── enemies.js           Düşman ve boss tipleri
│   └── zones.js             Bölgeler, renkler, düşman havuzları
├── systems/                 Saf oyun mantığı (Phaser bilmez, test edilebilir)
│   ├── EconomySystem.js     Altın, harcama, altın/sn ortalaması
│   ├── UpgradeSystem.js     Maliyet, toplu alım, hesaplanmış statlar
│   ├── StageSystem.js       Aşama ilerleyişi, boss sayacı, yenilgi/geri çekilme
│   ├── SkillSystem.js       Yetenek bekleme süreleri, buff'lar, otomatik kullanım
│   ├── LevelSystem.js       Karakter seviyesi ve EXP (öldürmelerden), kalıcı seviye bonusu
│   ├── PrestigeSystem.js    Rebirth, Ruh Taşı hesabı, relic'ler, kalıcı çarpanlar
│   ├── EquipmentSystem.js   Eşya üretimi, drop, envanter, kuşanma, güçlendirme, parçalama
│   ├── AchievementSystem.js Başarım kademeleri, ödüller, kalıcı bonus
│   ├── QuestSystem.js       Günlük görevler, gün dönümü, değiştirme, günlük sandık
│   ├── CombatSystem.js      Vuruş ve kritik hesabı
│   └── OfflineSystem.js     Offline kazanç
├── game/                    Phaser katmanı (sadece görüntü + etkileşim)
│   ├── createGame.js
│   ├── renderScale.js       Görüntü kalitesi: render ölçeği (tuval + doku çözünürlüğü)
│   ├── scenes/              BootScene (doku üretimi), GameScene (ana döngü)
│   ├── entities/            Player, Enemy, Coin
│   ├── world/               ParallaxBackground, EnemyManager
│   ├── effects/             Kesme, hasar sayısı, patlama, başlık efektleri
│   └── graphics/            Tüm görseller kodla üretilir (asset dosyası yok)
│       ├── TextureFactory.js   Modülleri çağırır, animasyonları kaydeder
│       ├── draw.js             Dış hatlı şekiller, tohumlu rastgelelik, canvas gradyanları
│       ├── characterTextures.js Katmanlı kahraman + nadirliğe göre ekipman görünümü
│       ├── enemyTextures.js    15 düşman + 4 boss, 2 karelik animasyonlar
│       ├── worldTextures.js    Bölge manzaraları (5 kayan katman), gökyüzü, kenar karartması
│       └── fxTextures.js       Para, kesik, ışıma, kalkan, elit tacı…
├── audio/                   Ses (dosyasız, Web Audio sentezi)
│   ├── AudioEngine.js       Osilatör/gürültü sentezi, müzik/efekt kanalları, ses seviyeleri
│   ├── sfx.js               24 sentezlenmiş efekt tanımı
│   ├── AudioDirector.js     Oyun olaylarını seslere bağlar, autoplay kilidi, sekme gizlenince durdurur
│   └── music/               MusicPlayer (16'lık sekansör) + themes.js (bölge ve boss temaları)
├── ui/                      DOM arayüzü
│   ├── UIManager.js
│   ├── dom.js               el() yardımcısı, rafThrottle
│   ├── WindowManager.js     Menü ikonları + sürüklenebilir pencereler, kısayol tuşları
│   ├── heroStack.js         Kahraman katmanlarını DOM'da üst üste koyar (avatar, önizleme)
│   └── views/               HUD (üst), HeroFrame + QuestTracker (sol üst), ChatLog (sol alt), BarLeft, Yetenek çubuğu, Mağaza, Envanter, Görevler, Prestij, Karakter, Ayarlar, Modal, Toast
├── utils/                   format (1.2K, 3.4M), math, color
└── styles/main.css
```

**Kural:** `systems/` ve `core/` Phaser'a dokunmaz; `game/` ve `ui/` birbirini tanımaz, sadece
`ctx` ve `EventBus` üzerinden konuşur. Böylece arayüzü ya da render motorunu değiştirmek diğer
tarafları bozmaz.

## Ekipman

- **10 yuva** (ana stat): Silah (hasar), Kalkan (hasar azaltma), Miğfer (can yenileme), Zırh (maks. can),
  Eldiven (saldırı hızı), Kemer (maks. can), Ayakkabı (koşu hızı), Kolye (kritik hasar), Küpe (kritik şans),
  Yüzük (altın). Her yuvanın 2–5 eşya tipi var (ör. Kılıç/Balta/Mızrak/Hançer/Savaş Çekici); nadirliğe göre
  0–4 rastgele ek özellik gelir (hasar azaltma, koşu hızı, EXP kazancı dahil 11 stat).
- **Görünüm:** kuşanılan her eşya karakterde görünür (kalkan arkadaki kolda, ayakkabılar koşu animasyonuyla).
  Malzeme nadirliğe göre değişir: demir → çelik → mavi çelik → kristal → altın.
- **Nadirlikler:** Sıradan %60 · Kaliteli %25 · Nadir %10 · Destansı %4 · Efsanevi %1 (stat x1 → x5).
- **Düşme:** normal düşman %5, elit %25, boss %100 (en az Kaliteli). Eşya seviyesi = düştüğü aşama.
- **Envanter (I):** Metin2 tarzı karakter bebeği (solda/sağda 5 yuva), toplam güç, **En iyileri kuşan**,
  bonus özeti; çanta (48) yuvaya göre filtrelenir, nadirlik/güç/seviye/yeniye göre sıralanır, ikonlar
  eşyanın gerçek görselidir. Filtrede ▲, o yuvada daha iyi eşya olduğunu gösterir.
- **Parça (💠):** eşya parçalayınca kazanılır, güçlendirmede (+1…+10, her biri +%10 stat) harcanır.
- **Otomatik:** Oto kuşan / Oto parçala; çanta doluysa yeni eşya parçalanır; 🔒 kilitli eşyalar parçalanmaz.
- Rebirth'te ekipman korunur. Ayarlar `config/balance.js` → `EQUIPMENT`. Eski kayıtlardaki tılsımlar
  yüzük yuvasından kolye yuvasına otomatik taşınır (kayıt sürümü 3).
- **Yeni eşya tipi:** `data/equipment.js`'te yuvanın `bases` listesine ekle, çizimini
  `characterTextures.js`'e (gövde katmanı ya da silah/takı) ekle.

## Yetenek ağacı (K)

- Her karakter seviyesi **+1 Yetenek Puanı (YP)**. Puanlar rebirth'te sıfırlanmaz; sıfırlama ücretsiz.
- **Aktif yetenekler** 1–20 seviye (9'dan sonra M1–M10, en sonda G): her seviye hasar +%8, süre +%4,
  bekleme −%1 ve yeteneğe özel etkiler (hız, altın, iyileşme, donma süresi).
- **Pasif ağaç** 3 kademe × 3 düğüm (her düğüm 10 seviye): hasar, can, saldırı hızı → kritik şans, altın,
  EXP → kritik hasar, hasar azaltma, bekleme süresi. Üst kademeler toplam 10 / 25 harcanan YP ile açılır.
- **Yeni yetenekler:** 6 Zehirli Bıçak (zamanla hasar, aşama 15), 7 Buz Dalgası (ekrandakileri dondurur,
  aşama 20), 8 Ruh Kılıçları (etrafında dönen bıçaklar öndekine vurur, aşama 25).
- Değerler `data/passives.js` (`PASSIVES`, `SKILL_RANK`), mantık `systems/SkillTreeSystem.js`.

## Demirci ve setler (B)

- **Birleştir:** aynı nadirlikte 3 eşya (kuşanılı/kilitli olmayan) → ilk seçilenin yuvasında bir üst
  nadirlikte yeni eşya. Seviye en yüksek olanınki, setli parça varsa set devreder. Maliyet 20 / 60 / 180 / 500 💠.
  **Otomatik seç** önce aynı yuvadan 3 zayıf eşya arar.
- **Yeniden Döv:** ek özellikleri yeniden zarlar (ana stat, seviye, güçlendirme ve set korunur);
  her dövme maliyeti %25 artırır.
- **Setler:** her bölgenin seti var (Korucu, Firavun, Buzul, Cehennem, Gölge, Fırtına). Nadir %25,
  Destansı %40, Efsanevi %60 şansla düştüğü bölgenin setinden gelir. 2/4/6 parçada bonus açılır;
  envanterde set rozeti ve set çipleri, eşya detayında kademeler görünür.
- Değerler `config/balance.js` → `BLACKSMITH`, `data/sets.js`; mantık `EquipmentSystem`.

## Yoldaşlar (Y)

- Bosslar **%30** şansla yumurta düşürür (ilk boss garanti, elitler %2). Yumurta Yoldaşlar penceresinden açılır;
  sahip olunmayan yoldaşların çıkma şansı iki kat. Aynısı çıkarsa o yoldaş EXP kazanır.
- **Kurt Yavrusu** öndekine atılıp ısırır (+hasar) · **Orman Perisi** düzenli iyileştirir (+can yenileme) ·
  **Ejder Yavrusu** tüm düşmanlara ateş püskürtür (+kritik hasar) · **Altın Kedi** pasif (+altın).
- Aktif yoldaş karakteri takip eder ve bonusunun tamamını verir; diğerleri %25 koleksiyon bonusu.
  Öldürmelerle (boss x10, elit x3) ya da 💠 ile besleyerek seviye atlar (en fazla 30).
- Değerler `data/pets.js`, mantık `systems/PetSystem.js`, görünüm `game/entities/Pet.js`.

## Bölgeler ve boss mekanikleri

- 6 bölge, her biri 10 aşama: Yeşil Orman, Kızıl Çöl, Buzul Vadisi, Lav Diyarı, **Gölge Ormanı**
  (hayalet, ruh emici, tarikatçı, gölge kurdu, kara ağaç · boss **Gölge Lordu**), **Gök Adaları** (harpi,
  fırtına ruhu, grifon, göksel muhafız, bulut golemi · boss **Fırtına Ejderhası**). Sonra döngü "II" ile başa döner.
- Bossların mekanikleri (`data/enemies.js` → `mechanics`, ayarlar `BOSS_MECHANICS`):
  - **Yere vurma:** kırmızı **!** uyarısından 1,6 sn sonra ağır vuruş (x2,5). Uyarı sırasında bossa maks.
    canının %7'si kadar hasar verirsen **sersemler** ve vuruş iptal olur — dokunmak ve yetenekler işe yarar.
    Kutsal Kalkan vuruşu engeller.
  - **Kalkan:** canı %50'ye inince 3 sn boyunca %70 daha az hasar alır.
  - **Öfke:** canı %30'un altında daha hızlı ve sert vurur.

## Başarımlar ve Günlük Görevler

- **Başarımlar:** 10 başarım × 5 kademe. Her kademe alındığında Parça (10, 40, 90, 160, 250) ve
  kalıcı **+%2 hasar ve altın** verir. Ödüller Görevler sekmesinden elle alınır.
- **Günlük görevler:** Her gün yerel gece yarısı 3 yeni görev gelir (8 şablondan rastgele).
  İlerleme görev verildiği andan itibaren sayılır. Ödül: oyuncunun kazanç hızına göre altın + Parça.
  Günde 1 kez tamamlanmamış bir görevi değiştirebilirsin.
- **Günlük sandık:** 3 görevin ödülünü de alınca açılır: +2 Ruh Taşı ve Nadir+ eşya.
- Alınmamış görev ödülleri gün dönünce kaybolur. Başarımlar ve görev sayaçları rebirth'ten etkilenmez.
- Ayarlar `config/balance.js` → `ACHIEVEMENT`, `QUESTS`.

## Prestige (Yeniden Doğuş)

- **Aşama 20**'ye ulaşınca Prestij sekmesi açılır.
- Rebirth'te kazanılan Ruh Taşı: `floor(0.25 × (koşudaki en yüksek aşama − 15)^1.3 × Ruh Hasadı)`
  (aşama 25 → 4, aşama 30 → 8, aşama 40 → 16, aşama 60 → 35). Formül `config/balance.js` → `PRESTIGE`.
- **Sıfırlanır:** altın, yükseltmeler, aşama, yetenek bekleme süreleri.
  **Kalır:** Ruh Taşları, relic'ler, açılmış yükseltme/yetenek kilitleri, istatistikler, ayarlar.
- **Pasif bonus:** toplam kazanılan her Ruh Taşı +%5 hasar ve altın verir (harcamak bonusu düşürmez).
- **Relic'ler** (`data/relics.js`): hasar, altın, can, yetenek bekleme süresi, başlangıç aşaması, Ruh Taşı kazancı.
- `highestStage` koşuya özeldir (Ruh Taşı hesabı), `bestStage` tüm zamanlarındır (kilitler).

## Nasıl genişletilir?

- **Yeni yükseltme:** `data/upgrades.js` listesine bir nesne ekle. `stat` alanı yeni bir statsa
  onu `GameScene`/`CombatSystem` içinde kullan. Mağaza kartı otomatik oluşur.
- **Yeni düşman:** `data/enemies.js`'e tip ekle, `TextureFactory`'de dokusunu çiz (ya da
  `BootScene.preload` içinde aynı anahtarla PNG yükle), `data/zones.js`'te bir havuza koy.
- **Yeni yetenek:** `data/skills.js`'e ekle. Hazır etki tipleri `aoe`, `strike` ve `buff`
  (`attackSpeedMult`, `goldMult`, `invulnerable`, `healRatio`). Yeni bir etki tipi gerekirse
  mantığını `SkillSystem.modifiers`'a, görselini `GameScene.castSkill`'e ekle. Çubuktaki buton
  otomatik oluşur.
- **Yeni relic:** `data/relics.js`'e ekle. Yeni bir `modifier` kullanıyorsan varsayılanını
  `PrestigeSystem.multipliers`'a ekle ve etkisini ilgili sistemde uygula.
- **Yeni eşya tipi / özellik:** `data/equipment.js`'te bir yuvanın `bases` listesine ekle ya da
  `AFFIXES`'e yeni stat koy; yeni statın etkisini `UpgradeSystem.stats` içinde uygula.
- **Yeni başarım / görev:** `data/achievements.js` veya `data/quests.js`'e ekle. Yeni bir sayaç
  gerekiyorsa önce `GameState.stats`'a ekleyip ilgili sistemde artır, sonra `data/metrics.js`'e okuyucusunu yaz.
- **Yeni bölge:** `data/zones.js`'e ekle; manzara çizicisini `worldTextures.js` → `PAINTERS`'a, gökyüzü ve
  parçacıkları `ParallaxBackground.js` → `SCENERY`'ye, müziğini `audio/music/themes.js`'e, setini `data/sets.js`'e ekle.
- **Yeni yoldaş:** `data/pets.js`'e ekle, çizimini `game/graphics/petTextures.js`'e koy.
- **Yeni boss mekaniği:** `systems/BossMechanics.js`'e olay ekle; görselini `GameScene.handleBossEvents`'e,
  kuralını simülatördeki boss bloğuna yaz.
- **Yeni pencere:** `ui/views/` içine `element` alanı olan bir sınıf yaz, `WindowManager.js`'deki
  `WINDOWS` listesine (ikon, başlık, kısayol tuşu, genişlik) ekle; menü ikonu otomatik oluşur.
- **Kayıt şeması değişti:** `config/balance.js`'te `SAVE_VERSION`'ı artır, `GameState.js`'teki
  `MIGRATIONS`'a dönüştürücü ekle.

## Yol haritası

- [x] Koşu, otomatik savaş, dokunma hasarı, altın düşmesi
- [x] 8 yükseltme, toplu alım (x1/x10/x100/MAKS), kilit açılma
- [x] Aşama/bölge sistemi, boss + süre sınırı, yenilgide geri çekilme
- [x] Otomatik kayıt, offline kazanç, dışa/içe aktarma
- [x] Aktif yetenekler: 5 yetenek, bekleme süresi, tuş kısayolu, otomatik kullanım
- [x] Yetenek ağacı: yetenek puanı, 20 seviyeli aktif yetenekler, 3 kademeli pasif ağaç, 3 yeni yetenek
- [x] Ekipman: 5 nadirlik, 4 yuva, rastgele özellikler, güçlendirme, parçalama, otomatik kuşan/parçala
- [x] Prestige (rebirth): Ruh Taşı, pasif bonus, 6 relic
- [x] Başarımlar (10 × 5 kademe) ve günlük görevler (3/gün, değiştirme, günlük sandık)
- [x] Ses efektleri ve müzik (sentezlenmiş, bölge temaları, boss müziği, ses ayarları)
- [x] Demirci: birleştirme, yeniden dövme, 6 bölge seti
- [x] Yoldaşlar: yumurta, 4 evcil hayvan, seviye/besleme, koleksiyon bonusu
- [x] 2 yeni bölge (Gölge Ormanı, Gök Adaları), 10 yeni düşman, 2 yeni boss, boss mekanikleri
- [ ] Gerçek sprite'lar
