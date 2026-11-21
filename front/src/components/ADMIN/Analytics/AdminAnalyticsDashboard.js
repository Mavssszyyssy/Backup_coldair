import SearchableSelect from "../../common/SearchableSelect";
import { useCallback, useEffect, useMemo, useState } from 'react';
import AdminLayout from '../Common/AdminLayout';
import { apiRequest } from '../../../config/api';
import icons from '../../common/icons';
import './styles.css';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const formatBucketLabel = (bucket, interval) => {
  const date = new Date(bucket);
  if (Number.isNaN(date.getTime())) return String(bucket || '');
  if (interval === 'weekly') {
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }
  if (interval === 'monthly') {
    return date.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
  }
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const computeDateRange = (days) => {
  const to = new Date();
  const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return { from, to };
};

const UnitsSoldChart = ({ series = [], interval = 'daily' }) => {
  const max = Math.max(...series.map((item) => Number(item.unitsSold) || 0), 1);
  return (
    <div className="admin-analytics-card">
      <div className="admin-analytics-card-head">
        <h3>
          <img src={icons.clipboardList} alt="" className="inline-icon inline-icon--md" />
          Units sold ({interval})
        </h3>
      </div>
      <div className="admin-analytics-chart">
        {series.length === 0 ? (
          <div className="admin-analytics-empty">No sales data for this range.</div>
        ) : (
          <div className="admin-analytics-bars">
            {series.map((item) => {
              const units = Number(item.unitsSold) || 0;
              const heightPercentage = (units / max) * 100;
              const label = formatBucketLabel(item.bucket, interval);
              return (
                <div key={String(item.bucket)} className="admin-analytics-bar-wrap" title={`${label}: ${units} units`}>
                  <div className="admin-analytics-bar" style={{ height: `${heightPercentage}%` }} />
                  <span className="admin-analytics-bar-label">{label}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

const TopProducts = ({ products = [] }) => (
  <div className="admin-analytics-card">
    <div className="admin-analytics-card-head">
      <h3>
        <img src={icons.boxOpen} alt="" className="inline-icon inline-icon--md" />
        Top-selling products
      </h3>
    </div>
    {products.length === 0 ? (
      <div className="admin-analytics-empty">No product sales yet.</div>
    ) : (
      <div className="admin-analytics-top-products">
        {products.slice(0, 10).map((product, index) => (
          <div key={`${product.productId || product.name}-${index}`} className="admin-analytics-top-product">
            <div className="admin-analytics-top-rank">#{index + 1}</div>
            <div className="admin-analytics-top-main">
              <div className="admin-analytics-top-name">{product.name || 'Unnamed product'}</div>
              <div className="admin-analytics-top-sub">
                <span>{Number(product.unitsSold || 0)} units</span>
                <span className="admin-analytics-dot">•</span>
                <span>₱{Number(product.revenue || 0).toLocaleString()}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);

function AdminAnalyticsDashboard() {
  const [interval, setInterval] = useState('daily');
  const [rangeDays, setRangeDays] = useState(30);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [report, setReport] = useState({ series: [], topProducts: [], updatedAt: '' });

  const { from, to } = useMemo(() => computeDateRange(rangeDays), [rangeDays]);

  const loadReport = useCallback(async () => {
    setBusy(true);
    setError('');
    const showReport = (response) => {
      setReport({
        series: Array.isArray(response.series) ? response.series : [],
        topProducts: Array.isArray(response.topProducts) ? response.topProducts : [],
        updatedAt: response.updatedAt || new Date().toISOString(),
      });
      setBusy(false);
    };
    try {
      const response = await apiRequest(
        `/reports/sales?interval=${encodeURIComponent(interval)}&from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}&topN=10`, { onCached: showReport }
      );
      showReport(response);
    } catch (e) {
      setError(e?.message || 'Failed to load analytics.');
    } finally {
      setBusy(false);
    }
  }, [interval, from, to]);

  useEffect(() => {
    loadReport();
    const pollId = window.setInterval(loadReport, 10000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') loadReport();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(pollId);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [loadReport]);

  return (
    <AdminLayout title="Analytics Dashboard" subtitle="Track units sold and top products in real time">
      <div className="admin-analytics">
        <div className="admin-analytics-toolbar">
          <div className="admin-analytics-controls">
            <label className="admin-analytics-label">
              Interval
              <SearchableSelect value={interval} onChange={(e) => setInterval(e.target.value)} className="admin-analytics-select">
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </SearchableSelect>
            </label>

            <label className="admin-analytics-label">
              Range
              <SearchableSelect
                value={rangeDays}
                onChange={(e) => setRangeDays(clamp(Number(e.target.value) || 30, 7, 365))}
                className="admin-analytics-select"
              >
                <option value={7}>Last 7 days</option>
                <option value={30}>Last 30 days</option>
                <option value={90}>Last 90 days</option>
                <option value={180}>Last 180 days</option>
              </SearchableSelect>
            </label>
          </div>

          <div className="admin-analytics-meta">
            {busy ? <span className="admin-analytics-pill">Updating…</span> : null}
            {report.updatedAt ? (
              <span className="admin-analytics-pill">
                Updated {new Date(report.updatedAt).toLocaleTimeString()}
              </span>
            ) : null}
          </div>
        </div>

        {error ? (
          <div className="admin-analytics-error">{error}</div>
        ) : null}

        <div className="admin-analytics-grid">
          <UnitsSoldChart series={report.series} interval={interval} />
          <TopProducts products={report.topProducts} />
        </div>
      </div>
    </AdminLayout>
  );
}

export default AdminAnalyticsDashboard;

