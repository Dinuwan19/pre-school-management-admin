import api from '../config/api';

export const getStudentBillings = async (studentId) => {
    try {
        const response = await api.get('/billing', { params: { studentId } });
        return response.data;
    } catch (error) {
        throw error.response?.data || { message: 'Failed to fetch billings' };
    }
};

export const uploadPaymentReceipt = async (billingIds, amount, paymentMethod, receiptFile, note = '') => {
    try {
        const formData = new FormData();
        // billingIds should be an array of numbers
        billingIds.forEach(id => formData.append('billingIds[]', id));
        formData.append('amountPaid', amount);
        formData.append('paymentMethod', paymentMethod);
        formData.append('transactionRef', note);

        if (receiptFile) {
            formData.append('receipt', {
                uri: receiptFile.uri,
                type: receiptFile.type || 'image/jpeg',
                name: receiptFile.name || 'receipt.jpg'
            });
        }

        const response = await api.post('/payments/submit', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    } catch (error) {
        throw error.response?.data || { message: 'Failed to submit payment' };
    }
};

export const getOverdueBillings = async () => {
    try {
        const response = await api.get('/billing', { params: { status: 'UNPAID' } });
        return response.data;
    } catch (error) {
        throw error.response?.data || { message: 'Failed to fetch overdue billings' };
    }
};
