const mongoose = require('mongoose')
const validator = require('validator')
const bcryptjs = require('bcryptjs')
const jwt = require('jsonwebtoken')


const masterSecretSchema = new mongoose.Schema({
    did: {
        type: String,
        required: true
    },
    message:{
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

const MasterSecret = mongoose.model('MasterSecret', masterSecretSchema)

module.exports = MasterSecret