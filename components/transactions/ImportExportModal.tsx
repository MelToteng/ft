import React, { useState } from 'react';
import { Modal, Button, Icons } from '../ui';
import { ParsedTransaction, CSVColumnMapping } from '../../types';
import { importTransactionsCSV, importTransactionsPDF, exportTransactionsCSV, addTransaction } from '../../services/supabaseService';

interface ImportExportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImportComplete: () => void;
    addNotification: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const ImportExportModal: React.FC<ImportExportModalProps> = ({
    isOpen,
    onClose,
    onImportComplete,
    addNotification,
}) => {
    const [activeTab, setActiveTab] = useState<'import' | 'export'>('import');
    const [file, setFile] = useState<File | null>(null);
    const [parsedTransactions, setParsedTransactions] = useState<ParsedTransaction[]>([]);
    const [columnMapping, setColumnMapping] = useState<CSVColumnMapping>({
        date: 'Date',
        description: 'Description',
        amount: 'Amount',
        type: 'Type',
        category: 'Category',
    });
    const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [exportStartDate, setExportStartDate] = useState('');
    const [exportEndDate, setExportEndDate] = useState('');

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        setFile(selectedFile);
        setIsProcessing(true);

        try {
            if (selectedFile.name.endsWith('.csv')) {
                // Read CSV to get headers
                const text = await selectedFile.text();
                const lines = text.split('\n');
                const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
                setCsvHeaders(headers);

                // Parse with default mapping
                const parsed = await importTransactionsCSV(text, columnMapping);
                setParsedTransactions(parsed);
            } else if (selectedFile.name.endsWith('.pdf')) {
                const parsed = await importTransactionsPDF(selectedFile);
                setParsedTransactions(parsed);
            } else {
                addNotification('Please upload a CSV or PDF file', 'error');
            }
        } catch (error: any) {
            addNotification(`Error parsing file: ${error.message}`, 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleColumnMappingChange = async (field: keyof CSVColumnMapping, value: string) => {
        const newMapping = { ...columnMapping, [field]: value };
        setColumnMapping(newMapping);

        // Re-parse CSV with new mapping
        if (file && file.name.endsWith('.csv')) {
            setIsProcessing(true);
            try {
                const text = await file.text();
                const parsed = await importTransactionsCSV(text, newMapping);
                setParsedTransactions(parsed);
            } catch (error: any) {
                addNotification(`Error re-parsing: ${error.message}`, 'error');
            } finally {
                setIsProcessing(false);
            }
        }
    };

    const handleImport = async () => {
        if (parsedTransactions.length === 0) {
            addNotification('No transactions to import', 'error');
            return;
        }

        setIsProcessing(true);
        let imported = 0;

        try {
            for (const transaction of parsedTransactions) {
                // Skip if missing required fields
                if (!transaction.type || !transaction.category) {
                    continue;
                }

                await addTransaction({
                    description: transaction.description,
                    amount: transaction.amount,
                    date: transaction.date,
                    type: transaction.type,
                    category: transaction.category,
                });
                imported++;
            }

            addNotification(`Successfully imported ${imported} transactions`, 'success');
            onImportComplete();
            handleClose();
        } catch (error: any) {
            addNotification(`Error importing: ${error.message}`, 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleExport = async () => {
        setIsProcessing(true);
        try {
            const csv = await exportTransactionsCSV(exportStartDate || undefined, exportEndDate || undefined);

            // Create download link
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `transactions_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

            addNotification('Transactions exported successfully', 'success');
        } catch (error: any) {
            addNotification(`Error exporting: ${error.message}`, 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleClose = () => {
        setFile(null);
        setParsedTransactions([]);
        setCsvHeaders([]);
        setExportStartDate('');
        setExportEndDate('');
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Import/Export Transactions" className="max-w-4xl">
            <div className="mb-6">
                <div className="flex gap-2 border-b border-border">
                    <button
                        onClick={() => setActiveTab('import')}
                        className={`px-4 py-2 font-medium transition-colors ${activeTab === 'import'
                                ? 'text-primary border-b-2 border-primary'
                                : 'text-text-muted hover:text-text-secondary'
                            }`}
                    >
                        Import
                    </button>
                    <button
                        onClick={() => setActiveTab('export')}
                        className={`px-4 py-2 font-medium transition-colors ${activeTab === 'export'
                                ? 'text-primary border-b-2 border-primary'
                                : 'text-text-muted hover:text-text-secondary'
                            }`}
                    >
                        Export
                    </button>
                </div>
            </div>

            {activeTab === 'import' ? (
                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-2">
                            Upload CSV or PDF
                        </label>
                        <input
                            type="file"
                            accept=".csv,.pdf"
                            onChange={handleFileChange}
                            className="w-full bg-surface-light border border-border rounded-xl px-4 py-2 text-text-primary focus:ring-2 focus:ring-primary focus:outline-none"
                        />
                        <p className="text-xs text-text-muted mt-1">
                            Supports CSV files and PDF bank statements
                        </p>
                    </div>

                    {file && file.name.endsWith('.csv') && csvHeaders.length > 0 && (
                        <div className="bg-surface-light p-4 rounded-xl">
                            <h4 className="font-semibold mb-3">Column Mapping</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs text-text-muted mb-1">Date Column</label>
                                    <select
                                        value={columnMapping.date}
                                        onChange={(e) => handleColumnMappingChange('date', e.target.value)}
                                        className="w-full bg-surface border border-border rounded-lg px-3 py-1.5 text-sm"
                                    >
                                        {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs text-text-muted mb-1">Description Column</label>
                                    <select
                                        value={columnMapping.description}
                                        onChange={(e) => handleColumnMappingChange('description', e.target.value)}
                                        className="w-full bg-surface border border-border rounded-lg px-3 py-1.5 text-sm"
                                    >
                                        {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs text-text-muted mb-1">Amount Column</label>
                                    <select
                                        value={columnMapping.amount}
                                        onChange={(e) => handleColumnMappingChange('amount', e.target.value)}
                                        className="w-full bg-surface border border-border rounded-lg px-3 py-1.5 text-sm"
                                    >
                                        {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs text-text-muted mb-1">Type Column (Optional)</label>
                                    <select
                                        value={columnMapping.type || ''}
                                        onChange={(e) => handleColumnMappingChange('type', e.target.value)}
                                        className="w-full bg-surface border border-border rounded-lg px-3 py-1.5 text-sm"
                                    >
                                        <option value="">None</option>
                                        {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}

                    {parsedTransactions.length > 0 && (
                        <div>
                            <h4 className="font-semibold mb-3">Preview ({parsedTransactions.length} transactions)</h4>
                            <div className="max-h-64 overflow-y-auto bg-surface-light rounded-xl p-4">
                                <table className="w-full text-sm">
                                    <thead className="text-left text-text-muted border-b border-border">
                                        <tr>
                                            <th className="pb-2">Date</th>
                                            <th className="pb-2">Description</th>
                                            <th className="pb-2">Amount</th>
                                            <th className="pb-2">Type</th>
                                            <th className="pb-2">Category</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {parsedTransactions.slice(0, 10).map((t, i) => (
                                            <tr key={i} className="border-b border-border/50">
                                                <td className="py-2">{t.date}</td>
                                                <td className="py-2">{t.description}</td>
                                                <td className="py-2">${t.amount.toFixed(2)}</td>
                                                <td className="py-2">{t.type || '—'}</td>
                                                <td className="py-2">{t.category || '—'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {parsedTransactions.length > 10 && (
                                    <p className="text-xs text-text-muted mt-2">
                                        Showing first 10 of {parsedTransactions.length} transactions
                                    </p>
                                )}
                            </div>
                            <p className="text-xs text-warning mt-2">
                                ⚠️ Please review transactions before importing. You may need to manually set Type and Category for some entries.
                            </p>
                        </div>
                    )}

                    <div className="flex gap-3">
                        <Button
                            onClick={handleImport}
                            disabled={isProcessing || parsedTransactions.length === 0}
                            className="flex-1"
                        >
                            {isProcessing ? 'Importing...' : `Import ${parsedTransactions.length} Transactions`}
                        </Button>
                        <Button variant="secondary" onClick={handleClose} className="flex-1">
                            Cancel
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-2">
                                Start Date (Optional)
                            </label>
                            <input
                                type="date"
                                value={exportStartDate}
                                onChange={(e) => setExportStartDate(e.target.value)}
                                className="w-full bg-surface-light border border-border rounded-xl px-4 py-2 text-text-primary focus:ring-2 focus:ring-primary focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-2">
                                End Date (Optional)
                            </label>
                            <input
                                type="date"
                                value={exportEndDate}
                                onChange={(e) => setExportEndDate(e.target.value)}
                                className="w-full bg-surface-light border border-border rounded-xl px-4 py-2 text-text-primary focus:ring-2 focus:ring-primary focus:outline-none"
                            />
                        </div>
                    </div>

                    <p className="text-sm text-text-muted">
                        Leave dates empty to export all transactions. The CSV file will include: Date, Description, Amount, Type, and Category.
                    </p>

                    <div className="flex gap-3">
                        <Button onClick={handleExport} disabled={isProcessing} className="flex-1">
                            {isProcessing ? 'Exporting...' : 'Download CSV'}
                        </Button>
                        <Button variant="secondary" onClick={handleClose} className="flex-1">
                            Cancel
                        </Button>
                    </div>
                </div>
            )}
        </Modal>
    );
};
