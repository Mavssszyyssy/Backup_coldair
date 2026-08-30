import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { getBrandLogo } from '../../config/brandLogos';
import icons from '../common/icons';

function BrandsSection({ brands: externalBrands }) {
  const navigate = useNavigate();
  const [hoveredBrand, setHoveredBrand] = useState(null);
  const [failedImages, setFailedImages] = useState({});

  // Brand data with image URLs - Your actual logo links preserved
  const brands = externalBrands || [
    { 
      id: 1, 
      name: 'Midea', 
      iconSrc: icons.temperatureFrigid,
      logoUrl: getBrandLogo('Midea'),
      description: 'Premium AC Solutions'
    },
    { 
      id: 2, 
      name: 'TCL', 
      iconSrc: icons.wind,
      logoUrl: getBrandLogo('TCL'),
      description: 'Smart Air Conditioning'
    },
    { 
      id: 3, 
      name: 'Aux', 
      iconSrc: icons.tools,
      logoUrl: getBrandLogo('Aux'),
      description: 'Energy Efficient'
    },
    { 
      id: 4, 
      name: 'Samsung', 
      iconSrc: icons.customize,
      logoUrl: getBrandLogo('Samsung'),
      description: 'Innovation Technology'
    },
    { 
      id: 5, 
      name: 'Daikin', 
      iconSrc: icons.checkCircle,
      logoUrl: getBrandLogo('Daikin'),
      description: 'World Leader in AC'
    },
    { 
      id: 6, 
      name: 'Carrier', 
      iconSrc: icons.wind,
      logoUrl: getBrandLogo('Carrier'),
      description: 'Inventor of AC'
    },
    { 
      id: 7, 
      name: 'LG', 
      iconSrc: icons.bolt,
      logoUrl: getBrandLogo('LG'),
      description: 'Life\'s Good'
    },
    { 
      id: 8, 
      name: 'American Home', 
      iconSrc: icons.houseChimney,
      logoUrl: getBrandLogo('American Home'),
      description: 'Home Comfort Solutions'
    },
    { 
      id: 9, 
      name: 'Gree', 
      iconSrc: icons.wind,
      logoUrl: getBrandLogo('Gree'),
      description: 'Eco-Friendly Cooling'
    },
  ];

  // Handler for when image fails to load
  const handleImageError = (brandId) => {
    setFailedImages(prev => ({ ...prev, [brandId]: true }));
  };

  // Handler for shop brand navigation
  const handleShopBrand = (brandName) => {
    navigate(`/shop?brand=${encodeURIComponent(brandName)}`);
  };

  return (
    <section className="brands-section">
      {/* Section Header */}
      <div className="section-header">
        <h2 className="section-title">Explore Our Brands</h2>
        <button 
          className="see-all"
          onClick={() => navigate('/shop')}
        >
          View All →
        </button>
      </div>
      
      {/* Brands Grid */}
      <div className="brands-grid">
        {brands.map((brand) => (
          <div 
            key={brand.id} 
            className={`brand-container ${hoveredBrand === brand.id ? 'hovered' : ''}`}
            onMouseEnter={() => setHoveredBrand(brand.id)}
            onMouseLeave={() => setHoveredBrand(null)}
            onClick={() => handleShopBrand(brand.name)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                handleShopBrand(brand.name);
              }
            }}
            role="button"
            tabIndex={0}
            aria-label={`${brand.name} brand card`}
          >
            {/* Brand Card */}
            <div className="brand-card">
              {/* Brand Logo - Shows image if available, falls back to emoji */}
              <div className="brand-logo-wrapper">
                {!failedImages[brand.id] && brand.logoUrl ? (
                  <img 
                    src={brand.logoUrl} 
                    alt={`${brand.name} logo`}
                    loading="lazy"
                    decoding="async"
                    className="brand-logo-img"
                    onError={() => handleImageError(brand.id)}
                  />
                ) : (
                  <div className="brand-logo-emoji" aria-hidden="true">
                    <img src={brand.iconSrc} alt="" className="inline-icon inline-icon--xl" />
                  </div>
                )}
              </div>

              {/* Brand Info */}
              <h3 className="brand-name">{brand.name}</h3>
              <p className="brand-description">{brand.description}</p>
            </div>

            {/* Shop Button - Appears on hover */}
            <button 
              className={`shop-brand-btn ${hoveredBrand === brand.id ? 'visible' : ''}`}
              onClick={(event) => {
                event.stopPropagation();
                handleShopBrand(brand.name);
              }}
              aria-label={`Shop ${brand.name} air conditioners`}
            >
              Shop {brand.name}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

export default BrandsSection;
