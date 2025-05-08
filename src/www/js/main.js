"use strict";

const roman = ["I", "II", "III", "IV", "V", "VI"]

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
        btn.innerHTML = option.text;
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

		this.customer_markers = [];

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


		const airplane_sprite = new AirplaneSprite();
		let scale = 1;

		if (progress < this.distance * 0.1) {
			scale = (progress) / (this.distance * 0.1);
		} else if (progress > this.distance * 0.95) {
			scale = 0;
		} else if (progress > this.distance * 0.85) {
			scale = 1 - ((progress - this.distance * 0.85) / (this.distance * 0.1));
		}
		
		airplane_sound.set_volume(scale * 3);

		if (progress > this.distance) {
			this.animating = false;
			airplane_sprite.hide();
			this.event_move_end();
			menu_arrived();
			airplane_sound.stop();
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

		let current_waypoint = this.waypoints[i];
		let next_waypoint = this.waypoints[i+1];
		let angle = Math.atan2(next_waypoint[0] - current_waypoint[0], next_waypoint[1] - current_waypoint[1]);
		let degrees = util.degrees(-angle) + 90;

		airplane_sprite.modify_transform("rotate(" + degrees + "deg) scale(" + scale + ")");
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

	async add_customer(customer, index) {
		const target = await api.airport_by_icao(customer.destination);
		const waypoints = compute_geodesic(this.origin.gps, target.gps);
		const line = new L.Polyline(waypoints, {color:"blue"}).addTo(this.leaflet)

		const marker = L.marker(target.gps, {
			icon: L.divIcon({
				className: 'text-labels',
				html: `#${index} ${customer.destination}`,
				iconSize: [50, 10],
			}),
			zIndexOffset: 1000
		});

		marker.addTo(this.leaflet);

		this.customer_markers.push(line)
		this.customer_markers.push(marker)
	}

	async clear_customers() {
		for (let line of this.customer_markers) {
			this.leaflet.removeLayer(line)
		}
		this.customer_markers = []
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

	async create() {
		if (document.querySelector("#airport_info")) return;
	  
		const airport_info = document.createElement("div");
		airport_info.id = "airport_info";  // Tämä ottaa tyylit suoraan CSS:stä
	  
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

class AirplaneSound
{
	constructor() {
		this.audio = new Audio("/audio/airplane.mp3");
		this.audio.loop = true;
		this.audio.volume = 0.1;
		this.running = false;
	}

	async start() {
		if (this.running) return;
		this.audio.play();
	}

	async stop() {
		if (!this.running) return;
		this.audio.pause();
	}

	async set_volume(volume) {
		this.audio.volume = volume / 100;
	}
}
const airplane_sound = new AirplaneSound(); //init globally, yolo

class AirplaneSprite
{
	async size_scale(percent)
	{
		const sprite = document.querySelector("#airplane_sprite");
		const scale = percent
		sprite.style.transform = "scale(" + scale + ")";
	}
	async show()
	{
		const sprite = document.querySelector("#airplane_sprite");
		sprite.style.display = "block";
	}
	async hide()
	{
		const sprite = document.querySelector("#airplane_sprite");
		sprite.style.display = "none";
	}

	async set_rotation(degrees)
	{
		const sprite = document.querySelector("#airplane_sprite");
		sprite.style.transform = "rotate(" + degrees + "deg)";
	}

	async modify_transform(data) {
		const sprite = document.querySelector("#airplane_sprite");
		sprite.style.transform = "translate(-50%, -50%)" + data;
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

function center_popup() {
	const panel = document.querySelector("#panel");
	panel.style.transform = "translate(-50%, -50%)"
	panel.style.left = "50%"
}
function uncenter_popup() {
	const panel = document.querySelector("#panel");
	panel.style.transform = "translate(0%, -50%)"
	panel.style.left = "0%"
}


async function menu_arrived() {
	map.origin = map.target;
	await menu_at_airport()

	show_popup();
}


async function menu_not_enough_fuel() {
	show_popup();
	let popup = new Popup();
	popup.text("Not enough fuel.")
	popup.button("Return", menu_at_airport)
	popup.show()
}

async function menu_confirm_flight(icao) {

	const airport_data = await get_airport_by_icao(icao);
	const airport_description = create_airport_description(airport_data);

	show_popup();

	let popup = new Popup();

	popup.text(`Fly ${map.origin.icao} -> ${map.target.icao} ?`, true)

	map.disable_interaction();

	popup.button("Confirm", async ()=>{
		hide_popup();

		let ret = await api.set_airport(game_id, map.target.icao);

		if (ret == false) {
			await menu_not_enough_fuel()
			return;
		}

		const airplane_sprite = new AirplaneSprite();
		airplane_sprite.show();
		airplane_sound.start();

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
	let facilities = await api.get_facilities(game_id, game.airport)
	update_status(game)

	await map.set_origin(game.airport);

	map.clear_geodesic()
	map.disable_airports();
	map.disable_interaction()
	map.clear_customers()

	console.log(game)


	let popup = new Popup();


    popup.text(`At airport ${airport.ident} - ${airport.name}` )
    popup.text(`${airport.municipality} (${airport.continent} ${airport.iso_region})` )

    popup.button("Map", menu_map)
    popup.button("Look for customers", menu_look_for_customers)

    popup.button("Refuel", async ()=>{
		await api.refuel(game_id)
		menu_at_airport();
	})

	if (facilities.hangar) {
		popup.button("Hangar");
	}

	center_popup()
	popup.show()


	map.leaflet.setView(airport.gps);
}

async function update_status(game) {

	if (!game) {
		game = await api.get_game(game_id)
	}

	let aircraft = await api.get_current_aircraft(game_id);

	console.log(aircraft)

	const dom = {
		money : document.querySelector("#money"),
		rp : document.querySelector("#rp"),
		co2 : document.querySelector("#co2"),
		range : document.querySelector("#range"),
		aircraft : document.querySelector("#aircraft"),
		bar : document.querySelector(".progress-bar-fill")
	}

	dom.bar.style.width = `${aircraft.fuel/aircraft.fuel_max*100}%`;
	dom.money.innerText = `\$${game.money}`;
	dom.rp.innerText = `${game.rp} rp`;
	dom.co2.innerText = `${game.co2} tCO²`;
	dom.aircraft.innerText = `${aircraft.name} (${roman[aircraft.comfort-1]})`;
	dom.range.innerText = `${Math.floor(aircraft.range)} km`;
}

async function menu_look_for_customers() {

	let game = await api.get_game(game_id)

	let popup = new Popup();

	let customers = await api.get_customers( game_id )

	for (let i = 0; i < customers.length; i++) {
		const customer = customers[i];

		let t = "";
		t += `#${i+1} ${customer.name} ${roman[customer.min_comfort]}<br>`
		t += `${customer.destination}<br>`
		t += `\$${customer.reward} +${customer.reward_rp}rp<br>`

		//popup.text(t)
		//popup.button( `Accept #${i+1}` )
		popup.button(t)

		map.add_customer(customer, i+1)

	}

	map.enable_interaction()
	uncenter_popup()
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

    popup.text('<span class="load-game-text">LOAD GAME</span>') // Lisätään luokka
    for (let game of await api.get_games()) {
        popup.button(`Game ${game.id}`, ()=>{ load_game(game.id) })
    }

    popup.button(`New game`, ()=>{} )

    popup.show();
}

show_games();
