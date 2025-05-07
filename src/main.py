#!/usr/bin/env python3
from flask import Flask, request, send_from_directory
import mariadb
import json
import threading


from database import Database

# MariaDB/MySQL connector is not thread safe, while flask requests are
# threaded ???
# TODO fix this the proper way
mutex = threading.Lock()

db = Database();


# This function automatically creates an object from a row, automatically
# determining the field names from the database columns.
def serialize_row(cur, row):
    result = {}
    for i in range(0, len(cur.description)):
        colname = cur.description[i][0]
        result[colname] = row[i]
    return result




app = Flask(__name__)

@app.route('/<path:path>')
def send_js(path):
    return send_from_directory('www', path)


@app.route('/api/airport/ident/<icao>')
def handle(icao):
    mutex.acquire()
    cur = db.con.cursor()
    query = "SELECT * FROM airport WHERE ident=%s"
    cur.execute(query, (icao,))
    row = cur.fetchone()
    result = serialize_row(cur, row)
    cur.close()
    mutex.release()
    return result


@app.route('/api/games')
def handle_api_games():
    mutex.acquire()

    cur = db.con.cursor()
    query = "SELECT * FROM game"
    cur.execute(query)

    results = []
    for row in cur:
        result = serialize_row(cur, row)
        results.append(result)

    cur.close()

    mutex.release()
    return results


@app.route('/api/airport/type/<airport_type>')
def handle_api_airport_query(airport_type):
    mutex.acquire()

    # TODO: Filters, eq min/max GPS coordinates
    bounds = request.args.get('bounds')
    print(bounds)

    cur = db.con.cursor()

    if bounds != None:
        bounds_json = json.loads(bounds)
        query = """
            SELECT * FROM airport WHERE type=%s
            AND longitude_deg > %s
            AND longitude_deg < %s
            AND latitude_deg > %s
            AND latitude_deg < %s
        """

        print(bounds_json["min"]["lng"])
        cur.execute(query, (airport_type,
                            bounds_json["min"]["lng"],
                            bounds_json["max"]["lng"],
                            bounds_json["min"]["lat"],
                            bounds_json["max"]["lat"],
                            ))
    else:
        query = "SELECT * FROM airport WHERE type=%s"
        cur.execute(query, (airport_type,))

    results = []

    for row in cur:
        result = serialize_row(cur, row)
        results.append(result)
    cur.close()
    mutex.release()
    return results



if __name__ == '__main__':
    app.run(use_reloader=True, host='127.0.0.1', port=3000)

