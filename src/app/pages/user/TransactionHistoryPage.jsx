import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { useApp } from '../../context/AppContext';
import { 
    ArrowLeft, 
    Printer, 
    Copy, 
    Check, 
    CreditCard, 
    AlertCircle, 
    HelpCircle
} from 'lucide-react';
import { Modal, Button, Badge } from 'react-bootstrap';
import { toast } from 'sonner';
import { API_BASE_URL } from '../../api.js';

export default function TransactionHistoryPage() {
    const { user } = useApp();
    const navigate = useNavigate();
    const [transactions, setTransactions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedTransaction, setSelectedTransaction] = useState(null);
    const [copiedId, setCopiedId] = useState(null);

    // Mock Data Fallback
    const generateMockTransactions = () => {
        return [
            {
                txnRef: "STD-VNP-9827361",
                payDate: "10:30 - 09/07/2026",
                rawDate: new Date("2026-07-09T10:30:00"),
                orderInfo: "Upgrade Premium Storage 10GB",
                amount: 50000,
                originalPrice: 50000,
                discount: 0,
                fee: 0,
                bankCode: "NCB",
                paymentMethod: "VNPay Local Card",
                status: "SUCCESS",
                type: "UPGRADE",
                storageChange: "2 GB → 10 GB"
            },
            {
                txnRef: "STD-VNP-9821102",
                payDate: "14:15 - 08/07/2026",
                rawDate: new Date("2026-07-08T14:15:00"),
                orderInfo: "Upgrade Premium Storage 10GB",
                amount: 50000,
                originalPrice: 50000,
                discount: 0,
                fee: 0,
                bankCode: "VISA",
                paymentMethod: "VNPay International Card",
                status: "FAILED",
                type: "UPGRADE",
                storageChange: "No change"
            },
            {
                txnRef: "STD-MOMO-7738291",
                payDate: "09:00 - 25/06/2026",
                rawDate: new Date("2026-06-25T09:00:00"),
                orderInfo: "Upgrade Additional Storage",
                amount: 20000,
                originalPrice: 25000,
                discount: 5000,
                fee: 0,
                bankCode: "MOMO",
                paymentMethod: "MoMo E-Wallet",
                status: "SUCCESS",
                type: "UPGRADE",
                storageChange: "2 GB → 5 GB"
            },
            {
                txnRef: "STD-VNP-9764532",
                payDate: "18:45 - 15/06/2026",
                rawDate: new Date("2026-06-15T18:45:00"),
                orderInfo: "Premium Storage 10GB Plan",
                amount: 50000,
                originalPrice: 50000,
                discount: 0,
                fee: 0,
                bankCode: "VNPAY",
                paymentMethod: "VNPay QR Code",
                status: "CANCELLED",
                type: "UPGRADE",
                storageChange: "No change"
            },
            {
                txnRef: "STD-REFUND-00192",
                payDate: "11:20 - 10/06/2026",
                rawDate: new Date("2026-06-10T11:20:00"),
                orderInfo: "Refund storage downgrade",
                amount: -10000, // Refund displays with + sign
                originalPrice: 10000,
                discount: 0,
                fee: 0,
                bankCode: "MBBANK",
                paymentMethod: "Bank Transfer",
                status: "SUCCESS",
                type: "REFUND",
                storageChange: "10 GB → 2 GB"
            }
        ];
    };

    useEffect(() => {
        const fetchTransactionHistory = async () => {
            const token = localStorage.getItem('token');
            if (!token) {
                setIsLoading(false);
                return;
            }

            try {
                setIsLoading(true);
                const response = await fetch(`${API_BASE_URL}/api/v1/payments/history`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (response.ok) {
                    const result = await response.json();
                    if (result.success && Array.isArray(result.data)) {
                        const formatted = result.data.map(t => {
                            const rawDate = new Date(t.createdAt || new Date());
                            
                            // Format date for UI: "HH:MM - DD/MM/YYYY"
                            const formatPayDate = (d) => {
                                if (isNaN(d.getTime())) return "N/A";
                                const hours = String(d.getHours()).padStart(2, '0');
                                const minutes = String(d.getMinutes()).padStart(2, '0');
                                const day = String(d.getDate()).padStart(2, '0');
                                const month = String(d.getMonth() + 1).padStart(2, '0');
                                const year = d.getFullYear();
                                return `${hours}:${minutes} - ${day}/${month}/${year}`;
                            };
                            
                            const providerUpper = (t.provider || "VNPAY").toUpperCase();
                            let paymentMethod = "Bank Transfer";
                            if (providerUpper.includes("MOMO")) {
                                paymentMethod = "MoMo E-Wallet";
                            } else if (providerUpper.includes("VNPAY")) {
                                paymentMethod = "VNPay QR Code";
                            }

                            // Determine storage change info based on content
                            let storageChange = "No change";
                            if (t.status === "SUCCESS") {
                                const desc = (t.content || "").toLowerCase();
                                if (desc.includes("10gb") || desc.includes("premium")) {
                                    storageChange = "2 GB → 10 GB";
                                } else if (desc.includes("5gb") || desc.includes("standard")) {
                                    storageChange = "2 GB → 5 GB";
                                } else {
                                    storageChange = "Upgrade Premium";
                                }
                            }

                            const tid = t.transactionId ? String(t.transactionId).trim() : "";
                            const txnRef = (tid && tid !== "0" && tid !== "null" && tid !== "undefined") ? tid : "N/A";

                            return {
                                ...t,
                                txnRef: txnRef,
                                payDate: formatPayDate(rawDate),
                                rawDate: rawDate,
                                orderInfo: t.content || "Upgrade Storage Plan",
                                amount: (t.status === "SUCCESS") ? (t.amount || 0) : 0,
                                originalPrice: (t.status === "SUCCESS") ? (t.amount || 0) : 0,
                                discount: 0,
                                fee: 0,
                                bankCode: providerUpper,
                                paymentMethod: paymentMethod,
                                status: t.status || "PENDING",
                                type: "UPGRADE",
                                storageChange: storageChange
                            };
                        });
                        setTransactions(formatted);
                        return;
                    }
                }
                
                throw new Error("Không thể tải lịch sử giao dịch từ máy chủ.");
            } catch (error) {
                console.error("API payment history error:", error);
                setTransactions([]);
                toast.error("Không thể tải lịch sử giao dịch.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchTransactionHistory();
    }, []);

    // Copy Transaction ID to clipboard
    const handleCopyId = (e, id) => {
        e.stopPropagation();
        navigator.clipboard.writeText(id);
        setCopiedId(id);
        toast.success("Transaction ID copied to clipboard!");
        setTimeout(() => setCopiedId(null), 2000);
    };

    // Sort transactions descending by rawDate (newest on top)
    const sortedTransactions = [...transactions].sort((a, b) => b.rawDate - a.rawDate);

    // Formatting currency helper for UI
    const formatCurrency = (val) => {
        return new Intl.NumberFormat('vi-VN').format(val);
    };

    // Render amount matching user request (number and currency code only, no signs)
    const formatAmountDisplay = (amount) => {
        const absVal = Math.abs(amount);
        const formattedNum = formatCurrency(absVal);

        return (
            <span className="text-dark fw-bold" style={{ fontSize: '15px' }}>
                {formattedNum} <span style={{ textDecoration: 'none', fontSize: '13px', marginLeft: '2px' }}>VND</span>
            </span>
        );
    };

    // Simulated Print Receipt utility
    const handlePrintReceipt = (transaction) => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            toast.error("Unable to open print preview. Please check browser pop-up blocker settings.");
            return;
        }
        
        printWindow.document.write(`
            <html>
            <head>
                <title>Receipt - ${transaction.txnRef}</title>
                <style>
                    body { 
                        font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; 
                        padding: 30px; 
                        color: #1e293b; 
                        line-height: 1.5;
                        background: #f8fafc;
                    }
                    .receipt-container { 
                        max-width: 600px; 
                        margin: 0 auto; 
                        border: 1px solid #e2e8f0; 
                        padding: 40px; 
                        border-radius: 12px; 
                        background: #ffffff;
                        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); 
                    }
                    .header { 
                        text-align: center; 
                        border-bottom: 2px dashed #e2e8f0; 
                        padding-bottom: 25px; 
                        margin-bottom: 25px; 
                    }
                    .logo { 
                        font-size: 26px; 
                        font-weight: 800; 
                        background: linear-gradient(135deg, #C73866, #FD8F52);
                        -webkit-background-clip: text;
                        -webkit-text-fill-color: transparent;
                        margin-bottom: 5px; 
                    }
                    .title { 
                        font-size: 14px; 
                        color: #64748b; 
                        text-transform: uppercase; 
                        letter-spacing: 1.5px; 
                        font-weight: 600;
                    }
                    .details-table { 
                        width: 100%; 
                        border-collapse: collapse; 
                        margin-top: 15px; 
                    }
                    .details-table td { 
                        padding: 14px 0; 
                        border-bottom: 1px solid #f1f5f9; 
                        font-size: 14px;
                    }
                    .details-table tr:last-child td { 
                        border-bottom: none; 
                    }
                    .label { 
                        color: #64748b; 
                        font-weight: 500;
                    }
                    .value { 
                        text-align: right; 
                        font-weight: 600; 
                        color: #0f172a; 
                    }
                    .amount-row { 
                        background-color: #fff9f5; 
                        border-top: 2px solid #ffe8d9; 
                        border-bottom: 2px solid #ffe8d9; 
                    }
                    .amount-label { 
                        font-size: 16px; 
                        font-weight: 700; 
                        color: #fd8f52; 
                        padding: 18px 12px !important; 
                    }
                    .amount-value { 
                        font-size: 22px; 
                        font-weight: 800; 
                        color: #c73866; 
                        text-align: right; 
                        padding: 18px 12px !important; 
                    }
                    .footer { 
                        text-align: center; 
                        margin-top: 35px; 
                        font-size: 12px; 
                        color: #94a3b8; 
                        border-top: 1px solid #e2e8f0; 
                        padding-top: 25px; 
                    }
                    .badge { 
                        display: inline-block; 
                        padding: 6px 12px; 
                        border-radius: 9999px; 
                        font-size: 11px; 
                        font-weight: 700; 
                        text-transform: uppercase;
                    }
                    .badge-success { background-color: #d1fae5; color: #065f46; }
                    .badge-danger { background-color: #fee2e2; color: #991b1b; }
                    .badge-warning { background-color: #fef3c7; color: #92400e; }
                </style>
            </head>
            <body>
                <div class="receipt-container">
                    <div class="header">
                        <div class="logo">StudyDocs AI</div>
                        <div class="title">Electronic Receipt</div>
                    </div>
                    <table class="details-table">
                        <tr>
                            <td class="label">Transaction ID (Ref ID)</td>
                            <td class="value">${transaction.txnRef}</td>
                        </tr>
                        <tr>
                            <td class="label">Payment Date & Time</td>
                            <td class="value">${transaction.payDate}</td>
                        </tr>
                        <tr>
                            <td class="label">Service Description</td>
                            <td class="value">${transaction.orderInfo}</td>
                        </tr>
                        <tr>
                            <td class="label">Gateway / Bank</td>
                            <td class="value">${transaction.bankCode} (${transaction.paymentMethod})</td>
                        </tr>
                        <tr>
                            <td class="label">Payment Status</td>
                            <td class="value">
                                <span class="badge ${
                                    transaction.status === 'SUCCESS' ? 'badge-success' : 
                                    transaction.status === 'PENDING' ? 'badge-warning' : 'badge-danger'
                                }">
                                    ${transaction.status === 'SUCCESS' ? 'Success' : 
                                      transaction.status === 'PENDING' ? 'Pending' : 'Failed'}
                                </span>
                            </td>
                        </tr>
                        <tr>
                            <td class="label">List Price</td>
                            <td class="value">${formatCurrency(Math.abs(transaction.originalPrice))} VND</td>
                        </tr>
                        <tr>
                            <td class="label">Discount</td>
                            <td class="value">-${formatCurrency(Math.abs(transaction.discount))} VND</td>
                        </tr>
                        <tr>
                            <td class="label">Transaction Fee</td>
                            <td class="value">${formatCurrency(Math.abs(transaction.fee))} VND</td>
                        </tr>
                        <tr class="amount-row">
                            <td class="amount-label">Total Paid</td>
                            <td class="amount-value">${formatCurrency(Math.abs(transaction.amount))} VND</td>
                        </tr>
                    </table>
                    <div class="footer">
                        <p>Thank you for upgrading your storage with StudyDocs AI!</p>
                        <p>Receipt automatically generated by the VNPay Sandbox Gateway.</p>
                        <p>If you experience payment issues, please contact: support@studydocsai.vn</p>
                    </div>
                </div>
                <script>
                    window.onload = function() { 
                        setTimeout(function() {
                            window.print();
                        }, 500);
                    }
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    };

    return (
        <div className="container-fluid py-4 px-3 px-md-5 text-start">
            {/* Breadcrumb Navigation */}
            <div className="mb-4">
                <Link to="/user/home" className="d-inline-flex align-items-center gap-2 text-decoration-none text-muted" style={{ fontSize: '14px' }}>
                    <ArrowLeft className="h-4 w-4" />
                    <span className="fw-medium">Back to Homepage</span>
                </Link>
            </div>

            <div className="mx-auto" style={{ maxWidth: '1100px' }}>
                
                {/* Header Section */}
                <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3 mb-4">
                    <div>
                        <h1 className="fw-bold mb-1 text-dark" style={{ fontSize: '28px' }}>Transaction History</h1>
                        <p className="text-muted mb-0">Manage your invoices, upgrades, and premium subscription details</p>
                    </div>
                </div>

                {/* Main Transaction List */}
                <div className="card shadow-sm border-0 rounded-4 overflow-hidden mb-4" style={{ backgroundColor: 'var(--bg-card-container)' }}>
                    <div className="card-body p-0">
                        
                        {isLoading ? (
                            <div className="py-5 text-center text-muted">
                                <div className="spinner-border spinner-border-sm text-primary mb-2" role="status"></div>
                                <p className="mb-0" style={{ fontSize: '14px' }}>Loading transaction history...</p>
                            </div>
                        ) : sortedTransactions.length === 0 ? (
                            
                            /* Empty State Component */
                            <div className="py-5 px-4 text-center my-4">
                                <div className="rounded-circle bg-light d-inline-flex align-items-center justify-content-center p-4 mb-4 text-muted"
                                     style={{ width: '80px', height: '80px' }}>
                                    <CreditCard size={36} className="text-muted" />
                                </div>
                                <h4 className="fw-bold text-dark mb-2" style={{ fontSize: '18px' }}>No Transactions Found</h4>
                                <p className="text-muted mx-auto mb-4" style={{ maxWidth: '400px', fontSize: '14px' }}>
                                    You have not performed any storage upgrade transactions yet.
                                </p>
                                <Link to="/upgrade" className="btn text-white px-4 py-2 fw-semibold border-0 rounded-3" 
                                      style={{ background: 'linear-gradient(135deg, #C73866, #FD8F52)', fontSize: '14px' }}>
                                    Upgrade to Premium Now
                                </Link>
                            </div>

                        ) : (
                            
                            /* Desktop & Tablet Table Layout (Simplified 4 columns) */
                            <div className="table-responsive">
                                <table className="table table-hover align-middle mb-0" style={{ fontSize: '14px' }}>
                                    <thead>
                                        <tr className="table-light">
                                            <th className="py-3 px-4 border-0 text-muted" style={{ fontWeight: '600' }}>Transaction ID</th>
                                            <th className="py-3 border-0 text-muted" style={{ fontWeight: '600' }}>Date & Time</th>
                                            <th className="py-3 border-0 text-muted" style={{ fontWeight: '600' }}>Description & Method</th>
                                            <th className="py-3 border-0 text-muted" style={{ fontWeight: '600' }}>Status</th>
                                            <th className="py-3 px-4 border-0 text-end text-muted" style={{ fontWeight: '600' }}>Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sortedTransactions.map((tx) => {
                                            return (
                                                <tr 
                                                    key={tx.id || tx.txnRef} 
                                                    className="border-bottom cursor-pointer animate-fade-in"
                                                    style={{ borderBottomColor: 'var(--border-color)', transition: 'background 0.2s' }}
                                                    onClick={() => setSelectedTransaction(tx)}
                                                >
                                                    {/* Column 1: Transaction ID with Copy button */}
                                                    <td className="py-3 px-4 fw-semibold text-dark">
                                                        <div className="d-flex align-items-center gap-1.5">
                                                            <span style={{ fontFamily: 'inherit' }}>{tx.txnRef}</span>
                                                            {tx.txnRef !== "N/A" && (
                                                                <button 
                                                                    className="btn p-0 border-0 bg-transparent text-muted text-hover-dark" 
                                                                    onClick={(e) => handleCopyId(e, tx.txnRef)}
                                                                    title="Copy ID"
                                                                    style={{ padding: '2px' }}
                                                                >
                                                                    {copiedId === tx.txnRef ? <Check size={14} className="text-success" /> : <Copy size={14} />}
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>

                                                    {/* Column 2: Date & Time */}
                                                    <td className="py-3 text-dark">
                                                        {tx.payDate}
                                                    </td>

                                                    {/* Column 3: Description & Payment Method */}
                                                    <td className="py-3 text-dark">
                                                        <div className="fw-semibold">{tx.orderInfo}</div>
                                                        <div className="text-muted" style={{ fontSize: '12px' }}>
                                                            {tx.bankCode} • {tx.paymentMethod}
                                                        </div>
                                                    </td>

                                                    {/* Column 4: Status Badge */}
                                                    <td className="py-3 text-dark">
                                                        <span className={`badge border px-3 py-1.5 rounded-pill ${
                                                            tx.status === 'SUCCESS' ? 'bg-success-subtle text-success border-success-subtle' :
                                                            tx.status === 'PENDING' ? 'bg-warning-subtle text-warning border-warning-subtle' :
                                                            'bg-danger-subtle text-danger border-danger-subtle'
                                                        }`} style={{ fontSize: '11px', fontWeight: '700' }}>
                                                            {tx.status}
                                                        </span>
                                                    </td>

                                                    {/* Column 5: Amount */}
                                                    <td className="py-3 px-4 text-end">
                                                        {formatAmountDisplay(tx.amount)}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}

                    </div>
                </div>
            </div>

            {/* Transaction Invoice Detail Modal (Accessible via row click) */}
            <Modal 
                show={selectedTransaction !== null} 
                onHide={() => setSelectedTransaction(null)}
                centered
                size="md"
                dialogClassName="custom-modal-details"
            >
                {selectedTransaction && (
                    <>
                        <Modal.Header closeButton className="border-0 pb-0">
                            <Modal.Title className="fw-bold text-dark" style={{ fontSize: '20px' }}>Invoice Details</Modal.Title>
                        </Modal.Header>
                        
                        <Modal.Body className="pt-2 px-4 pb-4 text-start">
                            
                            {/* Receipt Header Banner */}
                            <div className="text-center bg-light p-4 rounded-4 mb-4 border border-light-subtle position-relative overflow-hidden">
                                <div className="position-absolute top-0 start-0 w-100" style={{ height: '4px', background: 'linear-gradient(90deg, #C73866, #FD8F52)' }}></div>
                                
                                <div className="text-muted mb-1" style={{ fontSize: '13px' }}>Payment Amount</div>
                                <h2 className="fw-extrabold mb-2" style={{ color: '#C73866', fontSize: '32px' }}>
                                    {formatCurrency(Math.abs(selectedTransaction.amount))} VND
                                </h2>
                                
                                <div className="d-flex justify-content-center mt-2">
                                    <span className={`badge border px-3 py-1.5 rounded-pill ${
                                        selectedTransaction.status === 'SUCCESS' ? 'bg-success-subtle text-success border-success-subtle' :
                                        selectedTransaction.status === 'PENDING' ? 'bg-warning-subtle text-warning border-warning-subtle' :
                                        'bg-danger-subtle text-danger border-danger-subtle'
                                    }`} style={{ fontSize: '11px', fontWeight: '700' }}>
                                        {selectedTransaction.status === 'SUCCESS' ? '🟢 SUCCESS' :
                                         selectedTransaction.status === 'PENDING' ? '🟡 PENDING' : '🔴 FAILED'}
                                    </span>
                                </div>
                            </div>

                            {/* Receipt Body items */}
                            <div className="mb-4">
                                <h6 className="fw-bold text-dark border-bottom pb-2 mb-3" style={{ fontSize: '15px' }}>Transaction Details</h6>
                                
                                <div className="d-flex justify-content-between mb-2.5">
                                    <span className="text-muted" style={{ fontSize: '13.5px' }}>Transaction ID (Ref ID):</span>
                                    <span className="fw-semibold text-dark font-monospace" style={{ fontSize: '13.5px' }}>
                                        {selectedTransaction.txnRef}
                                    </span>
                                </div>
                                
                                <div className="d-flex justify-content-between mb-2.5">
                                    <span className="text-muted" style={{ fontSize: '13.5px' }}>Payment Date & Time:</span>
                                    <span className="fw-semibold text-dark" style={{ fontSize: '13.5px' }}>{selectedTransaction.payDate}</span>
                                </div>

                                <div className="d-flex justify-content-between mb-2.5">
                                    <span className="text-muted" style={{ fontSize: '13.5px' }}>Description:</span>
                                    <span className="fw-semibold text-dark" style={{ fontSize: '13.5px' }}>{selectedTransaction.orderInfo}</span>
                                </div>

                                <div className="d-flex justify-content-between mb-2.5">
                                    <span className="text-muted" style={{ fontSize: '13.5px' }}>Payment Method:</span>
                                    <span className="fw-semibold text-dark" style={{ fontSize: '13.5px' }}>{selectedTransaction.paymentMethod}</span>
                                </div>

                                <div className="d-flex justify-content-between mb-2.5">
                                    <span className="text-muted" style={{ fontSize: '13.5px' }}>Gateway / Bank:</span>
                                    <span className="fw-semibold text-dark" style={{ fontSize: '13.5px' }}>{selectedTransaction.bankCode}</span>
                                </div>

                                <div className="d-flex justify-content-between mb-2.5">
                                    <span className="text-muted" style={{ fontSize: '13.5px' }}>Storage Change:</span>
                                    <span className="fw-semibold text-primary" style={{ fontSize: '13.5px' }}>{selectedTransaction.storageChange}</span>
                                </div>
                            </div>

                            {/* Cost Details breakdown */}
                            <div className="mb-4">
                                <h6 className="fw-bold text-dark border-bottom pb-2 mb-3" style={{ fontSize: '15px' }}>Cost Details</h6>
                                
                                <div className="d-flex justify-content-between mb-2">
                                    <span className="text-muted" style={{ fontSize: '13.5px' }}>List Price:</span>
                                    <span className="text-dark" style={{ fontSize: '13.5px' }}>{formatCurrency(Math.abs(selectedTransaction.originalPrice))} VND</span>
                                </div>

                                <div className="d-flex justify-content-between mb-2">
                                    <span className="text-muted" style={{ fontSize: '13.5px' }}>Discount:</span>
                                    <span className="text-success" style={{ fontSize: '13.5px' }}>-{formatCurrency(Math.abs(selectedTransaction.discount))} VND</span>
                                </div>

                                <div className="d-flex justify-content-between mb-2">
                                    <span className="text-muted" style={{ fontSize: '13.5px' }}>Transaction Fee (VAT & Gateway):</span>
                                    <span className="text-dark" style={{ fontSize: '13.5px' }}>{formatCurrency(Math.abs(selectedTransaction.fee))} VND</span>
                                </div>

                                <div className="d-flex justify-content-between border-top pt-2.5 mt-2 fw-bold" style={{ fontSize: '15px' }}>
                                    <span className="text-dark">Total Paid:</span>
                                    <span className="text-dark">{formatCurrency(Math.abs(selectedTransaction.amount))} VND</span>
                                </div>
                            </div>

                            {/* Help Box for pending/failed status */}
                            {selectedTransaction.status !== 'SUCCESS' && (
                                <div className="bg-warning-subtle text-warning-emphasis p-3 rounded-3 mb-4 d-flex gap-2 border border-warning-subtle" style={{ fontSize: '13px' }}>
                                    <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
                                    <div>
                                        <strong>Transaction Pending/Failed:</strong> If funds were debited from your bank but status is still Pending/Failed, please wait 5-10 minutes or contact customer support for manual syncing.
                                    </div>
                                </div>
                            )}

                            {/* Action items */}
                            <div className="d-flex gap-2.5">
                                <Button 
                                    variant="outline-secondary" 
                                    className="w-50 py-2 fw-semibold d-flex align-items-center justify-content-center gap-2 rounded-3"
                                    onClick={() => handlePrintReceipt(selectedTransaction)}
                                >
                                    <Printer size={16} />
                                    Print Receipt
                                </Button>
                                
                                {selectedTransaction.status === 'FAILED' || selectedTransaction.status === 'CANCELLED' ? (
                                    <a 
                                        href={`mailto:support@studydocsai.vn?subject=Support%20Request%20for%20Failed%20Transaction%20${selectedTransaction.txnRef}&body=Transaction%20ID:%20${selectedTransaction.txnRef}`}
                                        className="btn btn-danger w-50 py-2 fw-semibold d-flex align-items-center justify-content-center gap-2 rounded-3 text-white text-decoration-none"
                                    >
                                        Contact Support
                                    </a>
                                ) : (
                                    <Button 
                                        variant="primary" 
                                        className="w-50 py-2 fw-semibold d-flex align-items-center justify-content-center gap-2 rounded-3 text-white border-0"
                                        style={{ background: 'linear-gradient(135deg, #C73866, #FD8F52)' }}
                                        onClick={() => {
                                            toast.success("Receipt details saved!");
                                            setSelectedTransaction(null);
                                        }}
                                    >
                                        Close
                                    </Button>
                                )}
                            </div>

                        </Modal.Body>
                    </>
                )}
            </Modal>
        </div>
    );
}
