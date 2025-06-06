import mariadb
import types
from geopy.distance import great_circle
from geopy.distance import geodesic

from customer import Customer

# Change this value to cause database to reset
SCHEMA_VERSION = "lentopeli2_v0.13"

class Database():
    def __init__(self):
        self.con = mariadb.connect(
            host='127.0.0.1',
            port=3306,
            database='flight_game',
            user='metropolia',
            password='metropolia',
            autocommit=True
        )

        # Reset the database if metadata is missing or schema is wrong version
        try:
            version = self.metadata_get("schema")
            if (version != SCHEMA_VERSION):
                self.reset()
        except:
            self.reset()

        # reset anyway
        #self.reset()



     # Write the database schema here !!!
    def reset(self):
        print("Resetting database")
        cur = self.con.cursor()

        cur.execute("SET FOREIGN_KEY_CHECKS=0;")


        # Clean lp.sql example tables
        cur.execute("DROP TABLE IF EXISTS goal_reached;")
        cur.execute("DROP TABLE IF EXISTS goal;")
        cur.execute("DROP TABLE IF EXISTS game;")


        cur.execute("DROP TABLE IF EXISTS metadata;")
        cur.execute("""
            CREATE TABLE metadata (
                id    VARCHAR(50) NOT NULL,
                value VARCHAR(50) NOT NULL,
                PRIMARY KEY (id)
            );
        """)


        cur.execute("DROP TABLE IF EXISTS aircraft;")
        cur.execute("""
        CREATE TABLE aircraft (
            id             int     NOT NULL AUTO_INCREMENT,
            game_id INT,
            name VARCHAR(50),
            category VARCHAR(10),
            comfort INT,
            upgrade_comfort    INT,
            upgrade_efficiency INT,
            capacity INT,
            speed_kmh INT,
            range_km INT,
            fuel     FLOAT,
            fuel_max FLOAT,
            fuel_consumption_lph INT,
            co2_emissions_kgph INT,
            price INT,
            owned INT DEFAULT 0,

            PRIMARY KEY (id),
            FOREIGN KEY(game_id) REFERENCES game(id)
        );""")



        cur.execute("DROP TABLE IF EXISTS game;")
        cur.execute("""
            CREATE TABLE game (
                id             int     NOT NULL AUTO_INCREMENT,
                airport        VARCHAR(40) NOT NULL,
                money          INT     NOT NULL,
                rp             INT     NOT NULL,
                co2            FLOAT   NOT NULL,

                aircraft       INT     ,

                PRIMARY KEY (id),

                FOREIGN KEY(aircraft) REFERENCES aircraft(id)
            );
        """)




        cur.execute("DROP TABLE IF EXISTS customer;")
        cur.execute("""
            CREATE TABLE customer (
                id          int     NOT NULL AUTO_INCREMENT,
                game_id     int     NOT NULL,

                name        VARCHAR(40) NOT NULL,

                origin      varchar(40) NOT NULL,
                destination varchar(40) NOT NULL,

                deadline    int     NOT NULL,
                reward      int     NOT NULL,
                reward_rp   int     NOT NULL,
                min_comfort int     NOT NULL,
                min_rp      int     NOT NULL,
                accepted    int     NOT NULL,

                PRIMARY KEY (id),

                FOREIGN KEY(game_id)     REFERENCES game(id),
                FOREIGN KEY(origin)      REFERENCES airport(ident),
                FOREIGN KEY(destination) REFERENCES airport(ident)

            ) DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
        """)


        cur.execute("DROP TABLE IF EXISTS hangar;")
        cur.execute("""
            CREATE TABLE hangar (
                id             int         NOT NULL AUTO_INCREMENT,
                game_id        INT         NOT NULL,
                airport        VARCHAR(40) NOT NULL,

                PRIMARY KEY (id),

                FOREIGN KEY(game_id) REFERENCES game(id),
                FOREIGN KEY(airport) REFERENCES airport(ident)
            ) DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci
            ;
        """)

        # THESE MUST BE THE LAST LINES OF THIS FUNCTION
        self.metadata_set("schema", SCHEMA_VERSION)
        cur.execute("SET FOREIGN_KEY_CHECKS=1;")


    def new_game(self):
        cur = self.con.cursor()
        cur.execute("""
            INSERT INTO game (airport, money,   rp, co2) VALUES
                             ("EFHK",  500,    0,  0)
        """)

        game_id = cur.lastrowid

        cur.execute("""
            INSERT INTO hangar (game_id, airport) VALUES (?, ?)
        """, (game_id, "EFHK"))

        cur.execute("""
        INSERT INTO aircraft (game_id, name, category, comfort, capacity, speed_kmh, range_km, fuel, fuel_max, fuel_consumption_lph, co2_emissions_kgph, price, owned, upgrade_comfort, upgrade_efficiency) VALUES
        (?, 'Cessna 208 Caravan', 'Small', 1,  9,   340, 1700,  1300,   1300,   220,   560,     0,   1, 0, 0),
        (?, 'Learjet 75',         'Medium',3,  12,  860, 3700,  6000,   6000,   700,   1900,   100000,   0, 0, 0),
        (?, 'Boeing 747-8',       'Large', 5,  400, 920, 14000, 240000, 240000, 12000, 30000, 1000000, 0, 0, 0)
        """, (game_id,game_id,game_id))

        cur.execute("SELECT aircraft.id FROM aircraft WHERE game_id=? AND owned=1 LIMIT 1", (game_id,))
        aircraft_id = cur.fetchone()[0]

        cur.execute("UPDATE game SET aircraft = ? WHERE id = ?", (aircraft_id, game_id))

    def metadata_get(self, key):
        cur = self.con.cursor()
        cur.execute("SELECT value FROM metadata WHERE id=?", (key,))
        return cur.fetchone()[0]

    def metadata_set(self, key, value):
        cur = self.con.cursor()
        cur.execute("REPLACE INTO metadata (id, value) VALUES (?, ?)", (key,value))


    def icao_exists(self, icao):
        cur = self.con.cursor()
        query = f"SELECT id FROM airport WHERE ident = ?"
        cur.execute(query, (icao,))
        result = cur.fetchall()
        if len(result) != 1:
            return False
        return True

    def current_airport(self):
        cur = self.con.cursor()
        query = "SELECT airport FROM game WHERE id = 1"
        cur.execute(query)
        return cur.fetchone()[0]

    def icao_distance(self, icao_a, icao_b):
        a = self.airport_yx_icao(icao_a)
        b = self.airport_yx_icao(icao_b)
        return geodesic(a, b).km

    def airport_yx_icao(self, key):
        cur = self.con.cursor()
        query = "SELECT longitude_deg, latitude_deg FROM airport WHERE ident=%s"
        cur.execute(query, (key,))
        coords = cur.fetchone()
        if coords == None:
            print("Virheellinen ICAO-koodi")
            exit()
        return [coords[1],coords[0]]

    def airport_data(self, key, value):
        cur = self.con.cursor()
        query = f"SELECT {value} FROM airport WHERE ident = ?"
        cur.execute(query, (key,))
        data = cur.fetchone()
        if data == None:
            print("Virheellinen ICAO-koodi")
            exit()
        return data[0]

    def get_airport(self, key):
        cur = self.con.cursor()
        query ="""
            SELECT
                id,
                type,
                name,
                latitude_deg,
                longitude_deg,
                elevation_ft,
                continent,
                iso_region,
                municipality,
                scheduled_service,
                gps_code,
                iata_code,
                local_code,
                iso_country
             FROM airport WHERE ident = ? ;
        """
        cur.execute(query, (key,))
        data = cur.fetchone()
        if data == None:
            print("Virheellinen ICAO-koodi")
            exit()

        airport = types.SimpleNamespace()
        airport.id                 = data[0]
        airport.type               = data[1]
        airport.name               = data[2]
        airport.latitude_deg       = data[3]
        airport.longitude_deg      = data[4]
        airport.elevation_ft       = data[5]
        airport.continent          = data[6]
        airport.iso_region         = data[7]
        airport.municipality       = data[8]
        airport.scheduled_service  = data[9]
        airport.gps_code           = data[10]
        airport.iata_code          = data[11]
        airport.local_code         = data[12]
        airport.iso_country        = data[13]
        airport.ident              = key

        airport.fees = 0

        match airport.type:
            case "small_airport":
                airport.type_pretty = "Small"
            case "medium_airport":
                airport.type_pretty = "Medium"
            case "large_airport":
                airport.type_pretty = "Large"

        return airport

    def airport_type_icao(self, key):
        cur = self.con.cursor()
        query = "SELECT type FROM airport WHERE ident=%s"
        cur.execute(query, (key,))
        data = cur.fetchone()
        if data == None:
            print("Virheellinen ICAO-koodi")
            exit()
        return data[0]

    def airport_country_icao(self, key):
        cur = self.con.cursor()
        query = "SELECT iso_country FROM airport WHERE ident=%s"
        cur.execute(query, (key,))
        data = cur.fetchone()
        if data == None:
            print("Virheellinen ICAO-koodi")
            exit()
        return data[0]

    def airport_municipality(self, key):
        cur = self.con.cursor()
        query = "SELECT municipality FROM airport WHERE ident=%s"
        cur.execute(query, (key,))
        data = cur.fetchone()
        if data == None:
            print("Virheellinen ICAO-koodi")
            exit()
        return data[0]

    def airport_name(self, key):
        cur = self.con.cursor()
        query = "SELECT name FROM airport WHERE ident=%s"
        cur.execute(query, (key,))
        data = cur.fetchone()
        if data == None:
            print("Virheellinen ICAO-koodi")
            exit()
        return data[0]

    def airport_xy_icao(self, key):
        cur = self.con.cursor()
        query = "SELECT longitude_deg, latitude_deg FROM airport WHERE ident=%s"
        cur.execute(query, (key,))
        coords = cur.fetchone()
        if coords == None:
            print("Virheellinen ICAO-koodi")
            exit()
        return [coords[0],coords[1]]


    def customers_from_airport(self, game_id, icao):
        cur = self.con.cursor()
        query = f"SELECT id FROM customer WHERE origin = ? AND game_id = ? ORDER BY reward_rp DESC LIMIT 5"
        cur.execute(query, (icao, game_id))
        result = cur.fetchall()

        customers = []

        for (customer_id,) in result:
            c = Customer(self)
            c.load(customer_id)
            customers.append(c)

        return customers


    def customer_by_id(self, customer_id):
        cur = self.con.cursor()

        c = Customer(self)
        c.load(customer_id)

        return c

    def accepted_customers(self):
        cur = self.con.cursor()
        query = f"SELECT id FROM customer WHERE accepted = 1"
        cur.execute(query, )
        result = cur.fetchall()

        customers = []

        for (customer_id,) in result:
            c = Customer(self)
            c.load(customer_id)
            customers.append(c)

        return customers

    def get_all_aircraft(self):
        cur = self.con.cursor()
        query = "SELECT * FROM aircraft ORDER BY id"
        cur.execute(query)
        result = cur.fetchall()
        return result

    def get_aircraft_count(self):
        cur = self.con.cursor()
        query = "SELECT count(*) FROM aircraft"
        cur.execute(query)
        result = cur.fetchall()
        return result[0]

    def kill_all_customers(self):
        cur = self.con.cursor()
        cur.execute("DELETE FROM customer")
