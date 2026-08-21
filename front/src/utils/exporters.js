const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const escapeXml = escapeHtml;

const humanizeLabel = (value = '') => String(value)
  .replace(/([a-z])([A-Z])/g, '$1 $2')
  .replace(/[_-]+/g, ' ')
  .replace(/\b\w/g, (letter) => letter.toUpperCase());

const isCurrencyField = (label = '') => {
  const key = String(label).toLowerCase();
  return /(sales|revenue|value|amount|price|fee|cost)/.test(key) && !/(count|stock|unit|order|minute)/.test(key);
};

const toSpreadsheetCell = (value, label = '') => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const style = isCurrencyField(label) ? 'currency' : 'number';
    return `<Cell ss:StyleID="${style}"><Data ss:Type="Number">${value}</Data></Cell>`;
  }
  return `<Cell><Data ss:Type="String">${escapeXml(value)}</Data></Cell>`;
};

export const formatReportValue = (value, label = '') => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return String(value ?? '—');
  if (isCurrencyField(label)) {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }
  return value.toLocaleString('en-PH', { maximumFractionDigits: 2 });
};

export const exportToExcel = ({ filename, title = 'AeroPulse Report', summary = {}, rows = [], metadata = {} }) => {
  const normalizedRows = Array.isArray(rows) ? rows : [];
  const headers = normalizedRows.length ? Object.keys(normalizedRows[0]) : [];
  const metadataRows = [
    ['Branch', metadata.branch],
    ['Prepared by', metadata.representative],
    ['Representative role', metadata.representativeRole],
    ['Reporting period', metadata.reportingPeriod],
    ['Report ID', metadata.reportId],
  ].filter(([, value]) => value);
  const columnCount = Math.max(2, headers.length || 2);
  const mergedColumns = columnCount - 1;
  const metadataMerge = mergedColumns > 1 ? ` ss:MergeAcross="${mergedColumns - 1}"` : '';
  const summaryRows = Object.entries(summary || {})
    .map(([key, value]) => `<Row><Cell ss:StyleID="label"><Data ss:Type="String">${escapeXml(humanizeLabel(key))}</Data></Cell>${toSpreadsheetCell(value, key)}</Row>`)
    .join('');
  const reportMetadataRows = metadataRows
    .map(([label, value]) => `<Row><Cell ss:StyleID="label"><Data ss:Type="String">${escapeXml(label)}</Data></Cell><Cell${metadataMerge}><Data ss:Type="String">${escapeXml(value)}</Data></Cell></Row>`)
    .join('');
  const headerCells = headers.map((header) => `<Cell ss:StyleID="header"><Data ss:Type="String">${escapeXml(humanizeLabel(header))}</Data></Cell>`).join('');
  const dataRows = normalizedRows.map((row) => `<Row>${headers.map((header) => toSpreadsheetCell(row[header], header)).join('')}</Row>`).join('');
  const columns = Array.from({ length: columnCount }, () => '<Column ss:Width="155"/>').join('');
  const spreadsheet = `<?xml version="1.0"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Styles>
    <Style ss:ID="Default" ss:Name="Normal"><Alignment ss:Vertical="Center"/><Font ss:FontName="Arial" ss:Size="10"/></Style>
    <Style ss:ID="title"><Font ss:FontName="Arial" ss:Size="16" ss:Bold="1" ss:Color="#0F172A"/><Alignment ss:Vertical="Center"/></Style>
    <Style ss:ID="subtitle"><Font ss:FontName="Arial" ss:Size="10" ss:Color="#475569"/></Style>
    <Style ss:ID="header"><Font ss:FontName="Arial" ss:Size="10" ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#0F4C81" ss:Pattern="Solid"/><Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/></Style>
    <Style ss:ID="label"><Font ss:Bold="1" ss:Color="#0F172A"/><Interior ss:Color="#E8F0F8" ss:Pattern="Solid"/></Style>
    <Style ss:ID="number"><NumberFormat ss:Format="#,##0.00"/><Alignment ss:Horizontal="Right"/></Style>
    <Style ss:ID="currency"><NumberFormat ss:Format="&quot;₱&quot;#,##0.00"/><Alignment ss:Horizontal="Right"/></Style>
  </Styles>
  <Worksheet ss:Name="Report"><Table>
    ${columns}
    <Row ss:Height="25"><Cell ss:StyleID="title" ss:MergeAcross="${mergedColumns}"><Data ss:Type="String">${escapeXml(title)}</Data></Cell></Row>
    <Row><Cell ss:StyleID="subtitle" ss:MergeAcross="${mergedColumns}"><Data ss:Type="String">Generated ${escapeXml(metadata.generatedAt || new Date().toLocaleString())}</Data></Cell></Row>
    ${reportMetadataRows}
    <Row/>
    ${summaryRows ? `<Row><Cell ss:StyleID="header" ss:MergeAcross="${mergedColumns}"><Data ss:Type="String">REPORT SUMMARY</Data></Cell></Row>${summaryRows}<Row/>` : ''}
    ${headers.length ? `<Row>${headerCells}</Row>` : ''}
    ${dataRows}
  </Table></Worksheet>
</Workbook>`;
  downloadBlob(new Blob([spreadsheet], { type: 'application/vnd.ms-excel;charset=utf-8' }), filename || 'aeropulse-report.xls');
};

export const exportToCsv = ({ filename, rows }) => {
  const safe = (value) => {
    const s = String(value ?? '');
    if (s.includes('"') || s.includes(',') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const normalizedRows = Array.isArray(rows) ? rows : [];
  const headers = normalizedRows.length ? Object.keys(normalizedRows[0]) : [];
  const lines = [
    headers.map(safe).join(','),
    ...normalizedRows.map((row) => headers.map((h) => safe(row[h])).join(',')),
  ];

  downloadBlob(new Blob([`\uFEFF${lines.join('\n')}`], { type: 'text/csv;charset=utf-8' }), filename || 'report.csv');
};

export const exportHtmlToPdfViaPrint = ({ title, html, subtitle = '', fileName = '', metadata = {} }) => {
  const w = window.open('', '_blank');
  if (!w) {
    window.alert('Your browser blocked the PDF window. Please allow pop-ups for this site and try again.');
    return false;
  }
  w.opener = null;
  w.document.open();
  w.document.write(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(fileName || title || 'Report')}</title>
    <style>
      @page { size: A4 landscape; margin: 16mm; }
      * { box-sizing: border-box; }
      body { font-family: Arial, Helvetica, sans-serif; margin: 0; color: #172033; font-size: 11px; }
      .report-header { border-bottom: 3px solid #0f4c81; padding-bottom: 14px; margin-bottom: 18px; display: flex; justify-content: space-between; gap: 20px; }
      .brand { color: #0f4c81; font-size: 18px; font-weight: 800; letter-spacing: .04em; text-transform: uppercase; }
      .brand span { display: block; color: #64748b; font-size: 9px; letter-spacing: .12em; margin-top: 3px; }
      h1 { margin: 0; color: #0f172a; font-size: 20px; }
      .subtitle, .generated { color: #64748b; margin-top: 5px; }
      .generated { text-align: right; font-size: 10px; }
      .summary { display: flex; flex-wrap: wrap; gap: 8px; margin: 0 0 16px; }
      .summary-item { background: #f1f5f9; border-left: 3px solid #0f4c81; padding: 7px 10px; min-width: 150px; }
      .summary-item strong { display: block; color: #0f172a; font-size: 12px; }
      .summary-item span { color: #64748b; font-size: 9px; text-transform: uppercase; }
      table { width: 100%; border-collapse: collapse; margin-top: 10px; }
      th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; vertical-align: top; }
      th { background: #0f4c81; color: #fff; font-size: 10px; text-transform: uppercase; letter-spacing: .03em; }
      tbody tr:nth-child(even) { background: #f8fafc; }
      .meta { color: #475569; font-size: 10px; margin: 0 0 12px; }
      .report-watermark { position: fixed; top: 43%; left: 8%; right: 8%; transform: rotate(-28deg); text-align: center; font-size: 74px; font-weight: 800; letter-spacing: .12em; color: rgba(15, 76, 129, .055); pointer-events: none; z-index: -1; }
      .signature-section { margin: 28px 0 32px; display: flex; justify-content: flex-end; page-break-inside: avoid; }
      .signature-card { width: 280px; border-top: 1px solid #64748b; padding-top: 8px; text-align: center; color: #334155; }
      .signature-card strong { display: block; color: #0f172a; font-size: 12px; }
      .signature-card span { display: block; color: #64748b; font-size: 10px; margin-top: 3px; }
      .report-footer { position: fixed; bottom: 0; left: 0; right: 0; color: #64748b; font-size: 9px; border-top: 1px solid #cbd5e1; padding-top: 5px; display: flex; justify-content: space-between; gap: 12px; }
      @media print { .report-footer { position: fixed; } }
    </style>
  </head>
  <body>
    <div class="report-watermark">${escapeHtml(metadata.watermark || 'AEROPULSE')}</div>
    <header class="report-header"><div><div class="brand">AeroPulse <span>Airconditioning Trading</span></div></div><div class="generated">${metadata.reportId ? `Report ID: ${escapeHtml(metadata.reportId)}<br/>` : ''}${metadata.branch ? `Branch: ${escapeHtml(metadata.branch)}<br/>` : ''}Generated: ${escapeHtml(metadata.generatedAt || new Date().toLocaleString())}</div></header>
    <section><h1>${escapeHtml(title || 'Report')}</h1>${subtitle ? `<p class="subtitle">${escapeHtml(subtitle)}</p>` : ''}</section>
    ${html || ''}
    ${metadata.representative ? `<section class="signature-section"><div class="signature-card"><strong>${escapeHtml(metadata.representative)}</strong><span>${escapeHtml(metadata.representativeRole || 'Authorized Representative')}</span><span>${escapeHtml(metadata.branch ? `${metadata.branch} Branch` : 'AEROPULSE')}</span></div></section>` : ''}
    <footer class="report-footer"><span>${escapeHtml(metadata.branch ? `Branch: ${metadata.branch}` : 'AEROPULSE confidential business report')} · ${escapeHtml(metadata.reportType || title || 'Report')}</span><span>${escapeHtml(metadata.reportId ? `Report ID: ${metadata.reportId} · ` : '')}${escapeHtml(metadata.generatedAt ? `Generated: ${metadata.generatedAt} · ` : '')}${escapeHtml(metadata.systemName || 'AEROPULSE')}</span></footer>
  </body>
</html>`);
  w.onload = () => {
    w.focus();
    w.print();
  };
  w.document.close();
  return true;
};

