import { Eye, FileSpreadsheet, Printer, ScrollText } from 'lucide-react';
import { useState } from 'react';
import * as reportsApi from '../../api/reports.js';
import Button from '../../components/Button.jsx';
import Card from '../../components/Card.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import Table from '../../components/Table.jsx';

export default function Reports() {
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState('');
  const [preview, setPreview] = useState(null);
  const reports = [
    { title: 'Book report', type: 'books', description: 'Catalog IDs, copy totals, available copies, copies in use, and lifecycle status.' },
    { title: 'Borrowing report', type: 'borrowing', description: 'Each request, the user and book involved, approval, due, renewal, return, and current status.' },
    { title: 'User report', type: 'users', description: 'Permanent user IDs, account identity, role, status, registration date, and last login.' },
    { title: 'Voice search report', type: 'voice-search', description: 'Recognized speech, confidence, processing time, result count, user, and outcome.' },
    { title: 'TTS report', type: 'tts', description: 'Narration requests, provider, text length, related book and user, status, and time.' },
    { title: 'Activity report', type: 'activity', description: 'Audit trail showing who performed each action, on which entity, and when.' },
  ];

  async function loadRows(type) {
    const response = await reportsApi.getReport(type);
    return response.data || [];
  }

  async function exportCsv(type) {
    setBusy(`${type}-excel`);
    try {
      const rows = await loadRows(type);
      if (!rows.length) return setMessage('This report has no rows to export.');
      const url = URL.createObjectURL(new Blob([reportsApi.toCsv(rows)], { type: 'text/csv;charset=utf-8' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `${type}-report.csv`;
      link.click();
      URL.revokeObjectURL(url);
      setMessage('Excel-compatible CSV report downloaded.');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy('');
    }
  }

  async function previewReport(report) {
    setBusy(`${report.type}-preview`);
    setMessage('');
    try {
      const rows = await loadRows(report.type);
      setPreview({ ...report, rows });
      if (!rows.length) setMessage('This report currently has no records.');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy('');
    }
  }

  async function printReport(type, mode = 'print') {
    setBusy(`${type}-${mode}`);
    try {
      const rows = await loadRows(type);
      if (!rows.length) return setMessage('This report has no rows to print.');
      const iframe = document.createElement('iframe');
      iframe.setAttribute('title', `${type} report print frame`);
      iframe.style.position = 'fixed';
      iframe.style.width = '1px';
      iframe.style.height = '1px';
      iframe.style.opacity = '0';
      iframe.style.pointerEvents = 'none';
      iframe.srcdoc = reportsApi.toPrintableHtml(type, rows);
      iframe.onload = () => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        window.setTimeout(() => iframe.remove(), 1500);
      };
      document.body.appendChild(iframe);
      setMessage(mode === 'pdf'
        ? 'Print dialog opened without a popup. Select "Save as PDF" as the destination.'
        : 'Print dialog opened without a popup. Select your printer and print the report.');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy('');
    }
  }

  return (
    <>
      <PageHeader title="Reports" description="Generate book, borrowing, user, voice search, TTS, and activity reports." />
      {message && <div className="inline-info">{message}</div>}
      <div className="three-grid">
        {reports.map((report) => (
          <Card key={report.type} title={report.title}>
            <p>{report.description}</p>
            <div className="button-row">
              <Button size="sm" variant="ghost" disabled={Boolean(busy)} onClick={() => previewReport(report)}><Eye size={15} /> View data</Button>
              <Button size="sm" disabled={Boolean(busy)} onClick={() => printReport(report.type, 'pdf')}><ScrollText size={15} /> PDF</Button>
              <Button size="sm" variant="secondary" disabled={Boolean(busy)} onClick={() => exportCsv(report.type)}><FileSpreadsheet size={15} /> Excel</Button>
              <Button size="sm" variant="ghost" disabled={Boolean(busy)} onClick={() => printReport(report.type)}><Printer size={15} /> Print</Button>
            </div>
          </Card>
        ))}
      </div>
      {preview && (
        <Card title={`${preview.title} preview`} eyebrow={`${preview.rows.length} record(s)`}>
          <p>{preview.description}</p>
          {preview.rows.length > 0 && (
            <Table
              columns={Object.keys(preview.rows[0]).map((key) => ({
                key,
                label: key.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()),
              }))}
              rows={preview.rows.slice(0, 100)}
            />
          )}
          {preview.rows.length > 100 && <p className="table-explanation">Showing the first 100 records. Export the report to include every row.</p>}
        </Card>
      )}
    </>
  );
}
