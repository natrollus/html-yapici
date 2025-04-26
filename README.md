# HTML Yapıcı

HTML Yapıcı, Claude ve diğer büyük dil modelleri için geliştirilmiş bir Model Context Protocol (MCP) aracıdır. Bu araç, yapay zeka modellerinin HTML dosyaları oluşturmasına ve düzenlemesine olanak tanır.

## Özellikler

- **HTML Dosyası Oluşturma**: Boş veya temel içerikli HTML dosyaları oluşturabilirsiniz.
- **Element Ekleme**: HTML dosyalarına yeni elementler ekleyebilirsiniz (buton, div, başlık, vb.).
- **Element Düzenleme**: Mevcut elementlerin içerik, stil ve niteliklerini değiştirebilirsiniz.
- **Element Silme**: Artık gerekmeyen elementleri kaldırabilirsiniz.
- **HTML Görüntüleme**: Dosyanın tamamını veya belirli bir elementi inceleyebilirsiniz.

## Çalışma Prensibi

HTML Yapıcı, MCP protokolünü kullanarak büyük dil modelleri ile entegre olur. Model, MCP protokolü üzerinden araçları çağırır ve HTML dosyalarını düzenler. 

### Mimari

1. **MCP Server**: TypeScript ile yazılmış, stdio üzerinden iletişim kuran bir sunucu.
2. **JSDOM**: HTML dosyalarını işlemek için kullanılan DOM manipülasyon kütüphanesi.
3. **Araçlar**: HTML işlemleri için tanımlanmış bir dizi araç (element ekleme, düzenleme, silme vb.).

### Veri Akışı

1. Büyük dil modeli, bir HTML işlemi yapmak ister.
2. Model, MCP protokolü üzerinden ilgili aracı çağırır.
3. MCP sunucusu bu isteği alır ve ilgili işlevi çalıştırır.
4. İşlem sonucu modele geri döndürülür.
5. Model bu sonucu kullanarak kullanıcıya yanıt verir.

## Kurulum

### Ön Koşullar

- Node.js (v16 veya üzeri)
- npm veya yarn
- TypeScript

### Adımlar

1. Repoyu klonlayın:
   ```bash
   git clone <repo-url>
   cd html-yapici
   ```

2. Bağımlılıkları yükleyin:
   ```bash
   npm install
   # veya
   yarn install
   ```

3. Projeyi derleyin:
   ```bash
   npm run build
   # veya
   yarn build
   ```

4. Çalıştırma izni verin (Unix/Linux/macOS):
   ```bash
   chmod +x dist/index.js
   ```

## Kullanım

### Bağımsız Çalıştırma

Sunucuyu doğrudan çalıştırmak için:

```bash
npm start
# veya
yarn start
```

### Claude veya Diğer MCP Uyumlu Modellerle Entegrasyon

1. MCP entegrasyon komutunu kullanarak modele bağlayın:
   ```bash
   model-contextual-protocol --model-server=<model-endpoint> --tool-server=./dist/index.js
   ```

2. Model artık HTML araçlarını kullanabilir:
   - HTML dosyası oluşturma
   - Element ekleme 
   - Element düzenleme
   - Element silme
   - HTML görüntüleme

## API Referansı

### HTML Dosyası Oluşturma

```javascript
html_create_file({
  file: "dosya-yolu.html",          // Gerekli: Oluşturulacak dosya yolu
  title: "Sayfa Başlığı",           // İsteğe bağlı: Sayfa başlığı (varsayılan: "Yeni Sayfa")
  language: "tr",                   // İsteğe bağlı: HTML dil değeri (varsayılan: "tr")
  charset: "UTF-8",                 // İsteğe bağlı: Karakter kodlaması (varsayılan: "UTF-8")
  includeBootstrap: false,          // İsteğe bağlı: Bootstrap eklensin mi (varsayılan: false)
  content: "<p>İçerik</p>"          // İsteğe bağlı: Başlangıç içeriği (varsayılan: "")
})
```

### Element Ekleme

```javascript
html_add_element({
  file: "dosya-yolu.html",          // Gerekli: HTML dosya yolu
  element: "button",                // Gerekli: Eklenecek element türü
  content: "Tıkla",                 // İsteğe bağlı: Element içeriği
  parentSelector: "#container",     // İsteğe bağlı: Ebeveyn seçici (varsayılan: "body")
  attributes: {                     // İsteğe bağlı: Element nitelikleri
    id: "btn1",
    class: "btn btn-primary"
  },
  styles: {                         // İsteğe bağlı: CSS stilleri
    backgroundColor: "blue",
    color: "white"
  }
})
```

### Element Düzenleme

```javascript
html_edit_element({
  file: "dosya-yolu.html",          // Gerekli: HTML dosya yolu
  selector: "#btn1",                // Gerekli: Düzenlenecek element seçicisi
  content: "Yeni İçerik",           // İsteğe bağlı: Yeni element içeriği
  attributes: {                     // İsteğe bağlı: Değiştirilecek/eklenecek nitelikler
    class: "btn btn-secondary"
  },
  styles: {                         // İsteğe bağlı: Değiştirilecek/eklenecek stiller
    backgroundColor: "green"
  },
  removeAttributes: ["disabled"]    // İsteğe bağlı: Kaldırılacak nitelikler
})
```

### Element Silme

```javascript
html_delete_element({
  file: "dosya-yolu.html",          // Gerekli: HTML dosya yolu
  selector: "#silinecek-element"    // Gerekli: Silinecek element seçicisi
})
```

### HTML Görüntüleme

```javascript
html_view({
  file: "dosya-yolu.html",          // Gerekli: HTML dosya yolu
  selector: "#goruntulenecek-element" // İsteğe bağlı: Görüntülenecek element seçicisi
})
```

## Hata Ayıklama

Hata ayıklama için loglar `/Users/byram/Projects/claude/mcp/html-yapici/html-editor-mcp.log` dosyasına kaydedilir. Bu yolu kendi sisteminize göre `src/index.ts` dosyasında değiştirebilirsiniz.

Yaygın hatalar:
- Dosya bulunamadı hatası: Dosya yolu doğru olduğundan emin olun
- Seçici bulunamadı hatası: CSS seçicinin doğru olduğundan emin olun
- Zaten var olan dosya hatası: `html_create_file` fonksiyonu ile aynı isimli dosyayı tekrar oluşturmaya çalışmak

## Geliştirici Notları

### Katkıda Bulunma

1. Bu repoyu çatallayın (fork)
2. Yeni bir özellik dalı oluşturun (`git checkout -b yeni-ozellik`)
3. Değişikliklerinizi commit edin (`git commit -m 'Yeni özellik: Açıklama'`)
4. Dalınızı uzak sunucuya gönderin (`git push origin yeni-ozellik`)
5. Bir Pull Request oluşturun

### Yapılacaklar

- [ ] Daha fazla test ekle
- [ ] Çoklu element seçme desteği
- [ ] CSS dosyaları için destek
- [ ] InnerHTML desteği
- [ ] Event listener ekleme desteği

## Lisans

Bu proje MIT lisansı altında lisanslanmıştır. Detaylar için [LICENSE](LICENSE) dosyasına bakın.
