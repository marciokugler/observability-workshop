PYTHON ?= python3

.PHONY: test test-python

test: test-python

test-python:
	$(PYTHON) -m unittest discover -s tests -p 'test_*.py'
