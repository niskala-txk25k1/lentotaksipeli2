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
	async get_passengers(game_id) {

		const response = await fetch(`/api/game/${game_id}/passengers`);
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
		const result = await response.json();
		return result;
	}

	async accept_customer(game_id, customer_id) {
		const response = await fetch(`/api/game/${game_id}/customer/${customer_id}/accept`);
		const result = await response.json();
		return result;
	}


	async refuel(game_id) {
		const response = await fetch(`/api/game/${game_id}/refuel`);
		return;
	}

	async new_game() {
		await fetch(`/api/game/new`);
		return;
	}

	async delete_game(game_id) {
		await fetch(`/api/game/${game_id}/delete`);
		return;
	}

	async try_contracts(game_id) {
		const response = await fetch(`/api/game/${game_id}/try_contracts`);
		return response.json();
	}
}

const api = new Api();
