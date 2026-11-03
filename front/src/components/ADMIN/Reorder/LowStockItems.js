import React, { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { formatCartHorsepower } from '../../../domain/cart/cartProductDetails';
import { useUser } from '../../../context/UserContext';
import { translateText } from '../../../utils/customerI18n';
import './styles.css';

const LOW_STOCK_PAGE_SIZE = 6;

const LowStockItems = ({ items = [], selectedItem, onSelect }) => {
  const { currentLanguage } = useUser();
  const t = (value) => translateText(value, currentLanguage);
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / LOW_STOCK_PAGE_SIZE));
  const itemIdentity = items.map((item) => String(item.id)).join("\u001f");
  const pageItems = useMemo(() => items.slice((page - 1) * LOW_STOCK_PAGE_SIZE, page * LOW_STOCK_PAGE_SIZE), [items, page]);

  useLayoutEffect(() => { setPage(1); }, [itemIdentity]);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);

  return (
    <section className="reorder-panel">
      <div className="reorder-panel-heading">
        <div>
          <h2>{t('Low stock items')}</h2>
          <p>{t('Select an item to send a replenishment request to SuperAdmin.')}</p>
        </div>
        <span className="reorder-count">{items.length}</span>
      </div>
      {items.length === 0 ? (
        <div className="reorder-empty">{t('No products are below their reorder threshold for your branch.')}</div>
      ) : (
        <div className="reorder-item-list">
          {pageItems.map((item) => {
            const selected = String(selectedItem?.id) === String(item.id);
            const stock = Number(item.stock || 0);
            const threshold = Number(item.threshold || 0);
            return (
              <button key={item.id} type="button" className={`reorder-item ${selected ? 'is-selected' : ''}`} onClick={() => onSelect(item)}>
                <span className="reorder-item-main"><strong>{item.name}</strong><small>{item.sku || item.brand || t('Product')} · {formatCartHorsepower(item)}</small></span>
                <span className={`reorder-stock ${stock === 0 ? 'is-zero' : ''}`}>{stock} {t('in stock')}</span>
                <small>{t('Reorder level')}: {threshold}</small>
              </button>
            );
          })}
        </div>
      )}
      {items.length > LOW_STOCK_PAGE_SIZE ? <nav className="reorder-pagination" aria-label={t('Low stock items pagination')}>
        <span>{t('Showing')} {(page - 1) * LOW_STOCK_PAGE_SIZE + 1}–{Math.min(page * LOW_STOCK_PAGE_SIZE, items.length)} {t('of')} {items.length}</span>
        <div><button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1}>{t('Previous')}</button><span>{t('Page')} {page} {t('of')} {totalPages}</span><button type="button" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page === totalPages}>{t('Next')}</button></div>
      </nav> : null}
    </section>
  );
};

export default LowStockItems;
