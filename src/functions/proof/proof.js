const indy = require('indy-sdk')


const generateNonce = async() => {
    let nonce = await indy.generateNonce()

    return nonce
}


const createProofRequest = async(name, version='0.1') => {

    createProofRequest = {

        nonce: await generateNonce(),
        name: name,
        version: version,

        requested_attributes: {
            
        }

    }
}

module.exports = {generateNonce}