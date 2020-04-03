const mongoose = require('mongoose')
const validator = require('validator')


const sampleSchema = new mongoose.Schema({

    did:{
        type: [String]
    }
})

const Sample = mongoose.model('Sample', sampleSchema)

module.exports = Sample