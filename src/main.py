#!/usr/bin/env python3
from flask import Flask, request, send_from_directory
import mariadb
import json
import threading
import random
from customer import Customer


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


def game_get_airport(game_id):
    cur = db.con.cursor()

    query = "SELECT airport FROM game WHERE id=%s"
    cur.execute(query, (game_id,))
    row = cur.fetchone()
    result = row[0]
    cur.close()

    return result


def update_airport(game_id, icao):
    airport_type = db.airport_type_icao(icao)

    customers = db.customers_from_airport(game_id, icao)

    if (len(customers) > 0):
        return

    # Make sure airport has at least N customers
    customers_tier1 = random.randint(0,1)
    customers_tier2 = 0
    match airport_type:
        case "medium_airport":
            customers_tier1 = random.randint(1,3)
            customers_tier2 = 0
        case "large_airport":
            customers_tier1 = random.randint(1,2)
            customers_tier2 = random.randint(1,3)


    for i in range(0, customers_tier1):
        customer = Customer(db)
        customer.generate_tier1(icao)
        customer.save(game_id)

    for i in range(0, customers_tier2):
        customer = Customer(db)
        customer.generate_tier2(icao)
        customer.save(game_id)




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


@app.route('/api/game/<game_id>')
def handle_api_game(game_id):
    mutex.acquire()

    cur = db.con.cursor()

    query = "SELECT * FROM game WHERE id=%s"
    cur.execute(query, (game_id,))
    row = cur.fetchone()
    result = serialize_row(cur, row)

    cur.close()
    mutex.release()
    return result



@app.route('/api/game/<game_id>/customers')
def handle_api_game_customers(game_id):
    mutex.acquire()

    update_airport(game_id, game_get_airport(game_id))

    cur = db.con.cursor()

    # TODO game id
    query = f"SELECT * FROM customer INNER JOIN game WHERE origin = game.airport AND game.id = ? AND game.id = customer.game_id ORDER BY reward_rp DESC LIMIT 5"
    cur.execute(query, (game_id,))

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

