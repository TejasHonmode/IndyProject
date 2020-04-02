const express = require('express')
const router = new express.Router()
const auth = require('../middleware/auth')
const User = require('../models/user/user')
const userFuncs = require('../functions/user')
const DidKeyPair = require('../models/user/didKeyPair')

router.post('/createDidVerkey', auth,async(req, res) => {
    
    // const id = req.body.id
    // const key = req.body.key
    const info = req.body.info
    const seed = req.body.seed
    console.log(req.body)
    // console.log('User is ------------------------',req.user)
    try {
        // const user = await User.findByCredentials(id, key)
        console.log('------------IN CREATE DID TRY-----------------------')
        if(req.user.userWalletHandle === 0){
            return res.send({error: 'Please open wallet before creating did-key pairs'})
        }

        const userWalletHandle =  req.user.userWalletHandle
        console.log('USER WALLET -------------------', userWalletHandle)
        // const timestamp = console.log('TIME-------------',timestamp())
        const didKeyMetadata = await userFuncs.createDidKey(userWalletHandle, {seed}, info)
        console.log('DIDKEYMETA-----------------', didKeyMetadata)

        

        const didKeyPair = new DidKeyPair({
            id: req.user.id,
            by: didKeyMetadata.did,
            did:didKeyMetadata.did,
            verkey:didKeyMetadata.verkey,
            metadata:didKeyMetadata.metadata,
            owner: req.user._id,
            public: req.body.public
        })
        // user[did] = didKey[did]
        // user[verkey] = didKey[verkey]

        try {
            await didKeyPair.save()
        console.log('Saved------')
        res.send(didKeyMetadata)
        } catch (error) {
            console.log('DID Saving error----------------')
            res.send(error)
        }
        
    } catch (error) {
        res.send(error)
    }
})

router.post('/helo', (req, res) => {
    res.send('Henlo')
})

module.exports = router