#!/bin/sh

rm -rv ./venv
python3 -m venv ./venv/
. ./venv/bin/activate

pip3 install -r ./requirements.txt

mariadb -u metropolia --password=metropolia flight_game < ./data/lp.sql

