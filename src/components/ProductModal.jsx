import React, { useEffect, useState, useMemo } from 'react'
import './ProductModal.css'

const R2_BASE = 'https://assist-token-magnum.gurkan-ture.workers.dev/GORSELLER'
const KNOWN_CATEGORY_FOLDERS = ['refrigeration', 'ovens', 'cooking', 'dishwashers', 'dondurma']
const CATEGORY_FOLDER_MAP = {
  'SOĞUTMA': 'refrigeration',
  'FIRINLAR': 'ovens',
  'PİŞİRİCİLER': 'cooking',
  'BULAŞIK MAKİNELERİ': 'dishwashers',
  'DONDURMA MAKİNELERİ': 'dondurma',
  'Soğutma': 'refrigeration',
  'Fırınlar': 'ovens',
  'Pişiriciler': 'cooking',
  'Bulaşık Makineleri': 'dishwashers',
  'Dondurma Makineleri': 'dondurma',
}

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

function ProductModal({ product, onClose }) {
  const [selectedModels, setSelectedModels] = useState([])

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

  // Model seçimini başlat
  useEffect(() => {
    if (product.models && product.models.length > 0) {
      setSelectedModels(product.models.map(m => m.name))
    }
  }, [product.models])

  const categoryHint = product.category || product.subcategory
  const imageUrl = getImageUrl(product.image, categoryHint) || '/placeholder-product.png'
  const catalogUrl = product.catalog ? getImageUrl(product.catalog, categoryHint) : null

  const handleImageError = (e) => {
    e.target.src = '/placeholder-product.png'
  }

  // Çoklu model için karşılaştırma tablosu verilerini hazırla
  const comparisonData = useMemo(() => {
    if (!product.models || product.models.length === 0) return null

    // Tüm özellik isimlerini topla (sıralı ve benzersiz)
    const allSpecNames = []
    const specNameSet = new Set()

    product.models.forEach(model => {
      if (model.model && Array.isArray(model.model)) {
        model.model.forEach(spec => {
          const specName = spec.text || spec.name || spec.label
          if (specName && !specNameSet.has(specName)) {
            specNameSet.add(specName)
            allSpecNames.push(specName)
          }
        })
      }
    })

    // Her model için değerleri eşleştir
    const modelValues = {}
    product.models.forEach(model => {
      modelValues[model.name] = {}
      if (model.model && Array.isArray(model.model)) {
        model.model.forEach(spec => {
          const specName = spec.text || spec.name || spec.label
          const specValue = spec.value ?? spec.val ?? ''
          if (specName) {
            modelValues[model.name][specName] = specValue
          }
        })
      }
    })

    return {
      specNames: allSpecNames,
      modelValues: modelValues,
      models: product.models
    }
  }, [product.models])

  // Model seçim toggle
  const toggleModel = (modelName) => {
    if (selectedModels.includes(modelName)) {
      if (selectedModels.length > 1) {
        setSelectedModels(selectedModels.filter(name => name !== modelName))
      }
    } else {
      setSelectedModels([...selectedModels, modelName])
    }
  }

  const selectAllModels = () => {
    if (product.models) {
      setSelectedModels(product.models.map(m => m.name))
    }
  }

  // Birden fazla model var mı?
  const hasMultipleModels = product.models && product.models.length > 1

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={`modal-content ${hasMultipleModels ? 'modal-wide' : ''}`} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <h2>{product.name}</h2>
          <button className="btn-close" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          {/* Image Section */}
          <div className="modal-image-section">
            <img 
              src={imageUrl} 
              alt={product.name}
              onError={handleImageError}
            />
            {catalogUrl && (
              <a 
                href={catalogUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="btn-catalog"
              >
                📄 PDF Katalog
              </a>
            )}
          </div>

          {/* Info Section */}
          <div className="modal-info-section">
            {/* Category */}
            <div className="info-badge">
              <span className="badge-label">Kategori</span>
              <span className="badge-value">
                {product.category} {product.subcategory && `/ ${product.subcategory}`}
              </span>
            </div>

            {/* Properties (Array format) */}
            {product.properties && Array.isArray(product.properties) && (
              <div className="properties-section">
                <h3>✨ Özellikler</h3>
                <ul className="properties-list">
                  {product.properties.map((prop, index) => (
                    <li key={index}>{prop}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Properties (String format) */}
            {product.properties && typeof product.properties === 'string' && (
              <div className="properties-section">
                <h3>✨ Özellikler</h3>
                <p className="properties-text">{product.properties}</p>
              </div>
            )}

            {/* Properties (Object format) */}
            {product.properties && typeof product.properties === 'object' && !Array.isArray(product.properties) && (
              <div className="properties-section">
                <h3>✨ Özellikler</h3>
                <div className="specs-grid">
                  {Object.entries(product.properties).map(([key, value], index) => (
                    <div key={index} className="spec-item">
                      <span className="spec-label">{key}:</span>
                      <span className="spec-value">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Details properties (dondurma.json format) */}
            {product.details?.properties && (
              <div className="properties-section">
                <h3>✨ Özellikler</h3>
                <p className="properties-text">{product.details.properties}</p>
              </div>
            )}

            {/* Models - Çoklu Model Karşılaştırma Tablosu */}
            {comparisonData && hasMultipleModels && (
              <div className="models-section">
                <h3>📊 Modeller ve Teknik Özellikler</h3>
                
                {/* Model Seçim Butonları */}
                <div className="model-filter">
                  <span className="filter-label">Modeller:</span>
                  <div className="model-buttons">
                    {comparisonData.models.map(model => (
                      <button
                        key={model.name}
                        onClick={() => toggleModel(model.name)}
                        className={`model-filter-btn ${selectedModels.includes(model.name) ? 'active' : ''}`}
                      >
                        {model.name}
                      </button>
                    ))}
                    {selectedModels.length < comparisonData.models.length && (
                      <button onClick={selectAllModels} className="model-filter-btn select-all">
                        Tümünü Seç
                      </button>
                    )}
                  </div>
                </div>

                {/* Karşılaştırma Tablosu */}
                <div className="comparison-table-wrapper">
                  <table className="comparison-table">
                    <thead>
                      <tr>
                        <th className="spec-name-header">Özellik</th>
                        {comparisonData.models
                          .filter(m => selectedModels.includes(m.name))
                          .map(model => (
                            <th key={model.name} className="model-header">
                              <span className="model-label">Model</span>
                              <span className="model-name-text">{model.name}</span>
                            </th>
                          ))}
                      </tr>
                    </thead>
                    <tbody>
                      {comparisonData.specNames.map((specName, idx) => (
                        <tr key={specName} className={idx % 2 === 0 ? 'even' : 'odd'}>
                          <td className="spec-name-cell">{specName}:</td>
                          {comparisonData.models
                            .filter(m => selectedModels.includes(m.name))
                            .map(model => (
                              <td key={model.name} className="spec-value-cell">
                                {comparisonData.modelValues[model.name][specName] || '-'}
                              </td>
                            ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Seçili Model Sayısı */}
                <div className="model-count">
                  {selectedModels.length} / {comparisonData.models.length} model gösteriliyor
                </div>
              </div>
            )}

            {/* Tek Model - Eski Format */}
            {product.models && product.models.length === 1 && (
              <div className="models-section">
                <h3>📊 Teknik Özellikler</h3>
                {product.models.map((model, index) => (
                  <div key={index} className="model-card">
                    <h4 className="model-name">{model.name}</h4>
                    {model.model && (
                      <div className="specs-grid">
                        {model.model.map((spec, specIndex) => (
                          <div key={specIndex} className="spec-item">
                            <span className="spec-label">{spec.text || spec.name}:</span>
                            <span className="spec-value">{spec.value}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Technical specs (dondurma.json format) */}
            {(product.details?.technicial || product.details?.technical) && (
              <div className="models-section">
                <h3>📊 Teknik Özellikler</h3>

                {(() => {
                  const tech = product.details?.technicial ?? product.details?.technical

                  // 1) Array: [{name,value}] veya [{text,value}]
                  if (Array.isArray(tech)) {
                    return (
                      <div className="specs-grid">
                        {tech.map((spec, index) => (
                          <div key={index} className="spec-item">
                            <span className="spec-label">{spec.name || spec.text || spec.label}:</span>
                            <span className="spec-value">{spec.value ?? spec.val ?? ''}</span>
                          </div>
                        ))}
                      </div>
                    )
                  }

                  // 2) Object: { electric: [...], gas: [...] } gibi
                  if (tech && typeof tech === 'object') {
                    return Object.entries(tech).map(([groupName, groupValue]) => (
                      <div key={groupName} style={{ marginBottom: 14 }}>
                        <h4 className="model-name" style={{ marginBottom: 8 }}>
                          {groupName}
                        </h4>

                        {Array.isArray(groupValue) ? (
                          <div className="specs-grid">
                            {groupValue.map((spec, i) => (
                              <div key={i} className="spec-item">
                                <span className="spec-label">{spec.name || spec.text || spec.label}:</span>
                                <span className="spec-value">{spec.value ?? spec.val ?? ''}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="properties-text">{String(groupValue)}</div>
                        )}
                      </div>
                    ))
                  }

                  // 3) String / diğer tipler
                  return <div className="properties-text">{String(tech)}</div>
                })()}
              </div>
            )}

          </div>
        </div>

        {/* Footer Actions */}
        <div className="modal-footer">
          {catalogUrl && (
            <a 
              href={catalogUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="btn-action btn-primary"
            >
              📄 Katalog İndir
            </a>
          )}
          <button className="btn-action btn-secondary" onClick={onClose}>
            Kapat
          </button>
        </div>
      </div>
    </div>
  )
}

export default ProductModal
