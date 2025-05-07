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

		this.show_airports = true;
		this.interaction = true
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

		this.origin_marker = null;

		//this.panel.addEventListener("click", this.animate.bind(this));
	}


	async set_origin(icao) {

		if (this.origin_marker) {
			this.leaflet.removeLayer(this.origin_marker);
		}

		this.origin = await api.airport_by_icao(icao);

		this.origin_marker = L.marker(this.origin.gps)
		this.origin_marker.addTo(this.leaflet);

	}


	async animate() {
		this.leaflet.removeLayer(this.origin_marker)
		this.origin_marker = null;

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
			menu_arrived();
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
		if (this.animating || !this.show_airports) return;

		this.airports_clear();

		if (this.leaflet.getZoom() > 5) {
			this.airports_show("medium_airport");
		}

		if (this.leaflet.getZoom() > 2) {
			this.airports_show("large_airport");
		}
	}

	async airport_onclick(icao) {
		if (!this.interaction) return;
		console.log(icao);

		//this.origin = this.target;
		this.target = await api.airport_by_icao(icao);
		await this.geodesic();

		menu_confirm_flight(icao)
	}

	async clear_geodesic() {
		this.waypoints = [];
		this.leaflet.removeLayer(this.line);
	}

	async disable_airports() {
		this.show_airports = false;
		this.airports_clear();
	}
	async enable_airports() {
		this.show_airports = true;
		this.event_move_end();
	}

	async disable_interaction() {
		this.interaction = false;
		this.leaflet._handlers.forEach(function(handler) {
			handler.disable();
		});
	}
	async enable_interaction() {
		this.interaction = true;
		this.leaflet._handlers.forEach(function(handler) {
			handler.enable();
		});
	}

	async geodesic() {
		if (!this.origin) {
			await this.set_origin("EFHK");
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
		//console.log(airports);

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

	async text(t, bold = false) {
		this.t += "<p style = font-weight:" + (bold ? "bold" : "normal") + ";>" + t + "</p>";
	}

	async button(label, callback) {
		this.buttons.push({text:label, callback:callback})
	}

	async show() {
		showQuestion(this.t, this.buttons);
	}
}

class AirportInfoWindow {

	async create()
	{
		if (document.querySelector("#airport_info")) return;
		const airport_info = document.createElement("div");
		airport_info.id = "airport_info";
		airport_info.style.position = "absolute";
		airport_info.style.top = "-220px";
		airport_info.style.height = "230px";
		airport_info.style.width = "100%";
		airport_info.style.padding = "16px";
		airport_info.style.boxSizing = "border-box";
		airport_info.style.backgroundColor = "rgb(153 153 153)";
		airport_info.style.borderRadius = "12px";
		airport_info.style.fontFamily = "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
		airport_info.style.fontSize = "17px";
		airport_info.style.color = "#333";
		airport_info.style.display = "none";
		airport_info.style.overflowY = "auto";
		airport_info.style.zIndex = "1000";
		airport_info.style.left = "0px";
		airport_info.style.borderBottomLeftRadius = "0px";
		airport_info.style.borderBottomRightRadius = "0px";

		document.querySelector("#panel").appendChild(airport_info);
	}

	async show()
	{
		if (!document.querySelector("#airport_info")) return;

		document.querySelector("#airport_info").style.display = "block";
	}
	
	async hide() 
	{
		if (!document.querySelector("#airport_info")) return;

		document.querySelector("#airport_info").style.display = "none";
	}

	async text(t) 
	{
		if (!document.querySelector("#airport_info")) return;
		document.querySelector("#airport_info").innerHTML = "<p>" + t + "</p>";
	}
}


function hide_popup() {
    const panel = document.querySelector("#panel");
	panel.style.display = "none";
}

function show_popup() {
    const panel = document.querySelector("#panel");
	panel.style.display = "block";
}


async function menu_arrived() {
	await api.set_airport(game_id, map.target.icao);
	map.origin = map.target;
	await menu_at_airport()

	show_popup();
}

async function menu_confirm_flight(icao) {

	const airport_data = await get_airport_by_icao(icao);
	const airport_description = create_airport_description(airport_data);

	show_popup();

	let popup = new Popup();

	popup.text(`Fly ${map.origin.icao} -> ${map.target.icao} ?`, true)

	map.disable_interaction();

	popup.button("Confirm", ()=>{
		hide_popup();
		map.animate()
	});
	popup.button("Cancel", menu_at_airport)

	popup.show()

	const airport_info_window = new AirportInfoWindow();
	airport_info_window.create();
	airport_info_window.text(airport_description);
	airport_info_window.show();
}

async function menu_map() {
	hide_popup();

	map.enable_airports();
	map.enable_interaction();
}

async function menu_at_airport() {

	let game = await api.get_game(game_id)
	let airport = await api.airport_by_icao(game.airport)

	await map.set_origin(game.airport);

	map.clear_geodesic()
	map.disable_airports();

	console.log(game)


	let popup = new Popup();


    popup.text(`At airport ${airport.ident} - ${airport.name}` )
    popup.text(`${airport.municipality} (${airport.continent} ${airport.iso_region})` )

    popup.button("Map", menu_map)
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

	map.disable_interaction();

	let popup = new Popup();

	popup.text("Load game")

	for (let game of await api.get_games()) {

		popup.button(`Game ${game.id}`, ()=>{ load_game(game.id) } )

	}

	popup.button(`New game`, ()=>{} )

	popup.show();

}

show_games();
