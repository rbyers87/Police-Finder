// Texas Law Enforcement Jurisdiction Locator — Main Application

(function () {
    'use strict';

    // ── DOM References ──────────────────────────────────────────────────────
    const $ = (sel) => document.querySelector(sel);
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

    // ── Constants ───────────────────────────────────────────────────────────
    const TEXAS_BOUNDS = {
        minLat: 25.8, maxLat: 36.5,
        minLng: -106.6, maxLng: -93.5
    };

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

    // Field names to try when parsing GIS responses (varies by endpoint)
    const CITY_NAME_FIELDS = ['CITY_NM', 'NAME', 'CITY_NAME', 'NAMELSAD', 'NAME10', 'FULLNAME'];
    const COUNTY_NAME_FIELDS = ['CNTY_NM', 'NAME', 'COUNTY_NAME', 'COUNTYNAME', 'NAMELSAD', 'COUNTY_FIPS'];

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

    // ── Contact Database (localStorage) ─────────────────────────────────────
    const DB_KEY = 'txle_agencies';

    function loadAgencyDB() {
        try {
            const raw = localStorage.getItem(DB_KEY);
            return raw ? JSON.parse(raw) : { agencies: {}, defaultAgency: null };
        } catch {
            return { agencies: {}, defaultAgency: null };
        }
    }

    function getAgency(jurisdictionType, jurisdictionName) {
        const db = loadAgencyDB();
        const key = `${jurisdictionType}:${jurisdictionName}`;
        return db.agencies[key] || null;
    }

    function getDefaultAgency() {
        // Check separate key first (set by admin page), fall back to inline
        try {
            const raw = localStorage.getItem('txle_default_agency');
            if (raw) return JSON.parse(raw);
        } catch { /* ignore */ }
        return loadAgencyDB().defaultAgency;
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
        // Run city and county queries in parallel
        const [cityResult, countyResult] = await Promise.all([
            queryCity(lat, lng),
            queryCounty(lat, lng)
        ]);

        // Build result object
        const jurisdiction = {
            city: cityResult,
            county: countyResult,
            primary: null,
            backup: null,
            primaryContact: null,
            backupContact: null,
            defaultContact: getDefaultAgency()
        };

        // Hierarchy: city is primary, county is backup
        if (cityResult) {
            jurisdiction.primary = {
                name: `${cityResult.name} Police Department`,
                type: 'City Police',
                jurisdictionName: cityResult.name,
                jurisdictionType: 'city'
            };
            jurisdiction.primaryContact = getAgency('city', cityResult.name);

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
                jurisdiction.backupContact = getAgency('county', countyResult.name);

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
                jurisdiction.primaryContact = getAgency('county', countyResult.name);

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

        const icon = isPrimary ? 'fa-shield-halved' : 'fa-building-shield';
        const badge = isPrimary
            ? '<span class="badge badge-primary">Primary Jurisdiction</span>'
            : '<span class="badge badge-secondary">Secondary Jurisdiction</span>';

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
            </div>`;
    }

    function renderJurisdictionResults(jurisdiction) {
        let html = '';

        // Primary agency
        if (jurisdiction.primary) {
            html += renderJurisdictionCard(
                jurisdiction.primary,
                jurisdiction.primaryContact,
                'Primary',
                true
            );
        }

        // Backup/secondary agency (county when city is primary)
        if (jurisdiction.backup) {
            html += renderJurisdictionCard(
                jurisdiction.backup,
                jurisdiction.backupContact,
                'Secondary',
                false
            );
        }

        // Default agency (only shown when no primary match from GIS)
        if (!jurisdiction.primaryContact && !jurisdiction.backupContact && jurisdiction.defaultContact) {
            html += `
                <div class="jurisdiction-card">
                    <div class="jurisdiction-header">
                        <div class="jurisdiction-icon default-icon">
                            <i class="fas fa-star"></i>
                        </div>
                        <div class="jurisdiction-info">
                            <h3>${jurisdiction.defaultContact.agencyName || 'Texas Department of Public Safety'}</h3>
                            <p class="jurisdiction-type">State Police <span class="badge badge-default">Default Jurisdiction</span></p>
                        </div>
                    </div>
                    <div class="contact-info">
                        ${jurisdiction.defaultContact.phone ? `
                        <div class="contact-item">
                            <i class="fas fa-phone"></i>
                            <span>${jurisdiction.defaultContact.phone}</span>
                        </div>` : ''}
                        ${jurisdiction.defaultContact.address ? `
                        <div class="contact-item">
                            <i class="fas fa-location-dot"></i>
                            <span>${jurisdiction.defaultContact.address}</span>
                        </div>` : ''}
                        ${jurisdiction.defaultContact.website ? `
                        <div class="contact-item">
                            <i class="fas fa-globe"></i>
                            <a href="${jurisdiction.defaultContact.website}" target="_blank" rel="noopener">${jurisdiction.defaultContact.website}</a>
                        </div>` : ''}
                    </div>
                    <div class="contact-actions">
                        ${jurisdiction.defaultContact.phone ? `<a href="tel:${jurisdiction.defaultContact.phone.replace(/[^0-9+]/g, '')}" class="btn btn-call"><i class="fas fa-phone"></i> Call Non-Emergency</a>` : ''}
                        ${jurisdiction.defaultContact.website ? `<a href="${jurisdiction.defaultContact.website}" target="_blank" rel="noopener" class="btn btn-website"><i class="fas fa-globe"></i> Visit Website</a>` : ''}
                    </div>
                </div>`;
        }

        // Context info
        const contextParts = [];
        if (jurisdiction.city) contextParts.push(`City: ${jurisdiction.city.name}`);
        if (jurisdiction.county) contextParts.push(`County: ${jurisdiction.county.name} County`);

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
    }

    // ── Main Lookup Flow ────────────────────────────────────────────────────

    async function performLookup(lat, lng) {
        hideError();
        showLoading(true);
        jurisdictionSection.classList.add('hidden');
        locationDisplay.classList.add('hidden');

        try {
            // Validate Texas bounds
            if (lat < TEXAS_BOUNDS.minLat || lat > TEXAS_BOUNDS.maxLat ||
                lng < TEXAS_BOUNDS.minLng || lng > TEXAS_BOUNDS.maxLng) {
                throw new Error('This location appears to be outside of Texas. This app only covers Texas jurisdictions.');
            }

            // Reverse geocode for display
            const addressInfo = await reverseGeocode(lat, lng);
            showLocationInfo(lat, lng, addressInfo);

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

})();
