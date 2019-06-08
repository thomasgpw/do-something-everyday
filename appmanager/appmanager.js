/**
 * @fileoverview AppManager is the main controller module for handling and
 *     communicating between other specialized controller modules
 * @module AppManager
 */

'use strict';

// Dependency Imports
const request = require('request')
const express = require('express')
const path = require('path')
const body_parser = require('body-parser')
const winston = require('winston');
const SimpleCrypto = require('simple-crypto-js').default;

// Module Imports
const FacebookMessengerManager = require('./facebookmessengermanager')
const DatabaseManager = require('./databasemanager')
const DevView = require('./devview')

const text_responses = require('./script')['text responses']
const logger = winston.createLogger({
    transports: [
        new winston.transports.Console()
    ]
  });
logger.log('info', 'logger initiated');

function setUpApp() {
  logger.log('info', 'setting up app')
  const app = express()

  // express http server config
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
      FacebookMessengerManager.receive(req, res,
        processReceivedMessageText, processReceivedPostback,
        logger)
    })
    .get((req, res) => {
      FacebookMessengerManager.verify(req, res, logger)
    });

  // Accepts both POST and GET at /dev or /dev/login
  app.route('/dev(/login)?')
    .get((req, res) => {
      res.sendFile(path.join(__dirname, 'appmanager/devview/login.html'))
    })
    .post((req, res) => {
      if (req.body.password === process.env.DEV_PASSWORD) {
        DevView.getUserDoc(req, res, DatabaseManager.getAll, logger)
      } else {
        logger.log('error', 'dev password does not match recorded password')
        res.sendStatus(403);
      }
    })
  return app;
}
/**
 * from https://matthiashager.com/converting-snake-case-to-camel-case-object-keys-with-javascript
 * 
 * @param {string} s - a_string_in_snake_case
 * @return {string} aStringInCamelCase
 */
const toCamel = (s) => {
  return s.toLowerCase().replace(/([-_][a-z])/ig, ($1) => {
    return $1.toUpperCase()
      .replace('-', '')
      .replace('_', '');
  });
};


function statusResponse(sender_psid, status, logger) {
  logger.log('info', 'in statemanager.statusResponse', {
    sender_psid: sender_psid,
    status: status
  })
  if (status.includes('-')) {
    logger.log('debug', 'the status requests user input before another event in text.json')
  } else {
    logger.log('debug', 'the status is the trigger for an event in text.json')
  }
}

/**
 * Receives text from messages sent via POST to the /webhook endpoint and
 *     calls the next relevant function
 * 
 * @param {string} sender_psid - the unique string that Facebook asociates and
 *     provides with individual users who communicate with DSE.
 * @param {string} received_message_text - the text of the message that was in
 *     the body of the request that was received.
 * @param {Winston} logger - the Winston logger
 */
function processReceivedMessageText(sender_psid, received_message_text, logger) {
  logger.log('info', 'processReceivedMessageText received_message_text string is ' + received_message_text)
  const text_lower = received_message_text.toLowerCase()
  const escapeCommand = text_lower.match(/\b(help|delete)\b/)
  if (escapeCommand) {
    if (escapeCommand.includes('help')) {
      sendHelp(sender_psid, logger)
    } else if (escapeCommand[0] === 'delete') {
      processEscapeCommand(sender_psid, text_lower, logger)
    }
  } else {
    const simpleCrypto = new SimpleCrypto(sender_psid+'DSE')
    const encrypted_text = simpleCrypto.encrypt(received_message_text.text)
    logger.log('info', {'encrypted_text': encrypted_text});
    // callback(sender_psid, received_message_text, logger)
  }
}

/**
 * Receives postback from messages sent via POST to the /webhook endpoint and
 *     calls the next relevant function.
 * 
 * @param {string} sender_psid - the unique string that Facebook asociates and
 *     provides with individual users who communicate with DSE
 * @param {string} payload - the paylopad status trigger that was in the body
 *     of the request that was received
 * @param {Function({string} sender_psid, {string} command, {Winston} logger)}
 *     payload - the paylopad status trigger that was in the body of the
 *     request that was received
 * @param {Winston} logger - the Winston logger
 */
function processReceivedPostback(sender_psid, payload, logger) {
  logger.log('info', 'at processReceivedPostback payload is ' + payload)
  DatabaseManager.updateStatus(sender_psid, payload, statusResponse, logger)
}

/**
 * Sends a formatted string to callSendAPI which informs the user of DSE's
 *     escape commands and legal information.
 *
 * @param {string} sender_psid - the unique string that Facebook asociates and
 *     provides with individual users who communicate with DSE
 * @param {Winston} logger - the Winston logger
 */
function sendHelp(sender_psid, logger) {}

/**
 * Parses the command string for a target doc or field to delete from the db
 *     and asks for conformation if valid, sends help string if the command
 *     is invalid
 *
 * @param {string} sender_psid - the unique string that Facebook asociates and
 *     provides with individual users who communicate with DSE
 * @param {string} command - the string taken from received message text
 *     converted to lowercase
 * @param {Winston} logger - the Winston logger
 */
function confirmDelete(sender_psid, command, logger) {}




/** OLD CONTROLLER LOGIC **/

// function requestMongoData(sender_psid, dseEventObj, text_tags, callback) {
//   logger.log('info', 'at requestMongoData function with response ' + dseEventObj.response.message.text, {'text_tags': text_tags})  
//   var tag_replacements = text_tags.slice(0)
//   text_tags.forEach((tag, i) => {
//     tag_replacements[i] = useName(sender_psid, DatabaseManager.byTag(sender_psid, tag, logger))
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
//   const dseEventObj = new DSEEventObject(sender_psid, status, logger)
//   var response_text = dseEventObj.response.message.text
//   const text_tags = response_text.match(/\/([A-Z]+)\//g)
//   if (text_tags) {
//     requestMongoData(sender_psid, dseEventObj, text_tags, FacebookMessengerManager.callSendAPI)
//   } else {
//     FacebookMessengerManager.callSendAPI(sender_psid, dseEventObj.response, dseEventObj.next_trigger, logger)
//   }
// }
// class DSEEventObject {
//   constructor(sender_psid, trigger, logger) {
//     logger.log('info', 'at DSEEventObject constructor from trigger ' + trigger)
//     this._sender_psid = sender_psid
//     this._jsonObj = getEventJSON(sender_psid, trigger)
//   }
//   get response() {
//     return this._jsonObj.response
//   }
//   get next_trigger() {
//     return this._jsonObj.next_trigger
//   }
//   get sender_psid() {
//     return this._sender_psid
//   }
// }
// function getEventJSON(sender_psid, trigger, logger) {
//   logger.log('info', 'at getEventJSON function from trigger ' + trigger)
//   for(var i = 0; i < text_responses.length; i++) {
//     if (trigger == text_responses[i].trigger) {
//       logger.log('info', 'response text should be set equal to ' + text_responses[i].response.message.text)
//       return text_responses[i]
//     }
//   }
// }
// function next_call(next_trigger, callback, logger){
//   logger.log('info', 'in callback of request in callSendAPI next_trigger is ' + next_trigger)
//   if (next_trigger.includes('-')) {
//     // applies if we are now expecting to wait to receive input as a user typed message
//     callback(sender_psid, next_trigger, logger)
//   } else {
//     // applies if chaining multiple messages without waiting
//     processReceivedPostback(sender_psid, next_trigger, logger)
//   }
// }

module.exports = {
  'setUpApp': setUpApp
}