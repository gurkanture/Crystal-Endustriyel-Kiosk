// src/utils/imageUtils.js
// Tüm resim URL'leri için merkezi yardımcı fonksiyon

const R2_BASE = 'https://assist-token-magnum.gurkan-ture.workers.dev/GORSELLER'

// Kategori -> Klasör eşleştirmesi
const CATEGORY_FOLDER_MAP = {
  // Türkçe kategori isimleri
  'SOĞUTMA': 'refrigeration',
  'FIRINLAR': 'ovens',
  'PİŞİRİCİLER': 'cooking',
  'BULAŞIK MAKİNELERİ': 'dishwashers',
  'DONDURMA MAKİNELERİ': 'dondurma',
  // Display names
  'Soğutma': 'refrigeration',
  'Fırınlar': 'ovens',
  'Pişiriciler': 'cooking',
  'Bulaşık Makineleri': 'dishwashers',
  'Dondurma Makineleri': 'dondurma',
  // Alt kategoriler
  'Soft Dondurma Makineleri': 'dondurma',
  'Yatay Tip Dondurma Makineleri': 'dondurma',
  'Dondurma Teşhir Vitrinleri': 'dondurma',
  'Kombi Fırınlar': 'ovens',
  'Konveksiyonlu Fırınlar': 'ovens',
  'Pastane Fırınları': 'ovens',
  '700 Serisi': 'cooking',
  '900 Serisi': 'cooking',
}

// Bilinen kategori klasörleri
const KNOWN_CATEGORY_FOLDERS = ['refrigeration', 'ovens', 'cooking', 'dishwashers', 'dondurma']

/**
 * Resim URL'sini düzeltir ve tam path döner
 * FORMAT: GORSELLER/category/<categoryFolder>/<subFolder>/<image>
 * 
 * @param {string} imagePath - Orijinal resim yolu
 * @param {string} categoryHint - Opsiyonel kategori ipucu
 * @returns {string|null} - Tam URL veya null
 */
export const getImageUrl = (imagePath, categoryHint = null) => {
  if (!imagePath) return null
  
  let cleanPath = imagePath.trim()
  
  // 1. Tam URL ise direkt dön
  if (cleanPath.startsWith('http://') || cleanPath.startsWith('https://')) {
    // Ama yine de category/ kontrolü yap
    if (cleanPath.includes('/GORSELLER/') && !cleanPath.includes('/GORSELLER/category/')) {
      // category/ eksik, ekle
      cleanPath = cleanPath.replace('/GORSELLER/', '/GORSELLER/category/')
    }
    return cleanPath
  }
  
  // 2. productsImage/ önekini kaldır
  if (cleanPath.startsWith('productsImage/')) {
    cleanPath = cleanPath.substring('productsImage/'.length)
  }
  
  // 3. Baştaki category/ varsa kaldır (sonra tekrar ekleyeceğiz)
  if (cleanPath.startsWith('category/')) {
    cleanPath = cleanPath.substring('category/'.length)
  }
  
  // 4. Baştaki / varsa kaldır
  if (cleanPath.startsWith('/')) {
    cleanPath = cleanPath.substring(1)
  }
  
  // 5. cleanPath zaten bilinen bir kategori klasörü ile mi başlıyor?
  const startsWithKnownFolder = KNOWN_CATEGORY_FOLDERS.some(folder => 
    cleanPath.startsWith(folder + '/')
  )
  
  // 6. Final URL oluştur - HER ZAMAN category/ ile
  if (startsWithKnownFolder) {
    // cleanPath zaten categoryFolder içeriyor: refrigeration/subfolder/image.jpg
    return `${R2_BASE}/category/${cleanPath}`
  }
  
  // 7. Kategori klasörü belirle
  let categoryFolder = ''
  
  // categoryHint'ten bul
  if (categoryHint) {
    categoryFolder = CATEGORY_FOLDER_MAP[categoryHint] || ''
  }
  
  // Hala bulunamadıysa path'ten tahmin et
  if (!categoryFolder) {
    const pathLower = cleanPath.toLowerCase()
    if (pathLower.includes('dondurma') || pathLower.includes('gelato') || pathLower.includes('soft') || pathLower.includes('ice')) {
      categoryFolder = 'dondurma'
    } else if (pathLower.includes('firin') || pathLower.includes('oven') || pathLower.includes('kombi') || pathLower.includes('convection')) {
      categoryFolder = 'ovens'
    } else if (pathLower.includes('pisirici') || pathLower.includes('cooking') || pathLower.includes('serisi') || pathLower.includes('range') || pathLower.includes('fryer') || pathLower.includes('grill')) {
      categoryFolder = 'cooking'
    } else if (pathLower.includes('sogutma') || pathLower.includes('refriger') || pathLower.includes('buzdolabi') || pathLower.includes('cold') || pathLower.includes('freezer') || pathLower.includes('preparation')) {
      categoryFolder = 'refrigeration'
    } else if (pathLower.includes('bulasik') || pathLower.includes('dishwash')) {
      categoryFolder = 'dishwashers'
    }
  }
  
  // 8. URL oluştur
  if (categoryFolder) {
    return `${R2_BASE}/category/${categoryFolder}/${cleanPath}`
  }
  
  // 9. Son çare - category/ ile ama klasör olmadan
  console.warn('⚠️ getImageUrl: Category folder not found for:', cleanPath)
  return `${R2_BASE}/category/${cleanPath}`
}

/**
 * Katalog PDF URL'sini düzeltir
 * @param {string} catalogPath - Orijinal katalog yolu
 * @returns {string|null} - Tam URL veya null
 */
export const getCatalogUrl = (catalogPath) => {
  if (!catalogPath) return null
  
  // getImageUrl ile aynı mantık
  return getImageUrl(catalogPath)
}

export { R2_BASE, CATEGORY_FOLDER_MAP, KNOWN_CATEGORY_FOLDERS }
