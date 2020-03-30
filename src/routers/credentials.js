const express = require('express')
const router = new express.Router()
const auth = require('../middleware/auth')
const User = require('../models/user')
const CredentialSchema = require('../models/credentialSchema')
const credentialsFunc = require('../functions/credentials')
const pool = require('../functions/pool')
const DidKeyPair = require('../models/didKeyPair')
const CredentialDefinition = require('../models/credentialDefinition')


router.post('/createSchema', auth, async(req, res) => {


    let me = await DidKeyPair.findOne({owner: req.user._id, public: true})
    
    console.log('SCHEMA ME DID------->', me.did);
    
    
    try {
        console.log('IN SCHEMA TRY');
        let attrNames = req.body.attrNames.split(' ')
        console.log('ATTRIBUTES------->', attrNames)
        let schemaInfo = await credentialsFunc.createSchema(me.did, req.body.name, attrNames)
        console.log('SCHEMA INFO---------------------->', schemaInfo)

        let sentSchemaInfo = await credentialsFunc.sendSchema(pool.poolHandle, req.user.userWalletHandle, me.did, schemaInfo.schema)

        let Schema = new CredentialSchema({
            ver: schemaInfo.schema.ver,
            id: schemaInfo.schemaId,
            name: schemaInfo.schema.name,
            version: schemaInfo.schema.version,
            // attrNames: schemaInfo.schema.attrNames,
            attrNames: req.body.attrNames,
            seqNo: schemaInfo.schema.seqNo,
            // ...schemaInfo.schema,
            did: me.did,
            owner: req.user._id
        })

        

        await Schema.save()
        res.send({schemaInfo, sentSchemaInfo})
    } catch (e) {
        res.send(e)        
    }
})

router.post('/getSchema', auth,async(req, res) => {

    let me = await DidKeyPair.findOne({owner: req.user._id, public: true})
    
    let getSchemaInfo = await CredentialSchema.findOne({name:req.body.name})
    console.log('SCHEMA ---------------> ', getSchemaInfo);
        
    // else{
    //     let schema = await CredentialSchema.findOne({id:req.body.id})
    // }
    
    
    try {
        console.log('schema id ----------->', getSchemaInfo.id)
        let schema = await credentialsFunc.getSchema(me.did, getSchemaInfo.id, pool.poolHandle)
        console.log('SCHEMA INFO -------------------->',schema)
        res.send({schema})
    } catch (e) {
        res.send(e)
    }
})

router.post('/createCredDef', auth, async(req, res) => {

    let me = await DidKeyPair.findOne({owner: req.user._id, public: true})
    console.log('ME DID----------->', me.did)
    let schemaInfo = await CredentialSchema.findOne({name: req.body.name})
    // if(req.body.name){
    //     let schemaInfo = await CredentialSchema.findOne({name})
    // }
    // if()
    let schema = await credentialsFunc.getSchema( me.did, schemaInfo.id, pool.poolHandle)
    console.log('SCHEMA----------------->', schema);
    
    let credDefInfo = await credentialsFunc.createCredDef(req.user.userWalletHandle, me.did, schema.schema)
    console.log('CRED DEF CREATED------------------->', credDefInfo);
    
    let  sentCredDefInfo = await credentialsFunc.sendCredDef(pool.poolHandle, req.user.userWalletHandle, me.did, credDefInfo.credDef)
    console.log('CREDDEF SENT--------------->', sentCredDefInfo);
    
    try {
        let credDef = new CredentialDefinition({
            ver: credDefInfo.credDef.ver,
            id: credDefInfo.credDefId,
            schemaName: req.body.name,
            schemaId: schemaInfo.id,
            owner: req.user._id
        })
        await credDef.save()
        res.send({credDefInfo, sentCredDefInfo})
    } catch (e) {
        res.send(e)
    }
    
})

router.post('/getCredDef', auth,async(req, res) => {

    let me = await DidKeyPair.findOne({owner: req.user._id, public: true})
    console.log('ME DID----------->', me.did);
    
    try {

        if(req.body.credDefId){
            let credDef = await credentialsFunc.getCredDef(pool.poolHandle, me.did, credDefId)
            console.log('CRED DEF---------------------------->', credDef);
            
        }else{
            let credDefInfo = await CredentialDefinition.findOne({schemaName: req.body.name})
            console.log('CRED DEF INFO------------------------->', credDefInfo);
            
            let credDef = await credentialsFunc.getCredDef(pool.poolHandle, me.did, credDefInfo.id)
            console.log('CRED DEF ---------------------------->', credDef);
            return res.send(credDef)   
        }
    } catch (e) {
        res.send(e)
    }
})


router.post('/sample', (req, res) => {

    res.send(req.body.creds.split(' '))
})

module.exports = router