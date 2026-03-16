import React, { useEffect, useMemo } from 'react'
import './ComparisonModal.css'

const R2_BASE = 'https://assist-token-magnum.gurkan-ture.workers.dev/GORSELLER'
const KNOWN_CATEGORY_FOLDERS = ['refrigeration', 'ovens', 'cooking', 'dishwashers', 'dondurma']
const CATEGORY_FOLDER_MAP = {
  'SOĞUTMA': 'refrigeration',
  'FIRINLAR': 'ovens',
  'PİŞİRİCİLER': 'cooking',
  'BULAŞIK MAKİNELERİ': 'dishwashers',
  'DONDURMA MAKİNELERİ': 'dondurma',
}

const getImageUrl = (imagePath, categoryHint = null) => {
  if (!imagePath) return null
  
  let cleanPath = imagePath.trim()
  
  if (cleanPath.startsWith('http://') || cleanPath.startsWith('https://')) {
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
  
  if (categoryFolder) {
    return `${R2_BASE}/category/${categoryFolder}/${cleanPath}`
  }
  
  return `${R2_BASE}/category/${cleanPath}`
}

function ComparisonModal({ products, onClose, onRemoveProduct }) {
  // ESC tuşu ile kapatma
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [onClose])

  // Body scroll'u kapat
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [])

  // Tüm özellikleri topla ve karşılaştırma verisi oluştur
  const comparisonData = useMemo(() => {
    if (!products || products.length < 2) return null

    const allSpecs = new Map() // specName -> { products: [values] }

    products.forEach((product, productIndex) => {
      // Models içindeki spec'leri topla
      if (product.models && product.models.length > 0) {
        product.models.forEach(model => {
          if (model.model && Array.isArray(model.model)) {
            model.model.forEach(spec => {
              const specName = spec.text || spec.name || spec.label
              if (specName) {
                if (!allSpecs.has(specName)) {
                  allSpecs.set(specName, { values: new Array(products.length).fill('-') })
                }
                // İlk modelin değerini al (veya tüm modellerin değerlerini birleştir)
                const currentValue = allSpecs.get(specName).values[productIndex]
                if (currentValue === '-') {
                  allSpecs.get(specName).values[productIndex] = spec.value ?? spec.val ?? '-'
                }
              }
            })
          }
        })
      }

      // Details içindeki technicial/technical spec'leri topla
      const tech = product.details?.technicial ?? product.details?.technical
      if (tech && Array.isArray(tech)) {
        tech.forEach(spec => {
          const specName = spec.name || spec.text || spec.label
          if (specName) {
            if (!allSpecs.has(specName)) {
              allSpecs.set(specName, { values: new Array(products.length).fill('-') })
            }
            allSpecs.get(specName).values[productIndex] = spec.value ?? spec.val ?? '-'
          }
        })
      }
    })

    // Farklılıkları işaretle
    const specsArray = []
    allSpecs.forEach((data, specName) => {
      const uniqueValues = new Set(data.values.filter(v => v !== '-'))
      const isDifferent = uniqueValues.size > 1
      specsArray.push({
        name: specName,
        values: data.values,
        isDifferent
      })
    })

    return specsArray
  }, [products])

  // Farklılık sayısını hesapla
  const diffCount = comparisonData?.filter(s => s.isDifferent).length || 0

  if (!products || products.length < 2) {
    return null
  }

  return (
    <div className="comparison-overlay" onClick={onClose}>
      <div className="comparison-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="comparison-header">
          <div className="comparison-title">
            <span className="comparison-icon">⚖️</span>
            <h2>Ürün Karşılaştırma</h2>
            <span className="comparison-badge">{products.length} ürün</span>
            {diffCount > 0 && (
              <span className="diff-badge">{diffCount} farklılık</span>
            )}
          </div>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>

        {/* Content */}
        <div className="comparison-content">
          {/* Ürün Kartları - Üstte */}
          <div className="comparison-products">
            {products.map((product, idx) => {
              const imageUrl = getImageUrl(product.image, product.category) || '/placeholder-product.png'
              return (
                <div key={idx} className="comparison-product-card">
                  <button 
                    className="remove-product-btn"
                    onClick={() => onRemoveProduct && onRemoveProduct(idx)}
                    title="Karşılaştırmadan çıkar"
                  >
                    ✕
                  </button>
                  <div className="product-image-wrapper">
                    <img 
                      src={imageUrl} 
                      alt={product.name}
                      onError={(e) => { e.target.src = '/placeholder-product.png' }}
                    />
                  </div>
                  <div className="product-info">
                    <h3>{product.name}</h3>
                    <span className="product-category">
                      {product.category} {product.subcategory && `/ ${product.subcategory}`}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Karşılaştırma Tablosu */}
          <div className="comparison-table-container">
            <table className="comparison-table">
              <thead>
                <tr>
                  <th className="spec-header">Özellik</th>
                  {products.map((product, idx) => (
                    <th key={idx} className="product-header">
                      {product.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparisonData && comparisonData.map((spec, idx) => (
                  <tr key={idx} className={`${idx % 2 === 0 ? 'even' : 'odd'} ${spec.isDifferent ? 'different' : ''}`}>
                    <td className="spec-name">
                      {spec.name}:
                      {spec.isDifferent && <span className="diff-indicator">●</span>}
                    </td>
                    {spec.values.map((value, vIdx) => (
                      <td key={vIdx} className={`spec-value ${spec.isDifferent ? 'highlight' : ''}`}>
                        {value}
                      </td>
                    ))}
                  </tr>
                ))}
                {(!comparisonData || comparisonData.length === 0) && (
                  <tr>
                    <td colSpan={products.length + 1} className="no-specs">
                      Karşılaştırılacak teknik özellik bulunamadı.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Özet */}
          {diffCount > 0 && (
            <div className="comparison-summary">
              <h4>📊 Karşılaştırma Özeti</h4>
              <p>
                Bu ürünler arasında <strong>{diffCount}</strong> farklı özellik bulunmaktadır.
                Farklılıklar tabloda <span className="highlight-sample">vurgulanmış</span> olarak gösterilmektedir.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="comparison-footer">
          <button className="btn-action btn-secondary" onClick={onClose}>
            Kapat
          </button>
        </div>
      </div>
    </div>
  )
}

export default ComparisonModal
