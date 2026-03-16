import React from 'react'
import './CategoryGrid.css'

const CATEGORIES = [
  {
    id: 1,
    name: 'SOĞUTMA',
    icon: '❄️',
    color: '#4a9eff',
    description: 'Buzdolapları, dondurucular ve soğutma sistemleri',
    source: 'mutfak.json',
    image: 'https://www.crystal.com.tr/wp-content/uploads/2021/10/green-line-single-door-refrigerator.jpg'
  },
  {
    id: 2,
    name: 'DONDURMA MAKİNELERİ',
    icon: '🍦',
    color: '#ff6b9d',
    description: 'Soft dondurma, sert dondurma ve teşhir vitrinleri',
    source: 'dondurma.json',
    isDondurma: true, // Özel flag - dondurma.json farklı yapıda
    image: 'https://www.crystal.com.tr/wp-content/uploads/elementor/thumbs/nova-12-qj3nhbm5kdrj3axm8vhwdqrx1sxz4pvn9zlr66c59s.webp'
  },
  {
    id: 3,
    name: 'FIRINLAR',
    icon: '🔥',
    color: '#ff9500',
    description: 'Kombi, konveksiyonlu ve pastane fırınları',
    source: 'mutfak.json',
    image: 'https://www.crystal.com.tr/wp-content/uploads/2021/10/CCS-102.jpg'
  },
  {
    id: 4,
    name: 'PİŞİRİCİLER',
    icon: '🍳',
    color: '#34c759',
    description: '700, 900 serisi ve snack pişiricileri',
    source: 'mutfak.json',
    image: 'https://www.crystal.com.tr/wp-content/uploads/2021/10/700-series-cookers.jpg'
  },
  {
    id: 5,
    name: 'BULAŞIK MAKİNELERİ',
    icon: '💧',
    color: '#5ac8fa',
    description: 'Bardak, set altı ve konveyörlü yıkama',
    source: 'mutfak.json',
    image: 'https://www.crystal.com.tr/wp-content/uploads/2021/10/glass-washing-machine.jpg'
  }
]

function CategoryGrid({ onCategorySelect }) {
  return (
    <div className="category-grid">
      {CATEGORIES.map(category => (
        <div
          key={category.id}
          className="category-card"
          onClick={() => onCategorySelect(category)}
          style={{ 
            '--category-color': category.color,
            backgroundImage: `url(${category.image})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        >
          <div className="category-image-overlay"></div>
          <div className="category-content-wrapper">
            <div className="category-icon">{category.icon}</div>
            <h3 className="category-name">{category.name}</h3>
            <p className="category-description">{category.description}</p>
            <div className="category-arrow">→</div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default CategoryGrid
