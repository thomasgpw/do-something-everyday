/**
 * @fileoverview StateManager is the main controller module for handling and
 *     communicating between other specialized controller modules
 * @module StateManager
 */

'use strict';
const SimpleCrypto = require('simple-crypto-js').default;

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
function processReceivedMessageText(sender_psid, received_message_text, callback, logger) {
  logger.log('info', 'processReceivedMessageText received_message_text string is ' + received_message_text)
  const text_lower = received_message_text.toLowerCase()
  const escapeCommand = text_lower.match(\b(help|delete)\b)
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
    callback(sender_psid, received_message_text, logger)
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
function processReceivedPostback(sender_psid, payload, updateStatus, logger) {
  logger.log('info', 'at processReceivedPostback payload is ' + payload)
  updateStatus(sender_psid, payload, statusResponse, logger)
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
// function useStatus(sender_psid, obj, received_message) {
//   const status = obj.status
//   if (status.includes('-')) {
//     let [first_trigger, next_trigger] = status.split('-')
//     logger.log('info','in useStatus', { 'first_trigger': toCamel(first_trigger), 'next_trigger': next_trigger, 'received_message': received_message})
//     db_keeper[toCamel(first_trigger)](sender_psid, received_message, next_trigger, runDSEEvent, logger)
//   } else {
//     logger.log('info', 'received unexpected input message', {'status': status, 'received_message': received_message})
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
  'processReceivedMessageText': processReceivedMessageText,
  'processReceivedPostback': processReceivedPostback
}