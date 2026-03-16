import React from 'react'
import './ProductCard.css'

// R2 veya mevcut site URL'i (deploy sonrası güncellenecek)
const IMAGE_BASE_URL = import.meta.env.VITE_IMAGE_URL || 'https://www.crystal.com.tr/'

function ProductCard({ product, onClick }) {
  const imageUrl = product.image 
    ? `${IMAGE_BASE_URL}${product.image}` 
    : '/placeholder-product.png'

  const handleImageError = (e) => {
    e.target.src = '/placeholder-product.png'
    e.target.style.objectFit = 'contain'
  }

  return (
    <div className="product-card" onClick={onClick}>
      {/* Image */}
      <div className="product-image">
        <img 
          src={imageUrl} 
          alt={product.name}
          onError={handleImageError}
          loading="lazy"
        />
        {product.models && product.models.length > 0 && (
          <div className="model-badge">
            {product.models.length} Model
          </div>
        )}
      </div>

      {/* Content */}
      <div className="product-content">
        <h4 className="product-name">{product.name}</h4>
        
        {product.subcategory && (
          <p className="product-category">
            {product.subcategory}
          </p>
        )}

        {/* Quick specs */}
        {product.models && product.models.length > 0 && product.models[0].model && (
          <div className="quick-specs">
            {product.models[0].model.slice(0, 2).map((spec, index) => (
              <span key={index} className="spec-item">
                {spec.value}
              </span>
            ))}
          </div>
        )}

        <button className="btn-detail">
          Detayları Gör →
        </button>
      </div>
    </div>
  )
}

export default ProductCard
