import React from 'react';
import './styles.css';

const LowStockItems = ({ items = [], selectedItem, onSelect }) => {
  return (
    <section className="reorder-panel">
      <div className="reorder-panel-heading">
        <div>
          <h2>Low stock items</h2>
          <p>Select an item to send a replenishment request to SuperAdmin.</p>
        </div>
        <span className="reorder-count">{items.length}</span>
      </div>
      {items.length === 0 ? (
        <div className="reorder-empty">No products are below their reorder threshold for your branch.</div>
      ) : (
        <div className="reorder-item-list">
          {items.map((item) => {
            const selected = String(selectedItem?.id) === String(item.id);
            const stock = Number(item.stock || 0);
            const threshold = Number(item.threshold || 0);
            return (
              <button key={item.id} type="button" className={`reorder-item ${selected ? 'is-selected' : ''}`} onClick={() => onSelect(item)}>
                <span className="reorder-item-main"><strong>{item.name}</strong><small>{item.sku || item.brand || 'Product'}</small></span>
                <span className={`reorder-stock ${stock === 0 ? 'is-zero' : ''}`}>{stock} in stock</span>
                <small>Reorder level: {threshold}</small>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default LowStockItems;
