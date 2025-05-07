"use strict";

class Airport {
	constructor(json) {
		this.json = json;

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
}

const api = new Api();
