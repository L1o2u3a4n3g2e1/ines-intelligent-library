import { FileSpreadsheet, Printer, ScrollText } from 'lucide-react';
import { useState } from 'react';
import * as reportsApi from '../../api/reports.js';
import Button from '../../components/Button.jsx';
import Card from '../../components/Card.jsx';
import PageHeader from '../../components/PageHeader.jsx';

export default function Reports() {
  const [message, setMessage] = useState('');
  const reports = [
    { title: 'Book report', type: 'books' },
    { title: 'Borrowing report', type: 'borrowing' },
    { title: 'User report', type: 'users' },
    { title: 'Voice search report', type: 'voice-search' },
    { title: 'TTS report', type: 'tts' },
    { title: 'Activity report', type: 'activity' },
  ];

  async function loadRows(type) {
    const response = await reportsApi.getReport(type);
    return response.data || [];
  }

  async function exportCsv(type) {
    const rows = await loadRows(type);
    if (!rows.length) return setMessage('This report has no rows to export.');
    const url = URL.createObjectURL(new Blob([reportsApi.toCsv(rows)], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${type}-report.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setMessage('Excel-compatible CSV report downloaded.');
  }

  async function printReport(type) {
    const rows = await loadRows(type);
    if (!rows.length) return setMessage('This report has no rows to print.');
    const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];
    const popup = window.open('', '_blank', 'noopener,noreferrer');
    if (!popup) return setMessage('Allow popups to print or save this report as PDF.');
    const escape = (value) => String(value ?? '').replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]));
    popup.document.write(`<html><head><title>${escape(type)} report</title><style>body{font-family:Arial;padding:24px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccc;padding:7px;text-align:left}th{background:#eee}</style></head><body><h1>${escape(type)} report</h1><table><thead><tr>${columns.map((column) => `<th>${escape(column)}</th>`).join('')}</tr></thead><tbody>${rows.map((row) => `<tr>${columns.map((column) => `<td>${escape(row[column])}</td>`).join('')}</tr>`).join('')}</tbody></table></body></html>`);
    popup.document.close();
    popup.focus();
    popup.print();
    setMessage('Print dialog opened. Choose Save as PDF for a PDF export.');
  }

  return (
    <>
      <PageHeader title="Reports" description="Generate book, borrowing, user, voice search, TTS, and activity reports." />
      {message && <div className="inline-info">{message}</div>}
      <div className="three-grid">
        {reports.map(({ title, type }) => (
          <Card key={type} title={title}>
            <div className="button-row">
              <Button size="sm" onClick={() => printReport(type)}><ScrollText size={15} /> PDF</Button>
              <Button size="sm" variant="secondary" onClick={() => exportCsv(type)}><FileSpreadsheet size={15} /> Excel</Button>
              <Button size="sm" variant="ghost" onClick={() => printReport(type)}><Printer size={15} /> Print</Button>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
