const indy = require('indy-sdk')


const generateNonce = async() => {
    let nonce = await indy.generateNonce()

    return nonce
}


const createProofRequest = async(name, version='0.1') => {

    proofRequest = {

        nonce: await generateNonce(),
        name: name,
        version: version
    }
    return proofRequest
}

const searchCredentialsForProofReq = async(userWalletHandle, proofReqJson) => {

    let searchForProofReq= await indy.proverSearchCredentialsForProofReq(userWalletHandle, proofReqJson, null)

    return searchForProofReq
}

const fetchCredentialForProofReq = async(searchForProofReq, attr_referent) => {

    let credentials = await indy.proverFetchCredentialsForProofReq(searchForProofReq, attr_referent, 100)

    return credentials
}

module.exports = {generateNonce, createProofRequest, searchCredentialsForProofReq, fetchCredentialForProofReq}