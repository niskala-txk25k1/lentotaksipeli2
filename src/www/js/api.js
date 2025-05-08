"use strict";

class Airport {
	constructor(json) {
		this.json = json;

		for (let key in json) {
			this[key] = json[key]
		}

		this.ident = json.ident;
		this.icao  = json.ident;

		this.gps = [json.latitude_deg, json.longitude_deg];
	}
}

class Api {
	constructor() {

	}

	async airports_by_type(type, bounds=null) {

		let endpoint = `/api/airport/type/${type}`;

		if (bounds) {
			endpoint += `?bounds=${JSON.stringify(bounds)}`
		}

		const response = await fetch(endpoint);
		const results = await response.json();

		const airports = [];
		for (let airport_json of results) {
			airports.push( new Airport(airport_json) );
		}

		return airports;
	}

	async airport_by_icao(icao) {

		const response = await fetch(`/api/airport/ident/${icao}`);
		const results = await response.json();

		const airport = new Airport(results);

		return airport;
	}

	async get_games() {

		const response = await fetch(`/api/games`);
		const results = await response.json();

		return results;
	}

	async get_game(id) {

		const response = await fetch(`/api/game/${id}`);
		const results = await response.json();

		return results;
	}


	async get_customers(game_id) {

		const response = await fetch(`/api/game/${game_id}/customers`);
		const results = await response.json();

		return results;
	}


	async get_current_aircraft(game_id) {

		const response = await fetch(`/api/game/${game_id}/current_aircraft`);
		const results = await response.json();

		return results;
	}

	async get_facilities(game_id, icao) {

		const response = await fetch(`/api/game/${game_id}/airport/${icao}/facilities`);
		const results = await response.json();

		return results;
	}


	async set_airport(game_id, icao) {
		const response = await fetch(`/api/game/${game_id}/fly_to/${icao}`);

		if (response.status == 401) {
			return false;
		}

		return true;
	}


	async refuel(game_id) {

		const response = await fetch(`/api/game/${game_id}/refuel`);
		return;
	}
}

const api = new Api();
