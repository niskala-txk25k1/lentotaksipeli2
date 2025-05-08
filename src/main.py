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


@app.route('/api/game/<game_id>/airport/<icao>/facilities')
def handle_api_facilities(game_id, icao):
    mutex.acquire()

    cur = db.con.cursor()
    query = """
        SELECT hangar.id
        FROM game, hangar, airport

        WHERE airport.ident = ?
        AND game.id = ?
        AND hangar.airport = airport.ident
        ;
    """
    cur.execute(query, (icao,game_id))
    row = cur.fetchone()

    result = {}
    result["hangar"] = False
    result["refuel"] = True

    if row != None:
        result["hangar"] = True

    print(row)

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

@app.route('/api/game/new')
def handle_api_game_new():
    mutex.acquire()

    db.new_game()

    mutex.release()
    return {}


@app.route('/api/reset')
def handle_api_reset():
    mutex.acquire()

    db.reset()

    mutex.release()
    return {}

@app.route('/api/game/<game_id>/delete')
def handle_api_game_delete(game_id):
    mutex.acquire()

    cur = db.con.cursor()

    cur.execute("SET FOREIGN_KEY_CHECKS=0;")

    query = "DELETE FROM hangar WHERE game_id = ?"
    cur.execute(query, (game_id,))

    query = "DELETE FROM aircraft WHERE game_id = ?"
    cur.execute(query, (game_id,))

    query = "DELETE FROM game WHERE id = ?"
    cur.execute(query, (game_id,))
    cur.execute("SET FOREIGN_KEY_CHECKS=1;")

    cur.close()

    mutex.release()
    return {}

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

def update_range(result):
    result["range_h"] = result["fuel"] / result["fuel_consumption_lph"]
    result["range"] = result["range_h"] * result["speed_kmh"]


@app.route('/api/game/<game_id>/current_aircraft')
def handle_api_current_aircraft(game_id):
    mutex.acquire()

    result = query_current_aircraft(game_id)

    mutex.release()
    return result



def query_current_aircraft(game_id):
    cur = db.con.cursor()
    query = "SELECT aircraft.* FROM aircraft INNER JOIN game WHERE game.id=? AND game.aircraft = aircraft.id"
    cur.execute(query, (game_id,))
    row = cur.fetchone()
    result = serialize_row(cur, row)
    update_range(result)
    cur.close()

    return result


def query_current_airport(game_id):
    cur = db.con.cursor()
    query = "SELECT airport FROM game WHERE id = ?"
    cur.execute(query, (game_id,))
    row = cur.fetchone()
    cur.close()
    return row[0]

@app.route('/api/game/<game_id>/set_airport/<icao>')
def handle_api_set_airport(game_id, icao):
    mutex.acquire()
    cur = db.con.cursor()

    query = "UPDATE game SET airport = ? WHERE id=?"
    cur.execute(query, (icao, game_id))

    cur.close()
    mutex.release()
    return "ok"


@app.route('/api/game/<game_id>/refuel')
def handle_api_refuel(game_id):
    mutex.acquire()
    cur = db.con.cursor()


    aircraft = query_current_aircraft(game_id)

    refuel_price = (aircraft["fuel_max"] - aircraft["fuel"]) * 1.1

    query = "UPDATE aircraft, game SET aircraft.fuel = aircraft.fuel_max WHERE game.id = ? AND aircraft.id = game.aircraft"
    cur.execute(query, (game_id,))


    query = "UPDATE game SET game.money = game.money - ? WHERE game.id = ?;"
    cur.execute(query, (refuel_price, game_id,))

    cur.close()
    mutex.release()
    return "ok"


@app.route('/api/game/<game_id>/fly_to/<icao>')
def handle_api_flyto_airport(game_id, icao):
    mutex.acquire()

    aircraft = query_current_aircraft(game_id)
    origin = query_current_airport(game_id)

    print(origin)
    print(icao)

    distance = db.icao_distance(origin, icao)

    # TODO fuel calc

    print(distance)

    flight_hours = distance / aircraft["speed_kmh"]

    print(flight_hours)

    fuel_cost = flight_hours * aircraft["fuel_consumption_lph"]


    if aircraft["fuel"] < fuel_cost:
        mutex.release()
        return {"success": False, "message": "Not enough fuel"}


    cur = db.con.cursor()

    query = "UPDATE game SET airport = ? WHERE id=?"
    cur.execute(query, (icao, game_id))


    query = "UPDATE aircraft SET fuel = fuel - ? WHERE id=?"
    cur.execute(query, (fuel_cost, aircraft["id"]))

    mutex.release()
    return {"success": True, "message": ""}



@app.route('/api/game/<game_id>/try_contracts')
def handle_api_game_try_contracts(game_id):
    mutex.acquire()
    cur = db.con.cursor()

    query = """
        SELECT customer.id FROM customer, game WHERE
        game.id=? AND
        customer.game_id = game.id AND
        customer.destination = game.airport AND
        customer.accepted = 1
        LIMIT 1
    """
    cur.execute(query, (game_id,))
    row = cur.fetchone()

    if row == None:
        cur.close()
        mutex.release()
        return {"success": False, "message": ""}

    customer = db.customer_by_id(row[0])

    cur.execute("UPDATE game SET game.money = game.money + ?, game.rp = game.rp + ? WHERE game.id = ?",
        (customer.reward, customer.reward_rp, game_id)
    )
    customer.drop()
    text = f"You have completed {customer.name}'s flight.<br>+${customer.reward}, +{customer.reward_rp} rp"
    cur.close()
    mutex.release()
    return {"success": True, "message": text}


@app.route('/api/game/<game_id>/customers')
def handle_api_game_customers(game_id):
    mutex.acquire()

    update_airport(game_id, game_get_airport(game_id))

    cur = db.con.cursor()

    # TODO game id
    query = f"SELECT customer.* FROM customer INNER JOIN game WHERE origin = game.airport AND game.id = ? AND game.id = customer.game_id AND customer.accepted = 0 ORDER BY reward_rp DESC LIMIT 5"
    cur.execute(query, (game_id,))

    results = []
    for row in cur:
        result = serialize_row(cur, row)
        results.append(result)

    cur.close()
    mutex.release()
    return results


@app.route('/api/game/<game_id>/passengers')
def handle_api_game_passengers(game_id):
    mutex.acquire()

    update_airport(game_id, game_get_airport(game_id))

    cur = db.con.cursor()

    # TODO game id
    query = f"SELECT * FROM customer, game WHERE game.id = ? AND game.id = customer.game_id AND customer.accepted = 1"
    cur.execute(query, (game_id,))

    results = []
    for row in cur:
        result = serialize_row(cur, row)
        results.append(result)

    cur.close()
    mutex.release()
    return results


@app.route('/api/game/<game_id>/customer/<customer_id>/accept')
def handle_api_game_accept_customer(game_id, customer_id):
    mutex.acquire()

    customer = db.customer_by_id(customer_id)

    aircraft = query_current_aircraft(game_id)

    if aircraft["comfort"] < customer.min_comfort:
        mutex.release()
        return {"success": False, "message": "Insufficient comfort grade"}

    customer.accept()

    mutex.release()
    return {"success": True}


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

