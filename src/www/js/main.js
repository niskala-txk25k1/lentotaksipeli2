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

	const steps = 5;

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




class Map {
	constructor() {

		this.leaflet = L.map('map')
		this.leaflet.setView([0,0], 4.0);

		L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
			noWrap: true,
			maxZoom: 19,
			attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
		}).addTo(this.leaflet);

		this.markers = [];

		this.populate();
		this.geodesic();
	}


	async airport_onclick(icao) {
		console.log(icao);

		this.origin = this.target;
		this.target = await api.airport_by_icao(icao);
		console.log(this.target)
		await this.geodesic();
	}


	async geodesic() {
		if (!this.origin) {
			this.origin = await api.airport_by_icao("EFHK");
			this.target = await api.airport_by_icao("KLGA");
		}

		console.log(this.origin.gps)
		console.log(this.target.gps)

		let wp = compute_geodesic(this.origin.gps, this.target.gps);

		if (this.line) {
			this.leaflet.removeLayer(this.line);
		}

		this.line = new L.Polyline(wp, {color:"red"}).addTo(this.leaflet)

		this.leaflet.fitBounds( this.line.getBounds(), {padding:[50,50]} );
	}


	// The airport markers
	async populate() {
		const airports = await api.airports_by_type("large_airport");
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

			this.markers.push(marker);
		}
	}
}


new Map();
