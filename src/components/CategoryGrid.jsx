import React from 'react'

const R2_BASE = 'https://assist-token-magnum.gurkan-ture.workers.dev/GORSELLER/category'

const CATEGORIES = [
  {
    id: 1,
    name: 'DONDURMA MAKİNELERİ',
    nameEN: 'ICE CREAM MACHINES',
    icon: '🍦',
    source: 'dondurma.json',
    isDondurma: true,
    image: `${R2_BASE}/dondurma.png`
  },
  {
    id: 2,
    name: 'FIRINLAR',
    nameEN: 'OVENS',
    icon: '🔥',
    source: 'mutfak.json',
    image: `${R2_BASE}/oven.png`
  },
  {
    id: 3,
    name: 'PİŞİRİCİLER',
    nameEN: 'COOKING',
    icon: '🍳',
    source: 'mutfak.json',
    image: `${R2_BASE}/cooking.png`
  },
  {
    id: 4,
    name: 'SOĞUTMA',
    nameEN: 'COOLING',
    icon: '❄️',
    source: 'mutfak.json',
    image: `${R2_BASE}/refrigerator.png`
  },
  {
    id: 5,
    name: 'BULAŞIK MAKİNELERİ',
    nameEN: 'DISHWASHERS',
    icon: '💧',
    source: 'mutfak.json',
    image: `${R2_BASE}/dishwasher.png`
  }
]

function CategoryGrid({ onCategorySelect, language = 'TR' }) {
  const isEN = language === 'EN'

  return (
    <div className="category-grid">
      {CATEGORIES.map(category => (
        <div
          key={category.id}
          className="category-card"
          onClick={() => onCategorySelect(category)}
        >
          <div className="category-arrow"></div>
          <div className="category-image">
            <img src={category.image} alt={category.name} />
          </div>
          <div className="category-name">
            {isEN ? category.nameEN : category.name}
          </div>
        </div>
      ))}
    </div>
  )
}

export default CategoryGrid
