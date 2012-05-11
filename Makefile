TESTS = test/*.js

test:
	@./node_modules/mocha/bin/mocha --reporter dot $(TESTFLAGS) $(TESTS)

.PHONY: test
