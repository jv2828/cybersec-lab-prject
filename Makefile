.PHONY: demo run test seed build

demo:
	./run_demo.sh

run:
	./run_demo.sh

seed:
	PYTHONPATH=. ./backend/venv/bin/python -m backend.app.seed.generator

test:
	PYTHONPATH=. ./backend/venv/bin/pytest backend/tests

build:
	cd frontend && npm run build
