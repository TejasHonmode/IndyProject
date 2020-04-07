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
const Proof = require('../models/proof/proof')
const assert = require('assert')
const NormalProofReq = require('../models/proof/normalProofReq')

router.post('/createProofReq', auth, async(req, res) => {

    let me = await DidKeyPair.findOne({owner: req.user._id, public: true})
    console.log('ME DID------------------------------>', me.did);
    
    let mePairwise = await DidKeyPair.findOne({owner: req.user._id, public: false, by:me.did, forDid: req.body.recipientDid})
    console.log(mePairwise)

    let forMePairwise = await DidKeyPair.findOne({forDid: me.did, public: false, by: req.body.recipientDid})
    console.log(forMePairwise);

    let proofRequest = await proofFunc.createProofRequest(req.body.name)
    if(req.body.requested_attributes){
        proofRequest.requested_attributes = req.body.requested_attributes
    }
    if(req.body.requested_predicates){
        proofRequest.requested_predicates = req.body.requested_predicates
    }
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

        console.log('proof Req----------->', proofReq);
        

        await proofReq.save()


        res.send({proofReq ,authCryptProofReq})
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
        let predicate_referents = []
        console.log(Object.keys(authDecryptProofreq).includes('requested_attributes'));
        if(Object.keys(authDecryptProofreq).includes('requested_attributes')){
            attr_referents = Object.keys(authDecryptProofreq.requested_attributes)
            console.log('ATTR_REFERENTS----------------------------------------------->', attr_referents);
            
        }

        console.log(Object.keys(authDecryptProofreq).includes('requested_predicates'));
        if(Object.keys(authDecryptProofreq).includes('requested_predicates')){
            predicate_referents = Object.keys(authDecryptProofreq.requested_predicates)
            console.log('PREDICATE REFERENTS-------------------------------------------------->', predicate_referents);
            
        }
        

        let searchForProofReq = await proofFunc.searchCredentialsForProofReq(req.user.userWalletHandle, authDecryptProofreqJson)
        console.log('SEARCH FOR PROOF REQ------------------------------------------------------------>', searchForProofReq);
        

        let credsForAttrs = []
        let credsForAttrsJson = {}
        let credsForProof = {}
        for(let attr_referent of attr_referents) {

            let credentials = await proofFunc.fetchCredentialForProofReq(searchForProofReq, attr_referent)
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
        console.log('CRED FOR ATTRS-------------------------------------------------------------------------->', credsForAttrs)
        console.log('CRED FOR ATTR JSON---------------------------------------------------------------------------->', credsForAttrsJson);
        

        await indy.proverCloseCredentialsSearchForProofReq(searchForProofReq)
        console.log('SEARCH CLOSED------------------------------------------------->');
        

        for(let creds of credsForAttrs){
            credsForProof[`${creds['referent']}`] = creds
        }
        console.log('CREDS FOR PROOF---------------------------------------------------------------------->', credsForProof);
        
        let [schemasJson, credDefsJson, revocStatesJson] = await pool.proverGetEntitiesFromLedger(pool.poolHandle, mePairwise.did, credsForProof, req.body.name)
        console.log('PROVERS LEDGER ENTITIES----------------------------------------------------------------------------->');
        console.log('SCHEMA JSONS------------------------------------------------------------------------------------->', schemasJson);
        console.log('CRED DEF JSONS----------------------------------------------------------------------------------------->', credDefsJson);
        console.log('REVOC STATE JSONS------------------------------------------------------------------------------------>', revocStatesJson);
        
        
        
        

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
        console.log('SELF_ATTESTED REFERENTS------------------------------------------------------------------------------------->', self_attested_referents);
        console.log('REQUESTED REFERENTS-------------------------------------------------------------------------------------------->', requested_referents);
        

        let self_attested_attributes_values = req.body.values
        console.log('SELF_ATTESTED ATTRIBUTE VALUES-------------------------------------------------------------------------->', self_attested_attributes_values);
        
        let i=0
        for(let attr_referent of self_attested_referents){
            reqCredJson.self_attested_attributes[`${attr_referent}`] = self_attested_attributes_values[Object.keys(self_attested_attributes_values)[i]]
            i = i+1
            console.log('i------------------>', i);
            
        }
        let j=0
        for(let attr_referent of requested_referents){
                console.log(credsForAttrsJson[`${attr_referent}`])
                reqCredJson.requested_attributes[`${attr_referent}`] = {'cred_id': credsForAttrsJson[`${attr_referent}`].referent, 'revealed': true}
                j = j+1
                console.log('j------------------------------------>', j);
                
        }

        let k=0
        for(let predicate_referent of predicate_referents){
            console.log(credsForAttrsJson[`${predicate_referent}`]);
            reqCredJson.requested_predicates[`${predicate_referent}`] = {'cred_id': credsForAttrsJson[`${predicate_referent}`].referent}
            k = k+1
            console.log('k----------------------------------------------->', k);
            
        }
        console.log('REQ CRED JSON--------------------------------------------------------------------------------------------->', reqCredJson);
        
        let masterSecretId = await MasterSecret.findOne({owner: req.user._id})
        console.log('MASTER SECRET ID------------------------------------------------------------------------------------------------>', masterSecretId);
        
        let proofJson = await indy.proverCreateProof(req.user.userWalletHandle, authDecryptProofreqJson, reqCredJson, masterSecretId.message, schemasJson, credDefsJson, revocStatesJson)
        console.log('PROOF JSON---------------------------------------------------------------------------------------------------->', proofJson);
        
        let authCryptProof = await encryption.authCrypt(req.user.userWalletHandle, meVerkey, forMeVerkey, proofJson)
        console.log('AUTHCRYPT PROOF---------------------------------------------------------------------------------------------->', authCryptProof);
        
        let proof = new Proof({
            did: me.did,
            message: authCryptProof,
            recipientDid: req.body.recipientDid,
            owner: req.user._id
        })

        await proof.save()

        let normalProofReq = new NormalProofReq({
            did: req.body.recipientDid,
            message: JSON.stringify(authDecryptProofreq),
            self_attested_referents: self_attested_referents,
            requested_referents: requested_referents,
            predicate_referents: predicate_referents,
            recipientDid: me.did,
            owner: authCryptProofReq.owner
        })

        await normalProofReq.save()

        res.send({credsForAttrs, credsForAttrsJson, credsForProof, schemasJson, credDefsJson, revocStatesJson, reqCredJson, masterSecretId, proofJson, authCryptProof, proof})


    } catch (e) {
        res.send(e)
    }
})


router.post('/verifyProof', auth, async(req, res) => {

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


        let authCryptProofUpdate = await Proof.updateOne({did:req.body.recipientDid, recipientDid: me.did, acknowledged: false}, {acknowledged: true})
        console.log('AUTH CRYPT PROOF UPDATE------------------------------------------------>',authCryptProofUpdate);
        
        let authCryptProof = await Proof.findOne({did:req.body.recipientDid, recipientDid: me.did, acknowledged: true})
        console.log('AUTH CRYPT PROOF--------------------------------------------------------->',authCryptProof);
        
        let [,decryptedProofJson, decryptedProof] = await encryption.authDecrypt(req.user.userWalletHandle, meVerkey, authCryptProof.message)
        console.log('DECRYPT PROOF JSON-------------------------------------------------------------------->', decryptedProofJson);
        console.log('DECRYPT PROOF--------------------------------------------------------------------->',decryptedProof);
        

        let [schemasJson, credDefsJson, revocRefDefsJson, revocRegsJson] = await pool.verifierGetEntitiesFromLedger(pool.poolHandle, mePairwise.did, decryptedProof['identifiers'], req.body.actor)
        console.log('SCHEMA JSON-------------------->',schemasJson);
        console.log('CRED DEF JSON-------------------->',credDefsJson);
        console.log('REVOC REF DEF-------------------->',revocRefDefsJson);
        console.log('REVOC REGS',revocRegsJson);
        
        
        let normalProofReq = await NormalProofReq.findOne({did: me.did, recipientDid: req.body.recipientDid})
        console.log('NORMAL PROOF REQ----------------------------------------->', normalProofReq);
        

        let self_attested_values = req.body.self_attested_values
        console.log('SELF ATTESTED VALUES----------------------------------------------------->', self_attested_values);

        let requested_values = req.body.requested_values
        console.log('REQUESTED VALUES----------------------------------------------------------->', requested_values);
        

        let i=0
        for(self_attested_referent of normalProofReq.self_attested_referents){
            console.log(i)
            assert(self_attested_values[Object.keys(self_attested_values)[i]] === decryptedProof['requested_proof']['self_attested_attrs'][self_attested_referent], self_attested_referent+' does not match')
            i=i+1
        }

        let j=0
        for(requested_referent of normalProofReq.requested_referents){
            console.log(j)
            assert(requested_values[Object.keys(requested_values)[j]] === decryptedProof['requested_proof']['revealed_attrs'][requested_referent]['raw'], requested_referent+' does not match')
            j=j+1
        }

        assert(await indy.verifierVerifyProof(JSON.parse(normalProofReq.message), decryptedProofJson, schemasJson, credDefsJson, revocRefDefsJson, revocRegsJson), 'Proof does not match')

        console.log('PROOF VERIFIED--------------------------------->')
        // for()
        res.send({senderDid: req.body.recipientDid, msg: "Proof Verified"})
    } catch (e) {
        res.send(e)
    }

})

module.exports = router