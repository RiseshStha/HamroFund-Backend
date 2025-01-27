// utils/esewaUtils.js
const CryptoJS = require('crypto-js');

const generateEsewaSignature = (params) => {
    const secretKey = "8gBm/:&EnhH.1/q"; // eSewa test secret key
    const { total_amount, transaction_uuid, product_code } = params;
    
    // Create string to sign (in the specified order)
    const stringToSign = `${total_amount},${transaction_uuid},${product_code}`;
    
    // Generate HMAC SHA256 signature
    const hash = CryptoJS.HmacSHA256(stringToSign, secretKey);
    // Convert to Base64
    const signature = CryptoJS.enc.Base64.stringify(hash);
    
    return signature;
};

module.exports = {
    generateEsewaSignature
};