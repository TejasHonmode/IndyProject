const express = require('express')
require('./db/mongoose')

const path = require('path')

const hbs = require('hbs')
const bodyParser = require('body-parser')


const pool = require('./functions/pool.js')
// const userFuncs = require('./functions/user')

const userRouter = require('./routers/user')
const didKeyPairRouter = require('./routers/did')
const connectionRouter = require('./routers/connection')
const credentialRouter = require('./routers/credentials')
const proofRouter = require('./routers/proof')
// const forecast = require('./utils/forecast')
// const geocode = require('./utils/geocode')

const app = express()
const port = process.env.PORT || 3000

const publicDirectoryPath = path.join(__dirname, '../public')
const viewsPath = path.join(__dirname, '../templates/views')
const partialsPath = path.join(__dirname, '../templates/partials')

const urlencodedParser = bodyParser.json()

app.set('view engine', 'hbs')
app.set('views', viewsPath)
hbs.registerPartials(partialsPath)

app.use(express.json())
app.use(express.static(publicDirectoryPath))
app.use(userRouter)
app.use(didKeyPairRouter)
app.use(connectionRouter)
app.use(credentialRouter)
app.use(proofRouter)

// app.use(express.bodyParser());


app.get('/index', (req, res) => {
    res.render('index')
})

app.get('/pool', urlencodedParser,async (req, res) => {

    if(!req.query.poolName){
        
        return res.send({
            error: 'Sorry no pool name provided'
            })
    }

    pool.poolHandle = await pool.poolCreation(req.query.poolName)
    console.log('POOL HANDLE-----------------', pool.poolHandle)
    res.send({poolName: req.query.poolName, poolHandle: pool.poolHandle})

    // try {
    //     if(!req.query.poolName){
    //         return res.send({
    //             error: 'Sorry no pool name provided'
    //         })
    //     }
    //     await poolCreation(req.query.poolName)
    //     res.send({poolName: req.query.poolName})
    // } catch (error) {
    //     res.status(500).send('Error')
    // }
    

})

// app.post('/createUserWallet', urlencodedParser, async(req, res) => {
//     // res.send(req.body)
//     //console.log(req.body.name)
//     try {
//         const did_key = await userFuncs(req.body.name, req.body.id, req.body.key, req.body.refid)
//         // console.log(did_key)
//         res.send(did_key)
//     } catch (e) {
//         res.send(e)
//     }

//     //console.log(did_key)

    
// })



app.listen(port, () => {
    console.log('Up on port '+port)
})