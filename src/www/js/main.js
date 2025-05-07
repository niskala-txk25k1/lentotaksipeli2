"use strict";

function gps_to_usphere(gps_deg) {
	const gps = [
		util.radians(gps_deg[1]-90),
		util.radians(gps_deg[0]),
	];

	const xz = Math.cos( gps[1]);
	const x =  Math.cos( gps[0]) * xz;
	const y =  Math.sin( gps[1]);
	const z =  Math.sin(-gps[0]) * xz;
    return [x,y,z]

}

function usphere_to_gps(vec) {
	const lat = Math.asin(vec[1])
	const lon = Math.atan2(vec[0], vec[2])
	return [util.degrees(lat), util.degrees(lon)]
}

function compute_geodesic(gps_a, gps_b) {
	const waypoints = [];

	const a = gps_to_usphere(gps_a);
	const b = gps_to_usphere(gps_b);

	const steps = 10;

	for (let i = 0; i <= steps; i++) {
		const t = i/steps;

        let c = [
            a[0] + t * (b[0] - a[0]),
            a[1] + t * (b[1] - a[1]),
            a[2] + t * (b[2] - a[2]),
        ];

		c = vec3.normalize(c);
		const gps = usphere_to_gps(c);
		waypoints.push(gps);
	}

	return waypoints;
}


function showQuestion(questionText, options) {
    const panel = document.querySelector("#panel");
    panel.innerHTML = "";

    const p = document.createElement("p");
    p.textContent = questionText;
    panel.appendChild(p);

    options.forEach(option => {
        const btn = document.createElement("button");
        btn.textContent = option.text;
        btn.addEventListener("click", option.callback);
        panel.appendChild(btn);
    });
}

class Map {
	constructor() {

		this.leaflet = L.map('map')
		this.leaflet.setView([0,0], 4.0);

		//let map_url = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png
		let map_url = 'https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png'

		L.tileLayer(map_url, {
			noWrap: true,
			maxZoom: 19,
			attribution: '&copy; CARTO'
		}).addTo(this.leaflet);

		this.airports = [];

		this.geodesic();
		this.waypoints = [];
		this.waypoint_lenghts = [];
		this.distance = 0;
		this.origin = null;
		this.target = null;

		this.animating = false;
		this.anim_start = 0;
		this.anim_speed = 700; // km per second

		this.leaflet.on("moveend", this.event_move_end.bind(this));

		this.panel = document.querySelector("#panel");

		//this.panel.addEventListener("click", this.animate.bind(this));
	}

	async animate() {
		this.animating = true;

		this.waypoint_lenghts = [];

		for (let i = 1; i < this.waypoints.length; i++) {
			this.waypoint_lenghts.push(util.gps_distance(this.waypoints[i-1], this.waypoints[i]))
		}


		console.log("anim");
		requestAnimationFrame(this.animation_tick.bind(this));
		this.anim_start = util.time();
	}

	async animation_tick() {
		let now = util.time();
		let delta = now - this.anim_start;
		let progress = this.anim_speed * delta;

		if (progress > this.distance) {
			this.animating = false;
			this.event_move_end();
			return;
		}

		let i = 0;
		for (; i < this.waypoints.length; i++) {
			if ( progress < this.waypoint_lenghts[i] )
				break;

			progress -= this.waypoint_lenghts[i];
		}

		let t = progress / this.waypoint_lenghts[i];
		let a = this.waypoints[i];
		let b = this.waypoints[i+1];

        let c = [
            a[0] + t * (b[0] - a[0]),
            a[1] + t * (b[1] - a[1]),
        ];

		this.leaflet.setView(c, undefined, {animate:false});

		requestAnimationFrame(this.animation_tick.bind(this));
	}

	async event_move_end() {
		if (this.animating) return;

		this.airports_clear();

		if (this.leaflet.getZoom() > 5) {
			this.airports_show("medium_airport");
		}

		if (this.leaflet.getZoom() > 2) {
			this.airports_show("large_airport");
		}
	}

	async airport_onclick(icao) {
		console.log(icao);

		//this.origin = this.target;
		this.target = await api.airport_by_icao(icao);
		await this.geodesic();
	}


	async geodesic() {
		if (!this.origin) {
			this.origin = await api.airport_by_icao("EFHK");
			this.target = await api.airport_by_icao("KLGA");
		}


		this.waypoints = compute_geodesic(this.origin.gps, this.target.gps);

		if (this.line) {
			this.leaflet.removeLayer(this.line);
		}

		this.line = new L.Polyline(this.waypoints, {color:"red"}).addTo(this.leaflet)

		this.leaflet.fitBounds( this.line.getBounds(), {padding:[50,50]} );


		this.distance = util.gps_distance(this.origin.gps, this.target.gps)

	}

	get_bounds() {
		let lbounds = this.leaflet.getBounds();

		let bounds = {
			max: lbounds._northEast,
			min: lbounds._southWest,
		}

		return bounds;
	}

	async airports_clear() {
		for (let marker of this.airports) {
			this.leaflet.removeLayer(marker);
		}
		this.airports = [];
	}

	// The airport markers
	async airports_show(type) {
		const airports = await api.airports_by_type(type, this.get_bounds());
		console.log(airports);

		for (const airport of airports) {
			const marker = L.marker(airport.gps, {
				icon: L.divIcon({
					className: 'text-labels',
					html: airport.icao,
					iconSize: [50, 10],
				}),
				zIndexOffset: 1000
			});


			marker.addTo(this.leaflet);
			marker.on("click", this.airport_onclick.bind(this, airport.ident));

			this.airports.push(marker);
		}
	}
}


let map;
map = new Map();
let game_id = -1;

async function load_game(_game_id) {
	game_id = _game_id;

	let game = await api.get_game(game_id)

	console.log(game)


	showQuestion(`At airport ${game.airport}`, [])
}

async function show_games() {


	let opts = []
	for (let game of await api.get_games()) {

		opts.push( {text:`Game ${game.id}`, callback:()=>{ load_game(game.id) }} )

	}

	opts.push( {text:`New Game`, callback:()=>{}} )

	showQuestion("Load game:", opts)

}

show_games();
