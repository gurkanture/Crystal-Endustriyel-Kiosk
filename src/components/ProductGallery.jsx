// src/components/ProductGallery.jsx
import React from 'react'

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

const ProductGallery = ({ products, onProductSelect }) => {
  const handleProductClick = (e, product) => {
    e.preventDefault()
    e.stopPropagation()
    console.log('🖱️ Product clicked:', product.name)
    if (onProductSelect) {
      onProductSelect(product)
    }
  }

  return (
    <div className="card-grid">
      {products.map((product, index) => {
        const categoryHint = product.category || product.subcategory
        const imageUrl = getImageUrl(product.image, categoryHint)
        
        return (
          <div 
            key={index} 
            className="product-card" 
            onClick={(e) => handleProductClick(e, product)}
            role="button"
            tabIndex={0}
            style={{ cursor: 'pointer', position: 'relative', zIndex: 1 }}
          >
            <div className="card-image">
              {imageUrl ? (
                <img 
                  src={imageUrl} 
                  alt={product.name}
                  onError={(e) => {
                    e.target.style.display = 'none'
                    e.target.parentElement.innerHTML = '<div class="no-image">📦</div>'
                  }}
                />
              ) : (
                <div className="no-image">📦</div>
              )}
            </div>
            <div className="card-info">
              <h3>{product.name}</h3>
              {product.subcategory && (
                <p className="card-subtitle">{product.subcategory}</p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default ProductGallery