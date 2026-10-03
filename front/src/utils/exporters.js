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
  return /(sales|revenue|value|amount|price|fee|cost|subtotal|discount)/.test(key) || /^(vat|total)$/.test(key);
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
    ['Company', metadata.companyName || metadata.name],
    ['Company address', metadata.address],
    ['Proprietor', metadata.proprietor],
    ['Contact', metadata.contact],
    ['Tax registration', metadata.taxRegistration],
    ['Branch', metadata.branch],
    ['Prepared by', metadata.representative],
    ['Representative role', metadata.representativeRole],
    ['Reporting period', metadata.reportingPeriod],
    ['Applied filters', metadata.filters],
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
  const pageOrientation = metadata.pageOrientation === 'portrait' ? 'portrait' : 'landscape';
  const documentStyle = metadata.documentStyle === 'narrative'
    ? ' report-document--narrative'
    : metadata.documentStyle === 'tabular' ? ' report-document--tabular' : '';
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
      @page { size: A4 ${pageOrientation}; margin: 14mm 14mm 18mm; }
      * { box-sizing: border-box; }
      html { background: #eef2f7; }
      body { margin: 0; padding: 28px; background: #eef2f7; color: #172033; font-family: Arial, Helvetica, sans-serif; font-size: 11px; line-height: 1.48; }
      .report-document { width: min(100%, ${pageOrientation === 'portrait' ? '900px' : '1200px'}); min-height: 1120px; margin: 0 auto; padding: 32px 36px 28px; background: #fff; box-shadow: 0 18px 48px rgba(15, 23, 42, .14); }
      .report-document--narrative { max-width: 860px; }
      .report-header { border-bottom: 3px solid #0f4c81; padding-bottom: 14px; margin-bottom: 20px; display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; }
      .company-block { display: flex; align-items: center; gap: 12px; min-width: 0; }
      .company-logo { width: 58px; height: 58px; object-fit: contain; border-radius: 50%; }
      .brand { color: #0f172a; font-size: 18px; font-weight: 800; letter-spacing: .025em; text-transform: uppercase; }
      .brand span { display: block; color: #0f4c81; font-size: 9px; letter-spacing: .11em; margin-top: 3px; }
      .company-details { color: #475569; font-size: 8px; line-height: 1.45; margin-top: 4px; max-width: 520px; }
      .generated { flex: 0 0 235px; color: #475569; text-align: right; font-size: 9px; line-height: 1.55; overflow-wrap: anywhere; }
      .report-title { margin-bottom: 18px; }
      h1 { margin: 0; color: #0f172a; font-size: 23px; line-height: 1.2; }
      h2 { margin: 0 0 9px; color: #0f172a; font-size: 14px; line-height: 1.25; }
      h3 { margin: 13px 0 7px; color: #1e3a5f; font-size: 12px; }
      p { margin: 0 0 8px; }
      ul, ol { margin: 6px 0 9px; padding-left: 19px; }
      li { margin: 0 0 4px; }
      .subtitle { color: #64748b; margin: 6px 0 0; font-size: 10px; overflow-wrap: anywhere; }
      .summary { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; margin: 0 0 14px; }
      .summary-item { min-width: 0; padding: 10px 11px; border: 1px solid #d7e1ec; border-top: 3px solid #0f4c81; background: #f8fafc; }
      .summary-item strong { display: block; color: #0f172a; font-size: 12px; line-height: 1.25; overflow-wrap: anywhere; }
      .summary-item span { display: block; margin-top: 4px; color: #64748b; font-size: 8px; font-weight: 700; letter-spacing: .05em; text-transform: uppercase; }
      .report-section { margin: 0 0 12px; padding: 13px 14px; border: 1px solid #d7e1ec; border-radius: 4px; background: #fff; break-inside: avoid; page-break-inside: avoid; }
      .report-section--accent { border-left: 4px solid #0f4c81; background: #f8fbff; }
      .report-section--muted { background: #f8fafc; }
      .report-section--splittable { break-inside: auto; page-break-inside: auto; }
      .report-section-heading { margin: -13px -14px 12px; padding: 9px 14px; border-bottom: 1px solid #d7e1ec; background: #f3f6fa; color: #1e3a5f; font-size: 10px; font-weight: 800; letter-spacing: .05em; text-transform: uppercase; }
      .report-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 18px; }
      .report-field { padding: 7px 0; border-bottom: 1px solid #e6ebf1; }
      .report-field span { display: block; margin-bottom: 2px; color: #64748b; font-size: 8px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; }
      .report-field strong { display: block; color: #0f172a; font-size: 10px; overflow-wrap: anywhere; }
      .report-callout { margin: 9px 0 0; padding: 9px 11px; border-left: 3px solid #60a5fa; background: #eff6ff; color: #334155; }
      .report-subsection { break-inside: avoid; page-break-inside: avoid; }
      .history-list { display: grid; gap: 8px; }
      .history-entry { padding: 10px 11px; border: 1px solid #d7e1ec; border-radius: 4px; break-inside: avoid; page-break-inside: avoid; }
      .history-entry-header { display: flex; justify-content: space-between; gap: 12px; margin-bottom: 6px; padding-bottom: 6px; border-bottom: 1px solid #e6ebf1; }
      .history-entry-header strong { color: #0f4c81; }
      .history-entry-header span { color: #475569; font-weight: 700; }
      .history-entry p { color: #475569; }
      .history-entry p:last-child { margin-bottom: 0; }
      table { width: 100%; border-collapse: collapse; margin-top: 9px; font-size: 9px; }
      thead { display: table-header-group; }
      th, td { border: 1px solid #cbd5e1; padding: 7px; text-align: left; vertical-align: top; overflow-wrap: break-word; word-break: normal; }
      th { background: #0f4c81; color: #fff; font-size: 8px; letter-spacing: .035em; text-transform: uppercase; }
      .table-title { color: #0f172a; font-size: 14px; margin: 16px 0 6px; }
      tbody tr:nth-child(even) { background: #f8fafc; }
      tr { break-inside: avoid; page-break-inside: avoid; }
      .report-document--tabular .summary { grid-template-columns: repeat(4, minmax(0, 1fr)); }
      .report-document--tabular .summary-item { padding: 8px 9px; }
      .report-page--sales .table-title { margin: 9px 0 5px; font-size: 11px; }
      .report-page--sales .report-table { margin-top: 0; }
      .report-table--operations, .report-table--financial { table-layout: fixed; font-size: 8px; }
      .report-table--operations th, .report-table--operations td,
      .report-table--financial th, .report-table--financial td { padding: 4px 5px; line-height: 1.3; }
      .report-table--operations td { overflow-wrap: anywhere; }
      .report-table--financial th, .report-table--financial td { text-align: right; white-space: nowrap; }
      .report-table--financial th:first-child, .report-table--financial td:first-child { text-align: left; white-space: normal; overflow-wrap: anywhere; }
      .report-table--products { font-size: 8.5px; }
      .report-page { break-after: page; page-break-after: always; }
      .report-page:last-child { break-after: auto; page-break-after: auto; }
      .report-page-heading { display: flex; justify-content: space-between; gap: 14px; margin: 14px 0 4px; padding-bottom: 6px; border-bottom: 1px solid #cbd5e1; color: #475569; font-size: 10px; text-transform: uppercase; letter-spacing: .04em; }
      .meta { color: #64748b; font-size: 9px; margin: 9px 0 0; }
      .report-watermark { position: fixed; top: 43%; left: 8%; right: 8%; transform: rotate(-28deg); text-align: center; font-size: 68px; font-weight: 800; letter-spacing: .12em; color: rgba(15, 76, 129, .035); pointer-events: none; z-index: 0; }
      .report-content, .report-header, .report-title, .signature-section, .report-footer { position: relative; z-index: 1; }
      .signature-section { margin: 28px 0 32px; display: flex; justify-content: flex-end; page-break-inside: avoid; }
      .signature-card { width: 280px; border-top: 1px solid #64748b; padding-top: 8px; text-align: center; color: #334155; }
      .signature-card strong { display: block; color: #0f172a; font-size: 12px; }
      .signature-card span { display: block; color: #64748b; font-size: 10px; margin-top: 3px; }
      .report-footer { margin-top: 24px; color: #64748b; font-size: 8px; border-top: 1px solid #cbd5e1; padding-top: 6px; display: flex; justify-content: space-between; gap: 12px; }
      @media (max-width: 700px) {
        body { padding: 0; }
        .report-document { min-height: 100vh; padding: 22px 18px; box-shadow: none; }
        .report-header { flex-direction: column; }
        .generated { flex-basis: auto; text-align: left; }
        .summary, .report-grid { grid-template-columns: 1fr; }
      }
      @media print {
        html, body { background: #fff; }
        body { padding: 0; font-size: 10px; }
        .report-document, .report-document--narrative { width: auto; max-width: none; min-height: 0; margin: 0; padding: 0; box-shadow: none; }
        .report-document--tabular { width: auto; max-width: none; min-height: 0; margin: 0; padding: 0; box-shadow: none; }
        .report-footer { position: static; margin: 18px 0 0; break-inside: avoid; page-break-inside: avoid; }
      }
    </style>
  </head>
  <body>
    <main class="report-document${documentStyle}">
      <div class="report-watermark">${escapeHtml(metadata.watermark || 'AEROPULSE')}</div>
      <header class="report-header"><div class="company-block">${metadata.logoUrl ? `<img class="company-logo" src="${escapeHtml(metadata.logoUrl)}" alt="" />` : ''}<div><div class="brand">${escapeHtml(metadata.companyName || metadata.name || 'Cold Air Airconditioning Trading')}<span>AEROPULSE operational reporting</span></div><div class="company-details">${escapeHtml(metadata.address || '')}${metadata.proprietor ? `<br/>${escapeHtml(metadata.proprietor)}` : ''}${metadata.contact ? ` | ${escapeHtml(metadata.contact)}` : ''}${metadata.taxRegistration ? ` | ${escapeHtml(metadata.taxRegistration)}` : ''}</div></div></div><div class="generated">${metadata.reportId ? `Report ID: ${escapeHtml(metadata.reportId)}<br/>` : ''}${metadata.branch ? `Branch: ${escapeHtml(metadata.branch)}<br/>` : ''}Generated: ${escapeHtml(metadata.generatedAt || new Date().toLocaleString())}</div></header>
      <section class="report-title"><h1>${escapeHtml(title || 'Report')}</h1>${subtitle ? `<p class="subtitle">${escapeHtml(subtitle)}</p>` : ''}</section>
      <div class="report-content">${html || ''}</div>
      ${metadata.representative ? `<section class="signature-section"><div class="signature-card"><strong>${escapeHtml(metadata.representative)}</strong><span>${escapeHtml(metadata.representativeRole || 'Authorized Representative')}</span><span>${escapeHtml(metadata.branch ? `${metadata.branch} Branch` : 'AEROPULSE')}</span></div></section>` : ''}
      <footer class="report-footer"><span>${escapeHtml(metadata.branch ? `Branch: ${metadata.branch}` : 'AEROPULSE confidential business report')} | ${escapeHtml(metadata.reportType || title || 'Report')}</span><span>${escapeHtml(metadata.reportId ? `Report ID: ${metadata.reportId} | ` : '')}${escapeHtml(metadata.generatedAt ? `Generated: ${metadata.generatedAt} | ` : '')}${escapeHtml(metadata.systemName || 'AEROPULSE')}</span></footer>
    </main>
  </body>
</html>`);
  w.onload = () => {
    w.focus();
    w.print();
  };
  w.document.close();
  return true;
};

