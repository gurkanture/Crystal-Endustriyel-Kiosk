import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useConversation } from '@elevenlabs/react'
import ProductGallery from './components/ProductGallery'
import ProductModal from './components/ProductModal'
import ComparisonModal from './components/ComparisonModal'
import CategoryGrid from './components/CategoryGrid'
import './App.css'

const WORKER_URL = 'https://assist-token-magnum.gurkan-ture.workers.dev'
const AGENT_ID = 'agent_2601kckh0tn8fh78h35s0vhxqx71'
const R2_BASE = 'https://assist-token-magnum.gurkan-ture.workers.dev/GORSELLER'

// Kategori -> Klasör eşleştirmesi (global) - imageUtils'den de export ediliyor
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
  // Alt kategoriler için de eklenebilir
  'Soft Dondurma Makineleri': 'dondurma',
  'Yatay Tip Dondurma Makineleri': 'dondurma',
  'Dondurma Teşhir Vitrinleri': 'dondurma',
  'Kombi Fırınlar': 'ovens',
  'Konveksiyonlu Fırınlar': 'ovens',
  'Pastane Fırınları': 'ovens',
  '700 Serisi': 'cooking',
  '900 Serisi': 'cooking',
}

function App() {
  const [currentView, setCurrentView] = useState('home')
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [selectedSubcategory, setSelectedSubcategory] = useState(null)
  const [subcategories, setSubcategories] = useState([])
  const [products, setProducts] = useState([])
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [comparisonProducts, setComparisonProducts] = useState([])
  const [loading, setLoading] = useState(false)
  const [transcript, setTranscript] = useState([])
  const [language, setLanguage] = useState('TR')
  const [chatPanelOpen, setChatPanelOpen] = useState(false)

  const idleTimerRef = useRef(null)
  const lastQueryRef = useRef(null)
  const productsRef = useRef([]) // Ürünlere erişim için ref

  // Products değiştiğinde ref'i güncelle
  useEffect(() => {
    productsRef.current = products
  }, [products])

  const resetIdleTimer = () => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    idleTimerRef.current = setTimeout(() => handleReset(), 120000)
  }

  const handleReset = () => {
    setProducts([])
    setSubcategories([])
    setSelectedProduct(null)
    setComparisonProducts([])
    setSelectedCategory(null)
    setSelectedSubcategory(null)
    setCurrentView('home')
    setTranscript([])
    lastQueryRef.current = null
  }

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'TR' ? 'EN' : 'TR')
  }

  // Resim URL oluşturma fonksiyonu
  const KNOWN_CATEGORY_FOLDERS = ['refrigeration', 'ovens', 'cooking', 'dishwashers', 'dondurma']
  
  const getImageUrl = (imagePath, categoryHint = null) => {
    if (!imagePath) return null
    
    let cleanPath = imagePath.trim()
    
    if (cleanPath.startsWith('http://') || cleanPath.startsWith('https://')) {
      if (cleanPath.includes('/GORSELLER/') && !cleanPath.includes('/GORSELLER/category/')) {
        cleanPath = cleanPath.replace('/GORSELLER/', '/GORSELLER/category/')
      }
      return cleanPath
    }
    
    if (cleanPath.startsWith('productsImage/')) {
      cleanPath = cleanPath.substring('productsImage/'.length)
    }
    
    if (cleanPath.startsWith('category/')) {
      cleanPath = cleanPath.substring('category/'.length)
    }
    
    if (cleanPath.startsWith('/')) {
      cleanPath = cleanPath.substring(1)
    }
    
    const startsWithKnownFolder = KNOWN_CATEGORY_FOLDERS.some(folder => 
      cleanPath.startsWith(folder + '/')
    )
    
    if (startsWithKnownFolder) {
      return `${R2_BASE}/category/${cleanPath}`
    }
    
    let categoryFolder = ''
    
    if (categoryHint) {
      categoryFolder = CATEGORY_FOLDER_MAP[categoryHint] || ''
    }
    
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
    
    if (categoryFolder) {
      return `${R2_BASE}/category/${categoryFolder}/${cleanPath}`
    }
    
    return `${R2_BASE}/category/${cleanPath}`
  }

  const fetchSubcategories = async (categoryInfo) => {
    try {
      setLoading(true)
      const whereClause = categoryInfo.isDondurma ? {} : { category: categoryInfo.category }
      
      const dataRequest = [{
        source: categoryInfo.source || "mutfak.json",
        where: whereClause,
        fields: ["name", "subcategory", "category", "image"],
        max_items: 200
      }]

      const response = await fetch(`${WORKER_URL}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data_request: dataRequest })
      })

      if (!response.ok) throw new Error('Veriler getirilemedi')
      const results = await response.json()
      const allProducts = results.flatMap(r => r.data || [])
      
      const subMap = new Map()
      if (categoryInfo.isDondurma) {
        for (const p of allProducts) {
          if (p.category && !subMap.has(p.category)) {
            subMap.set(p.category, { name: p.category, image: p.image })
          }
        }
      } else {
        for (const p of allProducts) {
          if (p.subcategory && !subMap.has(p.subcategory)) {
            subMap.set(p.subcategory, { name: p.subcategory, image: p.image })
          }
        }
      }
      
      setSubcategories(Array.from(subMap.values()))
      setSelectedCategory({ ...categoryInfo, isDondurma: categoryInfo.isDondurma })
      setCurrentView('subcategories')
      setLoading(false)
      resetIdleTimer()
    } catch (err) {
      console.error('Subcategory fetch error:', err)
      setLoading(false)
    }
  }

  // Türkçe karakter normalize fonksiyonu
  const normalizeForSearch = (str) => {
    if (!str) return ''
    return str
      .replace(/İ/g, 'i')
      .replace(/I/g, 'i')
      .replace(/Ğ/g, 'g')
      .replace(/Ü/g, 'u')
      .replace(/Ş/g, 's')
      .replace(/Ö/g, 'o')
      .replace(/Ç/g, 'c')
      .toLowerCase()
      .replace(/ı/g, 'i')
      .replace(/ğ/g, 'g')
      .replace(/ü/g, 'u')
      .replace(/ş/g, 's')
      .replace(/ö/g, 'o')
      .replace(/ç/g, 'c')
  }

  const fetchProducts = useCallback(async (query) => {
    try {
      setLoading(true)
      
      // searchAll varsa kategori/subcategory kısıtlaması olmadan ara
      const whereClause = query.searchAll 
        ? { ...(query.category && { category: query.category }) }
        : {
            ...(query.category && { category: query.category }),
            ...(query.subcategory && { subcategory: query.subcategory }),
          }

      const dataRequest = [{
        source: query.source || "mutfak.json",
        where: whereClause,
        fields: ["name", "models", "properties", "details", "image", "catalog", "gallery", "subcategory", "category"],
        max_items: 300
      }]

      console.log('🔎 API isteği:', JSON.stringify(whereClause))

      const response = await fetch(`${WORKER_URL}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data_request: dataRequest })
      })

      if (!response.ok) throw new Error('Ürünler getirilemedi')
      const results = await response.json()
      let allProducts = results.flatMap(r => r.data || [])

      console.log('📦 API\'den gelen ürün sayısı:', allProducts.length)

      // Client-side filtreleme
      if (query.contains && query.contains.length > 0) {
        const searchTermsNormalized = query.contains.map(term => normalizeForSearch(term))
        
        allProducts = allProducts.filter(product => {
          const productNameNormalized = normalizeForSearch(product.name || '')
          return searchTermsNormalized.some(term => productNameNormalized.includes(term))
        })
        
        console.log('🔍 Filtreleme sonrası:', allProducts.length, 'ürün')
      }

      // GRUPLA: Sonuçları subcategory'ye göre grupla
      const grouped = {}
      allProducts.forEach(product => {
        const groupKey = product.subcategory || product.category || 'Diğer'
        if (!grouped[groupKey]) {
          grouped[groupKey] = []
        }
        grouped[groupKey].push(product)
      })
      
      const groupCount = Object.keys(grouped).length
      console.log('📁 Gruplar:', Object.keys(grouped), `(${groupCount} grup)`)

      // Ürünlere grup bilgisi ekle (gösterim için)
      const productsWithGroups = allProducts.map(p => ({
        ...p,
        _groupName: p.subcategory || p.category || 'Diğer'
      }))
      
      setProducts(productsWithGroups)
      setSelectedSubcategory(query.name || query.subcategory || 'Arama Sonuçları')
      setCurrentView('products')
      setLoading(false)
      resetIdleTimer()
    } catch (err) {
      console.error('Product fetch error:', err)
      setLoading(false)
    }
  }, [])

  // Ürün detayını sesli komutla açma fonksiyonu
  const openProductDetail = useCallback((text) => {
    const lower = normalizeForSearch(text)
    const currentProducts = productsRef.current
    
    console.log('🔎 Ürün detayı aranıyor:', text)
    console.log('🔤 Normalize:', lower)
    console.log('📦 Mevcut ürün sayısı:', currentProducts.length)

    if (currentProducts.length === 0) {
      console.log('❌ Ürün listesi boş')
      return false
    }

    // Sıra numarasıyla ürün seçme: "birinci ürün", "ikinci ürün", "1. ürün" vs.
    const orderWords = {
      'birinci': 0, 'ilk': 0, '1.': 0,
      'ikinci': 1, '2.': 1,
      'ucuncu': 2, 'üçüncü': 2, '3.': 2,
      'dorduncu': 3, 'dördüncü': 3, '4.': 3,
      'besinci': 4, 'beşinci': 4, '5.': 4,
      'altinci': 5, 'altıncı': 5, '6.': 5,
      'yedinci': 6, '7.': 6,
      'sekizinci': 7, '8.': 7,
      'dokuzuncu': 8, '9.': 8,
      'onuncu': 9, '10.': 9
    }

    // Sıra numarası kontrolü
    for (const [word, index] of Object.entries(orderWords)) {
      if (lower.includes(word) && (lower.includes('urun') || lower.includes('ürün') || lower.includes('goster') || lower.includes('göster') || lower.includes('detay') || lower.includes('ac') || lower.includes('aç'))) {
        if (index < currentProducts.length) {
          console.log(`✅ ${index + 1}. ürün açılıyor:`, currentProducts[index].name)
          setSelectedProduct(currentProducts[index])
          return true
        }
      }
    }

    // "bu ürünü göster", "bunu göster" - ilk ürünü aç
    if ((lower.includes('bu urun') || lower.includes('bunu') || lower.includes('bu ürün')) && 
        (lower.includes('goster') || lower.includes('göster') || lower.includes('detay') || lower.includes('ac') || lower.includes('aç'))) {
      console.log('✅ İlk ürün açılıyor:', currentProducts[0].name)
      setSelectedProduct(currentProducts[0])
      return true
    }

    // === MODEL KODU İLE ARAMA (CCS 101, CRF 700, CGL 2000 vb.) ===
    const modelPatterns = [
      /\b([A-Za-z]{2,4})\s*[-]?\s*(\d{2,4})\b/g,
      /\b([A-Za-z]{2,4})(\d{2,4})\b/g,
    ]
    
    for (const pattern of modelPatterns) {
      const matches = [...text.matchAll(pattern)]
      for (const match of matches) {
        const prefix = match[1].toLowerCase()
        const number = match[2]
        const modelCode = prefix + number
        const modelCodeSpaced = prefix + ' ' + number
        
        console.log('🔍 Model kodu arıyor:', modelCode, 'veya', modelCodeSpaced)
        
        const productByCode = currentProducts.find(p => {
          const pName = normalizeForSearch(p.name || '')
          const pNameNoSpace = pName.replace(/\s+/g, '')
          
          return pNameNoSpace.includes(modelCode) || 
                 pName.includes(modelCodeSpaced) ||
                 pName.includes(prefix + number) ||
                 pName.includes(prefix + ' ' + number)
        })
        
        if (productByCode) {
          console.log('✅ Model kodu ile ürün açılıyor:', productByCode.name)
          setSelectedProduct(productByCode)
          return true
        }
      }
    }

    // === YAZILI SAYI İLE MODEL KODU ===
    const numberWords = {
      'bir': '1', 'iki': '2', 'uc': '3', 'dort': '4', 'bes': '5',
      'alti': '6', 'yedi': '7', 'sekiz': '8', 'dokuz': '9', 'on': '10',
      'yuz': '100', 'yuziki': '102', 'yuzuc': '103',
      'yuz bir': '101', 'yuz iki': '102', 'yuz uc': '103',
      'iki yuz': '200', 'ikiyuz': '200', 'uc yuz': '300', 'ucyuz': '300'
    }
    
    let textWithNumbers = lower
    Object.entries(numberWords)
      .sort((a, b) => b[0].length - a[0].length)
      .forEach(([word, num]) => {
        textWithNumbers = textWithNumbers.replace(new RegExp(word, 'g'), num)
      })
    
    console.log('🔢 Sayılarla:', textWithNumbers)
    
    for (const pattern of modelPatterns) {
      const matches = [...textWithNumbers.matchAll(pattern)]
      for (const match of matches) {
        const prefix = match[1].toLowerCase()
        const number = match[2]
        const modelCode = prefix + number
        
        console.log('🔍 Dönüştürülmüş model kodu:', modelCode)
        
        const productByCode = currentProducts.find(p => {
          const pName = normalizeForSearch(p.name || '').replace(/\s+/g, '')
          return pName.includes(modelCode)
        })
        
        if (productByCode) {
          console.log('✅ Dönüştürülmüş model ile ürün açılıyor:', productByCode.name)
          setSelectedProduct(productByCode)
          return true
        }
      }
    }

    // === ÜRÜN ADI İLE ARAMA ===
    for (const product of currentProducts) {
      const productName = normalizeForSearch(product.name || '')
      const productNameNoSpace = productName.replace(/\s+/g, '')
      const lowerNoSpace = lower.replace(/\s+/g, '')
      
      if (lowerNoSpace.includes(productNameNoSpace) || productNameNoSpace.includes(lowerNoSpace)) {
        console.log('✅ Tam isim eşleşmesi:', product.name)
        setSelectedProduct(product)
        return true
      }
      
      const productWords = productName.split(/\s+/).filter(w => w.length >= 3)
      const matchCount = productWords.filter(word => lower.includes(word)).length
      
      if (productWords.length > 0 && matchCount >= Math.ceil(productWords.length * 0.6)) {
        console.log('✅ Kelime eşleşmesi:', product.name, `(${matchCount}/${productWords.length})`)
        setSelectedProduct(product)
        return true
      }
    }

    console.log('❌ Ürün bulunamadı')
    return false
  }, [])

  // Karşılaştırmadan ürün çıkarma
  const removeFromComparison = useCallback((index) => {
    setComparisonProducts(prev => prev.filter((_, i) => i !== index))
  }, [])

  // Karşılaştırmayı temizle
  const clearComparison = useCallback(() => {
    setComparisonProducts([])
  }, [])

  // Ürün adı veya model kodu ile ürün bulma (karşılaştırma için)
  const findProductByNameOrCode = useCallback((searchText, productList) => {
    const lower = normalizeForSearch(searchText).trim()
    
    // Model kodu pattern'leri: CCS 101, CGL-700, Pro 5, vb.
    const modelPatterns = [
      /([a-z]{2,4})\s*[-]?\s*(\d{2,4})/gi,  // CCS 101, CGL-700
      /([a-z]{2,4})(\d{2,4})/gi,             // CCS101
    ]
    
    // Önce model kodu ile ara
    for (const pattern of modelPatterns) {
      const matches = [...searchText.matchAll(pattern)]
      for (const match of matches) {
        const prefix = match[1].toLowerCase()
        const number = match[2]
        const modelCode = prefix + number
        const modelCodeSpaced = prefix + ' ' + number
        
        const found = productList.find(p => {
          const pName = normalizeForSearch(p.name || '')
          const pNameNoSpace = pName.replace(/\s+/g, '')
          return pNameNoSpace.includes(modelCode) || 
                 pName.includes(modelCodeSpaced) ||
                 pName.includes(modelCode)
        })
        
        if (found) {
          console.log('🔍 Model kodu ile bulundu:', modelCode, '->', found.name)
          return found
        }
      }
    }
    
    // Model kodu bulunamadıysa isimle ara
    for (const product of productList) {
      const productName = normalizeForSearch(product.name || '')
      const productNameNoSpace = productName.replace(/\s+/g, '')
      const lowerNoSpace = lower.replace(/\s+/g, '')
      
      if (productNameNoSpace.includes(lowerNoSpace) || lowerNoSpace.includes(productNameNoSpace)) {
        console.log('🔍 İsim ile bulundu:', lower, '->', product.name)
        return product
      }
    }
    
    return null
  }, [])

  // Sesli komutla karşılaştırma açma
  const openComparison = useCallback((text) => {
    const lower = normalizeForSearch(text)
    const currentProducts = productsRef.current

    console.log('⚖️ Karşılaştırma komutu:', text)
    console.log('⚖️ Mevcut ürün sayısı:', currentProducts.length)

    if (currentProducts.length < 2) {
      console.log('❌ Karşılaştırma için en az 2 ürün gerekli')
      return false
    }

    // === ÖNCELİK 1: MODEL KODU İLE KARŞILAŞTIRMA ===
    // "CCS 101 ile CCS 102", "CGL 700 ve CGL 1400", "Pro 5 ile Pro 9" vb.
    const modelPattern = /([a-z]{2,4})\s*[-]?\s*(\d{1,4})/gi
    const allModelMatches = [...text.matchAll(modelPattern)]
    
    if (allModelMatches.length >= 2) {
      console.log('🔍 Model kodları bulundu:', allModelMatches.map(m => m[0]))
      const foundProducts = []
      
      for (const match of allModelMatches) {
        const searchTerm = match[0]
        const product = findProductByNameOrCode(searchTerm, currentProducts)
        if (product && !foundProducts.find(p => p.name === product.name)) {
          foundProducts.push(product)
        }
      }
      
      if (foundProducts.length >= 2) {
        console.log('✅ Model kodları ile karşılaştırma:', foundProducts.map(p => p.name))
        setComparisonProducts(foundProducts.slice(0, 4))
        return true
      }
    }

    // === ÖNCELİK 2: BAĞLAÇ İLE AYIRMA ===
    // "X ile Y karşılaştır", "X ve Y arasındaki fark"
    const connectors = [' ile ', ' ve ', ' with ', ' and ', ' arasinda', ' arasında']
    for (const connector of connectors) {
      if (lower.includes(connector)) {
        const parts = text.split(new RegExp(connector, 'i'))
        if (parts.length >= 2) {
          console.log('🔍 Bağlaç ile ayrıldı:', parts)
          const foundProducts = []
          
          for (const part of parts) {
            const cleanPart = part.trim()
            if (cleanPart.length < 2) continue
            
            const product = findProductByNameOrCode(cleanPart, currentProducts)
            if (product && !foundProducts.find(p => p.name === product.name)) {
              foundProducts.push(product)
            }
          }

          if (foundProducts.length >= 2) {
            console.log('✅ Bağlaç ile karşılaştırma:', foundProducts.map(p => p.name))
            setComparisonProducts(foundProducts.slice(0, 4))
            return true
          }
        }
      }
    }

    // === ÖNCELİK 3: SIRA NUMARASI İLE KARŞILAŞTIRMA ===
    const orderWords = {
      'birinci': 0, 'ilk': 0, '1.': 0,
      'ikinci': 1, '2.': 1,
      'ucuncu': 2, 'üçüncü': 2, '3.': 2,
      'dorduncu': 3, 'dördüncü': 3, '4.': 3,
      'besinci': 4, 'beşinci': 4, '5.': 4,
    }

    const foundIndices = []
    for (const [word, index] of Object.entries(orderWords)) {
      if (lower.includes(word) && index < currentProducts.length) {
        if (!foundIndices.includes(index)) {
          foundIndices.push(index)
        }
      }
    }

    if (foundIndices.length >= 2) {
      const productsToCompare = foundIndices.slice(0, 4).map(i => currentProducts[i])
      console.log('✅ Sıra numarası ile karşılaştırma:', productsToCompare.map(p => p.name))
      setComparisonProducts(productsToCompare)
      return true
    }

    // === ÖNCELİK 4: "BU İKİ", "İLK İKİ" ===
    if (lower.includes('bu iki') || lower.includes('ilk iki')) {
      const productsToCompare = currentProducts.slice(0, 2)
      console.log('✅ İlk iki ürün karşılaştırılıyor:', productsToCompare.map(p => p.name))
      setComparisonProducts(productsToCompare)
      return true
    }

    // === ÖNCELİK 5: "HEPSİNİ KARŞILAŞTIR" ===
    if (lower.includes('hepsini') || lower.includes('tumunu') || lower.includes('tümünü')) {
      const productsToCompare = currentProducts.slice(0, 4)
      console.log('✅ Tüm ürünler karşılaştırılıyor:', productsToCompare.map(p => p.name))
      setComparisonProducts(productsToCompare)
      return true
    }

    console.log('❌ Karşılaştırılacak ürünler bulunamadı')
    return false
  }, [findProductByNameOrCode])

  const checkForProductCommand = useCallback((text) => {
    if (!text) return
    
    const lower = normalizeForSearch(text)
    console.log('🎤 Komut:', text)
    console.log('🔤 Normalize:', lower)

    // === ÖNCELİK -1: KARŞILAŞTIRMA KOMUTU ===
    const isComparisonRequest = 
      lower.includes('karsilastir') || 
      lower.includes('karşılaştır') ||
      lower.includes('kiyasla') ||
      lower.includes('kıyasla') ||
      lower.includes('farki') ||
      lower.includes('farkı') ||
      lower.includes('fark nedir') ||
      lower.includes('farklari') ||
      lower.includes('farkları') ||
      lower.includes('arasindaki') ||
      lower.includes('arasındaki') ||
      lower.includes('compare')

    if (isComparisonRequest) {
      if (productsRef.current.length >= 2) {
        const opened = openComparison(text)
        if (opened) return
      } else {
        console.log('⚠️ Karşılaştırma için önce ürün listesi gerekli')
      }
    }

    // === ÖNCELİK 0: ÜRÜN DETAYI AÇMA ===
    const isDetailRequest = 
      lower.includes('detay') || 
      lower.includes('bilgi ver') || 
      lower.includes('ozellik') || 
      lower.includes('özellik') ||
      lower.includes('teknik') ||
      lower.includes('hakkinda') ||
      lower.includes('hakkında') ||
      (lower.includes('goster') && !lower.includes('hepsini')) ||
      (lower.includes('göster') && !lower.includes('hepsini')) ||
      lower.includes('incele') ||
      lower.includes('bak') ||
      lower.includes('ac ') || 
      lower.includes('aç ')

    const hasOrderWord = lower.includes('birinci') || lower.includes('ikinci') || lower.includes('ucuncu') || 
                         lower.includes('ilk') || lower.includes('1.') || lower.includes('2.') || lower.includes('3.') ||
                         lower.includes('bu urun') || lower.includes('bunu')

    if (isDetailRequest || hasOrderWord) {
      if (productsRef.current.length > 0) {
        const opened = openProductDetail(text)
        if (opened) return
      }
    }

    // === TÜM KONTROLLER EN BAŞTA ===
    
    const hasIkiKapili = lower.includes('iki kap') || lower.includes('2 kap') || lower.includes('cift kap')
    const hasTekKapili = lower.includes('tek kap') || lower.includes('1 kap')
    const hasUcKapili = lower.includes('uc kap') || lower.includes('3 kap')
    
    const hasDikTip = lower.includes('dik tip') || lower.includes('diktip') || lower.includes('dikdik') || lower.includes('dikey')
    const hasYatayTip = lower.includes('yatay tip') || lower.includes('yataytip') || lower.includes('yatay')
    
    const tepsiMatch = lower.match(/(\d+)\s*tepsili/)
    
    const hasGreenLine = lower.includes('green') || lower.includes('greenline')
    const hasProfesyonel = lower.includes('profesyonel') || lower.includes('professional') || lower.includes('pro ')
    const hasStandart = lower.includes('standart') || lower.includes('standard') || lower.includes('std')
    const hasMini = lower.includes('mini')
    
    const isBuzdolabi = lower.includes('buzdolab') || lower.includes('dolap') || lower.includes('sogut')
    const isFirin = lower.includes('firin') || lower.includes('oven')
    const isDondurma = lower.includes('dondurma') || lower.includes('gelato') || lower.includes('ice cream')
    const isSoftDondurma = lower.includes('soft')
    const isPisirici = lower.includes('pisirici') || lower.includes('ocak') || lower.includes('izgara') || lower.includes('grill')
    const isBulasik = lower.includes('bulasik') || lower.includes('dishwash')
    
    console.log('🔍 Algılanan:', { hasDikTip, hasYatayTip, hasIkiKapili, hasTekKapili, isBuzdolabi, isFirin, isDondurma })

    // === ÖNCELİK 1: TİP + KAPI SAYISI ===
    
    if (hasDikTip && (hasIkiKapili || hasTekKapili)) {
      let searchTerm = hasIkiKapili ? 'iki kapili' : 'tek kapili'
      let displayName = hasIkiKapili ? 'İki Kapılı Dik Tip' : 'Tek Kapılı Dik Tip'
      console.log('✅ Dik Tip +', displayName)
      fetchProducts({ 
        category: 'SOĞUTMA', 
        subcategory: 'Dik Tip Buzdolapları', 
        source: 'mutfak.json', 
        name: displayName,
        contains: [searchTerm]
      })
      return
    }
    
    if (hasYatayTip && (hasIkiKapili || hasTekKapili)) {
      let searchTerm = hasIkiKapili ? 'iki kapili' : 'tek kapili'
      let displayName = hasIkiKapili ? 'İki Kapılı Yatay Tip' : 'Tek Kapılı Yatay Tip'
      console.log('✅ Yatay Tip +', displayName)
      fetchProducts({ 
        category: 'SOĞUTMA', 
        subcategory: 'Tezgah Altı Buzdolapları', 
        source: 'mutfak.json', 
        name: displayName,
        contains: [searchTerm]
      })
      return
    }

    // === ÖNCELİK 2: SADECE TİP ===
    
    if ((hasYatayTip || lower.includes('yatay')) && (isDondurma || lower.includes('dondurma'))) {
      console.log('✅ Yatay Tip Dondurma Makineleri')
      fetchProducts({ category: 'Yatay Tip Dondurma Makineleri', source: 'dondurma.json', name: 'Yatay Tip Dondurma Makineleri' })
      return
    }
    
    if (hasDikTip) {
      console.log('✅ Dik Tip Buzdolapları')
      fetchProducts({ category: 'SOĞUTMA', subcategory: 'Dik Tip Buzdolapları', source: 'mutfak.json', name: 'Dik Tip Buzdolapları' })
      return
    }
    
    if (hasYatayTip && !isDondurma) {
      console.log('✅ Tezgah Altı (Yatay Tip) Buzdolapları')
      fetchProducts({ category: 'SOĞUTMA', subcategory: 'Tezgah Altı Buzdolapları', source: 'mutfak.json', name: 'Tezgah Altı Buzdolapları' })
      return
    }
    
    if (lower.includes('tezgah alti') || lower.includes('tezgahalti')) {
      console.log('✅ Tezgah Altı Buzdolapları')
      fetchProducts({ category: 'SOĞUTMA', subcategory: 'Tezgah Altı Buzdolapları', source: 'mutfak.json', name: 'Tezgah Altı Buzdolapları' })
      return
    }

    // === ÖNCELİK 3: SADECE KAPI SAYISI + BUZDOLABI ===
    
    if ((hasIkiKapili || hasTekKapili || hasUcKapili) && isBuzdolabi) {
      let searchTerm = ''
      let displayName = ''
      
      if (hasIkiKapili) { searchTerm = 'iki kapili'; displayName = 'İki Kapılı Modeller' }
      else if (hasTekKapili) { searchTerm = 'tek kapili'; displayName = 'Tek Kapılı Modeller' }
      else if (hasUcKapili) { searchTerm = 'uc kapili'; displayName = 'Üç Kapılı Modeller' }
      
      console.log('✅ Kapı araması:', displayName)
      fetchProducts({
        category: 'SOĞUTMA',
        source: 'mutfak.json',
        name: displayName,
        searchAll: true,
        contains: [searchTerm]
      })
      return
    }
    
    // === ÖNCELİK 4: FIRIN TİPLERİ ===
    
    if (lower.includes('kombi')) {
      console.log('✅ Kombi Fırınlar (searchAll)');
      fetchProducts({
        source: 'mutfak.json',
        name: 'Kombi Fırınlar',
        searchAll: true,
        contains: ['kombi', 'combi'],
      });
      return;
    }
    
    if (lower.includes('konveksiyonlu')) {
      console.log('✅ Konveksiyonlu Fırınlar')
      fetchProducts({ category: 'FIRINLAR', subcategory: 'Konveksiyonlu Fırınlar', source: 'mutfak.json', name: 'Konveksiyonlu Fırınlar' })
      return
    }
    
    if (lower.includes('pastane')) {
      console.log('✅ Pastane Fırınları')
      fetchProducts({ category: 'FIRINLAR', subcategory: 'Pastane Fırınları', source: 'mutfak.json', name: 'Pastane Fırınları' })
      return
    }
    
    if (tepsiMatch) {
      const tepsiSayisi = tepsiMatch[1]
      console.log('✅ Tepsi araması:', tepsiSayisi)
      fetchProducts({
        category: 'FIRINLAR',
        source: 'mutfak.json',
        name: `${tepsiSayisi} Tepsili Fırınlar`,
        searchAll: true,
        contains: [`${tepsiSayisi} tepsili`]
      })
      return
    }

    // === ÖNCELİK 5: DONDURMA ===
    
    if (isSoftDondurma || (isDondurma && lower.includes('soft'))) {
      if (hasMini) {
        console.log('✅ Mini Serisi Soft Dondurma')
        fetchProducts({ 
          category: 'Soft Dondurma Makineleri', 
          source: 'dondurma.json', 
          name: 'Mini Serisi',
          contains: ['mini']
        })
        return
      }
      if (hasProfesyonel) {
        console.log('✅ Pro Serisi Soft Dondurma')
        fetchProducts({ 
          category: 'Soft Dondurma Makineleri', 
          source: 'dondurma.json', 
          name: 'Pro Serisi',
          contains: ['pro']
        })
        return
      }
      console.log('✅ Soft Dondurma Makineleri')
      fetchProducts({ category: 'Soft Dondurma Makineleri', source: 'dondurma.json', name: 'Soft Dondurma Makineleri' })
      return
    }
    
    if (lower.includes('gelato') || lower.includes('sert dondurma')) {
      console.log('✅ Sert Dondurma / Gelato')
      fetchProducts({ category: 'Yatay Tip Dondurma Makineleri', source: 'dondurma.json', name: 'Yatay Tip Dondurma Makineleri' })
      return
    }

    // === ÖNCELİK 6: SERİLER ===
    
    if (hasMini && isDondurma) {
      console.log('✅ Mini Serisi')
      fetchProducts({ source: 'dondurma.json', name: 'Mini Serisi', searchAll: true, contains: ['mini'] })
      return
    }
    
    if (lower.includes('700 seri')) {
      fetchProducts({ category: 'PİŞİRİCİLER', subcategory: '700 Serisi', source: 'mutfak.json', name: '700 Serisi' })
      return
    }
    if (lower.includes('900 seri')) {
      fetchProducts({ category: 'PİŞİRİCİLER', subcategory: '900 Serisi', source: 'mutfak.json', name: '900 Serisi' })
      return
    }

    // === ÖNCELİK 7: DİĞER ALT KATEGORİLER ===
    
    if (lower.includes('hazirlik')) {
      console.log('✅ Hazırlık Buzdolapları')
      fetchProducts({ category: 'SOĞUTMA', subcategory: 'Hazırlık Buzdolapları', source: 'mutfak.json', name: 'Hazırlık Buzdolapları' })
      return
    }
    if (lower.includes('sok sogut') || lower.includes('blast')) {
      console.log('✅ Şok Soğutucular')
      fetchProducts({ category: 'SOĞUTMA', subcategory: 'Şok Soğutucular', source: 'mutfak.json', name: 'Şok Soğutucular' })
      return
    }

    // === ÖNCELİK 8: MODEL KODU VE SERİ ===
    
    const textToNumber = (text) => {
      const numbers = {
        'bir': '1', 'iki': '2', 'uc': '3', 'dort': '4', 'bes': '5',
        'alti': '6', 'yedi': '7', 'sekiz': '8', 'dokuz': '9', 'sifir': '0',
        'yuz': '00', 'ikiyuz': '200', 'ucyuz': '300', 'dortyuz': '400',
        'iki yuz': '200', 'uc yuz': '300', 'dort yuz': '400'
      }
      let result = text
      Object.entries(numbers).forEach(([word, num]) => {
        result = result.replace(new RegExp(word, 'gi'), num)
      })
      return result
    }
    
    const lowerWithNumbers = textToNumber(lower)
    
    const nilMatch = lowerWithNumbers.match(/nil\s*(\d+)/i) || lower.match(/nil\s*(iki\s*yuz|ikiyuz|200)/i)
    if (nilMatch) {
      console.log('✅ Nil serisi:', nilMatch[0])
      fetchProducts({
        source: 'dondurma.json',
        name: 'Nil 200',
        searchAll: true,
        contains: ['nil']
      })
      return
    }
    
    if (lower.includes('life')) {
      console.log('✅ Life serisi')
      fetchProducts({
        source: 'dondurma.json',
        name: 'Life Serisi',
        searchAll: true,
        contains: ['life']
      })
      return
    }
    
    if (lower.includes('mec')) {
      console.log('✅ Mec serisi')
      fetchProducts({
        source: 'dondurma.json',
        name: 'Mec Serisi',
        searchAll: true,
        contains: ['mec']
      })
      return
    }
    
    const modelMatch = text.match(/\b(CGL|CRF|CPS|CFL|CFR)\s*\d+/i)
    if (modelMatch) {
      console.log('✅ Model kodu:', modelMatch[0])
      fetchProducts({
        source: 'mutfak.json',
        name: modelMatch[0],
        searchAll: true,
        contains: [normalizeForSearch(modelMatch[0])]
      })
      return
    }
    
    const proMatch = text.match(/\bpro\s*(\d+)/i) || lowerWithNumbers.match(/pro\s*(\d+)/i)
    if (proMatch) {
      console.log('✅ Pro serisi:', proMatch[0])
      fetchProducts({
        source: 'dondurma.json',
        name: `Pro ${proMatch[1]}`,
        searchAll: true,
        contains: [`pro`]
      })
      return
    }

    // === ÖNCELİK 9: ANA KATEGORİLER ===
    
    if (isFirin) {
      console.log('✅ Fırınlar kategorisi')
      fetchSubcategories({ category: 'FIRINLAR', source: 'mutfak.json', name: 'Fırınlar' })
      return
    }
    
    if (isBuzdolabi) {
      console.log('✅ Soğutma kategorisi')
      fetchSubcategories({ category: 'SOĞUTMA', source: 'mutfak.json', name: 'Soğutma' })
      return
    }
    
    if (isDondurma) {
      console.log('✅ Dondurma kategorisi')
      fetchSubcategories({ source: 'dondurma.json', name: 'Dondurma Makineleri', isDondurma: true })
      return
    }
    
    if (isPisirici) {
      console.log('✅ Pişiriciler kategorisi')
      fetchSubcategories({ category: 'PİŞİRİCİLER', source: 'mutfak.json', name: 'Pişiriciler' })
      return
    }
    
    if (isBulasik) {
      console.log('✅ Bulaşık makineleri kategorisi')
      fetchSubcategories({ category: 'BULAŞIK MAKİNELERİ', source: 'mutfak.json', name: 'Bulaşık Makineleri' })
      return
    }

    console.log('❌ Komut eşleşmedi:', text)
  }, [fetchProducts, fetchSubcategories, openProductDetail, openComparison])

  const conversation = useConversation({
    onConnect: () => console.log('✅ ElevenLabs bağlandı'),
    onDisconnect: () => console.log('❌ Bağlantı kesildi'),
    onMessage: (message) => {
      if (message.source === 'user') {
        setTranscript(prev => [...prev, { role: 'user', text: message.message }])
        checkForProductCommand(message.message)
        resetIdleTimer()
        return
      }

      if (message.source === 'ai') {
        setTranscript(prev => [...prev, { role: 'assistant', text: message.message }])
        const aiLower = message.message.toLowerCase()
        if (aiLower.includes('gösteriyorum') || aiLower.includes('açıyorum') || aiLower.includes('detayları') || aiLower.includes('karşılaştır')) {
          console.log('🤖 AI ürün gösteriyor...')
          checkForProductCommand(message.message)
        }
        resetIdleTimer()
        return
      }
    },

    onError: (error) => console.error('❌ Hata:', error),
  })

  const { status, isSpeaking } = conversation

  const startConversation = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true })
      await conversation.startSession({ agentId: AGENT_ID })
      setChatPanelOpen(true)
    } catch (error) {
      console.error('Başlatma hatası:', error)
    }
  }

  const endConversation = async () => {
    await conversation.endSession()
    setChatPanelOpen(false)
  }

  const handleAvatarClick = () => {
    if (status === 'connected') {
      setChatPanelOpen(!chatPanelOpen)
    } else {
      startConversation()
    }
  }

  const handleCategoryClick = (category) => {
    fetchSubcategories({
      category: category.name,
      source: category.source,
      name: category.name,
      isDondurma: category.isDondurma || false
    })
  }

  const handleSubcategoryClick = (subcategory) => {
    if (selectedCategory?.isDondurma) {
      fetchProducts({ category: subcategory.name, source: 'dondurma.json', name: subcategory.name })
    } else {
      fetchProducts({
        category: selectedCategory.category,
        subcategory: subcategory.name,
        source: selectedCategory.source,
        name: subcategory.name
      })
    }
  }

  const handleBack = () => {
    if (currentView === 'products' && selectedCategory) {
      setCurrentView('subcategories')
      setProducts([])
      setSelectedSubcategory(null)
      lastQueryRef.current = null
    } else {
      handleReset()
    }
  }

  useEffect(() => {
    resetIdleTimer()
    return () => { if (idleTimerRef.current) clearTimeout(idleTimerRef.current) }
  }, [products])

  const isConnected = status === 'connected'

  const t = {
    TR: {
      tagline: 'Crystal Endüstriyel — Profesyonel mutfak çözümleri',
      subtitle: 'Merhaba! Ben Crystal AI Assist. Ürünlerimiz hakkında her şeyi sorabilirsiniz.',
      home: 'Ana Sayfa',
      back: 'Geri',
      askAI: 'Crystal AI Assist\'e Sor',
      products: 'ürün',
      subcats: 'alt kategori',
      listening: 'Dinliyorum...',
      speaking: 'Konuşuyor...',
      endCall: 'Görüşmeyi Bitir',
    },
    EN: {
      tagline: 'Crystal Industrial — Professional kitchen solutions',
      subtitle: 'Hello! I\'m Crystal AI Assist. Ask me anything about our products.',
      home: 'Home',
      back: 'Back',
      askAI: 'Ask Crystal AI Assist',
      products: 'products',
      subcats: 'subcategories',
      listening: 'Listening...',
      speaking: 'Speaking...',
      endCall: 'End Call',
    }
  }
  const txt = t[language]

  return (
    <div className="app">
      {/* Header */}
      <header className="app-header">
        <div className="header-logo" onClick={handleReset}>
          <img src={`${R2_BASE}/category/logo.png`} alt="Crystal" />
        </div>
        <div className="header-tagline">{txt.tagline}</div>
        <div className="header-actions">
          <button className="header-btn" onClick={toggleLanguage}>
            {language === 'TR' ? '🇬🇧 English' : '🇹🇷 Türkçe'}
          </button>
          {currentView !== 'home' && (
            <button className="header-btn" onClick={handleBack}>← {txt.back}</button>
          )}
          <button className="header-btn primary" onClick={handleReset}>🏠 {txt.home}</button>
        </div>
      </header>

      {/* Main */}
      <main className="app-main">
        {/* HOME */}
        {currentView === 'home' && (
          <div className="home-view">
            <div className="home-content">
              <CategoryGrid onCategorySelect={handleCategoryClick} language={language} />
              
              <div className="ai-section">
                <div className="ai-avatar" onClick={handleAvatarClick}>
                  <img src={`${R2_BASE}/category/crystal_avatar.gif`} alt="Crystal AI" className={isSpeaking ? 'speaking' : ''} />
                  <div className="avatar-glow"></div>
                </div>
                <p className="ai-text">{txt.subtitle}</p>
                <button className="ai-btn" onClick={handleAvatarClick}>
                  {isConnected ? (isSpeaking ? `🔊 ${txt.speaking}` : `👂 ${txt.listening}`) : txt.askAI}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SUBCATEGORIES */}
        {currentView === 'subcategories' && (
          <div className="page-view fade-in">
            <div className="page-header">
              <h1>{selectedCategory?.name}</h1>
              <span className="badge">{subcategories.length} {txt.subcats}</span>
            </div>
            <div className="card-grid">
              {subcategories.map((sub, i) => {
                const categoryName = selectedCategory?.category || selectedCategory?.name
                const imageUrl = getImageUrl(sub.image, categoryName)
                
                if (i < 3) {
                  console.log(`📦 Subcategory ${i}:`, {
                    name: sub.name,
                    originalPath: sub.image,
                    categoryOverride: categoryName,
                    finalUrl: imageUrl
                  })
                }
                
                return (
                  <div key={i} className="product-card" onClick={() => handleSubcategoryClick(sub)}>
                    <div className="card-image">
                      {sub.image ? (
                        <img 
                          src={imageUrl} 
                          alt={sub.name} 
                          onError={(e) => {
                            console.error('❌ Image failed to load:', imageUrl)
                            e.target.style.display = 'none'
                            e.target.parentElement.innerHTML = '<div class="no-image">📦</div>'
                          }} 
                          onLoad={() => console.log('✅ Image loaded:', imageUrl)}
                        />
                      ) : (
                        <div className="no-image">📦</div>
                      )}
                    </div>
                    <div className="card-info">
                      <h3>{sub.name}</h3>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* PRODUCTS - GRUPLU GÖSTERİM */}
        {currentView === 'products' && (
          <div className="page-view fade-in">
            <div className="page-header">
              <h1>{selectedSubcategory}</h1>
              <span className="badge">{products.length} {txt.products}</span>
            </div>
            
            {(() => {
              const grouped = {}
              products.forEach(p => {
                const group = p._groupName || p.subcategory || p.category || 'Diğer'
                if (!grouped[group]) grouped[group] = []
                grouped[group].push(p)
              })
              
              const groupKeys = Object.keys(grouped)
              
              if (groupKeys.length <= 1) {
                return (
                  <ProductGallery 
                    products={products} 
                    onProductSelect={setSelectedProduct}
                  />
                )
              }
              
              return (
                <div className="grouped-products">
                  {groupKeys.map(groupName => (
                    <div key={groupName} className="product-group">
                      <h2 className="group-title">
                        <span className="group-icon">📁</span>
                        {groupName}
                        <span className="group-count">({grouped[groupName].length})</span>
                      </h2>
                      <ProductGallery 
                        products={grouped[groupName]} 
                        onProductSelect={setSelectedProduct}
                      />
                    </div>
                  ))}
                </div>
              )
            })()}
          </div>
        )}

        {loading && <div className="loading"><div className="spinner"></div></div>}
      </main>

      {/* Floating Avatar - Diğer sayfalarda görünür */}
      {currentView !== 'home' && (
        <div className="floating-avatar" onClick={handleAvatarClick}>
          <img src={`${R2_BASE}/category/crystal_avatar.gif`} alt="Crystal AI" className={isSpeaking ? 'speaking' : ''} />
          {isConnected && <span className="avatar-status-dot"></span>}
        </div>
      )}

      {/* Chat Panel - Modal Style */}
      {chatPanelOpen && (
        <>
          <div className="chat-overlay" onClick={() => setChatPanelOpen(false)} />
          <div className="chat-modal">
            <div className="chat-header">
              <div className="chat-title">
                <img src={`${R2_BASE}/category/crystal_avatar.gif`} alt="" />
                <span>Crystal AI Assist</span>
                {isConnected && <span className={`status-dot ${isSpeaking ? 'speaking' : ''}`}></span>}
              </div>
              <button className="chat-close" onClick={() => setChatPanelOpen(false)}>✕</button>
            </div>
            <div className="chat-body">
              {transcript.length === 0 ? (
                <div className="chat-empty">
                  <img src={`${R2_BASE}/category/crystal_avatar.gif`} alt="" />
                  <p>{isConnected ? txt.listening : 'Bağlanıyor...'}</p>
                </div>
              ) : (
                transcript.map((msg, i) => (
                  <div key={i} className={`chat-msg ${msg.role}`}>{msg.text}</div>
                ))
              )}
            </div>
            <div className="chat-footer">
              <div className="chat-status">
                {isConnected && (
                  <>
                    <span className={`status-indicator ${isSpeaking ? 'speaking' : ''}`}>
                      {isSpeaking ? `🔊 ${txt.speaking}` : `👂 ${txt.listening}`}
                    </span>
                    <button className="end-btn" onClick={endConversation}>{txt.endCall}</button>
                  </>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Product Modal */}
      {selectedProduct && (
        <ProductModal product={selectedProduct} onClose={() => setSelectedProduct(null)} />
      )}

      {/* Comparison Modal */}
      {comparisonProducts.length >= 2 && (
        <ComparisonModal 
          products={comparisonProducts} 
          onClose={clearComparison}
          onRemoveProduct={removeFromComparison}
        />
      )}
    </div>
  )
}

export default App
