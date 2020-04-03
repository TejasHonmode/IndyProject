const mongoose = require('mongoose')
const validator = require('validator')
const bcryptjs = require('bcryptjs')
const jwt = require('jsonwebtoken')


const normalProofReqSchema = new mongoose.Schema({
    did: {
        type: String,
        required: true
    },
    message:{
        type: String,
        required: true
    },
    self_attested_referents:{
        type: [String]
    },
    requested_referents: {
        type: [String]
    },
    predicate_referents: {
        type: [String]
    },
    recipientDid: {
        type: String,
        required: true
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    }
}, {
    timestamps: true
})

const NormalProofReq = mongoose.model('NormalProofReq', normalProofReqSchema)

module.exports = NormalProofReq