const
  expect = require('chai').expect,
  sinon = require('sinon'),
  sinonTest = require('sinon-test'),
  test = sinonTest(sinon),
  assert = require('assert'),
  src_path = '../..',
  db_model = require('./crudcontroller'),
  ChatStatus = require('./schema/userstate');
 
describe.skip('chatstatus', function() {
    it('should be invalid if name is empty', function(done) {
        var c = new ChatStatus({name: 'thomas'});
 
        c.validate(function(err) {
            expect(c.name).to.exist;
            done();
        });
    });
    it('should be invalid if the schema reports validation errors', function(done) {
        var c = new ChatStatus({name: 'thomas'});
 
        c.validate(function(err) {
            expect(err).to.not.exist;
            done();
        });
    });
});
describe('db_model functions', function() {
	it('should be able to get names', test(function() {
		this.stub(ChatStatus, 'findOne')
		const expected_name = 'tomothey';
		const fake_psid = '49494';
		var c = new ChatStatus({user_id: fake_psid, name: expected_name});

		db_model.getName(fake_psid, (sender_psid, obj) => {
			assert.calledWith(ChatStatus.findOne, {
				user_id: sender_psid,
				name: expected_name
			})
		})
	}));
});