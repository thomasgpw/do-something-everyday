'use strict';

class DSEEventObject {
  constructor(sender_psid, trigger, logger) {
    logger.log('info', 'at DSEEventObject constructor from trigger ' + trigger)
    this._sender_psid = sender_psid
    this._jsonObj = getEventJSON(sender_psid, trigger)
  }
  get response() {
    return this._jsonObj.response
  }
  get next_trigger() {
    return this._jsonObj.next_trigger
  }
  get sender_psid() {
    return this._sender_psid
  }
}

function getEventJSON(sender_psid, trigger, logger) {
  logger.log('info', 'at getEventJSON function from trigger ' + trigger)
  for(var i = 0; i < text_responses.length; i++) {
    if (trigger == text_responses[i].trigger) {
      logger.log('info', 'response text should be set equal to ' + text_responses[i].response.message.text)
      return text_responses[i]
    }
  }
}
function callbackStub (sender_psid, status, userDoc, logger) {
  logger.log('info', {
    sender_psid: sender_psid,
    status: status,
    userDoc: userDoc
  })
}

function processReceivedMessage(sender_psid, received_message, callback, logger) {
  logger.log('info', 'processReceivedMessage encoded received_message string is ' + received_message)
  // callback(sender_psid, useStatus, received_message, logger)
}

function processReceivedPostback(sender_psid, payload, updateStatus, logger) {
  logger.log('info', 'at processReceivedPostback payload is ' + payload)
  updateStatus(sender_psid, payload, callbackStub, logger)
}

function next_call(next_trigger, callback, logger){
  logger.log('info', 'in callback of request in callSendAPI next_trigger is ' + next_trigger)
  if (next_trigger.includes('-')) {
    // applies if we are now expecting to wait to receive input as a user typed message
    callback(sender_psid, next_trigger, logger)
  } else {
    // applies if chaining multiple messages without waiting
    processReceivedPostback(sender_psid, next_trigger, logger)
  }
}

module.exports = {
  'processReceivedMessage': processReceivedMessage,
  'processReceivedPostback': processReceivedPostback,
  'DSEEventObject': DSEEventObject
}