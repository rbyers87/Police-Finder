// Texas Law Enforcement Jurisdiction Locator — Main Application

(function () {
    'use strict';

    // ── DOM References ──────────────────────────────────────────────────────
    const $ = (sel) => document.querySelector(sel);

    function escapeAttr(str) {
        return String(str == null ? '' : str)
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }
    const btnLocation = $('#getCurrentLocation');
    const btnSearch = $('#searchAddress');
    const inputSearch = $('#addressSearch');
    const locationDisplay = $('#locationDisplay');
    const locationName = $('#locationName');
    const locationDetails = $('#locationDetails');
    const coordinates = $('#coordinates');
    const loadingState = $('#loadingState');
    const jurisdictionSection = $('#jurisdictionSection');
    const jurisdictionResults = $('#jurisdictionResults');
    const errorDisplay = $('#errorDisplay');
    const errorMessage = $('#errorMessage');
    const mapSection = $('#mapSection');
    const txBeacon = $('#txBeacon');
    const txBeaconGlow = $('#txBeaconGlow');
    const defaultStateSection = $('#defaultStateSection');
    const defaultStateResults = $('#defaultStateResults');

    // ── Constants ───────────────────────────────────────────────────────────
    const TEXAS_BOUNDS = {
        minLat: 25.8, maxLat: 36.5,
        minLng: -106.6, maxLng: -93.5
    };

    // ── Texas Map Beacon ────────────────────────────────────────────────────
    // The map in #mapSection is an inline SVG traced from real Texas border
    // coordinates (US Census TIGER-derived boundary), not a hand-illustrated
    // approximation. That means placing a beacon is a straightforward,
    // exact equirectangular projection — no calibration or guesswork
    // needed — as long as these constants match how texas-map.svg's own
    // path was generated (see PROJECTION below). If the SVG is ever
    // regenerated from source data, these four numbers must match it.
    const PROJECTION = {
        minLng: -106.643603,
        maxLat: 36.501861,
        cosMeanLat: 0.8554121210292265, // cos(mean latitude), corrects x-scale
        scale: 55,  // px per degree of latitude, matching texas-map.svg
        pad: 16     // px margin baked into texas-map.svg's viewBox
    };

    function geoToTexasSvgPosition(lat, lng) {
        const cx = (lng - PROJECTION.minLng) * PROJECTION.cosMeanLat * PROJECTION.scale + PROJECTION.pad;
        const cy = (PROJECTION.maxLat - lat) * PROJECTION.scale + PROJECTION.pad;
        return { cx, cy };
    }

    function showTexasBeacon(lat, lng) {
        const { cx, cy } = geoToTexasSvgPosition(lat, lng);
        txBeacon.setAttribute('cx', cx);
        txBeacon.setAttribute('cy', cy);
        txBeaconGlow.setAttribute('cx', cx);
        txBeaconGlow.setAttribute('cy', cy);
        mapSection.classList.remove('hidden');
    }

    const ARCGIS_ORG = 'https://services.arcgis.com/KTcxiTD9dsQw4r7Z/arcgis/rest/services';
    const CENSUS_GEOCODE = 'https://geocoding.geo.census.gov/geocoder/geographies/coordinates';
    const NOMINATIM_REVERSE = 'https://nominatim.openstreetmap.org/reverse';
    const NOMINATIM_SEARCH = 'https://nominatim.openstreetmap.org/search';

    // GIS endpoints — primary + fallbacks for resilience
    const COUNTY_ENDPOINTS = [
        `${ARCGIS_ORG}/Texas_County_Boundaries/FeatureServer/0/query`,
        `${ARCGIS_ORG}/Texas_County_Boundaries_Detailed/FeatureServer/0/query`,
        'https://maps.dot.state.tx.us/arcgis/rest/services/Boundaries/MapServer/1/query'
    ];

    const CITY_ENDPOINTS = [
        `${ARCGIS_ORG}/TDC_Eligible_cities_11nov_V2/FeatureServer/0/query`,
        'https://maps.dot.state.tx.us/arcgis/rest/services/General/Cities/MapServer/0/query',
        'https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Places_CouSub_ConCity_SubMCD/MapServer/0/query'
    ];

    // Census Unified School District boundaries -- real polygon data, same
    // family of service as the city/county lookups above (not a Texas-only
    // dataset, but spatial intersection with a TX point naturally scopes it).
    const ISD_ENDPOINTS = [
        'https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/School/MapServer/0/query',
        'https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/tigerWMS_Current/MapServer/14/query'
    ];

    // Field names to try when parsing GIS responses (varies by endpoint)
    const CITY_NAME_FIELDS = ['CITY_NM', 'NAME', 'CITY_NAME', 'NAMELSAD', 'NAME10', 'FULLNAME'];
    const COUNTY_NAME_FIELDS = ['CNTY_NM', 'NAME', 'COUNTY_NAME', 'COUNTYNAME', 'NAMELSAD', 'COUNTY_FIPS'];
    const ISD_NAME_FIELDS = ['BASENAME', 'NAME'];

    // Area codes by county for fallback contact generation
    const AREA_CODE_MAP = {
        'jefferson': '409', 'orange': '409', 'hardin': '409', 'galveston': '409',
        'liberty': '936', 'walker': '936', 'montgomery': '936',
        'harris': '713', 'fort bend': '281', 'brazoria': '979',
        'dallas': '214', 'collin': '972', 'denton': '940',
        'tarrant': '817', 'bexar': '210', 'travis': '512', 'williamson': '512',
        'el paso': '915', 'nueces': '361', 'lubbock': '806',
        'bell': '254', 'mclennan': '254', 'cameron': '956', 'webb': '956', 'hidalgo': '956',
        'smith': '903', 'brazos': '979'
    };

    // ── Contact Database ────────────────────────────────────────────────────

    async function loadAgencyDB() {
        // The published agency-data.json file (updated via the admin page's
        // "Publish to GitHub" button) is the single source of truth for
        // every visitor. Deliberately no localStorage fallback here —
        // admin edits should only take effect once they're actually
        // published, not just for the browser that made them.
        try {
            const response = await fetch('./agency-data.json', { cache: 'no-store' });
            if (response.ok) return await response.json();
            console.warn(`agency-data.json fetch returned ${response.status}`);
        } catch (err) {
            console.warn('Shared agency data unavailable:', err);
        }

        return { agencies: {}, defaultAgency: null };
    }

    const agencyDBPromise = loadAgencyDB();

    async function getAgency(jurisdictionType, jurisdictionName) {
        const db = await agencyDBPromise;
        const key = `${jurisdictionType}:${jurisdictionName}`;
        return db.agencies[key] || null;
    }

    async function getDefaultAgency() {
        const db = await agencyDBPromise;
        return db.defaultAgency;
    }

    // ── GIS Queries ─────────────────────────────────────────────────────────

    /**
     * Try to extract a name from GIS attributes using known field name patterns.
     */
    function extractFieldName(attrs, possibleFields) {
        for (const field of possibleFields) {
            if (attrs[field] && typeof attrs[field] === 'string' && attrs[field].trim()) {
                return attrs[field].trim();
            }
        }
        return null;
    }

    /**
     * Query GIS endpoints for the county containing the given point.
     * Tries multiple endpoints with fallback. Returns { name } or null.
     */
    async function queryCounty(lat, lng) {
        for (const endpoint of COUNTY_ENDPOINTS) {
            try {
                const params = new URLSearchParams({
                    where: '1=1',
                    geometry: `${lng},${lat}`,
                    geometryType: 'esriGeometryPoint',
                    inSR: '4326',
                    spatialRel: 'esriSpatialRelIntersects',
                    outFields: '*',
                    returnGeometry: 'false',
                    f: 'json'
                });

                const resp = await fetch(`${endpoint}?${params}`);
                if (!resp.ok) continue;

                const data = await resp.json();
                if (data.error) continue;

                if (data.features && data.features.length > 0) {
                    const attrs = data.features[0].attributes;
                    let name = extractFieldName(attrs, COUNTY_NAME_FIELDS);

                    if (name) {
                        // Clean up: remove "County" suffix if present, we'll add it back
                        name = name.replace(/ County$/i, '').replace(/, TX$/i, '').replace(/, Texas$/i, '');
                        return { name };
                    }
                }
            } catch (err) {
                console.warn(`County endpoint failed: ${endpoint}`, err);
            }
        }
        return null;
    }

    /**
     * Query GIS endpoints for the city containing the given point.
     * Tries multiple endpoints with fallback. Returns { name } or null.
     */
    async function queryCityGIS(lat, lng) {
        for (const endpoint of CITY_ENDPOINTS) {
            try {
                const params = new URLSearchParams({
                    where: '1=1',
                    geometry: `${lng},${lat}`,
                    geometryType: 'esriGeometryPoint',
                    inSR: '4326',
                    spatialRel: 'esriSpatialRelIntersects',
                    outFields: '*',
                    returnGeometry: 'false',
                    f: 'json'
                });

                const resp = await fetch(`${endpoint}?${params}`);
                if (!resp.ok) continue;

                const data = await resp.json();
                if (data.error) continue;

                if (data.features && data.features.length > 0) {
                    const attrs = data.features[0].attributes;
                    let name = extractFieldName(attrs, CITY_NAME_FIELDS);

                    if (name) {
                        // Clean up city name
                        name = name.replace(/, TX$/i, '').replace(/, Texas$/i, '').replace(/^City of /i, '');
                        return { name };
                    }
                }
            } catch (err) {
                console.warn(`City endpoint failed: ${endpoint}`, err);
            }
        }
        return null;
    }

    /**
     * Fallback: Query Census Bureau Geocoder for the city/place at a point.
     * Returns { name } or null.
     */
    async function queryCityCensus(lat, lng) {
        const params = new URLSearchParams({
            x: lng,
            y: lat,
            benchmark: 'Public_AR_Current',
            vintage: 'Current_Current',
            format: 'json'
        });

        try {
            const resp = await fetch(`${CENSUS_GEOCODE}?${params}`);
            if (!resp.ok) return null;

            const data = await resp.json();
            const matches = data?.result?.geographies?.['Census Blocks'] ||
                data?.result?.geographies?.Places;
            if (matches && matches.length > 0) {
                // Look for Incorporated Place (sumlevel 162) or Census Designated Place (170)
                for (const m of matches) {
                    if (m.sumlevel === '162' || m.sumlevel === '170') {
                        return { name: m.NAME.replace(/, Texas$/i, '') };
                    }
                }
                for (const m of matches) {
                    if (m.NAME) {
                        return { name: m.NAME.replace(/, Texas$/i, '') };
                    }
                }
            }
        } catch (err) {
            console.warn('Census geocode query failed:', err);
        }
        return null;
    }

    /**
     * Combined city query — tries GIS endpoints first, falls back to Census.
     */
    async function queryCity(lat, lng) {
        const gisResult = await queryCityGIS(lat, lng);
        if (gisResult) return gisResult;

        const censusResult = await queryCityCensus(lat, lng);
        if (censusResult) return censusResult;

        return null;
    }

    /**
     * Query the Census Unified School District boundary containing the
     * given point. This is real polygon data (same category as city/county
     * above) — so, unlike colleges, ISD matching is exact, not proximity-based.
     * Returns { name } or null.
     */
    async function queryISD(lat, lng) {
        for (const endpoint of ISD_ENDPOINTS) {
            try {
                const params = new URLSearchParams({
                    where: '1=1',
                    geometry: `${lng},${lat}`,
                    geometryType: 'esriGeometryPoint',
                    inSR: '4326',
                    spatialRel: 'esriSpatialRelIntersects',
                    outFields: '*',
                    returnGeometry: 'false',
                    f: 'json'
                });

                const resp = await fetch(`${endpoint}?${params}`);
                if (!resp.ok) continue;

                const data = await resp.json();
                if (data.error) continue;

                if (data.features && data.features.length > 0) {
                    const attrs = data.features[0].attributes;
                    let name = extractFieldName(attrs, ISD_NAME_FIELDS);
                    if (name) {
                        name = name.replace(/ ISD$/i, '').replace(/ Independent School District$/i, '').trim();
                        return { name };
                    }
                }
            } catch (err) {
                console.warn(`ISD endpoint failed: ${endpoint}`, err);
            }
        }
        return null;
    }

    function haversineMiles(lat1, lng1, lat2, lng2) {
        const toRad = (d) => (d * Math.PI) / 180;
        const R = 3958.8; // Earth radius in miles
        const dLat = toRad(lat2 - lat1);
        const dLng = toRad(lng2 - lng1);
        const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    /**
     * Colleges have no standard, publicly queryable campus-boundary dataset
     * the way cities/counties/ISDs do — so this matches by proximity to an
     * admin-entered campus center point instead of a real polygon. Returns
     * the closest campus within its configured radius, or null.
     */
    async function queryCollege(lat, lng) {
        const db = await agencyDBPromise;
        let closest = null;
        let closestDist = Infinity;

        for (const agency of Object.values(db.agencies || {})) {
            if (agency.jurisdictionType !== 'college') continue;
            const cLat = parseFloat(agency.campusLat);
            const cLng = parseFloat(agency.campusLng);
            const radius = parseFloat(agency.radiusMiles);
            if (!isFinite(cLat) || !isFinite(cLng) || !isFinite(radius)) continue;

            const dist = haversineMiles(lat, lng, cLat, cLng);
            if (dist <= radius && dist < closestDist) {
                closest = { name: agency.jurisdictionName };
                closestDist = dist;
            }
        }
        return closest;
    }

    /**
     * Get the area code for a county (used for fallback contact generation).
     */
    function getAreaCode(countyName) {
        return AREA_CODE_MAP[countyName.toLowerCase()] || '512';
    }

    // ── Geocoding (Nominatim) ───────────────────────────────────────────────

    async function reverseGeocode(lat, lng) {
        const params = new URLSearchParams({
            lat, lon: lng,
            format: 'json',
            addressdetails: '1'
        });

        try {
            const resp = await fetch(`${NOMINATIM_REVERSE}?${params}`, {
                headers: { 'Accept-Language': 'en' }
            });
            return await resp.json();
        } catch (err) {
            console.warn('Reverse geocode failed:', err);
            return null;
        }
    }

    async function geocodeAddress(address) {
        const searchAddr = address.toLowerCase().includes('texas') || address.toLowerCase().includes('tx')
            ? address
            : `${address}, Texas`;

        // Try Nominatim first — best coverage for partial street names & landmarks
        const nominatimResult = await tryNominatimSearch(searchAddr);
        if (nominatimResult) return nominatimResult;

        // Fallback to Esri's World Geocoder — better coverage for rural/newer
        // addresses (and some agency addresses) missing from OpenStreetMap.
        const esriResult = await tryEsriSearch(searchAddr);
        if (esriResult) return esriResult;

        return null;
    }

    async function tryNominatimSearch(searchAddr) {
        const params = new URLSearchParams({
            q: searchAddr,
            format: 'json',
            limit: 1,
            addressdetails: 1
        });

        try {
            const resp = await fetch(`${NOMINATIM_SEARCH}?${params}`, {
                headers: { 'Accept-Language': 'en' }
            });
            if (!resp.ok) {
                console.warn('Nominatim search failed with status', resp.status);
                return null;
            }
            const results = await resp.json();
            if (results.length > 0) {
                return {
                    lat: parseFloat(results[0].lat),
                    lng: parseFloat(results[0].lon),
                    displayName: results[0].display_name
                };
            }
        } catch (err) {
            console.warn('Nominatim search failed:', err);
        }
        return null;
    }

    async function tryEsriSearch(searchAddr) {
        // Esri returns coordinates as {x: lng, y: lat} in WGS84.
        const params = new URLSearchParams({
            f: 'json',
            singleLine: searchAddr,
            maxLocations: 1,
            outFields: 'Match_addr'
        });

        try {
            const resp = await fetch(`${ESRI_GEOCODE}?${params}`);
            if (!resp.ok) {
                console.warn('Esri geocode search failed with status', resp.status);
                return null;
            }
            const data = await resp.json();
            const candidate = data.candidates && data.candidates[0];
            if (candidate && candidate.location) {
                return {
                    lat: parseFloat(candidate.location.y),
                    lng: parseFloat(candidate.location.x),
                    displayName: candidate.address || (candidate.attributes && candidate.attributes.Match_addr) || searchAddr
                };
            }
        } catch (err) {
            console.warn('Esri geocode search failed:', err);
        }
        return null;
    }

    // ── Jurisdiction Resolution ─────────────────────────────────────────────

    /**
     * Given a lat/lng, determines city and county via GIS APIs,
     * then resolves jurisdiction hierarchy (city > county > state).
     */
    async function resolveJurisdiction(lat, lng) {
        // Run city, county, ISD, and college queries in parallel
        const [cityResult, countyResult, isdResult, collegeResult] = await Promise.all([
            queryCity(lat, lng),
            queryCounty(lat, lng),
            queryISD(lat, lng),
            queryCollege(lat, lng)
        ]);

        // Build result object
        const jurisdiction = {
            city: cityResult,
            county: countyResult,
            isd: isdResult,
            college: collegeResult,
            primary: null,
            backup: null,
            primaryContact: null,
            backupContact: null,
            // Additional, non-hierarchical matches (ISD/college police serve
            // specific properties, not a general-purpose area the way city/
            // county policing does, so they're shown alongside, not ranked).
            additional: [],
            defaultContact: await getDefaultAgency()
        };

        // Hierarchy: city is primary, county is backup
        if (cityResult) {
            jurisdiction.primary = {
                name: `${cityResult.name} Police Department`,
                type: 'City Police',
                jurisdictionName: cityResult.name,
                jurisdictionType: 'city'
            };
            jurisdiction.primaryContact = await getAgency('city', cityResult.name);

            // If no contact on file, generate helpful fallback info
            if (!jurisdiction.primaryContact) {
                const areaCode = countyResult ? getAreaCode(countyResult.name) : '512';
                jurisdiction.primaryContact = {
                    agencyName: `${cityResult.name} Police Department`,
                    phone: `Search: "${cityResult.name} Texas police non-emergency"`,
                    address: `Visit: ${cityResult.name} city hall or police department`,
                    website: `https://www.google.com/search?q=${encodeURIComponent(cityResult.name + ' Texas police department')}`
                };
            }
        }

        if (countyResult) {
            const countyAgency = {
                name: `${countyResult.name} County Sheriff's Office`,
                type: 'County Sheriff',
                jurisdictionName: countyResult.name,
                jurisdictionType: 'county'
            };

            if (jurisdiction.primary) {
                // City is primary, county is backup
                jurisdiction.backup = countyAgency;
                jurisdiction.backupContact = await getAgency('county', countyResult.name);

                // If no contact on file for county, generate fallback
                if (!jurisdiction.backupContact) {
                    jurisdiction.backupContact = {
                        agencyName: `${countyResult.name} County Sheriff's Office`,
                        phone: `Search: "${countyResult.name} County Texas sheriff non-emergency"`,
                        address: `Visit: ${countyResult.name} County website`,
                        website: `https://www.google.com/search?q=${encodeURIComponent(countyResult.name + ' County Texas sheriff office')}`
                    };
                }
            } else {
                // No city match — county is primary
                jurisdiction.primary = countyAgency;
                jurisdiction.primaryContact = await getAgency('county', countyResult.name);

                if (!jurisdiction.primaryContact) {
                    jurisdiction.primaryContact = {
                        agencyName: `${countyResult.name} County Sheriff's Office`,
                        phone: `Search: "${countyResult.name} County Texas sheriff non-emergency"`,
                        address: `Visit: ${countyResult.name} County website`,
                        website: `https://www.google.com/search?q=${encodeURIComponent(countyResult.name + ' County Texas sheriff office')}`
                    };
                }
            }
        }

        // ISD police (real boundary match — only shown when an ISD agency
        // is actually on file, since most ISDs don't have their own PD and
        // are served by local city/county police instead)
        if (isdResult) {
            const isdContact = await getAgency('isd', isdResult.name);
            if (isdContact) {
                jurisdiction.additional.push({
                    agency: {
                        name: isdContact.agencyName || `${isdResult.name} ISD Police Department`,
                        type: 'ISD Police',
                        jurisdictionName: isdResult.name,
                        jurisdictionType: 'isd'
                    },
                    contact: isdContact
                });
            }
        }

        // College/university police (proximity match — see queryCollege)
        if (collegeResult) {
            const collegeContact = await getAgency('college', collegeResult.name);
            if (collegeContact) {
                jurisdiction.additional.push({
                    agency: {
                        name: collegeContact.agencyName || `${collegeResult.name} Police Department`,
                        type: 'Campus Police',
                        jurisdictionName: collegeResult.name,
                        jurisdictionType: 'college'
                    },
                    contact: collegeContact
                });
            }
        }

        // If nothing matched at all, use default (Texas DPS)
        if (!jurisdiction.primary) {
            jurisdiction.primary = {
                name: 'Texas Department of Public Safety',
                type: 'State Police',
                jurisdictionName: 'Texas',
                jurisdictionType: 'state'
            };
        }

        return jurisdiction;
    }

    // ── UI Rendering ────────────────────────────────────────────────────────

    function showLoading(show) {
        loadingState.classList.toggle('hidden', !show);
    }

    function showError(msg) {
        errorMessage.textContent = msg;
        errorDisplay.classList.remove('hidden');
    }

    function hideError() {
        errorDisplay.classList.add('hidden');
    }

    function showLocationInfo(lat, lng, addressInfo) {
        locationDisplay.classList.remove('hidden');

        if (addressInfo) {
            const addr = addressInfo.address || {};
            const parts = [addr.house_number, addr.road, addr.city || addr.town || addr.village, 'TX', addr.postcode].filter(Boolean);
            locationName.textContent = parts.join(' ') || 'Location Found';
            locationDetails.textContent = addressInfo.display_name || '';
        } else {
            locationName.textContent = 'Location Found';
            locationDetails.textContent = '';
        }

        coordinates.textContent = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    }

    function renderJurisdictionCard(agency, contact, label, isPrimary) {
        if (!agency) return '';

        const hasContact = contact && contact.agencyName;
        const phone = hasContact ? contact.phone : null;
        const address = hasContact ? contact.address : null;
        const website = hasContact ? contact.website : null;
        const onlineReporting = hasContact ? contact.onlineReporting : null;

        // Detect if phone is a real number vs a search suggestion
        const isRealPhone = phone && /^\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}$/.test(phone.replace(/[^0-9()]/g, ''));
        // Detect if website is a real URL vs a search suggestion
        const isRealUrl = website && (website.startsWith('http://') || website.startsWith('https://'));

        const iconByType = {
            isd: 'fa-graduation-cap',
            college: 'fa-graduation-cap'
        };
        const icon = iconByType[agency.jurisdictionType] || (isPrimary ? 'fa-shield-halved' : 'fa-building-shield');
        const badgeClass = isPrimary ? 'badge-primary' : (agency.jurisdictionType === 'isd' || agency.jurisdictionType === 'college' ? 'badge-default' : 'badge-secondary');
        const badge = `<span class="badge ${badgeClass}">${label}</span>`;

        let contactHTML = '';
        if (hasContact) {
            const phoneDigits = isRealPhone ? phone.replace(/[^0-9+]/g, '') : null;

            contactHTML = `
                <div class="contact-info">
                    ${phone ? `
                    <div class="contact-item">
                        <i class="fas fa-phone"></i>
                        ${isRealPhone
                        ? `<span>${phone}</span>`
                        : `<span class="search-hint">${phone}</span>`}
                    </div>` : ''}
                    ${address ? `
                    <div class="contact-item">
                        <i class="fas fa-location-dot"></i>
                        <span>${address}</span>
                    </div>` : ''}
                    ${website ? `
                    <div class="contact-item">
                        <i class="fas fa-globe"></i>
                        ${isRealUrl
                        ? `<a href="${website}" target="_blank" rel="noopener">${website}</a>`
                        : `<span class="search-hint">${website}</span>`}
                    </div>` : ''}
                </div>
                <div class="contact-actions">
                    ${isRealPhone ? `<a href="tel:${phoneDigits}" class="btn btn-call"><i class="fas fa-phone"></i> Call Non-Emergency</a>` : ''}
                    ${isRealUrl ? `<a href="${website}" target="_blank" rel="noopener" class="btn btn-website"><i class="fas fa-globe"></i> Visit Website</a>` : ''}
                    ${onlineReporting ? `<a href="${onlineReporting}" target="_blank" rel="noopener" class="btn btn-report"><i class="fas fa-file-lines"></i> File Report Online</a>` : ''}
                </div>`;
        } else {
            contactHTML = `
                <div class="no-contact">
                    <i class="fas fa-info-circle"></i>
                    <p>No contact information on file for this agency.</p>
                    <a href="admin.html" class="btn btn-secondary"><i class="fas fa-plus"></i> Add Contact Info</a>
                </div>`;
        }

        return `
            <div class="jurisdiction-card">
                <div class="jurisdiction-header">
                    <div class="jurisdiction-icon">
                        <i class="fas ${icon}"></i>
                    </div>
                    <div class="jurisdiction-info">
                        <h3>${agency.name}</h3>
                        <p class="jurisdiction-type">${agency.type} ${badge}</p>
                    </div>
                </div>
                ${contactHTML}
                <button type="button" class="btn-link btn-suggest-correction"
                    data-agency-name="${escapeAttr(agency.name)}"
                    data-jurisdiction-key="${escapeAttr(`${agency.jurisdictionType}:${agency.jurisdictionName}`)}"
                    data-phone="${escapeAttr(isRealPhone ? phone : '')}"
                    data-address="${escapeAttr(address || '')}"
                    data-website="${escapeAttr(isRealUrl ? website : '')}"
                    data-online-reporting="${escapeAttr(onlineReporting || '')}">
                    <i class="fas fa-flag"></i> Suggest a correction
                </button>
            </div>`;
    }

    function renderDefaultAgencyCard(contact, badgeLabel) {
        if (!contact) {
            return `
                <div class="no-results">
                    <i class="fas fa-question-circle"></i>
                    <p>No default agency has been configured yet.</p>
                </div>`;
        }
        return `
            <div class="jurisdiction-card">
                <div class="jurisdiction-header">
                    <div class="jurisdiction-icon default-icon">
                        <i class="fas fa-star"></i>
                    </div>
                    <div class="jurisdiction-info">
                        <h3>${contact.agencyName || 'Texas Department of Public Safety'}</h3>
                        <p class="jurisdiction-type">State Police <span class="badge badge-default">${badgeLabel}</span></p>
                    </div>
                </div>
                <div class="contact-info">
                    ${contact.phone ? `
                    <div class="contact-item">
                        <i class="fas fa-phone"></i>
                        <span>${contact.phone}</span>
                    </div>` : ''}
                    ${contact.address ? `
                    <div class="contact-item">
                        <i class="fas fa-location-dot"></i>
                        <span>${contact.address}</span>
                    </div>` : ''}
                    ${contact.website ? `
                    <div class="contact-item">
                        <i class="fas fa-globe"></i>
                        <a href="${contact.website}" target="_blank" rel="noopener">${contact.website}</a>
                    </div>` : ''}
                </div>
                <div class="contact-actions">
                    ${contact.phone ? `<a href="tel:${contact.phone.replace(/[^0-9+]/g, '')}" class="btn btn-call"><i class="fas fa-phone"></i> Call Non-Emergency</a>` : ''}
                    ${contact.website ? `<a href="${contact.website}" target="_blank" rel="noopener" class="btn btn-website"><i class="fas fa-globe"></i> Visit Website</a>` : ''}
                </div>
                <button type="button" class="btn-link btn-suggest-correction"
                    data-agency-name="${escapeAttr(contact.agencyName || 'Texas Department of Public Safety')}"
                    data-jurisdiction-key="default"
                    data-phone="${escapeAttr(contact.phone || '')}"
                    data-address="${escapeAttr(contact.address || '')}"
                    data-website="${escapeAttr(contact.website || '')}"
                    data-online-reporting="">
                    <i class="fas fa-flag"></i> Suggest a correction
                </button>
            </div>`;
    }

    async function showDefaultStateAgency() {
        const contact = await getDefaultAgency();
        defaultStateResults.innerHTML = renderDefaultAgencyCard(contact, 'Default Jurisdiction');
    }
    showDefaultStateAgency();

    function renderJurisdictionResults(jurisdiction) {
        let html = '';

        // Primary agency
        if (jurisdiction.primary) {
            html += renderJurisdictionCard(
                jurisdiction.primary,
                jurisdiction.primaryContact,
                'Primary Jurisdiction',
                true
            );
        }

        // Backup/secondary agency (county when city is primary)
        if (jurisdiction.backup) {
            html += renderJurisdictionCard(
                jurisdiction.backup,
                jurisdiction.backupContact,
                'Secondary Jurisdiction',
                false
            );
        }

        // ISD / college police — shown alongside city/county, not ranked
        // against them (a campus or school property can have its own PD
        // even though the surrounding area is also served by city/county).
        for (const extra of jurisdiction.additional) {
            html += renderJurisdictionCard(
                extra.agency,
                extra.contact,
                'Also Serving This Area',
                false
            );
        }

        // Default agency (only shown when no primary match from GIS)
        if (!jurisdiction.primaryContact && !jurisdiction.backupContact && jurisdiction.defaultContact) {
            html += renderDefaultAgencyCard(jurisdiction.defaultContact, 'Default Jurisdiction');
        }

        // Context info
        const contextParts = [];
        if (jurisdiction.city) contextParts.push(`City: ${jurisdiction.city.name}`);
        if (jurisdiction.county) contextParts.push(`County: ${jurisdiction.county.name} County`);
        if (jurisdiction.isd) contextParts.push(`ISD: ${jurisdiction.isd.name}`);
        if (jurisdiction.college) contextParts.push(`Near: ${jurisdiction.college.name}`);

        if (contextParts.length > 0) {
            html = `
                <div class="jurisdiction-context">
                    <i class="fas fa-map-pin"></i>
                    <span>${contextParts.join(' &middot; ')}</span>
                </div>` + html;
        }

        if (!html) {
            html = `
                <div class="no-results">
                    <i class="fas fa-question-circle"></i>
                    <p>Unable to determine jurisdiction for this location.</p>
                    <p class="text-muted">Make sure the location is within Texas.</p>
                </div>`;
        }

        jurisdictionResults.innerHTML = html;
        jurisdictionSection.classList.remove('hidden');
        scrollToResults();
    }

    // ── Scroll to Results ────────────────────────────────────────────────────
    function scrollToResults() {
        setTimeout(() => {
            jurisdictionSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    }

    // ── Main Lookup Flow ────────────────────────────────────────────────────

    async function performLookup(lat, lng) {
        hideError();
        showLoading(true);
        jurisdictionSection.classList.add('hidden');
        locationDisplay.classList.add('hidden');
        mapSection.classList.add('hidden');
        defaultStateSection.classList.add('hidden');

        try {
            // Validate Texas bounds
            if (lat < TEXAS_BOUNDS.minLat || lat > TEXAS_BOUNDS.maxLat ||
                lng < TEXAS_BOUNDS.minLng || lng > TEXAS_BOUNDS.maxLng) {
                throw new Error('This location appears to be outside of Texas. This app only covers Texas jurisdictions.');
            }

            // Reverse geocode for display
            const addressInfo = await reverseGeocode(lat, lng);
            showLocationInfo(lat, lng, addressInfo);
            showTexasBeacon(lat, lng);

            // Resolve jurisdiction via GIS APIs
            const jurisdiction = await resolveJurisdiction(lat, lng);
            renderJurisdictionResults(jurisdiction);

        } catch (err) {
            showError(err.message || 'An unexpected error occurred.');
            console.error('Lookup error:', err);
        } finally {
            showLoading(false);
        }
    }

    // ── Event Handlers ──────────────────────────────────────────────────────

    // Use My Location button
    btnLocation.addEventListener('click', () => {
        if (!navigator.geolocation) {
            showError('Geolocation is not supported by your browser.');
            return;
        }

        showLoading(true);
        hideError();

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                performLookup(pos.coords.latitude, pos.coords.longitude);
            },
            (err) => {
                showLoading(false);
                switch (err.code) {
                    case err.PERMISSION_DENIED:
                        showError('Location permission denied. Please enable location access in your browser settings and try again.');
                        break;
                    case err.POSITION_UNAVAILABLE:
                        showError('Location information is unavailable. Please try again.');
                        break;
                    case err.TIMEOUT:
                        showError('Location request timed out. Please try again.');
                        break;
                    default:
                        showError('Unable to retrieve your location. Please try again.');
                }
            },
            {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 30000
            }
        );
    });

    // Address search
    btnSearch.addEventListener('click', async () => {
        const address = inputSearch.value.trim();
        if (!address) {
            showError('Please enter an address to search.');
            return;
        }

        showLoading(true);
        hideError();

        try {
            const result = await geocodeAddress(address);
            if (!result) {
                throw new Error('Address not found. Please check your spelling and try again.');
            }

            // Verify Texas bounds
            if (result.lat < TEXAS_BOUNDS.minLat || result.lat > TEXAS_BOUNDS.maxLat ||
                result.lng < TEXAS_BOUNDS.minLng || result.lng > TEXAS_BOUNDS.maxLng) {
                throw new Error('This address appears to be outside of Texas.');
            }

            await performLookup(result.lat, result.lng);
        } catch (err) {
            showLoading(false);
            showError(err.message || 'Search failed. Please try again.');
        }
    });

    // Search on Enter key
    inputSearch.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            btnSearch.click();
        }
    });

    // ── Suggest a Correction ───────────────────────────────────────────────
    //
    // Same no-backend pattern as the CaseLaw-LE reference project: a
    // submission becomes a real GitHub Issue (label "correction") only when
    // this browser has an active admin session (i.e. someone signed in via
    // admin.html in this same browser); otherwise it's saved to this
    // browser's localStorage, and only becomes visible to the admin if they
    // happen to open admin.html on that same device. Public visitors on
    // their own devices will, in the vast majority of cases, produce local
    // submissions the admin never automatically sees cross-device — there's
    // no backend here to bridge that gap.
    const GITHUB_OWNER = 'rbyers87';
    const GITHUB_REPO = 'Police-Finder';
    const CORRECTIONS_LABEL = 'correction';
    const LOCAL_CORRECTIONS_KEY = 'txle_agency_corrections';
    const GITHUB_TOKEN_SESSION_KEY = 'txle_admin_gh_token'; // shared with admin.js

    const FIELD_LABELS = {
        phone: 'Phone number',
        address: 'Address',
        website: 'Website',
        onlineReporting: 'Online reporting URL',
        agencyName: 'Agency name'
    };

    const correctionModal = $('#correctionModal');
    const correctionAgencyName = $('#correctionAgencyName');
    const correctionField = $('#correctionField');
    const correctionCurrentValue = $('#correctionCurrentValue');
    const correctionValue = $('#correctionValue');
    const correctionNote = $('#correctionNote');
    const correctionSubmittedBy = $('#correctionSubmittedBy');
    const correctionStatus = $('#correctionStatus');
    const submitCorrectionBtn = $('#submitCorrectionBtn');
    const cancelCorrectionBtn = $('#cancelCorrectionBtn');

    let correctionContext = null; // { agencyName, jurisdictionKey, values: {phone, address, website, onlineReporting} }

    function updateCorrectionCurrentValue() {
        const field = correctionField.value;
        const value = correctionContext ? correctionContext.values[field] : '';
        correctionCurrentValue.textContent = value || '(none on file)';
        correctionValue.value = '';
    }

    function openCorrectionModal(trigger) {
        correctionContext = {
            agencyName: trigger.dataset.agencyName || '',
            jurisdictionKey: trigger.dataset.jurisdictionKey || '',
            values: {
                phone: trigger.dataset.phone || '',
                address: trigger.dataset.address || '',
                website: trigger.dataset.website || '',
                onlineReporting: trigger.dataset.onlineReporting || '',
                agencyName: trigger.dataset.agencyName || ''
            }
        };
        correctionAgencyName.textContent = correctionContext.agencyName;
        correctionField.value = 'phone';
        correctionNote.value = '';
        correctionSubmittedBy.value = '';
        correctionStatus.textContent = '';
        correctionStatus.className = 'correction-status';
        updateCorrectionCurrentValue();
        correctionModal.classList.remove('hidden');
        correctionValue.focus();
    }

    function closeCorrectionModal() {
        correctionModal.classList.add('hidden');
        correctionContext = null;
    }

    // Event delegation: correction buttons are inside dynamically-rendered
    // card HTML, so listen on the containers they're rendered into.
    [jurisdictionResults, defaultStateResults].forEach((container) => {
        container.addEventListener('click', (e) => {
            const btn = e.target.closest('.btn-suggest-correction');
            if (btn) openCorrectionModal(btn);
        });
    });

    correctionField.addEventListener('change', updateCorrectionCurrentValue);
    cancelCorrectionBtn.addEventListener('click', closeCorrectionModal);
    correctionModal.querySelector('.modal-close').addEventListener('click', closeCorrectionModal);
    correctionModal.addEventListener('click', (e) => {
        if (e.target === correctionModal) closeCorrectionModal();
    });

    function saveLocalCorrection(item) {
        let items = [];
        try {
            items = JSON.parse(localStorage.getItem(LOCAL_CORRECTIONS_KEY) || '[]');
        } catch { /* start fresh */ }
        items.push(item);
        localStorage.setItem(LOCAL_CORRECTIONS_KEY, JSON.stringify(items));
    }

    async function createGithubCorrectionIssue(item, token) {
        const body = [
            `**Agency:** ${item.agencyName}`,
            `**Jurisdiction Key:** ${item.jurisdictionKey}`,
            `**Field:** ${item.field}`,
            `**Current Value:** ${item.currentValue}`,
            `**Suggested Value:** ${item.suggestedValue}`,
            `**Note:** ${item.note}`,
            `**Submitted By:** ${item.submittedBy}`
        ].join('\n');

        const response = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues`, {
            method: 'POST',
            headers: {
                Accept: 'application/vnd.github+json',
                Authorization: `Bearer ${token}`,
                'X-GitHub-Api-Version': '2022-11-28',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title: `Correction: ${item.agencyName} — ${FIELD_LABELS[item.field] || item.field}`,
                body,
                labels: [CORRECTIONS_LABEL]
            })
        });
        if (!response.ok) throw new Error(`GitHub issue creation failed (${response.status})`);
    }

    submitCorrectionBtn.addEventListener('click', async () => {
        if (!correctionContext) return;
        const value = correctionValue.value.trim();
        if (!value) {
            correctionStatus.textContent = 'Please enter the corrected value.';
            correctionStatus.className = 'correction-status error';
            return;
        }

        const item = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            timestamp: new Date().toISOString(),
            agencyName: correctionContext.agencyName,
            jurisdictionKey: correctionContext.jurisdictionKey,
            field: correctionField.value,
            currentValue: correctionContext.values[correctionField.value] || '',
            suggestedValue: value,
            note: correctionNote.value.trim(),
            submittedBy: correctionSubmittedBy.value.trim()
        };

        submitCorrectionBtn.disabled = true;
        correctionStatus.textContent = 'Submitting...';
        correctionStatus.className = 'correction-status';

        const token = sessionStorage.getItem(GITHUB_TOKEN_SESSION_KEY);
        try {
            if (token) {
                await createGithubCorrectionIssue(item, token);
            } else {
                saveLocalCorrection(item);
            }
            correctionStatus.textContent = 'Thanks! Your suggestion has been submitted for review.';
            correctionStatus.className = 'correction-status success';
            setTimeout(closeCorrectionModal, 1500);
        } catch (err) {
            // Fall back to local save if the GitHub call fails for any reason
            // (e.g. an expired token) so the submission isn't lost.
            saveLocalCorrection(item);
            correctionStatus.textContent = 'Thanks! Your suggestion has been submitted for review.';
            correctionStatus.className = 'correction-status success';
            setTimeout(closeCorrectionModal, 1500);
        } finally {
            submitCorrectionBtn.disabled = false;
        }
    });

})();
