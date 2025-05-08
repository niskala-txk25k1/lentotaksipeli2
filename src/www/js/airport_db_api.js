const airport_db_api_key = "3289a3c4a8053503bb9aae28b2523a1906188fe5d699f0feeba5db8b280ffe6c1ebd299376c52e71fa29ecad52e289d6" //storing API keys in the frontend (:

function iso_name_to_country(iso_name) {
    const iso_country_map = {
        "AF": "Afghanistan",
        "AL": "Albania",
        "DZ": "Algeria",
        "AS": "American Samoa",
        "AD": "Andorra",
        "AO": "Angola",
        "AI": "Anguilla",
        "AQ": "Antarctica",
        "AG": "Antigua and Barbuda",
        "AR": "Argentina",
        "AM": "Armenia",
        "AW": "Aruba",
        "AU": "Australia",
        "AT": "Austria",
        "AZ": "Azerbaijan",
        "BS": "Bahamas",
        "BH": "Bahrain",
        "BD": "Bangladesh",
        "BB": "Barbados",
        "BY": "Belarus",
        "BE": "Belgium",
        "BZ": "Belize",
        "BJ": "Benin",
        "BM": "Bermuda",
        "BT": "Bhutan",
        "BO": "Bolivia",
        "BA": "Bosnia and Herzegovina",
        "BW": "Botswana",
        "BR": "Brazil",
        "IO": "British Indian Ocean Territory",
        "BN": "Brunei",
        "BG": "Bulgaria",
        "BF": "Burkina Faso",
        "BI": "Burundi",
        "KH": "Cambodia",
        "CM": "Cameroon",
        "CA": "Canada",
        "CV": "Cape Verde",
        "KY": "Cayman Islands",
        "CF": "Central African Republic",
        "TD": "Chad",
        "CL": "Chile",
        "CN": "China",
        "CO": "Colombia",
        "KM": "Comoros",
        "CD": "Congo (DRC)",
        "CG": "Congo (Republic)",
        "CK": "Cook Islands",
        "CR": "Costa Rica",
        "CI": "Côte d’Ivoire",
        "HR": "Croatia",
        "CU": "Cuba",
        "CY": "Cyprus",
        "CZ": "Czech Republic",
        "DK": "Denmark",
        "DJ": "Djibouti",
        "DM": "Dominica",
        "DO": "Dominican Republic",
        "EC": "Ecuador",
        "EG": "Egypt",
        "SV": "El Salvador",
        "GQ": "Equatorial Guinea",
        "ER": "Eritrea",
        "EE": "Estonia",
        "SZ": "Eswatini",
        "ET": "Ethiopia",
        "FJ": "Fiji",
        "FI": "Finland",
        "FR": "France",
        "GA": "Gabon",
        "GM": "Gambia",
        "GE": "Georgia",
        "DE": "Germany",
        "GH": "Ghana",
        "GR": "Greece",
        "GL": "Greenland",
        "GD": "Grenada",
        "GU": "Guam",
        "GT": "Guatemala",
        "GN": "Guinea",
        "GW": "Guinea-Bissau",
        "GY": "Guyana",
        "HT": "Haiti",
        "HN": "Honduras",
        "HU": "Hungary",
        "IS": "Iceland",
        "IN": "India",
        "ID": "Indonesia",
        "IR": "Iran",
        "IQ": "Iraq",
        "IE": "Ireland",
        "IL": "Israel",
        "IT": "Italy",
        "JM": "Jamaica",
        "JP": "Japan",
        "JO": "Jordan",
        "KZ": "Kazakhstan",
        "KE": "Kenya",
        "KI": "Kiribati",
        "KW": "Kuwait",
        "KG": "Kyrgyzstan",
        "LA": "Laos",
        "LV": "Latvia",
        "LB": "Lebanon",
        "LS": "Lesotho",
        "LR": "Liberia",
        "LY": "Libya",
        "LI": "Liechtenstein",
        "LT": "Lithuania",
        "LU": "Luxembourg",
        "MG": "Madagascar",
        "MW": "Malawi",
        "MY": "Malaysia",
        "MV": "Maldives",
        "ML": "Mali",
        "MT": "Malta",
        "MH": "Marshall Islands",
        "MR": "Mauritania",
        "MU": "Mauritius",
        "MX": "Mexico",
        "FM": "Micronesia",
        "MD": "Moldova",
        "MC": "Monaco",
        "MN": "Mongolia",
        "ME": "Montenegro",
        "MA": "Morocco",
        "MZ": "Mozambique",
        "MM": "Myanmar",
        "NA": "Namibia",
        "NR": "Nauru",
        "NP": "Nepal",
        "NL": "Netherlands",
        "NZ": "New Zealand",
        "NI": "Nicaragua",
        "NE": "Niger",
        "NG": "Nigeria",
        "KP": "North Korea",
        "MK": "North Macedonia",
        "NO": "Norway",
        "OM": "Oman",
        "PK": "Pakistan",
        "PW": "Palau",
        "PS": "Palestine",
        "PA": "Panama",
        "PG": "Papua New Guinea",
        "PY": "Paraguay",
        "PE": "Peru",
        "PH": "Philippines",
        "PL": "Poland",
        "PT": "Portugal",
        "QA": "Qatar",
        "RO": "Romania",
        "RU": "Russia",
        "RW": "Rwanda",
        "KN": "Saint Kitts and Nevis",
        "LC": "Saint Lucia",
        "VC": "Saint Vincent and the Grenadines",
        "WS": "Samoa",
        "SM": "San Marino",
        "ST": "São Tomé and Príncipe",
        "SA": "Saudi Arabia",
        "SN": "Senegal",
        "RS": "Serbia",
        "SC": "Seychelles",
        "SL": "Sierra Leone",
        "SG": "Singapore",
        "SK": "Slovakia",
        "SI": "Slovenia",
        "SB": "Solomon Islands",
        "SO": "Somalia",
        "ZA": "South Africa",
        "KR": "South Korea",
        "SS": "South Sudan",
        "ES": "Spain",
        "LK": "Sri Lanka",
        "SD": "Sudan",
        "SR": "Suriname",
        "SE": "Sweden",
        "CH": "Switzerland",
        "SY": "Syria",
        "TW": "Taiwan",
        "TJ": "Tajikistan",
        "TZ": "Tanzania",
        "TH": "Thailand",
        "TL": "Timor-Leste",
        "TG": "Togo",
        "TO": "Tonga",
        "TT": "Trinidad and Tobago",
        "TN": "Tunisia",
        "TR": "Turkey",
        "TM": "Turkmenistan",
        "TV": "Tuvalu",
        "UG": "Uganda",
        "UA": "Ukraine",
        "AE": "United Arab Emirates",
        "GB": "United Kingdom",
        "US": "United States",
        "UY": "Uruguay",
        "UZ": "Uzbekistan",
        "VU": "Vanuatu",
        "VA": "Vatican City",
        "VE": "Venezuela",
        "VN": "Vietnam",
        "YE": "Yemen",
        "ZM": "Zambia",
        "ZW": "Zimbabwe"
    };
    if (iso_name === null) {
        return "UNK"
    }

    return iso_country_map[iso_name.toUpperCase()] || iso_name;
}

function continent_iso_name_to_readable(iso_name) {
    const continent_map = {
        "AF": "Africa",
        "AN": "Antarctica",
        "AS": "Asia",
        "EU": "Europe",
        "NA": "North America",
        "OC": "Oceania",
        "SA": "South America"
    };

    return continent_map[iso_name.toUpperCase()] || iso_name;
}


let airport_data_template = {
    icao: null,
    name: null,
    region: null,
    country: null,
    elevation_m: null,
    continent: null,
    type: null,
    runway_count: null,
}

async function get_airport_by_icao(ICAO) {
    try
    {
    console.log("Fetching airport data for ICAO:", ICAO);
    const response = await fetch(`https://airportdb.io/api/v1/airport/${ICAO}?apiToken=${airport_db_api_key}`);
    const data = await response.json();

    console.log(data)

    if (data.error) {
        console.error("Error fetching airport data:", data.error);
        return null;
    }
    if (data.length === 0) {
        console.error("No data found for the given ICAO code.");
        return null;
    }

    let obj = Object.assign({}, airport_data_template);
    obj.icao = data.icao_code;
    obj.name = data.name;
    obj.region = data.region.name;
    obj.country = data.iso_country;
    obj.elevation_m = data.elevation_ft * 0.3048;
    obj.continent = data.continent;
    obj.type = data.type;
    //Runway count is not always available
    if (data.runways) {
        obj.runway_count = data.runways.length;
    }
    else 
    {
        obj.runway_count = 0;
    }


    return obj;
}
    catch (error) {
        console.error("Error fetching airport data:", error);
        return null;
    }
}

function airport_type_to_readable(type) {
    const airport_types = {
        "small_airport": "Small Airport",
        "medium_airport": "Medium Airport",
        "large_airport": "Large Airport",
        "heliport": "Heliport",
        "closed": "Closed Airport",
        "other": "Other"
    };

    return airport_types[type] || type;
}

function create_airport_description(airport_data_template)
{
    let description;

    description = `${airport_data_template.name} is a ${airport_type_to_readable(airport_data_template.type)} located in ${airport_data_template.region}, ${iso_name_to_country(airport_data_template.country)}.`
    description += ` It has an elevation of ${airport_data_template.elevation_m.toFixed(2)} meters and is situated on the continent of ${continent_iso_name_to_readable(airport_data_template.continent)}.`
    description += ` The airport has ${airport_data_template.runway_count ? airport_data_template.runway_count : "an unknown number of"} runway${airport_data_template.runway_count > 1 ? "s" : ""}.`
    description += ` The airport is at an elevation of ${airport_data_template.elevation_m.toFixed(2)} meters.`
    description += ` The airport's ICAO code is ${airport_data_template.icao}.`
    return description;
}