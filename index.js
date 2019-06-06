/*
 * This file and code are modified from an original file from Facebook, Inc.
 * The use is permitted by their license which can be found in their original file heading below.
 *
 * *
 * * Copyright 2017-present, Facebook, Inc. All rights reserved.
 * *
 * * This source code is licensed under the license found in the
 * * LICENSE file in the root directory of this source tree.
 * *
 * * Messenger Platform Quick Start Tutorial
 * *
 * * This is the completed code for the Messenger Platform quick start tutorial
 * *
 * * https://developers.facebook.com/docs/messenger-platform/getting-started/quick-start/
 * *
 * 
 */


 /** GLOBAL CONSTANTS & REQUIREMENTS **/

'use strict';

// Dependency Imports
const request = require('request')
const express = require('express')
const path = require('path')
const body_parser = require('body-parser')
const winston = require('winston');

// Module Imports
const text_responses = require('./text')['text responses']
const db_keeper = require('./db')
const fbm_postal_worker = require('./fbm')
const state_manager = require('./sm')
const dev_view = require('./devview')
const app = express()
const logger = winston.createLogger({
    transports: [
        new winston.transports.Console()
    ]
  });

// express http server config
logger.log('info', 'logger initiated')
app.use(body_parser.json())
app.use(body_parser.urlencoded({ extended: false })); 
app.listen(process.env.PORT || 1337, () => logger.log('info','Express server is listening'));


/** SITE ROUTING **/

// Accepts GET requests at the /privacypolicy endpoint
app.get('/privacypolicy', (req, res) => {
  res.sendFile(path.join(__dirname, 'privacypolicy.html'))
})

// Accepts both POST and GET at /webhook
app.route('/webhook')
  .post((req, res) => {  
    fbm_postal_worker.receive(req, res,
      state_manager.processReceivedMessageText, state_manager.processReceivedPostback,
      db_keeper.updateStatus, logger)
  })
  .get((req, res) => {
    fbm_postal_worker.verify(req, res, logger)
  });

// Accepts both POST and GET at /dev or /dev/login
app.route('/dev(/login)?')
  .get((req, res) => {
    res.sendFile(path.join(__dirname, 'devview/login.html'))
  })
  .post((req, res) => {
    if (req.body.password === process.env.DEV_PASSWORD) {
      dev_view.getUserDoc(req, res, db_keeper.getAll, logger)
    } else {
      logger.log('error', 'dev password does not match recorded password')
      res.sendStatus(403);
    }
  })


/**  CONTROLLER LOGIC **/

// function requestMongoData(sender_psid, dseEventObj, text_tags, callback) {
//   logger.log('info', 'at requestMongoData function with response ' + dseEventObj.response.message.text, {'text_tags': text_tags})  
//   var tag_replacements = text_tags.slice(0)
//   text_tags.forEach((tag, i) => {
//     tag_replacements[i] = useName(sender_psid, db_keeper.byTag(sender_psid, tag, logger))
//   })
// }

// function useName(sender_psid, obj) {
//   const simpleCrypto = new SimpleCrypto(sender_psid+'DSE')
//   const real_name = simpleCrypto.decrypt(obj.name)
//   logger.log('info', 'in useName name is ' + real_name)
//   return real_name
// }

// function runDSEEvent(sender_psid, status, userDoc) {
//   logger.log('info', 'inside runDSEEvent callback')
//   const dseEventObj = new state_manager.DSEEventObject(sender_psid, status, logger)
//   var response_text = dseEventObj.response.message.text
//   const text_tags = response_text.match(/\/([A-Z]+)\//g)
//   if (text_tags) {
//     requestMongoData(sender_psid, dseEventObj, text_tags, fbm_postal_worker.callSendAPI)
//   } else {
//     fbm_postal_worker.callSendAPI(sender_psid, dseEventObj.response, dseEventObj.next_trigger, logger)
//   }
// }
