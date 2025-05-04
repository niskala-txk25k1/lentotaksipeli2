"use strict";


const util = {
	radians: function(deg) {
		return deg * (Math.PI / 180.0)
	},

	degrees: function(rad) {
		return rad * (180.0 / Math.PI)
	},

	time: function() {
		return performance.now() / 1000;
	},

	gps_distance: function(origin, target) {
		let lat1 = origin[0];
		let lon1 = origin[1];
		let lat2 = target[0];
		let lon2 = target[1];
		let R = 6371; // km
		let dLat = util.radians(lat2-lat1);
		let dLon = util.radians(lon2-lon1);
		lat1 = util.radians(lat1);
		lat2 = util.radians(lat2);
		let a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2); 
		let c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
		let d = R * c;
		return d;
	}


}


const vec3 = {};

vec3.lenght = function(v){
	return Math.sqrt(v[0]*v[0] + v[1]*v[1] + v[2]*v[2]);
};

vec3.distance = function(v,w){
	return Math.sqrt(
		(v[0]-w[0])**2 +
		(v[1]-w[1])**2 +
		(v[2]-w[2])**2
	);
};

vec3.normalize = function(v) {
	let len = vec3.lenght(v);
	return [
		v[0] / len,
		v[1] / len,
		v[2] / len
	]
}


