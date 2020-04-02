const express = require('express')
const router = new express.Router()
const bodyParser = require('body-parser')
const userFuncs = require('../functions/user')
const User = require('../models/user/user')
const timestamp = require('timestamp')
const auth = require('../middleware/auth')
const urlencodedParser = bodyParser.json()


router.post('/createuserwallet', urlencodedParser, async(req, res) => {
    // res.send(req.body)
    //console.log(req.body.name)

    try {

        const userWalletHandle = await userFuncs.createUserWallet(req.body.name, req.body.id, req.body.key)

        if(req.body.role){
            let user = new User({
                name: req.body.name,
                id: req.body.id,
                key: req.body.key,
                userWalletHandle,
                role: req.body.role
            })

            await user.save()
        console.log('---saved---------------')
        let token = await user.generateAuthToken()
        return res.send({user, token})

        }else{
            let user = new User({
                name: req.body.name,
                id: req.body.id,
                key: req.body.key,
                userWalletHandle,
                role: req.body.role
            })

            await user.save()
        console.log('---saved---------------')
        let token = await user.generateAuthToken()
        return res.send({user, token})
        }
        
        //console.log(did_key_handle)
        // const user = new User({
        //     name: req.body.name,
        //     id: req.body.id,
        //     key: req.body.key,
        //     userWalletHandle
        // })
        // await user.save()
        // console.log('---saved---------------')
        // let token = await user.generateAuthToken()
        // res.send({user, token})
    } catch (e) {
        res.send(e)
    }

    //console.log(did_key)

    
})

// router.patch('/createDidVerkey', auth,async(req, res) => {
    
//     const id = req.body.id
//     const key = req.body.key

//     try {
//         const user = await User.findByCredentials(id, key)

//         if(user.userWalletHandle === 0){
//             return res.send({error: 'Please open wallet before creating did-key pairs'})
//         }

//         const userWalletHandle =  user.userWalletHandle

//         const didKey = await userFuncs.createDidKey(userWalletHandle, {seed: req.body.seed, timestamp: timestamp()})


//         res.send(didKey)
        
//         user[did] = didKey[did]
//         user[verkey] = didKey[verkey]
//         await user.save()
//         console.log('Saved------')
//     } catch (error) {
//         res.send(error)
//     }
// })

router.patch('/openwallet', async(req, res) => {
    
    const id = req.body.id
    const key = req.body.key

    try {

        const user = await User.findByCredentials(id, key)
        console.log(user)
        if(!user){
            return res.status(500).send({error:'No such user'})
        }

        if(user.userWalletHandle !==0){
            return res.send({error: 'Wallet already opened'})
        }

        // const userWalletHandle = await 
        const userWalletHandle = await userFuncs.openWallet({id}, {key})
        // .then(data => {
        //     console.log("------open wallet handle-------", data);
        // })
        console.log('WALLET HANDLE-----------------',userWalletHandle)
        const token = await user.generateAuthToken()
        await User.updateOne({id}, {userWalletHandle})
        //user[userWalletHandle] = userWalletHandle
        console.log('Updated')
        await user.save()

        res.send({user, token})
    } catch (e) {
        res.send(e)
    }

})

router.patch('/closewallet', auth,async(req, res) => {
    console.log('in function.....')
    const id = req.body.id
    const key = req.body.key
    
    try {
        console.log('In try....')
        console.log(req.body)
        const user = await User.findByCredentials(id, key)
        console.log(user)
        if(user.userWalletHandle === 0){
            console.log('NO USER-----------------------------')
            return res.send('No such user')
        }
        console.log('WALLET HANDLE ---------------------',user.userWalletHandle)

        
        const msg = await userFuncs.closeWallet(user.userWalletHandle)
        console.log(msg)
        var resu = await User.updateOne({id}, {userWalletHandle: 0});
        //user[userWalletHandle] = 0
        console.log(resu);
        console.log('User HANDLE --------------------', user[userWalletHandle])
        // await user.save()
        
        req.user.tokens = []
        await req.user.save()

        return res.send({msg, user})
    } catch (e) {
        res.send(e)
    }
    
    
})


router.delete('/deletewallet', auth,async(req, res) => {
    
    const id = req.body.id
    const key = req.body.key

    try {

        const user = await User.findByCredentials(id, key)
        console.log(user)
        if(!user){
            return res.send('No such user')
        }

        if(user.userWalletHandle !== 0){
            return res.send({msg: 'Wallet is not closed'})
        }

        const msg = await userFuncs.deleteWallet({id}, {key})
        console.log(msg)
        
        const user_del = await User.deleteOne({id})
        res.send(user_del)
    } catch (e) {
        res.send(e)
    }
    
    
})


router.post('/createOrgWallet', urlencodedParser, async(req, res) => {
    // res.send(req.body)
    //console.log(req.body.name)
    try {
        let did_key = await userFuncs.createOrgWallet(req.body.name, req.body.id, req.body.key, req.body.seed)
        // console.log(did_key)
        res.send(did_key)
    } catch (e) {
        res.send(e)
    }

    //console.log(did_key)

    
})

// const create_and_send_schema()


// {
//     "name": "Tejaboi",
//     "id": "namas4443333444434334444345699993namas44433334444343",
//     "key": "56465465474567",
//     "seed": "569999gt9956"
//  }


module.exports = router