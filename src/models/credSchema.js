const mongoose = require('mongoose')
const validator = require('validator')
const bcryptjs = require('bcryptjs')
const jwt = require('jsonwebtoken')


const credSchema = new mongoose.Schema({
    did: {
        type: String,
        required: true
    },
    message:{
        type: Buffer,
        required: true
    },
    recipientDid: {
        type: String,
        required: true
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    }, 
    acknowledged: {
        type: Boolean,
        default: false,
        required: true
    }
}, {
    timestamps: true
})

const Credential = mongoose.model('Credential', credSchema)

module.exports = Credential