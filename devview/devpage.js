function render (req, res, logger) {
	const sender_psid = req.body.psid
	logger.log('info', 'devpage render function', sender_psid)
	res.send('<p>success</p>')
}
module.exports = {
	render: render
}