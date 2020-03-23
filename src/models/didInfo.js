const mongoose = require('mongoose')
const validator = require('validator')

const didInfoSchema = new mongoose.Schema({
    did: {
        type: String,
        required: true
    },
    verkey: {
        type: String,
        required: true
    },
    fromToKey: {
        type: String,
        required: true
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    }, 
    recipientDid: {
        type: String,
        required: true
    },
    role: {
        type: String,
        required: true
    }
}, {
    timestamps: true
})

const DidInfo = mongoose.model('DidInfo', didInfoSchema)

module.exports = DidInfo