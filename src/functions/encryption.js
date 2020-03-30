const indy = require('indy-sdk')

const authCrypt = async(userWalletHandle, senderVk, recipientVk, message) => {
    let authCryptData = await indy.cryptoAuthCrypt(userWalletHandle, senderVk, recipientVk, Buffer.from(JSON.stringify(message), 'utf-8'))
    return authCryptData
}

async function authDecrypt(walletHandle, key, message) {
    let [fromVerkey, decryptedMessageJsonBuffer] = await indy.cryptoAuthDecrypt(walletHandle, key, message);
    let decryptedMessage = JSON.parse(decryptedMessageJsonBuffer);
    let decryptedMessageJson = JSON.stringify(decryptedMessage);
    return [fromVerkey, decryptedMessageJson, decryptedMessage];
}

module.exports = {authCrypt, authDecrypt}