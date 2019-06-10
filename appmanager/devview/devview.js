'use strict'
function getUserDoc (logger, req, res, getAll) {
	const sender_psid = req.body.psid
	logger.info('DevView.getUserDoc', {sender_psid:sender_psid})
	getAll(logger, sender_psid, res, render)
}

function render (logger, sender_psid, res, userDoc) {
	logger.info('DevView.render', sender_psid, res)
	let html_body = '<div>'
	html_body += '<p>PSID:</p><p>' + sender_psid + '</p>'
	html_body += '<p>Status:</p><p>' + userDoc.status + '</p>'
	html_body += '<p>Name:</p><p>' + userDoc.name + '</p>'
	res.send(html_body + '</div>')
}

module.exports = {
	'getUserDoc': getUserDoc
}