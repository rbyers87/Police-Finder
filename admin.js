// Admin Page — Agency Contact Management

(function () {
    'use strict';

    const DB_KEY = 'txle_agencies';
    const DEFAULT_KEY = 'txle_default_agency';
    const SEED_VERSION_KEY = 'txle_seed_version';
    const CURRENT_SEED_VERSION = 2; // Bump this to force re-seed
    const GITHUB_OWNER = 'rbyers87';
    const GITHUB_REPO = 'Police-Finder';
    const GITHUB_BRANCH = 'main';
    const GITHUB_DATA_PATH = 'agency-data.json';
    const CORRECTIONS_LABEL = 'correction';
    const LOCAL_CORRECTIONS_KEY = 'txle_agency_corrections';
    // Shared with app.js on the public site (same origin) so a submission
    // made from a browser with an active admin session creates a real
    // GitHub issue instead of only saving locally.
    const GITHUB_TOKEN_SESSION_KEY = 'txle_admin_gh_token';

    function getAdminToken() {
        return sessionStorage.getItem(GITHUB_TOKEN_SESSION_KEY) || null;
    }

    function setAdminToken(token) {
        sessionStorage.setItem(GITHUB_TOKEN_SESSION_KEY, token);
    }

    function clearAdminToken() {
        sessionStorage.removeItem(GITHUB_TOKEN_SESSION_KEY);
    }

    function githubHeaders(extra) {
        const token = getAdminToken();
        return {
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...extra
        };
    }

    // ── Password Gate ────────────────────────────────────────────────────────
    const AUTH_SESSION_KEY = 'txle_admin_auth';
    const ADMIN_HASH = '92854981408c85920f4d446368ad57db3f192ed17734ec1aecbddcb7d3c44c4c';
    const ADMIN_SALT = 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6';

    async function sha256(message) {
        const msgBuffer = new TextEncoder().encode(message);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    async function verifyPassword(input) {
        const hash = await sha256(input + ':' + ADMIN_SALT);
        return hash === ADMIN_HASH;
    }

    function unlockAdmin() {
        sessionStorage.setItem(AUTH_SESSION_KEY, '1');
        document.getElementById('passwordOverlay').classList.add('hidden');
        document.getElementById('adminContent').style.display = '';
    }

    function initPasswordGate() {
        if (sessionStorage.getItem(AUTH_SESSION_KEY) === '1') {
            document.getElementById('passwordOverlay').classList.add('hidden');
            document.getElementById('adminContent').style.display = '';
            return;
        }
    }

    const passwordInput = document.getElementById('passwordInput');
    const passwordBtn = document.getElementById('passwordBtn');
    const passwordError = document.getElementById('passwordError');

    passwordBtn.addEventListener('click', async () => {
        const pwd = passwordInput.value.trim();
        passwordError.classList.add('hidden');

        if (!pwd) {
            passwordError.textContent = 'Please enter a password.';
            passwordError.classList.remove('hidden');
            return;
        }

        if (await verifyPassword(pwd)) {
            unlockAdmin();
        } else {
            passwordError.textContent = 'Incorrect password. Try again.';
            passwordError.classList.remove('hidden');
            passwordInput.value = '';
            passwordInput.focus();
        }
    });

    passwordInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); passwordBtn.click(); }
    });

    initPasswordGate();

    // ── DOM ─────────────────────────────────────────────────────────────────

    const form = document.getElementById('agencyForm');
    const jurisdictionType = document.getElementById('jurisdictionType');
    const jurisdictionName = document.getElementById('jurisdictionName');
    const jurisdictionNameHint = document.getElementById('jurisdictionNameHint');
    const agencyName = document.getElementById('agencyName');
    const phone = document.getElementById('phone');
    const address = document.getElementById('address');
    const website = document.getElementById('website');
    const onlineReporting = document.getElementById('onlineReporting');
    const collegeFieldsGroup = document.getElementById('collegeFieldsGroup');
    const campusLat = document.getElementById('campusLat');
    const campusLng = document.getElementById('campusLng');
    const radiusMiles = document.getElementById('radiusMiles');
    const lookupCampusBtn = document.getElementById('lookupCampusBtn');
    const lookupCampusStatus = document.getElementById('lookupCampusStatus');

    // Bulk import
    const searchCollegesBtn = document.getElementById('searchCollegesBtn');
    const bulkDefaultRadius = document.getElementById('bulkDefaultRadius');
    const bulkImportStatus = document.getElementById('bulkImportStatus');
    const bulkImportList = document.getElementById('bulkImportList');
    const bulkImportActions = document.getElementById('bulkImportActions');
    const bulkImportSelectAllBtn = document.getElementById('bulkImportSelectAllBtn');
    const bulkImportSelectNoneBtn = document.getElementById('bulkImportSelectNoneBtn');
    const bulkImportAddBtn = document.getElementById('bulkImportAddBtn');
    const saveBtn = document.getElementById('saveBtn');
    const clearBtn = document.getElementById('clearBtn');
    const agencyList = document.getElementById('agencyList');
    const searchInput = document.getElementById('searchAgencies');
    const exportBtn = document.getElementById('exportBtn');
    const importBtn = document.getElementById('importBtn');
    const publishBtn = document.getElementById('publishBtn');
    const publishStatus = document.getElementById('publishStatus');
    const importFile = document.getElementById('importFile');

    // Sign-in
    const githubTokenInput = document.getElementById('githubTokenInput');
    const signinBtn = document.getElementById('signinBtn');
    const signinForm = document.getElementById('signinForm');
    const signedInStatus = document.getElementById('signedInStatus');
    const signoutBtn = document.getElementById('signoutBtn');

    // Corrections
    const refreshCorrectionsBtn = document.getElementById('refreshCorrectionsBtn');
    const githubCorrectionsList = document.getElementById('githubCorrectionsList');
    const localCorrectionsList = document.getElementById('localCorrectionsList');
    const editCorrectionModal = document.getElementById('editCorrectionModal');
    const editCorrectionValue = document.getElementById('editCorrectionValue');
    const saveCorrectionEditBtn = document.getElementById('saveCorrectionEditBtn');
    const cancelCorrectionEditBtn = document.getElementById('cancelCorrectionEditBtn');

    // Stats
    const cityCount = document.getElementById('cityCount');
    const countyCount = document.getElementById('countyCount');
    const isdCount = document.getElementById('isdCount');
    const collegeCount = document.getElementById('collegeCount');
    const stateCount = document.getElementById('stateCount');
    const totalCount = document.getElementById('totalCount');

    // Default Agency
    const defaultName = document.getElementById('defaultName');
    const defaultContact = document.getElementById('defaultContact');
    const editDefaultBtn = document.getElementById('editDefaultBtn');

    // Modals
    const exportModal = document.getElementById('exportModal');
    const exportData = document.getElementById('exportData');
    const copyExportBtn = document.getElementById('copyExportBtn');
    const importModal = document.getElementById('importModal');
    const dropZone = document.getElementById('dropZone');
    const confirmImportBtn = document.getElementById('confirmImportBtn');
    const cancelImportBtn = document.getElementById('cancelImportBtn');

    let editingKey = null;
    let importPayload = null;

    // ── Pre-populate seed data ─────────────────────────────────────────────

    function seedIfEmpty() {
        const db = loadDB();
        const storedVersion = parseInt(localStorage.getItem(SEED_VERSION_KEY) || '0', 10);

        // Skip if already seeded with current version
        if (storedVersion >= CURRENT_SEED_VERSION && Object.keys(db.agencies).length > 0) return;

        // All agencies from the reference database
        const seedData = {
            // ── Counties (Sheriff's Offices) ───────────────────────────────
            'county:Jefferson': {
                jurisdictionName: 'Jefferson', jurisdictionType: 'county',
                agencyName: 'Jefferson County Sheriff\'s Office',
                phone: '(409) 835-8411', address: '1001 Pearl St, Beaumont, TX 77701',
                website: 'https://www.co.jefferson.tx.us/sheriff', onlineReporting: ''
            },
            'county:Harris': {
                jurisdictionName: 'Harris', jurisdictionType: 'county',
                agencyName: 'Harris County Sheriff\'s Office',
                phone: '(713) 755-7628', address: '1200 Baker St, Houston, TX 77002',
                website: 'https://www.hcso.org', onlineReporting: ''
            },
            'county:Dallas': {
                jurisdictionName: 'Dallas', jurisdictionType: 'county',
                agencyName: 'Dallas County Sheriff\'s Department',
                phone: '(214) 749-8641', address: '133 N Industrial Blvd, Dallas, TX 75207',
                website: 'https://www.dallascounty.org/departments/sheriff', onlineReporting: ''
            },
            'county:Tarrant': {
                jurisdictionName: 'Tarrant', jurisdictionType: 'county',
                agencyName: 'Tarrant County Sheriff\'s Office',
                phone: '(817) 884-1213', address: '200 Taylor St, Fort Worth, TX 76196',
                website: 'https://www.tarrantcounty.com/en/sheriff', onlineReporting: ''
            },
            'county:Bexar': {
                jurisdictionName: 'Bexar', jurisdictionType: 'county',
                agencyName: 'Bexar County Sheriff\'s Office',
                phone: '(210) 335-6000', address: '200 N Comal St, San Antonio, TX 78207',
                website: 'https://www.bexar.org/1250/Sheriffs-Office', onlineReporting: ''
            },
            'county:Travis': {
                jurisdictionName: 'Travis', jurisdictionType: 'county',
                agencyName: 'Travis County Sheriff\'s Office',
                phone: '(512) 854-9770', address: '5555 Airport Blvd, Austin, TX 78751',
                website: 'https://www.tcso.org', onlineReporting: ''
            },
            'county:Collin': {
                jurisdictionName: 'Collin', jurisdictionType: 'county',
                agencyName: 'Collin County Sheriff\'s Office',
                phone: '(972) 547-5100', address: '4300 Community Ave, McKinney, TX 75071',
                website: 'https://www.collincountytx.gov/sheriff', onlineReporting: ''
            },
            'county:Denton': {
                jurisdictionName: 'Denton', jurisdictionType: 'county',
                agencyName: 'Denton County Sheriff\'s Office',
                phone: '(940) 349-1600', address: '127 N Woodrow Ln, Denton, TX 76205',
                website: 'https://www.dentoncounty.gov/Departments/Sheriff', onlineReporting: ''
            },
            'county:Fort Bend': {
                jurisdictionName: 'Fort Bend', jurisdictionType: 'county',
                agencyName: 'Fort Bend County Sheriff\'s Office',
                phone: '(281) 341-4665', address: '1410 Ransom Rd, Richmond, TX 77469',
                website: 'https://www.fbcso.org', onlineReporting: ''
            },
            'county:Williamson': {
                jurisdictionName: 'Williamson', jurisdictionType: 'county',
                agencyName: 'Williamson County Sheriff\'s Office',
                phone: '(512) 943-1300', address: '508 S Rock St, Georgetown, TX 78626',
                website: 'https://www.wilco.org/Departments/Sheriff', onlineReporting: ''
            },
            'county:Hidalgo': {
                jurisdictionName: 'Hidalgo', jurisdictionType: 'county',
                agencyName: 'Hidalgo County Sheriff\'s Office',
                phone: '(956) 383-8114', address: '100 N Closner Blvd, Edinburg, TX 78539',
                website: 'https://www.hidalgocounty.us/269/Sheriffs-Office', onlineReporting: ''
            },
            'county:El Paso': {
                jurisdictionName: 'El Paso', jurisdictionType: 'county',
                agencyName: 'El Paso County Sheriff\'s Office',
                phone: '(915) 538-2008', address: '3850 E Paisano Dr, El Paso, TX 79905',
                website: 'https://www.epcounty.com/sheriff', onlineReporting: ''
            },
            'county:Nueces': {
                jurisdictionName: 'Nueces', jurisdictionType: 'county',
                agencyName: 'Nueces County Sheriff\'s Office',
                phone: '(361) 887-2222', address: '901 Leopard St, Corpus Christi, TX 78401',
                website: 'https://www.nuecesco.com/sheriff', onlineReporting: ''
            },
            'county:Lubbock': {
                jurisdictionName: 'Lubbock', jurisdictionType: 'county',
                agencyName: 'Lubbock County Sheriff\'s Office',
                phone: '(806) 775-1400', address: '916 Main St, Lubbock, TX 79401',
                website: 'https://www.lubbockcounty.gov/departments/sheriff', onlineReporting: ''
            },
            'county:Galveston': {
                jurisdictionName: 'Galveston', jurisdictionType: 'county',
                agencyName: 'Galveston County Sheriff\'s Office',
                phone: '(409) 766-2322', address: '5600 39th St, Dickinson, TX 77539',
                website: 'https://www.galvestoncountysheriff.org', onlineReporting: ''
            },
            'county:Montgomery': {
                jurisdictionName: 'Montgomery', jurisdictionType: 'county',
                agencyName: 'Montgomery County Sheriff\'s Office',
                phone: '(936) 760-5800', address: '100 Community Center Dr, Conroe, TX 77301',
                website: 'https://www.mctxsheriff.org', onlineReporting: ''
            },
            'county:Brazoria': {
                jurisdictionName: 'Brazoria', jurisdictionType: 'county',
                agencyName: 'Brazoria County Sheriff\'s Office',
                phone: '(979) 864-2392', address: '111 E Locust St, Angleton, TX 77515',
                website: 'https://www.brazoriacountysheriff.org', onlineReporting: ''
            },
            'county:Bell': {
                jurisdictionName: 'Bell', jurisdictionType: 'county',
                agencyName: 'Bell County Sheriff\'s Office',
                phone: '(254) 933-5412', address: '1201 Huey Bratcher Rd, Belton, TX 76513',
                website: 'https://www.bellcountytx.com/departments/sheriff', onlineReporting: ''
            },
            'county:McLennan': {
                jurisdictionName: 'McLennan', jurisdictionType: 'county',
                agencyName: 'McLennan County Sheriff\'s Office',
                phone: '(254) 757-5049', address: '3121 E Loop 340, Waco, TX 76705',
                website: 'https://www.mclennancountytx.gov/departments/sheriff', onlineReporting: ''
            },
            'county:Cameron': {
                jurisdictionName: 'Cameron', jurisdictionType: 'county',
                agencyName: 'Cameron County Sheriff\'s Office',
                phone: '(956) 554-6700', address: '7300 Old Alice Rd, Olmito, TX 78575',
                website: 'https://www.cameroncountysheriff.org', onlineReporting: ''
            },
            'county:Webb': {
                jurisdictionName: 'Webb', jurisdictionType: 'county',
                agencyName: 'Webb County Sheriff\'s Office',
                phone: '(956) 415-2878', address: '1110 Victoria St, Laredo, TX 78040',
                website: 'https://www.webbcountytx.gov/sheriff', onlineReporting: ''
            },
            'county:Orange': {
                jurisdictionName: 'Orange', jurisdictionType: 'county',
                agencyName: 'Orange County Sheriff\'s Office',
                phone: '(409) 883-2612', address: '205 S Border St, Orange, TX 77630',
                website: 'https://ocsheriffsoffice.com/', onlineReporting: ''
            },
            'county:Smith': {
                jurisdictionName: 'Smith', jurisdictionType: 'county',
                agencyName: 'Smith County Sheriff\'s Office',
                phone: '(903) 566-6600', address: '227 N Spring Ave, Tyler, TX 75702',
                website: 'https://www.smith-county.com/sheriff', onlineReporting: ''
            },
            'county:Brazos': {
                jurisdictionName: 'Brazos', jurisdictionType: 'county',
                agencyName: 'Brazos County Sheriff\'s Office',
                phone: '(979) 361-4900', address: '1755 Briarcrest Dr, Bryan, TX 77802',
                website: 'https://www.brazoscountytx.gov/sheriff', onlineReporting: ''
            },
            'county:Hardin': {
                jurisdictionName: 'Hardin', jurisdictionType: 'county',
                agencyName: 'Hardin County Sheriff\'s Office',
                phone: '(409) 246-5100', address: '300 Monroe St, Kountze, TX 77625',
                website: 'https://www.hardincountytx.gov/sheriff', onlineReporting: ''
            },
            'county:Liberty': {
                jurisdictionName: 'Liberty', jurisdictionType: 'county',
                agencyName: 'Liberty County Sheriff\'s Office',
                phone: '(936) 336-4513', address: '2400 Canyon Dr, Liberty, TX 77575',
                website: 'https://www.libertycountytx.com/sheriff', onlineReporting: ''
            },
            'county:Walker': {
                jurisdictionName: 'Walker', jurisdictionType: 'county',
                agencyName: 'Walker County Sheriff\'s Office',
                phone: '(936) 435-2400', address: '1100 University Ave, Huntsville, TX 77340',
                website: 'https://www.walkercotx.org/sheriff', onlineReporting: ''
            },

            // ── Cities (Police Departments) ────────────────────────────────
            'city:Port Arthur': {
                jurisdictionName: 'Port Arthur', jurisdictionType: 'city',
                agencyName: 'Port Arthur Police Department',
                phone: '(409) 983-8600', address: '645 4th St, Port Arthur, TX 77640',
                website: 'https://www.portarthurtx.gov/394/Police-Department', onlineReporting: ''
            },
            'city:Port Neches': {
                jurisdictionName: 'Port Neches', jurisdictionType: 'city',
                agencyName: 'Port Neches Police Department',
                phone: '(409) 722-1421', address: '1201 Merriman St, Port Neches, TX 77651',
                website: 'https://www.ci.port-neches.tx.us/departments/police_department/index.php', onlineReporting: ''
            },
            'city:Nederland': {
                jurisdictionName: 'Nederland', jurisdictionType: 'city',
                agencyName: 'Nederland Police Department',
                phone: '(409) 722-4965', address: '1400 Boston Ave, Nederland, TX 77627',
                website: 'https://www.ci.nederland.tx.us/page/police-main', onlineReporting: ''
            },
            'city:Groves': {
                jurisdictionName: 'Groves', jurisdictionType: 'city',
                agencyName: 'Groves Police Department',
                phone: '(409) 962-0244', address: '4201 Main Ave, Groves, TX 77619',
                website: 'https://www.cigrovestx.com/page/police.home', onlineReporting: ''
            },
            'city:Orange': {
                jurisdictionName: 'Orange', jurisdictionType: 'city',
                agencyName: 'Orange Police Department',
                phone: '(409) 883-1026', address: '1212 W Park Ave, Orange, TX 77630',
                website: 'https://www.orangetexas.net/police', onlineReporting: ''
            },
            'city:Vidor': {
                jurisdictionName: 'Vidor', jurisdictionType: 'city',
                agencyName: 'Vidor Police Department',
                phone: '(409) 769-4561', address: '695 East Railroad, Vidor, TX 77662',
                website: 'https://www.vidortx.com/police', onlineReporting: ''
            },
            'city:Bridge City': {
                jurisdictionName: 'Bridge City', jurisdictionType: 'city',
                agencyName: 'Bridge City Police Department',
                phone: '(409) 735-4503', address: '260 Raceway Dr, Bridge City, TX 77611',
                website: 'https://www.bridgecitytx.com/police', onlineReporting: ''
            },
            'city:West Orange': {
                jurisdictionName: 'West Orange', jurisdictionType: 'city',
                agencyName: 'West Orange Police Department',
                phone: '(409) 883-4661', address: '2700 Western Ave, West Orange, TX 77630',
                website: 'https://www.westorangetx.com/police', onlineReporting: ''
            },
            'city:Pinehurst': {
                jurisdictionName: 'Pinehurst', jurisdictionType: 'city',
                agencyName: 'Pinehurst Police Department',
                phone: '(409) 886-4111', address: '3730 Magnolia St, Pinehurst, TX 77362',
                website: 'https://www.pinehurstcity.com/police', onlineReporting: ''
            },
            'city:Silsbee': {
                jurisdictionName: 'Silsbee', jurisdictionType: 'city',
                agencyName: 'Silsbee Police Department',
                phone: '(409) 385-3714', address: '1104 N 5th St, Silsbee, TX 77656',
                website: 'https://www.cityofsilsbee.com/city-services/police-department/', onlineReporting: ''
            },
            'city:Lumberton': {
                jurisdictionName: 'Lumberton', jurisdictionType: 'city',
                agencyName: 'Lumberton Police Department',
                phone: '(409) 755-2650', address: '120 E Chance Cutoff A, Lumberton, TX 77657',
                website: 'https://cityoflumberton.com/lumberton-police-department-2/', onlineReporting: ''
            },
            'city:Kountze': {
                jurisdictionName: 'Kountze', jurisdictionType: 'city',
                agencyName: 'Kountze Police Department',
                phone: '(409) 246-5185', address: '306 E 4th St, Kountze, TX 77625',
                website: 'https://www.cityofkountze.com/police', onlineReporting: ''
            },
            'city:Sour Lake': {
                jurisdictionName: 'Sour Lake', jurisdictionType: 'city',
                agencyName: 'Sour Lake Police Department',
                phone: '(409) 287-3664', address: '100 W Crockett St, Sour Lake, TX 77659',
                website: 'https://www.cityofsourlake.com/police', onlineReporting: ''
            },
            'city:Liberty': {
                jurisdictionName: 'Liberty', jurisdictionType: 'city',
                agencyName: 'Liberty Police Department',
                phone: '(936) 336-3684', address: '1829 Sam Houston St, Liberty, TX 77575',
                website: 'https://www.cityofliberty.org/police', onlineReporting: ''
            },
            'city:Dayton': {
                jurisdictionName: 'Dayton', jurisdictionType: 'city',
                agencyName: 'Dayton Police Department',
                phone: '(936) 258-2642', address: '801 S Cleveland St, Dayton, TX 77535',
                website: 'https://www.cityofdayton.net/police', onlineReporting: ''
            },
            'city:Cleveland': {
                jurisdictionName: 'Cleveland', jurisdictionType: 'city',
                agencyName: 'Cleveland Police Department',
                phone: '(281) 592-2667', address: '907 E Houston St, Cleveland, TX 77327',
                website: 'https://www.clevelandtexas.com/police', onlineReporting: ''
            },
            'city:Huntsville': {
                jurisdictionName: 'Huntsville', jurisdictionType: 'city',
                agencyName: 'Huntsville Police Department',
                phone: '(936) 291-5480', address: '815 11th St, Huntsville, TX 77340',
                website: 'https://www.huntsvilletx.gov/police', onlineReporting: ''
            },
            'city:Conroe': {
                jurisdictionName: 'Conroe', jurisdictionType: 'city',
                agencyName: 'Conroe Police Department',
                phone: '(936) 522-3200', address: '601 N Main St, Conroe, TX 77301',
                website: 'https://www.cityofconroe.org/police', onlineReporting: ''
            },
            'city:The Woodlands': {
                jurisdictionName: 'The Woodlands', jurisdictionType: 'city',
                agencyName: 'The Woodlands Township Police Department',
                phone: '(281) 210-3800', address: '2801 Technology Forest Blvd, The Woodlands, TX 77381',
                website: 'https://www.thewoodlandstownship-tx.gov/police', onlineReporting: ''
            },
            'city:Magnolia': {
                jurisdictionName: 'Magnolia', jurisdictionType: 'city',
                agencyName: 'Magnolia Police Department',
                phone: '(281) 356-7122', address: '18111 Buddy Riley Blvd, Magnolia, TX 77354',
                website: 'https://www.cityofmagnolia.com/police', onlineReporting: ''
            },
            'city:Tomball': {
                jurisdictionName: 'Tomball', jurisdictionType: 'city',
                agencyName: 'Tomball Police Department',
                phone: '(281) 290-1011', address: '401 Market St, Tomball, TX 77375',
                website: 'https://www.tomballtx.gov/police', onlineReporting: ''
            },
            'city:Spring': {
                jurisdictionName: 'Spring', jurisdictionType: 'city',
                agencyName: 'Spring Police Department',
                phone: '(281) 353-9505', address: '1327 Spring Cypress Rd, Spring, TX 77373',
                website: 'https://www.springtx.gov/police', onlineReporting: ''
            },
            'city:Humble': {
                jurisdictionName: 'Humble', jurisdictionType: 'city',
                agencyName: 'Humble Police Department',
                phone: '(281) 446-2327', address: '114 W Higgins St, Humble, TX 77338',
                website: 'https://www.cityofhumble.org/police', onlineReporting: ''
            },
            'city:Kingwood': {
                jurisdictionName: 'Kingwood', jurisdictionType: 'city',
                agencyName: 'Kingwood Police Department',
                phone: '(281) 358-3200', address: '22026 Northpark Dr, Kingwood, TX 77339',
                website: 'https://www.kingwoodtx.gov/police', onlineReporting: ''
            },
            'city:Houston': {
                jurisdictionName: 'Houston', jurisdictionType: 'city',
                agencyName: 'Houston Police Department',
                phone: '(713) 884-3131', address: '1200 Travis St, Houston, TX 77002',
                website: 'https://www.houstontx.gov/police', onlineReporting: 'https://www.houstontx.gov/police/online_report.htm'
            },
            'city:San Antonio': {
                jurisdictionName: 'San Antonio', jurisdictionType: 'city',
                agencyName: 'San Antonio Police Department',
                phone: '(210) 207-7273', address: '315 S Santa Rosa Ave, San Antonio, TX 78207',
                website: 'https://www.sanantonio.gov/SAPD', onlineReporting: ''
            },
            'city:Dallas': {
                jurisdictionName: 'Dallas', jurisdictionType: 'city',
                agencyName: 'Dallas Police Department',
                phone: '(214) 671-4282', address: '1400 S Lamar St, Dallas, TX 75215',
                website: 'https://www.dallaspolice.net', onlineReporting: ''
            },
            'city:Austin': {
                jurisdictionName: 'Austin', jurisdictionType: 'city',
                agencyName: 'Austin Police Department',
                phone: '(512) 974-5000', address: '715 E 8th St, Austin, TX 78701',
                website: 'https://www.austintexas.gov/department/police', onlineReporting: 'https://www.austintexas.gov/page/file-police-report-online'
            },
            'city:Fort Worth': {
                jurisdictionName: 'Fort Worth', jurisdictionType: 'city',
                agencyName: 'Fort Worth Police Department',
                phone: '(817) 392-4222', address: '350 W Belknap St, Fort Worth, TX 76102',
                website: 'https://www.fortworthtexas.gov/departments/police', onlineReporting: ''
            },
            'city:El Paso': {
                jurisdictionName: 'El Paso', jurisdictionType: 'city',
                agencyName: 'El Paso Police Department',
                phone: '(915) 212-4400', address: '911 N Raynor St, El Paso, TX 79901',
                website: 'https://www.elpasotexas.gov/police', onlineReporting: ''
            },
            'city:Arlington': {
                jurisdictionName: 'Arlington', jurisdictionType: 'city',
                agencyName: 'Arlington Police Department',
                phone: '(817) 459-5700', address: '620 W Division St, Arlington, TX 76011',
                website: 'https://www.arlingtontx.gov/city_hall/departments/police', onlineReporting: ''
            },
            'city:Corpus Christi': {
                jurisdictionName: 'Corpus Christi', jurisdictionType: 'city',
                agencyName: 'Corpus Christi Police Department',
                phone: '(361) 886-2600', address: '321 John Sartain St, Corpus Christi, TX 78401',
                website: 'https://www.cctexas.com/departments/police', onlineReporting: ''
            },
            'city:Plano': {
                jurisdictionName: 'Plano', jurisdictionType: 'city',
                agencyName: 'Plano Police Department',
                phone: '(972) 424-5678', address: '909 14th St, Plano, TX 75074',
                website: 'https://www.plano.gov/1183/Police', onlineReporting: ''
            },
            'city:Lubbock': {
                jurisdictionName: 'Lubbock', jurisdictionType: 'city',
                agencyName: 'Lubbock Police Department',
                phone: '(806) 775-2865', address: '916 Texas Ave, Lubbock, TX 79401',
                website: 'https://www.mylubbock.us/departments/police', onlineReporting: ''
            },
            'city:Beaumont': {
                jurisdictionName: 'Beaumont', jurisdictionType: 'city',
                agencyName: 'Beaumont Police Department',
                phone: '(409) 832-1234', address: '255 College St, Beaumont, TX 77701',
                website: 'https://www.beaumonttexas.gov/departments/police', onlineReporting: ''
            },
            'city:Galveston': {
                jurisdictionName: 'Galveston', jurisdictionType: 'city',
                agencyName: 'Galveston Police Department',
                phone: '(409) 765-3702', address: '823 Rosenberg Ave, Galveston, TX 77550',
                website: 'https://www.galvestontx.gov/police', onlineReporting: ''
            },
            'city:Tyler': {
                jurisdictionName: 'Tyler', jurisdictionType: 'city',
                agencyName: 'Tyler Police Department',
                phone: '(903) 531-1000', address: '405 Martin Walker Dr, Tyler, TX 75702',
                website: 'https://www.cityoftyler.org/departments/police', onlineReporting: ''
            },
            'city:Waco': {
                jurisdictionName: 'Waco', jurisdictionType: 'city',
                agencyName: 'Waco Police Department',
                phone: '(254) 750-7500', address: '3115 Pine Ave, Waco, TX 76708',
                website: 'https://www.waco-texas.com/departments/police', onlineReporting: ''
            },
            'city:Brownsville': {
                jurisdictionName: 'Brownsville', jurisdictionType: 'city',
                agencyName: 'Brownsville Police Department',
                phone: '(956) 548-7000', address: '600 E Jackson St, Brownsville, TX 78520',
                website: 'https://www.cob.us/departments/police', onlineReporting: ''
            },
            'city:Laredo': {
                jurisdictionName: 'Laredo', jurisdictionType: 'city',
                agencyName: 'Laredo Police Department',
                phone: '(956) 795-2800', address: '4712 Maher Ave, Laredo, TX 78041',
                website: 'https://www.cityoflaredo.com/police', onlineReporting: ''
            },
            'city:College Station': {
                jurisdictionName: 'College Station', jurisdictionType: 'city',
                agencyName: 'College Station Police Department',
                phone: '(979) 764-3600', address: '1100 Krenek Tap Rd, College Station, TX 77840',
                website: 'https://www.cstx.gov/departments/police', onlineReporting: ''
            },
            'city:Bryan': {
                jurisdictionName: 'Bryan', jurisdictionType: 'city',
                agencyName: 'Bryan Police Department',
                phone: '(979) 209-5300', address: '303 E 29th St, Bryan, TX 77803',
                website: 'https://www.bryantx.gov/departments/police', onlineReporting: ''
            }
        };

        // Merge, never replace: seed entries only fill in keys that don't
        // already exist. This used to be `db.agencies = seedData`, which
        // silently destroyed any agency added beyond the seed list (bulk-
        // imported colleges, ISD entries, manual additions) every time this
        // function ran on a browser/device where the stored seed version
        // didn't match -- which happens after any deploy, or the first time
        // admin.html loads on a new device. Existing entries always win.
        db.agencies = { ...seedData, ...db.agencies };

        // Same reasoning: don't clobber a default agency the admin already
        // configured or corrected.
        if (!db.defaultAgency) {
            db.defaultAgency = {
                agencyName: 'Texas Department of Public Safety',
                phone: '(512) 463-2000',
                address: '5805 N Lamar Blvd, Austin, TX 78752',
                website: 'https://www.dps.texas.gov/'
            };
        }

        saveDB(db);
        localStorage.setItem(SEED_VERSION_KEY, CURRENT_SEED_VERSION.toString());
    }

    // ── LocalStorage Helpers ────────────────────────────────────────────────

    function loadDB() {
        try {
            const raw = localStorage.getItem(DB_KEY);
            return raw ? JSON.parse(raw) : { agencies: {} };
        } catch {
            return { agencies: {} };
        }
    }

    function saveDB(db) {
        localStorage.setItem(DB_KEY, JSON.stringify(db));
    }

    function loadDefault() {
        try {
            const raw = localStorage.getItem(DEFAULT_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    }

    function saveDefault(data) {
        localStorage.setItem(DEFAULT_KEY, JSON.stringify(data));
    }

    // ── List Rendering ──────────────────────────────────────────────────────

    function renderList(filter = '') {
        const db = loadDB();
        const entries = Object.entries(db.agencies);

        const filtered = filter
            ? entries.filter(([, v]) =>
                v.agencyName.toLowerCase().includes(filter) ||
                v.jurisdictionName.toLowerCase().includes(filter) ||
                v.jurisdictionType.toLowerCase().includes(filter))
            : entries;

        // Sort: cities first, then counties, then state, alphabetical within each
        filtered.sort((a, b) => {
            const typeOrder = { city: 0, county: 1, state: 2 };
            const typeA = typeOrder[a[1].jurisdictionType] ?? 3;
            const typeB = typeOrder[b[1].jurisdictionType] ?? 3;
            if (typeA !== typeB) return typeA - typeB;
            return a[1].jurisdictionName.localeCompare(b[1].jurisdictionName);
        });

        if (filtered.length === 0) {
            agencyList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-inbox"></i>
                    <p>${filter ? 'No agencies match your search.' : 'No agencies on file yet. Add one above!'}</p>
                </div>`;
        } else {
            agencyList.innerHTML = filtered.map(([key, agency]) => {
                const ICONS = { city: 'fa-city', county: 'fa-flag', isd: 'fa-graduation-cap', college: 'fa-graduation-cap' };
                const LABELS = { city: 'City Police', county: 'County Sheriff', isd: 'ISD Police', college: 'Campus Police' };
                const icon = ICONS[agency.jurisdictionType] || 'fa-star';
                const typeLabel = LABELS[agency.jurisdictionType] || 'State Police';
                const campusInfo = agency.jurisdictionType === 'college' && agency.campusLat && agency.campusLng
                    ? ` &middot; ${agency.radiusMiles || '?'} mi radius of (${agency.campusLat}, ${agency.campusLng})`
                    : '';

                return `
                    <div class="agency-item">
                        <div class="agency-info">
                            <h3>${agency.agencyName}</h3>
                            <div class="jurisdiction-type">
                                <i class="fas ${icon}"></i>
                                ${typeLabel} &middot; ${agency.jurisdictionName}${campusInfo}
                            </div>
                            <div class="agency-contact">
                                ${agency.phone || 'No phone'} &middot;
                                ${agency.address || 'No address'}
                            </div>
                        </div>
                        <div class="agency-actions">
                            <button class="btn btn-primary" onclick="window.__editAgency('${key}')">
                                <i class="fas fa-edit"></i> Edit
                            </button>
                            <button class="btn btn-danger" onclick="window.__deleteAgency('${key}')">
                                <i class="fas fa-trash"></i> Delete
                            </button>
                        </div>
                    </div>`;
            }).join('');
        }

        // Update stats
        const cities = entries.filter(([, v]) => v.jurisdictionType === 'city').length;
        const counties = entries.filter(([, v]) => v.jurisdictionType === 'county').length;
        const isds = entries.filter(([, v]) => v.jurisdictionType === 'isd').length;
        const colleges = entries.filter(([, v]) => v.jurisdictionType === 'college').length;
        const states = entries.filter(([, v]) => v.jurisdictionType === 'state').length;
        cityCount.textContent = cities;
        countyCount.textContent = counties;
        isdCount.textContent = isds;
        collegeCount.textContent = colleges;
        stateCount.textContent = states;
        totalCount.textContent = entries.length;
    }

    function renderDefault() {
        const def = loadDefault();
        if (def && def.agencyName) {
            defaultName.textContent = def.agencyName;
            defaultContact.textContent = def.phone ? `${def.phone} · ${def.address || ''}` : 'No contact info';
        } else {
            defaultName.textContent = 'No default agency configured';
            defaultContact.textContent = 'Add Texas DPS contact information';
        }
    }

    // ── Form Helpers ────────────────────────────────────────────────────────

    function updateCollegeFieldsVisibility() {
        const isCollege = jurisdictionType.value === 'college';
        collegeFieldsGroup.classList.toggle('hidden', !isCollege);
        campusLat.required = isCollege;
        campusLng.required = isCollege;
        radiusMiles.required = isCollege;

        const HINTS = {
            city: 'For city/county: use proper name. For state: leave as "Texas"',
            county: 'For city/county: use proper name. For state: leave as "Texas"',
            state: 'For city/county: use proper name. For state: leave as "Texas"',
            isd: 'Use the district\'s proper name, e.g. "Austin ISD" or just "Austin" \u2014 be consistent, since this must match the Census boundary name.',
            college: 'Use the college/university\'s common name, e.g. "University of Texas at Austin".'
        };
        jurisdictionNameHint.textContent = HINTS[jurisdictionType.value] || HINTS.city;
    }

    jurisdictionType.addEventListener('change', updateCollegeFieldsVisibility);

    function clearForm() {
        form.reset();
        editingKey = null;
        saveBtn.innerHTML = '<i class="fas fa-save"></i> Save Agency';
        updateCollegeFieldsVisibility();
    }

    function populateForm(key) {
        const db = loadDB();
        const agency = db.agencies[key];
        if (!agency) return;

        editingKey = key;
        jurisdictionType.value = agency.jurisdictionType;
        jurisdictionName.value = agency.jurisdictionName;
        agencyName.value = agency.agencyName;
        phone.value = agency.phone;
        address.value = agency.address;
        website.value = agency.website;
        onlineReporting.value = agency.onlineReporting || '';
        campusLat.value = agency.campusLat || '';
        campusLng.value = agency.campusLng || '';
        radiusMiles.value = agency.radiusMiles || '';
        updateCollegeFieldsVisibility();

        saveBtn.innerHTML = '<i class="fas fa-save"></i> Update Agency';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // ── Campus Coordinate Lookup (single) ──────────────────────────────────
    // Free, keyless geocoding via OpenStreetMap's Nominatim — good fit for
    // an occasional, admin-triggered manual lookup like this one.

    lookupCampusBtn.addEventListener('click', async () => {
        const name = jurisdictionName.value.trim();
        if (!name) {
            lookupCampusStatus.textContent = 'Enter the Jurisdiction Name above first.';
            lookupCampusStatus.className = 'correction-status error';
            return;
        }

        lookupCampusBtn.disabled = true;
        lookupCampusStatus.textContent = 'Looking up...';
        lookupCampusStatus.className = 'text-muted';

        try {
            const query = `${name}, Texas, USA`;
            const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
            const resp = await fetch(url, { headers: { Accept: 'application/json' } });
            if (!resp.ok) throw new Error(`Lookup failed (${resp.status})`);
            const results = await resp.json();

            if (!results.length) {
                lookupCampusStatus.textContent = 'No results found. Try adjusting the name, or enter coordinates manually.';
                lookupCampusStatus.className = 'correction-status error';
                return;
            }

            campusLat.value = parseFloat(results[0].lat).toFixed(6);
            campusLng.value = parseFloat(results[0].lon).toFixed(6);
            lookupCampusStatus.textContent = `Found: ${results[0].display_name} — confirm this looks right.`;
            lookupCampusStatus.className = 'correction-status success';
        } catch (error) {
            lookupCampusStatus.textContent = `Lookup failed: ${error.message}`;
            lookupCampusStatus.className = 'correction-status error';
        } finally {
            lookupCampusBtn.disabled = false;
        }
    });

    // ── Bulk Import Colleges ───────────────────────────────────────────────
    // Live query against OpenStreetMap's Overpass API (free, keyless,
    // public instance) for every university/college tagged in Texas.
    // Crowd-sourced data, so it's a starting list to review, not an
    // authoritative registry -- nothing is added until the admin picks
    // which rows to import.

    let bulkImportResults = [];

    // overpass-api.de's main instance recently tightened its CORS policy and
    // now rejects browser POST requests outright (406, no CORS headers on
    // the response — which surfaces to fetch() as an opaque "Failed to
    // fetch", not a readable status code). GET avoids the CORS preflight
    // entirely since it's a "simple" cross-origin request, so we use that
    // instead, with fallback across community-run mirrors in case any one
    // instance is down, overloaded, or rate-limiting us.
    const OVERPASS_ENDPOINTS = [
        'https://overpass-api.de/api/interpreter',
        'https://overpass.kumi.systems/api/interpreter',
        'https://overpass.private.coffee/api/interpreter'
    ];

    async function searchColleges() {
        searchCollegesBtn.disabled = true;
        bulkImportStatus.textContent = 'Searching OpenStreetMap (this can take up to a minute)...';
        bulkImportStatus.className = 'text-muted';
        bulkImportList.innerHTML = '';
        bulkImportActions.classList.add('hidden');

        const overpassQuery = `
            [out:json][timeout:60];
            area["ISO3166-2"="US-TX"]["admin_level"="4"]->.tx;
            (
              node["amenity"="university"](area.tx);
              node["amenity"="college"](area.tx);
              way["amenity"="university"](area.tx);
              way["amenity"="college"](area.tx);
            );
            out center;
        `;

        let data = null;
        let lastError = null;

        for (const endpoint of OVERPASS_ENDPOINTS) {
            try {
                const url = `${endpoint}?data=${encodeURIComponent(overpassQuery)}`;
                const resp = await fetch(url);
                if (!resp.ok) {
                    lastError = new Error(`${endpoint} returned ${resp.status}`);
                    continue;
                }
                data = await resp.json();
                break; // success — stop trying further mirrors
            } catch (error) {
                lastError = error;
            }
        }

        if (!data) {
            bulkImportStatus.textContent = `Search failed: ${lastError ? lastError.message : 'no response'}. All OpenStreetMap servers were unavailable — try again in a bit.`;
            bulkImportStatus.className = 'correction-status error';
            searchCollegesBtn.disabled = false;
            return;
        }

        try {
            const seen = new Set();
            const db = loadDB();
            bulkImportResults = [];

            for (const el of data.elements || []) {
                const name = el.tags && el.tags.name;
                if (!name || seen.has(name)) continue;
                const lat = el.lat ?? (el.center && el.center.lat);
                const lng = el.lon ?? (el.center && el.center.lon);
                if (!isFinite(lat) || !isFinite(lng)) continue;
                seen.add(name);
                bulkImportResults.push({
                    name,
                    lat: Number(lat).toFixed(6),
                    lng: Number(lng).toFixed(6),
                    alreadyAdded: !!db.agencies[`college:${name}`]
                });
            }

            bulkImportResults.sort((a, b) => a.name.localeCompare(b.name));
            renderBulkImportList();
            bulkImportStatus.textContent = `Found ${bulkImportResults.length} candidates. Review and select which to import.`;
            bulkImportStatus.className = 'correction-status success';
            bulkImportActions.classList.toggle('hidden', bulkImportResults.length === 0);
        } catch (error) {
            bulkImportStatus.textContent = `Couldn't process results: ${error.message}`;
            bulkImportStatus.className = 'correction-status error';
        } finally {
            searchCollegesBtn.disabled = false;
        }
    }

    function renderBulkImportList() {
        const defaultRadius = bulkDefaultRadius.value || '0.5';
        bulkImportList.innerHTML = bulkImportResults.map((item, i) => `
            <div class="bulk-import-item ${item.alreadyAdded ? 'already-added' : ''}" data-index="${i}">
                <input type="checkbox" ${item.alreadyAdded ? 'disabled' : 'checked'}>
                <div class="bulk-item-info">
                    <div class="bulk-item-name">${escapeHtml(item.name)}${item.alreadyAdded ? ' (already added)' : ''}</div>
                    <div class="bulk-item-coords">${item.lat}, ${item.lng}</div>
                </div>
                <input type="number" class="bulk-item-radius" step="any" min="0.1"
                       value="${defaultRadius}" ${item.alreadyAdded ? 'disabled' : ''} title="Radius (miles)">
            </div>
        `).join('');
    }

    searchCollegesBtn.addEventListener('click', searchColleges);

    bulkImportSelectAllBtn.addEventListener('click', () => {
        bulkImportList.querySelectorAll('input[type="checkbox"]:not(:disabled)').forEach((cb) => { cb.checked = true; });
    });

    bulkImportSelectNoneBtn.addEventListener('click', () => {
        bulkImportList.querySelectorAll('input[type="checkbox"]').forEach((cb) => { cb.checked = false; });
    });

    bulkImportAddBtn.addEventListener('click', () => {
        const rows = bulkImportList.querySelectorAll('.bulk-import-item');
        const db = loadDB();
        let added = 0;

        rows.forEach((row) => {
            const idx = parseInt(row.dataset.index, 10);
            const item = bulkImportResults[idx];
            const checkbox = row.querySelector('input[type="checkbox"]');
            if (!checkbox.checked || item.alreadyAdded) return;

            const radiusInput = row.querySelector('.bulk-item-radius');
            const key = `college:${item.name}`;
            db.agencies[key] = {
                jurisdictionType: 'college',
                jurisdictionName: item.name,
                agencyName: `${item.name} Police Department`,
                phone: '',
                address: '',
                website: '',
                onlineReporting: '',
                campusLat: item.lat,
                campusLng: item.lng,
                radiusMiles: radiusInput.value || '0.5'
            };
            item.alreadyAdded = true;
            added++;
        });

        if (added > 0) {
            saveDB(db);
            renderList(searchInput.value.toLowerCase().trim());
            renderBulkImportList();
            bulkImportStatus.textContent = `Added ${added} college${added === 1 ? '' : 's'}. Edit each one in the list above to fill in phone/website contact info.`;
            bulkImportStatus.className = 'correction-status success';
        } else {
            bulkImportStatus.textContent = 'Nothing selected to add.';
            bulkImportStatus.className = 'correction-status error';
        }
    });

    // ── Event Handlers ──────────────────────────────────────────────────────

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        if (jurisdictionType.value === 'college') {
            if (!campusLat.value.trim() || !campusLng.value.trim() || !radiusMiles.value.trim()) {
                alert('Campus latitude, longitude, and radius are required for College/University Police so the app can auto-detect nearby searches.');
                return;
            }
        }

        const key = `${jurisdictionType.value}:${jurisdictionName.value.trim()}`;
        const data = {
            jurisdictionType: jurisdictionType.value,
            jurisdictionName: jurisdictionName.value.trim(),
            agencyName: agencyName.value.trim(),
            phone: phone.value.trim(),
            address: address.value.trim(),
            website: website.value.trim(),
            onlineReporting: onlineReporting.value.trim()
        };

        if (jurisdictionType.value === 'college') {
            data.campusLat = campusLat.value.trim();
            data.campusLng = campusLng.value.trim();
            data.radiusMiles = radiusMiles.value.trim();
        }

        const db = loadDB();
        db.agencies[key] = data;
        saveDB(db);

        clearForm();
        renderList(searchInput.value.toLowerCase().trim());
    });

    clearBtn.addEventListener('click', clearForm);

    searchInput.addEventListener('input', () => {
        renderList(searchInput.value.toLowerCase().trim());
    });

    // Export
    exportBtn.addEventListener('click', () => {
        const db = loadDB();
        const def = loadDefault();
        const payload = {
            agencies: db.agencies,
            defaultAgency: def,
            exportedAt: new Date().toISOString()
        };
        exportData.value = JSON.stringify(payload, null, 2);
        exportModal.classList.remove('hidden');
    });

    copyExportBtn.addEventListener('click', () => {
        exportData.select();
        document.execCommand('copy');
        copyExportBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
        setTimeout(() => {
            copyExportBtn.innerHTML = '<i class="fas fa-copy"></i> Copy to Clipboard';
        }, 2000);
    });

    function encodeBase64(value) {
        const bytes = new TextEncoder().encode(value);
        let binary = '';
        bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
        return btoa(binary);
    }

    async function publishToGitHub() {
        const token = getAdminToken();
        if (!token) {
            publishStatus.textContent = 'Sign in with a GitHub token above first.';
            publishStatus.className = 'publish-status error';
            githubTokenInput.focus();
            return;
        }

        publishBtn.disabled = true;
        publishStatus.textContent = 'Publishing shared agency data...';
        publishStatus.className = 'publish-status';

        const apiUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${GITHUB_DATA_PATH}`;
        const headers = githubHeaders();

        try {
            const db = loadDB();
            const payload = JSON.stringify({
                agencies: db.agencies,
                defaultAgency: loadDefault() || db.defaultAgency || null
            }, null, 2) + '\n';

            const currentResponse = await fetch(`${apiUrl}?ref=${encodeURIComponent(GITHUB_BRANCH)}`, { headers });
            let sha;
            if (currentResponse.ok) {
                sha = (await currentResponse.json()).sha;
            } else if (currentResponse.status !== 404) {
                throw new Error(`GitHub read failed (${currentResponse.status})`);
            }

            const response = await fetch(apiUrl, {
                method: 'PUT',
                headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: 'Update agency contact data',
                    content: encodeBase64(payload),
                    branch: GITHUB_BRANCH,
                    ...(sha ? { sha } : {})
                })
            });

            if (!response.ok) {
                const details = await response.json().catch(() => ({}));
                if (response.status === 403 || response.status === 404) {
                    throw new Error(
                        `GitHub rejected the token (${details.message || response.status}). ` +
                        `Check that it has "Contents: Read and write" access to ${GITHUB_OWNER}/${GITHUB_REPO} ` +
                        `(fine-grained tokens) or the "repo"/"public_repo" scope (classic tokens).`
                    );
                }
                throw new Error(details.message || `GitHub publish failed (${response.status})`);
            }

            publishStatus.textContent = 'Published. The public app will use the update after GitHub Pages deploys it.';
            publishStatus.classList.add('success');
        } catch (error) {
            publishStatus.textContent = error.message;
            publishStatus.classList.add('error');
        } finally {
            publishBtn.disabled = false;
        }
    }

    publishBtn.addEventListener('click', publishToGitHub);

    // ── GitHub Sign-in ──────────────────────────────────────────────────────

    function updateSigninUI() {
        const signedIn = !!getAdminToken();
        signinForm.classList.toggle('hidden', signedIn);
        signedInStatus.classList.toggle('hidden', !signedIn);
    }

    signinBtn.addEventListener('click', () => {
        const token = githubTokenInput.value.trim();
        if (!token) return;
        setAdminToken(token);
        githubTokenInput.value = '';
        updateSigninUI();
        loadGithubCorrections();
    });

    githubTokenInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); signinBtn.click(); }
    });

    signoutBtn.addEventListener('click', () => {
        clearAdminToken();
        updateSigninUI();
        githubCorrectionsList.innerHTML = '<p class="text-muted">Sign in with a GitHub token above to load these.</p>';
    });

    updateSigninUI();

    // Import
    importBtn.addEventListener('click', () => {
        importModal.classList.remove('hidden');
        importPayload = null;
        confirmImportBtn.disabled = true;
        dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('click', () => importFile.click());

    importFile.addEventListener('change', (e) => {
        handleImportFile(e.target.files[0]);
    });

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) {
            handleImportFile(e.dataTransfer.files[0]);
        }
    });

    function handleImportFile(file) {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (data.agencies) {
                    importPayload = data;
                    confirmImportBtn.disabled = false;
                    dropZone.innerHTML = `
                        <i class="fas fa-check-circle"></i>
                        <p><strong>${Object.keys(data.agencies).length} agencies</strong> ready to import</p>`;
                } else {
                    alert('Invalid file format. Expected JSON with "agencies" key.');
                }
            } catch {
                alert('Failed to parse JSON file.');
            }
        };
        reader.readAsText(file);
    }

    confirmImportBtn.addEventListener('click', () => {
        if (!importPayload) return;
        saveDB({ agencies: importPayload.agencies });
        if (importPayload.defaultAgency) {
            saveDefault(importPayload.defaultAgency);
        }
        importModal.classList.add('hidden');
        renderList();
        renderDefault();
    });

    cancelImportBtn.addEventListener('click', () => {
        importModal.classList.add('hidden');
        importPayload = null;
    });

    // Default Agency
    editDefaultBtn.addEventListener('click', () => {
        const current = loadDefault() || {};
        const name = prompt('Agency name:', current.agencyName || 'Texas Department of Public Safety');
        if (!name) return;
        const phoneVal = prompt('Phone number:', current.phone || '(512) 424-2000');
        if (phoneVal === null) return;
        const addr = prompt('Address:', current.address || '5805 N Lamar Blvd, Austin, TX 78752');
        if (addr === null) return;
        const web = prompt('Website:', current.website || 'https://www.dps.texas.gov/');
        if (web === null) return;

        saveDefault({
            agencyName: name,
            phone: phoneVal,
            address: addr,
            website: web
        });
        renderDefault();
    });

    // Global handlers for list buttons
    window.__editAgency = (key) => populateForm(key);
    window.__deleteAgency = (key) => {
        if (!confirm('Are you sure you want to delete this agency?')) return;
        const db = loadDB();
        delete db.agencies[key];
        saveDB(db);
        renderList(searchInput.value.toLowerCase().trim());
    };

    // Modal close
    document.querySelectorAll('.modal-close').forEach((btn) => {
        btn.addEventListener('click', () => {
            btn.closest('.modal').classList.add('hidden');
        });
    });

    // Close modal on background click
    document.querySelectorAll('.modal').forEach((modal) => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.classList.add('hidden');
        });
    });

    // ── Correction Submissions ─────────────────────────────────────────────
    //
    // Public visitors suggest corrections from index.html. A submission
    // becomes a real GitHub Issue (label "correction") when it's made from
    // a browser with an active admin session (see GITHUB_TOKEN_SESSION_KEY);
    // otherwise it's saved to this browser's localStorage only, and shows
    // up below under "Local Submissions" if this admin page happens to be
    // opened on that same device. This mirrors the CaseLaw-LE pattern:
    // no backend, no external service, GitHub Issues + localStorage only.
    //
    // Issue body format (also produced by app.js on the public site):
    //   **Agency:** <agency name>
    //   **Jurisdiction Key:** <type>:<name>
    //   **Field:** <phone|address|website|onlineReporting|agencyName>
    //   **Current Value:** <...>
    //   **Suggested Value:** <...>
    //   **Note:** <optional free text>
    //   **Submitted By:** <optional name/contact>

    const FIELD_LABELS = {
        phone: 'Phone',
        address: 'Address',
        website: 'Website',
        onlineReporting: 'Online Reporting URL',
        agencyName: 'Agency Name'
    };

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str == null ? '' : String(str);
        return div.innerHTML;
    }

    function parseCorrectionBody(body) {
        const fields = {};
        const re = /\*\*(.+?):\*\*[ \t]*(.*)/g;
        let m;
        while ((m = re.exec(body || '')) !== null) {
            fields[m[1].trim()] = m[2].trim();
        }
        return {
            agencyName: fields['Agency'] || '',
            jurisdictionKey: fields['Jurisdiction Key'] || '',
            field: fields['Field'] || '',
            currentValue: fields['Current Value'] || '',
            suggestedValue: fields['Suggested Value'] || '',
            note: fields['Note'] || '',
            submittedBy: fields['Submitted By'] || ''
        };
    }

    function loadLocalCorrections() {
        try {
            const raw = localStorage.getItem(LOCAL_CORRECTIONS_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch {
            return [];
        }
    }

    function saveLocalCorrections(list) {
        localStorage.setItem(LOCAL_CORRECTIONS_KEY, JSON.stringify(list));
    }

    // In-session overrides for edited-but-not-yet-approved GitHub submissions
    // (GitHub issues themselves aren't rewritten until Approve/Discard acts
    // on them, so an in-progress edit just lives here until then).
    const githubEditOverrides = {};

    function correctionCardHtml(item, source) {
        const override = source === 'github' ? githubEditOverrides[item.number] : null;
        const suggestedValue = override !== undefined && override !== null ? override : item.suggestedValue;
        const fieldLabel = FIELD_LABELS[item.field] || item.field || 'Field';
        return `
            <div class="correction-item" data-source="${source}" data-id="${source === 'github' ? item.number : item.id}">
                <div class="correction-meta">
                    <span class="correction-agency">${escapeHtml(item.agencyName || 'Unknown agency')}</span>
                    <span class="correction-field-badge">${escapeHtml(fieldLabel)}</span>
                </div>
                <div class="correction-values">
                    <div>Current: <span class="old-value">${escapeHtml(item.currentValue) || '(none)'}</span></div>
                    <div>Suggested: <span class="new-value">${escapeHtml(suggestedValue) || '(none)'}</span></div>
                </div>
                ${item.note ? `<p class="correction-note">"${escapeHtml(item.note)}"</p>` : ''}
                <p class="correction-submitted-by">
                    ${item.submittedBy ? `Submitted by: ${escapeHtml(item.submittedBy)}` : 'Submitted anonymously'}
                    ${item.timestamp ? ` &middot; ${new Date(item.timestamp).toLocaleString()}` : ''}
                </p>
                <div class="correction-actions">
                    <button class="btn btn-success btn-approve-correction">
                        <i class="fas fa-check"></i> Approve
                    </button>
                    <button class="btn btn-secondary btn-edit-correction">
                        <i class="fas fa-pen"></i> Edit
                    </button>
                    <button class="btn btn-danger btn-discard-correction">
                        <i class="fas fa-trash"></i> Discard
                    </button>
                    ${source === 'local' ? `
                    <button class="btn btn-primary btn-send-correction">
                        <i class="fas fa-cloud-arrow-up"></i> Send to GitHub
                    </button>` : ''}
                </div>
            </div>`;
    }

    function renderLocalCorrections() {
        const items = loadLocalCorrections();
        localCorrectionsList.innerHTML = items.length
            ? items.map((item) => correctionCardHtml(item, 'local')).join('')
            : '<p class="text-muted">None yet.</p>';
    }

    let githubCorrectionIssues = [];

    // An issue is a correction submission if it carries the "correction"
    // label OR matches the submission title/body format. The label is NOT
    // reliable on its own: GitHub silently drops labels from issues created
    // on a public repo by a token without label/triage permission, so an
    // unlabeled submission would otherwise never surface in this list.
    function isCorrectionIssue(issue) {
        if (issue.labels && issue.labels.some((l) => (l.name || l) === CORRECTIONS_LABEL)) return true;
        if (/\bCorrection:/i.test(issue.title || '')) return true;
        return /^\*\*Agency:\*\*/m.test(issue.body || '');
    }

    async function loadGithubCorrections() {
        if (!getAdminToken()) {
            githubCorrectionsList.innerHTML = '<p class="text-muted">Sign in with a GitHub token above to load these.</p>';
            return;
        }
        githubCorrectionsList.innerHTML = '<p class="text-muted">Loading...</p>';
        try {
            const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues?state=open&per_page=100`;
            const response = await fetch(url, { headers: githubHeaders() });
            if (!response.ok) throw new Error(`GitHub read failed (${response.status})`);
            const issues = await response.json();
            githubCorrectionIssues = issues
                .filter((issue) => !issue.pull_request && isCorrectionIssue(issue))
                .map((issue) => ({
                    number: issue.number,
                    ...parseCorrectionBody(issue.body)
                }));
            githubCorrectionsList.innerHTML = githubCorrectionIssues.length
                ? githubCorrectionIssues.map((item) => correctionCardHtml(item, 'github')).join('')
                : '<p class="text-muted">None pending.</p>';
        } catch (error) {
            githubCorrectionsList.innerHTML = `<p class="text-muted">Couldn't load: ${escapeHtml(error.message)}</p>`;
        }
    }

    async function closeGithubIssue(number, comment) {
        const headers = githubHeaders({ 'Content-Type': 'application/json' });
        // The audit comment is best-effort: fetch() doesn't throw on HTTP 4xx/5xx,
        // and some tokens can close an issue but not post a comment, so a 403 here
        // must not block the close. Closing is the authoritative step; if IT fails
        // we throw an actionable error.
        try {
            if (comment) {
                const res = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues/${number}/comments`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({ body: comment })
                });
                if (!res.ok && res.status !== 401) {
                    // Non-blocking, but log it so it isn't a silent mystery.
                    console.warn(`Comment on issue #${number} failed (${res.status}) — closing anyway.`);
                }
            }
        } catch (e) {
            console.warn(`Comment on issue #${number} failed — closing anyway.`, e);
        }

        const closeRes = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues/${number}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({ state: 'closed' })
        });
        if (!closeRes.ok) {
            const details = await closeRes.json().catch(() => ({}));
            let message = details.message || `GitHub close failed (${closeRes.status})`;
            if (closeRes.status === 403 || closeRes.status === 404) {
                message = `${message}. Your token needs "Issues: Read and write" access to ` +
                    `${GITHUB_OWNER}/${GITHUB_REPO} (fine-grained tokens) or the ` +
                    `"repo"/"public_repo" scope (classic tokens) to close issues.`;
            }
            throw new Error(message);
        }
    }

    async function sendLocalCorrectionToGithub(item) {
        const token = getAdminToken();
        if (!token) {
            alert('Sign in with a GitHub token first.');
            return;
        }
        const body = [
            `**Agency:** ${item.agencyName || ''}`,
            `**Jurisdiction Key:** ${item.jurisdictionKey || ''}`,
            `**Field:** ${item.field || ''}`,
            `**Current Value:** ${item.currentValue || ''}`,
            `**Suggested Value:** ${item.suggestedValue || ''}`,
            `**Note:** ${item.note || ''}`,
            `**Submitted By:** ${item.submittedBy || ''}`
        ].join('\n');

        const response = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues`, {
            method: 'POST',
            headers: githubHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({
                title: `Correction: ${item.agencyName || 'Unknown'} — ${FIELD_LABELS[item.field] || item.field}`,
                body,
                labels: [CORRECTIONS_LABEL]
            })
        });
        if (!response.ok) {
            const details = await response.json().catch(() => ({}));
            throw new Error(details.message || `GitHub issue creation failed (${response.status})`);
        }

        const remaining = loadLocalCorrections().filter((i) => i.id !== item.id);
        saveLocalCorrections(remaining);
        renderLocalCorrections();
        loadGithubCorrections();
    }

    function applyCorrectionToAgency(item) {
        if (!item.field) {
            alert('This submission is missing structured data and must be applied manually.');
            return false;
        }

        if (item.jurisdictionKey === 'default') {
            const current = loadDefault() || {};
            current[item.field === 'agencyName' ? 'agencyName' : item.field] = item.suggestedValue;
            saveDefault(current);
            const db = loadDB();
            db.defaultAgency = current;
            saveDB(db);
            renderDefault();
            return true;
        }

        if (!item.jurisdictionKey) {
            alert('This submission is missing structured data and must be applied manually.');
            return false;
        }

        const db = loadDB();
        const agency = db.agencies[item.jurisdictionKey];
        if (!agency) {
            alert(`No agency found for key "${item.jurisdictionKey}". It may have been renamed or removed — apply this manually if still relevant.`);
            return false;
        }
        agency[item.field] = item.suggestedValue;
        saveDB(db);
        renderList(searchInput.value.trim());
        return true;
    }

    let currentEditTarget = null; // { item, source }

    function openEditCorrectionModal(item, source) {
        currentEditTarget = { item, source };
        const override = source === 'github' ? githubEditOverrides[item.number] : null;
        editCorrectionValue.value = (override !== undefined && override !== null) ? override : item.suggestedValue;
        editCorrectionModal.classList.remove('hidden');
        editCorrectionValue.focus();
    }

    saveCorrectionEditBtn.addEventListener('click', () => {
        if (!currentEditTarget) return;
        const { item, source } = currentEditTarget;
        const newValue = editCorrectionValue.value;
        if (source === 'github') {
            githubEditOverrides[item.number] = newValue;
            githubCorrectionsList.innerHTML = githubCorrectionIssues.map((i) => correctionCardHtml(i, 'github')).join('');
        } else {
            const items = loadLocalCorrections().map((i) => i.id === item.id ? { ...i, suggestedValue: newValue } : i);
            saveLocalCorrections(items);
            renderLocalCorrections();
        }
        editCorrectionModal.classList.add('hidden');
        currentEditTarget = null;
    });

    cancelCorrectionEditBtn.addEventListener('click', () => {
        editCorrectionModal.classList.add('hidden');
        currentEditTarget = null;
    });

    function handleCorrectionListClick(e, source, list) {
        const card = e.target.closest('.correction-item');
        if (!card) return;
        const id = card.dataset.id;
        const item = source === 'github'
            ? list.find((i) => String(i.number) === id)
            : list.find((i) => String(i.id) === id);
        if (!item) return;

        if (e.target.closest('.btn-edit-correction')) {
            openEditCorrectionModal(item, source);
            return;
        }

        if (e.target.closest('.btn-approve-correction')) {
            const finalValue = source === 'github' && githubEditOverrides[item.number] != null
                ? githubEditOverrides[item.number]
                : item.suggestedValue;
            const applied = applyCorrectionToAgency({ ...item, suggestedValue: finalValue });
            if (source === 'github') {
                closeGithubIssue(item.number, applied
                    ? 'Approved and applied to agency-data.json. Remember to click "Publish to GitHub" to make it live.'
                    : 'Reviewed, but could not auto-apply (agency not found). Please check manually.'
                )
                    .then(() => loadGithubCorrections())
                    .catch((err) => {
                        alert(`Could not close issue #${item.number}: ${err.message}`);
                        loadGithubCorrections();
                    });
            } else {
                saveLocalCorrections(loadLocalCorrections().filter((i) => i.id !== item.id));
                renderLocalCorrections();
            }
            if (applied) {
                alert('Correction applied. Click "Publish to GitHub" in the Current Agencies section to make it live.');
            }
            return;
        }

        if (e.target.closest('.btn-discard-correction')) {
            if (!confirm('Discard this submission without applying it?')) return;
            if (source === 'github') {
                closeGithubIssue(item.number, 'Discarded — no change made.')
                    .then(() => loadGithubCorrections())
                    .catch((err) => {
                        alert(`Could not close issue #${item.number}: ${err.message}`);
                        loadGithubCorrections();
                    });
            } else {
                saveLocalCorrections(loadLocalCorrections().filter((i) => i.id !== item.id));
                renderLocalCorrections();
            }
            return;
        }

        if (e.target.closest('.btn-send-correction')) {
            sendLocalCorrectionToGithub(item).catch((err) => alert(err.message));
        }
    }

    githubCorrectionsList.addEventListener('click', (e) => handleCorrectionListClick(e, 'github', githubCorrectionIssues));
    localCorrectionsList.addEventListener('click', (e) => handleCorrectionListClick(e, 'local', loadLocalCorrections()));

    refreshCorrectionsBtn.addEventListener('click', () => {
        renderLocalCorrections();
        loadGithubCorrections();
    });

    // ── Init ────────────────────────────────────────────────────────────────
    seedIfEmpty();
    renderList();
    renderDefault();
    renderLocalCorrections();
    loadGithubCorrections();
    updateCollegeFieldsVisibility();

})();
