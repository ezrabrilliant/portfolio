# Google Analytics Integration Guide

## 🎯 Apa yang sudah diimplementasikan

Google Analytics telah berhasil diintegrasikan ke dalam portfolio Anda dengan fitur tracking berikut:

### 📊 Event Tracking yang tersedia:

1. **Page Views** - Otomatis track setiap kunjungan halaman
2. **Navigation Clicks** - Track ketika user klik menu navigasi
3. **Button Clicks** - Track semua klik tombol (CTA, download, dll)
4. **Form Interactions** - Track submit form contact dan hasilnya
5. **Project Views** - Track ketika user melihat detail project
6. **File Downloads** - Track download resume/CV
7. **Section Views** - Track bagian mana yang paling sering dilihat

## 🚀 Cara Setup Google Analytics

### Langkah 1: Buat Google Analytics Account

1. **Kunjungi Google Analytics:**
   - Buka [https://analytics.google.com/](https://analytics.google.com/)
   - Klik "Start measuring" atau "Mulai mengukur"

2. **Setup Account:**
   - Account name: `Ezra Portfolio` (atau nama yang Anda inginkan)
   - Centang semua opsi sharing yang diinginkan
   - Klik "Next"

3. **Setup Property:**
   - Property name: `Ezra Brilliant Portfolio`
   - Reporting time zone: `(GMT+07:00) Asia/Jakarta`
   - Currency: `Indonesian Rupiah (IDR)`
   - Klik "Next"

4. **Business Information:**
   - Industry: `Computer and Electronics` atau `Other`
   - Business size: `Small (1-10 employees)`
   - Usage intentions: Centang yang sesuai (biasanya "Examine user behavior")

### Langkah 2: Setup Data Stream

1. **Pilih Platform:**
   - Klik "Web" untuk website

2. **Configure Stream:**
   - Website URL: URL portfolio Anda (contoh: `https://ezrabrilliant.com`)
   - Stream name: `Ezra Portfolio Website`
   - Klik "Create stream"

3. **Dapatkan Measurement ID:**
   - Setelah stream dibuat, Anda akan melihat **Measurement ID** 
   - Format: `G-XXXXXXXXXX` (contoh: `G-ABC123DEF4`)
   - **COPY ID INI** - kita akan menggunakannya

### Langkah 3: Konfigurasi di Portfolio

1. **Update Environment Variable:**
   - Buka file `.env.local` di root project
   - Ganti `G-XXXXXXXXXX` dengan Measurement ID Anda yang sebenarnya:
   ```bash
   VITE_GA_MEASUREMENT_ID=G-ABC123DEF4
   ```

2. **Restart Development Server:**
   ```bash
   npm run dev
   ```

## 🔍 Cara Melihat Data Analytics

### Real-time Reports
1. Buka Google Analytics dashboard
2. Klik "Reports" di sidebar kiri  
3. Klik "Realtime" untuk melihat pengunjung live

### Audience Reports
- **Overview**: Statistik umum pengunjung
- **Demographics**: Usia dan gender pengunjung  
- **Geo**: Lokasi geografis pengunjung
- **Technology**: Browser, OS, device yang digunakan

### Behavior Reports
- **Overview**: Halaman mana yang paling sering dikunjungi
- **Site Content > All Pages**: Detail traffic per halaman
- **Events**: Custom events yang kita track (form submit, downloads, dll)

### Custom Events yang Bisa Anda Monitor

1. **Navigation Events:**
   - Event: `section_view`
   - Label: `About`, `Projects`, `Experience`, `Contact`

2. **Interaction Events:**
   - Event: `button_click`  
   - Label: `Resume Download - Navbar`, `Project Demo`, dll

3. **Contact Events:**
   - Event: `contact_interaction`
   - Label: `Form Submission Started`, `Form Submission Success`, `Form Submission Failed`

4. **Project Events:**
   - Event: `project_view`
   - Label: Nama project yang dilihat

5. **Download Events:**
   - Event: `file_download`
   - Label: `Resume`, atau file lain yang didownload

## 🎨 Customisasi Tracking

Jika Anda ingin menambah tracking custom, gunakan hook `useAnalyticsTracking`:

```tsx
import { useAnalyticsTracking } from '@/components/analytics-provider'

function YourComponent() {
  const { trackEvent, trackButtonClick } = useAnalyticsTracking()
  
  const handleCustomAction = () => {
    // Track custom event
    trackEvent('custom_action', {
      category: 'engagement',
      label: 'Special Button',
      value: 1
    })
    
    // Or use predefined trackers
    trackButtonClick('Special Button', 'Hero Section')
  }
  
  return <button onClick={handleCustomAction}>Click me</button>
}
```

## 🔒 Privacy & GDPR Compliance

System sudah include privacy controls:
- User consent disimpan di localStorage
- Analytics hanya jalan jika user consent = true
- Default: analytics enabled (sesuai standar web modern)

Untuk menambah GDPR banner, bisa extend komponen `AnalyticsProvider`.

## 🐛 Troubleshooting

### Analytics tidak muncul data:
1. Pastikan Measurement ID benar di `.env.local`
2. Pastikan website sudah di-deploy dan accessible
3. Tunggu 24-48 jam untuk data pertama muncul
4. Gunakan "Realtime" reports untuk testing instant

### Error di development:
1. Pastikan semua environment variables sudah di-set
2. Restart development server setelah ubah `.env.local`
3. Check browser console untuk error messages

### Testing Analytics:
1. Buka Google Analytics > Realtime
2. Buka website portfolio Anda di tab lain
3. Lakukan aksi (klik menu, submit form, download resume)
4. Check apakah event muncul di Realtime reports

## 📈 Tips Optimasi

1. **Monitor Weekly:** Check analytics minimal seminggu sekali
2. **Focus on Events:** Lihat event mana yang paling banyak di-trigger  
3. **User Flow:** Analyze bagaimana user navigate di portfolio
4. **Geographic Data:** Gunakan untuk target audience strategy
5. **Device Analysis:** Optimize untuk device yang paling banyak digunakan

## 🎯 Metrics Penting untuk Portfolio

- **Page Views**: Total kunjungan halaman
- **Unique Visitors**: Jumlah pengunjung unik  
- **Session Duration**: Berapa lama user stay di website
- **Bounce Rate**: Persentase user yang langsung pergi
- **Resume Downloads**: Berapa banyak yang download CV
- **Contact Form Submissions**: Conversion rate contact form
- **Geographic Distribution**: Dari mana saja pengunjung

---

✅ **Setup Complete!** Google Analytics sekarang sudah aktif di portfolio Anda dan siap melacak semua interaksi pengunjung.
