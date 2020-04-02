const express = require('express')
const router = new express.Router()
const auth = require('../middleware/auth')
const User = require('../models/user/user')
const pool = require('../functions/pool')
const DidKeyPair = require('../models/user/didKeyPair')
const Sample = require('../models/user/sample')
const bson = require('bson')
const indy = require('indy-sdk')
const userFuncs = require('../functions/user')
const encryption = require('../functions/encryption')
const utf8 = require('utf8')
const proofFunc = require('../functions/proof')
const ProofRequest = require('../models/proof/proofRequest')
const MasterSecret = require('../models/user/masterSecret')

router.post('/createProofReq', auth, async(req, res) => {

    let me = await DidKeyPair.findOne({owner: req.user._id, public: true})
    console.log('ME DID------------------------------>', me.did);
    
    let mePairwise = await DidKeyPair.findOne({owner: req.user._id, public: false, by:me.did, forDid: req.body.recipientDid})
    console.log(mePairwise)

    let forMePairwise = await DidKeyPair.findOne({forDid: me.did, public: false, by: req.body.recipientDid})
    console.log(forMePairwise);

    let proofRequest = await proofFunc.createProofRequest(req.body.name, req.body.requested_attributes)
    console.log('PROOOF REQ---------------------------------------------------------------->', proofRequest);

    try {
        let meVerkey = await userFuncs.keyForDid(pool.poolHandle, req.user.userWalletHandle, mePairwise.did)
        console.log('ME VERKEY--------------------------------------------->', meVerkey);
        
        let forMeVerkey = await userFuncs.keyForDid(pool.poolHandle, req.user.userWalletHandle, forMePairwise.did)
        console.log('FOR ME VERKEY------------------------------------------>', forMeVerkey);
        
        let authCryptProofReq = await encryption.authCrypt(req.user.userWalletHandle, meVerkey, forMeVerkey, proofRequest)
        console.log('AUTH PROOF REQ-------------------------------------------------------->', authCryptProofReq);
        
        let proofReq = new ProofRequest({
            did: me.did,
            message: authCryptProofReq,
            recipientDid: req.body.recipientDid,
            owner: req.user._id
        })

        await proofReq.save()

        res.send({proofReq ,authCryptProofReq, proofReq})
    } catch (e) {
        res.send(e)
    }
    
})


router.post('/sendProof', auth, async(req, res) => {

    let me = await DidKeyPair.findOne({owner: req.user._id, public: true})
    console.log('ME DID------------------------------>', me.did);
    
    let mePairwise = await DidKeyPair.findOne({owner: req.user._id, public: false, by:me.did, forDid: req.body.recipientDid})
    console.log(mePairwise)

    let forMePairwise = await DidKeyPair.findOne({forDid: me.did, public: false, by: req.body.recipientDid})
    console.log(forMePairwise);

    try {
        let meVerkey = await userFuncs.keyForDid(pool.poolHandle, req.user.userWalletHandle, mePairwise.did)
        console.log('ME VERKEY--------------------------------------------->', meVerkey);
        
        let forMeVerkey = await userFuncs.keyForDid(pool.poolHandle, req.user.userWalletHandle, forMePairwise.did)
        console.log('FOR ME VERKEY------------------------------------------>', forMeVerkey);

        let authCryptProofReqUpdate = await ProofRequest.updateOne({did: req.body.recipientDid, recipientDid: me.did, acknowledged: false}, {acknowledged: true})
        console.log('AUTH CRYPT PROOF REQ UPDATE-------------------------------------->', authCryptProofReqUpdate);
        
        let authCryptProofReq = await ProofRequest.findOne({did: req.body.recipientDid, recipientDid: me.did, acknowledged: true})
        console.log('AUTHCRYPT PROOF REQ--------------------------------------->', authCryptProofReq);

        let [senderVerkey, authDecryptProofreqJson, authDecryptProofreq] = await encryption.authDecrypt(req.user.userWalletHandle, meVerkey, authCryptProofReq.message)
        console.log('SENDER VERKEY------------------------------------------------->', senderVerkey);
        console.log('authDecryptProofreqJson------------------------------------------>', authDecryptProofreqJson);
        console.log('authDecryptProofreq------------------------------------------------>', authDecryptProofreq);

        let attr_referents = []
        let pred_referents = []
        console.log(Object.keys(authDecryptProofreq).includes('requested_attributes'));
        if(Object.keys(authDecryptProofreq.message).includes('requested_attributes')){
            attr_referents = Object.keys(authDecryptProofreq.requested_attributes)
        }

        console.log(Object.keys(authDecryptProofreq).includes('requested_predicates'));
        if(Object.keys(authDecryptProofreq.message).includes('requested_predicates')){
            predicate_referents = Object.keys(authDecryptProofreq.requested_predicates)
        }
        

        let searchForProofReq = await proofFunc.searchCredentialsForProofReq(req.user.userWalletHandle, authDecryptProofreqJson)

        let credsForAttrs = []
        let credsForAttrsJson = {}
        let credsForProof = {}
        for(attr_referent of attr_referents) {

            let credentials = await proofFunc.fetchCredentialForProofReq(searchForProofReq, [`${attr_referent}`])
            console.log('CREDENTIALS------------------------------------------------------->', credentials);
            credsForAttrs.push(credentials[0]['cred_info'])
            credsForAttrsJson[`${attr_referent}`] = credentials[0]['cred_info']
        }

        if(predicate_referents.length !== 0){
            for(let predicate_referent of predicate_referents){

                let credentials = await proofFunc.fetchCredentialForProofReq(searchForProofReq, predicate_referent)
                console.log('CREDENTIALS------------------------------------------------------->', credentials);
                credsForAttrs.push(credentials[0]['cred_info'])
                credsForAttrsJson[`${predicate_referent}`] = credentials[0]['cred_info']
            }
        }


        await indy.proverCloseCredentialsSearchForProofReq(searchForProofReq)

        for(let creds of credsForAttrs){
            credsForProof[`${creds['referent']}`] = creds
        }

        let [schemaJson, credDefJson, revocStatesJson] = await pool.proverGetEntitiesFromLedger(pool.poolHandle, mePairwise.did, credsForProof, req.body.name)

        let reqCredJson = {
            'self_attested_attributes': {

            },
            'requested_attributes': {

            },
            'requested_predicates': {

            }
        }
        let self_attested_referents = []
        let requested_referents = []
        for(let attr_referent of attr_referents){
            if(Object.keys(authDecryptProofreq.requested_attributes[`${attr_referent}`]).length === 1){
                self_attested_referents.push(attr_referent)
            }else{
                requested_referents.push(attr_referent)
            }

        }

        let self_attested_attributes_values = req.body.values
        let i=0
        for(let attr_referent of self_attested_referents){
            reqCredJson.self_attested_attributes[`${attr_referent}`] = self_attested_attributes_values[Object.keys(self_attested_attributes_values)[i]]
        }

        for(let attr_referent of requested_referents){
                reqCredJson.requested_attributes[`${attr_referent}`] = {'cred_id': credsForAttrsJson[`${attr_referent}`], 'revealed': true}
        }

        for(let predicate_referent of requested_referents){
            reqCredJson.requested_predicates[`${predicate_referent}`] = {'cred_id': credsForAttrsJson[`${predicate_referent}`]}
        }

        let masterSecretId = await MasterSecret.findOne({owner: req.user._id})

        let proofJson = await indy.proverCreateProof(req.user.userWalletHandle, authDecryptProofreqJson, reqCredJson, masterSecretId, schemaJson, credDefJson, revocStatesJson)

        res.send({})


    } catch (e) {
        res.send(e)
    }
})


module.exports = router