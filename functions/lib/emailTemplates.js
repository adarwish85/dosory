"use strict";
// Email Templates for Notifications
Object.defineProperty(exports, "__esModule", { value: true });
exports.getInvoiceSentEmail = getInvoiceSentEmail;
exports.getContractCreatedEmail = getContractCreatedEmail;
// Invoice Sent Email
function getInvoiceSentEmail(data) {
    return {
        subject: `Invoice #${data.invoiceNumber} from ${data.orgName || 'Your Business'}`,
        html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">Invoice #${data.invoiceNumber}</h1>
    </div>
    <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
        <p>Hello ${data.customerName},</p>
        <p>A new invoice has been generated for you.</p>
        
        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #eee;">
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="padding: 10px 0; color: #666;">Invoice Number</td>
                    <td style="padding: 10px 0; text-align: right; font-weight: bold;">#${data.invoiceNumber}</td>
                </tr>
                <tr>
                    <td style="padding: 10px 0; color: #666;">Amount Due</td>
                    <td style="padding: 10px 0; text-align: right; font-weight: bold; font-size: 20px; color: #667eea;">
                        ${data.currency} ${data.amount.toFixed(2)}
                    </td>
                </tr>
                <tr>
                    <td style="padding: 10px 0; color: #666;">Due Date</td>
                    <td style="padding: 10px 0; text-align: right;">${data.dueDate}</td>
                </tr>
            </table>
        </div>
        
        ${data.viewUrl ? `
        <a href="${data.viewUrl}" style="display: inline-block; background: #667eea; color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-weight: bold;">
            View Invoice
        </a>
        ` : ''}
        
        <p style="margin-top: 30px; color: #666; font-size: 14px;">
            If you have any questions, please don't hesitate to contact us.
        </p>
    </div>
</body>
</html>
        `.trim()
    };
}
// Contract Created Email
function getContractCreatedEmail(data) {
    return {
        subject: `Contract: ${data.subject}`,
        html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">Contract Created</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">${data.subject}</p>
    </div>
    <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
        <p>Hello ${data.customerName},</p>
        <p>A new contract has been created for you.</p>
        
        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #eee;">
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="padding: 10px 0; color: #666;">Contract</td>
                    <td style="padding: 10px 0; text-align: right; font-weight: bold;">#${data.contractNumber}</td>
                </tr>
                <tr>
                    <td style="padding: 10px 0; color: #666;">Value</td>
                    <td style="padding: 10px 0; text-align: right; font-weight: bold; font-size: 20px; color: #667eea;">
                        ${data.currency} ${data.value.toFixed(2)}
                    </td>
                </tr>
                <tr>
                    <td style="padding: 10px 0; color: #666;">Period</td>
                    <td style="padding: 10px 0; text-align: right;">${data.startDate} - ${data.endDate}</td>
                </tr>
            </table>
        </div>
        
        <p style="color: #666; font-size: 14px;">
            Please review the contract details. Contact us if you have any questions.
        </p>
    </div>
</body>
</html>
        `.trim()
    };
}
//# sourceMappingURL=emailTemplates.js.map