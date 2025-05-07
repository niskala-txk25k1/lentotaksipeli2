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

    const p = document.createElement("div");
    p.innerHTML = questionText;
    panel.appendChild(p);

    options.forEach(option => {
		const div = document.createElement("div");

        const btn = document.createElement("button");
        btn.textContent = option.text;
        btn.addEventListener("click", option.callback);


        div.appendChild(btn);
        panel.appendChild(div);
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

class Popup {
	constructor() {
		this.buttons = []
		this.t = ""
	}

	async text(t) {
		this.t += "<p>" + t + "</p>";
	}

	async button(label, callback) {
		this.buttons.push({text:label, callback:callback})
	}

	async show() {
		showQuestion(this.t, this.buttons);
	}
}

async function menu_at_airport() {

	let game = await api.get_game(game_id)
	let airport = await api.airport_by_icao(game.airport)

	console.log(game)


	let popup = new Popup();


    popup.text(`At airport ${airport.ident} - ${airport.name}` )
    popup.text(`${airport.municipality} (${airport.continent} ${airport.iso_region})` )

    popup.button("Map")
    popup.button("Look for customers", menu_look_for_customers)

	popup.show()


	map.leaflet.setView(airport.gps);
}

async function menu_look_for_customers() {
	let game = await api.get_game(game_id)

	let popup = new Popup();

	let customers = await api.get_customers( game_id )

	popup.text( JSON.stringify(customers) )
    popup.button("Return", menu_at_airport)
	popup.show()
}


async function load_game(_game_id) {
	game_id = _game_id;
	menu_at_airport();
}

async function show_games() {

	let popup = new Popup();

	popup.text("Load game")

	for (let game of await api.get_games()) {

		popup.button(`Game ${game.id}`, ()=>{ load_game(game.id) } )

	}

	popup.button(`New game`, ()=>{} )

	popup.show();

}

show_games();
